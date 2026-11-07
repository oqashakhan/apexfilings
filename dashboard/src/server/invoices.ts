import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { invoiceFinancials, invoiceMoney, invoiceSettingsSchema, emptyInvoiceSettings, type InvoiceSnapshot } from '@/lib/invoices';
import { ApiError } from './http';
import { emailHtml } from './mail';

const jsonValue=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const invoiceInclude={order:{include:{payments:true,refunds:true,application:{include:{customer:{select:{id:true,fullName:true,email:true,clientReference:true,notificationPreference:true}},company:true,package:true}}}},creditNotes:true} satisfies Prisma.InvoiceInclude;
export type InvoiceRecord=Prisma.InvoiceGetPayload<{include:typeof invoiceInclude}>;
export function invoiceView(invoice:InvoiceRecord){
 const snapshot=invoice.snapshot as InvoiceSnapshot|null;
 const ledger=invoiceFinancials({...invoice,payments:invoice.order.payments,refunds:invoice.order.refunds});
 if(['VERIFIED','REFUNDED','DISPUTED'].includes(invoice.order.paymentStatus)&&ledger.paidCents===0)ledger.discrepancies.push('Order payment status has no matching verified receipt; reconcile the original payment records.');
 return {id:invoice.id,number:invoice.number,orderId:invoice.orderId,lifecycle:invoice.lifecycle,issuedAt:invoice.issuedAt,dueAt:invoice.dueAt,currency:snapshot?.currency??invoice.order.currency,totalCents:invoice.totalCents,snapshot,
  customer:snapshot?.customer??{id:invoice.order.application.customer.id,name:invoice.order.application.customer.fullName,email:invoice.order.application.customer.email,clientReference:invoice.order.application.customer.clientReference},company:snapshot?.company??{id:invoice.order.application.company.id,name:invoice.order.application.company.preferredName,state:invoice.order.application.company.formationState},
  ...ledger,voidReason:invoice.voidReason,payments:invoice.order.payments.map(p=>({id:p.id,amountCents:p.amountCents,method:p.method,reference:p.reference,status:p.status,verifiedAt:p.verifiedAt,receiptUrl:p.stripeReceiptUrl})),
  refunds:invoice.order.refunds.map(r=>({id:r.id,amountCents:r.amountCents,status:r.status,providerStatus:r.stripeStatus})),creditNotes:invoice.creditNotes.map(c=>({id:c.id,number:c.number,amountCents:c.amountCents,issuedAt:c.issuedAt})),
  legacyProviderPdfUrl:invoice.invoicePdfUrl,legacyProviderInvoiceUrl:invoice.hostedInvoiceUrl,
  issueBlocked:invoice.lifecycle==='LEGACY'?'Historical invoice requires Owner review before a local PDF can be issued.':invoice.lifecycle==='DRAFT'?invoice.order.status==='CANCELLED'?'The order is cancelled; this draft cannot be issued.':'Owner-approved invoice business settings are required before issue.':null,
  canPay:invoice.lifecycle==='ISSUED'&&['UNPAID','OVERDUE'].includes(ledger.status)&&ledger.paidCents===0&&invoice.order.status==='OPEN'&&invoice.order.paymentStatus==='UNPAID'&&invoice.order.application.status==='AWAITING_PAYMENT',
 };
}

export async function invoiceSettings(tx:Prisma.TransactionClient){
 const record=await tx.invoiceSettings.findUnique({where:{id:'default'}});
 const parsed=invoiceSettingsSchema.safeParse(record?.data);
 return {record,data:parsed.success?parsed.data:emptyInvoiceSettings};
}

