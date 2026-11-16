/* eslint-disable @typescript-eslint/no-require-imports */
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient(),root='http://localhost:3002';
after(()=>db.$disconnect());
async function person(role){
 const email=randomUUID()+'@example.test';
 const user=await db.user.create({data:{role,fullName:'Chat test',email,emailNormalized:email,emailVerifiedAt:new Date()}});
 const token=randomUUID()+randomUUID();
 await db.session.create({data:{userId:user.id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
 return {id:user.id,token};
}
async function call(user,method='GET',value,query=''){
 const r=await fetch(root+'/api/v1/chat'+query,{method,headers:{Origin:root,Cookie:'__Host-apex_session='+user.token,'Content-Type':'application/json'},body:value?JSON.stringify(value):undefined});
 return {status:r.status,data:await r.json()};
}
test('chat ownership, assignment, retries, incremental delivery and read counts',async()=>{
 const client=await person('CLIENT'),other=await person('CLIENT'),owner=await person('OWNER'),staff=await person('STAFF');
 const company=await db.company.create({data:{customerId:client.id,preferredName:'Chat fixture LLC',formationState:'Florida',businessActivity:'Test',businessDescription:'Isolated chat fixture'}});
 assert.equal((await call(other,'POST',{action:'start',companyId:company.id})).status,404);
 const companyStarts=await Promise.all([call(client,'POST',{action:'start',companyId:company.id}),call(client,'POST',{action:'start',companyId:company.id})]);
 assert.equal(companyStarts[0].status,200);assert.equal(companyStarts[0].data.id,companyStarts[1].data.id);
 const companyView=await call(client,'GET',null,'?id='+companyStarts[0].data.id);assert.equal(companyView.data.chat.company.preferredName,'Chat fixture LLC');
 const started=await call(client,'POST',{action:'start',companyId:null});assert.equal(started.status,200);
 const retryStart=await call(client,'POST',{action:'start',companyId:null});assert.equal(retryStart.data.id,started.data.id);
 const id=started.data.id,key=randomUUID(),message={action:'send',id,key,message:'Hello support'};
 const sent=await call(client,'POST',message);assert.equal(sent.status,200);
 assert.equal(sent.data.message.body,'Hello support');
 const retry=await call(client,'POST',message);assert.equal(retry.status,200);assert.equal(retry.data.message.seq,sent.data.message.seq);
 assert.equal(await db.chatMessage.count({where:{conversationId:id}}),1);
 assert.equal((await call(other,'GET',null,'?id='+id)).status,404);
 assert.equal((await call(staff,'GET',null,'?id='+id)).status,404);
 assert.equal((await call(owner)).data.chats.find(c=>c.id===id).unread,1);
 assert.equal((await call(owner,'POST',{action:'assign',id,staffId:staff.id})).status,200);
 const first=await call(staff,'GET',null,'?id='+id);assert.equal(first.data.messages.length,1);
 assert.equal(first.data.chat.assignedToId,staff.id);
 const seq=first.data.messages[0].seq;
 assert.equal((await call(staff,'POST',{action:'read',id,through:seq})).status,200);
 assert.equal((await call(staff)).data.chats.find(c=>c.id===id).unread,0);
 assert.equal((await call(staff,'POST',{action:'send',id,key:randomUUID(),message:'Hello client'})).status,200);
 const next=await call(client,'GET',null,'?id='+id+'&after='+seq);
 assert.equal(next.data.messages.length,1);assert.equal(next.data.messages[0].body,'Hello client');
 assert.equal((await call(client)).data.chats.find(c=>c.id===id).unread,1);
 assert.equal((await call(client,'POST',{action:'read',id,through:next.data.messages[0].seq})).status,200);
 assert.equal((await call(client)).data.chats.find(c=>c.id===id).unread,0);
 assert.equal((await call(owner,'POST',{action:'assign',id,staffId:null})).status,200);
 assert.equal((await call(staff,'GET',null,'?id='+id)).status,404);
 assert.equal((await call(client,'GET',null,'?id='+id)).data.messages.length,2);
 await db.chatMessage.createMany({data:Array.from({length:55},(_,i)=>({conversationId:id,authorId:client.id,clientKey:randomUUID(),body:'Page '+i}))});
 const latest=await call(client,'GET',null,'?id='+id);
 assert.equal(latest.data.messages.length,50);assert.equal(latest.data.hasMore,true);
 const older=await call(client,'GET',null,'?id='+id+'&before='+latest.data.messages[0].seq);
 assert.equal(older.data.messages.length,7);
 assert.ok(BigInt(older.data.messages.at(-1).seq)<BigInt(latest.data.messages[0].seq));
 const label='Paging '+randomUUID();
 await db.user.update({where:{id:client.id},data:{fullName:label}});
 await db.chatConversation.createMany({data:Array.from({length:31},()=>({customerId:client.id}))});
 const page1=await call(owner,'GET',null,'?search='+encodeURIComponent(label)+'&page=1');
 const page2=await call(owner,'GET',null,'?search='+encodeURIComponent(label)+'&page=2');
 assert.equal(page1.data.chats.length,25);assert.equal(page1.data.hasMore,true);
 assert.equal(page2.data.chats.length,8);assert.equal(page2.data.hasMore,false);
 assert.equal(page1.data.chats.some(c=>page2.data.chats.some(d=>d.id===c.id)),false);
 const unreadOnly=await call(owner,'GET',null,'?search='+encodeURIComponent(label)+'&unread=true');
 assert.equal(unreadOnly.data.chats.length,1);

});

test('mobile client and desktop admin exchange messages through the UI',{skip:!process.env.APEX_PLAYWRIGHT_MODULE},async t=>{
 const client=await person('CLIENT'),owner=await person('OWNER');
 const {chromium}=require(process.env.APEX_PLAYWRIGHT_MODULE);
 const browser=await chromium.launch({channel:'msedge',headless:true});t.after(()=>browser.close());
 async function pageFor(user,viewport){
  const context=await browser.newContext({viewport});
  await context.addCookies([{name:'__Host_apex_session',value:user.token,url:'https://localhost:3002',secure:true}].map(c=>({...c,name:'__Host-apex_session'})));
  const page=await context.newPage();page.setDefaultTimeout(15000);return page;
 }
 const c=await pageFor(client,{width:390,height:844}),a=await pageFor(owner,{width:1440,height:900});
 await c.goto(root+'/client/messages');await c.getByRole('button',{name:'Start conversation'}).click();
 await c.locator('.topbar-crumb').getByText('Messages',{exact:true}).waitFor();
 await c.getByLabel('Message',{exact:true}).fill('Browser message');
 await c.getByRole('button',{name:'Send',exact:true}).click();
 await c.getByText('Browser message',{exact:true}).waitFor();
 await a.goto(root+'/admin/messages');
 await a.locator('.topbar-crumb').getByText('Messages',{exact:true}).waitFor();
 await a.getByText('Browser message',{exact:true}).first().click();
 await a.getByLabel('Message',{exact:true}).fill('Browser reply');
 await a.getByRole('button',{name:'Send',exact:true}).click();
 await c.getByRole('paragraph').filter({hasText:'Browser reply'}).waitFor({timeout:20000});
 await c.reload();await c.getByRole('button',{name:/Apex Filings Support/}).first().click();
 await c.getByRole('paragraph').filter({hasText:'Browser reply'}).waitFor();
 const password='ChatTestPassword123!';
 const user=await db.user.update({where:{id:client.id},data:{passwordHash:await require('argon2').hash(password)},select:{email:true}});
 const login=await c.evaluate(async ({email,password})=>{
   await fetch('/api/v1/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const response=await fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   return response.status;
 },{email:user.email,password});
 assert.equal(login,200);
 await c.goto(root+'/client/messages');
 await c.getByRole('button',{name:/Apex Filings Support/}).first().click();
 await c.getByRole('paragraph').filter({hasText:'Browser reply'}).waitFor();
});
