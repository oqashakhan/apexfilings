import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PricingSummary } from '../src/components/forms/PricingSummary';
import { quotePricing, type PricingCatalog } from '../src/lib/pricing';
const catalog: PricingCatalog = {
 packages: [{id:'basic',slug:'basic',name:'Basic LLC Formation',available:true,currency:'USD',serviceFeeCents:19900,includedServices:['EIN Application Assistance'],includedServiceSlugs:['ein']}],
 services: [{id:'mail',slug:'mail',name:'Mail forwarding',description:'Separate service',available:true,priceCents:null,priceApproved:false,currency:'USD'}],
 states: [{code:'FL',state:'Florida',filingFeeCents:null,referenceFilingFeeCents:12500,active:false,verifiedAt:null,sourceReference:'Client reference',recurringFeeDescription:null,recurringFeePeriod:null,processingTime:null}],
};
test('summary keeps unapproved Florida nonpayable with a concise notice', () => {
 const html=renderToStaticMarkup(<PricingSummary quote={quotePricing(catalog,'basic','Florida',['ein'])} />);
 for(const text of ['Florida','Discount','$0.00','Being confirmed','Final pricing is being confirmed']) assert.ok(html.includes(text),text);
 assert.equal(html.includes('To Be Confirmed'),false);
 assert.equal(html.includes('Total Payable'),false);assert.ok(html.includes('Known subtotal'));assert.ok(html.includes('Third-party Fees'));
});
test('missing optional price is identified without hiding known prices', () => {
 const html=renderToStaticMarkup(<PricingSummary quote={quotePricing(catalog,'basic','Florida',['mail'])} />);
 for(const text of ['$199.00','Mail forwarding','Being confirmed','Discount']) assert.ok(html.includes(text),text);
 assert.equal(html.includes('$324.00'),false,'no complete subtotal when an optional price is unknown');
});
test('quote error replaces loading and cannot display a stale payable total', () => {
 const html=renderToStaticMarkup(<PricingSummary quote={null} error="Pricing service unavailable" />);
 assert.ok(html.includes('role="alert"')); assert.ok(html.includes('temporarily unavailable')); assert.equal(html.includes('Calculating'),false);
});
test('approved optional service has its own price and disappears when deselected', () => {
 const approved=structuredClone(catalog);
 Object.assign(approved.states[0],{filingFeeCents:12500,active:true,verifiedAt:'2026-11-07',sourceReference:'https://official.example.gov/test-only'});
 Object.assign(approved.services[0],{priceCents:3000,priceApproved:true});
 const selected=renderToStaticMarkup(<PricingSummary quote={quotePricing(approved,'basic','Florida',['mail','ein'])} />);
 for(const text of ['Mail forwarding','$30.00','$354.00']) assert.ok(selected.includes(text),text);
 const removed=renderToStaticMarkup(<PricingSummary quote={quotePricing(approved,'basic','Florida',[])} />);
 assert.ok(removed.includes('$324.00')); assert.equal(removed.includes('Mail forwarding'),false);
});
