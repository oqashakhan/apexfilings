import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/server/db';
import { pricingCatalog } from '@/server/pricing';
import { ApiError, body, checkOrigin, handleError, json, requireRole } from '@/server/http';
export async function GET(request: NextRequest) {
  try { await requireRole(request, 'OWNER'); return json(await pricingCatalog()); } catch (e) { return handleError(e); }
}
const cents = z.number().int().min(0).max(10000000);
export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request); const owner = await requireRole(request, 'OWNER');
    const input = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('state'), id: z.string(), data: z.object({ filingFeeCents: cents.nullable(), recurringFeeDescription: z.string().max(500).nullable(), recurringFeePeriod: z.string().max(100).nullable(), processingTime: z.string().max(300).nullable(), sourceReference: z.string().max(1000).nullable(), active: z.boolean(), verifiedAt: z.iso.datetime().nullable() }) }),
      z.object({ kind: z.literal('service'), id: z.string(), data: z.object({ name: z.string().min(2).max(160), description: z.string().max(3000), priceCents: cents.nullable(), currency: z.literal('USD'), priceApproved: z.boolean(), available: z.boolean(), category: z.string().trim().min(1).max(100).optional(), availableStateCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(51).optional(), displayOrder: z.number().int().min(0).max(10000).optional(), automaticCharge: z.boolean().optional(), requiredCharge: z.boolean().optional() }) }),
      z.object({ kind: z.literal('package'), id: z.string(), data: z.object({ name: z.string().min(2).max(160), serviceFeeCents: cents, available: z.boolean(), includedServices: z.array(z.string().min(1).max(200)).max(40), includedServiceSlugs: z.array(z.string().max(120)).max(40) }) }),
    ]).parse(await body(request));
    if (input.kind === 'state' && input.data.active && (input.data.filingFeeCents === null || !input.data.verifiedAt || !input.data.sourceReference || !/^https:\/\//.test(input.data.sourceReference))) throw new ApiError(400, 'An approved state fee requires a fee, verification date, and official HTTPS source.');
    if (input.kind === 'service' && input.data.priceApproved && input.data.priceCents === null) throw new ApiError(400, 'Enter an approved service price first.');
    await db.$transaction(async tx => {
      if (input.kind === 'service' && input.data.availableStateCodes?.length) {
        const codes = [...new Set(input.data.availableStateCodes)];
        if (await tx.stateFilingFee.count({ where: { code: { in: codes } } }) !== codes.length) throw new ApiError(400, 'Choose supported formation states');
      }
      if (input.kind === 'state') await tx.stateFilingFee.update({ where: { code: input.id }, data: { ...input.data, verifiedAt: input.data.verifiedAt ? new Date(input.data.verifiedAt) : null } });
      if (input.kind === 'service') await tx.service.update({ where: { id: input.id }, data: input.data });
      if (input.kind === 'package') await tx.package.update({ where: { id: input.id }, data: input.data });
      await tx.auditLog.create({ data: { actorUserId: owner.id, action: 'PRICING_PUBLISHED', resourceType: input.kind, resourceId: input.id, safeMetadata: { fields: Object.keys(input.data) } } });
    });
    return json({ saved: true });
  } catch (e) { return handleError(e); }
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
