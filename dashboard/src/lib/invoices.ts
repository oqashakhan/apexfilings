import { z } from 'zod';

export const invoiceSettingsSchema = z.object({
  displayName:z.string().trim().min(1).max(160), legalName:z.string().trim().max(200), address:z.string().trim().max(1000),
  email:z.union([z.email(),z.literal('')]), website:z.union([z.url().refine(v=>v.startsWith('https://'),'Use HTTPS'),z.literal('')]),
  taxDetails:z.string().max(1000), prefix:z.string().regex(/^[A-Z][A-Z0-9-]{1,15}$/).refine(v=>v!=='CN','CN is reserved for credit notes'), footer:z.string().max(2000),
  termsDays:z.number().int().min(0).max(365).nullable(), remindersEnabled:z.boolean(), creditNotesEnabled:z.boolean(),
});
export type InvoiceSettingsData = z.infer<typeof invoiceSettingsSchema>;
export const emptyInvoiceSettings:InvoiceSettingsData={displayName:'APEX FILINGS',legalName:'',address:'',email:'',website:'',taxDetails:'',prefix:'INV',footer:'',termsDays:null,remindersEnabled:false,creditNotesEnabled:false};
export type InvoiceSnapshot={version:1;provenance:'ORDER_FINALIZATION'|'REVIEWED_BACKFILL';seller:InvoiceSettingsData|null;customer:{id:string;name:string;email:string;clientReference:string|null;billingAddress?:string};company:{id:string;name:string;state:string};applicationId:string;orderId:string;currency:string;items:{description:string;quantity:number;unitCents:number;amountCents:number}[];subtotalCents:number;taxCents:number;discountCents:number;totalCents:number};
export const invoiceMoney=(amount:number,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(amount/100);
type Ledger={lifecycle:string;totalCents:number|null;dueAt:Date|string|null;payments:{id:string;amountCents:number|null;status:string;verifiedAt:Date|string|null}[];refunds:{id:string;amountCents:number|null;status:string;stripeRefundId?:string|null;stripeStatus?:string|null}[]};
export function invoiceFinancials(input:Ledger,now=Date.now()){
 const received=input.payments.filter(p=>p.verifiedAt&&['VERIFIED','REFUNDED','DISPUTED'].includes(p.status));
 const paidCents=received.reduce((sum,p)=>sum+(p.amountCents??0),0);
 const refundedCents=input.refunds.filter(r=>r.status==='COMPLETED'&&(!r.stripeRefundId||r.stripeStatus==='succeeded')).reduce((sum,r)=>sum+(r.amountCents??0),0);
 const total=input.totalCents??0;
 // Refunds return funds; they do not silently create a new receivable.
 const balanceCents=input.lifecycle==='VOIDED'?0:input.totalCents===null?null:Math.max(0,total-paidCents);
 const overdue=input.lifecycle==='ISSUED'&&balanceCents!==null&&balanceCents>0&&!!input.dueAt&&new Date(input.dueAt).getTime()<now;
 const status=input.lifecycle==='VOIDED'?'VOIDED':input.lifecycle!=='ISSUED'?'DRAFT':refundedCents>0?(refundedCents>=total&&total>0?'REFUNDED':'PARTIALLY_REFUNDED'):balanceCents===0?'PAID':overdue?'OVERDUE':paidCents>0?'PARTIALLY_PAID':'UNPAID';
 const discrepancies=[...(input.totalCents===null?['Invoice amount requires historical review.']:paidCents>total?['Received payments exceed the invoice total.']:[]),...(refundedCents>paidCents?['Refunds exceed verified receipts.']:[]),...(input.payments.some(p=>p.status==='DISPUTED')?['A payment dispute requires review.']:[])];
 return {status,overdue,paidCents,refundedCents,netCollectedCents:paidCents-refundedCents,balanceCents,discrepancies};
}
