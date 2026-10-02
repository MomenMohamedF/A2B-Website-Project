import {openDatabase} from '../storage.mjs';
import {randomBytes,randomUUID,pbkdf2Sync} from 'node:crypto';
import readline from 'node:readline/promises';
const sqlite=openDatabase();
try{
 if(sqlite.prepare("SELECT id FROM users WHERE admin_role='owner'").get())throw Error('An owner already exists. Sign in using the existing owner account.');
 const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
 const name=(await prompt.question('Owner name [A2B Owner]: ')).trim()||'A2B Owner';
 const username=(await prompt.question('Username [a2b]: ')).trim().toLowerCase()||'a2b';
 let phone=(await prompt.question('Phone [01025105983]: ')).trim()||'01025105983';prompt.close();
 phone=phone.replace(/[\s()-]/g,'');if(/^01\d{9}$/.test(phone))phone='+20'+phone.slice(1);
 if(!/^[a-z][a-z0-9_.-]{2,39}$/.test(username)||!/^\+[1-9]\d{7,14}$/.test(phone))throw Error('Invalid username or phone.');
 async function secret(label){
  if(!process.stdin.isTTY)throw Error('Run owner setup in an interactive terminal.');
  process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();
  return new Promise((resolve,reject)=>{let value='';function done(){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}
   function read(buffer){for(const char of buffer.toString('utf8')){if(char==='\u0003'){done();reject(Error('Cancelled'));return;}if(char==='\r'||char==='\n'){done();resolve(value);return;}if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);continue;}if(char>=' '&&!char.startsWith('\u001b'))value+=char;}}
   process.stdin.on('data',read);
  });
 }
 const password=await secret('Password (hidden, 10+ characters): '),confirm=await secret('Confirm password (hidden): ');
 if(password.length<10||password.length>128||password!==confirm)throw Error('Passwords must match and be 10–128 characters.');
 const salt=randomBytes(32).toString('hex'),hash=pbkdf2Sync(password,salt,100000,64,'sha512').toString('hex'),date=new Date().toISOString();
 sqlite.prepare('INSERT INTO users (id,name,email,phone,username,admin_role,job_title,password_hash,password_salt,status,must_change_password,phone_verified,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),name,'a2begypt@gmail.com',phone,username,'owner','Owner',hash,salt,'active',0,0,date,date);
 console.log('Owner created. Sign in at /admin.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{sqlite.close();}
