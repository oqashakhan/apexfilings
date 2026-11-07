import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PackageFeatures, ServiceCards, IdentityUploads } from '../src/components/forms/WizardCards';
import { ownerHasIdentity } from '../src/lib/identity-documents';
import { adminPackages } from '../prisma/catalog';
import { quotePricing, type PriceService } from '../src/lib/pricing';
const packages=adminPackages.map(p=>({...p,id:p.id,slug:p.id,serviceFeeCents:p.serviceFee*100,currency:'USD'}));
const service:PriceService={id:'bank',slug:'banking',name:'Bank application guidance',description:'Application assistance',available:true,priceApproved:true,priceCents:5000,currency:'USD',availableStateCodes:['FL']};
for(const types of [['CNIC'],['PASSPORT'],['CNIC','PASSPORT'],[]]) test(`identity accepts ${types.join('+')||'neither'} correctly`,()=>{
 const files=types.map(documentType=>({documentType,ownerId:'owner',reviewStatus:'UNDER_REVIEW'}));
 assert.equal(ownerHasIdentity(files,'owner'),types.length>0);
 assert.equal(ownerHasIdentity(files,'other-owner'),false);
 assert.equal(ownerHasIdentity(files,'owner',true),false);
});
test('legacy identity remains valid, rejected and replaced identity cannot pass',()=>{
 assert.equal(ownerHasIdentity([{documentType:'OWNER_ID',ownerId:'owner',reviewStatus:'ACCEPTED'}],'owner',true),true);
 assert.equal(ownerHasIdentity([{documentType:'CNIC',ownerId:'owner',reviewStatus:'REPLACEMENT_REQUIRED'}],'owner'),false);
 assert.equal(ownerHasIdentity([{id:'old',documentType:'CNIC',ownerId:'owner',reviewStatus:'ACCEPTED'},{id:'new',replacesDocumentId:'old',documentType:'CNIC',ownerId:'owner',reviewStatus:'UNDER_REVIEW'}],'owner',true),false);
});
for(const pack of packages) test(`${pack.name} renders compact feature and selectable service cards`,()=>{
 const html=renderToStaticMarkup(<PackageFeatures pack={pack}/>);assert.ok(html.includes('llc-package-card'));assert.ok(html.includes('llc-feature-list'));assert.ok(html.includes(pack.name));
 if(pack.slug==='premium')assert.ok(html.includes('<details>'));
 const cards=renderToStaticMarkup(<ServiceCards services={[service]} pack={pack} selected={[]} stateCode="FL" locked={false} onToggle={()=>{}}/>);
 assert.ok(cards.includes('llc-service-card'));assert.ok(cards.includes(pack.slug==='premium'?'Included in your package':'$50.00'));
});
test('state restrictions block charges on server and selection in UI',()=>{
 const pack=packages[0];
 const quote=quotePricing({packages,services:[service],states:[]},pack.slug,'Alaska',['banking']);assert.equal(quote.totalCents,null);assert.match(quote.issues.join(),/not available/);
 const html=renderToStaticMarkup(<ServiceCards services={[service]} pack={pack} selected={[]} stateCode="AK" locked={false} onToggle={()=>{}}/>);assert.ok(html.includes('disabled'));assert.ok(html.includes('Unavailable in this state'));
});
test('document cards provide labelled CNIC and Passport inputs and review state',()=>{
 const html=renderToStaticMarkup(<IdentityUploads owners={[{id:'owner',fullName:'Test Owner'}]} documents={[{ownerId:'owner',documentType:'CNIC',reviewStatus:'UNDER_REVIEW'}]} uploaded={{}} busy={false} onUpload={()=>{}}/>);
 for(const text of ['CNIC','Passport','At least one document required','awaiting review','type="file"'])assert.ok(html.includes(text),text);
});
