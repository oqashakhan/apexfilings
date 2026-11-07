import "server-only";
import Stripe from "stripe";
import { db } from "@/server/db";
import { ApiError } from "@/server/http";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";
import { stripeAppOrigin, stripeClient } from "@/server/stripe-config";

const stripeId = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id ?? null;

async function paidSession(sessionId: string, eventId: string) {
  const { stripe, mode } = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const checkout = await db.stripeCheckout.findFirst({ where: { OR: [{ sessionId }, { id: session.metadata?.checkoutId ?? "" }] }, include: { order: { include: { application: { include: { company: true, customer: { include: { notificationPreference: true } } } }, invoice: true } } } });
  if (!checkout || checkout.mode !== mode || checkout.orderId !== session.client_reference_id || session.metadata?.orderId !== checkout.orderId || session.livemode !== (mode === "live") || session.amount_total !== checkout.amountCents || session.currency?.toUpperCase() !== checkout.currency || checkout.order.totalCents !== checkout.amountCents) throw new ApiError(409, "Stripe payment and order do not match");
  if (session.payment_status !== "paid") return;
  const intentId = stripeId(session.payment_intent);
  if (!intentId) throw new ApiError(409, "Stripe payment reference is missing");
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  if (intent.status !== "succeeded" || intent.amount_received !== checkout.amountCents || intent.currency.toUpperCase() !== checkout.currency || intent.metadata.orderId !== checkout.orderId || stripeId(intent.customer) !== stripeId(session.customer)) throw new ApiError(409, "Stripe payment intent could not be validated");
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const invoiceId = stripeId(session.invoice);
  const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
  const origin = stripeAppOrigin();
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${checkout.orderId} FOR UPDATE`;
    const current = await tx.order.findUniqueOrThrow({ where: { id: checkout.orderId } });
    const existing = await tx.payment.findUnique({ where: { stripePaymentIntentId: intentId } });
    if (existing) {
      if (existing.orderId !== checkout.orderId || existing.amountCents !== checkout.amountCents) throw new ApiError(409, "Payment reference is associated with another order");
      return;
    }
    if (current.paymentStatus !== "UNPAID") throw new ApiError(409, "Order has another payment under review");
    const paidAt = new Date();
    const payment = await tx.payment.create({ data: { orderId: checkout.orderId, amountCents: checkout.amountCents, method: "STRIPE", reference: intentId, status: "VERIFIED", verifiedAt: paidAt, stripePaymentIntentId: intentId, stripeCheckoutSessionId: session.id, stripeReceiptUrl: charge?.receipt_url ?? null } });
    await tx.order.update({ where: { id: checkout.orderId }, data: { paymentStatus: "VERIFIED" } });
    await tx.stripeCheckout.update({ where: { id: checkout.id }, data: { sessionId: session.id, status: "PAID" } });
    if (checkout.order.application.status === "AWAITING_PAYMENT") {
      await tx.application.update({ where: { id: checkout.order.applicationId }, data: { status: "PAYMENT_RECEIVED" } });
      await tx.applicationStatusHistory.create({ data: { applicationId: checkout.order.applicationId, previousStatus: "AWAITING_PAYMENT", newStatus: "PAYMENT_RECEIVED", reason: "Stripe payment verified" } });
    }
    if (invoice?.status === "paid") {
      await tx.invoice.upsert({ where: { orderId: checkout.orderId }, create: { orderId: checkout.orderId, number: invoice.number ?? `AF-${checkout.orderId}`, issuedAt: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : paidAt, stripeInvoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url, invoicePdfUrl: invoice.invoice_pdf }, update: { number: invoice.number ?? checkout.order.invoice?.number ?? `AF-${checkout.orderId}`, stripeInvoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url, invoicePdfUrl: invoice.invoice_pdf } });
    }
    const customer = checkout.order.application.customer;
    await queueNotification(tx, `stripe-paid:${intentId}:client`, customer.id, "PAYMENT_UPDATE", "Payment confirmed", `Stripe confirmed payment for order ${checkout.orderId}.`, checkout.order.applicationId);
    if (customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `stripe-paid:${intentId}:client`, customer.email, "Payment confirmed — Apex Filings", emailHtml("Payment confirmed", [`Order reference: ${checkout.orderId}`, `Amount: ${(checkout.amountCents / 100).toFixed(2)} ${checkout.currency}`, "Your application is ready for the next internal review stage."], { label: "Track application", href: `${origin}/client/applications/${checkout.order.applicationId}` }));
    const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
    for (const owner of owners) await queueNotification(tx, `stripe-paid:${intentId}:owner:${owner.id}`, owner.id, "PAYMENT_UPDATE", "New payment received", `Stripe confirmed order ${checkout.orderId}.`, checkout.order.applicationId);
    if (process.env.ADMIN_NOTIFICATION_EMAIL) await queueEmail(tx, `stripe-paid:${intentId}:admin`, process.env.ADMIN_NOTIFICATION_EMAIL, "New payment received — Apex Filings", emailHtml("New payment received", [`Order reference: ${checkout.orderId}`, `Amount: ${(checkout.amountCents / 100).toFixed(2)} ${checkout.currency}`, "Review the application in the secure dashboard."], { label: "Review payment", href: `${origin}/admin/orders/${checkout.orderId}` }));
    await tx.auditLog.create({ data: { action: "STRIPE_PAYMENT_VERIFIED", resourceType: "Payment", resourceId: payment.id, safeMetadata: { orderId: checkout.orderId, eventId } } });
  });
}

async function failedSession(sessionId: string, type: string) {
  const checkout = await db.stripeCheckout.findUnique({ where: { sessionId }, include: { order: { include: { application: { include: { customer: { include: { notificationPreference: true } } } } } } } });
  if (!checkout || checkout.status === "PAID") return;
  await db.$transaction(async (tx) => {
    await tx.stripeCheckout.update({ where: { id: checkout.id }, data: { status: type === "checkout.session.expired" ? "EXPIRED" : "FAILED" } });
    const customer = checkout.order.application.customer;
    await queueNotification(tx, `stripe-checkout:${sessionId}:${type}`, customer.id, "PAYMENT_UPDATE", "Payment not completed", "Your order remains unpaid. You can retry checkout from your order page.", checkout.order.applicationId);
    if (customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `stripe-checkout:${sessionId}:${type}`, customer.email, "Payment not completed — Apex Filings", emailHtml("Payment not completed", [`Order reference: ${checkout.orderId}`, "Your order remains unpaid. You can retry from your dashboard."], { label: "View order", href: `${stripeAppOrigin()}/client/orders/${checkout.orderId}` }));
    if (type === "checkout.session.async_payment_failed") {
      const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
      for (const owner of owners) await queueNotification(tx, `stripe-checkout:${sessionId}:${type}:owner:${owner.id}`, owner.id, "PAYMENT_UPDATE", "Stripe payment failed", `Review order ${checkout.orderId}.`, checkout.order.applicationId);
    }
  });
}

async function refundEvent(refund: Stripe.Refund) {
  const request = await db.refundRequest.findFirst({ where: { OR: [{ stripeRefundId: refund.id }, { id: refund.metadata?.refundRequestId ?? "" }] }, include: { order: { include: { application: { include: { customer: { include: { notificationPreference: true } } } } } } } });
  if (!request) return;
  if (request.stripeRefundId && request.stripeRefundId !== refund.id) throw new ApiError(409, "Refund reference changed");
  if (request.stripeStatus === refund.status && (refund.status !== "succeeded" || request.status === "COMPLETED")) return;
  if (stripeId(refund.payment_intent) !== (await db.payment.findFirst({ where: { orderId: request.orderId, method: "STRIPE", status: "VERIFIED" }, select: { stripePaymentIntentId: true } }))?.stripePaymentIntentId || refund.amount !== request.amountCents) throw new ApiError(409, "Stripe refund and order do not match");
  await db.$transaction(async (tx) => {
    const updated = await tx.refundRequest.update({ where: { id: request.id }, data: { stripeRefundId: refund.id, stripeStatus: refund.status, ...(refund.status === "succeeded" ? { status: "COMPLETED" } : {}) } });
    if (refund.status === "succeeded") {
      const completed = await tx.refundRequest.aggregate({ where: { orderId: request.orderId, stripeStatus: "succeeded" }, _sum: { amountCents: true } });
      if (completed._sum.amountCents === request.order.totalCents) await tx.order.update({ where: { id: request.orderId }, data: { paymentStatus: "REFUNDED" } });
      await queueNotification(tx, `stripe-refund:${refund.id}:succeeded`, request.order.application.customerId, "PAYMENT_UPDATE", "Refund completed", `Stripe confirmed a refund for order ${request.orderId}.`, request.order.applicationId);
      const customer = request.order.application.customer;
      if (customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `stripe-refund:${refund.id}:succeeded`, customer.email, "Refund completed — Apex Filings", emailHtml("Refund completed", [`Order reference: ${request.orderId}`, `Amount: ${(refund.amount / 100).toFixed(2)} ${request.order.currency}`], { label: "View order", href: `${stripeAppOrigin()}/client/orders/${request.orderId}` }));
    } else if (refund.status === "failed") {
      await queueNotification(tx, `stripe-refund:${refund.id}:failed`, request.order.application.customerId, "PAYMENT_UPDATE", "Refund needs attention", `The refund for order ${request.orderId} could not be completed. Our team will review it.`, request.order.applicationId);
      const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
      for (const owner of owners) await queueNotification(tx, `stripe-refund:${refund.id}:failed:${owner.id}`, owner.id, "PAYMENT_UPDATE", "Stripe refund failed", `Review refund ${request.id} for order ${request.orderId}.`, request.order.applicationId);
    }
    await tx.auditLog.create({ data: { action: "STRIPE_REFUND_UPDATED", resourceType: "RefundRequest", resourceId: updated.id, safeMetadata: { status: refund.status } } });
  });
}

async function paidInvoice(invoiceId: string) {
  const { stripe, mode } = stripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const orderId = invoice.metadata?.orderId;
  if (!orderId) return;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { application: { include: { customer: { include: { notificationPreference: true } } } } } });
  if (!order || invoice.livemode !== (mode === "live") || invoice.status !== "paid" || invoice.amount_paid !== order.totalCents || invoice.currency.toUpperCase() !== order.currency || order.paymentStatus !== "VERIFIED") throw new ApiError(409, "Stripe invoice does not match a verified order");
  await db.$transaction(async (tx) => {
    await tx.invoice.upsert({ where: { orderId }, create: { orderId, number: invoice.number ?? `AF-${orderId}`, stripeInvoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url, invoicePdfUrl: invoice.invoice_pdf, issuedAt: new Date() }, update: { number: invoice.number ?? `AF-${orderId}`, stripeInvoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url, invoicePdfUrl: invoice.invoice_pdf } });
    if (!await tx.notification.findUnique({ where: { eventKey: `stripe-invoice:${invoice.id}` } })) {
      await queueNotification(tx, `stripe-invoice:${invoice.id}`, order.application.customerId, "PAYMENT_UPDATE", "Paid invoice available", `Your paid invoice for order ${orderId} is available.`, order.applicationId);
      if (order.application.customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `stripe-invoice:${invoice.id}`, order.application.customer.email, "Your paid invoice is available — Apex Filings", emailHtml("Paid invoice available", [`Order reference: ${orderId}`, "Sign in to view or download your paid invoice."], { label: "View order", href: `${stripeAppOrigin()}/client/orders/${orderId}` }));
    }
  });
}

export async function processStripeEvent(event: Stripe.Event) {
  const mode = stripeClient().mode;
  if (event.livemode !== (mode === "live") || event.account) throw new ApiError(409, "Unexpected Stripe account or mode");
  const prior = await db.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (prior?.processedAt) return;
  if (!prior) await db.stripeWebhookEvent.create({ data: { id: event.id, type: event.type, livemode: event.livemode } });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await paidSession((event.data.object as Stripe.Checkout.Session).id, event.id);
  else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") await failedSession((event.data.object as Stripe.Checkout.Session).id, event.type);
  else if (event.type === "refund.updated" || event.type === "refund.failed") await refundEvent(event.data.object as Stripe.Refund);
  else if (event.type === "invoice.paid") await paidInvoice((event.data.object as Stripe.Invoice).id);
  else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const intentId = stripeId(dispute.payment_intent);
    if (intentId) {
      const payment = await db.payment.findUnique({ where: { stripePaymentIntentId: intentId }, include: { order: { include: { application: { include: { customer: { include: { notificationPreference: true } } } } } } } });
      if (payment) await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${payment.orderId} FOR UPDATE`;
        const currentOrder = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        const disputed = event.type === "charge.dispute.created" || dispute.status === "lost";
        const nextStatus = disputed ? "DISPUTED" : dispute.status === "won" ? "VERIFIED" : null;
        await tx.payment.update({ where: { id: payment.id }, data: { stripeDisputeStatus: dispute.status, ...(nextStatus && payment.status !== "REFUNDED" ? { status: nextStatus } : {}) } });
        if (nextStatus && ["VERIFIED", "DISPUTED"].includes(currentOrder.paymentStatus)) await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: nextStatus } });
        const customer = payment.order.application.customer;
        const customerTitle = disputed ? "Payment under review" : "Payment dispute resolved";
        const customerMessage = disputed ? `A payment dispute affects order ${payment.orderId}. Please contact support if you need assistance.` : `The payment dispute for order ${payment.orderId} is resolved. Open your order for the current status.`;
        await queueNotification(tx, `stripe-dispute:${dispute.id}:${event.type}:client`, customer.id, "PAYMENT_UPDATE", customerTitle, customerMessage, payment.order.applicationId);
        if (customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `stripe-dispute:${dispute.id}:${event.type}:client`, customer.email, `${customerTitle} — Apex Filings`, emailHtml(customerTitle, [customerMessage], { label: "View order", href: `${stripeAppOrigin()}/client/orders/${payment.orderId}` }));
        const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
        for (const owner of owners) await queueNotification(tx, `stripe-dispute:${dispute.id}:${event.type}:${owner.id}`, owner.id, "PAYMENT_UPDATE", "Payment dispute update", `Review dispute for order ${payment.orderId} in Stripe.`, payment.order.applicationId);
        await tx.auditLog.create({ data: { action: "STRIPE_DISPUTE_UPDATED", resourceType: "Payment", resourceId: payment.id, safeMetadata: { status: dispute.status } } });
      });
    }
  }
  await db.stripeWebhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
}

export async function reconcileStripeOrder(orderId: string) {
  const checkout = await db.stripeCheckout.findUnique({ where: { orderId } });
  if (!checkout?.sessionId) throw new ApiError(404, "Stripe checkout not found");
  await paidSession(checkout.sessionId, `reconcile:${checkout.sessionId}`);
  const refunds = await db.refundRequest.findMany({ where: { orderId, stripeRefundId: { not: null } }, select: { stripeRefundId: true } });
  const { stripe } = stripeClient();
  for (const refund of refunds) await refundEvent(await stripe.refunds.retrieve(refund.stripeRefundId!));
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { paymentStatus: true } });
  return { paymentStatus: order.paymentStatus, refundCount: refunds.length };
}
