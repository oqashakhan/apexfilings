import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { actor, ApiError, body, checkOrigin, handleError, json, type Actor } from "@/server/http";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";
import { isIdentityDocument } from "@/lib/identity-documents";

type Context = {params:Promise<{id:string}>};
const fileFields = {id:true, requestId:true, replacesDocumentId:true, reviewStatus:true, documentType:true,ownerId:true} as const;
type FileRow = Prisma.DocumentGetPayload<{select:typeof fileFields}>;
function latest(files:FileRow[], requestId:string) {
  let file = files.find(f=>f.requestId===requestId);
  while(file) {
    const replacement=files.find(f=>f.replacesDocumentId===file!.id);
    if(!replacement) break;
    file=replacement;
  }
  return file;
}
async function target(tx:Prisma.TransactionClient,user:Actor,id:string) {
  if(user.role!=="OWNER" && user.role!=="STAFF") throw new ApiError(403,"Not authorized");
  const app=await tx.application.findFirst({where:{id,...(user.role==="STAFF"?{assignedStaffId:user.id}:{})},select:{id:true,status:true,customerId:true,company:{select:{preferredName:true,customerId:true,owners:{select:{id:true}}}},customer:{select:{id:true,email:true,emailVerifiedAt:true,status:true,notificationPreference:true}}}});
  if(!app || app.customerId!==app.company.customerId) throw new ApiError(404,"Application not found");
  return app;
}
export async function GET(req:NextRequest,ctx:Context) {
  try {
    const user=await actor(req), {id}=await ctx.params;
    await target(db,user,id);
    const [rows,files]=await Promise.all([db.documentRequest.findMany({where:{applicationId:id},orderBy:{createdAt:"desc"}}),db.document.findMany({where:{applicationId:id},select:fileFields})]);
    return json({requests:rows.map(r=>{const file=latest(files,r.id);return {...r,fileId:file?.id,status:r.cancelledAt?"CANCELLED":file?.reviewStatus??"NOT_PROVIDED"};})});
  } catch(e){return handleError(e);}
}
const inputSchema=z.object({documentType:z.string().regex(/^[A-Z_]{3,60}$/),ownerId:z.string().optional(),reason:z.string().trim().min(5).max(500),customTitle:z.string().trim().max(160).optional(),dueDate:z.iso.date().optional(),confirmReplacement:z.boolean().default(false)});
export async function POST(req:NextRequest,ctx:Context) {
  try {
    checkOrigin(req);const user=await actor(req),{id}=await ctx.params;
    const input=inputSchema.parse(await body(req));
    const result=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${id} FOR UPDATE`;
      const app=await target(tx,user,id);
      if(["DRAFT","COMPLETED","CANCELLED","REFUNDED","REFUND_REQUESTED"].includes(app.status)) throw new ApiError(409,"Document requests are unavailable at this stage");
      if((input.ownerId&&!app.company.owners.some(o=>o.id===input.ownerId)) || (isIdentityDocument(input.documentType)&&!input.ownerId)) throw new ApiError(400,"Choose an owner from this application.");
      const scope={applicationId:id,ownerId:input.ownerId??null};
      const [prior,files]=await Promise.all([tx.documentRequest.findMany({where:{...scope,documentType:input.documentType,cancelledAt:null}}),tx.document.findMany({where:scope,select:fileFields})]);
      if(prior.some(r=>latest(files,r.id)?.reviewStatus!=="ACCEPTED")) throw new ApiError(409,"An outstanding request for this document already exists.");
      const accepted=files.some(f=>f.reviewStatus==="ACCEPTED" && (input.documentType==="OWNER_ID"?isIdentityDocument(f.documentType):f.documentType===input.documentType));
      if(accepted&&!input.confirmReplacement) throw new ApiError(409,"An approved document already exists. Confirm a new request and explain why it is needed.");
      const item=await tx.documentRequest.create({data:{...scope,requestKey:randomUUID(),documentType:input.documentType,customTitle:input.customTitle||null,reason:input.reason,dueDate:input.dueDate?new Date(input.dueDate):null,createdById:user.id}});
      const title=item.customTitle||item.documentType.replaceAll("_"," ");
      const key="document-request:"+item.id;
      await queueNotification(tx,key,app.customerId,"DOCUMENT_REVIEW","Document requested",title+" for "+app.company.preferredName,id);
      if(app.customer.emailVerifiedAt && app.customer.status==="ACTIVE" && app.customer.notificationPreference?.documentEmail!==false) await queueEmail(tx,key,app.customer.email,"Document required for your LLC formation — Apex Filings",emailHtml("Document required for your LLC formation",[app.company.preferredName,title,item.reason,...(input.dueDate?["Due "+input.dueDate]:[])],{label:"View request",href:process.env.APP_ORIGIN+"/client/applications/"+id+"#document-requests"}));
      await tx.auditLog.create({data:{actorUserId:user.id,action:"DOCUMENT_REQUESTED",resourceType:"DocumentRequest",resourceId:item.id,safeMetadata:{applicationId:id,documentType:item.documentType}}});
      return item;
    });return json({request:result},201);
  }catch(e){return handleError(e);}
}
export async function PATCH(req:NextRequest,ctx:Context) {
  try {
    checkOrigin(req);const user=await actor(req),{id}=await ctx.params;
    const {requestId}=z.object({requestId:z.string()}).parse(await body(req));
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${id} FOR UPDATE`;
      const app=await target(tx,user,id);
      const files=await tx.document.findMany({where:{applicationId:id},select:fileFields});
      const file=latest(files,requestId);
      if(file && file.reviewStatus!=="REPLACEMENT_REQUIRED") throw new ApiError(409,"Only outstanding upload or replacement requests can be cancelled.");
      const changed=await tx.documentRequest.updateMany({where:{id:requestId,applicationId:id,cancelledAt:null},data:{cancelledAt:new Date()}});
      if(!changed.count) throw new ApiError(409,"This request is no longer available.");
      await queueNotification(tx,"document-request-cancel:"+requestId,app.customerId,"DOCUMENT_REVIEW","Document request cancelled","This document is no longer requested.",id);
      await tx.auditLog.create({data:{actorUserId:user.id,action:"DOCUMENT_REQUEST_CANCELLED",resourceType:"DocumentRequest",resourceId:requestId,safeMetadata:{applicationId:id}}});
    });return json({cancelled:true});
  }catch(e){return handleError(e);}
}
