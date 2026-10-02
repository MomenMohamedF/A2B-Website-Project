// Job titles are descriptive; roles alone grant server permissions.
const ADMIN_ROLES={owner:['content','submissions','accounts','security'],manager:['content','submissions'],editor:['content'],submissions:['submissions']};
async function adminPrincipal(request,env){
 const user=await currentUser(request,env);
 if(user&&user.session_purpose==='normal'&&!user.must_change_password&&ADMIN_ROLES[user.admin_role])return {id:user.id,role:user.admin_role,name:user.name,title:user.job_title,permissions:ADMIN_ROLES[user.admin_role],bootstrap:false};
 return null;
}

function adminPermission(path){
 if(path==='/api/admin/me')return null;
 if(['/api/admin/content','/api/admin/upload','/api/admin/portfolio'].includes(path))return 'content';
 if(/^\/api\/admin\/(applications|inquiries)(\/|$)/.test(path))return 'submissions';
 if(/^\/api\/admin\/(users|staff|owner-account|audit)(\/|$)/.test(path))return 'accounts';
 return 'security';
}
function staffUsername(value){const v=str(value,40,3).toLowerCase();if(!/^[a-z][a-z0-9_.-]{2,39}$/.test(v))throw Error('راجع اسم المستخدم؛ يبدأ بحرف إنجليزي، من 3 إلى 40 حرفًا بدون مسافات.');return v;}
async function auditAdmin(env,principal,action,subject,details=''){await db(env).prepare('INSERT INTO admin_audit (id,actor,action,subject_id,details,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),principal.id,action,subject,details,nowIso()).run();}
async function staffCreate(request,env,principal,ownerAccount=false){
 const input=await parseBody(request,5000),name=str(input.name,120,2),email=ownerAccount?OWNER_EMAIL:str(input.email,180,5).toLowerCase(),phone=normalizePhone(input.phone),username=staffUsername(input.username),title=str(input.title||'',120),password=passwordValue(input.password),role=ownerAccount?'owner':input.role;
 if(!/^\S+@\S+\.\S+$/.test(email))return error('راجع البريد الإلكتروني.');
 if(!ownerAccount&&!['manager','editor','submissions'].includes(role))return error('اختر صلاحية صحيحة للفريق.');
 if(ownerAccount){if(!principal.bootstrap)return error('إنشاء حساب المالك يحتاج تأكيد هوية المالك.',403);if(await db(env).prepare('SELECT id FROM users WHERE admin_role=?').bind('owner').first())return error('حساب المالك موجود بالفعل. استخدم تسجيل الدخول أو استرجاع الحساب.',409);}
 const existing=await db(env).prepare('SELECT id,email FROM users WHERE email=? OR phone=? OR username=?').bind(email,phone,username).all();
 const claim=ownerAccount?existing.results.find(u=>u.email===OWNER_EMAIL):null;
 if(existing.results.some(u=>u.id!==claim?.id))return error('الإيميل أو التليفون أو اسم المستخدم مسجل بالفعل.',409);
 const salt=randomToken(),hash=await passwordHash(password,salt),id=claim?.id||crypto.randomUUID(),created=nowIso();
 try{if(claim){await db(env).batch([db(env).prepare('UPDATE users SET name=?,phone=?,username=?,admin_role=?,job_title=?,password_hash=?,password_salt=?,status=?,must_change_password=0 WHERE id=?').bind(name,phone,username,role,title,hash,salt,'active',id),db(env).prepare('DELETE FROM sessions WHERE user_id=?').bind(id)]);}
 else await db(env).prepare('INSERT INTO users (id,name,email,phone,username,admin_role,job_title,password_hash,password_salt,status,must_change_password,phone_verified,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?)').bind(id,name,email,phone,username,role,title,hash,salt,'active',ownerAccount?0:1,created,created).run();}
 catch(e){if(e.message.includes('UNIQUE'))return error('بيانات الحساب مسجلة بالفعل.',409);throw e;}
 await auditAdmin(env,principal,ownerAccount?'owner_created':'staff_created',id,role+' · '+title);
 return json({ok:true,id},201);
}
async function staffUpdate(request,env,principal,id){
 const target=await db(env).prepare('SELECT * FROM users WHERE id=?').bind(id).first();if(!target)return error('الحساب غير موجود.',404);
 if(target.admin_role==='owner')return error('حساب المالك محفوظ. غيّر كلمة مروره من صفحة حسابك.',403);
 const input=await parseBody(request,3000),role=input.role??target.admin_role,title=input.title===undefined?target.job_title:str(input.title,120),state=input.status??target.status;
 if(!['client','manager','editor','submissions'].includes(role)||!['active','blocked'].includes(state))return error('راجع صلاحية الحساب وحالته.');
 let hash=target.password_hash,salt=target.password_salt,mustChange=target.must_change_password;
 if(input.password){const password=passwordValue(input.password);salt=randomToken();hash=await passwordHash(password,salt);mustChange=1;}
 await db(env).batch([db(env).prepare('UPDATE users SET admin_role=?,job_title=?,status=?,password_hash=?,password_salt=?,must_change_password=? WHERE id=?').bind(role,title,state,hash,salt,mustChange,id),db(env).prepare('DELETE FROM sessions WHERE user_id=?').bind(id)]);
 await auditAdmin(env,principal,input.password?'staff_password_reset':'account_updated',id,role+' · '+state+' · '+title);return json({ok:true});
}
async function adminRoute(request,env,path,principal){
 if(path==='/api/admin/me'&&request.method==='GET'){const owner=await db(env).prepare('SELECT id FROM users WHERE admin_role=?').bind('owner').first();return json({...principal,canCreateOwner:principal.bootstrap&&!owner});}
 if(path==='/api/admin/owner-account'&&request.method==='POST')return staffCreate(request,env,principal,true);
 if(path==='/api/admin/staff'&&request.method==='POST')return staffCreate(request,env,principal);
 if(path==='/api/admin/users'&&request.method==='GET'){const rows=await db(env).prepare('SELECT id,name,email,phone,username,admin_role,job_title,status,phone_verified,created_at,last_login_at FROM users ORDER BY created_at DESC LIMIT 1000').all();return json({users:rows.results,otpReady:await otpReady(env)});}
 if(/^\/api\/admin\/users\/[a-f0-9-]+$/.test(path)&&request.method==='PATCH')return staffUpdate(request,env,principal,path.split('/').pop());
 if(path==='/api/admin/audit'&&request.method==='GET'){const rows=await db(env).prepare('SELECT a.action,a.subject_id,a.details,a.created_at,COALESCE(u.name,a.actor) AS actor_name FROM admin_audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created_at DESC LIMIT 100').all();return json({events:rows.results});}
 return null;
}
