import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { ApiError,body,checkOrigin,requireRole,json,handleError } from '@/server/http';
export async function GET(req:NextRequest){
  try{const client=await requireRole(req,'CLIENT');const u=await db.user.findUniqueOrThrow({where:{id:client.id},select:{emailNormalized:true,marketingEmailConsent:true,marketingConsentAt:true}});return json({subscribed:!!u.marketingConsentAt&&u.marketingEmailConsent===u.emailNormalized});}catch(e){return handleError(e);}
}
export async function POST(req:NextRequest){
  try{
    checkOrigin(req);
    const input=z.union([z.object({token:z.uuid()}),z.object({subscribe:z.boolean()})]).parse(await body(req));
    const client='token' in input?null:await requireRole(req,'CLIENT');
    await db.$transaction(async tx=>{
      if('token' in input){
        const r=await tx.broadcastRecipient.findUnique({where:{unsubscribeToken:input.token},select:{userId:true,email:true,broadcast:{select:{category:true}}}});
        if(!r||r.broadcast.category!=='MARKETING')throw new ApiError(404,'Unsubscribe link is invalid.');
        await tx.user.updateMany({where:{id:r.userId,marketingEmailConsent:r.email},data:{marketingConsentAt:null,marketingEmailConsent:null}});
      }else if(client){
        const u=await tx.user.findUniqueOrThrow({where:{id:client.id},select:{emailNormalized:true,emailVerifiedAt:true}});
        if(input.subscribe&&!u.emailVerifiedAt)throw new ApiError(409,'Verify your email first.');
        await tx.user.update({where:{id:client.id},data:{marketingConsentAt:input.subscribe?new Date():null,marketingEmailConsent:input.subscribe?u.emailNormalized:null}});
        await tx.auditLog.create({data:{actorUserId:client.id,action:input.subscribe?'MARKETING_OPT_IN':'MARKETING_OPT_OUT',resourceType:'User',resourceId:client.id}});
      }
    });return json({saved:true});
  }catch(e){return handleError(e);}
}
