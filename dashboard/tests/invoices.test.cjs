/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');const {spawnSync}=require('node:child_process');
const {writeFileSync,mkdirSync}=require('node:fs');const {createServer}=require('node:http');
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();const root='http://localhost:3002';
async function actor(role){const id=randomUUID();const user=await db.user.create({data:{fullName:'Fictional Invoice Client José',email:`invoice-${id}@example.test`,emailNormalized:`invoice-${id}@example.test`,role,emailVerifiedAt:new Date()}});const token=randomUUID()+randomUUID();await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return {user,token};}
async function api(path,token,method='GET',body){const response=await fetch(root+path,{method,headers:{Origin:root,'Content-Type':'application/json',...(token?{Cookie:`__Host-apex_session=${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer());return {status:response.status,data,headers:response.headers};}
function okay(result,status=200){assert.equal(result.status,status,JSON.stringify(result.data));return result.data;}
const seller={displayName:'APEX FILINGS - FICTIONAL TEST',legalName:'Fictional Invoice Test Business',address:'123 Fictional Test Street\nTest City - Not a real seller address',email:'billing@example.test',website:'https://example.test',taxDetails:'Fictional test registration only',prefix:'INV',footer:'Fictional invoice QA only. Not a real customer document.',termsDays:7,remindersEnabled:false,creditNotesEnabled:true};

test('financial statuses use verified minor units, preserve refunds and identify discrepancies',async()=>{
 const {invoiceFinancials}=await import('../src/lib/invoices.ts');
 const base={lifecycle:'ISSUED',totalCents:39900,dueAt:null,payments:[],refunds:[]};
 assert.equal(invoiceFinancials(base).status,'UNPAID');assert.equal(invoiceFinancials({...base,lifecycle:'DRAFT'}).status,'DRAFT');
 const partial={id:'p1',amountCents:10000,status:'VERIFIED',verifiedAt:new Date()};
 assert.equal(invoiceFinancials({...base,payments:[partial]}).status,'PARTIALLY_PAID');assert.equal(invoiceFinancials({...base,payments:[partial]}).balanceCents,29900);
 assert.equal(invoiceFinancials({...base,dueAt:'2000-01-01',payments:[partial]}).status,'OVERDUE');
 assert.equal(invoiceFinancials({...base,payments:[{...partial,status:'AWAITING_VERIFICATION',verifiedAt:null}]}).paidCents,0);
 const paid={...partial,amountCents:39900};assert.equal(invoiceFinancials({...base,payments:[paid]}).status,'PAID');
 const refund={id:'r1',amountCents:5000,status:'COMPLETED',stripeRefundId:'re_test',stripeStatus:'succeeded'};
 const refunded=invoiceFinancials({...base,payments:[paid],refunds:[refund]});assert.equal(refunded.status,'PARTIALLY_REFUNDED');assert.equal(refunded.balanceCents,0);assert.equal(refunded.netCollectedCents,34900);
 assert.equal(invoiceFinancials({...base,payments:[paid],refunds:[{...refund,amountCents:39900}]}).status,'REFUNDED');
 const partialRefund=invoiceFinancials({...base,dueAt:'2000-01-01',payments:[partial],refunds:[{...refund,amountCents:10000}]});assert.equal(partialRefund.status,'PARTIALLY_REFUNDED');assert.equal(partialRefund.overdue,true);assert.equal(partialRefund.balanceCents,29900);
 assert.equal(invoiceFinancials({...base,payments:[paid],refunds:[{...refund,stripeStatus:'pending'}]}).refundedCents,0);
 assert.equal(invoiceFinancials({...base,payments:[{...paid,status:'DISPUTED'}]}).discrepancies.length,1);
 assert.equal(invoiceFinancials({...base,totalCents:null,lifecycle:'LEGACY'}).balanceCents,null);
 assert.equal(invoiceFinancials({...base,lifecycle:'VOIDED'}).balanceCents,0);
});

test('finalized orders, issuance, immutable PDFs, access, email, voiding and reviewed backfill',async()=>{
 const backupSettings=await db.invoiceSettings.findUnique({where:{id:'default'}}),backupState=await db.stateFilingFee.findUniqueOrThrow({where:{code:'LA'}});
 const sent=[];const mail=createServer(async(req,res)=>{const parts=[];for await(const part of req)parts.push(part);sent.push(JSON.parse(Buffer.concat(parts).toString()));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:randomUUID()}));});
 await new Promise(resolve=>mail.listen(3033,'127.0.0.1',resolve));
 try{
  await db.emailOutbox.updateMany({where:{status:{in:['QUEUED','SENDING']}},data:{status:'FAILED',leaseUntil:null,lastError:'Prior isolated test run'}});
  const owner=await actor('OWNER'),client=await actor('CLIENT'),stranger=await actor('CLIENT');
  const settingsPath='/api/v1/invoices/settings';
  assert.equal((await api(settingsPath,client.token)).status,403);
  okay(await api(settingsPath,owner.token,'PATCH',{data:seller,approved:false,verifiedDetails:false}));
  assert.equal((await api(settingsPath,owner.token,'PATCH',{data:seller,approved:true,verifiedDetails:false})).status,400);
  const stateData={filingFeeCents:10000,recurringFeeDescription:'$35 / year',recurringFeePeriod:'annual',processingTime:'Test only',sourceReference:'https://official.example.gov/fictional-test',active:true,verifiedAt:new Date().toISOString(),verificationConfirmed:true,referenceDifferenceConfirmed:true};
  okay(await api('/api/v1/admin/pricing',owner.token,'PATCH',{kind:'state',id:'LA',data:stateData}));
  const service=await db.service.findUniqueOrThrow({where:{slug:'llc'}}),basic=await db.package.findUniqueOrThrow({where:{slug:'basic'}}),advanced=await db.package.findUniqueOrThrow({where:{slug:'premium'}});
  const extra=await db.service.create({data:{slug:`invoice-extra-${randomUUID()}`,name:'Fictional paid mail service',description:'Isolated test only',category:'Formation',available:true,priceCents:2500,priceApproved:true}});
  async function submit(pack=advanced,extras=[]){
   const company=await db.company.create({data:{customerId:client.user.id,preferredName:`Fictional Invoice LLC ${randomUUID()}`,alternativeName1:'Fictional Backup LLC',formationState:'Louisiana',businessActivity:'Software',businessDescription:'Fictional invoice integration test business',addressRequirements:'I need guidance',ownershipType:'single',managementStructure:'member-managed',owners:{create:{fullLegalName:'Fictional Owner',email:'owner@example.test',phone:'+15555550123',nationality:'US',countryOfResidence:'US',residentialAddress:'Fictional address',ownershipBasisPoints:10000}}},include:{owners:true}});
   const app=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:pack.id,additionalServices:extras}});
   await db.document.create({data:{applicationId:app.id,companyId:company.id,ownerId:company.owners[0].id,uploadedById:client.user.id,documentType:'OWNER_ID',originalFilename:'fictional.pdf',privateStorageKey:randomUUID()+'.pdf',mimeType:'application/pdf',fileSize:40,clientVisible:true}});
   okay(await api(`/api/v1/client/applications/${app.id}/submit`,client.token,'POST',{confirmed:true}));
   return db.order.findUniqueOrThrow({where:{applicationId:app.id},include:{invoice:true,application:true}});
  }
  const pending=await submit();assert.equal(pending.invoice.lifecycle,'DRAFT');assert.equal(pending.invoice.totalCents,39900);assert.equal(pending.paymentStatus,'UNPAID');assert.match(pending.invoice.number,/^INV-\d{4}-\d{6,}$/);
  assert.equal((await api(`/api/v1/invoices/${pending.invoice.id}/pdf`,client.token)).status,409);
  assert.equal((await api(`/api/v1/invoices/${pending.invoice.id}/issue`,owner.token,'POST',{})).status,409,'missing approved seller details block official issue');
  okay(await api(settingsPath,owner.token,'PATCH',{data:seller,approved:true,verifiedDetails:true}));
  const concurrent=await Promise.all(Array.from({length:8},()=>api(`/api/v1/invoices/${pending.invoice.id}/issue`,owner.token,'POST',{})));for(const result of concurrent)okay(result);
  assert.equal(await db.invoice.count({where:{orderId:pending.id}}),1);assert.equal(await db.emailOutbox.count({where:{eventKey:`invoice:${pending.invoice.id}`}}),1);
  assert.equal((await db.notification.findUniqueOrThrow({where:{eventKey:`invoice:${pending.invoice.id}`}})).relatedEntity,pending.invoice.id);
  const invoiceId=pending.invoice.id;let invoice=okay(await api(`/api/v1/invoices/${invoiceId}`,client.token)).invoice;
  assert.equal(invoice.status,'UNPAID');assert.equal(invoice.balanceCents,39900);assert.equal(invoice.customer.clientReference,client.user.clientReference);assert.equal(invoice.totalCents,39900);
  const frozen=structuredClone(invoice.snapshot),number=invoice.number;
  const list=okay(await api(`/api/v1/invoices?customerId=${client.user.id}&search=${client.user.clientReference}`,owner.token));assert.ok(list.items.some(i=>i.id===invoiceId));
  assert.equal((await api(`/api/v1/invoices/${invoiceId}`,stranger.token)).status,404);assert.equal((await api(`/api/v1/invoices/${invoiceId}/pdf`,stranger.token)).status,404);assert.equal((await api(`/api/v1/invoices/${invoiceId}`,null)).status,401);
  assert.equal((await api(`/api/v1/invoices/${invoiceId}/void`,client.token,'POST',{reason:'Not authorized'})).status,403);
  assert.equal((await api(`/api/v1/invoices/${invoiceId}/paid`,owner.token,'POST',{})).status,404,'no frontend mark-paid action');
  const pdf=await api(`/api/v1/invoices/${invoiceId}/pdf`,client.token);okay(pdf);assert.equal(pdf.data.subarray(0,5).toString(),'%PDF-');assert.equal(pdf.headers.get('cache-control'),'private, no-store');mkdirSync('.local',{recursive:true});writeFileSync('.local/invoice-unpaid.pdf',pdf.data);
  await db.user.update({where:{id:client.user.id},data:{fullName:'Fictional changed profile'}});
  okay(await api(settingsPath,owner.token,'PATCH',{data:{...seller,address:'New fictional approved address'},approved:true,verifiedDetails:true}));
  invoice=okay(await api(`/api/v1/invoices/${invoiceId}`,client.token)).invoice;assert.deepEqual(invoice.snapshot,frozen);assert.equal(invoice.number,number);
  await assert.rejects(db.invoice.update({where:{id:invoiceId},data:{totalCents:1}}));await assert.rejects(db.invoice.update({where:{id:invoiceId},data:{number:'CHANGED'}}));await assert.rejects(db.invoice.delete({where:{id:invoiceId}}));
  const recorded=okay(await api('/api/v1/admin/payments',owner.token,'POST',{orderId:pending.id,amountCents:39900,reference:`FICTIONAL-${randomUUID()}`}),201);
  assert.equal(okay(await api(`/api/v1/invoices/${invoiceId}`,client.token)).invoice.status,'UNPAID');
  okay(await api(`/api/v1/admin/payments/${recorded.payment.id}/verify`,owner.token,'POST',{}));
  invoice=okay(await api(`/api/v1/invoices/${invoiceId}`,client.token)).invoice;assert.equal(invoice.status,'PAID');assert.equal(invoice.balanceCents,0);assert.equal(invoice.paidCents,39900);
  assert.equal((await api(`/api/v1/admin/payments/${recorded.payment.id}/verify`,owner.token,'POST',{})).status,409);assert.equal(await db.emailOutbox.count({where:{eventKey:`invoice-paid:${invoiceId}`}}),1);
  assert.equal((await api(`/api/v1/invoices/${invoiceId}/void`,owner.token,'POST',{reason:'Cannot void paid invoice'})).status,409);
  const sendKey=randomUUID();okay(await api(`/api/v1/invoices/${invoiceId}/send`,owner.token,'POST',{key:sendKey}));okay(await api(`/api/v1/invoices/${invoiceId}/send`,owner.token,'POST',{key:sendKey}));assert.equal(await db.emailOutbox.count({where:{eventKey:`invoice-send:${invoiceId}:${sendKey}`}}),1);
  assert.equal((await api(`/api/v1/invoices/${invoiceId}/send`,owner.token,'POST',{key:randomUUID()})).status,429);
  const basicOrder=await submit(basic,['ein','agent']);assert.equal(basicOrder.invoice.totalCents,29900);assert.equal(basicOrder.invoice.snapshot.items.length,2,'included services not charged twice');
  const advancedExtra=await submit(advanced,[extra.slug]);assert.equal(advancedExtra.invoice.totalCents,42400);assert.ok(advancedExtra.invoice.snapshot.items.some(i=>i.description===extra.name&&i.amountCents===2500));
  const simultaneous=await Promise.all(Array.from({length:4},()=>submit(basic)));assert.equal(new Set(simultaneous.map(o=>o.invoice.number)).size,4);
  okay(await api(`/api/v1/invoices/${basicOrder.invoice.id}/void`,owner.token,'POST',{reason:'Fictional order cancelled before payment'}));const voided=okay(await api(`/api/v1/invoices/${basicOrder.invoice.id}`,client.token)).invoice;assert.equal(voided.status,'VOIDED');assert.equal(voided.snapshot.totalCents,29900);assert.equal(voided.balanceCents,0);
  assert.equal((await api('/api/v1/payments/checkout',client.token,'POST',{orderId:basicOrder.id})).status,409);assert.equal((await api('/api/v1/admin/payments',owner.token,'POST',{orderId:basicOrder.id,amountCents:29900,reference:'FICTIONAL-VOID'})).status,409);
  await db.stateFilingFee.update({where:{code:'LA'},data:{active:false}});const unpriced=await submit(basic);assert.equal(unpriced.totalCents,null);assert.equal(unpriced.invoice,null);okay(await api('/api/v1/admin/pricing',owner.token,'PATCH',{kind:'state',id:'LA',data:stateData}));
  // Historical backfill with many item rows, a tax snapshot and an authorized discount.
  const company=await db.company.create({data:{customerId:client.user.id,preferredName:'Fictional Long Invoice LLC',formationState:'Louisiana',businessActivity:'Software',businessDescription:'Fictional historical fixture'}});
  const app=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:basic.id,status:'AWAITING_PAYMENT'}});
  const items=[{description:'Basic LLC Formation',amountCents:19900},{description:'Government Filing Fee — Louisiana',amountCents:10000},...Array.from({length:75},(_,i)=>({description:`Fictional additional service ${i+1} - long item description for pagination and wrapping, including approved administrative assistance.`,amountCents:100}))];
  const long=await db.order.create({data:{applicationId:app.id,serviceFeeCents:19900,governmentFeeCents:10000,thirdPartyFeeCents:0,additionalFeeCents:7500,discountCents:1000,totalCents:36900,pricingSnapshot:{pricingComplete:true,totalCents:36900,taxCents:500,items:[...items,{description:'Authorized discount',amountCents:-1000}]},items:{create:items}}});
  function backfill(args=[],orderId=long.id){return spawnSync(process.execPath,['--conditions=react-server','--import','tsx','-r','./tests/test-env.cjs','scripts/backfill-invoices.ts',`--order-id=${orderId}`,...args],{encoding:'utf8',timeout:60000});}
  let run=backfill();assert.equal(run.status,0,run.stderr);assert.equal(await db.invoice.count({where:{orderId:long.id}}),0,'dry run makes no invoice');
  run=backfill(['--apply',`--owner-id=${owner.user.id}`]);assert.equal(run.status,0,run.stderr);const longInvoice=await db.invoice.findUniqueOrThrow({where:{orderId:long.id}});assert.equal(longInvoice.taxCents,500);assert.equal(longInvoice.discountCents,1000);assert.equal(longInvoice.totalCents,36900);
  run=backfill(['--apply',`--owner-id=${owner.user.id}`]);assert.equal(run.status,0,run.stderr);assert.equal(await db.invoice.count({where:{orderId:long.id}}),1);
  const cancelledApp=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:basic.id,status:'CANCELLED'}});
  const cancelled=await db.order.create({data:{applicationId:cancelledApp.id,status:'CANCELLED',serviceFeeCents:19900,governmentFeeCents:10000,thirdPartyFeeCents:0,additionalFeeCents:0,discountCents:0,totalCents:29900,pricingSnapshot:{pricingComplete:true,totalCents:29900,taxCents:0,items:items.slice(0,2)},items:{create:items.slice(0,2)}}});
  run=backfill(['--apply',`--owner-id=${owner.user.id}`],cancelled.id);assert.equal(run.status,0,run.stderr);assert.equal(await db.invoice.count({where:{orderId:cancelled.id}}),0,'cancelled historical orders do not acquire new invoices');
  const longPdf=await api(`/api/v1/invoices/${longInvoice.id}/pdf`,client.token);okay(longPdf);writeFileSync('.local/invoice-long.pdf',longPdf.data);
  const legacyApp=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:basic.id,status:'AWAITING_PAYMENT'}});
  const legacyOrder=await db.order.create({data:{applicationId:legacyApp.id,serviceFeeCents:19900,governmentFeeCents:10000,thirdPartyFeeCents:0,additionalFeeCents:0,discountCents:0,totalCents:29900,items:{create:items.slice(0,2)}}});
  const legacy=await db.invoice.create({data:{orderId:legacyOrder.id,number:`HISTORICAL-${randomUUID()}`,issuedAt:new Date('2020-01-01'),lifecycle:'LEGACY',invoicePdfUrl:'https://invoice.stripe.com/fictional-original'}});
  assert.equal((await api(`/api/v1/invoices/${legacy.id}/issue`,owner.token,'POST',{})).status,409);okay(await api(`/api/v1/invoices/${legacy.id}/issue`,owner.token,'POST',{reviewedHistoricalDetails:true}));const reviewed=await db.invoice.findUniqueOrThrow({where:{id:legacy.id}});assert.equal(reviewed.number,legacy.number);assert.equal(reviewed.issuedAt.toISOString(),legacy.issuedAt.toISOString());assert.equal(reviewed.snapshot.provenance,'REVIEWED_BACKFILL');assert.equal(reviewed.invoicePdfUrl,legacy.invoicePdfUrl);
  const overdueInvoice=okay(await api(`/api/v1/invoices/${legacy.id}`,client.token)).invoice;assert.equal(overdueInvoice.status,'OVERDUE');assert.equal(overdueInvoice.canPay,true,'unpaid overdue invoices retain the authorized payment option');
  // Reminders run through the existing protected job, never a duplicate worker.
  okay(await api(settingsPath,owner.token,'PATCH',{data:{...seller,remindersEnabled:true},approved:true,verifiedDetails:true}));
  for(let i=0;i<6;i++){const job=await fetch(root+'/api/v1/jobs/email',{method:'POST',headers:{Authorization:`Bearer ${process.env.EMAIL_JOB_SECRET}`}});assert.equal(job.status,200);}
  assert.equal(await db.emailOutbox.count({where:{eventKey:{startsWith:`invoice-overdue:${legacy.id}:`}}}),1);assert.ok(sent.some(m=>m.subject.includes('Invoice Issued')),'existing Resend dispatcher sends invoice email');
  const email=await db.emailOutbox.findUniqueOrThrow({where:{eventKey:`invoice:${invoiceId}`}});assert.ok(email.html.includes(`/client/invoices/${invoiceId}`));assert.ok(email.html.includes(number));assert.equal(email.html.includes('/data/apex-documents'),false);
  // Genuine receipts must remain in collected totals even while seller approval
  // leaves the associated document in Draft.
  okay(await api(settingsPath,owner.token,'PATCH',{data:seller,approved:false,verifiedDetails:false}));
  const paidDraft=await submit(basic);assert.equal(paidDraft.invoice.lifecycle,'DRAFT');
  const before=okay(await api(`/api/v1/invoices?customerId=${client.user.id}`,owner.token)).totals.find(t=>t.currency==='USD').collectedCents;
  const draftPayment=okay(await api('/api/v1/admin/payments',owner.token,'POST',{orderId:paidDraft.id,amountCents:29900,reference:`FICTIONAL-DRAFT-${randomUUID()}`}),201);
  okay(await api(`/api/v1/admin/payments/${draftPayment.payment.id}/verify`,owner.token,'POST',{}));
  const after=okay(await api(`/api/v1/invoices?customerId=${client.user.id}`,owner.token)).totals.find(t=>t.currency==='USD').collectedCents;assert.equal(after-before,29900);
  const draftView=okay(await api(`/api/v1/invoices/${paidDraft.invoice.id}`,client.token)).invoice;assert.equal(draftView.lifecycle,'DRAFT');assert.equal(draftView.paidCents,29900);assert.equal((await api(`/api/v1/invoices/${paidDraft.invoice.id}/pdf`,client.token)).status,409);
  for(const status of ['DRAFT','UNPAID','PAID','OVERDUE','VOIDED']){const filtered=okay(await api(`/api/v1/invoices?status=${status}&customerId=${client.user.id}`,owner.token));assert.ok(filtered.items.length>0,status);assert.ok(filtered.items.every(i=>i.status===status));}
  assert.equal((await api('/api/v1/invoices?status=NOT_A_STATUS',client.token)).status,400);
  assert.equal(okay(await api(`/api/v1/invoices?status=PAID&customerId=${client.user.id}`,stranger.token)).total,0,'client scope overrides requested customer');
  okay(await api(settingsPath,owner.token,'PATCH',{data:seller,approved:true,verifiedDetails:true}));okay(await api(`/api/v1/invoices/${paidDraft.invoice.id}/issue`,owner.token,'POST',{}));assert.equal(okay(await api(`/api/v1/invoices/${paidDraft.invoice.id}`,client.token)).invoice.status,'PAID');
 }finally{const {code,...state}=backupState;await db.stateFilingFee.update({where:{code},data:state});if(backupSettings){const {id,...data}=backupSettings;await db.invoiceSettings.upsert({where:{id},create:{id,...data},update:data});}else await db.invoiceSettings.deleteMany({where:{id:'default'}});await new Promise(resolve=>mail.close(resolve));await db.$disconnect();}
});
