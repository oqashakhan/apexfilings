/* eslint-disable @typescript-eslint/no-require-imports */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomInt, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const root = 'http://localhost:3002';
after(() => db.$disconnect());

function userData(role='CLIENT') { const id=randomUUID();return {id,fullName:'Fictional reference test',email:`reference-${id}@example.test`,emailNormalized:`reference-${id}@example.test`,role,emailVerifiedAt:new Date()}; }
async function actor(role) { const user=await db.user.create({data:userData(role)});const token=randomUUID()+randomUUID();await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return {user,token}; }
async function api(path,token,method='GET',value) { const response=await fetch(root+path,{method,headers:{Origin:root,'Content-Type':'application/json',...(token?{Cookie:`__Host-apex_session=${token}`}:{})},body:value===undefined?undefined:JSON.stringify(value)});return {status:response.status,data:await response.json()}; }

test('new clients, including the Google creation path, receive distinct permanent references concurrently',async()=>{
 const {createGoogleClient}=await import('../src/server/google-client.ts');
 const users=await Promise.all(Array.from({length:32},(_,i)=>{
  const data=userData();
  return i%2 ? db.$transaction(tx=>createGoogleClient(tx,{fullName:data.fullName,normalizedEmail:data.email,subject:`fictional-google-${data.id}`})) : db.user.create({data});
 }));
 for(const user of users)assert.match(user.clientReference,/^[1-9][0-9]{8}$/);
 assert.equal(new Set(users.map(u=>u.clientReference)).size,users.length);
 const user=users[0];
 const reservations=await db.clientReferenceHistory.count();
 await assert.rejects(db.user.create({data:{...userData(),email:user.email,emailNormalized:user.emailNormalized}}),error=>error.code==='P2002');
 assert.equal(await db.clientReferenceHistory.count(),reservations,'failed registration rolls back its reference reservation');
 await db.user.update({where:{id:user.id},data:{fullName:'Fictional profile edited',phone:'+15555550101'}});
 assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).clientReference,user.clientReference);
 await assert.rejects(db.user.update({where:{id:user.id},data:{clientReference:'100000000'}}),/permanent|constraint/i);
 await assert.rejects(db.user.create({data:{...userData(),clientReference:'123456789'}}),/automatically|constraint/i);
 await assert.rejects(db.clientReferenceHistory.create({data:{userId:randomUUID(),previousReference:'test-only',clientReference:user.clientReference}}),error=>error.code==='P2002'&&String(error.meta?.target).includes('clientReference'));
});

