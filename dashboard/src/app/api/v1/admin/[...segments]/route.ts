import { NextRequest } from "next/server";
import { ApplicationStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { approvalChecks, canTransition, statusNames } from "@/server/workflow";
import { statusInput } from "@/server/validation";
import { adminSnapshot } from "@/server/admin-snapshot";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";
type Params = { params: Promise<{ segments: string[] }> };
const pageNumber = (value: string | null, fallback: number, limit: number) => Math.max(1, Math.min(limit, Number(value) || fallback));

async function application(id: string) {
  const found = await db.application.findUnique({ where: { id }, include: { customer: { select: { id: true, fullName: true, email: true, phone: true } }, company: { include: { owners: true } }, service: true, package: true, documents: { include: { reviewedBy: { select: { fullName: true } } } }, order: { include: { payments: true, refunds: true } }, statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { fullName: true } } } }, customerResponses: { orderBy: { createdAt: "desc" } }, notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { fullName: true } } } }, reviews: true } });
  if (!found) throw new ApiError(404, "Application not found");
  return found;
}

async function approvalReady(id: string) {
  const item = await application(id);
  const checks = new Set(item.reviews.map((review) => review.checkKey));
  const requiredDocuments = await db.serviceDocumentRequirement.findMany({ where: { serviceId: item.serviceId, required: true, OR: [{ stateCode: null }, { stateCode: item.company.formationState }] } });
  const docsReady = requiredDocuments.every((requirement) => requirement.documentType === "OWNER_ID"
    ? item.company.owners.every((owner) => item.documents.some((doc) => doc.documentType === requirement.documentType && doc.ownerId === owner.id && doc.reviewStatus === "ACCEPTED"))
    : item.documents.some((doc) => doc.documentType === requirement.documentType && doc.reviewStatus === "ACCEPTED"));
  return item.customerConfirmedAt != null && item.order?.paymentStatus === "VERIFIED" && docsReady && approvalChecks.every((check) => checks.has(check));
}

