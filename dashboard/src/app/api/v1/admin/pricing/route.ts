import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { validateStateFeeApproval } from '@/lib/state-fee-approval';
import { z } from 'zod';
import { db } from '@/server/db';
import { pricingCatalog } from '@/server/pricing';
import { ApiError, body, checkOrigin, handleError, json, requireRole } from '@/server/http';
const cents = z.number().int().min(0).max(10000000);
const editSchema = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('state'), id: z.string(), data: z.object({ filingFeeCents: cents.nullable(), recurringFeeDescription: z.string().max(500).nullable(), recurringFeePeriod: z.string().max(100).nullable(), processingTime: z.string().max(300).nullable(), sourceReference: z.string().max(1000).nullable(), active: z.boolean(), verifiedAt: z.iso.datetime().nullable(), verificationConfirmed: z.boolean().optional(), referenceDifferenceConfirmed: z.boolean().optional() }) }),
      z.object({ kind: z.literal('service'), id: z.string(), data: z.object({ name: z.string().min(2).max(160), description: z.string().max(3000), priceCents: cents.nullable(), currency: z.literal('USD'), priceApproved: z.boolean(), available: z.boolean(), category: z.string().trim().min(1).max(100).optional(), availableStateCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(51).optional(), displayOrder: z.number().int().min(0).max(10000).optional(), automaticCharge: z.boolean().optional(), requiredCharge: z.boolean().optional() }) }),
      z.object({ kind: z.literal('package'), id: z.string(), data: z.object({ name: z.string().min(2).max(160), serviceFeeCents: cents, description: z.string().max(3000).optional(), available: z.boolean(), includedServices: z.array(z.string().min(1).max(200)).max(40), includedServiceSlugs: z.array(z.string().max(120)).max(40) }) }),
    ]);

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'OWNER');
    const [catalog, drafts, published] = await Promise.all([
      pricingCatalog(), db.pricingDraft.findMany(),
      db.auditLog.findMany({ where: { action: 'PRICING_PUBLISHED' }, distinct: ['resourceType','resourceId'], orderBy: { createdAt: 'desc' }, select: { resourceType:true,resourceId:true,createdAt:true,actor:{select:{fullName:true}} } })
    ]);
    return json({...catalog,drafts,published});
  } catch (e) { return handleError(e); }
}

