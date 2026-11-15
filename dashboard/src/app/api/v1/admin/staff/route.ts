import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { normalizeEmail, randomToken, hashToken } from "@/server/security";
import { queueEmail, queueNotification, emailHtml } from "@/server/mail";

const scope=z.enum(["OPERATIONS","SUPPORT"]);
const profile=z.object({fullName:z.string().trim().min(2).max(120),staffScope:scope});
const fields={id:true,fullName:true,email:true,status:true,staffScope:true};
export async function GET(req:NextRequest) {
  try {
    await requireRole(req,"OWNER");
    const applicationId=req.nextUrl.searchParams.get("applicationId");
    const [staff,application]=await Promise.all([db.user.findMany({where:{role:"STAFF"},select:{...fields,passwordHash:true},orderBy:{fullName:"asc"}}),applicationId?db.application.findUnique({where:{id:applicationId},select:{assignedStaffId:true}}):null]);
    return json({staff:staff.map(({passwordHash,...safe})=>({...safe,activated:!!passwordHash})),assignedStaffId:application?.assignedStaffId??null});
  }catch(e){return handleError(e);}
}
export async function POST(req:NextRequest) {
  try {
    checkOrigin(req);const owner=await requireRole(req,"OWNER");
    const input=profile.extend({email:z.email().max(254)}).parse(await body(req));
    const user=await db.$transaction(async tx=>{
      const email=normalizeEmail(input.email);
      if(await tx.user.findUnique({where:{emailNormalized:email},select:{id:true}})) throw new ApiError(409,"This email already belongs to an account.");
      const user=await tx.user.create({data:{...input,email,emailNormalized:email,role:"STAFF"},select:fields});
      const token=randomToken();
      const reset=await tx.passwordReset.create({data:{userId:user.id,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+24*3600000)}});
      await queueEmail(tx,"staff-invite:"+reset.id,email,"Your Apex Filings staff invitation",emailHtml("Staff invitation",["Set your password to activate your staff workspace. This link expires in 24 hours."],{label:"Activate account",href:process.env.APP_ORIGIN+"/reset-password?token="+encodeURIComponent(token)}));
      await tx.auditLog.create({data:{actorUserId:owner.id,action:"STAFF_INVITED",resourceType:"User",resourceId:user.id}});
      return user;
    });
    return json({staff:user},201);
  }catch(e){return handleError(e);}
}
export async function PATCH(req:NextRequest) {
  try {
    checkOrigin(req);const owner=await requireRole(req,"OWNER");
    const input=z.discriminatedUnion("action",[
      profile.extend({action:z.literal("profile"),id:z.string(),status:z.enum(["ACTIVE","SUSPENDED"])}),
      z.object({action:z.literal("assign"),applicationId:z.string(),staffId:z.string().nullable()})
    ]).parse(await body(req));
    await db.$transaction(async tx=>{
      if(input.action==="assign") {
        if(input.staffId) {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id=${input.staffId} FOR SHARE`;
          if(!await tx.user.count({where:{id:input.staffId,status:"ACTIVE",role:"STAFF",staffScope:"OPERATIONS"}})) throw new ApiError(400,"Choose an active operations staff member.");
        }
        await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${input.applicationId} FOR UPDATE`;
        const app=await tx.application.findUnique({where:{id:input.applicationId},select:{id:true,assignedStaffId:true,company:{select:{preferredName:true}}}});
        if(!app) throw new ApiError(404,"Application not found.");
        if(app.assignedStaffId===input.staffId) return;
        await tx.application.update({where:{id:app.id},data:{assignedStaffId:input.staffId}});
        if(input.staffId) await queueNotification(tx,"staff-assignment:"+randomUUID(),input.staffId,"STAFF_ASSIGNMENT","Application assigned",app.company.preferredName,app.id);
        await tx.auditLog.create({data:{actorUserId:owner.id,action:"APPLICATION_ASSIGNED",resourceType:"Application",resourceId:app.id,safeMetadata:{previous:app.assignedStaffId,assignedTo:input.staffId}}});
      } else {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${input.id} FOR UPDATE`;
        const staff=await tx.user.findFirst({where:{id:input.id,role:"STAFF"},select:fields});
        if(!staff) throw new ApiError(404,"Staff account not found.");
        await tx.user.update({where:{id:staff.id},data:{staffScope:input.staffScope,fullName:input.fullName,status:input.status}});
        if(input.status==="SUSPENDED" || input.staffScope!==staff.staffScope) {
          await tx.session.updateMany({where:{userId:staff.id,revokedAt:null},data:{revokedAt:new Date()}});
          await tx.passwordReset.updateMany({where:{userId:staff.id,usedAt:null},data:{usedAt:new Date()}});
          if(input.status==="SUSPENDED") await tx.supportTicket.updateMany({where:{assignedToId:staff.id},data:{assignedToId:null}});
          if(input.status==="SUSPENDED" || input.staffScope==="SUPPORT") await tx.application.updateMany({where:{assignedStaffId:staff.id},data:{assignedStaffId:null}});
        }
        await tx.auditLog.create({data:{actorUserId:owner.id,action:"STAFF_UPDATED",resourceType:"User",resourceId:staff.id,safeMetadata:{previousScope:staff.staffScope,staffScope:input.staffScope,previousStatus:staff.status,status:input.status}}});
      }
    });
    return json({saved:true});
  }catch(e){return handleError(e);}
}
