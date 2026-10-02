function safeCmsLink(value){if(!value)return '';const s=str(value,600);if(/^#[a-z][a-z0-9-]*$/i.test(s)||/^\/(?!\/)[a-z0-9/?#=&%._-]*$/i.test(s))return s;return webUrl(s);}
function validateCMS(c){
 const a=c.appearance||SEED.appearance||{},copy={};if(c.copy&&Object.keys(c.copy).length>600)throw Error('عدد النصوص كبير.');
 for(const [key,value] of Object.entries(c.copy||SEED.copy||{})){if(!/^(home|careers|client|account)-[a-z0-9-]+$/.test(key))throw Error('معرّف النص غير صالح.');copy[key]={ar:str(value.ar||'',3000),en:str(value.en||'',3000)};}
 const appearance={logo:mediaUrl(a.logo||'assets/a2b-logo-transparent.png'),mascot:mediaUrl(a.mascot||'assets/a2b-mascot.png'),showMascot:a.showMascot!==false,showTags:a.showTags!==false,tagOne:str(a.tagOne??'BIG IDEAS.',120),tagTwo:str(a.tagTwo??'BOLD MOVES.',120),tagSpeed:Math.max(1,Math.min(12,Number(a.tagSpeed)||3.6))};
 const serviceInput=c.services||SEED.services||[],extraInput=c.extraSections||[],sectionInput=c.sections||SEED.sections||[];
 if(!Array.isArray(serviceInput)||serviceInput.length>24||!Array.isArray(extraInput)||extraInput.length>20||!Array.isArray(sectionInput)||sectionInput.length>24)throw Error('عدد الأقسام أو الخدمات غير صالح.');
 const seen=new Set();const idOf=(id,prefix)=>{id=str(id,80,1);if(!new RegExp('^'+prefix+'[a-z0-9-]+$').test(id)||seen.has(id))throw Error('معرّف القسم أو الخدمة غير صالح.');seen.add(id);return id;};
 const services=serviceInput.map(s=>({id:idOf(s.id,'service-'),title:str(s.title,160,1),titleEn:str(s.titleEn||'',160),description:str(s.description||'',1800),descriptionEn:str(s.descriptionEn||'',1800),enabled:s.enabled!==false}));
 const extraSections=extraInput.map(s=>({id:idOf(s.id,'section-'),title:str(s.title,160,1),titleEn:str(s.titleEn||'',160),body:str(s.body||'',3000),bodyEn:str(s.bodyEn||'',3000),image:s.image?mediaUrl(s.image):'',cta:str(s.cta||'',160),ctaEn:str(s.ctaEn||'',160),href:safeCmsLink(s.href),dark:s.dark===true}));
 const allowed=new Set(['services','results','work','contact',...extraSections.map(s=>s.id)]),ordered=new Set();const sections=sectionInput.map(s=>{if(!allowed.has(s.id)||ordered.has(s.id))throw Error('ترتيب الأقسام غير صالح.');ordered.add(s.id);return {id:s.id,enabled:s.enabled!==false};});
 const formMessages={};for(const key of ['successTitle','successTitleEn','careerSuccess','careerSuccessEn','clientSuccess','clientSuccessEn'])formMessages[key]=str(c.formMessages?.[key]??SEED.formMessages?.[key]??'',1500);
 const portfolio=c.portfolio||SEED.portfolio||'A2B-Portfolio-2026.pdf';if(!/^(A2B-Portfolio-2026\.pdf|\/media\/[a-f0-9-]+\.pdf)$/.test(portfolio))throw Error('مسار البورتفوليو غير صالح.');
 return {copy,appearance,services,extraSections,sections,formMessages,portfolio};
}