function pricingSnapshot(order:Prisma.OrderGetPayload<{include:{items:true;application:{include:{customer:true;company:true;package:true}}}}>,reviewed:boolean):InvoiceSnapshot|null{
 if(order.totalCents===null||order.totalCents<=0||order.governmentFeeCents===null||order.currency!=='USD')return null;
 const quote=order.pricingSnapshot as {pricingComplete?:boolean;totalCents?:number;taxCents?:number;items?:{description:string;amountCents:number}[]}|null;
 if(!reviewed&&(!quote?.pricingComplete||quote.totalCents!==order.totalCents))return null;
 const tax=quote?.taxCents??0,discount=order.discountCents??0;
 const subtotal=order.serviceFeeCents+order.governmentFeeCents+(order.additionalFeeCents??0)+(order.thirdPartyFeeCents??0);
 if(![tax,discount,subtotal,order.totalCents].every(n=>Number.isSafeInteger(n)&&n>=0)||subtotal+tax-discount!==order.totalCents)return null;
 const source=quote?.items??order.items;
 if(!Array.isArray(source)||source.some(i=>!i||typeof i.description!=='string'||!Number.isSafeInteger(i.amountCents)))return null;
 const negativeTotal=source.reduce((sum,i)=>sum+(i.amountCents!==null&&i.amountCents<0?i.amountCents:0),0);
 if(negativeTotal!==0&&negativeTotal!==-discount)return null;
 const lines=source.filter(i=>i.amountCents!==null&&i.amountCents>=0).map(i=>({description:i.description,quantity:1,unitCents:i.amountCents!,amountCents:i.amountCents!}));
 if(!lines.length||lines.reduce((s,i)=>s+i.amountCents,0)!==subtotal)return null;
 const customer=order.application.customer,company=order.application.company;
 return {version:1,provenance:reviewed?'REVIEWED_BACKFILL':'ORDER_FINALIZATION',seller:null,customer:{id:customer.id,name:customer.fullName,email:customer.email,clientReference:customer.clientReference},company:{id:company.id,name:company.preferredName,state:company.formationState},applicationId:order.applicationId,orderId:order.id,currency:order.currency,items:lines,subtotalCents:subtotal,taxCents:tax,discountCents:discount,totalCents:order.totalCents};
}

async function nextInvoiceNumber(tx:Prisma.TransactionClient,prefix:string,credit=false){
 for(let attempt=0;attempt<100;attempt++){
  const [row]=credit?await tx.$queryRaw<{value:bigint}[]>`SELECT nextval('apex_credit_note_number_seq') AS value`:await tx.$queryRaw<{value:bigint}[]>`SELECT nextval('apex_invoice_number_seq') AS value`;
  const number=`${credit?'CN':prefix}-${new Date().getUTCFullYear()}-${String(row.value).padStart(6,'0')}`;
  if(!await tx.invoice.findUnique({where:{number}})&&!await tx.invoiceCreditNote.findUnique({where:{number}}))return number;
 }
 throw new ApiError(409,'Invoice numbering requires review');
}

async function notice(tx:Prisma.TransactionClient,invoice:InvoiceRecord,eventKey:string,title:string){
 const view=invoiceView(invoice),customer=invoice.order.application.customer;
 const lines=[`Customer: ${view.customer.name}`,`Invoice: ${invoice.number}`,`Company: ${view.company.name}`,`Total: ${invoiceMoney(invoice.totalCents??0,invoice.currency)}`,`Status: ${view.status.replaceAll('_',' ')}`,`Balance due: ${view.balanceCents===null?'Requires review':invoiceMoney(view.balanceCents,invoice.currency)}`];
 if(customer.notificationPreference?.paymentEmail!==false)await tx.emailOutbox.upsert({where:{eventKey},update:{},create:{eventKey,toEmail:customer.email,subject:`${title} — ${invoice.number} — Apex Filings`,html:emailHtml(title,lines,{label:'View invoice securely',href:`${process.env.APP_ORIGIN??'http://localhost:3001'}/client/invoices/${invoice.id}`})}});
 await tx.notification.upsert({where:{eventKey},update:{},create:{eventKey,userId:customer.id,type:'INVOICE_UPDATE',title,message:`Invoice ${invoice.number}: ${view.status.replaceAll('_',' ')}.`,relatedEntity:invoice.id}});
}

async function creditForRefund(tx:Prisma.TransactionClient,invoice:InvoiceRecord,refund:InvoiceRecord['order']['refunds'][number]){
 if(refund.status!=='COMPLETED'||!refund.amountCents||(refund.stripeRefundId&&refund.stripeStatus!=='succeeded'))return;
 const {record,data}=await invoiceSettings(tx);
 if(record?.approvedAt&&data.creditNotesEnabled&&!await tx.invoiceCreditNote.findUnique({where:{refundId:refund.id}}))await tx.invoiceCreditNote.create({data:{id:randomUUID(),invoiceId:invoice.id,refundId:refund.id,number:await nextInvoiceNumber(tx,'CN',true),amountCents:refund.amountCents,snapshot:jsonValue({invoiceNumber:invoice.number,invoice:invoice.snapshot,reason:refund.reason,refundReference:refund.stripeRefundId??refund.id})}});
}