export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    const owner = await requireRole(request, 'OWNER');
    const raw = await body(request);
    const command = z.object({kind:z.enum(['state','service','package']),id:z.string().min(1).max(120),mode:z.enum(['draft','publish','discard','direct']).default('direct'),version:z.string().nullable().optional()}).parse(raw);
    const {kind, id, mode, version} = command;
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'pricing:'+kind+':'+id}))`;
      const where = {kind_recordId:{kind,recordId:id}};
      const draft = await tx.pricingDraft.findUnique({where});
      if (mode !== 'direct' && (draft?.version ?? null) !== (version ?? null)) throw new ApiError(409,'This draft changed. Reload and review it.');
      if (mode === 'discard') {
        if (draft) await tx.pricingDraft.delete({where});
        return {discarded:true};
      }
      if (mode === 'publish' && !draft) throw new ApiError(409,'Save the draft before publishing.');
      const input = editSchema.parse(mode === 'publish' ? {kind,id,data:draft!.data} : raw);
      const before = kind === 'state' ? await tx.stateFilingFee.findUnique({where:{code:id}}) : kind === 'service' ? await tx.service.findUnique({where:{id}}) : await tx.package.findUnique({where:{id}});
      const newCharge = !before && input.kind === 'service' && input.data.automaticCharge && id.startsWith('charge-');
      if (!before && !newCharge) throw new ApiError(404,'Pricing record not found.');
      if (mode === 'publish' && draft?.baseUpdatedAt?.getTime() !== before?.updatedAt.getTime()) throw new ApiError(409,'Published pricing changed. Discard the stale draft and review the current record.');
      if (input.kind === 'service' && input.data.availableStateCodes?.length) {
        const codes = [...new Set(input.data.availableStateCodes)];
        if (await tx.stateFilingFee.count({ where: { code: { in: codes } } }) !== codes.length) throw new ApiError(400,'Choose supported formation states');
      }
      if (mode === 'draft') {
        const fields = {data:input.data,version:randomUUID()};
        await tx.pricingDraft.upsert({where,create:{kind,recordId:id,...fields,baseUpdatedAt:before?.updatedAt},update:fields});
        return {saved:true,version:fields.version};
      }
      if (input.kind === 'state') {
        const {verificationConfirmed,referenceDifferenceConfirmed,...data} = input.data;
        const reference = before && 'referenceFilingFeeCents' in before ? before.referenceFilingFeeCents : null;
        if(data.active) {
          const error = validateStateFeeApproval(input.data,reference);
          if(error) throw new ApiError(400,error);
        }
        await tx.stateFilingFee.update({where:{code:id},data:{...data,verifiedAt:data.verifiedAt ? new Date(data.verifiedAt) : null}});
        await tx.auditLog.create({data:{actorUserId:owner.id,action:data.active?'STATE_FEE_APPROVED':'STATE_FEE_DISABLED',resourceType:'StateFilingFee',resourceId:id,safeMetadata:{previousFeeCents:before && 'filingFeeCents' in before ? before.filingFeeCents : null,approvedFeeCents:data.filingFeeCents,verificationConfirmed:!!verificationConfirmed,referenceDifferenceConfirmed:!!referenceDifferenceConfirmed}}});
      }
      if (input.kind === 'package') await tx.package.update({where:{id},data:input.data});
      if (input.kind === 'service') {
        if(input.data.priceApproved && input.data.priceCents === null) throw new ApiError(400,'Enter the approved price.');
        if(newCharge) await tx.service.create({data:{...input.data,id,slug:id,category:input.data.category ?? 'Third-party fees'}});
        else await tx.service.update({where:{id},data:input.data});
      }
      const oldPriceCents = !before ? null : 'priceCents' in before ? before.priceCents : 'serviceFeeCents' in before ? before.serviceFeeCents : before.filingFeeCents;
      const newPriceCents = input.kind === 'package' ? input.data.serviceFeeCents : input.kind === 'service' ? input.data.priceCents : input.data.filingFeeCents;
      await tx.auditLog.create({data:{actorUserId:owner.id,action:'PRICING_PUBLISHED',resourceType:kind,resourceId:id,safeMetadata:{oldPriceCents,newPriceCents,fields:Object.keys(input.data)}}});
      if(mode === 'publish') await tx.pricingDraft.delete({where});
      return {saved:true};
    });
    return json(result);
  } catch(e) {return handleError(e);}
}
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request); const owner = await requireRole(request, 'OWNER');
    const data = z.object({ name: z.string().trim().min(2).max(160), description: z.string().max(3000).default(''), priceCents: cents.nullable(), currency: z.literal('USD'), priceApproved: z.boolean(), available: z.boolean(), requiredCharge: z.boolean(), category: z.string().trim().min(1).max(100), availableStateCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(51), displayOrder: z.number().int().min(0).max(10000) }).parse(await body(request));
    if (data.priceApproved && data.priceCents === null) throw new ApiError(400, 'An approved fee requires a price');
    const fee = await db.$transaction(async tx => {
      const codes = [...new Set(data.availableStateCodes)];
      if (await tx.stateFilingFee.count({ where: { code: { in: codes } } }) !== codes.length) throw new ApiError(400, 'Choose supported formation states');
      const created = await tx.service.create({ data: { ...data, automaticCharge: true, slug: `charge-${randomUUID()}` } });
      await tx.auditLog.create({ data: { actorUserId: owner.id, action: 'THIRD_PARTY_FEE_CREATED', resourceType: 'Service', resourceId: created.id } });
      return created;
    });
    return json({ id: fee.id }, 201);
  } catch (error) { return handleError(error); }
}
