import {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/server/db';
import {ownInvoice} from '@/server/invoice-access';
import {ensureInvoice,sendInvoice,voidInvoice,invoiceView,syncInvoice} from '@/server/invoices';
import {invoicePdf} from '@/server/invoice-pdf';
import {ApiError,body,checkOrigin,json,handleError} from '@/server/http';
type Params={params:Promise<{id:string;action:string}>};
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:Params){try{
 const {id,action}=await params;const {invoice}=await ownInvoice(request,id);
 if(action!=='pdf')throw new ApiError(404,'Action not found');
 if(!invoice.snapshot||!['ISSUED','VOIDED'].includes(invoice.lifecycle))throw new ApiError(409,'Invoice requires Owner review and approved seller details before PDF issue');
 const creditId=request.nextUrl.searchParams.get('creditNoteId');const credit=creditId?invoice.creditNotes.find(c=>c.id===creditId):undefined;if(creditId&&!credit)throw new ApiError(404,'Credit note not found');
 const bytes=await invoicePdf(invoiceView(invoice),credit);
 const number=credit?.number??invoice.number;
 return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${number.replace(/[^A-Za-z0-9_-]/g,'_')}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(error){return handleError(error);}}
export async function POST(request:NextRequest,{params}:Params){try{
 checkOrigin(request);const {id,action}=await params;const {user,invoice}=await ownInvoice(request,id);if(user.role!=='OWNER')throw new ApiError(403,'Not authorized');
 if(action==='issue'){
  const input=z.object({reviewedHistoricalDetails:z.boolean().default(false)}).strict().parse(await body(request));
  if(invoice.lifecycle==='LEGACY'&&!input.reviewedHistoricalDetails)throw new ApiError(409,'Confirm review of historical invoice details first');
  const result=await db.$transaction(tx=>ensureInvoice(tx,invoice.orderId,{reviewed:input.reviewedHistoricalDetails,actorId:user.id}));
  if(result?.lifecycle!=='ISSUED')throw new ApiError(409,'Approved business settings and complete finalized price snapshots are required');
 }else if(action==='record-refund'){
  const input=z.object({key:z.uuid(),amountCents:z.number().int().positive(),reason:z.string().trim().min(5).max(500),reference:z.string().trim().min(3).max(200),confirmedCompleted:z.literal(true)}).strict().parse(await body(request));
  await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${invoice.orderId} FOR UPDATE`;
   const refundId=`manual-${input.key}`,existing=await tx.refundRequest.findUnique({where:{id:refundId}});
   if(existing){if(existing.orderId!==invoice.orderId||existing.amountCents!==input.amountCents)throw new ApiError(409,'Refund reference already used');return;}
   const payments=await tx.payment.findMany({where:{orderId:invoice.orderId,method:'MANUAL',status:'VERIFIED',verifiedAt:{not:null}}});
   const refunded=await tx.refundRequest.aggregate({where:{orderId:invoice.orderId,status:'COMPLETED',stripeRefundId:null},_sum:{amountCents:true}});
   if(input.amountCents>payments.reduce((sum,p)=>sum+(p.amountCents??0),0)-(refunded._sum.amountCents??0))throw new ApiError(409,'Refund exceeds verified offline payments remaining');
   await tx.refundRequest.create({data:{id:refundId,orderId:invoice.orderId,amountCents:input.amountCents,status:'COMPLETED',reason:`${input.reason} — Offline reference: ${input.reference}`,reviewedById:user.id,reviewedAt:new Date(),initiatedById:user.id}});
   await syncInvoice(tx,invoice.orderId,{kind:'refund',id:refundId});
   await tx.auditLog.create({data:{actorUserId:user.id,action:'OFFLINE_REFUND_RECORDED',resourceType:'RefundRequest',resourceId:refundId,safeMetadata:{amountCents:input.amountCents,reference:input.reference}}});
  });
 }else if(action==='send'){const {key}=z.object({key:z.uuid()}).strict().parse(await body(request));await db.$transaction(tx=>sendInvoice(tx,id,key,user.id));}
 else if(action==='void'){const {reason}=z.object({reason:z.string().trim().min(5).max(1000)}).strict().parse(await body(request));await db.$transaction(tx=>voidInvoice(tx,id,reason,user.id));}
 else throw new ApiError(404,'Action not found');
 return json({saved:true});
}catch(error){return handleError(error);}}
