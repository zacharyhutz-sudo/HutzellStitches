import {env} from './auth.mjs';
import {safeId,validate} from './model.mjs';
const branch=()=>process.env.CATALOG_BRANCH||'main';
async function github(path,options={}){
  const repo=env('CATALOG_REPO');
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error('Invalid repo');
  const res=await fetch('https://api.github.com/repos/'+repo+path,{...options,headers:{Authorization:'Bearer '+env('CATALOG_TOKEN'),Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Hutzell-Stitches-catalog','X-GitHub-Api-Version':'2022-11-28'}});
  if(!res.ok){const conflict=[409,422].includes(res.status);throw Object.assign(new Error(conflict?'This design changed in another session. Reload it before saving.':'GitHub could not complete the request. Check the repository, branch and token.'),{status:conflict?409:502});}
  return res.json();
}
const path=id=>'/contents/content/'+id+'.json';
const ref=()=>'?ref='+encodeURIComponent(branch());
export async function builtinImage(name){
  if(!['pumpkin.webp','bow.webp'].includes(name))throw Object.assign(new Error('Image not found.'),{status:404});
  const file=await github('/contents/public/art/'+name+ref());
  return new Response(Buffer.from(file.content,'base64'),{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=600','X-Content-Type-Options':'nosniff'}});
}
export async function read(id){
  const file=await github(path(id)+ref());
  return {item:validate(JSON.parse(Buffer.from(file.content,'base64').toString())),sha:file.sha};
}
export async function thumbnail(id){
  const {item}=await read(id);const photo=item.photos[0];
  if(!photo)return new Response(null,{status:404});
  if(!photo.src.startsWith('data:'))return builtinImage(photo.src);
  const [header,data]=photo.src.split(',');
  return new Response(Buffer.from(data,'base64'),{headers:{'Content-Type':header.slice(5,-7),'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
}
export async function list(){
  const files=await github('/contents/content'+ref());
  const designs=files.filter(f=>f.type==='file'&&f.name.endsWith('.json')&&safeId(f.name.slice(0,-5)));
  const items=[];
  for(let i=0;i<designs.length;i+=5){
    const rows=await Promise.all(designs.slice(i,i+5).map(async f=>{
      const {item}=await read(f.name.slice(0,-5));
      return {id:item.id,title:item.title,status:item.status,category:item.category,featured:item.featured,rank:item.rank,hasPhoto:Boolean(item.photos.length)};
    }));
    items.push(...rows);
  }
  return items.sort((a,b)=>a.rank-b.rank||a.title.localeCompare(b.title));
}
export async function change({item,id,sha,remove}){
  if(!safeId(id)||(sha!=null&&!/^[0-9a-f]{40}$/.test(sha))||(remove&&!sha))throw Object.assign(new Error('Invalid save request.'),{status:400});
  const payload={branch:branch(),message:(remove?'Remove':'Save')+' design '+id};
  if(sha)payload.sha=sha;
  if(!remove){const clean=validate(item);if(clean.id!==id)throw Object.assign(new Error('Design ID mismatch.'),{status:400});payload.content=Buffer.from(JSON.stringify(clean,null,2)+'\n').toString('base64');}
  const r=await github(path(id),{method:remove?'DELETE':'PUT',body:JSON.stringify(payload)});return {commit:r.commit.sha,sha:r.content?.sha||null};
}
