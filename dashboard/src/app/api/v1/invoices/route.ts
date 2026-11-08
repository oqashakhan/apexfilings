import { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { invoiceActor } from '@/server/invoice-access';
import { invoiceInclude, invoiceView } from '@/server/invoices';
import { ApiError,handleError,json } from '@/server/http';
import { invoiceStatuses } from '@/lib/invoice-presentation';
import type { Prisma } from '@prisma/client';
export const runtime='nodejs';
export async function GET(request:NextRequest){try{
 const user=await invoiceActor(request),params=request.nextUrl.searchParams;
 const customerId=user.role==='CLIENT'?user.id:params.get('customerId')||undefined;
 const scope:Prisma.InvoiceWhereInput=customerId?{order:{application:{customerId}}}:{};
 const search=params.get('search')?.trim().slice(0,100);
 const status=params.get('status');
 if(status&&!invoiceStatuses.some(value=>value===status))throw new ApiError(400,'Invalid invoice status');
 const page=Math.max(1,Math.min(10000,Number(params.get('page'))||1)),take=30;
 const where:Prisma.InvoiceWhereInput={...scope,...(search?{OR:[{number:{contains:search,mode:'insensitive'}},{orderId:search},{order:{application:{customer:{clientReference:search}}}},{order:{application:{customer:{fullName:{contains:search,mode:'insensitive'}}}}},{order:{application:{company:{preferredName:{contains:search,mode:'insensitive'}}}}},{snapshot:{path:['customer','name'],string_contains:search}},{snapshot:{path:['company','name'],string_contains:search}}]}:{})};
 const summaryRows=await db.invoice.findMany({where:scope,include:invoiceInclude});
 // Filter before pagination using the same ledger rules as the detail view.

 if(status)where.id={in:summaryRows.filter(row=>(invoiceView(row).presentationStatus===status||invoiceView(row).status===status)).map(row=>row.id)};
 const [rows,total]=await Promise.all([db.invoice.findMany({where,include:invoiceInclude,orderBy:{createdAt:'desc'},skip:(page-1)*take,take}),db.invoice.count({where})]);
 const totals:Record<string,{currency:string;invoicedCents:number;collectedCents:number;refundedCents:number;outstandingCents:number;overdue:number;knownPendingCents:number;pendingCount:number}>={};
 for(const row of summaryRows){const value=invoiceView(row),currency=row.lifecycle==='LEGACY'?row.order.currency:row.currency,group=totals[currency]??={currency,invoicedCents:0,collectedCents:0,refundedCents:0,outstandingCents:0,overdue:0,knownPendingCents:0,pendingCount:0};if(row.lifecycle!=='VOIDED'){group.invoicedCents+=value.totalCents??0;if(value.pricing.requiresReview)group.pendingCount++;if(value.totalCents===null)group.knownPendingCents+=value.pricing.knownSubtotalCents;};group.collectedCents+=value.paidCents;group.refundedCents+=value.refundedCents;if(row.lifecycle==='ISSUED')group.outstandingCents+=value.balanceCents??0;if(value.overdue)group.overdue++;}
 return json({items:rows.map(invoiceView),total,page,pageSize:take,totals:Object.values(totals)});
}catch(error){return handleError(error);}}
