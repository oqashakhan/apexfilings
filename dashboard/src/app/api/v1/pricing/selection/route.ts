import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { ApiError, body, checkOrigin, handleError, json, requireRole } from '@/server/http';
export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request); const user = await requireRole(request, 'CLIENT');
    const input = z.object({ applicationId: z.string().max(100), packageSlug: z.enum(['basic','premium']), state: z.string().max(100), services: z.array(z.string().max(120)).max(20) }).parse(await body(request));
    await db.$transaction(async tx => {
      const app = await tx.application.findFirst({ where: { id: input.applicationId, customerId: user.id } });
      if (!app) throw new ApiError(404, 'Application not found');
      const [pack, state] = await Promise.all([tx.package.findUnique({ where: { slug: input.packageSlug } }), tx.stateFilingFee.findFirst({ where: { state: input.state } })]);
      if (!pack?.available || !state) throw new ApiError(409, 'State or package unavailable');
      const claimed = await tx.application.updateMany({ where: { id: app.id, status: 'DRAFT' }, data: { packageId: pack.id, additionalServices: [...new Set(input.services)].filter(slug => !pack.includedServiceSlugs.includes(slug)) } });
      if (!claimed.count) throw new ApiError(409, 'Submitted applications retain their price snapshot');
      await tx.company.update({ where: { id: app.companyId }, data: { formationState: state.state } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: 'DRAFT_PRICING_UPDATED', resourceType: 'Application', resourceId: app.id } });
    });
    return json({ saved: true });
  } catch (e) { return handleError(e); }
}