export async function ensureInvoice(tx:Prisma.TransactionClient,orderId:string,options:{reviewed?:boolean;actorId?:string;backfill?:boolean}={}){
 await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${orderId} FOR UPDATE`;
 const order=await tx.order.findUnique({where:{id:orderId},include:{invoice:true,items:true,application:{include:{customer:true,company:true,package:true}}}});
 if(!order||order.totalCents===null)return null;
 if(order.invoice&&['ISSUED','VOIDED'].includes(order.invoice.lifecycle))return order.invoice;
 if(order.status==='CANCELLED'&&order.invoice?.lifecycle!=='LEGACY')return order.invoice;
 if(order.invoice?.lifecycle==='LEGACY'&&!options.reviewed)return order.invoice;
 const snapshot=(order.invoice?.snapshot as InvoiceSnapshot|null)??pricingSnapshot(order,!!options.reviewed);
 if(!snapshot)return order.invoice;
 const {record:settings,data}=await invoiceSettings(tx);
 const eligible=!!settings?.approvedAt&&!!data.legalName&&!!data.address&&!!data.email&&!!data.website;
 if(order.invoice?.lifecycle==='LEGACY'&&!eligible)return order.invoice;
 const issuedAt=eligible?(order.invoice?.issuedAt??new Date()):null;
 const dueAt=issuedAt&&data.termsDays!==null?new Date(issuedAt.getTime()+data.termsDays*86400000):null;
 const content={...snapshot,...(options.backfill&&!order.invoice?.snapshot?{provenance:'REVIEWED_BACKFILL' as const}:{}),seller:eligible?data:null};
 const fields={snapshot:jsonValue(content),subtotalCents:snapshot.subtotalCents,taxCents:snapshot.taxCents,discountCents:snapshot.discountCents,totalCents:snapshot.totalCents,currency:snapshot.currency,lifecycle:eligible?'ISSUED':'DRAFT',issuedAt,dueAt};
 const invoice=order.invoice?await tx.invoice.update({where:{id:order.invoice.id},data:fields}):await tx.invoice.create({data:{orderId,number:await nextInvoiceNumber(tx,data.prefix),...fields}});
 if(eligible){
  await tx.auditLog.create({data:{actorUserId:options.actorId,action:'INVOICE_ISSUED',resourceType:'Invoice',resourceId:invoice.id,safeMetadata:{orderId,provenance:content.provenance}}});
  const issued=await tx.invoice.findUniqueOrThrow({where:{id:invoice.id},include:invoiceInclude});
  await notice(tx,issued,`invoice:${invoice.id}`,'Invoice Issued');
  if(invoiceView(issued).status==='PAID')await notice(tx,issued,`invoice-paid:${invoice.id}`,'Invoice Paid');
  for(const refund of issued.order.refunds)await creditForRefund(tx,issued,refund);
 }
 return invoice;
}

export async function attachStripeInvoice(tx:Prisma.TransactionClient,orderId:string,provider:{id:string;number:string|null;hosted_invoice_url?:string|null;invoice_pdf?:string|null},issuedAt:Date){
 const canonical=await ensureInvoice(tx,orderId);
 const fields={stripeInvoiceId:provider.id,stripeInvoiceNumber:provider.number??undefined,hostedInvoiceUrl:provider.hosted_invoice_url??undefined,invoicePdfUrl:provider.invoice_pdf??undefined};
 if(canonical)return tx.invoice.update({where:{id:canonical.id},data:fields});
 // Preserve actual provider documents for historical orders without silently
 // reconstructing a new local issued snapshot from current customer/pricing data.
 return tx.invoice.create({data:{orderId,number:provider.number??`AF-${orderId}`,issuedAt,lifecycle:'LEGACY',...fields}});
}

export async function syncInvoice(tx:Prisma.TransactionClient,orderId:string,event:{kind:'payment'|'refund';id:string}){
 const record=await ensureInvoice(tx,orderId);
 if(!record||record.lifecycle!=='ISSUED')return;
 const invoice=await tx.invoice.findUniqueOrThrow({where:{id:record.id},include:invoiceInclude});
 const financial=invoiceView(invoice);
 if(event.kind==='payment'){
  const paid=invoice.order.payments.find(p=>p.id===event.id&&p.verifiedAt&&['VERIFIED','REFUNDED','DISPUTED'].includes(p.status));
  if(paid)await notice(tx,invoice,`invoice-payment:${paid.id}`,'Payment Received');
  if(financial.status==='PAID')await notice(tx,invoice,`invoice-paid:${invoice.id}`,'Invoice Paid');
 }else{
  const refund=invoice.order.refunds.find(r=>r.id===event.id&&r.status==='COMPLETED'&&(!r.stripeRefundId||r.stripeStatus==='succeeded'));
  if(!refund?.amountCents)return;
  await creditForRefund(tx,invoice,refund);
  await notice(tx,invoice,`invoice-refund:${refund.id}`,'Refund Processed');
 }
}

export async function sendInvoice(tx:Prisma.TransactionClient,id:string,key:string,actorId:string){
 const found=await tx.invoice.findUniqueOrThrow({where:{id}});
 await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${found.orderId} FOR UPDATE`;
 const invoice=await tx.invoice.findUniqueOrThrow({where:{id},include:invoiceInclude});
 if(invoice.lifecycle!=='ISSUED')throw new ApiError(409,'Only issued invoices can be emailed');
 if(invoice.order.application.customer.notificationPreference?.paymentEmail===false)throw new ApiError(409,'This customer has disabled payment emails');
 const eventKey=`invoice-send:${id}:${key}`;
 if(await tx.emailOutbox.findUnique({where:{eventKey}}))return;
 if(await tx.auditLog.count({where:{action:'INVOICE_EMAIL_REQUESTED',resourceId:id,createdAt:{gt:new Date(Date.now()-60000)}}}))throw new ApiError(429,'Wait one minute before sending this invoice again');
 await notice(tx,invoice,eventKey,'Your Invoice');
 await tx.auditLog.create({data:{actorUserId:actorId,action:'INVOICE_EMAIL_REQUESTED',resourceType:'Invoice',resourceId:id}});
}

