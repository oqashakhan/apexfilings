import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma,type EmailBroadcast } from '@prisma/client';
import { db } from './db';
import { invoiceSettings } from './invoices';
import { emailHtml,queueEmail } from './mail';
import { ApiError } from './http';

type Tx=Prisma.TransactionClient;
type Audience=Pick<EmailBroadcast,'category'|'audience'|'selectedIds'>;
export function eligibility(c:Audience,onlyUser?:string) {
  const hasApplication=Prisma.sql`EXISTS(SELECT 1 FROM "Application" a WHERE a."customerId"=u.id)`;
  return Prisma.sql`SELECT u.id,u."emailNormalized" AS email FROM "User" u
    WHERE u.role='CLIENT' AND u.status='ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
    AND lower(trim(u.email))=u."emailNormalized" AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    AND NOT EXISTS(SELECT 1 FROM "BroadcastSuppression" s WHERE s.email=u."emailNormalized")
    AND NOT EXISTS(SELECT 1 FROM "EmailOutbox" o WHERE lower(o."toEmail")=u."emailNormalized" AND o."lastError" IN ('Resend reported email.bounced','Resend reported email.complained','Resend reported email.suppressed'))
    ${onlyUser?Prisma.sql`AND u.id=${onlyUser}`:Prisma.empty}
    ${c.audience==='SELECTED'?(c.selectedIds.length?Prisma.sql`AND u.id IN (${Prisma.join(c.selectedIds)})`:Prisma.sql`AND FALSE`):Prisma.empty}
    ${c.audience==='APPLICATIONS'||c.category==='SERVICE'?Prisma.sql`AND ${hasApplication}`:Prisma.empty}
    ${c.category==='MARKETING'?Prisma.sql`AND u."marketingEmailConsent"=u."emailNormalized" AND u."marketingConsentAt" IS NOT NULL`:Prisma.sql`AND NOT EXISTS(SELECT 1 FROM "NotificationPreference" p WHERE p."userId"=u.id AND NOT p."applicationEmail")`}`;
}
export async function audience(tx:Tx,c:Audience) {
  const rows=await tx.$queryRaw<{id:string;email:string}[]>(Prisma.sql`${eligibility(c)} ORDER BY u.id`);
  const fingerprint=createHash('sha256').update(JSON.stringify([c.category,c.audience,c.selectedIds,'subject' in c ? c.subject : null,'message' in c ? c.message : null,rows])).digest('hex');
  return {rows,fingerprint};
}
export async function broadcastHtml(tx:Tx,c:Pick<EmailBroadcast,'category'|'subject'|'message'>,token?:string) {
  const lines=c.message.split(/\r?\n/).filter(Boolean);
  if(c.category==='MARKETING'){
    const {record,data}=await invoiceSettings(tx);
    if(!record?.approvedAt||!data.legalName||!data.address) throw new ApiError(409,'Approve the business sender name and postal address in invoice settings before a marketing broadcast.');
    lines.push(data.legalName,data.address);
  }
  const link=c.category==='MARKETING'?{label:'Unsubscribe from announcements',href:token?process.env.APP_ORIGIN+'/unsubscribe?token='+encodeURIComponent(token):process.env.APP_ORIGIN+'/client/settings'}:{label:'Open dashboard',href:process.env.APP_ORIGIN+'/client/dashboard'};
  return emailHtml(c.subject,lines,link);
}
export async function queueBroadcastBatch(limit=5) {
  return db.$transaction(async tx=>{
    const items=await tx.$queryRaw<{id:string}[]>`SELECT r.id FROM "BroadcastRecipient" r JOIN "EmailBroadcast" c ON c.id=r."broadcastId" WHERE c."confirmedAt" IS NOT NULL AND c."cancelledAt" IS NULL AND r."outboxId" IS NULL AND r."suppressedAt" IS NULL ORDER BY c."createdAt",r.id LIMIT ${limit} FOR UPDATE OF r SKIP LOCKED`;
    for(const {id} of items) {
      const r=await tx.broadcastRecipient.findUniqueOrThrow({where:{id},include:{broadcast:true}});
      const [eligible]=await tx.$queryRaw<{email:string}[]>(eligibility(r.broadcast,r.userId));
      if(eligible?.email!==r.email){await tx.broadcastRecipient.update({where:{id},data:{suppressedAt:new Date()}});continue;}
      let html:string;
      try {html=await broadcastHtml(tx,r.broadcast,r.unsubscribeToken);} catch(e){if(!(e instanceof ApiError))throw e;await tx.broadcastRecipient.update({where:{id},data:{suppressedAt:new Date()}});continue;}
      const mail=await queueEmail(tx,'broadcast:'+id,r.email,r.broadcast.subject,html);
      await tx.broadcastRecipient.update({where:{id},data:{outboxId:mail.id}});
    }
    return items.length;
  });
}
export async function mayDispatchBroadcast(outboxId:string) {
  const r=await db.broadcastRecipient.findUnique({where:{outboxId},include:{broadcast:true}});
  if(!r || r.suppressedAt || r.broadcast.cancelledAt) return false;
  const [current]=await db.$queryRaw<{email:string}[]>(eligibility(r.broadcast,r.userId));
  return current?.email===r.email;
}
