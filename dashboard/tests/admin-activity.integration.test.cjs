/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient(), root = 'http://localhost:3002';
async function actor(role, fullName) {
  const email = `admin-ui-${randomUUID()}@example.test`;
  const user = await db.user.create({ data: { role, fullName, email, emailNormalized: email, emailVerifiedAt: new Date() } });
  const token = randomUUID() + randomUUID();
  await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
}
async function api(path, token, method = 'GET', value) {
  const response = await fetch(root + path, { method, headers: { Origin: root, ...(value instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Cookie: `__Host-apex_session=${token}` } : {}) }, body: value === undefined ? undefined : value instanceof FormData ? value : JSON.stringify(value) });
  return { status: response.status, data: await response.json() };
}
function okay(result, status = 200) { assert.equal(result.status, status, JSON.stringify(result.data)); return result.data; }

test('Owner activity pagination/filtering and client identities use actual related records', async t => {
  t.after(() => db.$disconnect());
  assert.match(process.env.DATABASE_URL, /\/apex_dashboard_test(?:\?|$)/);
  const suffix = randomUUID().slice(0, 8);
  const owner = await actor('OWNER', `Activity Admin ${suffix}`), client = await actor('CLIENT', `Muhammad Ahmed Khan ${suffix}`), other = await actor('CLIENT', `Zara Client ${suffix}`), staff = await actor('STAFF', `Activity Staff ${suffix}`);
  const service = await db.service.findUniqueOrThrow({ where: { slug: 'llc' } }), pack = await db.package.findUniqueOrThrow({ where: { slug: 'basic' } });
  async function fixture(customer, name) {
    const company = await db.company.create({ data: { customerId: customer.user.id, preferredName: `${name} ${suffix} LLC`, formationState: 'Florida', businessActivity: 'QA', businessDescription: 'Fictional isolated Admin activity test' } });
    const app = await db.application.create({ data: { customerId: customer.user.id, companyId: company.id, serviceId: service.id, packageId: pack.id } });
    const order = await db.order.create({ data: { applicationId: app.id, serviceFeeCents: 19900, governmentFeeCents: 12500, thirdPartyFeeCents: 0, additionalFeeCents: 0, discountCents: 0, totalCents: 32400 } });
    const payment = await db.payment.create({ data: { orderId: order.id, amountCents: 32400, reference: 'FICTIONAL QA - awaiting verification' } });
    const invoice = await db.invoice.create({ data: { orderId: order.id, number: `QA-ACTIVITY-${randomUUID()}`, snapshot: { customer: { id: customer.user.id, name: 'Historical fictional name', email: customer.user.email, clientReference: customer.user.clientReference } } } });
    return { company, app, order, payment, invoice };
  }
  const a = await fixture(client, 'Activity Alpha'), b = await fixture(other, 'Activity Beta');
  const candidatePath = `/api/v1/admin/broadcast-preview?search=${client.user.clientReference}&applications=true`;
  const candidates = okay(await api(candidatePath, owner.token));
  assert.equal(candidates.total, 1); assert.equal(candidates.candidates[0].id, client.user.id); assert.equal(candidates.candidates[0].validEmail, true);
  assert.equal((await api(candidatePath, client.token)).status, 403);
  assert.equal((await api(candidatePath, staff.token)).status, 403);
  assert.equal((await api(candidatePath)).status, 401);
  const missingName = await actor('CLIENT', '');
  const baseTime = new Date(Date.now() - 3600000);
  const events = await Promise.all(Array.from({ length: 25 }, (_, i) => db.auditLog.create({ data: { actorUserId: i % 2 ? owner.user.id : client.user.id, action: 'APPLICATION_DRAFT_UPDATED', resourceType: 'Application', resourceId: a.app.id, createdAt: new Date(baseTime.getTime() + i * 1000), safeMetadata: { password: 'DO-NOT-EXPOSE-TEST', token: 'DO-NOT-EXPOSE-TEST', privateNote: 'DO-NOT-EXPOSE-TEST' } } })));
  const url = `/api/v1/admin/activity?search=${encodeURIComponent(a.company.preferredName)}&pageSize=10`;
  for (const person of [client, other, staff]) assert.equal((await api(url, person.token)).status, 403);
  assert.equal((await api(url)).status, 401);
  const first = okay(await api(url, owner.token));
  assert.equal(first.total, 25); assert.equal(first.pageCount, 3); assert.equal(first.items.length, 10);
  assert.equal(first.items[0].id, events[24].id);
  assert.equal(first.items[0].customer.fullName, client.user.fullName);
  assert.equal(first.items[0].customer.clientReference, client.user.clientReference);
  assert.equal(first.items[0].href, `/admin/applications/${a.app.id}`);
  assert.equal(JSON.stringify(first).includes('DO-NOT-EXPOSE-TEST'), false);
  const old = okay(await api(url + '&sort=oldest', owner.token)); assert.equal(old.items[0].id, events[0].id);
  assert.equal(okay(await api(url + '&actor=OWNER', owner.token)).total, 12);
  assert.equal(okay(await api(url + '&actor=CLIENT', owner.token)).total, 13);
  assert.equal(okay(await api(url + '&category=DOCUMENT', owner.token)).total, 0);
  assert.equal(okay(await api(`/api/v1/admin/activity?search=${client.user.clientReference}`, owner.token)).total, 25);
  assert.equal(okay(await api(`/api/v1/admin/activity?search=${encodeURIComponent(client.user.fullName)}`, owner.token)).total, 25);
  assert.equal(okay(await api(`/api/v1/admin/activity?search=${a.app.id}`, owner.token)).total, 25);
  assert.equal(okay(await api('/api/v1/admin/activity?search=%25', owner.token)).total, 0, 'literal percent is not a wildcard');
  assert.equal((await api(url + '&from=2026-02-30', owner.token)).status, 400);
  assert.equal((await api(url + '&from=2026-11-02&to=2026-11-01', owner.token)).status, 400);
  assert.equal((await api(url + '&sort=DROP_TABLE', owner.token)).status, 400);
  const date = baseTime.toISOString().slice(0, 10);
  assert.equal(okay(await api(url + `&from=${date}&to=${date}`, owner.token)).total, 25);
  // A real supported action appends one audit row; a fixed result snapshot avoids page overlap.
  okay(await api(`/api/v1/admin/applications/${a.app.id}/checks`, owner.token, 'POST', { check: 'COMPANY_DETAILS', checked: true }));
  const refreshed = okay(await api(url, owner.token)); assert.equal(refreshed.total, 26); assert.match(refreshed.items[0].description, /completed a review check/);
  const pages = [first.items];
  for (const page of [2, 3]) pages.push(okay(await api(url + `&page=${page}&asOf=${encodeURIComponent(first.asOf)}`, owner.token)).items);
  const ids = pages.flat().map(item => item.id); assert.equal(ids.length, 25); assert.equal(new Set(ids).size, 25);
  const snapshot = okay(await api('/api/v1/admin/snapshot', owner.token));
  for (const [collection, id] of [['applications', a.app.id], ['orders', a.order.id], ['payments', a.payment.id]]) {
    const row = snapshot[collection].find(item => item.id === id);
    assert.equal(row.customer.id, client.user.id); assert.equal(row.customer.fullName, client.user.fullName); assert.equal(row.customer.clientReference, client.user.clientReference);
  }
  assert.equal(snapshot.orders.find(item => item.id === b.order.id).customer.id, other.user.id);
  for (const scope of [`applicationId=${a.app.id}`, `orderId=${a.order.id}`]) {
    const exact = okay(await api(`/api/v1/admin/snapshot?${scope}`, owner.token));
    assert.deepEqual(exact.applications.map(item => item.id), [a.app.id]);
    assert.equal(exact.clients[0].clientReference, client.user.clientReference);
    assert.equal(exact.orders[0].customer.fullName, client.user.fullName);
  }
  const invoice = okay(await api(`/api/v1/invoices/${a.invoice.id}`, owner.token)).invoice;
  assert.equal(invoice.clientIdentity.fullName, client.user.fullName);
  assert.equal(invoice.customer.name, 'Historical fictional name', 'frozen invoice identity is not rewritten');
  const ticket = okay(await api('/api/v1/client/support', client.token, 'POST', { category: 'ACCOUNT', companyId: a.company.id, subject: `Activity support ${suffix}`, message: 'Fictional support test request only', idempotencyKey: randomUUID() }), 201).ticket;
  assert.ok(okay(await api(`/api/v1/admin/support?search=${client.user.clientReference}`, owner.token)).tickets.some(item => item.id === ticket.id));
  await db.supportTicket.createMany({ data: Array.from({length: 105}, (_, i) => ({ customerId: client.user.id, companyId: a.company.id, subject: `Pagination ${suffix} ${i}`, body: 'Fictional pagination fixture', status: i % 2 ? 'OPEN' : 'RESOLVED', createdAt: new Date('2024-01-15T12:00:00Z') })) });
  const search = `/api/v1/admin/support?search=${encodeURIComponent(`Pagination ${suffix}`)}&pageSize=20`;
  const ticketPages = [];
  for (let page = 1; page <= 6; page++) { const result = okay(await api(`${search}&page=${page}`, owner.token)); assert.equal(result.total, 105); ticketPages.push(...result.tickets); }
  assert.equal(new Set(ticketPages.map(item => item.id)).size, 105);
  assert.equal(okay(await api(`${search}&status=RESOLVED&from=2024-01-15&to=2024-01-15`, owner.token)).total, 53);
  assert.equal(okay(await api(`${search}&from=2024-01-16`, owner.token)).total, 0);
  assert.equal((await api(`${search}&from=2024-02-30`, owner.token)).status, 400);
  assert.equal((await api(`/api/v1/client/support/${ticket.id}`, other.token)).status, 404);
  const replyKey = randomUUID();
  okay(await api(`/api/v1/admin/support/${ticket.id}/reply`, owner.token, 'POST', {message:'Fictional admin reply',idempotencyKey:replyKey}), 201);
  okay(await api(`/api/v1/admin/support/${ticket.id}/reply`, owner.token, 'POST', {message:'Fictional admin reply',idempotencyKey:replyKey}));
  const reply = await db.supportReply.findUniqueOrThrow({where:{idempotencyKey:replyKey}});
  assert.equal(await db.emailOutbox.count({where:{eventKey:`support-answer:${reply.id}`}}),1);
  assert.equal(await db.notification.count({where:{eventKey:`support-answer:${reply.id}`,userId:client.user.id}}),1);
  okay(await api(`/api/v1/admin/support/${ticket.id}/note`, owner.token, 'POST', {body:'Private fictional note'}), 201);
  okay(await api(`/api/v1/admin/support/${ticket.id}`, owner.token, 'PATCH', {status:'IN_PROGRESS',assignedToId:staff.user.id}));
  const adminTicket = okay(await api(`/api/v1/admin/support/${ticket.id}`, owner.token)).tickets[0];
  assert.equal(adminTicket.assignedTo.id, staff.user.id); assert.equal(adminTicket.status,'IN_PROGRESS'); assert.equal(adminTicket.internalNotes.length,1);
  const clientTicket = okay(await api(`/api/v1/client/support/${ticket.id}`,client.token)).tickets[0];
  assert.equal(clientTicket.replies[0].body,'Fictional admin reply'); assert.equal(clientTicket.status,'IN_PROGRESS'); assert.equal('internalNotes' in clientTicket,false);
  const clientReplyKey=randomUUID(); okay(await api(`/api/v1/client/support/${ticket.id}/reply`,client.token,'POST',{message:'Fictional client reply',idempotencyKey:clientReplyKey}),201);
  const clientReply=await db.supportReply.findUniqueOrThrow({where:{idempotencyKey:clientReplyKey}});
  assert.equal(await db.emailOutbox.count({where:{eventKey:`support-reply:${clientReply.id}:admin`}}),1);
  assert.equal(await db.notification.count({where:{eventKey:`support-reply:${clientReply.id}:${owner.user.id}`}}),1);
  const ownInvoices=okay(await api(`/api/v1/invoices?customerId=${client.user.id}`,owner.token));
  assert.ok(ownInvoices.items.some(item=>item.id===a.invoice.id)); assert.ok(!ownInvoices.items.some(item=>item.id===b.invoice.id));
  assert.equal(ownInvoices.items.find(item=>item.id===a.invoice.id).paidCents,0);
  assert.equal((await api(`/api/v1/invoices/${a.invoice.id}`,other.token)).status,404);
  const extra = await db.service.create({ data: { slug: `identity-${suffix}`, name: 'Fictional QA service', description: 'QA only', category: 'Additional', available: true } });
  const request = okay(await api('/api/v1/client/service-requests', client.token, 'POST', { companyId: a.company.id, serviceId: extra.id, details: 'Fictional request to verify identity rendering', idempotencyKey: randomUUID() }), 201).request;
  assert.ok(okay(await api(`/api/v1/admin/service-requests?search=${encodeURIComponent(client.user.fullName)}`, owner.token)).requests.some(item => item.id === request.id));
  assert.equal(okay(await api(`/api/v1/admin/service-requests?search=${other.user.clientReference}`, owner.token)).requests.length, 0);
  const upload = new FormData(); upload.set('applicationId', a.app.id); upload.set('documentType', 'COMPANY_DOCUMENT'); upload.set('finalDocument', 'true'); upload.set('shareWithClient', 'false'); upload.set('file', new Blob(['%PDF-1.4\nFictional identity QA\n%%EOF'], { type: 'application/pdf' }), 'fictional-identity.pdf');
  const document = okay(await api('/api/v1/documents/upload', owner.token, 'POST', upload), 201).document;
  const documents = okay(await api('/api/v1/admin/snapshot', owner.token)).documents;
  assert.equal(documents.find(row => row.id === document.id).customer.clientReference, client.user.clientReference);
  for (const path of ['/api/v1/admin/clients','/api/v1/admin/snapshot','/api/v1/admin/support','/api/v1/admin/service-requests','/api/v1/invoices']) assert.equal((await api(path, staff.token)).status, 403);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: client.user.id } })).clientReference, client.user.clientReference);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: a.payment.id } })).status, 'AWAITING_VERIFICATION');

  if (process.env.APEX_PLAYWRIGHT_MODULE) {
    const { chromium } = require(process.env.APEX_PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([{ name: '__Host-apex_session', value: owner.token, url: 'https://localhost:3002', secure: true, httpOnly: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      await page.goto(`${root}/admin/activity`);
      await page.getByLabel('Search activities').fill(a.company.preferredName);
      await page.waitForFunction(() => document.querySelectorAll('.activity-event').length === 20);
      const correctIdentity = page.locator(`.activity-event .admin-client-identity[href="/admin/clients/${client.user.id}"]`).first();
      await correctIdentity.waitFor(); assert.ok((await correctIdentity.innerText()).includes(client.user.clientReference));
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Page 2 of 2', { exact: true }).waitFor();
      await page.screenshot({ path: '.local/admin-activity-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: '.local/admin-activity-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('.activity-description[href="/admin/applications/' + a.app.id + '"]').first().click();
      await page.getByRole('heading', { name: a.company.preferredName, exact: true }).waitFor();
      // The same linked identity must be searchable across application, order and payment tables.
      for (const section of ['applications','orders','payments','clients','documents']) {
        await page.goto(`${root}/admin/${section}`);
        await page.locator('.table-search input').fill(client.user.clientReference);
        const identity = page.locator(`.data-table .admin-client-identity[href="/admin/clients/${client.user.id}"]`).first();
        await identity.waitFor(); assert.match(await identity.innerText(), /Muhammad Ahmed Khan/);
        await page.locator('.table-search input').fill(client.user.fullName);
        await identity.waitFor(); assert.ok((await identity.innerText()).includes(`#${client.user.clientReference}`));
      }
      await page.goto(`${root}/admin/clients`);
      await page.locator('.table-search input').fill(missingName.user.clientReference);
      const unnamed = page.locator(`.admin-client-identity[href="/admin/clients/${missingName.user.id}"]`).first();
      await unnamed.waitFor(); assert.match(await unnamed.innerText(), /Name not provided/);
      assert.ok((await unnamed.innerText()).includes(missingName.user.clientReference));
      await page.goto(`${root}/admin/invoices`); await page.getByLabel('Search invoices').fill(client.user.clientReference);
      const invoiceClient = page.locator(`.invoice-directory-table .admin-client-identity[href="/admin/clients/${client.user.id}"]`).first();
      await invoiceClient.waitFor(); assert.ok((await invoiceClient.innerText()).includes(client.user.fullName));
      await invoiceClient.click(); await page.getByRole('heading', { name: client.user.fullName, exact: true }).waitFor();
      await page.goto(`${root}/admin/support`); await page.locator('.admin-list-search input').fill(client.user.clientReference);
      await page.locator(`.admin-client-identity[href="/admin/clients/${client.user.id}"]`).first().waitFor();
      await page.goto(`${root}/admin/services#request-${request.id}`);
      await page.locator('.admin-list-search input').fill(client.user.clientReference);
      await page.locator(`.admin-client-identity[href="/admin/clients/${client.user.id}"]`).first().waitFor();
      await page.goto(`${root}/admin/dashboard`); await page.getByRole('link', { name: 'View All Activity' }).waitFor();
      await page.waitForFunction(() => document.querySelectorAll('.activity-event').length === 10);
      assert.equal(await page.locator('.activity-event').count(), 10);
      await page.getByRole('link', { name: 'View All Activity' }).click(); await page.getByRole('heading', { name: 'Activity Log', exact: true }).waitFor();
      await page.getByLabel('Search activities').fill(`no-matching-activity-${suffix}`);
      await page.getByText('No activities found', { exact: true }).waitFor();
      await page.route('**/api/v1/admin/activity*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fictional activity test outage' }) }));
      await page.getByRole('button', { name: 'Refresh activity' }).click();
      await page.getByText('Fictional activity test outage', { exact: true }).waitFor();
      await page.unroute('**/api/v1/admin/activity*');
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await page.getByText('No activities found', { exact: true }).waitFor();
      console.log('Admin activity and client identity browser checks passed at desktop/mobile sizes');
    } finally { await browser.close(); }
  } else console.log('Browser checks NOT RUN: set APEX_PLAYWRIGHT_MODULE');
});