async function statusChange(id: string, userId: string, next: ApplicationStatus, reason: string) {
  const existing = await application(id);
  if (!canTransition(existing.status, next)) throw new ApiError(409, "Status transition is not allowed");
  if (next === "PAYMENT_RECEIVED") throw new ApiError(409, "Payment status changes only after verified payment");
  if (next === "APPROVED_FOR_FILING" && !(await approvalReady(id))) throw new ApiError(409, "Review, documents, confirmation, and verified payment are required");
  if (next === "COMPLETED" && !existing.documents.some((doc) => doc.reviewStatus === "COMPLETED_COMPANY_DOCUMENT")) throw new ApiError(409, "Upload completed company documents first");
  await db.$transaction(async (tx) => {
    const changed = await tx.application.updateMany({ where: { id, status: existing.status }, data: { status: next, ...(next === "APPROVED_FOR_FILING" ? { approvedForFilingAt: new Date(), internalReviewStatus: "APPROVED" } : {}), ...(next === "SUBMITTED_TO_AUTHORITY" ? { authorityFilingStatus: "SUBMITTED" } : {}), ...(next === "COMPLETED" ? { completedAt: new Date(), authorityFilingStatus: "COMPLETED" } : {}) } });
    if (changed.count !== 1) throw new ApiError(409, "Application changed; refresh and try again");
    const event = await tx.applicationStatusHistory.create({ data: { applicationId: id, previousStatus: existing.status, newStatus: next, changedById: userId, reason } });
    await queueNotification(tx, `status:${event.id}`, existing.customerId, "STATUS_UPDATED", "Application status updated", `Your application is now ${statusNames[next]}.`, id);
    const preference = await tx.notificationPreference.findUnique({ where: { userId: existing.customerId } });
    if (preference?.applicationEmail !== false) await queueEmail(tx, `status:${event.id}`, existing.customer.email, `LLC application update — ${statusNames[next]} — Apex Filings`, emailHtml("Application status updated", [`Company: ${existing.company.preferredName}`, `Application reference: ${id}`, `Current status: ${statusNames[next]}`, next === "APPROVED_FOR_FILING" ? "Approved for filing means internal review is complete. It is not government approval." : "Sign in to see details and any action required."], { label: "View application", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/applications/${id}` }));
    await tx.auditLog.create({ data: { actorUserId: userId, action: "APPLICATION_STATUS_CHANGED", resourceType: "Application", resourceId: id, safeMetadata: { previous: existing.status, next } } });
  });
  return application(id);
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const owner = await requireRole(request, "OWNER");
    const [resource, id] = (await context.params).segments;
    const url = new URL(request.url);
    const page = pageNumber(url.searchParams.get("page"), 1, 10000);
    const take = pageNumber(url.searchParams.get("pageSize"), 20, 100);
    if (resource === "snapshot") return json(await adminSnapshot(owner.id));
    if (resource === "dashboard") {
      const [total, pending, requiringAction, verifiedPayments, recentApplications, audit, documentCount, paymentCount] = await Promise.all([
        db.application.count(), db.application.count({ where: { status: "UNDER_REVIEW" } }),
        db.application.count({ where: { status: { in: ["INFORMATION_REQUIRED", "ADDITIONAL_ACTION_REQUIRED", "AWAITING_PAYMENT"] } } }),
        db.payment.aggregate({ where: { status: "VERIFIED" }, _sum: { amountCents: true } }),
        db.application.findMany({ include: { customer: { select: { fullName: true } }, company: { select: { preferredName: true, formationState: true } }, package: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
        db.auditLog.findMany({ select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 }),
        db.document.count({ where: { reviewStatus: "UNDER_REVIEW" } }), db.payment.count({ where: { status: "AWAITING_VERIFICATION" } }),
      ]);
      return json({ metrics: { total, pending, requiringAction, verifiedPaymentCents: verifiedPayments._sum.amountCents ?? 0, documentCount, paymentCount }, recentApplications: recentApplications.map((item) => ({ id: item.id, customer: item.customer.fullName, company: item.company.preferredName, state: item.company.formationState, packageName: item.package.name, status: statusNames[item.status], submittedAt: item.submittedAt })), activity: audit });
    }
    if (resource === "applications") {
      if (id) return json({ application: await application(id), approvalReady: await approvalReady(id) });
      const search = url.searchParams.get("search")?.trim().slice(0, 100);
      const status = url.searchParams.get("status");
      const state = url.searchParams.get("state");
      const where: Prisma.ApplicationWhereInput = { ...(status && status in ApplicationStatus ? { status: status as ApplicationStatus } : {}), ...(state ? { company: { formationState: state } } : {}), ...(search ? { OR: [{ id: { contains: search, mode: "insensitive" } }, { company: { preferredName: { contains: search, mode: "insensitive" } } }, { customer: { fullName: { contains: search, mode: "insensitive" } } }] } : {}) };
      const [items, total] = await Promise.all([db.application.findMany({ where, include: { customer: { select: { id: true, fullName: true } }, company: { select: { preferredName: true, formationState: true } }, package: { select: { name: true } }, order: { select: { paymentStatus: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }), db.application.count({ where })]);
      return json({ items: items.map((item) => ({ id: item.id, customerId: item.customerId, customer: item.customer.fullName, companyId: item.companyId, company: item.company.preferredName, state: item.company.formationState, packageName: item.package.name, paymentStatus: item.order?.paymentStatus ?? "UNPAID", status: statusNames[item.status], statusCode: item.status, submittedAt: item.submittedAt })), total, page, pageSize: take });
    }
    if (resource === "clients") {
      if (id) {
        const client = await db.user.findFirst({ where: { id, role: "CLIENT" }, select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true, companies: { select: { id: true, preferredName: true, formationState: true } }, applications: { select: { id: true, status: true, companyId: true } } } });
        if (!client) throw new ApiError(404, "Client not found");
        return json({ client });
      }
      const search = url.searchParams.get("search")?.trim().slice(0, 100);
      const where: Prisma.UserWhereInput = { role: "CLIENT", ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { emailNormalized: { contains: search.toLowerCase() } }] } : {}) };
      const [items, total] = await Promise.all([db.user.findMany({ where, select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true, _count: { select: { companies: true, applications: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }), db.user.count({ where })]);
      return json({ items, total, page, pageSize: take });
    }
    if (resource === "orders") {
      const where: Prisma.OrderWhereInput = id ? { id } : {};
      const [items, total] = await Promise.all([db.order.findMany({ where, include: { application: { include: { customer: { select: { id: true, fullName: true } }, company: { select: { preferredName: true } }, package: { select: { name: true } } } }, items: true, payments: true, refunds: true, invoice: true }, orderBy: { createdAt: "desc" }, skip: id ? 0 : (page - 1) * take, take: id ? 1 : take }), db.order.count({ where })]);
      if (id && !items.length) throw new ApiError(404, "Order not found");
      return json({ items, total, page, pageSize: take });
    }
    if (resource === "documents") {
      const where: Prisma.DocumentWhereInput = { ...(id ? { id } : {}), ...(url.searchParams.get("status") ? { reviewStatus: url.searchParams.get("status") as Prisma.EnumDocumentStatusFilter["equals"] } : {}) };
      const [items, total] = await Promise.all([db.document.findMany({ where, select: { id: true, applicationId: true, documentType: true, originalFilename: true, fileSize: true, mimeType: true, reviewStatus: true, createdAt: true, ownerId: true, application: { select: { customer: { select: { fullName: true } }, company: { select: { preferredName: true } } } } }, orderBy: { createdAt: "desc" }, skip: id ? 0 : (page - 1) * take, take: id ? 1 : take }), db.document.count({ where })]);
      if (id && !items.length) throw new ApiError(404, "Document not found");
      return json({ items, total, page, pageSize: take });
    }
    if (resource === "payments") {
      const [items, refunds] = await Promise.all([db.payment.findMany({ include: { order: { include: { application: { include: { customer: { select: { fullName: true } } } } } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }), db.refundRequest.findMany({ include: { order: { include: { application: { select: { customer: { select: { fullName: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 100 })]);
      return json({ items, refunds });
    }
    if (resource === "services") {
      const [services, packages, stateFees] = await Promise.all([db.service.findMany({ orderBy: { name: "asc" } }), db.package.findMany({ orderBy: { serviceFeeCents: "asc" }, include: { packageServices: { include: { service: { select: { name: true } } } } } }), db.stateFilingFee.findMany({ orderBy: { state: "asc" } })]);
      return json({ services, packages, stateFees });
    }
    if (resource === "website-content") return json({ drafts: await db.contentDraft.findMany({ orderBy: { area: "asc" } }) });
    if (resource === "payment-instructions") return json({ instructions: (await db.paymentInstructions.findUnique({ where: { id: "default" } }))?.body ?? "" });
    if (resource === "notifications") {
      const filter = url.searchParams.get("filter");
      const where = { userId: owner.id, ...(filter === "unread" ? { readAt: null } : filter === "read" ? { readAt: { not: null } } : {}) };
      const [notifications, unreadCount] = await Promise.all([db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }), db.notification.count({ where: { userId: owner.id, readAt: null } })]);
      return json({ notifications, unreadCount });
    }
    if (resource === "notification-preferences") return json({ preferences: await db.notificationPreference.findUnique({ where: { userId: owner.id } }) });
    if (resource === "audit") return json({ items: await db.auditLog.findMany({ select: { id: true, actorUserId: true, action: true, resourceType: true, resourceId: true, safeMetadata: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }) });
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "OWNER");
    const [resource, id, action] = (await context.params).segments;
    if (resource === "applications" && id && action === "status") {
      const input = statusInput.parse(await body(request));
      return json({ application: await statusChange(id, user.id, input.status, input.reason) });
    }
    if (resource === "applications" && id && action === "checks") {
      const input = z.object({ check: z.enum(approvalChecks), checked: z.boolean() }).parse(await body(request));
      await application(id);
      if (input.checked) await db.applicationReview.upsert({ where: { applicationId_checkKey: { applicationId: id, checkKey: input.check } }, create: { applicationId: id, reviewerId: user.id, checkKey: input.check }, update: { reviewerId: user.id, checkedAt: new Date() } });
      else await db.applicationReview.deleteMany({ where: { applicationId: id, checkKey: input.check } });
      await db.auditLog.create({ data: { actorUserId: user.id, action: input.checked ? "REVIEW_CHECK_SET" : "REVIEW_CHECK_CLEARED", resourceType: "Application", resourceId: id, safeMetadata: { check: input.check } } });
      return json({ ok: true, approvalReady: await approvalReady(id) });
    }
    if (resource === "applications" && id && action === "notes") {
      const input = z.object({ text: z.string().trim().min(1).max(3000) }).parse(await body(request));
      await application(id);
      const note = await db.internalNote.create({ data: { applicationId: id, authorId: user.id, body: input.text } });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "INTERNAL_NOTE_ADDED", resourceType: "Application", resourceId: id } });
      return json({ note: { id: note.id, body: note.body, createdAt: note.createdAt } }, 201);
    }
    if (resource === "documents" && id && action === "review") {
      const input = z.object({ status: z.enum(["ACCEPTED", "REPLACEMENT_REQUIRED"]), reason: z.string().trim().max(500).optional() }).parse(await body(request));
      const found = await db.document.findUnique({ where: { id }, select: { id: true, reviewStatus: true, applicationId: true, application: { select: { customerId: true, customer: { select: { email: true, notificationPreference: true } } } } } });
      if (!found) throw new ApiError(404, "Document not found");
      if (found.reviewStatus !== "UNDER_REVIEW") throw new ApiError(409, "Document is not awaiting review");
      await db.$transaction(async (tx) => {
        const claim = await tx.document.updateMany({ where: { id, reviewStatus: "UNDER_REVIEW" }, data: { reviewStatus: input.status, reviewedById: user.id, reviewedAt: new Date() } });
        if (!claim.count) throw new ApiError(409, "Document already reviewed");
        await queueNotification(tx, `document-review:${id}`, found.application.customerId, "DOCUMENT_REVIEW", input.status === "REPLACEMENT_REQUIRED" ? "Document replacement requested" : "Document approved", input.status === "REPLACEMENT_REQUIRED" ? "Please review the document request in your dashboard." : "A submitted document was approved for internal review.", found.applicationId);
        if (found.application.customer.notificationPreference?.documentEmail !== false) await queueEmail(tx, `document-review:${id}`, found.application.customer.email, input.status === "REPLACEMENT_REQUIRED" ? "Document replacement requested — Apex Filings" : "Document reviewed — Apex Filings", emailHtml(input.status === "REPLACEMENT_REQUIRED" ? "Document replacement requested" : "Document approved", [input.status === "REPLACEMENT_REQUIRED" ? "Please sign in to review the replacement request." : "A document was approved for internal review. This is not government approval."], { label: "Open documents", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/documents` }));
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "DOCUMENT_REVIEWED", resourceType: "Document", resourceId: id, safeMetadata: { status: input.status } } });
      });
      return json({ ok: true });
    }
    if (resource === "payments" && !id) {
      const input = z.object({ orderId: z.string().min(1), amountCents: z.number().int().positive(), reference: z.string().trim().min(2).max(200), supportingInfo: z.string().trim().max(1000).optional() }).parse(await body(request));
      const order = await db.order.findUnique({ where: { id: input.orderId } });
      if (!order || order.paymentStatus === "VERIFIED" || order.totalCents === null) throw new ApiError(409, "Confirm all order fees before recording a payment");
      if (input.amountCents !== order.totalCents) throw new ApiError(400, "Payment amount must match the confirmed order total");
      const result = await db.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({ where: { id: input.orderId, paymentStatus: "UNPAID", totalCents: input.amountCents }, data: { paymentStatus: "AWAITING_VERIFICATION" } });
        if (!claim.count) throw new ApiError(409, "Payment review has already started for this order");
        const payment = await tx.payment.create({ data: { orderId: input.orderId, amountCents: input.amountCents, reference: input.reference, supportingInfo: input.supportingInfo, status: "AWAITING_VERIFICATION" } });
        const related = await tx.order.findUniqueOrThrow({ where: { id: input.orderId }, include: { application: { include: { customer: { include: { notificationPreference: true } } } } } });
        const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
        for (const owner of owners) await queueNotification(tx, `payment-review:${payment.id}:${owner.id}`, owner.id, "PAYMENT_REVIEW", "Payment needs verification", `Manual payment for order ${input.orderId} is awaiting review.`, related.applicationId);
        await queueNotification(tx, `payment-review:${payment.id}:customer`, related.application.customerId, "PAYMENT_UPDATE", "Payment awaiting verification", "A payment was recorded for review. It has not been verified yet.", related.applicationId);
        if (related.application.customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `payment-review:${payment.id}:customer`, related.application.customer.email, "Payment awaiting verification — Apex Filings", emailHtml("Payment awaiting verification", [`Order reference: ${input.orderId}`, "A payment was recorded for review. This is not a successful-payment confirmation."], { label: "View order", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/orders/${input.orderId}` }));
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "MANUAL_PAYMENT_RECORDED", resourceType: "Payment", resourceId: payment.id } });
        return payment;
      });
      return json({ payment: result }, 201);
    }
    if (resource === "payments" && id && action === "verify") {
      const payment = await db.payment.findUnique({ where: { id }, include: { order: { include: { application: true } } } });
      if (!payment || payment.status !== "AWAITING_VERIFICATION" || !payment.amountCents || !payment.reference || payment.order.totalCents !== payment.amountCents || payment.order.paymentStatus === "VERIFIED") throw new ApiError(409, "Payment unavailable for verification");
      await db.$transaction(async (tx) => {
        const claim = await tx.payment.updateMany({ where: { id, status: "AWAITING_VERIFICATION" }, data: { status: "VERIFIED", verifiedById: user.id, verifiedAt: new Date() } });
        if (!claim.count) throw new ApiError(409, "Payment already reviewed");
        const orderClaim = await tx.order.updateMany({ where: { id: payment.orderId, paymentStatus: "AWAITING_VERIFICATION", totalCents: payment.amountCents }, data: { paymentStatus: "VERIFIED" } });
        if (!orderClaim.count) throw new ApiError(409, "Order payment already reviewed or changed");
        const oldStatus = payment.order.application.status;
        if (oldStatus === "AWAITING_PAYMENT") {
          await tx.application.update({ where: { id: payment.order.applicationId }, data: { status: "PAYMENT_RECEIVED" } });
          await tx.applicationStatusHistory.create({ data: { applicationId: payment.order.applicationId, previousStatus: oldStatus, newStatus: "PAYMENT_RECEIVED", changedById: user.id, reason: "Manual payment verified by owner" } });
        }
        await queueNotification(tx, `payment-verified:${id}`, payment.order.application.customerId, "PAYMENT_UPDATE", "Payment verified", "The recorded payment was verified by Apex Filings.", payment.order.applicationId);
        const customer = await tx.user.findUniqueOrThrow({ where: { id: payment.order.application.customerId }, select: { email: true, notificationPreference: true } });
        if (customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `payment-verified:${id}`, customer.email, "Your payment was verified — Apex Filings", emailHtml("Payment verified", [`Order reference: ${payment.orderId}`, "Your manual payment has been verified by Apex Filings."], { label: "View order", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/orders/${payment.orderId}` }));
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "MANUAL_PAYMENT_VERIFIED", resourceType: "Payment", resourceId: id } });
      });
      return json({ ok: true });
    }
    if (resource === "refunds" && id && action === "review") {
      const input = z.object({ status: z.enum(["UNDER_REVIEW", "APPROVED", "DECLINED"]), reason: z.string().trim().min(3).max(500) }).parse(await body(request));
      const found = await db.refundRequest.findUnique({ where: { id } });
      if (!found || !["REQUESTED", "UNDER_REVIEW"].includes(found.status) || found.status === input.status) throw new ApiError(409, "Refund request unavailable");
      await db.$transaction(async (tx) => {
        const claimed = await tx.refundRequest.updateMany({ where: { id, status: found.status }, data: { status: input.status, reviewedAt: new Date() } });
        if (!claimed.count) throw new ApiError(409, "Refund status changed; refresh and try again");
        const related = await tx.refundRequest.findUniqueOrThrow({ where: { id }, include: { order: { include: { application: { include: { customer: { include: { notificationPreference: true } } } } } } } });
        await queueNotification(tx, `refund:${id}:${input.status}`, related.order.application.customerId, "PAYMENT_UPDATE", "Refund request updated", `Refund request status: ${input.status.replaceAll("_", " ")}. No funds were moved by this review decision.`, related.order.applicationId);
        if (related.order.application.customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `refund:${id}:${input.status}`, related.order.application.customer.email, "Refund request update — Apex Filings", emailHtml("Refund request updated", [`Refund reference: ${id}`, `Status: ${input.status.replaceAll("_", " ")}`, "This review decision does not mean funds have been moved."], { label: "View order", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/orders/${related.orderId}` }));
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "REFUND_REQUEST_REVIEWED", resourceType: "RefundRequest", resourceId: id, safeMetadata: { status: input.status } } });
      });
      return json({ ok: true, warning: "This is a review decision only; no funds were moved." });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "OWNER");
    const [resource, id] = (await context.params).segments;
    if (resource === "payment-instructions" && !id) {
      const input = z.object({ body: z.string().trim().max(3000) }).parse(await body(request));
      const result = await db.$transaction(async (tx) => {
        const instructions = await tx.paymentInstructions.upsert({ where: { id: "default" }, create: { id: "default", body: input.body, updatedById: user.id }, update: { body: input.body, updatedById: user.id } });
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "PAYMENT_INSTRUCTIONS_UPDATED", resourceType: "PaymentInstructions", resourceId: "default" } });
        return instructions;
      });
      return json({ instructions: result.body });
    }
    if (resource === "clients" && id) {
      const input = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(await body(request));
      const existing = await db.user.findFirst({ where: { id, role: "CLIENT" }, select: { id: true } });
      if (!existing) throw new ApiError(404, "Client not found");
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data: { status: input.status } });
        if (input.status === "SUSPENDED") await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "CLIENT_STATUS_CHANGED", resourceType: "User", resourceId: id, safeMetadata: { status: input.status } } });
      });
      return json({ ok: true });
    }
    if (resource === "orders" && id) {
      const input = z.object({ governmentFeeCents: z.number().int().nonnegative(), thirdPartyFeeCents: z.number().int().nonnegative(), additionalFeeCents: z.number().int().nonnegative(), discountCents: z.number().int().nonnegative() }).parse(await body(request));
      const existing = await db.order.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, "Order not found");
      if (existing.paymentStatus !== "UNPAID") throw new ApiError(409, "Fees are locked once payment review begins");
      const totalCents = existing.serviceFeeCents + input.governmentFeeCents + input.thirdPartyFeeCents + input.additionalFeeCents - input.discountCents;
      if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new ApiError(400, "Invalid fee total");
      const order = await db.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({ where: { id, paymentStatus: "UNPAID" }, data: { ...input, totalCents } });
        if (!claim.count) throw new ApiError(409, "Order changed during fee confirmation");
        const instructions = await tx.paymentInstructions.findUnique({ where: { id: "default" } });
        if (instructions?.body.trim() && !(await tx.notification.findUnique({ where: { eventKey: `payment-instructions:${id}` } }))) {
          const related = await tx.order.findUniqueOrThrow({ where: { id }, include: { application: { include: { customer: { include: { notificationPreference: true } } } } } });
          await queueNotification(tx, `payment-instructions:${id}`, related.application.customerId, "PAYMENT_UPDATE", "Payment instructions available", "Your order total and payment instructions are available in the dashboard.", related.applicationId);
          if (related.application.customer.notificationPreference?.paymentEmail !== false) await queueEmail(tx, `payment-instructions:${id}`, related.application.customer.email, "Payment instructions available — Apex Filings", emailHtml("Payment instructions available", [`Order reference: ${id}`, "Your total and payment instructions are available in your secure dashboard. Do not send payment details by email."], { label: "View order", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/orders/${id}` }));
        }
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "ORDER_FEES_CONFIRMED", resourceType: "Order", resourceId: id, safeMetadata: { totalCents } } });
        return tx.order.findUniqueOrThrow({ where: { id } });
      });
      return json({ order });
    }
    if (resource === "services" && id) {
      const input = z.object({ name: z.string().trim().min(2).max(160).optional(), description: z.string().trim().min(2).max(3000).optional(), available: z.boolean().optional() }).parse(await body(request));
      const result = await db.service.update({ where: { id }, data: input });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "SERVICE_UPDATED", resourceType: "Service", resourceId: id } });
      return json({ service: result });
    }
    if (resource === "packages" && id) {
      const input = z.object({ name: z.string().trim().min(2).max(160).optional(), serviceFeeCents: z.number().int().nonnegative().optional(), includedServices: z.array(z.string().trim().min(2).max(200)).max(40).optional(), available: z.boolean().optional() }).parse(await body(request));
      const result = await db.package.update({ where: { id }, data: input });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "PACKAGE_UPDATED", resourceType: "Package", resourceId: id } });
      return json({ package: result });
    }
    if (resource === "state-fees" && id) {
      const input = z.object({ filingFeeCents: z.number().int().nonnegative().nullable(), additionalFeeNotes: z.string().trim().max(1000).nullable(), verifiedAt: z.iso.datetime().nullable() }).parse(await body(request));
      const result = await db.stateFilingFee.update({ where: { code: id }, data: { ...input, verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null } });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "STATE_FEE_UPDATED", resourceType: "StateFilingFee", resourceId: id } });
      return json({ stateFee: result });
    }
    if (resource === "website-content" && id) {
      const input = z.object({ title: z.string().trim().min(2).max(160), body: z.string().trim().max(10000) }).parse(await body(request));
      const result = await db.contentDraft.upsert({ where: { area: id }, create: { area: id, ...input }, update: input });
      await db.auditLog.create({ data: { actorUserId: user.id, action: "CONTENT_DRAFT_SAVED", resourceType: "ContentDraft", resourceId: result.id } });
      return json({ draft: result, published: false });
    }
    if (resource === "notifications" && id === "read-all") {
      const changed = await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
      return json({ ok: true, changed: changed.count });
    }
    if (resource === "notifications" && id) {
      const input = z.object({ read: z.boolean().default(true) }).parse(await body(request));
      const changed = await db.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: input.read ? new Date() : null } });
      if (!changed.count) throw new ApiError(404, "Notification not found");
      return json({ ok: true });
    }
    if (resource === "notification-preferences") {
      const input = z.object({ everyLoginEmail: z.boolean(), applicationEmail: z.boolean(), paymentEmail: z.boolean(), documentEmail: z.boolean(), supportEmail: z.boolean() }).parse(await body(request));
      const preferences = await db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...input }, update: input });
      return json({ preferences });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}