export async function voidInvoice(tx:Prisma.TransactionClient,id:string,reason:string,actorId:string){
 const found=await tx.invoice.findUniqueOrThrow({where:{id}});
 await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${found.orderId} FOR UPDATE`;
 const invoice=await tx.invoice.findUniqueOrThrow({where:{id},include:invoiceInclude});
 if(invoice.lifecycle==='VOIDED')return;
 if(invoice.lifecycle!=='ISSUED'||invoice.order.paymentStatus!=='UNPAID'||invoice.order.payments.some(p=>['VERIFIED','DISPUTED','REFUNDED','AWAITING_VERIFICATION'].includes(p.status))||await tx.stripeCheckout.findUnique({where:{orderId:invoice.orderId}}))throw new ApiError(409,'Only unpaid invoices without payment activity or Checkout can be voided');
 await tx.invoice.update({where:{id},data:{lifecycle:'VOIDED',voidReason:reason,voidedAt:new Date()}});
 await tx.order.update({where:{id:invoice.orderId},data:{status:'CANCELLED'}});
 await tx.auditLog.create({data:{actorUserId:actorId,action:'INVOICE_VOIDED',resourceType:'Invoice',resourceId:id,safeMetadata:{reason}}});
 await notice(tx,await tx.invoice.findUniqueOrThrow({where:{id},include:invoiceInclude}),`invoice-voided:${id}`,'Invoice Voided');
}

export async function queueOverdueInvoice(tx:Prisma.TransactionClient,id:string){
 const {record,data}=await invoiceSettings(tx);if(!record?.approvedAt||!data.remindersEnabled)return;
 const invoice=await tx.invoice.findUniqueOrThrow({where:{id},include:invoiceInclude});
 await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${invoice.orderId} FOR UPDATE`;
 const latest=await tx.invoice.findUniqueOrThrow({where:{id},include:invoiceInclude});
 if(invoiceView(latest).overdue)await notice(tx,latest,`invoice-overdue:${id}:${latest.dueAt!.toISOString()}`,'Invoice Overdue');
}
