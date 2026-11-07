import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { db } from "@/server/db";
import { reconcileStripeOrder } from "@/server/stripe-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const owner = await requireRole(request, "OWNER");
    const { orderId } = z.object({ orderId: z.string().min(1).max(100) }).parse(await body(request));
    if (!await db.order.findUnique({ where: { id: orderId }, select: { id: true } })) throw new ApiError(404, "Order not found");
    const result = await reconcileStripeOrder(orderId);
    await db.auditLog.create({ data: { actorUserId: owner.id, action: "STRIPE_ORDER_RECONCILED", resourceType: "Order", resourceId: orderId, safeMetadata: result } });
    return json(result);
  } catch (error) { return handleError(error); }
}
