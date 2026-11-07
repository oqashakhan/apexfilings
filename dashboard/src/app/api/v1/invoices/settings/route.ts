import {NextRequest} from 'next/server';
import {z} from 'zod';
import {db} from '@/server/db';
import {invoiceSettings} from '@/server/invoices';
import {invoiceSettingsSchema} from '@/lib/invoices';
import {ApiError,requireRole,checkOrigin,body,json,handleError} from '@/server/http';
export async function GET(request:NextRequest){try{await requireRole(request,'OWNER');const {record,data}=await invoiceSettings(db);return json({data,approved:!!record?.approvedAt,approvedAt:record?.approvedAt??null});}catch(error){return handleError(error);}}
export async function PATCH(request:NextRequest){try{
 checkOrigin(request);const owner=await requireRole(request,'OWNER');const input=z.object({data:invoiceSettingsSchema,approved:z.boolean(),verifiedDetails:z.boolean()}).strict().parse(await body(request));
 if(input.approved&&(!input.verifiedDetails||!input.data.legalName||!input.data.address||!input.data.email||!input.data.website))throw new ApiError(400,'Confirm the legitimate legal name, address, contact email and website before approval');
 await db.$transaction(async tx=>{const data={data:input.data,approvedAt:input.approved?new Date():null,approvedById:input.approved?owner.id:null};await tx.invoiceSettings.upsert({where:{id:'default'},create:{id:'default',...data},update:data});await tx.auditLog.create({data:{actorUserId:owner.id,action:'INVOICE_SETTINGS_UPDATED',resourceType:'InvoiceSettings',resourceId:'default',safeMetadata:{approved:input.approved}}});});
 return json({saved:true});
}catch(error){return handleError(error);}}
