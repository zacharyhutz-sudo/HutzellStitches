export const categories=['Apparel','Gifts'];
export const statuses=['Draft','Published','Archived'];
export const availability=['Made to order','Preorder','Design idea','Unavailable'];
export const safeId=id=>typeof id==='string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
const fail=message=>{ throw Object.assign(new Error(message),{status:400}); };
export function validate(item){
  if(!item||!safeId(item.id)) fail('Invalid design ID.');
  for(const [key,limit] of Object.entries({title:100,description:2400,prompt:160,price:70,closeAt:30})){
    if(typeof item[key]!=='string'||item[key].length>limit) fail('Check '+key+'.');
  }
  if(!item.title.trim()||!categories.includes(item.category)||!statuses.includes(item.status)||!availability.includes(item.availability)) fail('Check the title, category and status.');
  if(typeof item.featured!=='boolean'||!Number.isInteger(item.rank)||item.rank<0||item.rank>999) fail('Check the display order.');
  if(item.closeAt && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(item.closeAt)||!Number.isFinite(Date.parse(item.closeAt)))) fail('Check the preorder date.');
  if(item.availability==='Preorder'&&item.status==='Published'&&!item.closeAt) fail('Choose a closing time for the preorder.');
  for(const key of ['styles','colors','sizes']){
    if(!Array.isArray(item[key])||item[key].length>30||!item[key].every(s=>typeof s==='string'&&s.length>0&&s.length<=100)) fail('Check '+key+'.');
  }
  if(!Array.isArray(item.photos)||item.photos.length>3||(item.status==='Published'&&!item.photos.length)) fail('Choose at least one image to publish, up to three.');
  for(const photo of item.photos){
    if(!photo||typeof photo.alt!=='string'||photo.alt.length>240|| (item.status==='Published'&&!photo.alt.trim())) fail('Add a short image description.');
    if(!['pumpkin.webp','bow.webp'].includes(photo.src)){
      if(typeof photo.src!=='string'||photo.src.length>220000||!/^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(photo.src)) fail('Use a smaller photo.');
      const bytes=Buffer.from(photo.src.split(',')[1],'base64');
      const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
      if(photo.src.startsWith('data:image/webp')?!webp:!jpeg) fail('Invalid image data.');
    }
  }
  return Object.fromEntries(['id','title','category','status','availability','featured','rank','price','closeAt','description','styles','colors','sizes','prompt','photos'].map(k=>[k,item[k]]));
}
