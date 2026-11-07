import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { stripeClient } from "@/server/stripe-config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const owner = await requireRole(request, "OWNER");
    const input = z.object({ refundRequestId: z.string().min(1), amountCents: z.number().int().positive() }).parse(await body(request));
    const { stripe, mode } = stripeClient();
    const claim = await db.$transaction(async (tx) => {
      const refund = await tx.refundRequest.findUnique({ where: { id: input.refundRequestId }, include: { order: { include: { stripeCheckout: true, payments: true } } } });
      if (!refund || refund.status !== "APPROVED" || !refund.reviewedById || refund.stripeStatus === "failed" || refund.order.paymentStatus !== "VERIFIED" || refund.order.stripeCheckout?.mode !== mode) throw new ApiError(409, "Refund is not available for Stripe processing");
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${refund.orderId} FOR UPDATE`;
      const payment = refund.order.payments.find((item) => item.method === "STRIPE" && item.status === "VERIFIED" && item.stripePaymentIntentId);
      if (!payment || payment.amountCents === null) throw new ApiError(409, "No verified Stripe payment is available");
      if (payment.stripeDisputeStatus && !["won", "lost"].includes(payment.stripeDisputeStatus)) throw new ApiError(409, "Resolve the Stripe dispute before issuing a refund");
      if (refund.amountCents !== null && refund.amountCents !== input.amountCents) throw new ApiError(409, "Refund amount is already locked");
      const committed = await tx.refundRequest.aggregate({ where: { orderId: refund.orderId, id: { not: refund.id }, stripeStatus: { not: "failed" }, amountCents: { not: null }, status: { in: ["APPROVED", "COMPLETED"] } }, _sum: { amountCents: true } });
      if (input.amountCents > payment.amountCents - (committed._sum.amountCents ?? 0)) throw new ApiError(409, "Refund exceeds the remaining paid amount");
      await tx.refundRequest.update({ where: { id: refund.id }, data: { amountCents: input.amountCents, stripeStatus: refund.stripeStatus ?? "initiating", initiatedById: owner.id } });
      return { refundId: refund.id, orderId: refund.orderId, paymentIntentId: payment.stripePaymentIntentId!, amountCents: input.amountCents };
    });
    const result = await stripe.refunds.create({ payment_intent: claim.paymentIntentId, amount: claim.amountCents, metadata: { refundRequestId: claim.refundId, orderId: claim.orderId } }, { idempotencyKey: `apex-refund-${mode}-${claim.refundId}` });
    if (result.payment_intent !== claim.paymentIntentId || result.amount !== claim.amountCents) throw new ApiError(502, "Stripe refund response could not be validated");
    await db.$transaction(async (tx) => {
      const current = await tx.refundRequest.findUniqueOrThrow({ where: { id: claim.refundId } });
      if (current.stripeRefundId && current.stripeRefundId !== result.id) throw new ApiError(409, "Refund reference changed");
      await tx.refundRequest.update({ where: { id: claim.refundId }, data: { stripeRefundId: result.id, ...(!current.stripeStatus || current.stripeStatus === "initiating" ? { stripeStatus: result.status } : {}) } });
      await tx.auditLog.create({ data: { actorUserId: owner.id, action: "STRIPE_REFUND_INITIATED", resourceType: "RefundRequest", resourceId: claim.refundId, safeMetadata: { amountCents: claim.amountCents, stripeRefundId: result.id } } });
    });
    return json({ status: result.status, refundRequestId: claim.refundId });
  } catch (error) { return handleError(error); }
}
