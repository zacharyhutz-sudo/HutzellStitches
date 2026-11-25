// Decode the source first, then fit each image within the catalog's per-photo limit.
async function prepareStudioPhoto(file) {
  function loadImage(blob) {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => resolve({image, release: () => URL.revokeObjectURL(url)});
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('This image could not be opened.'));
      };
      image.src = url;
    });
  }

  let source;
  try {
    source = await loadImage(file);
  } catch {
    const header = await file.slice(0, 32).text();
    if (!/heic|heif/i.test(file.type + file.name) && !header.includes('ftyp')) {
      throw new Error('Choose a JPEG, PNG, WebP or HEIC image.');
    }
    const {heicTo} = await import('./vendor/heic-to.mjs');
    source = await loadImage(await heicTo({blob: file, type: 'image/jpeg', quality: 0.90}));
  }
  const canvas = document.createElement('canvas');
  try {
    const {image} = source;
    for (const width of [1440, 1080, 800, 600, 420]) {
      const scale = Math.min(1, width / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', {alpha:false});
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.72, 0.55]) {
        const photo = canvas.toDataURL('image/jpeg', quality);
        if (photo.startsWith('data:image/jpeg;base64,') && photo.length <= 220000) return photo;
      }
    }
    throw new Error('Try a smaller copy of this image.');
  } finally {
    source.release();
    canvas.width = canvas.height = 1;
  }
}
