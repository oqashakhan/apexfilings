/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const root = 'http://localhost:3002';
async function actor(role) {
  const email = `dashboard-${randomUUID()}@example.test`;
  const user = await db.user.create({ data: { fullName: 'Fictional Dashboard Client', email, emailNormalized: email, role, emailVerifiedAt: new Date() } });
  const token = randomUUID() + randomUUID();
  await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
}
async function api(path, token, method = 'GET', value) {
  const response = await fetch(root + path, { method, headers: { Origin: root, Cookie: `__Host-apex_session=${token}`, ...(value instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: value === undefined ? undefined : value instanceof FormData ? value : JSON.stringify(value) });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, headers: response.headers };
}
function okay(result, status = 200) { assert.equal(result.status, status, JSON.stringify(result.data)); return result.data; }

test('payment-aware dashboard, private Admin files, visibility, support and ownership work together', async t => {
  t.after(() => db.$disconnect());
  assert.match(process.env.DATABASE_URL, /\/apex_dashboard_test(?:\?|$)/);
  const client = await actor('CLIENT'), owner = await actor('OWNER'), stranger = await actor('CLIENT');
  assert.equal(okay(await api('/api/v1/client/dashboard', client.token)).applications.length, 0);
  const service = await db.service.findUniqueOrThrow({ where: { slug: 'llc' } });
  async function application(slug, state, paid) {
    const pack = await db.package.findUniqueOrThrow({ where: { slug } });
    const company = await db.company.create({ data: { customerId: client.user.id, preferredName: `Fictional ${slug} ${randomUUID()} LLC`, formationState: state, businessActivity: 'Software', businessDescription: 'Isolated dashboard QA only' } });
    const app = await db.application.create({ data: { customerId: client.user.id, companyId: company.id, serviceId: service.id, packageId: pack.id, status: 'AWAITING_PAYMENT', submittedAt: new Date() } });
    const amount = pack.serviceFeeCents + 12500;
    const order = await db.order.create({ data: { applicationId: app.id, serviceFeeCents: pack.serviceFeeCents, governmentFeeCents: 12500, additionalFeeCents: 0, thirdPartyFeeCents: 0, discountCents: 0, totalCents: amount, paymentStatus: paid ? 'VERIFIED' : 'UNPAID' } });
    if (paid) await db.payment.create({ data: { orderId: order.id, amountCents: amount, status: 'VERIFIED', verifiedAt: new Date(), verifiedById: owner.user.id, reference: 'FICTIONAL DASHBOARD QA ONLY' } });
    return { company, app, order };
  }
  const unpaid = await application('basic', 'Florida', false), paid = await application('premium', 'Florida', true);
  async function dashboard() { return okay(await api('/api/v1/client/dashboard', client.token)); }
  let data = await dashboard();
  assert.equal(data.user.clientReference, client.user.clientReference);
  assert.match(data.user.clientReference, /^\d{9}$/);
  assert.equal(data.applications.find(a => a.id === unpaid.app.id).payment.unlocked, false);
  assert.equal(data.applications.find(a => a.id === paid.app.id).payment.unlocked, true);
  assert.equal(data.applications.find(a => a.id === paid.app.id).payment.paidCents, 42400);
  assert.equal(data.applications.find(a => a.id === paid.app.id).milestones.filter(m => m.complete).length, 2, 'submission and verified payment only');
  assert.equal(okay(await api('/api/v1/client/dashboard', stranger.token)).applications.length, 0);
  assert.equal((await api(`/api/v1/client/applications/${paid.app.id}`, stranger.token)).status, 404);
  // A success redirect, an order flag and pending/failed attempts cannot unlock the workspace.
  await db.order.update({ where: { id: unpaid.order.id }, data: { paymentStatus: 'VERIFIED' } });
  assert.equal((await dashboard()).applications.find(a => a.id === unpaid.app.id).payment.status, 'REVIEW_REQUIRED');
  await db.order.update({ where: { id: unpaid.order.id }, data: { paymentStatus: 'AWAITING_VERIFICATION' } });
  assert.equal((await dashboard()).applications.find(a => a.id === unpaid.app.id).payment.status, 'PENDING');
  await db.order.update({ where: { id: unpaid.order.id }, data: { paymentStatus: 'UNPAID' } });
  await db.paymentAttempt.create({ data: { orderId: unpaid.order.id, key: randomUUID(), amountCents: 32400, status: 'FAILED' } });
  assert.equal((await dashboard()).applications.find(a => a.id === unpaid.app.id).payment.status, 'FAILED');
  assert.equal((await api(`/client?checkout=success`, client.token)).status, 200);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: unpaid.order.id } })).paymentStatus, 'UNPAID');

  async function upload(share, token = owner.token, filename = 'fictional-formation.pdf', mime = 'application/pdf') {
    const form = new FormData();
    form.set('applicationId', paid.app.id); form.set('companyId', paid.company.id);
    form.set('documentType', 'CERTIFICATE_OF_FORMATION'); form.set('finalDocument', 'true'); form.set('shareWithClient', String(share));
    form.set('file', new Blob(['%PDF-1.4\nFictional dashboard test file only\n%%EOF'], { type: mime }), filename);
    return api('/api/v1/documents/upload', token, 'POST', form);
  }
  const shared = okay(await upload(true), 201).document;
  const internal = okay(await upload(false), 201).document;
  assert.equal((await upload(true, client.token)).status, 403);
  assert.equal((await upload(true, stranger.token)).status, 403);
  assert.equal((await upload(true, owner.token, 'invalid.png', 'image/png')).status, 400);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: shared.id } })).companyId, paid.company.id, 'association matches the authorized application');
  data = await dashboard();
  assert.ok(data.applications.find(a => a.id === paid.app.id).documents.some(d => d.id === shared.id));
  assert.equal(data.applications.some(a => a.documents.some(d => d.id === internal.id)), false);
  assert.equal(data.applications.find(a => a.id === unpaid.app.id).documents.length, 0);
  const downloaded = await api(`/api/v1/documents/${shared.id}`, client.token);
  assert.match(okay(downloaded).toString(), /^%PDF-/);
  assert.match(downloaded.headers.get('content-disposition'), /^attachment/);
  const viewed = await api(`/api/v1/documents/${shared.id}?view=1`, client.token);
  okay(viewed); assert.equal(viewed.headers.get('content-type'), 'application/pdf'); assert.match(viewed.headers.get('content-disposition'), /^inline/);
  assert.equal(viewed.headers.get('cache-control'), 'no-store');
  assert.equal((await api(`/api/v1/documents/${internal.id}?view=1`, client.token)).status, 403);
  assert.equal((await api(`/api/v1/documents/${shared.id}`, stranger.token)).status, 403);
  assert.equal((await api(`/api/v1/documents/${internal.id}`, owner.token)).status, 200);
  assert.equal(await db.notification.count({ where: { userId: client.user.id, eventKey: `document-final:${shared.id}` } }), 1);
  assert.equal(await db.emailOutbox.count({ where: { eventKey: `document-final:${shared.id}` } }), 1);
  assert.equal(await db.notification.count({ where: { userId: client.user.id, eventKey: `document-final:${internal.id}` } }), 0);
  okay(await api(`/api/v1/admin/documents/${shared.id}`, owner.token, 'PATCH', { clientVisible: false }));
  assert.equal((await api(`/api/v1/documents/${shared.id}`, client.token)).status, 403);
  assert.equal((await dashboard()).applications.some(a => a.documents.some(d => d.id === shared.id)), false);
  okay(await api(`/api/v1/admin/documents/${shared.id}`, owner.token, 'PATCH', { clientVisible: true }));
  const published = okay(await api(`/api/v1/admin/documents/${internal.id}`, owner.token, 'PATCH', { clientVisible: true }));
  assert.equal(published.document.clientVisible, true);
  assert.ok((await dashboard()).applications.find(a => a.id === paid.app.id).documents.some(d => d.id === internal.id));
  assert.equal((await api(`/api/v1/admin/documents/${shared.id}`, client.token, 'PATCH', { clientVisible: false })).status, 403);
  const ticket = okay(await api('/api/v1/client/support', client.token, 'POST', { companyId: paid.company.id, category: 'DOCUMENTS', subject: 'Fictional document question', message: 'Isolated dashboard support test only', idempotencyKey: randomUUID() }), 201).ticket;
  assert.ok((await dashboard()).supportUpdates.some(s => s.id === ticket.id && s.companyId === paid.company.id));
  assert.equal((await api(`/api/v1/client/support/${ticket.id}`, stranger.token)).status, 404);
  await db.application.update({ where: { id: paid.app.id }, data: { status: 'UNDER_REVIEW' } });
  assert.equal((await dashboard()).applications.find(a => a.id === paid.app.id).status, 'Under Review');

  await db.invoice.create({ data: { orderId: unpaid.order.id, number: `QA-DASHBOARD-${randomUUID()}`, lifecycle: 'ISSUED', issuedAt: new Date(), totalCents: 32400, subtotalCents: 32400, taxCents: 0, discountCents: 0 } });

  if (process.env.APEX_PLAYWRIGHT_MODULE) {
    const { chromium } = require(process.env.APEX_PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([{ name: '__Host-apex_session', value: client.token, url: 'https://localhost:3002', secure: true, httpOnly: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      await page.goto(`${root}/client`);
      await page.locator('.company-workspace').waitFor();
      // Select each company's real ID, then test refresh persistence and company-specific documents.
      await page.getByLabel('Select company', { exact: true }).selectOption(paid.company.id);
      await page.reload(); await page.locator('[data-payment-experience="verified"]').waitFor();
      assert.equal(await page.locator('.company-summary-grid .stat-card').count(), 5);
      await page.getByRole('link', { name: 'View existing tickets (1)' }).click();
      await page.getByText('Fictional document question', { exact: true }).waitFor();
      await page.goto(`${root}/client`); await page.locator('[data-payment-experience="verified"]').waitFor();
      const adminContext = await browser.newContext();
      await adminContext.addCookies([{ name: '__Host-apex_session', value: owner.token, url: 'https://localhost:3002', secure: true, httpOnly: true, sameSite: 'Lax' }]);
      const adminPage = await adminContext.newPage();
      await adminPage.goto(`${root}/admin/clients/${client.user.id}`);
      await adminPage.getByRole('tab', { name: 'Documents', exact: true }).click();
      await adminPage.locator('section').filter({ has: adminPage.getByRole('heading', { name: 'Selected company', exact: true }) }).getByRole('combobox').selectOption(paid.company.id);
      await adminPage.getByRole('button', { name: 'Upload Company Document', exact: true }).click();
      await adminPage.getByLabel('Document application', { exact: true }).selectOption(paid.app.id);
      await adminPage.getByLabel('PDF, JPEG or PNG', { exact: true }).setInputFiles({ name: 'fictional-admin-ui.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nFictional Admin UI upload only\n%%EOF') });
      await adminPage.getByRole('button', { name: 'Upload document', exact: true }).click();
      await adminPage.getByText('Document shared and customer notification queued.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Refresh updates' }).click();
      await page.getByRole('cell', { name: 'fictional-admin-ui.pdf', exact: true }).waitFor();
      await adminContext.close();
      await page.screenshot({ path: '.local/client-dashboard-desktop.png', fullPage: true });
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `no page overflow at ${width}px`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
      await page.screenshot({ path: '.local/client-dashboard-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByLabel('Select company', { exact: true }).selectOption(unpaid.company.id);
      await page.reload(); await page.locator('[data-payment-experience="prepayment"]').waitFor();
      assert.equal(await page.locator('.company-summary-grid').count(), 0);
      await page.getByRole('button', { name: 'Complete Payment', exact: true }).waitFor();
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Complete Payment' && !button.disabled));
      assert.equal(await page.getByText('fictional-formation.pdf', { exact: true }).count(), 0);
      await page.reload(); await page.locator('[data-payment-experience="prepayment"]').waitFor();
      console.log('Desktop/mobile/tablet, support navigation, company switching and reload persistence passed');
    } finally { await browser.close(); }
  } else console.log('Browser checks NOT RUN: set APEX_PLAYWRIGHT_MODULE to an installed Playwright module');
});
