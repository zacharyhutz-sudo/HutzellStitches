import {reply,sameOrigin,verifyPassword,issue,cookie,siteEnabled} from '../../server/auth.mjs';
export const config={path:'/api/login',rateLimit:{windowLimit:8,windowSize:60,aggregateBy:['ip','domain']}};
export default async function login(req){
  if(!siteEnabled())return reply(404,{error:'Unavailable.'});
  if(req.method!=='POST'||!sameOrigin(req))return reply(403,{error:'Open the admin page on this site.'});
  try{
    const raw=await req.text();if(raw.length>1000)return reply(400,{error:'Invalid request.'});
    const body=JSON.parse(raw);
    if(body.logout)return reply(200,{ok:true},{'Set-Cookie':cookie('',0)});
    if(!verifyPassword(body.password))return reply(401,{error:'Incorrect password.'});
    return reply(200,{ok:true},{'Set-Cookie':cookie(issue(),14400)});
  }catch(e){return reply(e.status||503,{error:'Login is unavailable. Check the admin environment settings.'});}
}
