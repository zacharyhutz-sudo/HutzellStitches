'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const login=$('#login-box'),dash=$('#dashboard'),editor=$('#editor'),msg=$('#admin-message');
  const offline=location.protocol==='file:';
  let rows=[],current,sha,watch=0,resumeEditor=false;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function view(which){login.hidden=which!=='login';dash.hidden=which!=='dash';editor.hidden=which!=='edit';}
  function notice(s){msg.textContent=s; const inline=$('#save-status'); if(inline)inline.textContent=s;}
  async function api(path,body){
    if(offline)throw Error('The catalog editor runs on your private Netlify deployment. See DEPLOYMENT.md.');
    const res=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const data=await res.json().catch(()=>({error:'The editor requires the Netlify functions. See DEPLOYMENT.md.'}));
    if(res.status===401){if(!editor.hidden)resumeEditor=true;view('login');}
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
      row.querySelector('img').src=src(p);const alt=row.querySelector('input');alt.value=p.alt;alt.required=$('#design-form').elements.status.value==='Published';alt.oninput=()=>p.alt=alt.value;
      row.querySelector('[data-remove]').onclick=()=>{current.photos.splice(i,1);photoList();};
      const c=row.querySelector('[data-cover]');if(c)c.onclick=()=>{current.photos.splice(i,1);current.photos.unshift(p);photoList();};
      box.append(row);
    });
  }
  function capture(){
    const f=$('#design-form'),d=new FormData(f);
    for(const k of ['title','description','category','status','availability','price','prompt'])current[k]=String(d.get(k)||'').trim();
    for(const k of ['styles','colors','sizes'])current[k]=String(d.get(k)||'').split(',').map(v=>v.trim()).filter(Boolean);
    current.rank=Number(d.get('rank'));current.featured=d.has('featured');current.closeAt=d.get('closeAt')?new Date(d.get('closeAt')).toISOString():'';
  }
  function showEditor(){
    watch++;
    view('edit');editor.innerHTML='<form id="design-form" class="stack"><h2>'+(current.id?'Edit design':'New design')+'</h2>'+
      input('Design name','title',current.title,'text','required maxlength="100"')+'<label>Description<textarea name="description" rows="3" maxlength="2400">'+escape(current.description)+'</textarea></label><div class="pair">'+select('Category','category',['Apparel','Gifts'])+select('Publication status','status',['Draft','Published','Archived'])+'</div><div class="pair">'+select('Availability','availability',['Made to order','Preorder','Design idea','Unavailable'])+input('Preorder closes (your local time)','closeAt',localDate(current.closeAt),'datetime-local')+'</div><div class="pair">'+input('Price text (optional)','price',current.price,'text','placeholder="e.g. From $25" maxlength="70"')+input('Display order','rank',current.rank,'number','min="0" max="999" required')+'</div><label class="check"><input type="checkbox" name="featured" '+(current.featured?'checked':'')+'>Feature on Home</label>'+
      input('Garment styles (comma-separated)','styles',current.styles.join(', '))+input('Colors (comma-separated)','colors',current.colors.join(', '))+input('Sizes (comma-separated)','sizes',current.sizes.join(', '))+input('Personalization prompt','prompt',current.prompt,'text','maxlength="160"')+
      '<fieldset class="photo-panel"><legend>Design photos</legend><label class="picker">Choose photos<input type="file" id="upload" accept="image/*,.heic,.heif" multiple></label><p class="photo-note" id="photo-status" role="status">Choose up to three. The first photo is the cover.</p><div id="photos"></div></fieldset><p role="status" id="save-status"></p><div class="tools"><button class="btn" type="submit">Save changes</button><button class="btn outline" id="preview" type="button">Preview</button><button class="btn outline" id="cancel" type="button">Back to list</button></div><div id="preview-box" hidden></div>'+(sha?'<div class="tools"><button id="dup" type="button">Duplicate as draft</button><button id="del" class="danger" type="button">Delete item</button></div>':'')+'</form>';
    photoList();const form=$('#design-form'),upload=$('#upload');
    form.elements.status.onchange = () => {
      for (const input of form.querySelectorAll('#photos input')) input.required = form.elements.status.value === 'Published';
    };
    let busy = false;
    function lock(value){
      busy = value;
      form.querySelectorAll('button, input, select, textarea').forEach(control => control.disabled = value);
    }
    upload.onchange = async () => {
      const files = Array.from(upload.files);
      if (!files.length || busy) return;
      const status = $('#photo-status');
      const failures = [];
      let count = 0;
      lock(true);
      try {
        for (const file of files) {
          if (current.photos.length >= 3) {
            failures.push('Three photos are already selected.');
            break;
          }
          status.textContent = 'Preparing ' + file.name + '…';
          try {
            const image = await prepareStudioPhoto(file);
            current.photos.push({src:image, alt:form.elements.title.value.trim().slice(0,200)});
            count++;
            photoList();
          } catch (error) {
            failures.push(file.name + ' could not be added. Try exporting it as JPEG.');
          }
        }
        status.textContent = [count ? count + (count === 1 ? ' photo ready.' : ' photos ready.') + ' Use Save changes to upload.' : '', ...failures].filter(Boolean).join(' ');
      } finally {
        lock(false);
        upload.value = '';
      }
    };
    $('#cancel').onclick=()=>{notice('');view('dash');};
    $('#preview').onclick=()=>{capture();const box=$('#preview-box');box.hidden=false;box.innerHTML='<h3>'+escape(current.title||'Untitled')+'</h3><p>'+escape(current.description)+'</p><p>'+escape([current.category,current.availability,current.price].filter(Boolean).join(' · '))+'</p>';if(current.photos[0]){const img=document.createElement('img');img.className='preview-image';img.src=src(current.photos[0]);img.alt=current.photos[0].alt;box.prepend(img);}};
    if(sha){
      $('#dup').onclick=()=>{capture();current.id='';current.title+=' (copy)';current.status='Draft';current.featured=false;sha=null;showEditor();};
      $('#del').onclick=async()=>{if(!confirm('Delete this design? Archive it instead if you may want it back.'))return;const b=$('#del');lock(true);try{const result=await api('catalog',{id:current.id,sha,remove:true});await afterSave(result);}catch(e){notice(e.message);lock(false);}};
    }
    form.onsubmit=async ev=>{ev.preventDefault();if(busy)return;capture();if(!current.id){const prefix=current.title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,58);current.id=(prefix||'design')+'-'+crypto.randomUUID().slice(0,8);}
      lock(true);notice('Saving design and photos…');
      try{const result=await api('catalog',{id:current.id,sha,item:current});sha=result.sha;await afterSave(result);}
      catch(e){notice(e.message);lock(false);}
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
    try{await api('login',{password:f.elements.password.value});f.reset();if(resumeEditor){resumeEditor=false;view('edit');notice('Signed in. Your changes are ready to save.');}else{await dashboard();notice('');}}catch(e){notice(e.message);}finally{b.disabled=false;}};
  if(offline){notice('This is the offline preview. The editor is available on your private Netlify site after setup.');$('#login').querySelector('button').disabled=true;}
  else dashboard().catch(e=>{if(e.message!=='Please sign in.')notice(e.message);});
})();
