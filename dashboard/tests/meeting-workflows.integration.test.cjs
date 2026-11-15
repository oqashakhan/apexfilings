/* eslint-disable @typescript-eslint/no-require-imports */
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {randomUUID,createHash}=require('node:crypto');
const db=new PrismaClient(),root='http://localhost:3002';
assert.match(process.env.DATABASE_URL,/\/(apex_dashboard_test)(?:\?|$)/);
after(()=>db.$disconnect());
async function actor(role){
  const email=randomUUID()+'@example.test';
  const user=await db.user.create({data:{fullName:'Audit '+role,email,emailNormalized:email,role,emailVerifiedAt:new Date()}});
  const token=randomUUID()+randomUUID();await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
  return {id:user.id,email,token};
}
async function api(url,person,method='GET',value,expect=200){
  const file=value instanceof FormData;
  const res=await fetch(root+'/api/v1/'+url,{method,headers:{Origin:root,...(person?{Cookie:'__Host-apex_session='+person.token}:{}),...(file?{}:{'Content-Type':'application/json'})},body:value===undefined?undefined:file?value:JSON.stringify(value)});
  const data=await res.json();assert.equal(res.status,expect,url+' '+(data.error??''));return data;
}
async function app(client){
  const [pack,service]=await Promise.all([db.package.findUniqueOrThrow({where:{slug:'basic'}}),db.service.findUniqueOrThrow({where:{slug:'llc'}})]);
  const company=await db.company.create({data:{customerId:client.id,preferredName:'Audit '+randomUUID(),formationState:'Florida',businessActivity:'QA',businessDescription:'Isolated audit fixture',owners:{create:{fullLegalName:'Test owner',email:client.email,nationality:'US',countryOfResidence:'US',phone:'5555550100',residentialAddress:'Fixture address',ownershipBasisPoints:10000}}},include:{owners:true}});
  const application=await db.application.create({data:{companyId:company.id,packageId:pack.id,serviceId:service.id,customerId:client.id,status:'INFORMATION_REQUIRED'}});
  return {company,application};
}
test('saved package draft is isolated from live Vite, API and quotes until published; stale edits rejected and discard persists',async t=>{
  const owner=await actor('OWNER'),client=await actor('CLIENT');
  const pack=await db.package.findUniqueOrThrow({where:{slug:'basic'}});
  const original={name:pack.name,serviceFeeCents:pack.serviceFeeCents,description:pack.description,available:pack.available,includedServices:pack.includedServices,includedServiceSlugs:pack.includedServiceSlugs};
  const unique='Reviewed feature '+randomUUID(),data={...original,serviceFeeCents:pack.serviceFeeCents+111,description:unique};
  const payload={kind:'package',id:pack.id,mode:'draft',data};
  t.after(async()=>{await db.package.update({where:{id:pack.id},data:original});await db.pricingDraft.deleteMany({where:{kind:'package',recordId:pack.id}});});
  await api('admin/pricing',client,'PATCH',payload,403);
  const draft=await api('admin/pricing',owner,'PATCH',payload);
  const admin=await api('admin/pricing',owner);assert.equal(admin.drafts.find(d=>d.recordId===pack.id).data.description,unique);
  const live=async()=>(await api('pricing')).packages.find(p=>p.slug==='basic');
  assert.equal((await live()).serviceFeeCents,original.serviceFeeCents);
  await api('admin/pricing',owner,'PATCH',{...payload,version:'stale'},409);
  const quote=()=>api('pricing/quote',client,'POST',{packageSlug:'basic',state:'LA',services:[]});
  assert.equal((await quote()).serviceFeeCents,original.serviceFeeCents);
  let publicPage;
  if(process.env.APEX_PLAYWRIGHT_MODULE){
    const {chromium}=require(process.env.APEX_PLAYWRIGHT_MODULE),browser=await chromium.launch({channel:'msedge',headless:true});t.after(()=>browser.close());
    publicPage=await browser.newPage({viewport:{width:390,height:844}});
    await publicPage.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
    const catalog=publicPage.waitForResponse(r=>r.url()===root+'/api/v1/pricing'&&r.status()===200);await publicPage.goto('http://localhost:3000/pricing');await catalog;
    await publicPage.getByText('$'+(original.serviceFeeCents/100),{exact:true}).first().waitFor();
    assert.equal(await publicPage.getByText(unique,{exact:true}).count(),0);
    const adminPage=await browser.newPage();
    await adminPage.context().addCookies([{name:'__Host-apex_session',value:owner.token,url:"https://localhost:3002",secure:true,httpOnly:true,sameSite:"Lax"}]);
    await adminPage.goto(root+'/admin/services');await adminPage.getByLabel('Pricing type').selectOption('package');await adminPage.getByLabel('Pricing record',{exact:true}).selectOption(pack.id);
    await adminPage.getByText('Review saved draft',{exact:true}).waitFor();
    adminPage.once('dialog',dialog=>dialog.accept());
    await adminPage.getByRole('button',{name:'Publish saved draft'}).click();
    await adminPage.getByText('Pricing published.',{exact:true}).waitFor();
    await publicPage.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await publicPage.getByText(unique,{exact:true}).first().waitFor();
    await publicPage.getByText('$'+(data.serviceFeeCents/100),{exact:true}).first().waitFor();
  }else await api('admin/pricing',owner,'PATCH',{kind:'package',id:pack.id,mode:'publish',version:draft.version});
  assert.equal((await live()).serviceFeeCents,data.serviceFeeCents);assert.equal((await quote()).serviceFeeCents,data.serviceFeeCents);
  const second=await api('admin/pricing',owner,'PATCH',payload);await api('admin/pricing',owner,'PATCH',{kind:'package',id:pack.id,mode:'discard',version:second.version});
  assert.equal((await api('admin/pricing',owner)).drafts.some(d=>d.recordId===pack.id),false);
});
test('assigned staff: invitations, real login, scope, document request, replacement, cancellation, notification and revocation',async()=>{
  const admin=await actor('OWNER'),client=await actor('CLIENT'),other=await actor('CLIENT');
  const {application:a,company}=await app(client),unrelated=await app(other);
  const email=randomUUID()+'@example.test',invite={fullName:'Reviewer Fixture',staffScope:'OPERATIONS',email};
  await api('admin/staff',client,'POST',invite,403);
  const {staff}=await api('admin/staff',admin,'POST',invite,201);await api('admin/staff',admin,'POST',invite,409);
  const invitation=await db.emailOutbox.findFirstOrThrow({where:{toEmail:email,eventKey:{startsWith:'staff-invite:'}}});
  assert.equal(invitation.status,'QUEUED');const token=invitation.html.match(/reset-password\?token=([^"]+)/)[1];
  const password=randomUUID()+'Ax1!';await api('auth/reset-password',null,'POST',{token,password,confirm:password});
  const login=await fetch(root+'/api/v1/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  assert.equal(login.status,200);const reviewer={token:login.headers.get('set-cookie').match(/__Host-apex_session=([^;]+)/)[1]};
  await api('admin/staff',admin,'PATCH',{action:'assign',staffId:staff.id,applicationId:a.id});
  const path='admin/applications/'+a.id+'/document-requests',req={documentType:'OWNER_ID',ownerId:company.owners[0].id,reason:'Provide identity evidence for this application.',customTitle:'Owner identity',dueDate:'2027-02-15'};
  await api('admin/applications/'+unrelated.application.id+'/document-requests',reviewer,'GET',undefined,404);
  await api('admin/pricing',reviewer,'GET',undefined,403);
  const {request}=await api(path,reviewer,'POST',req,201);await api(path,reviewer,'POST',req,409);
  const clientApp=await api('client/applications/'+a.id,client);assert.equal(clientApp.application.documentRequests[0].customTitle,req.customTitle);assert.match(clientApp.application.documentRequests[0].dueDate,/2027-02-15/);
  assert.equal(await db.notification.count({where:{eventKey:'document-request:'+request.id,userId:client.id}}),1);
  assert.equal(await db.emailOutbox.count({where:{eventKey:'document-request:'+request.id,toEmail:client.email,status:'QUEUED'}}),1);
  function file(key,id){const form=new FormData();form.set('applicationId',a.id);form.set('ownerId',req.ownerId);form.set('documentType','CNIC');form.set(key,id);form.set('file',new Blob([Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')],{type:'application/pdf'}),'identity.pdf');return form;}
  await api('documents/upload',other,'POST',file('requestId',request.id),403);
  const uploaded=await api('documents/upload',client,'POST',file('requestId',request.id),201);
  await api('admin/documents/'+uploaded.document.id+'/review',reviewer,'POST',{status:'REPLACEMENT_REQUIRED',reason:'Please upload a clearer scan.'});
  const replacement=await api('documents/upload',client,'POST',file('replacesDocumentId',uploaded.document.id),201);
  await api('admin/documents/'+replacement.document.id+'/review',reviewer,'POST',{status:'ACCEPTED'});
  assert.equal((await api(path,reviewer)).requests.find(r=>r.id===request.id).status,'ACCEPTED');
  await api(path,admin,'POST',req,409);const next=await api(path,admin,'POST',{...req,confirmReplacement:true},201);
  await api(path,admin,'PATCH',{requestId:next.request.id});
  await api('documents/upload',client,'POST',file('requestId',next.request.id),409);
  const again=await api(path,admin,'POST',{...req,confirmReplacement:true},201);
  const rejected=await api('documents/upload',client,'POST',file('requestId',again.request.id),201);
  await api('admin/documents/'+rejected.document.id+'/review',reviewer,'POST',{status:'REPLACEMENT_REQUIRED',reason:'Provide a readable copy.'});
  await api(path,admin,'PATCH',{requestId:again.request.id});
  await api('documents/upload',client,'POST',file('replacesDocumentId',rejected.document.id),409);
  assert.equal((await api('client/applications/'+a.id,client)).application.nextAction.documentRequests.some(r=>r.requestId===next.request.id),false);
  const ticket=await db.supportTicket.create({data:{customerId:client.id,subject:'Assigned support fixture',body:'Question',assignedToId:staff.id}});
  await api('admin/support/'+ticket.id+'/reply',reviewer,'POST',{message:'A reply from assigned staff',idempotencyKey:randomUUID()},201);
  await api('admin/support/'+ticket.id,reviewer,'PATCH',{assignedToId:null},403);
  await api('admin/support/'+ticket.id,reviewer,'PATCH',{status:'RESOLVED'});
  assert.equal((await db.supportTicket.findUnique({where:{id:ticket.id}})).status,'RESOLVED');
  const foreign=await db.supportTicket.create({data:{customerId:other.id,subject:'Unrelated fixture',body:'Question'}});
  await api('admin/support/'+foreign.id+'/reply',reviewer,'POST',{message:'Unauthorized',idempotencyKey:randomUUID()},404);
  await api('admin/support/'+foreign.id,reviewer,'PATCH',{status:'CLOSED'},404);
  const page=await fetch(root+'/staff',{headers:{Cookie:'__Host-apex_session='+reviewer.token}});assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes(company.preferredName));assert.ok(!html.includes(unrelated.company.preferredName));
  await api('admin/staff',admin,'PATCH',{action:'profile',id:staff.id,fullName:'Changed Reviewer',staffScope:'SUPPORT',status:'SUSPENDED'});
  await api(path,reviewer,'GET',undefined,401);assert.equal((await db.application.findUnique({where:{id:a.id}})).assignedStaffId,null);
});

test('marketing preview binds content and consent; queue worker batches, rechecks unsubscribe and cancellation without delivery',async t=>{
  const owner=await actor('OWNER'),one=await actor('CLIENT'),two=await actor('CLIENT'),three=await actor('CLIENT');
  const old=await db.invoiceSettings.findUnique({where:{id:'default'}});
  const id=randomUUID();
  t.after(async()=>{
    await db.emailBroadcast.updateMany({where:{id},data:{cancelledAt:new Date()}});
    if(old){const {id:key,...data}=old;await db.invoiceSettings.update({where:{id:key},data});}else await db.invoiceSettings.deleteMany({where:{id:'default'}});
  });
  const settings=await api('invoices/settings',owner);
  await api('invoices/settings',owner,'PATCH',{approved:true,verifiedDetails:true,data:{...settings.data,legalName:'Test Fixture',address:'Isolated test address',email:'test@example.test',website:'https://example.test'}});
  const draft={action:'preview',id,category:'MARKETING',audience:'SELECTED',selectedIds:[one.id,two.id,three.id],subject:'Audit newsletter',message:'Safe <script>plain text</script>.'};
  await api('admin/broadcasts',one,'POST',draft,403);
  assert.equal((await api('admin/broadcasts',owner,'POST',draft)).count,0);
  await api('marketing-preference',one,'POST',{subscribe:true});await api('marketing-preference',two,'POST',{subscribe:true});
  const first=await api('admin/broadcasts',owner,'POST',draft);assert.equal(first.count,2);assert.ok(first.html.includes('&lt;script&gt;'));
  await api('marketing-preference',two,'POST',{subscribe:false});
  await api('admin/broadcasts',owner,'POST',{action:'confirm',id,confirmed:true,fingerprint:first.fingerprint},409);
  await api('marketing-preference',two,'POST',{subscribe:true});
  await api('marketing-preference',three,'POST',{subscribe:true});
  await db.broadcastSuppression.create({data:{email:three.email,reason:'Isolated suppression fixture'}});
  const final=await api('admin/broadcasts',owner,'POST',{...draft,message:'Updated content to confirm.'});assert.equal(final.count,2);assert.notEqual(final.fingerprint,first.fingerprint);
  await api('admin/broadcasts',owner,'POST',{action:'confirm',id,confirmed:false,fingerprint:final.fingerprint},400);
  await api('admin/broadcasts',owner,'POST',{action:'test',id});
  assert.equal(await db.emailOutbox.count({where:{eventKey:{startsWith:'broadcast-test:'+owner.id+':'},toEmail:owner.email,status:'QUEUED'}}),1);
  const confirm={action:'confirm',id,confirmed:true,fingerprint:final.fingerprint};
  await api('admin/broadcasts',owner,'POST',confirm);await api('admin/broadcasts',owner,'POST',confirm);
  assert.equal(await db.broadcastRecipient.count({where:{broadcastId:id}}),2);
  const {queueBroadcastBatch,mayDispatchBroadcast}=require('../src/server/broadcasts.ts');
  await queueBroadcastBatch(1);
  assert.equal(await db.broadcastRecipient.count({where:{broadcastId:id,outboxId:{not:null}}}),1);
  await queueBroadcastBatch(2);await queueBroadcastBatch(2);
  const recipients=await db.broadcastRecipient.findMany({where:{broadcastId:id},include:{outbox:true}});
  for(const r of recipients){assert.equal(r.outbox.status,'QUEUED');assert.equal(r.outbox.toEmail,r.email);assert.equal(r.outbox.attempts,0);assert.ok(r.outbox.html.includes('/unsubscribe?token='+r.unsubscribeToken));}
  const recipient=recipients[0];assert.equal(await mayDispatchBroadcast(recipient.outboxId),true);
  await api('marketing-preference',null,'POST',{token:recipient.unsubscribeToken});
  assert.equal(await mayDispatchBroadcast(recipient.outboxId),false);
  const history=await api('admin/broadcasts?id='+id,owner);assert.deepEqual(history.counts,[{status:'QUEUED',count:2}]);
  await api('admin/broadcasts',owner,'POST',{action:'cancel',id});assert.equal(await mayDispatchBroadcast(recipients[1].outboxId),false);
  assert.equal((await api('admin/broadcasts?id='+id,owner)).counts[0].status,'CANCELLED');
});
test('settings persistence, permissions and customer response search, pagination and read tracking',async()=>{
  const owner=await actor('OWNER'),client=await actor('CLIENT'),{company,application}=await app(client);
  await api('admin/profile',client,'PATCH',{fullName:'Unauthorized'},403);
  await api('admin/profile',owner,'PATCH',{fullName:'Changed Owner'});assert.equal((await api('auth/current',owner)).user.fullName,'Changed Owner');
  const prefs={everyLoginEmail:true,applicationEmail:false,paymentEmail:true,documentEmail:false,supportEmail:false};
  await api('admin/notification-preferences',owner,'PATCH',prefs);assert.equal((await api('admin/notification-preferences',owner)).preferences.everyLoginEmail,true);
  const search='Directory '+randomUUID();
  for(let i=0;i<8;i++){const email=randomUUID()+'@example.test';await db.user.create({data:{fullName:search+' '+i,email,emailNormalized:email,status:i===7?'SUSPENDED':'ACTIVE'}});}
  const firstPage=await api('admin/clients?search='+encodeURIComponent(search)+'&status=ACTIVE&pageSize=6',owner);
  const secondPage=await api('admin/clients?search='+encodeURIComponent(search)+'&status=ACTIVE&pageSize=6&page=2',owner);
  assert.equal(firstPage.total,7);assert.equal(firstPage.items.length,6);assert.equal(secondPage.items.length,1);assert.ok(!firstPage.items.some(u=>u.id===secondPage.items[0].id));
  const prefix=randomUUID();
  await db.customerResponse.createMany({data:Array.from({length:27},(_,i)=>({applicationId:application.id,customerId:client.id,requestEventId:randomUUID(),body:prefix+' '+i}))});
  const first=await api('admin/responses?q='+encodeURIComponent(company.preferredName),owner);assert.equal(first.total,27);assert.equal(first.items.length,25);
  assert.equal((await api('admin/responses?q='+prefix+'&page=2',owner)).items.length,2);
  await api('admin/responses',owner,'PATCH',{id:first.items[0].id});assert.equal((await api('admin/responses?q='+prefix+'&unread=true',owner)).total,26);
  await api('admin/responses?q='+prefix,client,'GET',undefined,403);
});

test('Owner settings save, cancel and refresh; failed note retains input; mobile broadcasts preview stays safe',{skip:!process.env.APEX_PLAYWRIGHT_MODULE},async t=>{
  const owner=await actor('OWNER'),client=await actor('CLIENT'),{application}=await app(client);
  const browser=await require(process.env.APEX_PLAYWRIGHT_MODULE).chromium.launch({channel:'msedge',headless:true});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(10000);
  await page.context().addCookies([{name:'__Host-apex_session',value:owner.token,url:'https://localhost:3002',secure:true,httpOnly:true,sameSite:'Lax'}]);
  await page.goto(root+'/admin/settings');await page.getByLabel('Full name',{exact:true}).fill('Browser Owner');await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Profile saved.').waitFor();
  await page.reload();const name=page.getByLabel('Full name',{exact:true});await name.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('input')].some(i=>i.value==='Browser Owner'));
  await name.fill('Discard me');await name.locator('xpath=ancestor::section[1]').getByRole('button',{name:'Cancel changes'}).click();assert.equal(await name.inputValue(),'Browser Owner');
  await page.goto(root+'/admin/applications/'+application.id);await page.getByText('Internal Notes',{exact:true}).first().click();
  const note=page.getByPlaceholder('Internal note');await note.fill('Keep this draft');
  await page.route('**/api/v1/admin/applications/*/notes',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Test write unavailable"}'}));
  await page.getByRole('button',{name:'Save note'}).click();await page.getByText('Test write unavailable',{exact:true}).first().waitFor();assert.equal(await note.inputValue(),'Keep this draft');
  await page.unroute('**/api/v1/admin/applications/*/notes');await page.getByRole('button',{name:'Save note'}).click();await page.getByText('Note saved.').waitFor();
  assert.equal(await db.internalNote.count({where:{applicationId:application.id,body:'Keep this draft'}}),1);
  await page.goto(root+'/admin/email-broadcasts');await page.getByLabel('Category',{exact:false}).first().selectOption('SERVICE');await page.getByLabel('Audience').selectOption('SELECTED');await page.getByLabel('Subject',{exact:true}).fill('Preview only');await page.getByLabel('Message',{exact:true}).fill('Safe preview on mobile.');
  await page.getByRole('button',{name:'Preview and count recipients'}).click();await page.getByText('0 eligible recipients',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirm and queue broadcast'}).isDisabled(),true);
});

test('assigned staff can download an existing issued invoice PDF; another staff account cannot',async t=>{
  const invoice=await db.invoice.findFirst({where:{lifecycle:'ISSUED'},select:{id:true,order:{select:{application:{select:{id:true,assignedStaffId:true}}}}}});
  if(!invoice){t.skip('No issued invoice available in the isolated database');return;}
  const a=invoice.order.application,staff=await actor('STAFF'),other=await actor('STAFF'),owner=await actor('OWNER');
  t.after(()=>db.application.update({where:{id:a.id},data:{assignedStaffId:a.assignedStaffId}}));
  await api('admin/staff',owner,'PATCH',{action:'assign',staffId:staff.id,applicationId:a.id});
  const pdf=await fetch(root+'/api/v1/invoices/'+invoice.id+'/pdf',{headers:{Cookie:'__Host-apex_session='+staff.token}});
  assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
  await api('invoices/'+invoice.id+'/pdf',other,'GET',undefined,404);
});
