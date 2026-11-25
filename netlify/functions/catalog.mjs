import {reply,authorized,sameOrigin,siteEnabled} from '../../server/auth.mjs';
import {safeId} from '../../server/model.mjs';
import {list,read,change,builtinImage,thumbnail} from '../../server/github.mjs';
export const config={path:'/api/catalog'};
export default async function catalog(req){
  try{
    if(!siteEnabled())return reply(404,{error:'Unavailable.'});
    if(!authorized(req))return reply(401,{error:'Please sign in.'});
    if(req.method==='GET'){const art=new URL(req.url).searchParams.get('art');if(art)return await builtinImage(art);const thumb=new URL(req.url).searchParams.get('thumb');if(thumb)return safeId(thumb)?await thumbnail(thumb):reply(400,{error:'Invalid design.'});const id=new URL(req.url).searchParams.get('id');if(id&&!safeId(id))return reply(400,{error:'Invalid design.'});return reply(200,id?await read(id):{items:await list()});}
    if(req.method!=='POST'||!sameOrigin(req))return reply(403,{error:'Use the editor on this site.'});
    const raw=await req.text();if(raw.length>685000)return reply(413,{error:'Choose smaller photos.'});
    return reply(200,await change(JSON.parse(raw)));
  }catch(e){return reply(e.status||500,{error:e.status?e.message:'The catalog request failed. Try again.'});}
}
