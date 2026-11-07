/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const root = 'http://localhost:3002';
test('owner publishing, customer quote, draft restoration and immutable submitted order', async () => {
 const suffix=randomUUID();
 async function actor(role) { const identity=randomUUID(); const user=await db.user.create({data:{fullName:'Fictional pricing test',email:`${role}-${identity}@example.test`,emailNormalized:`${role}-${identity}@example.test`,role,emailVerifiedAt:new Date()}}); const token=randomUUID()+randomUUID(); await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}}); return {user,token}; }
 async function api(path, method='GET', value, token) { const r=await fetch(root+path,{method,headers:{Origin:root,'Content-Type':'application/json',...(token?{Cookie:`__Host-apex_session=${token}`}:{})},body:value===undefined?undefined:JSON.stringify(value)});return {status:r.status,cache:r.headers.get('cache-control'),data:await r.json()}; }
 let state;
 let chargeId;
 const stateBackups = [];
 try {
 const owner=await actor('OWNER'), client=await actor('CLIENT'), stranger=await actor('CLIENT');
 const missing=await api('/api/v1/pricing/quote','POST',{packageSlug:'premium',state:'ZZ',services:[]},client.token);
 assert.equal(missing.status,200);assert.equal(missing.data.totalCents,null);assert.equal(missing.data.pendingItems[0].reason,'State fee record missing');assert.equal(missing.cache,'no-store');
 const catalog=await api('/api/v1/pricing'); assert.equal(catalog.status,200); assert.equal(catalog.data.states.length,51);
 const pack=catalog.data.packages.find(p=>p.slug==='basic'), advanced=catalog.data.packages.find(p=>p.slug==='premium'); assert.equal(pack.includedServices.length,8); assert.equal(advanced.includedServices.length,13);
 state=await db.stateFilingFee.findUniqueOrThrow({where:{code:'AK'}});
 const stateData={filingFeeCents:25000,recurringFeeDescription:state.recurringFeeDescription,recurringFeePeriod:state.recurringFeePeriod,processingTime:state.processingTime,sourceReference:'https://official.example.gov/test-only',verificationConfirmed:true,referenceDifferenceConfirmed:true,active:true,verifiedAt:new Date().toISOString()};
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:stateData},client.token)).status,403);
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:{...stateData,sourceReference:null}},owner.token)).status,400);
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:{...stateData,verificationConfirmed:false}},owner.token)).status,400,'owner must confirm official verification');
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:{...stateData,filingFeeCents:25001,referenceDifferenceConfirmed:false}},owner.token)).status,400,'reference differences require acknowledgement');
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:stateData},owner.token)).status,200);
 const service=await db.service.findUniqueOrThrow({where:{slug:'llc'}});
 const extra=await db.service.create({data:{slug:`extra-${suffix}`,name:'Fictional paid service',description:'Test only',category:'Formation',available:true}});
 const serviceData={name:extra.name,description:extra.description,available:true,currency:'USD',priceCents:2500,priceApproved:true};
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'service',id:extra.id,data:serviceData},owner.token)).status,200);
 const query={packageSlug:'basic',state:'Alaska',services:[extra.slug]};
 const quote=await api('/api/v1/pricing/quote','POST',query,client.token);assert.equal(quote.status,200);assert.equal(quote.data.totalCents,pack.serviceFeeCents+27500);
 for (const [code,name,fee] of [['FL','Florida',12500],['AK','Alaska',25000],['WY','Wyoming',10000],['LA','Louisiana',10000],['CA','California',7000],['DE','Delaware',11000],['TX','Texas',30800]]) {
   const original=await db.stateFilingFee.findUniqueOrThrow({where:{code}});
   if(code !== 'AK') stateBackups.push(original);
   assert.equal(original.referenceFilingFeeCents,fee,`${code} imported client reference`);
   await db.stateFilingFee.update({where:{code},data:{active:false,filingFeeCents:null,verifiedAt:null,sourceReference:'Client reference; not verified'}});
   for(const selectedPackage of [pack,advanced]){
     const pending=await api('/api/v1/pricing/quote','POST',{packageSlug:selectedPackage.slug,state:name,services:[]},client.token);
     assert.equal(pending.data.totalCents,null);assert.equal(pending.data.paymentAllowed,false);assert.equal(pending.data.knownSubtotalCents,selectedPackage.serviceFeeCents);
     assert.equal(pending.data.referenceSubtotalCents,selectedPackage.serviceFeeCents+fee);assert.ok(pending.data.pendingItems[0].description.includes(name));
     assert.match(pending.data.pendingItems[0].reason,/Owner verification and approval required/);assert.match(pending.data.pendingItems[0].reason,/Payable filing fee not configured/);assert.equal(pending.cache,'no-store');
   }
   assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:code,data:{...stateData,filingFeeCents:fee}},owner.token)).status,200);
   for(const selectedPackage of [pack,advanced]) {
     for(const services of [[],[extra.slug],['agent','ein'],[extra.slug,extra.slug]]) {
       const priced=await api('/api/v1/pricing/quote','POST',{packageSlug:selectedPackage.slug,state:name,services},client.token);
       assert.equal(priced.status,200); assert.equal(priced.data.totalCents,selectedPackage.serviceFeeCents+fee+(services.includes(extra.slug)?2500:0)); assert.equal(priced.data.discountCents,0);assert.equal(priced.cache,'no-store');assert.equal(priced.data.governmentFeeCents,fee);assert.deepEqual(priced.data.pendingItems,[]);
     }
   }
 }
 const company=await db.company.create({data:{customerId:client.user.id,preferredName:'Pricing Test LLC '+suffix,alternativeName1:'Backup LLC',formationState:'Alaska',businessActivity:'Software',businessDescription:'Fictional test business description',addressRequirements:'I need guidance',ownershipType:'single',managementStructure:'member-managed',owners:{create:{fullLegalName:'Fictional Owner',email:`test-${suffix}@example.test`,phone:'+15555550123',nationality:'US',countryOfResidence:'US',residentialAddress:'123 Fictional Street',ownershipBasisPoints:10000}}},include:{owners:true}});
 const app=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:pack.id}});
 const pendingApp=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:pack.id,status:'AWAITING_PAYMENT',additionalServices:[extra.slug]}});
 const pendingSnapshot={...quote.data,totalCents:null,issues:['Old pending quote']};
 const pendingOrder=await db.order.create({data:{applicationId:pendingApp.id,serviceFeeCents:pack.serviceFeeCents,pricingSnapshot:pendingSnapshot}});
 const pendingInput={...query,applicationId:pendingApp.id};
 assert.equal((await api('/api/v1/pricing/quote','POST',pendingInput,stranger.token)).status,404);
 const refreshedQuote=await api('/api/v1/pricing/quote','POST',pendingInput,client.token);
 assert.equal(refreshedQuote.data.totalCents,pack.serviceFeeCents+27500,'pending snapshot does not hide approved prices');
 assert.deepEqual((await db.order.findUniqueOrThrow({where:{id:pendingOrder.id}})).pricingSnapshot,pendingSnapshot,'quote read does not mutate the order');
 const selection={applicationId:app.id,packageSlug:'basic',state:'Alaska',services:[extra.slug]};
 assert.equal((await api('/api/v1/pricing/selection','PATCH',selection,stranger.token)).status,404);
 assert.equal((await api('/api/v1/pricing/selection','PATCH',selection,client.token)).status,200);
 const restored=await api(`/api/v1/client/applications/${app.id}`,'GET',undefined,client.token);assert.deepEqual(restored.data.application.additionalServices,[extra.slug]);assert.equal(restored.data.application.company.state,'Alaska');
 await db.document.create({data:{applicationId:app.id,companyId:company.id,ownerId:company.owners[0].id,uploadedById:client.user.id,documentType:'OWNER_ID',originalFilename:'fictional.pdf',privateStorageKey:randomUUID()+'.pdf',mimeType:'application/pdf',fileSize:40,clientVisible:true}});
 const submitted=await api(`/api/v1/client/applications/${app.id}/submit`,'POST',{confirmed:true},client.token);assert.equal(submitted.status,200,JSON.stringify(submitted.data));
 const order=await db.order.findUniqueOrThrow({where:{applicationId:app.id},include:{items:true}});assert.equal(order.totalCents,quote.data.totalCents);assert.equal(order.items.length,3);assert.equal(order.paymentStatus,'UNPAID');
 assert.equal((await api('/api/v1/pricing/selection','PATCH',{...selection,packageSlug:'premium'},client.token)).status,409);
 await api('/api/v1/admin/pricing','PATCH',{kind:'state',id:'AK',data:{...stateData,filingFeeCents:26000}},owner.token);
 assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).totalCents,order.totalCents);
 const frozenQuote=await api('/api/v1/pricing/quote','POST',{applicationId:app.id,packageSlug:'premium',state:'Florida',services:[]},client.token);
 assert.equal(frozenQuote.data.totalCents,order.totalCents,'finalized quote ignores changed catalog and browser selections');
 assert.equal((await api(`/api/v1/admin/orders/${order.id}`,'PATCH',{governmentFeeCents:1,thirdPartyFeeCents:0,additionalFeeCents:0,discountCents:0},owner.token)).status,409);
 const publicCatalog=await api('/api/v1/pricing'); assert.equal(publicCatalog.data.states.find(s=>s.code==='AK').filingFeeCents,26000);
 const availability={...serviceData,availableStateCodes:['FL'],category:'Formation support',displayOrder:12};
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'service',id:extra.id,data:{...availability,availableStateCodes:['ZZ']}},owner.token)).status,400);
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'service',id:extra.id,data:availability},owner.token)).status,200);
 const restricted=await api('/api/v1/pricing/quote','POST',{packageSlug:'basic',state:'Wyoming',services:[extra.slug]},client.token);
 assert.equal(restricted.data.totalCents,null);assert.match(restricted.data.issues.join(),/not available/);
 const updated=await db.service.findUniqueOrThrow({where:{id:extra.id}});assert.equal(updated.displayOrder,12);assert.equal(updated.category,'Formation support');
 // Test zero, unknown and approved third-party charges and all order pricing surfaces.
 await db.service.update({where:{id:extra.id},data:{availableStateCodes:[]}});
 const chargeData={name:'Fictional third-party fee',description:'Test-only required fee',priceCents:null,currency:'USD',priceApproved:false,available:true,requiredCharge:true,category:'Third-party fees',availableStateCodes:[],displayOrder:0};
 assert.equal((await api('/api/v1/admin/pricing','POST',chargeData,client.token)).status,403);
 const created=await api('/api/v1/admin/pricing','POST',chargeData,owner.token);assert.equal(created.status,201);chargeId=created.data.id;
 const unresolved=await api('/api/v1/pricing/quote','POST',pendingInput,client.token);assert.equal(unresolved.data.totalCents,null);assert.match(unresolved.data.issues.join(),/Fictional third-party fee/);
 assert.equal((await api('/api/v1/admin/pricing','PATCH',{kind:'service',id:chargeId,data:{...chargeData,priceCents:500,priceApproved:true}},owner.token)).status,200);
 const exact=await api('/api/v1/pricing/quote','POST',pendingInput,client.token);assert.equal(exact.data.totalCents,pack.serviceFeeCents+26000+2500+500);assert.equal(exact.data.thirdPartyFeeCents,500);
 const clientOrder=await api(`/api/v1/client/orders/${pendingOrder.id}`,'GET',undefined,client.token);
 const adminOrder=await api(`/api/v1/admin/orders/${pendingOrder.id}`,'GET',undefined,owner.token);
 const adminSnapshot=await api('/api/v1/admin/snapshot','GET',undefined,owner.token);
 const clientDashboard=await api('/api/v1/client/dashboard','GET',undefined,client.token);
 for(const result of [clientOrder.data.orders[0].pricingQuote,adminOrder.data.items[0].pricingQuote,adminSnapshot.data.orders.find(o=>o.id===pendingOrder.id).pricingQuote,clientDashboard.data.applications.find(a=>a.id===pendingApp.id).order.pricingQuote])assert.deepEqual(result,exact.data);
 assert.equal((await api(`/api/v1/admin/orders/${pendingOrder.id}`,'PATCH',{governmentFeeCents:26000,thirdPartyFeeCents:500,additionalFeeCents:2500,discountCents:exact.data.totalCents+1},owner.token)).status,400,'discount cannot exceed confirmed prices');
 const confirm=await api(`/api/v1/admin/orders/${pendingOrder.id}`,'PATCH',{governmentFeeCents:26000,thirdPartyFeeCents:500,additionalFeeCents:2500,discountCents:0},owner.token);assert.equal(confirm.status,200,JSON.stringify(confirm.data));
 const confirmed=await db.order.findUniqueOrThrow({where:{id:pendingOrder.id}});assert.equal(confirmed.totalCents,exact.data.totalCents);assert.equal(confirmed.paymentStatus,'UNPAID');assert.equal(await db.payment.count({where:{orderId:confirmed.id}}),0);
 assert.equal((await api('/api/v1/pricing/quote','POST',{...pendingInput,applicationId:app.id},client.token)).data.totalCents,order.totalCents);
 } finally { if(chargeId)await db.service.update({where:{id:chargeId},data:{available:false}});for(const original of [...stateBackups,...(state?[state]:[])]) { const {code,...data}=original; await db.stateFilingFee.update({where:{code},data}); } await db.$disconnect(); }
});
