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
document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{const pic=document.querySelector('#main-photo');pic.src=b.dataset.photo;pic.alt=b.dataset.alt;});
const form=document.querySelector('#inquiry');
if(form){
  const selected=document.querySelector('#selection');
  const details={design:'Design',style:'Garment style',color:'Design color',size:'Size',personalization:'Personalization'};
  for(const [key,label] of Object.entries(details)){
    const value=params.get(key);if(!value)continue;
    const line=document.createElement('p');line.textContent=label+' · '+value.slice(0,200);selected.append(line);
    const input=document.createElement('input');input.type='hidden';input.name=key;input.value=value.slice(0,200);form.append(input);
  }
  selected.hidden=!selected.childElementCount;
  if(/^[a-z0-9][a-z0-9-]{0,79}$/.test(params.get('id')||'')){
    const edit=document.createElement('a');edit.href='../designs/'+params.get('id')+'/index.html';edit.textContent='View design';selected.append(edit);
  }
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
