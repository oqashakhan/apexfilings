/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test'); const assert=require('node:assert/strict'); const {randomUUID,createHash}=require('node:crypto'); const {PrismaClient}=require('@prisma/client'); const db=new PrismaClient(); const root='http://localhost:3002';
test('private CNIC or Passport uploads satisfy submission; neither and invalid uploads fail',async()=>{
 const unique=randomUUID();
 async function user(role){const email=`identity-${role}-${unique}@example.test`;const u=await db.user.create({data:{fullName:'Fictional Identity Test',email,emailNormalized:email,role,emailVerifiedAt:new Date()}});const token=randomUUID()+randomUUID();await db.session.create({data:{userId:u.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return {id:u.id,cookie:`__Host-apex_session=${token}`};}
 async function api(path,method,payload,actor){const r=await fetch(root+path,{method,headers:{Origin:root,Cookie:actor.cookie,...(payload instanceof FormData?{}:{'Content-Type':'application/json'})},body:payload instanceof FormData?payload:JSON.stringify(payload)});return {status:r.status,data:await r.json()};}
 try{const client=await user('CLIENT'),owner=await user('OWNER');const service=await db.service.findUniqueOrThrow({where:{slug:'llc'}}),pack=await db.package.findUniqueOrThrow({where:{slug:'basic'}});
 for(const types of [['CNIC'],['PASSPORT'],['CNIC','PASSPORT'],[]]){
 const company=await db.company.create({data:{customerId:client.id,preferredName:`Identity ${randomUUID()} LLC`,alternativeName1:'Backup LLC',formationState:'Florida',businessActivity:'Software',businessDescription:'Fictional software services',addressRequirements:'I need guidance',ownershipType:'single',managementStructure:'member-managed',owners:{create:{fullLegalName:'Test Owner',email:`owner-${unique}@example.test`,phone:'+15555550100',nationality:'PK',countryOfResidence:'PK',residentialAddress:'123 Fictional Street',ownershipBasisPoints:10000}}},include:{owners:true}});
 const app=await db.application.create({data:{customerId:client.id,companyId:company.id,serviceId:service.id,packageId:pack.id}});
 async function upload(type,valid=true,ownerId=company.owners[0].id){const body=new FormData();body.set('applicationId',app.id);body.set('ownerId',ownerId);body.set('documentType',type);body.set('file',new Blob([valid?'%PDF-1.4\nfictional test identity\n%%EOF':'invalid'],{type:'application/pdf'}),'fictional.pdf');return api('/api/v1/documents/upload','POST',body,client);}
 assert.equal((await upload('CNIC',false)).status,400);assert.equal((await upload('PASSPORT',true,'')).status,400);
 const uploaded=[];for(const type of types){const result=await upload(type);assert.equal(result.status,201,JSON.stringify(result.data));uploaded.push(result.data.document.id);assert.equal(result.data.document.reviewStatus,'UNDER_REVIEW');}
 const submitted=await api(`/api/v1/client/applications/${app.id}/submit`,'POST',{confirmed:true},client);assert.equal(submitted.status,types.length?200:409,JSON.stringify(submitted.data));
 if(!types.length){assert.match(submitted.data.error,/CNIC or Passport/);continue;}
 const order=await db.order.findUniqueOrThrow({where:{applicationId:app.id}});assert.equal(order.paymentStatus,'UNPAID');
 // Fictional database fixtures exercise the approval gate without any provider payment.
 await db.order.update({where:{id:order.id},data:{paymentStatus:'VERIFIED'}});await db.application.update({where:{id:app.id},data:{status:'UNDER_REVIEW'}});
 await db.applicationReview.createMany({data:['CUSTOMER_INFORMATION','COMPANY_DETAILS','OWNER_INFORMATION','REQUIRED_DOCUMENTS','CUSTOMER_CONFIRMATION','PAYMENT_VERIFIED'].map(checkKey=>({applicationId:app.id,reviewerId:owner.id,checkKey}))});
 const before=await api(`/api/v1/admin/applications/${app.id}/status`,'POST',{status:'APPROVED_FOR_FILING',reason:'Fictional identity test'},owner);assert.equal(before.status,409,'uploaded is not accepted');
 await db.document.update({where:{id:uploaded[0]},data:{reviewStatus:'ACCEPTED',reviewedById:owner.id,reviewedAt:new Date()}});
 const approved=await api(`/api/v1/admin/applications/${app.id}/status`,'POST',{status:'APPROVED_FOR_FILING',reason:'Fictional identity test'},owner);assert.equal(approved.status,200,JSON.stringify(approved.data));
 }
 }finally{await db.$disconnect();}
});
