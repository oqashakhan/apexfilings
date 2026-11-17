/* eslint-disable @typescript-eslint/no-require-imports */
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient(),root='http://localhost:3002';
after(()=>db.$disconnect());
test('database references remain stable and concurrent normal application creation is unique and searchable',async t=>{
 const suffix=randomUUID(),email='reference-'+suffix+'@example.test';
 const user=await db.user.create({data:{fullName:'Reference fixture',email,emailNormalized:email,role:'CLIENT',emailVerifiedAt:new Date()}});
 const owner=await db.user.create({data:{fullName:'Owner fixture',email:'owner-'+email,emailNormalized:'owner-'+email,role:'OWNER',emailVerifiedAt:new Date()}});
 async function session(u){const token=randomUUID()+randomUUID();await db.session.create({data:{userId:u.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return token;}
 const clientToken=await session(user),ownerToken=await session(owner);
 async function api(path,token,method='GET',data){const r=await fetch(root+path,{method,headers:{Origin:root,Cookie:'__Host-apex_session='+token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};}
 const input={preferredName:'Reference LLC',firstAlternativeName:'Backup LLC',formationState:'Florida',businessActivity:'Testing',description:'Isolated test fixture',addressRequirement:'Guidance',membership:'single',management:'member-managed',packageSlug:'basic',additionalServices:[],owners:[{fullName:'Fixture owner',email,phone:'123456789',nationality:'US',residence:'US',address:'Test fixture address',ownership:100}]};
 const results=await Promise.all(Array.from({length:12},(_,i)=>api('/api/v1/client/applications',clientToken,'POST',{...input,preferredName:'Ref '+suffix+' '+i})));
 for(const result of results)assert.equal(result.status,201,JSON.stringify(result.data));
 const apps=results.map(r=>r.data.application),refs=apps.map(a=>a.reference);
 assert.equal(new Set(refs).size,12);for(const ref of refs)assert.match(ref,/^APP-\d{6,}$/);
 const reference=refs[0],id=apps[0].id;
 assert.equal((await api('/api/v1/client/applications/'+id,clientToken)).data.application.reference,reference);
 const searched=await api('/api/v1/admin/applications?search='+reference,ownerToken);
 assert.ok(searched.data.items.some(a=>a.id===id&&a.reference===reference));
 const searchedId=await api('/api/v1/admin/applications?search='+id,ownerToken);assert.ok(searchedId.data.items.some(a=>a.id===id));
 await assert.rejects(()=>db.application.update({where:{id},data:{reference:'APP-999999999'}}));
 assert.equal((await db.application.findUniqueOrThrow({where:{id}})).reference,reference);
 if(process.env.APEX_PLAYWRIGHT_MODULE) {
   const {chromium}=require(process.env.APEX_PLAYWRIGHT_MODULE);
   const browser=await chromium.launch({channel:'msedge',headless:true});t.after(()=>browser.close());
   async function pageFor(token,viewport) {
     const context=await browser.newContext({viewport});
     await context.addCookies([{name:'__Host-apex_session',value:token,url:'https://localhost:3002',secure:true,httpOnly:true}]);
     const page=await context.newPage();page.setDefaultTimeout(15000);return page;
   }
   for(const viewport of [{width:1440,height:900},{width:768,height:900},{width:390,height:844}]) {
     const client=await pageFor(clientToken,viewport),admin=await pageFor(ownerToken,viewport);
     await client.goto(root+'/client/applications');await client.getByLabel('Select company').selectOption(apps[0].companyId);await client.getByText(reference,{exact:true}).first().waitFor();
     await client.getByRole('link',{name:'View',exact:true}).first().click();
     assert.match(await client.locator('body').innerText(),/APP-[0-9]{6,}/);
     await admin.goto(root+'/admin/clients/'+user.id);
     await admin.locator('.company-document-company-selector select').selectOption(apps[0].companyId);
     await admin.getByRole('tab',{name:'Applications',exact:true}).click();
     await admin.getByText(reference,{exact:true}).first().waitFor();
     await admin.getByRole('button',{name:'Upload Company Document'}).click();
     await admin.getByRole('dialog').waitFor();
     assert.match(await admin.getByLabel('Document application').locator('option:checked').innerText(), /APP-\d{6,}/);
     await admin.getByRole('button',{name:'Close upload form'}).click();
     if(viewport.width>=1000) {
       const a=await admin.locator('.sidebar').boundingBox(),c=await client.locator('.sidebar').boundingBox();
       assert.equal(a.width,c.width);
       for(const text of ['Dashboard','Operations','Management','Communications','Account'])await admin.locator('.sidebar-group-heading').getByText(text,{exact:true}).waitFor();
     }
     await client.goto(root+'/client/messages');
     await client.locator('.topbar-crumb').getByText('Messages',{exact:true}).waitFor();
     if (viewport.width <= 900) {
       const menu=client.getByRole('button',{name:'Open navigation'}); await menu.click();
       assert.equal(await menu.getAttribute('aria-expanded'),'true');
       await client.locator('.sidebar-nav').getByRole('link',{name:/Messages/}).waitFor();
       await client.getByRole('button',{name:'Close menu'}).click();
       assert.equal(await menu.getAttribute('aria-expanded'),'false');
     }
     assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
     if (viewport.width !== 768) {
       const sections = {admin:['dashboard','applications','clients','orders','invoices','documents','payments','services','staff','activity','website-content','responses','messages','support','email-broadcasts','email-delivery','notifications','settings'],client:['dashboard','companies','applications','orders','invoices','documents','payments','services','messages','support','profile','settings']};
       for (const [role,page] of [['admin',admin],['client',client]]) {
         for (const section of sections[role]) {
           const response=await page.goto(`${root}/${role}/${section}`); assert.equal(response.status(),200,`${role}/${section}`);
           await page.locator('.page-content').waitFor();
           assert.equal(await page.locator(`.sidebar-nav a[href="/${role}/${section}"]`).getAttribute('aria-current'),'page',`${role}/${section}`);
           assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`${role}/${section} width ${viewport.width}`);
         }
       }
     }
     await client.close();await admin.close();
   }
 }
});
