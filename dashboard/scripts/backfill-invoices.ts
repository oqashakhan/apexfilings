import {loadEnvConfig} from '@next/env';
import {PrismaClient} from '@prisma/client';
loadEnvConfig(process.cwd());
const db=new PrismaClient();
async function main(){
 const apply=process.argv.includes('--apply'),reviewed=process.argv.includes('--review-legacy');
 if(reviewed&&!process.argv.includes('--acknowledge-current-details'))throw new Error('Historical review requires --acknowledge-current-details; current customer data must be checked against original records.');
 const orderId=process.argv.find(v=>v.startsWith('--order-id='))?.slice('--order-id='.length);
 const orders=await db.order.findMany({where:{...(orderId?{id:orderId}:{})},select:{id:true,invoice:{select:{id:true,lifecycle:true}},pricingSnapshot:true}});
 const candidates=orders.filter(o=>!o.invoice||['DRAFT',...(reviewed?['LEGACY']:[])].includes(o.invoice.lifecycle));
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',orders:orders.length,candidates:candidates.length,legacyReviewRequested:reviewed}));
 if(!apply)return;
 const ownerId=process.argv.find(v=>v.startsWith('--owner-id='))?.slice('--owner-id='.length);
 if(!ownerId||!await db.user.findFirst({where:{id:ownerId,role:'OWNER',status:'ACTIVE'}}))throw new Error('Supply an existing authorized --owner-id=... for the audit trail.');
 const {ensureInvoice}=await import('../src/server/invoices');
 let issued=0,draft=0,skipped=0;
 for(const order of candidates){const result=await db.$transaction(tx=>ensureInvoice(tx,order.id,{reviewed,actorId:ownerId,backfill:true}));if(result?.lifecycle==='ISSUED')issued++;else if(result?.lifecycle==='DRAFT')draft++;else skipped++;}
 console.log(JSON.stringify({issued,draft,skipped,existingNumbersAndPaymentsPreserved:true}));
}
main().catch(()=>{console.error('Invoice backfill failed. Check schema, Owner ID and historical-review flags. Inspect database errors securely; credentials are not printed.');process.exitCode=1;}).finally(()=>db.$disconnect());
