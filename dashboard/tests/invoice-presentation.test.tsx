import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { InvoiceDocument, InvoiceStatus } from '../src/components/dashboard/InvoiceDocument';
import { InvoiceAdminControls } from '../src/components/dashboard/InvoiceAdminControls';
import { InvoiceDirectory } from '../src/components/dashboard/InvoiceDirectory';
import { invoiceDownloadHref, invoiceStatusLabel, type InvoiceData } from '../src/lib/invoice-presentation';
import { invoiceFinancials, emptyInvoiceSettings } from '../src/lib/invoices';

const snapshot = { version: 1, provenance: 'REVIEWED_BACKFILL', seller: { ...emptyInvoiceSettings, legalName: 'Fictional QA seller', email: 'billing@example.test' }, customer: { id: 'client', name: 'Fictional Client', email: 'client@example.test', clientReference: '123456789' }, company: { id: 'company', name: 'Fictional LLC', state: 'Louisiana' }, applicationId: 'app', orderId: 'order', currency: 'USD', items: [{ description: 'Advanced LLC Formation', quantity: 1, unitCents: 29900, amountCents: 29900 }, { description: 'Government Filing Fee — Louisiana', quantity: 1, unitCents: 10000, amountCents: 10000 }], subtotalCents: 39900, discountCents: 0, taxCents: 0, totalCents: 39900 } as const;
function fixture(paid=0,lifecycle='ISSUED',dueAt:Date|null=null):InvoiceData {
 const payments=paid?[{id:'payment',amountCents:paid,status:'VERIFIED',verifiedAt:new Date(),method:'BANK',reference:'INTERNAL PAYMENT REFERENCE',receiptUrl:null}]:[];
 return {id:'invoice',number:'INV-QA-000001',orderId:'order',lifecycle,issuedAt:new Date('2026-01-01'),dueAt,currency:'USD',totalCents:39900,snapshot,customer:snapshot.customer,company:snapshot.company,payments,refunds:[],creditNotes:[],voidReason:null,issueBlocked:'INTERNAL SELLER APPROVAL',legacyProviderPdfUrl:null,legacyProviderInvoiceUrl:null,canPay:false,...invoiceFinancials({lifecycle,totalCents:39900,dueAt,payments,refunds:[]})} as unknown as InvoiceData;
}
test('invoice statuses have distinct accurate labels and colors',()=>{
 for(const [status,tone] of [['DRAFT','draft'],['UNPAID','unpaid'],['PARTIALLY_PAID','partial'],['PAID','paid'],['OVERDUE','overdue'],['VOIDED','cancelled'],['REFUNDED','refunded']])assert.match(renderToStaticMarkup(<InvoiceStatus status={status}/>),new RegExp(`invoice-status--${tone}`));
 assert.equal(invoiceStatusLabel('VOIDED'),'Cancelled');
});
test('unpaid and partial invoices show real totals and a disabled payment placeholder',()=>{
 for(const [paid,balance] of [[0,'$399.00'],[10000,'$299.00']] as const){
  const html=renderToStaticMarkup(<InvoiceDocument invoice={fixture(paid)} role="client"/>);
  assert.ok(html.includes(balance));assert.match(html,/disabled="" aria-describedby="invoice-coming-soon"/);assert.match(html,/Stripe payments coming soon/);assert.match(html,/Advanced LLC Formation/);assert.match(html,/123456789/);
  for(const hidden of ['INTERNAL SELLER APPROVAL','Historical details','Reconciliation required','INTERNAL PAYMENT REFERENCE'])assert.equal(html.includes(hidden),false);
  assert.equal(html.includes('/payments/checkout'),false);
 }
});
test('paid and cancelled documents cannot initiate payments; drafts cannot download an issued PDF',()=>{
 for(const invoice of [fixture(39900),fixture(0,'VOIDED')])assert.equal(renderToStaticMarkup(<InvoiceDocument invoice={invoice} role="client"/>).includes('Pay Invoice'),false);
 assert.equal(invoiceDownloadHref(fixture()),'/api/v1/invoices/invoice/pdf');assert.equal(invoiceDownloadHref(fixture(0,'DRAFT')),null);
 const unknown={...fixture(0,'LEGACY'),snapshot:null,totalCents:null,balanceCents:null};
 assert.match(renderToStaticMarkup(<InvoiceDocument invoice={unknown} role="client"/>),/Amount unavailable/);
});
test('admin controls retain internal records outside printable customer document',()=>{
 const html=renderToStaticMarkup(<InvoiceAdminControls invoice={fixture(10000)} busy={false} reviewed={false} reason="" onReviewed={()=>{}} onReason={()=>{}} onAction={()=>{}}/>);
 assert.match(html,/INTERNAL SELLER APPROVAL/);assert.match(html,/INTERNAL PAYMENT REFERENCE/);assert.match(html,/Historical details/);
});
test('directory exposes dates, financial amounts, client reference, actions and server filter control',()=>{
 const html=renderToStaticMarkup(<InvoiceDirectory role="client" invoices={[fixture(10000)]} totals={[]} total={31} page={1} query="" status="ALL" onQuery={()=>{}} onStatus={()=>{}} onPage={()=>{}}/>);
 for(const value of ['123456789','$399.00','$100.00','$299.00','View invoice','Download','View related order','Invoice status','Partially paid','1–30 of 31'])assert.ok(html.includes(value),value);
});
