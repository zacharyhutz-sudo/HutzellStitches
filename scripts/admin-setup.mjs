import {randomBytes,scryptSync} from 'node:crypto';
const password=randomBytes(18).toString('base64url');
const salt=randomBytes(16).toString('hex');
console.log('Save the login password in your password manager. Enter the next two values as Netlify secrets.');
console.log('Admin login password:',password);
console.log('ADMIN_PASSWORD_HASH='+salt+':'+scryptSync(password,salt,64).toString('hex'));
console.log('SESSION_SECRET='+randomBytes(48).toString('base64url'));
