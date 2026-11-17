/* eslint-disable @typescript-eslint/no-require-imports */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient(), root = 'http://localhost:3002';
after(() => db.$disconnect());
async function actor(role) {
  const email = `support-qa-${randomUUID()}@example.test`;
  const user = await db.user.create({ data: { role, fullName: 'Support QA ' + role, email, emailNormalized: email, emailVerifiedAt: new Date() } });
  const token = randomUUID() + randomUUID();
  await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
}
async function api(path, person, method = 'GET', body) {
  const response = await fetch(root + '/api/v1/' + path, { method, headers: { Origin: root, 'Content-Type': 'application/json', ...(person ? { Cookie: `__Host-apex_session=${person.token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
function expect(result, status=200) { assert.equal(result.status,status,JSON.stringify(result.data)); return result.data; }
test('support pagination, conversations, private notes, notifications and customer isolation without payment fixtures', async () => {
  const owner=await actor('OWNER'), client=await actor('CLIENT'), other=await actor('CLIENT'), staff=await actor('STAFF');
  const suffix=randomUUID(), company=await db.company.create({data:{customerId:client.user.id,preferredName:'Support '+suffix,formationState:'Florida',businessActivity:'QA',businessDescription:'Isolated support test'}});
  const ticket=expect(await api('client/support',client,'POST',{category:'ACCOUNT',companyId:company.id,subject:'Support '+suffix,message:'Please help with this isolated test.',idempotencyKey:randomUUID()}),201).ticket;
  assert.ok(expect(await api('admin/support?search='+client.user.clientReference,owner)).tickets.some(x=>x.id===ticket.id));
  await db.supportTicket.createMany({data:Array.from({length:105},(_,i)=>({customerId:client.user.id,companyId:company.id,subject:`Pagination ${suffix} ${i}`,body:'Isolated test',status:i%2?'OPEN':'RESOLVED',createdAt:new Date('2024-01-15T12:00:00Z')}))});
  const search='admin/support?search='+encodeURIComponent('Pagination '+suffix)+'&pageSize=20',ids=[];
  for(let page=1;page<=6;page++){const result=expect(await api(`${search}&page=${page}`,owner));assert.equal(result.total,105);ids.push(...result.tickets.map(x=>x.id));}
  assert.equal(new Set(ids).size,105);assert.equal(expect(await api(search+'&status=RESOLVED&from=2024-01-15&to=2024-01-15',owner)).total,53);
  expect(await api(`client/support/${ticket.id}`,other),404);
  const key=randomUUID();expect(await api(`admin/support/${ticket.id}/reply`,owner,'POST',{message:'Staff response',idempotencyKey:key}),201);expect(await api(`admin/support/${ticket.id}/reply`,owner,'POST',{message:'Staff response',idempotencyKey:key}));
  const reply=await db.supportReply.findUniqueOrThrow({where:{idempotencyKey:key}});
  assert.equal(await db.emailOutbox.count({where:{eventKey:`support-answer:${reply.id}`}}),1);assert.equal(await db.notification.count({where:{eventKey:`support-answer:${reply.id}`,userId:client.user.id}}),1);
  expect(await api(`admin/support/${ticket.id}/note`,owner,'POST',{body:'Private note'}),201);
  expect(await api(`admin/support/${ticket.id}`,owner,'PATCH',{status:'IN_PROGRESS',assignedToId:staff.user.id}));
  const customer=expect(await api(`client/support/${ticket.id}`,client)).tickets[0];assert.equal(customer.status,'IN_PROGRESS');assert.equal(customer.replies[0].body,'Staff response');assert.equal('internalNotes' in customer,false);
  const responseKey=randomUUID();expect(await api(`client/support/${ticket.id}/reply`,client,'POST',{message:'Client response',idempotencyKey:responseKey}),201);
  const response=await db.supportReply.findUniqueOrThrow({where:{idempotencyKey:responseKey}});
  assert.equal(await db.emailOutbox.count({where:{eventKey:`support-reply:${response.id}:admin`}}),1);assert.equal(await db.notification.count({where:{eventKey:`support-reply:${response.id}:${owner.user.id}`}}),1);
});
test('suspension revokes client sessions and blocks password login without deleting financial history', async () => {
  const owner=await actor('OWNER'), client=await actor('CLIENT'), other=await actor('CLIENT');
  const password='QA-only-'+randomUUID()+'aA1!';
  await db.user.update({where:{id:client.user.id},data:{passwordHash:await require('argon2').hash(password)}});
  expect(await api(`admin/clients/${client.user.id}`,other,'PATCH',{status:'SUSPENDED'}),403);
  expect(await api(`admin/clients/${owner.user.id}`,owner,'PATCH',{status:'SUSPENDED'}),404);
  expect(await api(`admin/clients/${client.user.id}`,owner,'PATCH',{status:'SUSPENDED'}));
  assert.ok((await db.session.findFirstOrThrow({where:{userId:client.user.id}})).revokedAt);
  expect(await api('client/dashboard',client),401);
  const login=await api('auth/login',null,'POST',{email:client.user.email,password});
  assert.notEqual(login.status,200);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:client.user.id}})).status,'SUSPENDED');
});
