/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { createServer } = require('node:http');
const { readdir } = require('node:fs/promises');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient(), root = 'http://localhost:3002';
async function actor(role, verified = true) {
  const email = `documents-${randomUUID()}@example.test`;
  const user = await db.user.create({ data: { role, fullName: 'Fictional Company Document QA', email, emailNormalized: email, emailVerifiedAt: verified ? new Date() : null } });
  const token = randomUUID() + randomUUID();
  await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
}
async function api(path, token, method = 'GET', body) {
  const response = await fetch(root + path, { method, headers: { Origin: root, ...(token ? { Cookie: `__Host-apex_session=${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  return { status: response.status, headers: response.headers, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer()) };
}
function okay(result, status = 200) { assert.equal(result.status, status, JSON.stringify(result.data)); return result.data; }

test('company upload, publication deduplication, private access, notifications and existing email worker', async t => {
  assert.match(process.env.DATABASE_URL, /\/apex_dashboard_test(?:\?|$)/);
  t.after(() => db.$disconnect());
  const owner = await actor('OWNER'), client = await actor('CLIENT'), stranger = await actor('CLIENT'), staff = await actor('STAFF'), unverified = await actor('CLIENT', false);
  const service = await db.service.findUniqueOrThrow({ where: { slug: 'llc' } }), pack = await db.package.findUniqueOrThrow({ where: { slug: 'basic' } });
  async function app(person) {
    const company = await db.company.create({ data: { customerId: person.user.id, preferredName: `Fictional Document ${randomUUID()} LLC`, formationState: 'Florida', businessActivity: 'QA', businessDescription: 'Local document QA only' } });
    const application = await db.application.create({ data: { customerId: person.user.id, companyId: company.id, serviceId: service.id, packageId: pack.id, assignedStaffId: staff.user.id } });
    return { company, application };
  }
  const a = await app(client), b = await app(client), c = await app(unverified);
  function form(target = a, key = randomUUID(), visible = true, changes = {}) {
    const body = new FormData();
    for (const [name,value] of Object.entries({ applicationId: target.application.id, companyId: target.company.id, customerId: target === c ? unverified.user.id : client.user.id, documentType: 'ARTICLES_OF_ORGANIZATION', title: 'Approved Articles of Organization', description: 'Fictional description visible with the document', finalDocument: 'true', shareWithClient: String(visible), idempotencyKey: key, ...changes })) body.set(name,value);
    body.set('file', new Blob(['%PDF-1.4\nFictional document test only\n%%EOF'], { type: 'application/pdf' }), '../../fictional-articles.pdf');
    return body;
  }
  const key = randomUUID();
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => api('/api/v1/documents/upload', owner.token, 'POST', form(a,key))));
  for (const result of concurrent) assert.ok([200,201].includes(result.status), JSON.stringify(result.data));
  const id = concurrent[0].data.document.id;
  assert.equal(new Set(concurrent.map(r => r.data.document.id)).size, 1);
  assert.equal(await db.document.count({ where: { uploadKey: `${owner.user.id}:${key}` } }), 1);
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', form(a,key,true,{ title: 'Different payload' }))).status, 409);
  const document = await db.document.findUniqueOrThrow({ where: { id } });
  assert.equal(document.companyId, a.company.id); assert.equal(document.title, 'Approved Articles of Organization');
  assert.equal(document.originalFilename, 'fictional-articles.pdf');
  assert.match(document.privateStorageKey, /^[0-9a-f-]{36}\.pdf$/);
  assert.equal(concurrent[0].data.document.privateStorageKey, undefined); assert.equal(concurrent[0].data.document.uploadFingerprint, undefined);
  const eventKey = `document-final:${id}`;
  assert.equal(await db.emailOutbox.count({ where: { eventKey } }), 1); assert.equal(await db.notification.count({ where: { eventKey } }), 1);
  const mail = await db.emailOutbox.findUniqueOrThrow({ where: { eventKey } });
  assert.equal(mail.toEmail, client.user.email); assert.equal(mail.subject, 'Your company document is ready — Apex Filings');
  for (const value of [a.company.preferredName, document.title, `/client/documents?document=${id}`]) assert.ok(mail.html.includes(value), value);
  assert.equal(mail.html.includes(document.privateStorageKey), false);
  const viewed = okay(await api(`/api/v1/documents/${id}?view=1`, client.token)); assert.match(viewed.toString(), /^%PDF-/);
  assert.match((await api(`/api/v1/documents/${id}`, client.token)).headers.get('content-disposition'), /^attachment/);
  assert.equal((await api(`/api/v1/documents/${id}`, stranger.token)).status, 403);
  assert.equal((await api(`/api/v1/documents/${id}`)).status, 401);
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', form(a,randomUUID(),true,{ companyId: b.company.id }))).status, 400);
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', form(a,randomUUID(),true,{ customerId: stranger.user.id }))).status, 400);
  assert.equal((await api('/api/v1/documents/upload', client.token, 'POST', form())).status, 403);
  assert.equal((await api('/api/v1/documents/upload', stranger.token, 'POST', form())).status, 403);
  const privateId = okay(await api('/api/v1/documents/upload', owner.token, 'POST', form(b,randomUUID(),false)),201).document.id;
  assert.equal(await db.emailOutbox.count({ where: { eventKey: `document-final:${privateId}` } }), 0);
  assert.equal(await db.notification.count({ where: { eventKey: `document-final:${privateId}` } }), 0);
  assert.equal((await api(`/api/v1/documents/${privateId}`, client.token)).status, 403);
  const dashboard = okay(await api('/api/v1/client/dashboard', client.token));
  assert.ok(dashboard.applications.find(app => app.id === a.application.id).documents.some(d => d.id === id && d.title === document.title));
  assert.equal(dashboard.applications.some(app => app.documents.some(d => d.id === privateId)), false);
  const publications = await Promise.all(Array.from({ length: 4 }, () => api(`/api/v1/admin/documents/${privateId}`, owner.token, 'PATCH', { clientVisible: true })));
  for (const result of publications) okay(result);
  assert.equal(await db.notification.count({ where: { eventKey: `document-final:${privateId}` } }), 1);
  assert.equal(await db.emailOutbox.count({ where: { eventKey: `document-final:${privateId}` } }), 1);
  okay(await api(`/api/v1/admin/documents/${id}`, owner.token, 'PATCH', { title: 'Updated document title', description: 'Metadata edit only' }));
  okay(await api(`/api/v1/admin/documents/${id}`, owner.token, 'PATCH', { clientVisible: false }));
  okay(await api(`/api/v1/admin/documents/${id}`, owner.token, 'PATCH', { clientVisible: true }));
  assert.equal(await db.notification.count({ where: { eventKey } }), 1); assert.equal(await db.emailOutbox.count({ where: { eventKey } }), 1);
  const notice = await db.notification.findUniqueOrThrow({ where: { eventKey } });
  assert.equal(notice.userId, client.user.id); assert.equal(notice.type, 'COMPANY_DOCUMENT_READY'); assert.equal(notice.relatedEntity, id);
  assert.equal((await api(`/api/v1/client/notifications/${notice.id}`, stranger.token, 'PATCH', { read: true })).status, 404);
  okay(await api(`/api/v1/client/notifications/${notice.id}`, client.token, 'PATCH', { read: true }));
  assert.ok((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).readAt);
  // Assigned Staff can manage this application's company documents, but not another assignment.
  const staffDoc = okay(await api('/api/v1/documents/upload', staff.token, 'POST', form(a,randomUUID(),false)),201).document.id;
  okay(await api(`/api/v1/documents/${staffDoc}`, staff.token, 'PATCH', { clientVisible: true }));
  okay(await api(`/api/v1/documents/${staffDoc}`, staff.token));
  await db.application.update({ where: { id: a.application.id }, data: { assignedStaffId: null } });
  assert.equal((await api(`/api/v1/documents/${staffDoc}`, staff.token)).status, 403);
  assert.equal((await api(`/api/v1/documents/${staffDoc}`, staff.token, 'PATCH', { title: 'Not permitted' })).status, 403);
  assert.equal((await api('/api/v1/documents/upload', staff.token, 'POST', form())).status, 403);
  const filesBefore = (await readdir(process.env.PRIVATE_DOCUMENT_DIR)).sort();
  const countBefore = await db.document.count({ where: { applicationId: c.application.id } });
  const rejected = await api('/api/v1/documents/upload', owner.token, 'POST', form(c));
  assert.equal(rejected.status, 409); assert.match(rejected.data.error, /verified email/);
  assert.equal(await db.document.count({ where: { applicationId: c.application.id } }), countBefore);
  assert.deepEqual((await readdir(process.env.PRIVATE_DOCUMENT_DIR)).sort(), filesBefore, 'failed publication rolls back metadata and removes only its own file');
  okay(await api('/api/v1/documents/upload', owner.token, 'POST', form(c,randomUUID(),false)),201);
  const invalid = form(); invalid.set('file', new Blob(['not a PDF'], { type: 'application/pdf' }), 'invalid.pdf');
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', invalid)).status, 400);
  const oversized = form(); oversized.set('file', new Blob([Buffer.alloc(8*1024*1024+1)], { type: 'application/pdf' }), 'large.pdf');
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', oversized)).status, 400);
  const defaultPrivate = form(); defaultPrivate.delete('shareWithClient');
  assert.equal(okay(await api('/api/v1/documents/upload', owner.token, 'POST', defaultPrivate),201).document.clientVisible,false,'missing visibility is private by default');
  assert.equal((await api('/api/v1/documents/upload', owner.token, 'POST', form(a,randomUUID(),false,{title:''}))).status,400);
  await db.notificationPreference.upsert({ where:{userId:client.user.id}, create:{userId:client.user.id,documentEmail:false}, update:{documentEmail:false} });
  const optedOut = okay(await api('/api/v1/documents/upload', owner.token, 'POST', form()),201).document.id;
  assert.equal(await db.notification.count({where:{eventKey:`document-final:${optedOut}`}}),1);
  assert.equal(await db.emailOutbox.count({where:{eventKey:`document-final:${optedOut}`}}),0,'existing document email preference is respected');
  await db.notificationPreference.update({where:{userId:client.user.id},data:{documentEmail:true}});
  const legacy = okay(await api('/api/v1/documents/upload', owner.token, 'POST', form(a,randomUUID(),false)),201).document.id;
  await db.notification.create({data:{userId:client.user.id,eventKey:`document-share:${legacy}:legacy-qa`,type:'FINAL_DOCUMENT',title:'Fictional legacy publication',message:'Legacy fixture only',relatedEntity:a.application.id}});
  okay(await api(`/api/v1/admin/documents/${legacy}`,owner.token,'PATCH',{clientVisible:true}));
  assert.equal(await db.notification.count({where:{eventKey:`document-final:${legacy}`}}),0,'legacy publication marker is retained without a second notification');
  assert.equal(await db.emailOutbox.count({where:{eventKey:`document-final:${legacy}`}}),0);
  // Exercise the existing worker against the local Resend transport, never a real recipient.
  const sent = [];
  const mock = createServer(async (request,response) => { const chunks=[]; for await(const chunk of request) chunks.push(chunk); sent.push({ key: request.headers['idempotency-key'], body: JSON.parse(Buffer.concat(chunks).toString()) }); response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ id: randomUUID() })); });
  await new Promise(resolve => mock.listen(3033,'127.0.0.1',resolve));
  try {
    // Put these fictional outbox fixtures first without changing other queued messages.
    await db.emailOutbox.updateMany({ where: { eventKey: { in: [eventKey,`document-final:${privateId}`] } }, data: { createdAt: new Date('2000-01-01T00:00:00Z') } });
    const job = await fetch(root+'/api/v1/jobs/email', { method: 'POST', headers: { Authorization: `Bearer ${process.env.EMAIL_JOB_SECRET}` } }); assert.equal(job.status,200);
    assert.equal((await db.emailOutbox.findUniqueOrThrow({ where: { eventKey } })).status,'SENT');
    assert.equal((await db.emailOutbox.findUniqueOrThrow({ where: { eventKey: `document-final:${privateId}` } })).status,'SENT');
    await fetch(root+'/api/v1/jobs/email', { method: 'POST', headers: { Authorization: `Bearer ${process.env.EMAIL_JOB_SECRET}` } });
    assert.equal(sent.filter(request => request.key === eventKey).length,1);
    const delivered = sent.find(request => request.key === eventKey).body;
    assert.equal(delivered.to[0],client.user.email); assert.equal(delivered.subject,mail.subject); assert.equal('attachments' in delivered,false);
  } finally { await new Promise(resolve => mock.close(resolve)); }

  if (process.env.APEX_PLAYWRIGHT_MODULE) {
    const { chromium } = require(process.env.APEX_PLAYWRIGHT_MODULE); const browser = await chromium.launch({ channel:'msedge',headless:true });
    try {
      const admin = await browser.newContext({ viewport:{width:1440,height:1000} }); await admin.addCookies([{ name:'__Host-apex_session',value:owner.token,url:'https://localhost:3002',secure:true,httpOnly:true,sameSite:'Lax' }]);
      const page = await admin.newPage(); await page.goto(`${root}/admin/clients/${client.user.id}`);
      await page.getByRole('button',{name:'Upload Company Document',exact:true}).click();
      await page.getByLabel('Document company',{exact:true}).selectOption(b.company.id);
      await page.getByLabel('Document title',{exact:true}).fill('Browser upload certificate');
      await page.getByLabel('Description (optional)',{exact:true}).fill('Uploaded from the actual Admin form');
      await page.getByLabel('PDF, JPEG or PNG',{exact:true}).setInputFiles({ name:'browser.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nFictional browser QA\n%%EOF') });
      await page.getByRole('button',{name:'Upload document',exact:true}).click();
      await page.getByText('Document shared and customer notification queued.',{exact:true}).waitFor();
      await page.getByText('Browser upload certificate',{exact:true}).waitFor();
      const uploaded = await db.document.findFirstOrThrow({ where:{companyId:b.company.id,title:'Browser upload certificate'} });
      const context = await browser.newContext({ viewport:{width:1440,height:1000} }); await context.addCookies([{ name:'__Host-apex_session',value:client.token,url:'https://localhost:3002',secure:true,httpOnly:true,sameSite:'Lax' }]);
      const clientPage = await context.newPage();
      await clientPage.goto(`${root}/client/documents?document=${uploaded.id}`);
      await clientPage.locator(`#document-${uploaded.id}`).waitFor();
      assert.equal(await clientPage.getByLabel('Select company',{exact:true}).inputValue(),b.company.id);
      await clientPage.getByLabel('Select company',{exact:true}).selectOption(a.company.id);
      assert.equal(await clientPage.locator(`#document-${uploaded.id}`).count(),0);
      const readyNotice = await db.notification.findUniqueOrThrow({where:{eventKey:`document-final:${uploaded.id}`}});
      await clientPage.getByRole('button',{name:/^Notifications,/}).click();
      const notificationItem = clientPage.locator('.dashboard-notice-menu-item').filter({hasText:'Browser upload certificate'});
      await notificationItem.waitFor();
      const markRead = clientPage.waitForResponse(response => response.url().endsWith(`/notifications/${readyNotice.id}`) && response.request().method()==='PATCH');
      await notificationItem.getByRole('button',{name:'Mark Company document ready read',exact:true}).click();
      assert.equal((await markRead).status(),200);
      assert.ok((await db.notification.findUniqueOrThrow({where:{id:readyNotice.id}})).readAt);
      await notificationItem.getByRole('link',{name:'View details',exact:true}).click();
      await clientPage.locator(`#document-${uploaded.id}`).waitFor();
      assert.equal(await clientPage.getByLabel('Select company',{exact:true}).inputValue(),b.company.id);
      await clientPage.screenshot({ path:'.local/company-documents-client.png',fullPage:true });
      await clientPage.setViewportSize({width:390,height:844});
      await clientPage.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right<=0);
      assert.equal(await clientPage.evaluate(() => document.documentElement.scrollWidth>innerWidth),false);
      await clientPage.screenshot({path:'.local/company-documents-client-mobile.png',fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.getByRole('button',{name:'Upload Company Document',exact:true}).click();
      await page.getByRole('dialog').waitFor();
      await page.screenshot({path:'.local/company-documents-upload-mobile.png',fullPage:true});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:'.local/company-documents-upload-mobile.png',fullPage:true});
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
      await page.goto(`${root}/admin/documents`);
      await page.locator('.panel').filter({hasText:'Upload document'}).locator('select').first().selectOption(a.application.id);
      await page.getByRole('button',{name:'Upload document',exact:true}).click();
      await page.getByLabel('Document title',{exact:true}).fill('Global document queue upload');
      await page.getByLabel('PDF, JPEG or PNG',{exact:true}).setInputFiles({name:'global.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nGlobal browser QA\n%%EOF')});
      await page.getByRole('button',{name:'Upload document',exact:true}).last().click();
      await page.getByText('Document shared with the client.',{exact:true}).waitFor();
      const globalDoc=await db.document.findFirstOrThrow({where:{applicationId:a.application.id,title:'Global document queue upload'}});
      assert.equal(globalDoc.clientVisible,true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth),false);
      console.log('Admin form, title/description, client document deep link and company switching verified in Edge');
    } finally { await browser.close(); }
  } else console.log('Browser checks NOT RUN: set APEX_PLAYWRIGHT_MODULE');
});
