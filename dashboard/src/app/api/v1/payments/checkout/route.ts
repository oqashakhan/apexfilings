import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { checkoutAmounts, stripeAppOrigin, stripeClient } from "@/server/stripe-config";
import { z } from "zod";
import {ensureInvoice} from '@/server/invoices';

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "CLIENT");
    const mode = process.env.STRIPE_PAYMENT_MODE || "test";
    const available = (mode === "test" && process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) || (mode === "live" && process.env.STRIPE_LIVE_PAYMENTS_ENABLED === "true" && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"));
    return json({ available: Boolean(available), mode });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "CLIENT");
    const { orderId } = z.object({ orderId: z.string().min(1).max(100) }).parse(await body(request));
    const { stripe, mode } = stripeClient();
    const origin = stripeAppOrigin();
    const order = await db.order.findFirst({ where: { id: orderId, application: { customerId: user.id } }, include: { application: { include: { company: true, package: true } }, stripeCheckout: true } });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.status !== "OPEN" || order.paymentStatus !== "UNPAID" || order.application.status !== "AWAITING_PAYMENT") throw new ApiError(409, "This order is not available for checkout");
    const lineItems = checkoutAmounts(order, order.application.package.name);
    if (order.stripeCheckout && (order.stripeCheckout.mode !== mode || order.stripeCheckout.amountCents !== order.totalCents || order.stripeCheckout.currency !== order.currency)) throw new ApiError(409, "Checkout amount changed; contact support");
    let customer = await db.stripeCustomer.findUnique({ where: { userId_mode: { userId: user.id, mode } } });
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, name: user.fullName, metadata: { userId: user.id } }, { idempotencyKey: `apex-customer-${mode}-${user.id}` });
      customer = await db.stripeCustomer.upsert({ where: { userId_mode: { userId: user.id, mode } }, create: { userId: user.id, mode, stripeCustomerId: created.id }, update: {} });
    }
    let checkout = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (current.paymentStatus !== "UNPAID" || current.totalCents !== order.totalCents || current.updatedAt.getTime() !== order.updatedAt.getTime()) throw new ApiError(409, "Order changed; refresh and retry checkout");
      await ensureInvoice(tx,orderId);
      return tx.stripeCheckout.upsert({ where: { orderId }, create: { orderId, mode, amountCents: order.totalCents!, currency: order.currency, idempotencyKey: randomUUID() }, update: {} });
    });
    if (checkout.sessionId) {
      const previous = await stripe.checkout.sessions.retrieve(checkout.sessionId);
      if (checkout.status === "OPEN" && previous.status === "open" && previous.url) return json({ url: previous.url });
      if (previous.payment_status === "paid" || (previous.status === "complete" && checkout.status !== "FAILED")) throw new ApiError(409, "Payment is processing; refresh your order shortly");
      checkout = await db.stripeCheckout.update({ where: { orderId }, data: { sessionId: null, idempotencyKey: randomUUID(), status: "CREATING", expiresAt: null } });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment", customer: customer.stripeCustomerId, client_reference_id: order.id,
      line_items: lineItems, invoice_creation: { enabled: true, invoice_data: { metadata: { orderId: order.id } } },
      payment_intent_data: { metadata: { orderId: order.id } },
      metadata: { orderId: order.id, checkoutId: checkout.id },
      success_url: `${origin}/client/orders/${order.id}?checkout=success`,
      cancel_url: `${origin}/client/orders/${order.id}?checkout=cancel`,
    }, { idempotencyKey: checkout.idempotencyKey });
    if (!session.url || session.amount_total !== order.totalCents || session.currency?.toUpperCase() !== order.currency || session.livemode !== (mode === "live")) throw new ApiError(502, "Stripe checkout could not be validated");
    await db.stripeCheckout.update({ where: { id: checkout.id }, data: { sessionId: session.id, expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null, status: "OPEN" } });
    return json({ url: session.url });
  } catch (error) { return handleError(error); }
}
