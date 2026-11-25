import {createHmac,timingSafeEqual,scryptSync,randomBytes,hkdfSync} from 'node:crypto';
export function reply(status,obj,headers={}){
  return Response.json(obj,{status,headers:{'Cache-Control':'no-store',...headers}});
}
export function env(key){const value=process.env[key];if(!value)throw Object.assign(new Error('Admin setup is incomplete. Check the deployment guide.'),{status:503});return value;}
export function siteEnabled(){return process.env.GIFT_PREVIEW_READY==='yes'&&(!process.env.CONTEXT||process.env.CONTEXT==='production');}
export function sameOrigin(req){return req.headers.get('origin')===new URL(req.url).origin;}
const previewPasswordHash = '5d61330e6da20b059136d326ba658631:ddf6a2681eebbfac626d297b2fd325050ff170364360bf04b85b02284920e5677b2516c96b1fbe1a2cdb11bd1d08258634b94aa645156f432525593fda0e0a5b';

export function verifyPassword(value){
  const [salt,hash]=(process.env.ADMIN_PASSWORD_HASH || previewPasswordHash).split(':');
  if(!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(hash))throw new Error('Invalid server configuration.');
  return typeof value==='string' && value.length>0 && value.length<256 && timingSafeEqual(Buffer.from(hash,'hex'),scryptSync(value,salt,64));
}
function signingKey(){
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Derive a session-only key from the repository token already configured on Netlify.
  return Buffer.from(hkdfSync('sha256', env('CATALOG_TOKEN'), env('CATALOG_REPO'), 'hutzell-stitches/admin-cookie/v1', 32));
}

const mac=value=>createHmac('sha256',signingKey()).update(value).digest('hex');
export function issue(){const body=String(Date.now()+4*3600000)+'.'+randomBytes(16).toString('hex');return body+'.'+mac(body);}
export function authorized(req){
  const token=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('hs_admin='))?.slice(9)??'';
  const [exp,nonce,sig]=token.split('.');
  return /^\d{13}$/.test(exp)&&Date.now()<Number(exp)&&/^[a-f0-9]{32}$/.test(nonce)&&/^[a-f0-9]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig),Buffer.from(mac(exp+'.'+nonce)));
}
export const cookie=(value,age)=>'hs_admin='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
