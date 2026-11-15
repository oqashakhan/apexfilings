import { NextRequest } from 'next/server';
import { actor, assertVerifiedClient, ApiError } from './http';
import { db } from './db';
import { invoiceInclude } from './invoices';
export async function invoiceActor(request:NextRequest){
 const user=await actor(request);if(!['OWNER','CLIENT'].includes(user.role))throw new ApiError(403,'Not authorized');assertVerifiedClient(user);return user;
}
export async function ownInvoice(request:NextRequest,id:string,staffPdf=false){
 const user=staffPdf?await actor(request):await invoiceActor(request);
 if(!["OWNER","STAFF","CLIENT"].includes(user.role))throw new ApiError(403,"Not authorized");assertVerifiedClient(user);
 const invoice=await db.invoice.findFirst({where:{id,...(user.role==='CLIENT'?{order:{application:{customerId:user.id}}}:user.role==='STAFF'?{order:{application:{assignedStaffId:user.id}}}:{})},include:invoiceInclude});
 if(!invoice)throw new ApiError(404,'Invoice not found');return {user,invoice};
}
