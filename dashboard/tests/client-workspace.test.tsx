import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { dashboardPayment, formationMilestones } from '../src/lib/client-workspace';
import { CompanyWorkspace } from '../src/components/dashboard/CompanyDashboard';
import type { ClientRecord } from '../src/components/dashboard/ClientDemoContext';
import { quotePricing, type PricingCatalog } from '../src/lib/pricing';

const order = { status: 'OPEN', paymentStatus: 'UNPAID', totalCents: 32400, payments: [], refunds: [], stripeCheckout: null, paymentAttempts: [] } satisfies Parameters<typeof dashboardPayment>[0];
const receipt = { id: 'receipt', status: 'VERIFIED', amountCents: 32400, verifiedAt: '2026-10-01T00:00:00Z' };
test('only matching, full verified receipts unlock the company experience', () => {
  assert.equal(dashboardPayment(null).status, 'NO_ORDER');
  assert.equal(dashboardPayment(order).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED' }).status, 'REVIEW_REQUIRED');
  for (const status of ['UNPAID', 'AWAITING_VERIFICATION', 'REJECTED']) assert.equal(dashboardPayment({ ...order, paymentStatus: status, payments: [receipt] }).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [{ ...receipt, verifiedAt: null }] }).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [{ ...receipt, amountCents: 100 }] }).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [receipt] }).unlocked, true);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [{ ...receipt, amountCents: 40000 }] }).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [{ ...receipt, status: 'DISPUTED' }] }).unlocked, false);
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'VERIFIED', totalCents: null, payments: [receipt] }).unlocked, false);
});
test('pending, failed, expired, partial and refunded records retain distinct states', () => {
  assert.equal(dashboardPayment({ ...order, paymentStatus: 'AWAITING_VERIFICATION' }).status, 'PENDING');
  assert.equal(dashboardPayment({ ...order, stripeCheckout: { status: 'PROCESSING' } }).status, 'PENDING');
  assert.equal(dashboardPayment({ ...order, paymentAttempts: [{ status: 'FAILED' }] }).status, 'FAILED');
  assert.equal(dashboardPayment({ ...order, stripeCheckout: { status: 'EXPIRED' } }).status, 'EXPIRED');
  assert.equal(dashboardPayment({ ...order, status: 'CANCELLED' }).status, 'CANCELLED');
  assert.equal(dashboardPayment({ ...order, payments: [{ ...receipt, amountCents: 10000 }] }).status, 'PARTIALLY_PAID');
  const refunded = { ...order, paymentStatus: 'VERIFIED', payments: [receipt], refunds: [{ id: 'r', status: 'COMPLETED', amountCents: 32400, stripeRefundId: 're_test', stripeStatus: 'succeeded' }] };
  assert.equal(dashboardPayment(refunded).unlocked, false);
  assert.equal(dashboardPayment(refunded).status, 'REFUNDED');
  assert.equal(dashboardPayment({ ...refunded, refunds: [{ ...refunded.refunds[0], amountCents: 1000 }] }).status, 'PARTIALLY_REFUNDED');
});
test('formation stages require their own recorded evidence', () => {
  const milestones = formationMilestones({ submittedAt: receipt.verifiedAt, approvedForFilingAt: null, completedAt: null, history: [{ newStatus: 'UNDER_REVIEW', createdAt: receipt.verifiedAt }], reviews: [], payment: dashboardPayment(order) });
  assert.deepEqual(milestones.map(m => m.complete), [true, false, false, false, false, false]);
  const paid = formationMilestones({ submittedAt: null, approvedForFilingAt: null, completedAt: null, history: [], reviews: [], payment: dashboardPayment({ ...order, paymentStatus: 'VERIFIED', payments: [receipt] }) });
  assert.equal(paid[2].complete, true);
  assert.equal(paid[4].complete, false);
});

