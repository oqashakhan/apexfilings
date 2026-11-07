import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePricing, type PricingCatalog } from '../src/lib/pricing';
import { adminPackages } from '../prisma/catalog';
const catalog = (): PricingCatalog => ({ packages: adminPackages.map(p => ({ ...p, id: p.id, slug: p.id, serviceFeeCents: p.serviceFee * 100, currency: 'USD' })), services: [
  { id: 'bank', slug: 'banking', name: 'Bank guidance', description: 'Guidance', available: true, priceApproved: true, priceCents: 5000, currency: 'USD' },
  { id: 'mail', slug: 'address', name: 'Mail forwarding', description: 'Separate from address', available: true, priceApproved: false, priceCents: null, currency: 'USD' },
], states: ['Alaska','Wyoming','Florida'].map((state, i) => ({ code: ['AK','WY','FL'][i], state, filingFeeCents: [25000,10000,12500][i], referenceFilingFeeCents: [25000,10000,12500][i], active: true, verifiedAt: '2026-11-07', sourceReference: 'https://official.example.gov', recurringFeeDescription: '$100 per year', recurringFeePeriod: 'annual', processingTime: 'Estimate' })) });
for (const [slug, state, amount] of [['basic','Alaska',44900],['premium','Alaska',54900],['basic','Wyoming',29900],['premium','Wyoming',39900],['basic','Florida',32400],['premium','Florida',42400]] as const) {
 test(`${slug} + ${state} calculates database amounts`, () => assert.equal(quotePricing(catalog(),slug,state,[]).totalCents,amount));
 test(`${slug} + ${state} adds, removes and deduplicates optional services`, () => {
  const c = catalog(); const extra = slug === 'basic' ? 5000 : 0;
  assert.equal(quotePricing(c,slug,state,['banking','banking','agent','ein']).totalCents,amount+extra);
  assert.equal(quotePricing(c,slug,state,[]).totalCents,amount);
 });
}
test('Florida maps by code or trimmed name and unapproved reference is not payable', () => {
 const c=catalog(); c.states[2].active=false; c.states[2].filingFeeCents=null;
 const quote=quotePricing(c,'basic',' fl ',[]);
 assert.equal(quote.referenceSubtotalCents,32400); assert.equal(quote.totalCents,null);
 assert.equal(quote.pendingItems[0].referenceAmountCents,12500);
 assert.match(quote.pendingItems[0].description,/Florida/);
 assert.equal(quote.discountCents,0);
 assert.equal(quotePricing(c,'basic',' florida ',[]).referenceSubtotalCents,32400);
 const missing=quotePricing(c,'basic','Florida',['address']);
 assert.equal(missing.referenceSubtotalCents,null); assert.match(missing.pendingItems[1].description,/Mail forwarding/);
});
test('approved Basic and Advanced have eight and thirteen inclusions', () => { const c=catalog(); assert.equal(c.packages[0].includedServices.length,8); assert.equal(c.packages[1].includedServices.length,13); });
test('selection, deselection and package switching prevent duplicate included charges', () => {
 const c=catalog(); assert.equal(quotePricing(c,'basic','Alaska',['banking']).totalCents,49900);
 assert.equal(quotePricing(c,'basic','Alaska',[]).totalCents,44900);
 assert.equal(quotePricing(c,'premium','Alaska',['banking','agent','ein','business-address']).totalCents,54900);
 assert.equal(quotePricing(c,'basic','Alaska',['agent','ein']).additionalFeeCents,0);
 assert.equal(quotePricing(c,'basic','Alaska',['banking','banking']).additionalFeeCents,5000);
 assert.equal(quotePricing(c,'basic','Alaska',['banking','Bank guidance']).additionalFeeCents,5000);
});
test('unpriced mail forwarding is never folded into included business address', () => { const q=quotePricing(catalog(),'premium','Alaska',['address']); assert.equal(q.totalCents,null); assert.match(q.issues.join(),/Mail forwarding/); });
test('unknown, unapproved, missing and unsupported pricing cannot be payable', () => {
 const c=catalog(); for (const change of [() => {c.states[0].active=false;}, () => {c.states[0].verifiedAt=null;}, () => {c.states[0].filingFeeCents=null;}]) { change(); assert.equal(quotePricing(c,'basic','Alaska',[]).totalCents,null); }
 assert.equal(quotePricing(catalog(),'basic','Alabama',[]).totalCents,null);
 assert.equal(quotePricing(catalog(),'missing','Alaska',[]).totalCents,null);
 assert.equal(quotePricing(catalog(),'basic','Alaska',['unknown']).totalCents,null);
});
test('draft selections restore deterministically; catalog edits never mutate a stored snapshot', () => {
 const c=catalog(); const selection=JSON.parse(JSON.stringify({slug:'basic',state:'Alaska',services:['banking']}));
 const snapshot=quotePricing(c,selection.slug,selection.state,selection.services); const saved=JSON.stringify(snapshot);
 c.packages[0].serviceFeeCents=20000; c.states[0].filingFeeCents=25100;
 assert.equal(quotePricing(c,selection.slug,selection.state,selection.services).totalCents,50100); assert.equal(JSON.stringify(snapshot),saved);
});
test('currency, negative prices and inactive services are rejected', () => { const c=catalog(); c.services[0].currency='EUR'; assert.equal(quotePricing(c,'basic','Alaska',['banking']).totalCents,null); c.packages[0].serviceFeeCents=-1; assert.equal(quotePricing(c,'basic','Alaska',[]).totalCents,null); });
