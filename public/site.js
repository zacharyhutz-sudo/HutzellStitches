'use strict';
const params=new URLSearchParams(location.hash.startsWith('#selection=')?location.hash.slice(11):location.search);
function applyFilter(value){
  const valid=['All','Apparel','Gifts'].includes(value)?value:'All';
  let count=0;
  for(const card of document.querySelectorAll('.card[data-category]')){
    card.hidden=valid!=='All'&&card.dataset.category!==valid;
    if(!card.hidden)count++;
  }
  for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===valid));
  document.querySelector('#empty').hidden=count>0;
}
if(document.querySelector('.filters')){
  applyFilter(params.get('category'));
  for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{
    applyFilter(b.dataset.filter);
    if(location.protocol!=='file:'){const url=new URL(location.href);url.searchParams.set('category',b.dataset.filter);history.replaceState(null,'',url);}
  };
}
function closed(el){return el.dataset.close&&Date.parse(el.dataset.close)<=Date.now();}
function refreshAvailability(){
  document.querySelectorAll('[data-availability]').forEach(el=>{if(el.dataset.availability==='Preorder'&&closed(el))el.textContent='Preorder closed';});
  const form=document.querySelector('.product-form');
  if(form&&(form.dataset.state==='Unavailable'||(form.dataset.state==='Preorder'&&closed(form)))){
    form.querySelector('.option-fields').hidden=true;
    form.querySelectorAll('.option-fields input,.option-fields select').forEach(el=>el.disabled=true);
    form.querySelector('button').textContent='Ask about a similar design';
  }
}
const product=document.querySelector('.product-form');
if(product)product.addEventListener('submit',ev=>{
  ev.preventDefault();refreshAvailability();
  const target=new URL(product.action);
  target.hash='selection='+new URLSearchParams(new FormData(product)).toString();
  location.assign(target.href);
});
refreshAvailability();if(document.querySelector('[data-close]'))setInterval(refreshAvailability,30000);
const thumbnails = document.querySelectorAll('[data-photo]');
for (const thumb of thumbnails) {
  thumb.onclick = () => {
    const photo = document.querySelector('#main-photo');
    photo.src = thumb.dataset.photo;
    photo.alt = thumb.dataset.alt;
    document.querySelector('#full-photo').href = photo.src;
    document.querySelector('#full-photo-link').href = photo.src;
    document.querySelector('#media-kind').textContent = thumb.dataset.illustration === 'true' ? 'Design illustration · ' : '';
    for (const other of thumbnails) other.setAttribute('aria-pressed', String(other === thumb));
  };
}
const form=document.querySelector('#inquiry');
if(form){
  const selected=document.querySelector('#selection');
  const details={design:'Design',style:'Garment style',color:'Design color',size:'Size',personalization:'Personalization'};
  for(const [key,label] of Object.entries(details)){
    const value=params.get(key);if(!value)continue;
    const line=document.createElement('p');line.textContent=label+' · '+value.slice(0,200);selected.append(line);
    const input=document.createElement('input');input.type='hidden';input.name=key;input.value=value.slice(0,200);form.append(input);
  }
  const preview = document.getElementById('preview-' + (params.get('id') || ''));
  if (preview?.tagName === 'TEMPLATE') selected.prepend(preview.content.cloneNode(true));
  selected.hidden = !selected.childElementCount;
  const type=form.elements.type;type.onchange=()=>{
    const general=type.value==='General question';
    form.querySelector('#order-fields').hidden=general;
    form.querySelectorAll('#order-fields input').forEach(i=>i.disabled=general);
  };
  const send=document.querySelector('#send-inquiry'),status=document.querySelector('#form-status');
  form.addEventListener('submit',ev=>{ev.preventDefault();if(form.dataset.endpoint&&!send.disabled)send.click();});
  send.onclick=async()=>{
    if(!form.dataset.endpoint||!form.reportValidity())return;
    send.disabled=true;
    try{const res=await fetch(form.dataset.endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
      if(!res.ok)throw Error();status.textContent='Your inquiry was sent. Thank you for sharing your idea!';send.textContent='Inquiry sent';
    }catch{status.textContent='Your inquiry could not be sent. Your entries are still here so you can try again.';send.disabled=false;}
  };
}

const timeline = document.querySelector('[data-timeline]');
if (timeline) {
  const compact = matchMedia('(max-width: 760px), (pointer: coarse)');
  const toggle = document.getElementById('feed-toggle');
  const close = document.getElementById('feed-close');
  let expanded = false;
  let resizeTimer;
  let lastViewportWidth = window.innerWidth;

  function renderFeed() {
    if (!compact.matches) expanded = false;
    const visible = !compact.matches || expanded;
    toggle.hidden = !compact.matches;
    toggle.setAttribute('aria-expanded', String(expanded && compact.matches));
    toggle.textContent = expanded ? 'Hide recent posts' : 'Show recent posts';
    close.hidden = !compact.matches || !expanded;
    timeline.hidden = !visible;
    if (!visible) {
      timeline.replaceChildren();
      return;
    }

    const width = Math.min(500, Math.floor(timeline.clientWidth));
    if (width < 180) return;
    // Ignore transient browser chrome height changes during a swipe.
    const height = compact.matches ? Math.min(440, Math.floor(window.innerHeight * .60)) : 1160;
    const frame = timeline.querySelector('iframe');
    if (frame && frame.width === String(width) && frame.height === String(height)) return;
    const url = new URL(timeline.dataset.timeline);
    url.searchParams.set('width', String(width));
    url.searchParams.set('height', String(height));
    const nextFrame = document.createElement('iframe');
    nextFrame.title = 'Recent Facebook posts from Hutzell Stitches Embroidery';
    nextFrame.loading = compact.matches ? 'eager' : 'lazy';
    nextFrame.referrerPolicy = 'strict-origin-when-cross-origin';
    nextFrame.width = String(width);
    nextFrame.height = String(height);
    nextFrame.src = url.href;
    timeline.replaceChildren(nextFrame);
  }

  toggle.addEventListener('click', () => {
    expanded = !expanded;
    renderFeed();
  });
  close.addEventListener('click', () => {
    expanded = false;
    renderFeed();
    toggle.focus();
  });
  compact.addEventListener('change', renderFeed);
  function scheduleFit() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderFeed, 120);
  }
  // The panel can change width even while the viewport stays the same.
  if ('ResizeObserver' in window) {
    let lastPanelWidth = 0;
    new ResizeObserver(([entry]) => {
      if (lastPanelWidth === entry.contentRect.width) return;
      lastPanelWidth = entry.contentRect.width;
      scheduleFit();
    }).observe(timeline.parentElement);
  }
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastViewportWidth) {
      lastViewportWidth = window.innerWidth;
      scheduleFit();
    }
  });
  renderFeed();
}
