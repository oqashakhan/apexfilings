import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { quotePricing, type PriceState, type PricingCatalog } from '../src/lib/pricing';
import { validateStateFeeApproval } from '../src/lib/state-fee-approval';
import { StateFeeApproval } from '../src/components/dashboard/StateFeeApproval';
import { diagnoseStateFee } from '../src/lib/state-fee-diagnostics';
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

test('all states diagnose missing, pending and approved records without charging references',()=>{
 for(const reference of states){
  const pending={...reference,filingFeeCents:null,active:false,verifiedAt:null,sourceReference:'Client reference'};
  assert.deepEqual(diagnoseStateFee(null).blockers,['STATE_RECORD_MISSING']);
  const diagnosis=diagnoseStateFee(pending);
  assert.equal(diagnosis.status,'PENDING');
  assert.deepEqual(diagnosis.blockers,['OWNER_APPROVAL_PENDING','PAYABLE_FEE_MISSING','VERIFICATION_MISSING','OFFICIAL_SOURCE_MISSING']);
  const c={packages,services:[],states:[pending]};
  for(const pack of packages){
   const q=quotePricing(c,pack.slug,reference.code,[]);
   assert.equal(q.paymentAllowed,false);assert.equal(q.totalCents,null);
   assert.equal(q.governmentFeeCents,null);assert.match(q.pendingItems[0].reason,/Payable filing fee not configured/);
   const approved={...reference,filingFeeCents:reference.referenceFilingFeeCents??0,active:true};
   assert.equal(diagnoseStateFee(approved).status,'APPROVED');
   assert.equal(quotePricing({...c,states:[approved]},pack.slug,reference.code,[]).totalCents,pack.serviceFeeCents+approved.filingFeeCents);
   const missing=quotePricing({...c,states:[]},pack.slug,reference.code,[]);
   assert.equal(missing.totalCents,null);assert.equal(missing.pendingItems[0].reason,'State fee record missing');
  }
 }
});

test('active alone cannot authorize a fee; invalid and future verification remain blocked',()=>{
 const approved=states.find(s=>s.code==='LA')!;
 const now=Date.parse('2026-11-07T12:00:00Z');
 for(const [change,blocker] of [
  [{active:false},'OWNER_APPROVAL_PENDING'],[{filingFeeCents:null},'PAYABLE_FEE_MISSING'],
  [{filingFeeCents:-1},'PAYABLE_FEE_INVALID'],[{verifiedAt:null},'VERIFICATION_MISSING'],
  [{verifiedAt:'not-a-date'},'VERIFICATION_MISSING'],[{verifiedAt:'2099-01-01'},'VERIFICATION_IN_FUTURE'],
  [{sourceReference:'Client reference'},'OFFICIAL_SOURCE_MISSING'],
 ] as const){assert.ok(diagnoseStateFee({...approved,...change},now).blockers.includes(blocker));}
});
