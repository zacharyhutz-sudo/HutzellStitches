'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const login=$('#login-box'),dash=$('#dashboard'),editor=$('#editor'),msg=$('#admin-message');
  const offline=location.protocol==='file:';
  let rows=[],current,sha,watch=0;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function view(which){login.hidden=which!=='login';dash.hidden=which!=='dash';editor.hidden=which!=='edit';}
  function notice(s){msg.textContent=s;}
  async function api(path,body){
    if(offline)throw Error('The catalog editor runs on your private Netlify deployment. See DEPLOYMENT.md.');
    const res=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const data=await res.json().catch(()=>({error:'The editor requires the Netlify functions. See DEPLOYMENT.md.'}));
    if(res.status===401)view('login');
    if(!res.ok||data.error)throw Error(data.error||'Request failed.');return data;
  }
  async function dashboard(){
    rows=(await api('catalog')).items;view('dash');renderRows();
  }
  function renderRows(){
    const q=$('#search').value.toLowerCase();const shown=rows.filter(x=>x.title.toLowerCase().includes(q));
    $('#rows').innerHTML=shown.map(x=>'<div class="row">'+(x.hasPhoto?'<img class="admin-thumb" loading="lazy" alt="" src="/api/catalog?thumb='+encodeURIComponent(x.id)+'">':'')+'<div class="rowdesc"><strong>'+escape(x.title)+'</strong><span>'+escape([x.category,x.status,x.featured?'Featured':''].filter(Boolean).join(' · '))+'</span></div><button type="button" class="btn outline" data-open="'+escape(x.id)+'">Edit</button></div>').join('')||'<p>No matching designs.</p>';
    $('#rows').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open).catch(e=>notice(e.message)));
  }
  async function open(id){const data=await api('catalog?id='+encodeURIComponent(id));current=data.item;sha=data.sha;notice('');showEditor();}
  function blank(){return {id:'',title:'',description:'',category:'Apparel',status:'Draft',availability:'Made to order',featured:false,rank:10,price:'',closeAt:'',styles:[],sizes:[],colors:[],prompt:'Name or initials',photos:[]};}
  function input(label,key,val,type='text',attrs=''){return '<label>'+label+'<input name="'+key+'" type="'+type+'" value="'+escape(val)+'" '+attrs+'></label>';}
  function select(label,key,values){return '<label>'+label+'<select name="'+key+'">'+values.map(v=>'<option '+(current[key]===v?'selected':'')+'>'+escape(v)+'</option>').join('')+'</select></label>';}
  function localDate(iso){if(!iso)return '';const d=new Date(iso);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  const src=p=>p.src.startsWith('data:')?p.src:'/api/catalog?art='+encodeURIComponent(p.src);
  function photoList(){
    const box=$('#photos');box.innerHTML='';
    current.photos.forEach((p,i)=>{
      const row=document.createElement('div');row.className='photo-row';
      row.innerHTML='<strong>'+(i===0?'Cover image':'Image '+(i+1))+'</strong><img alt=""><label>Image description<input maxlength="240"></label><div class="tools">'+(i?'<button type="button" data-cover>Make cover</button>':'')+'<button type="button" data-remove>Remove image</button></div>';
      row.querySelector('img').src=src(p);const alt=row.querySelector('input');alt.value=p.alt;alt.oninput=()=>p.alt=alt.value;
      row.querySelector('[data-remove]').onclick=()=>{current.photos.splice(i,1);photoList();};
      const c=row.querySelector('[data-cover]');if(c)c.onclick=()=>{current.photos.splice(i,1);current.photos.unshift(p);photoList();};
      box.append(row);
    });
  }
  async function convert(file){
    let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('This image could not be read. Try a JPEG, WebP, or PNG.');}
    try{
      for(const size of [1080,820,640]){
        const ratio=Math.min(1,size/Math.max(image.width,image.height));const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        let data=canvas.toDataURL('image/webp',.78);
        if(!data.startsWith('data:image/webp;'))data=canvas.toDataURL('image/jpeg',.78);
        if(data.length<=220000)return data;
      }
      throw Error('Choose a smaller photo.');
    }finally{image.close();}
  }
  function capture(){
    const f=$('#design-form'),d=new FormData(f);
    for(const k of ['title','description','category','status','availability','price','prompt'])current[k]=String(d.get(k)||'').trim();
    for(const k of ['styles','colors','sizes'])current[k]=String(d.get(k)||'').split(',').map(v=>v.trim()).filter(Boolean);
    current.rank=Number(d.get('rank'));current.featured=d.has('featured');current.closeAt=d.get('closeAt')?new Date(d.get('closeAt')).toISOString():'';
  }
  function showEditor(){
    view('edit');editor.innerHTML='<form id="design-form" class="stack"><h2>'+(current.id?'Edit design':'New design')+'</h2>'+
      input('Design name','title',current.title,'text','required maxlength="100"')+'<label>Description<textarea name="description" rows="3" maxlength="2400">'+escape(current.description)+'</textarea></label><div class="pair">'+select('Category','category',['Apparel','Gifts'])+select('Publication status','status',['Draft','Published','Archived'])+'</div><div class="pair">'+select('Availability','availability',['Made to order','Preorder','Design idea','Unavailable'])+input('Preorder closes (your local time)','closeAt',localDate(current.closeAt),'datetime-local')+'</div><div class="pair">'+input('Price text (optional)','price',current.price,'text','placeholder="e.g. From $25" maxlength="70"')+input('Display order','rank',current.rank,'number','min="0" max="999" required')+'</div><label class="check"><input type="checkbox" name="featured" '+(current.featured?'checked':'')+'>Feature on Home</label>'+
      input('Garment styles (comma-separated)','styles',current.styles.join(', '))+input('Colors (comma-separated)','colors',current.colors.join(', '))+input('Sizes (comma-separated)','sizes',current.sizes.join(', '))+input('Personalization prompt','prompt',current.prompt,'text','maxlength="160"')+
      '<fieldset><legend>Photos</legend><div id="photos"></div><label>Add up to three images<input type="file" id="upload" accept="image/jpeg,image/png,image/webp" multiple></label></fieldset><div class="tools"><button class="btn" type="submit">Save changes</button><button class="btn outline" id="preview" type="button">Preview</button><button class="btn outline" id="cancel" type="button">Back to list</button></div><div id="preview-box" hidden></div>'+(sha?'<div class="tools"><button id="dup" type="button">Duplicate as draft</button><button id="del" class="danger" type="button">Delete item</button></div>':'')+'</form>';
    photoList();const form=$('#design-form'),upload=$('#upload');
    upload.onchange=async()=>{const save=form.querySelector('[type=submit]');save.disabled=true;upload.disabled=true;
      try{if(current.photos.length+upload.files.length>3)throw Error('Keep up to three images per design.');const files=[...upload.files];const added=[];for(const file of files)added.push({src:await convert(file),alt:''});current.photos.push(...added);photoList();notice('Add a description for each photo.');}catch(e){notice(e.message);}finally{save.disabled=false;upload.disabled=false;upload.value='';}};
    $('#cancel').onclick=()=>{notice('');view('dash');};
    $('#preview').onclick=()=>{capture();const box=$('#preview-box');box.hidden=false;box.innerHTML='<h3>'+escape(current.title||'Untitled')+'</h3><p>'+escape(current.description)+'</p><p>'+escape([current.category,current.availability,current.price].filter(Boolean).join(' · '))+'</p>';if(current.photos[0]){const img=document.createElement('img');img.className='preview-image';img.src=src(current.photos[0]);img.alt=current.photos[0].alt;box.prepend(img);}};
    if(sha){
      $('#dup').onclick=()=>{capture();current.id='';current.title+=' (copy)';current.status='Draft';current.featured=false;sha=null;showEditor();};
      $('#del').onclick=async()=>{if(!confirm('Delete this design? Archive it instead if you may want it back.'))return;const b=$('#del');b.disabled=true;try{const result=await api('catalog',{id:current.id,sha,remove:true});await afterSave(result);}catch(e){notice(e.message);b.disabled=false;}};
    }
    form.onsubmit=async ev=>{ev.preventDefault();capture();if(!current.id){const prefix=current.title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,58);current.id=(prefix||'design')+'-'+crypto.randomUUID().slice(0,8);}
      const save=form.querySelector('[type=submit]');save.disabled=true;
      try{const result=await api('catalog',{id:current.id,sha,item:current});sha=result.sha;await afterSave(result);}
      catch(e){notice(e.message);save.disabled=false;}
    };
  }
  async function afterSave(result){
    const ticket=++watch;notice('Saved to GitHub. Netlify is publishing the update.');await dashboard();
    for(let n=0;n<48&&ticket===watch;n++){
      await new Promise(r=>setTimeout(r,5000));if(ticket!==watch)return;
      try{const data=await (await fetch('../release.json?t='+Date.now(),{cache:'no-store'})).json();
        if(data.commits.includes(result.commit)){notice('The updated site is live. ');const a=document.createElement('a');a.href='../apparel-and-gifts/index.html';a.textContent='View catalog';msg.append(a);return;}
      }catch{}
    }
    if(ticket===watch)notice('Saved to GitHub. Check the Netlify deploy log for publication status.');
  }
  $('#add').onclick=()=>{current=blank();sha=null;notice('');showEditor();};
  $('#search').oninput=renderRows;
  $('#signout').onclick=async()=>{try{await api('login',{logout:true});watch++;current=null;rows=[];editor.replaceChildren();$('#rows').replaceChildren();notice('Signed out.');view('login');}catch(e){notice(e.message);}};
  $('#login').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;const b=f.querySelector('button');b.disabled=true;
    try{await api('login',{password:f.elements.password.value});f.reset();await dashboard();notice('');}catch(e){notice(e.message);}finally{b.disabled=false;}};
  if(offline){notice('This is the offline preview. The editor is available on your private Netlify site after setup.');$('#login').querySelector('button').disabled=true;}
  else dashboard().catch(e=>{if(e.message!=='Please sign in.')notice(e.message);});
})();
