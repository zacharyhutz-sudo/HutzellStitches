import {mkdir,rm,readdir,readFile,writeFile,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {validate} from '../server/model.mjs';
const out='dist';
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
if(process.env.NETLIFY && (process.env.GIFT_PREVIEW_READY!=='yes'||process.env.CONTEXT!=='production')){
  await writeFile(out+'/index.html','<!doctype html><html lang="en"><meta name="robots" content="noindex"><title>Private preview</title><p>This preview is offline.</p></html>');
  console.log('Neutral holding page built. See DEPLOYMENT.md to enable your private preview.');
  process.exit(0);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rawFiles=(await readdir('content')).filter(f=>f.endsWith('.json'));
const items=(await Promise.all(rawFiles.map(async f=>validate(JSON.parse(await readFile('content/'+f,'utf8')))))).filter(i=>i.status==='Published').sort((a,b)=>a.rank-b.rank||a.title.localeCompare(b.title));
await cp('public',out,{recursive:true,filter:src=>!['pumpkin.webp','bow.webp'].includes(path.basename(src))});
await mkdir(out+'/vendor',{recursive:true});
await cp('node_modules/heic-to/dist/heic-to.min.js',out+'/vendor/heic-to.mjs');
await cp('node_modules/heic-to/LICENSE',out+'/vendor/heic-to-LICENSE.txt');
await mkdir(out+'/photos',{recursive:true});
for(const i of items)for(const [n,p] of i.photos.entries()){
  if(p.src.startsWith('data:')){const file='photos/'+i.id+'-'+n+(p.src.startsWith('data:image/jpeg')?'.jpg':'.webp');await writeFile(out+'/'+file,Buffer.from(p.src.split(',')[1],'base64'));p.src=file;}
  else{await cp('public/art/'+p.src,out+'/art/'+p.src);p.src='art/'+p.src;}
}
const hero = 'art/stitched-landscape-1920.webp';
const portrait = 'art/rachel-family-960.webp';
const facebookPage = 'https://www.facebook.com/people/Hutzell-Stitches-Embroidery/61586900660490/';
// Meta's plugin resolves the numeric permalink even when the /people/ URL yields an empty widget.
const timeline = new URL('https://www.facebook.com/plugins/page.php');
timeline.search = new URLSearchParams({
  href: 'https://www.facebook.com/61586900660490', tabs: 'timeline', height: '540',
  small_header: 'true', hide_cover: 'false', show_facepile: 'false', adapt_container_width: 'true'
}).toString();
function isIllustration(photo) {
  return ['art/pumpkin.webp', 'art/bow.webp'].includes(photo.src);
}
function selectionPreview(item, root) {
  const photo = item.photos[0];
  return '<template id="preview-' + esc(item.id) + '"><a class="selected-piece" href="' + root +
    'designs/' + esc(item.id) + '/index.html"><img width="80" height="80" alt="" src="' +
    esc(root + photo.src) + '"><span>View design</span></a></template>';
}
const pages=[['Home','index.html'],['About Us','about/index.html'],['Apparel & Gifts','apparel-and-gifts/index.html'],['Contact Us','contact/index.html']];
const formId=process.env.ENABLE_FORMSPREE==='yes'?process.env.FORMSPREE_FORM_ID:'';
if(process.env.ENABLE_FORMSPREE==='yes'&&!/^[a-zA-Z0-9]{6,32}$/.test(formId??''))throw Error('Set a valid FORMSPREE_FORM_ID before enabling submissions.');
let commits=[];
try{commits=execFileSync('git',['log','-100','--format=%H'],{stdio:['ignore','pipe','ignore']}).toString().trim().split('\n');}catch{}
if(process.env.COMMIT_REF)commits.unshift(process.env.COMMIT_REF);
await writeFile(out+'/release.json',JSON.stringify({commits}));
function button(label,href,secondary=false){return '<a class="btn '+(secondary?'outline':'')+'" href="'+esc(href)+'">'+esc(label)+'</a>';}
function intro(k,title,desc){return '<div class="intro"><p class="eyebrow">'+k+'</p><h1>'+title+'</h1><p>'+desc+'</p></div>';}
const brand = root => '<span class="brand"><img class="spool" width="62" height="62" src="' + root +
  'art/brand.svg" alt=""><span class="brand-name"><img class="signature" width="200" height="28" src="' +
  root + 'art/signature.svg" alt="Hutzell Stitches"><small>EMBROIDERY</small></span></span>';
async function page(file,active,title,desc,render,photo=hero){
 const r='../'.repeat(file.split('/').length-1);const url=(process.env.URL||'').replace(/\/$/,'');
 const menu=pages.map(([n,f])=>'<a '+(active===n?'aria-current="page" ':'')+'href="'+r+f+'">'+esc(n)+'</a>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+esc(title)+' · Hutzell Stitches Embroidery</title><meta name="description" content="'+esc(desc)+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:image" content="'+esc(url?url+'/'+photo:r+photo)+'"><link rel="icon" href="'+r+'art/spool-icon.svg"><link rel="stylesheet" href="'+r+'style.css"><script src="'+r+'site.js" defer></script></head><body><a href="#main" class="skip">Skip to content</a><header><div class="wrap header"><a class="brandlink" href="'+r+'index.html">'+brand(r)+'</a><nav aria-label="Main navigation">'+menu+'</nav></div></header><main id="main">'+render(r)+'</main><footer><div class="wrap foot"><a class="brandlink" href="'+r+'index.html">'+brand(r)+'</a><span>Monroe, Georgia</span><div><a href="'+facebookPage+'">Facebook</a><a href="https://www.instagram.com/hutzellstitches/">Instagram</a><a href="'+r+'admin/index.html">Admin</a></div></div></footer></body></html>';
 await mkdir(path.dirname(out+'/'+file),{recursive:true});await writeFile(out+'/'+file,html);
}
const card=(i,r)=>'<article class="card" data-category="'+i.category+'"><a href="'+r+'designs/'+i.id+'/index.html"><div class="card-img"><img loading="lazy" src="'+r+i.photos[0].src+'" alt="'+esc(i.photos[0].alt)+'"></div><div class="card-info"><small>'+i.category+(isIllustration(i.photos[0])?' · Design illustration':'')+'</small><h3>'+esc(i.title)+'</h3><span data-availability="'+esc(i.availability)+'" data-close="'+esc(i.closeAt)+'">'+esc(i.availability)+'</span>'+(i.price?' · '+esc(i.price):'')+'</div></a></article>';
await page('index.html','Home','Personalized embroidery in Monroe, Georgia','Personalized apparel, embroidered gifts and custom designs from Rachel’s in-home studio in Monroe, Georgia.',r=>`
<section class="thread-hero">
  <picture class="thread-art" aria-hidden="true">
    <source media="(max-width:620px)" srcset="art/stitched-landscape-phone.webp">
    <img fetchpriority="high" width="1920" height="768" src="${hero}" srcset="art/stitched-landscape-960.webp 960w, ${hero} 1920w" sizes="100vw" alt="">
  </picture>
  <div class="wrap thread-hero-inner">
    <div class="thread-intro"><p class="eyebrow"><span class="line"></span> Monroe, Georgia</p>
    <h1>Embroidery,<br><em>made personal.</em></h1>
    <p>Personalized apparel and keepsakes from Rachel’s home studio.</p>
    <div class="actions">${button('Browse Apparel & Gifts','apparel-and-gifts/index.html')}<a class="textlink" href="contact/index.html">Custom orders</a></div></div>
  </div>
</section>
<section class="wrap block facebook-section" aria-labelledby="featured-designs">
  <div class="feed-copy">
    <img width="92" height="92" loading="lazy" class="studio-seal" src="art/facebook-badge.webp" alt="Hutzell Stitches Embroidery">
    <p class="eyebrow">From Rachel’s Facebook page</p>
    <h2 id="featured-designs">Featured designs</h2>
    <p>See what’s coming off the embroidery machine and catch the latest seasonal preorders.</p>
    <a class="textlink" href="${facebookPage}">View posts on Facebook</a>
  </div>
  <div class="timeline" data-timeline="${esc(timeline.href)}"></div>
</section>
<section class="storystrip"><div class="wrap storyinner"><img src="art/brand.svg" alt=""><div><h2>Hi, I’m Rachel.</h2><p>Welcome to Hutzell Stitches, my in-home embroidery studio in Monroe, Georgia. I make personalized apparel and gifts, one name and one design at a time.</p><a class="textlink" href="about/index.html">Meet the studio</a></div></div></section>`);
await page('about/index.html','About Us','About the studio','Meet Rachel and her Monroe, Georgia embroidery studio.',r=>`<section class="wrap maker-story">
  <div class="maker-hello"><p class="eyebrow">About the studio</p><h1>Hi, I’m <em>Rachel.</em></h1>
  <p class="lead">Hutzell Stitches is my in-home embroidery studio in Monroe, Georgia.</p></div>
  <figure class="family-portrait"><img src="${r+portrait}" srcset="${r}art/rachel-family-560.webp 560w, ${r+portrait} 960w" sizes="(max-width:620px) 88vw, (max-width:900px) 40vw, 430px" width="960" height="1440" alt="Rachel with her family outdoors beneath a magnolia tree"><figcaption>Rachel and her family</figcaption></figure>
  <div class="maker-copy"><p>I offer personalized apparel and gifts through custom orders, made-to-order designs, and seasonal preorders. You can start with a design you see here or bring me an idea of your own.</p>
  <h2>Have a piece in mind?</h2><p>Tell me who it’s for, the name or initials you’d like stitched, and any colors you’re imagining.</p>
  ${button('Explore the designs',r+'apparel-and-gifts/index.html')}</div>
</section>`,portrait);
await page('apparel-and-gifts/index.html','Apparel & Gifts','Apparel & gifts','Browse embroidery designs for personalized apparel and gifts.',r=>`<section class="wrap block">${intro('The design collection','Apparel <em>&</em> gifts','Choose a design to see the details and explore personalization.')}<div class="filters" aria-label="Filter designs">${['All','Apparel','Gifts'].map((v,i)=>'<button type="button" data-filter="'+v+'" aria-pressed="'+(!i)+'">'+v+'</button>').join('')}</div><div class="cards">${items.map(i=>card(i,r)).join('')}</div><p id="empty" hidden>There are no designs in this category yet.</p></section>`);
function select(label,name,values){return values.length?'<label>'+label+'<select name="'+name+'" required><option value="">Choose an option</option>'+values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>':'';}
for(const i of items)await page('designs/'+i.id+'/index.html','Apparel & Gifts',i.title,i.description,r=>`
<div class="wrap block"><a class="textlink" href="${r}apparel-and-gifts/index.html">Back to Apparel & Gifts</a><div class="detail"><div><a class="full-photo" id="full-photo" href="${r+i.photos[0].src}" aria-label="Open full-size image"><img class="product-main" id="main-photo" src="${r+i.photos[0].src}" alt="${esc(i.photos[0].alt)}"></a><p class="photo-caption"><span id="media-kind">${isIllustration(i.photos[0])?'Design illustration · ':''}</span><a id="full-photo-link" href="${r+i.photos[0].src}">View full size</a></p>${i.photos.length>1?'<div class="thumbs">'+i.photos.map((p,n)=>'<button type="button" aria-pressed="'+(n===0)+'" data-illustration="'+isIllustration(p)+'" aria-label="View '+esc(p.alt)+'" data-photo="'+r+p.src+'" data-alt="'+esc(p.alt)+'"><img src="'+r+p.src+'" alt=""></button>').join('')+'</div>':''}</div><div><p class="eyebrow">${i.category}</p><h1>${esc(i.title)}</h1><p data-availability="${esc(i.availability)}" data-close="${esc(i.closeAt)}">${esc(i.availability)}</p><p>${esc(i.description)}</p>${i.price?'<p><strong>'+esc(i.price)+'</strong></p>':''}${i.availability==='Preorder'&&i.closeAt?'<p>Preorder closes <time datetime="'+i.closeAt+'">'+esc(new Date(i.closeAt).toLocaleString('en-US',{timeZone:'America/New_York',timeZoneName:'short'}))+'</time></p>':''}<form class="stack product-form" action="${r}contact/index.html" data-state="${i.availability}" data-close="${esc(i.closeAt)}"><input type="hidden" name="design" value="${esc(i.title)}"><input type="hidden" name="id" value="${i.id}"><div class="option-fields">${select('Garment style','style',i.styles)}${select('Design color','color',i.colors)}${select('Size','size',i.sizes)}${i.prompt?'<label>'+esc(i.prompt)+'<input name="personalization" maxlength="150" autocomplete="off"></label>':''}</div><button class="btn" type="submit">Request this design</button></form></div></div></div>`,i.photos[0].src);
await page('contact/index.html','Contact Us','Custom orders & contact','Tell the studio about your custom embroidery idea.',r=>`<section class="wrap block contact-layout"><div>${intro('Contact us','Start a <em>custom</em> order','A name, a favorite color, or an occasion is a good place to start. Include any garment details and the date you have in mind.')}</div><div class="formcard"><form id="inquiry" class="stack" data-endpoint="${esc(formId?'https://formspree.io/f/'+formId:'')}"><h2>Your inquiry</h2><p id="form-status" role="status">${formId?'':'Custom order inquiries are currently closed.'}</p><div id="selection" hidden></div>${items.map(item => selectionPreview(item,r)).join('')}<label>Inquiry type<select name="type"><option>Custom order</option><option>General question</option></select></label><label>Your name<input name="name" autocomplete="name" maxlength="120" required></label><label>Email address<input name="email" type="email" autocomplete="email" required></label><div class="pair" id="order-fields"><label>Quantity<input type="number" name="quantity" min="1" step="1" value="1"></label><label>Needed by (optional)<input type="date" name="needed_by"></label></div><label>Message<textarea name="message" rows="4" required maxlength="4000"></textarea></label><div class="trap" aria-hidden="true"><input name="_gotcha" tabindex="-1" autocomplete="off" aria-label="Leave empty"></div><button type="button" id="send-inquiry" class="btn" ${formId?'':'disabled'}>${formId?'Send inquiry':'Submissions disabled'}</button></form></div></section>`);
await page('admin/index.html','', 'Studio admin','Manage studio designs.',r=>`<section class="wrap block admin"><h1>Catalog editor</h1><p id="admin-message" role="status" aria-live="polite"></p><div id="login-box" class="formcard"><form id="login" class="stack"><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="btn">Sign in</button></form></div><div id="dashboard" hidden><div class="tools"><button class="btn" id="add">Add item</button><button class="btn outline" id="signout">Sign out</button></div><label>Find a design<input id="search" type="search" placeholder="Search by name"></label><div id="rows"></div></div><div id="editor" class="formcard" hidden></div><script src="${r}photo-upload.js" defer></script><script src="${r}admin.js" defer></script></section>`);
await writeFile(out+'/robots.txt','User-agent: *\nDisallow: /\n');
console.log('Built '+items.length+' published designs and the studio website.');
