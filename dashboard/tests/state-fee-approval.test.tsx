import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { quotePricing, type PriceState, type PricingCatalog } from '../src/lib/pricing';
import { validateStateFeeApproval } from '../src/lib/state-fee-approval';
import { StateFeeApproval } from '../src/components/dashboard/StateFeeApproval';
import references from '../prisma/state-pricing-reference.json';
import { adminPackages } from '../prisma/catalog';
const packages=adminPackages.map(p=>({...p,id:p.id,slug:p.id,serviceFeeCents:p.serviceFee*100,currency:'USD'}));
const states:PriceState[]=references.map(s=>({...s,filingFeeCents:s.referenceFilingFeeCents,active:s.referenceFilingFeeCents!==null,verifiedAt:'2026-11-07',sourceReference:'https://official.example.gov/test-fixture-only'}));
test('every supplied jurisdiction calculates both package totals from configured approved fees',()=>{
 const c={packages,services:[],states};
 for(const state of states)for(const pack of packages){const q=quotePricing(c,pack.slug,state.code,[]);assert.equal(q.totalCents,state.filingFeeCents===null?null:pack.serviceFeeCents+state.filingFeeCents,state.state);assert.equal(q.thirdPartyFeeCents,0);assert.equal(q.additionalFeeCents,0);assert.equal(q.discountCents,0);}
});
test('Louisiana reference is $100; approval controls the $299/$399 Basic/Advanced totals',()=>{
 const la=states.find(s=>s.code==='LA')!;assert.equal(la.referenceFilingFeeCents,10000);
 const c:PricingCatalog={packages,services:[],states:[{...la,active:false,filingFeeCents:null}]};
 assert.equal(quotePricing(c,'premium','Louisiana',[]).totalCents,null);assert.equal(quotePricing(c,'premium','Louisiana',[]).knownSubtotalCents,29900);
 c.states[0]={...la,active:true,filingFeeCents:10000};assert.equal(quotePricing(c,'premium','Louisiana',[]).totalCents,39900);assert.equal(quotePricing(c,'basic','LA',[]).totalCents,29900);
 c.states[0].filingFeeCents=12500;assert.equal(quotePricing(c,'premium','Louisiana',[]).totalCents,42400,'verified amount may differ from the client reference');
});
test('approval requires an official HTTPS source, real date, owner attestation and difference acknowledgement',()=>{
 const now=Date.parse('2026-11-07T12:00:00Z');const data={filingFeeCents:10000,verifiedAt:'2026-11-07T00:00:00Z',sourceReference:'https://official.example.gov/fee',verificationConfirmed:true,referenceDifferenceConfirmed:false};
 assert.equal(validateStateFeeApproval(data,10000,now),null);
 for(const changed of [{sourceReference:'Client reference'},{sourceReference:'https://secret@official.example.gov'},{verifiedAt:'2027-01-01T00:00:00Z'},{verificationConfirmed:false},{filingFeeCents:null}])assert.ok(validateStateFeeApproval({...data,...changed},10000,now));
 assert.ok(validateStateFeeApproval({...data,filingFeeCents:12500},10000,now));assert.equal(validateStateFeeApproval({...data,filingFeeCents:12500,referenceDifferenceConfirmed:true},10000,now),null);
});
test('Admin approval UI shows reference and requires deliberate verification',()=>{
 const state={...states.find(s=>s.code==='LA')!,active:false,filingFeeCents:null,verifiedAt:null,sourceReference:'Client reference'};
 const html=renderToStaticMarkup(<StateFeeApproval state={state} onSaved={async()=>{}}/>);
 for(const text of ['$100.00','Not approved for payment','Official source URL','Verification date','Verify and approve filing fee','Save inactive draft','Recurring fees'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('disabled'));
});