const catalog: PricingCatalog = { packages: ['basic', 'premium'].map(slug => ({ id: slug, slug, name: slug === 'basic' ? 'Basic LLC Formation' : 'Advanced LLC Formation', serviceFeeCents: slug === 'basic' ? 19900 : 29900, currency: 'USD', available: true, includedServices: ['EIN'], includedServiceSlugs: ['ein'] })), services: [], states: [{ code: 'FL', state: 'Florida', filingFeeCents: 12500, active: true, verifiedAt: receipt.verifiedAt, sourceReference: 'https://official.example.gov/fictional-test', recurringFeeDescription: null, recurringFeePeriod: null, processingTime: null }] };
function application(slug = 'basic', paid = false): ClientRecord {
  const quote = quotePricing(catalog, slug, 'Florida', ['ein']);
  const payment = dashboardPayment({ ...order, totalCents: quote.totalCents, paymentStatus: paid ? 'VERIFIED' : 'UNPAID', payments: paid ? [{ ...receipt, amountCents: quote.totalCents! }] : [] });
  return { id: slug, companyId: `company-${slug}`, company: { id: `company-${slug}`, name: `Fictional ${slug} LLC`, state: 'Florida', owners: [] }, packageName: quote.packageName, packageSlug: slug, status: 'Awaiting Payment', statusCode: 'AWAITING_PAYMENT', updatedAt: receipt.verifiedAt, submittedAt: receipt.verifiedAt, history: [], responses: [], requiredDocuments: [], documents: [], documentRequests: [], nextAction: { kind: 'waiting', title: 'Review pending', description: 'Team review pending', ctaLabel: 'View application', href: '/client/applications/basic', documentRequests: [] }, order: { id: 'order', paymentStatus: paid ? 'VERIFIED' : 'UNPAID', pricingQuote: quote, pricingSnapshot: null, serviceFeeCents: quote.serviceFeeCents!, governmentFeeCents: 12500, additionalFeeCents: 0, thirdPartyFeeCents: 0, discountCents: 0, totalCents: quote.totalCents, stripeCheckoutStatus: null, invoice: null }, payment, milestones: formationMilestones({ submittedAt: receipt.verifiedAt, approvedForFilingAt: null, completedAt: null, reviews: [], history: [], payment }), accountManager: null, paymentEvents: [], draftQuote: null };
}
function render(app?: ClientRecord, apps = app ? [app] : []) {
  return renderToStaticMarkup(<CompanyWorkspace application={app} applications={apps} onSelect={() => {}} data={{ user: { id: 'client', fullName: 'Fictional Client', clientReference: '123456789', email: 'test@example.test', phone: null, country: null }, companyId: app?.companyId ?? '', setCompanyId: () => {}, applications: apps, supportUpdates: [], revision: 1, services: [], packages: [], notifications: [], paymentInstructions: '', loading: false, error: null, refresh: async () => {} }} />);
}
test('no-order and unpaid Basic/Advanced dashboards use quotes, not fabricated invoices', () => {
  assert.match(render(), /Ready to start your business/);
  for (const slug of ['basic', 'premium']) {
    const html = render(application(slug));
    assert.match(html, /data-payment-experience="prepayment"/);
    assert.match(html, slug === 'basic' ? /\$324\.00/ : /\$424\.00/);
    assert.match(html, /Payment setup pending/);
    assert.doesNotMatch(html, /company-summary-grid/);
  }
  const draft = application(); draft.order = null;
  assert.match(render(draft), /Continue application/);
});
test('pending approvals identify the fee and do not invent a total', () => {
  const app = application();
  app.order!.pricingQuote = quotePricing({ ...catalog, states: [{ ...catalog.states[0], active: false }] }, 'basic', 'Florida', []);
  const html = render(app);
  assert.match(html, /Government filing fee — Florida/);
  assert.match(html, /Final pricing is being confirmed/);
  assert.doesNotMatch(html, /\$324\.00/);
});
test('paid company has five cards, real milestones, document actions and company support context', () => {
  const app = application('basic', true);
  app.documents.push({ id: 'doc', documentType: 'EIN_CONFIRMATION', reviewStatus: 'COMPLETED_COMPANY_DOCUMENT', reviewReason: null, replacesDocumentId: null, requestId: null, originalFilename: 'approved-ein.pdf', createdAt: receipt.verifiedAt, ownerId: null });
  const html = render(app);
  assert.match(html, /data-payment-experience="verified"/);
  assert.equal((html.match(/class="stat-card"/g) ?? []).length, 5);
  for (const text of ['123456789', 'Formation progress', 'Recent activity', '/api/v1/documents/doc?view=1', '/api/v1/documents/doc', 'company=company-basic']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Next payment date/);
  const other = application('premium');
  const switched = render(other);
  assert.doesNotMatch(switched, /approved-ein.pdf|company-summary-grid|company-basic/);
});
