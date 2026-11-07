import { NextRequest } from 'next/server';
import { z } from 'zod';
import { resolveOrderQuote } from '@/lib/pricing';
import { applicationQuote, pricingCatalog } from '@/server/pricing';
import { ApiError, body, checkOrigin, handleError, json, requireRole } from '@/server/http';
import { db } from '@/server/db';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request); const user = await requireRole(request, 'CLIENT');
    const input = z.object({ applicationId: z.string().min(1).max(100).optional(), packageSlug: z.string().max(100), state: z.string().max(100), services: z.array(z.string().max(120)).max(20) }).parse(await body(request));
    if (input.applicationId) {
      const application = await db.application.findFirst({ where: { id: input.applicationId, customerId: user.id }, include: { order: { include: { items: true } }, package: true, company: true } });
      if (!application) throw new ApiError(404, 'Application not found');
      const order = application.order;
      if (order) {
        return json(resolveOrderQuote(await pricingCatalog(), order, application));
      }
    }
    return json(await applicationQuote(input.packageSlug, input.state, input.services));
  } catch (error) { return handleError(error); }
}
