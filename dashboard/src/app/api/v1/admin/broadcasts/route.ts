import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireRole,body,checkOrigin,json,handleError,ApiError } from '@/server/http';
import { audience,broadcastHtml } from '@/server/broadcasts';
import { queueEmail } from '@/server/mail';

const compose=z.object({action:z.literal('preview'),id:z.uuid(),subject:z.string().trim().min(2).max(160).regex(/^[^\r\n]+$/),message:z.string().trim().min(5).max(12000),category:z.enum(['SERVICE','MARKETING']),audience:z.enum(['ALL','APPLICATIONS','SELECTED']),selectedIds:z.array(z.string().min(1).max(120)).max(500).default([])});
const actions=z.discriminatedUnion('action',[compose,z.object({action:z.literal('confirm'),id:z.uuid(),confirmed:z.literal(true),fingerprint:z.string().length(64)}),z.object({action:z.enum(['test','cancel','retry']),id:z.uuid()})]);
export async function GET(req:NextRequest) {
  try {
    await requireRole(req,'OWNER');
    const id=req.nextUrl.searchParams.get('id'),page=Math.max(1,Math.floor(Number(req.nextUrl.searchParams.get('page'))||1));
    if(!id) {
      const campaigns=await db.emailBroadcast.findMany({include:{_count:{select:{recipients:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*25,take:25});
      const actors=await db.user.findMany({where:{id:{in:campaigns.map(c=>c.createdById)}},select:{id:true,fullName:true}});
      return json({campaigns:campaigns.map(c=>({...c,createdBy:actors.find(u=>u.id===c.createdById)?.fullName}))});
    }
    const campaign=await db.emailBroadcast.findUnique({where:{id}});
    if(!campaign) throw new ApiError(404,'Broadcast not found');
    const [rows,counts]=await Promise.all([db.broadcastRecipient.findMany({where:{broadcastId:id},select:{id:true,email:true,suppressedAt:true,outbox:{select:{status:true}}},orderBy:{id:'asc'},skip:(page-1)*25,take:25}),db.$queryRaw<{status:string;count:number}[]>`SELECT CASE WHEN o.status IN ('DELIVERED','SENT','SENDING') THEN o.status::text WHEN r."suppressedAt" IS NOT NULL THEN 'SUPPRESSED' WHEN c."cancelledAt" IS NOT NULL THEN 'CANCELLED' ELSE COALESCE(o.status::text,'PENDING') END AS status,count(*)::int AS count FROM "BroadcastRecipient" r JOIN "EmailBroadcast" c ON c.id=r."broadcastId" LEFT JOIN "EmailOutbox" o ON o.id=r."outboxId" WHERE r."broadcastId"=${id} GROUP BY 1`]);
    return json({campaign,counts,recipients:rows.map(r=>({email:r.email,status:r.outbox && ['SENDING','SENT','DELIVERED'].includes(r.outbox.status)?r.outbox.status:r.suppressedAt?'SUPPRESSED':campaign.cancelledAt?'CANCELLED':r.outbox?.status??'PENDING'}))});
  }catch(e){return handleError(e);}
}
export async function POST(req:NextRequest) {
  try {
    checkOrigin(req);const owner=await requireRole(req,'OWNER'),input=actions.parse(await body(req));
    return json(await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'broadcast:'+input.id}))`;
      if(input.action==='preview'){
        const {id,subject,message,category,audience:group,selectedIds}=input;
        const prior=await tx.emailBroadcast.findUnique({where:{id}});
        if(prior?.confirmedAt||prior?.cancelledAt) throw new ApiError(409,'Create a new draft for this message.');
        const data={subject,message,category,audience:group,selectedIds};
        const c=await tx.emailBroadcast.upsert({where:{id},create:{...data,id,createdById:owner.id},update:data});
        const recipients=await audience(tx,c);
        return {id,count:recipients.rows.length,fingerprint:recipients.fingerprint,html:await broadcastHtml(tx,c)};
      }
      const c=await tx.emailBroadcast.findUnique({where:{id:input.id}});
      if(!c)throw new ApiError(404,'Broadcast not found.');
      if(input.action==='cancel'){
        await tx.emailBroadcast.update({where:{id:c.id},data:{cancelledAt:c.cancelledAt??new Date()}});
      }else if(c.cancelledAt)throw new ApiError(409,'Broadcast was cancelled.');
      else if(input.action==='confirm'){
        if(c.confirmedAt)return {confirmed:true,duplicate:true};
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('broadcast-confirm'))`;
        if(await tx.emailBroadcast.count({where:{confirmedAt:{gte:new Date(Date.now()-60000)}}}))throw new ApiError(429,'Wait one minute between broadcasts.');
        const recipients=await audience(tx,c);
        if(!recipients.rows.length || recipients.fingerprint!==input.fingerprint) throw new ApiError(409,'Recipients changed or none are eligible. Preview again.');
        await broadcastHtml(tx,c);
        for(let i=0;i<recipients.rows.length;i+=500)await tx.broadcastRecipient.createMany({data:recipients.rows.slice(i,i+500).map(r=>({broadcastId:c.id,userId:r.id,email:r.email}))});
        await tx.emailBroadcast.update({where:{id:c.id},data:{confirmedAt:new Date()}});
      }else if(input.action==='test'){
        if(!owner.emailVerifiedAt)throw new ApiError(409,'Verify your own email before requesting a test.');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'broadcast-test:'+owner.id}))`;
        if(await tx.emailOutbox.count({where:{eventKey:{startsWith:'broadcast-test:'+owner.id+':'},createdAt:{gte:new Date(Date.now()-60000)}}}))throw new ApiError(429,'Wait one minute between test messages.');
        await queueEmail(tx,'broadcast-test:'+owner.id+':'+crypto.randomUUID(),owner.email,'[Test] '+c.subject,await broadcastHtml(tx,c));
      }else {
        await tx.emailOutbox.updateMany({where:{broadcastRecipient:{broadcastId:c.id,suppressedAt:null},status:'FAILED',providerId:null,createdAt:{gt:new Date(Date.now()-23*3600000)},NOT:{lastError:{in:['Broadcast cancelled or recipient ineligible','Delivery acceptance requires review']}}},data:{status:'QUEUED',nextAttemptAt:new Date(),leaseUntil:null}});
      }
      await tx.auditLog.create({data:{actorUserId:owner.id,action:'BROADCAST_'+input.action.toUpperCase(),resourceType:'EmailBroadcast',resourceId:c.id}});
      return {saved:true};
    },{timeout:30000}));
  }catch(e){return handleError(e);}
}
