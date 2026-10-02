import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {once} from 'node:events';
process.env.A2B_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'a2b-package-check-'));
process.env.PORT='0';process.env.HOST='127.0.0.1';process.env.PUBLIC_URL='';
delete process.env.TWILIO_ACCOUNT_SID;delete process.env.TWILIO_AUTH_TOKEN;delete process.env.TWILIO_VERIFY_SERVICE_SID;
const {server,runtimeDatabase}=await import('../server.mjs');
if(!server.listening)await once(server,'listening');
const {openDatabase}=await import('../storage.mjs');
const sqlite=openDatabase(),origin='http://127.0.0.1:'+server.address().port;
let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
async function request(url,body,cookie,method,headers={}){
 const response=await fetch(origin+url,{method:method||(body===undefined?'GET':'POST'),headers:{...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{}
 return {response,text,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
try{
 let r=await request('/');check(r.response.status===200&&r.text.includes('A2B'),'homepage loads');
 for(const url of ['/careers','/start-project','/account'])check((await request(url)).response.status===200,'page '+url);
 for(const url of ['/admin','/admin/','/admin.html','/admin.html/','/%61dmin.html']){r=await request(url);check(r.text.includes('admin-login-form')&&!r.text.includes('id="cms-form"'),'admin login gate '+url);}
 r=await request('/api/admin/users',undefined,undefined,undefined,{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'a2begypt@gmail.com'});check(r.response.status===403,'external identity headers cannot grant admin');
 check((await request('/storage.mjs')).response.status===404,'server source inaccessible');
 check((await request('/data/a2b.sqlite')).response.status===404,'database inaccessible');
 r=await request('/api/applications',{});check(r.response.status===401,'anonymous form denied');
 const client={name:'Package QA',email:'qa@example.invalid',phone:'01200000001',password:'test-client-password-123',consent:true};
 r=await request('/api/auth/register',client);check(r.response.status===200&&r.cookie,'client signup and session');const clientCookie=r.cookie;
 check(!r.text.includes('password_hash'),'credentials not exposed');
 r=await request('/api/inquiries',{...client,brand:'QA Brand',industry:'Design',service:'Design'},clientCookie);check(r.response.status===201,'project submission persists');
 r=await request('/api/applications',{...client,role:'Designer',portfolio:'',message:'Test'},clientCookie);check(r.response.status===201,'career submission persists');
 check((await request('/api/admin/content',undefined,clientCookie)).response.status===403,'client cannot access CMS');
 check((await request('/api/auth/logout',{},clientCookie,undefined,{Origin:'https://untrusted.example'})).response.status===403,'cross origin action denied');
 const salt=randomBytes(32).toString('hex'),ownerId=randomUUID(),date=new Date().toISOString();
 sqlite.prepare('INSERT INTO users (id,name,email,phone,username,admin_role,job_title,password_hash,password_salt,status,must_change_password,phone_verified,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(ownerId,'QA Owner','owner@example.invalid','+201200000000','qa.owner','owner','Owner',pbkdf2Sync('owner-password-123',salt,100000,64,'sha512').toString('hex'),salt,'active',0,0,date,date);
 r=await request('/api/auth/login',{identifier:'qa.owner',password:'owner-password-123'});check(r.response.status===200&&r.data.user.role==='owner','owner username login');const ownerCookie=r.cookie;
 r=await request('/admin',undefined,ownerCookie);check(r.response.status===200&&!r.text.includes('admin-login-form'),'owner dashboard opens');
 r=await request('/api/admin/inquiries',undefined,ownerCookie);check(r.data.inquiries.length===1,'owner sees project');
 r=await request('/api/admin/applications',undefined,ownerCookie);check(r.data.applications.length===1,'owner sees career application');
 r=await request('/api/admin/content',undefined,ownerCookie);const content=r.data.content,version=r.data.version;
 content.appearance.tagOne='QA EDITED';r=await request('/api/admin/content',{content,version},ownerCookie,'PUT');check(r.response.status===200,'CMS update saved');
 check((await request('/api/content')).data.content.appearance.tagOne==='QA EDITED','CMS reflected publicly');
 r=await request('/api/admin/content',{content,version},ownerCookie,'PUT');check(r.response.status===409,'concurrent stale edits protected');
 const staff={name:'QA Editor',username:'qa.editor',email:'editor@example.invalid',phone:'01200000002',title:'Designer',role:'editor',password:'editor-password-123'};
 check((await request('/api/admin/staff',staff,ownerCookie)).response.status===201,'owner creates titled staff');
 r=await request('/api/auth/login',{identifier:staff.username,password:staff.password});const temporary=r.cookie;check(r.data.user.mustChangePassword,'temporary staff password requires change');
 check((await request('/api/admin/content',undefined,temporary)).response.status===403,'temporary staff cannot use CMS');
 r=await request('/api/auth/password',{currentPassword:staff.password,password:'new-editor-password-123'},temporary);check(r.response.status===200,'staff changes temporary password');const editorCookie=r.cookie;
 check((await request('/api/admin/content',undefined,editorCookie)).response.status===200,'editor can view CMS');
 check((await request('/api/admin/users',undefined,editorCookie)).response.status===403,'editor cannot access accounts');
 const form=new FormData();form.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')],{type:'image/png'}),'qa.png');
 const uploaded=await fetch(origin+'/api/admin/upload',{method:'POST',headers:{Origin:origin,Cookie:ownerCookie},body:form});const upload=await uploaded.json();check(uploaded.status===201,'image upload persists');
 const media=await fetch(origin+upload.src);check(media.status===200&&media.headers.get('content-type')==='image/png','uploaded image served');await media.arrayBuffer();
 check((await request('/api/auth/forgot',{identifier:client.email})).response.status===503,'unconfigured OTP does not fake delivery');
 const second=openDatabase();check(second.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n===1,'SQLite persists across reopened connections');second.close();
 check((await fetch(origin+'/fonts/Cairo-Bold.ttf')).status===200,'Arabic font accessible');
 const pdf=await fetch(origin+'/A2B-Company-Portfolio.pdf');const bytes=new Uint8Array(await pdf.arrayBuffer());check(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-','final PDF accessible');
 console.log('Passed '+checks+' package checks.');
}finally{
 sqlite.close();await new Promise(resolve=>server.close(resolve));runtimeDatabase.close();
 const target=path.resolve(process.env.A2B_DATA_DIR),temporary=path.resolve(os.tmpdir())+path.sep;
 if(!target.startsWith(temporary+'a2b-package-check-'))throw Error('Unsafe temporary cleanup target.');
 fs.rmSync(target,{recursive:true,force:true});
}
