import { NextRequest } from 'next/server';
import { z } from 'zod';
import { applicationQuote } from '@/server/pricing';
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
      if (order?.totalCents !== null && order?.totalCents !== undefined) {
        if (order.pricingSnapshot && typeof order.pricingSnapshot === 'object' && 'items' in order.pricingSnapshot) return json(order.pricingSnapshot);
        const quote = await applicationQuote(application.package.slug, application.company.formationState, application.additionalServices);
        return json({ ...quote, serviceFeeCents: order.serviceFeeCents, governmentFeeCents: order.governmentFeeCents, additionalFeeCents: order.additionalFeeCents ?? 0, discountCents: order.discountCents ?? 0, currency: order.currency, totalCents: order.totalCents, referenceSubtotalCents: null, pendingItems: [], issues: [], items: order.items.map(({ description, amountCents }) => ({ description, amountCents: amountCents ?? 0 })) });
      }
    }
    return json(await applicationQuote(input.packageSlug, input.state, input.services));
  } catch (error) { return handleError(error); }
}