test('a forced random collision retries the unique reservation safely',async()=>{
 const occupied=await db.user.create({data:userData()});
 let fresh;
 do {fresh=String(randomInt(100000000,1000000000));} while(await db.clientReferenceHistory.findUnique({where:{clientReference:fresh}}));
 // Test-env.cjs only permits the isolated local test database. This temporary
 // function replacement and all its effects are rolled back in this transaction.
 await assert.rejects(db.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION apex_client_reference_candidate() RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path=public AS $$ BEGIN IF current_setting('apex.reference_collision_seen',true) IS DISTINCT FROM 'yes' THEN PERFORM set_config('apex.reference_collision_seen','yes',true); RETURN '${occupied.clientReference}'; END IF; RETURN '${fresh}'; END; $$`);
  const created=await tx.user.create({data:userData()});assert.equal(created.clientReference,fresh);
  assert.equal((await tx.clientReferenceHistory.findUniqueOrThrow({where:{userId:occupied.id}})).clientReference,occupied.clientReference);
  throw new Error('ROLLBACK_REFERENCE_TEST');
 }),/ROLLBACK_REFERENCE_TEST/);
});

test('backfill preserves valid values, records legacy mappings and is safe to rerun',async()=>{
 const existing=await db.user.findMany({where:{role:'CLIENT'},select:{id:true,clientReference:true}});
 assert.ok(existing.length);for(const user of existing)assert.match(user.clientReference,/^[1-9][0-9]{8}$/);
 const legacyNumeric=await db.user.findUnique({where:{id:'482916735'}});
 if(legacyNumeric)assert.equal(legacyNumeric.clientReference,'482916735');
 const [first]=await db.$queryRaw`SELECT apex_backfill_client_references() AS changed`;
 const [second]=await db.$queryRaw`SELECT apex_backfill_client_references() AS changed`;
 assert.equal(first.changed,0);assert.equal(second.changed,0);
 for(const user of existing.slice(0,10))assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).clientReference,user.clientReference);
 await assert.rejects(db.$transaction(async tx=>{
  // Reproduce nullable/invalid staging without weakening the deployed schema.
  await tx.$executeRawUnsafe('ALTER TABLE "User" DROP CONSTRAINT "User_clientReference_format"');
  await tx.$executeRawUnsafe('ALTER TABLE "User" DISABLE TRIGGER "User_assign_client_reference"');
  const invalid=await tx.user.create({data:{...userData(),clientReference:'OLD-TEST-REFERENCE'}});
  const missing=await tx.user.create({data:userData()});
  let validReference;do {validReference=String(randomInt(100000000,1000000000));}while(await tx.clientReferenceHistory.findUnique({where:{clientReference:validReference}}));
  const valid=await tx.user.create({data:{...userData(),clientReference:validReference}});
  await tx.$executeRawUnsafe('ALTER TABLE "User" ENABLE TRIGGER "User_assign_client_reference"');
  const [result]=await tx.$queryRaw`SELECT apex_backfill_client_references() AS changed`;assert.equal(result.changed,2);
  for(const original of [invalid,missing,valid]){
   const current=await tx.user.findUniqueOrThrow({where:{id:original.id}});assert.match(current.clientReference,/^[1-9][0-9]{8}$/);assert.equal(current.email,original.email);
   const history=await tx.clientReferenceHistory.findUniqueOrThrow({where:{userId:original.id}});assert.equal(history.previousReference,original.clientReference??original.id);assert.equal(history.clientReference,current.clientReference);
  }
  assert.equal((await tx.user.findUniqueOrThrow({where:{id:valid.id}})).clientReference,validReference);
  assert.equal((await tx.$queryRaw`SELECT apex_backfill_client_references() AS changed`)[0].changed,0);
  throw new Error('ROLLBACK_REFERENCE_TEST');
 }),/ROLLBACK_REFERENCE_TEST/);
});

test('Client/Admin APIs agree, Owner exact search works and references grant no access',async()=>{
 const client=await actor('CLIENT'),owner=await actor('OWNER'),stranger=await actor('CLIENT');
 const reference=client.user.clientReference;
 const dashboard=await api('/api/v1/client/dashboard',client.token);assert.equal(dashboard.status,200);assert.equal(dashboard.data.user.clientReference,reference);
 const snapshot=await api('/api/v1/admin/snapshot',owner.token);assert.equal(snapshot.data.clients.find(c=>c.id===client.user.id).clientReference,reference);
 const lookup=await api(`/api/v1/admin/clients?search=${reference}`,owner.token);assert.equal(lookup.status,200);assert.equal(lookup.data.total,1);assert.equal(lookup.data.items[0].id,client.user.id);assert.equal(lookup.data.items[0].clientReference,reference);
 const detail=await api(`/api/v1/admin/clients/${client.user.id}`,owner.token);assert.equal(detail.data.client.clientReference,reference);
 assert.equal((await api(`/api/v1/admin/clients?search=${reference}`,client.token)).status,403);
 assert.equal((await api(`/api/v1/admin/clients?search=${reference}`,null)).status,401);
 assert.equal((await api(`/api/v1/client/applications/${reference}`,stranger.token)).status,404);
 const badEdit=await api('/api/v1/client/notification-preferences',client.token,'PATCH',{everyLoginEmail:false,applicationEmail:true,paymentEmail:true,documentEmail:true,supportEmail:true,clientReference:'123456789'});assert.equal(badEdit.status,400);
 const ticket=await api('/api/v1/client/support',client.token,'POST',{subject:'Fictional reference test',message:'Test-only support request for permanent client references.'});assert.equal(ticket.status,201);
 const support=await api('/api/v1/admin/support',owner.token);assert.equal(support.data.tickets.find(t=>t.customer.id===client.user.id).customer.clientReference,reference);
 const service=await db.service.findUniqueOrThrow({where:{slug:'llc'}}),pack=await db.package.findUniqueOrThrow({where:{slug:'basic'}});
 for(let i=0;i<2;i++){
  const company=await db.company.create({data:{customerId:client.user.id,preferredName:`Fictional reference LLC ${randomUUID()}`,formationState:'Louisiana',businessActivity:'Software',businessDescription:'Test only'}});
  const application=await db.application.create({data:{customerId:client.user.id,companyId:company.id,serviceId:service.id,packageId:pack.id}});
  const document=await db.document.create({data:{applicationId:application.id,companyId:company.id,uploadedById:client.user.id,documentType:'TEST_ONLY',originalFilename:'fictional.pdf',privateStorageKey:randomUUID()+'.pdf',mimeType:'application/pdf',fileSize:40}});
  assert.equal((await api(`/api/v1/client/applications/${application.id}`,client.token)).data.application.company.id,company.id);
  assert.equal((await db.document.findUniqueOrThrow({where:{id:document.id}})).applicationId,application.id);
 }
 assert.equal((await db.user.findUniqueOrThrow({where:{id:client.user.id}})).clientReference,reference);
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {ClientReference}=await import('../src/components/dashboard/ClientReference.tsx');
 const html=renderToStaticMarkup(React.createElement(ClientReference,{value:reference}));assert.ok(html.includes(reference));assert.ok(html.includes('Client Reference Number'));assert.ok(html.includes('Copy Reference'));
});
