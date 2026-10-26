import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { applicationDraftInput } from "@/server/validation";
import { statusNames } from "@/server/workflow";

export const runtime = "nodejs";
type Params = { params: Promise<{ segments: string[] }> };
const appInclude = { company: { include: { owners: true } }, package: true, service: true, order: { include: { payments: true } }, statusHistory: { orderBy: { createdAt: "asc" } }, customerResponses: { orderBy: { createdAt: "asc" }, select: { id: true, requestEventId: true, body: true, createdAt: true } }, documents: { select: { id: true, documentType: true, reviewStatus: true, originalFilename: true, fileSize: true, createdAt: true, ownerId: true } } } satisfies Prisma.ApplicationInclude;

function cleanApplication(item: Prisma.ApplicationGetPayload<{ include: typeof appInclude }>) {
  return { id: item.id, companyId: item.companyId, company: { id: item.company.id, name: item.company.preferredName, state: item.company.formationState, businessActivity: item.company.businessActivity, description: item.company.businessDescription, addressRequirement: item.company.addressRequirements, membership: item.company.ownershipType, management: item.company.managementStructure, alternatives: [item.company.alternativeName1, item.company.alternativeName2].filter(Boolean), owners: item.company.owners.map((owner) => ({ id: owner.id, fullName: owner.fullLegalName, email: owner.email, phone: owner.phone, nationality: owner.nationality, residence: owner.countryOfResidence, address: owner.residentialAddress, ownership: owner.ownershipBasisPoints / 100 })) }, packageName: item.package.name, packageSlug: item.package.slug, serviceFeeCents: item.package.serviceFeeCents, status: statusNames[item.status], statusCode: item.status, additionalServices: item.additionalServices, customerConfirmedAt: item.customerConfirmedAt, submittedAt: item.submittedAt, updatedAt: item.updatedAt, order: item.order && { id: item.order.id, paymentStatus: item.order.paymentStatus, serviceFeeCents: item.order.serviceFeeCents, governmentFeeCents: item.order.governmentFeeCents, thirdPartyFeeCents: item.order.thirdPartyFeeCents, additionalFeeCents: item.order.additionalFeeCents, discountCents: item.order.discountCents, totalCents: item.order.totalCents, currency: item.order.currency }, history: item.statusHistory.map((event) => ({ id: event.id, status: statusNames[event.newStatus], reason: event.reason, date: event.createdAt })), responses: item.customerResponses, documents: item.documents };
}

async function findOwnApplication(id: string, customerId: string) {
  const item = await db.application.findFirst({ where: { id, customerId }, include: appInclude });
  if (!item) throw new ApiError(404, "Application not found");
  return item;
}

async function validateCatalog(input: z.infer<typeof applicationDraftInput>) {
  const [state, pack, service] = await Promise.all([
    db.stateFilingFee.findFirst({ where: { state: input.formationState } }),
    db.package.findUnique({ where: { slug: input.packageSlug } }),
    db.service.findUnique({ where: { slug: "llc" } }),
  ]);
  if (!state || !pack?.available || !service?.available) throw new ApiError(400, "State or package unavailable");
  return { pack, service };
}

function validateOwners(input: z.infer<typeof applicationDraftInput>) {
  if (input.owners.length < (input.membership === "multi" ? 2 : 1)) throw new ApiError(400, "Add the required owners");
  if (input.membership === "single" && input.owners.length !== 1) throw new ApiError(400, "Single-member company must have one owner");
  const totalBasisPoints = input.owners.reduce((sum, item) => sum + Math.round(item.ownership * 100), 0);
  if (totalBasisPoints !== 10000) throw new ApiError(400, "Ownership percentages must total 100%");
}

async function updateDraft(id: string, customerId: string, input: z.infer<typeof applicationDraftInput>) {
  const existing = await findOwnApplication(id, customerId);
  if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft applications can be edited");
  const { pack } = await validateCatalog(input);
  if (existing.documents.length && input.owners.length !== existing.company.owners.length) throw new ApiError(409, "Owner changes after document upload require support review");
  if (existing.documents.length && input.owners.some((owner) => {
    const saved = existing.company.owners.find((item) => item.email === owner.email.trim().toLowerCase());
    return !saved || saved.fullLegalName !== owner.fullName || saved.phone !== owner.phone || saved.nationality !== owner.nationality || saved.countryOfResidence !== owner.residence || saved.residentialAddress !== owner.address || saved.ownershipBasisPoints !== Math.round(owner.ownership * 100);
  })) throw new ApiError(409, "Owner changes after document upload require support review");
  await db.$transaction(async (tx) => {
    await tx.company.update({ where: { id: existing.companyId }, data: { preferredName: input.preferredName, alternativeName1: input.firstAlternativeName, alternativeName2: input.secondAlternativeName || null, formationState: input.formationState, businessActivity: input.businessActivity, businessDescription: input.description, addressRequirements: input.addressRequirement, ownershipType: input.membership, managementStructure: input.management } });
    await tx.application.update({ where: { id }, data: { packageId: pack.id, additionalServices: input.additionalServices } });
    if (!existing.documents.length) {
      const submittedEmails = input.owners.map((owner) => owner.email.trim().toLowerCase());
      await tx.companyOwner.deleteMany({ where: { companyId: existing.companyId, email: { notIn: submittedEmails } } });
      for (const owner of input.owners) {
        const email = owner.email.trim().toLowerCase();
        const saved = existing.company.owners.find((item) => item.email === email);
        const details = { fullLegalName: owner.fullName, email, phone: owner.phone, nationality: owner.nationality, countryOfResidence: owner.residence, residentialAddress: owner.address, ownershipBasisPoints: Math.round(owner.ownership * 100) };
        if (saved) await tx.companyOwner.update({ where: { id: saved.id }, data: details });
        else await tx.companyOwner.create({ data: { companyId: existing.companyId, ...details } });
      }
    }
    await tx.auditLog.create({ data: { actorUserId: customerId, action: "APPLICATION_DRAFT_UPDATED", resourceType: "Application", resourceId: id } });
  });
  return cleanApplication(await findOwnApplication(id, customerId));
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const user = await requireRole(request, "CLIENT");
    const [resource, id] = (await context.params).segments;
    if (resource === "dashboard") {
      const [applications, notifications, services, packages, profile, paymentInstructions] = await Promise.all([
        db.application.findMany({ where: { customerId: user.id }, include: appInclude, orderBy: { updatedAt: "desc" } }),
        db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
        db.service.findMany({ where: { available: true }, select: { id: true, name: true, description: true, category: true, slug: true } }),
        db.package.findMany({ where: { available: true }, select: { id: true, name: true, slug: true, serviceFeeCents: true, currency: true } }),
        db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } }),
        db.paymentInstructions.findUnique({ where: { id: "default" }, select: { body: true } }),
      ]);
      return json({ user: { ...user, phone: profile.phone }, applications: applications.map(cleanApplication), notifications, services, packages, paymentInstructions: paymentInstructions?.body ?? "" });
    }
    if (resource === "applications") {
      if (id) return json({ application: cleanApplication(await findOwnApplication(id, user.id)) });
      const items = await db.application.findMany({ where: { customerId: user.id }, include: appInclude, orderBy: { updatedAt: "desc" } });
      return json({ applications: items.map(cleanApplication) });
    }
    if (resource === "companies") {
      const items = await db.company.findMany({ where: { customerId: user.id }, select: { id: true, preferredName: true, formationState: true, createdAt: true, applications: { select: { id: true, status: true } } }, orderBy: { updatedAt: "desc" } });
      return json({ companies: items });
    }
    if (resource === "orders") {
      const items = await db.order.findMany({ where: { application: { customerId: user.id }, ...(id ? { id } : {}) }, include: { application: { select: { company: { select: { preferredName: true } }, package: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
      if (id && !items.length) throw new ApiError(404, "Order not found");
      return json({ orders: items.map(({ application, ...order }) => ({ ...order, companyName: application.company.preferredName, packageName: application.package.name })) });
    }
    if (resource === "documents") {
      const items = await db.document.findMany({ where: { application: { customerId: user.id } }, select: { id: true, applicationId: true, companyId: true, ownerId: true, documentType: true, originalFilename: true, reviewStatus: true, createdAt: true }, orderBy: { createdAt: "desc" } });
      return json({ documents: items });
    }
    if (resource === "notifications") {
      const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
      return json({ notifications: items });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "CLIENT");
    const [resource, id, action] = (await context.params).segments;
    if (resource === "applications" && !id) {
      const input = applicationDraftInput.parse(await body(request));
      const { pack, service } = await validateCatalog(input);
      const item = await db.$transaction(async (tx) => {
        const company = await tx.company.create({ data: { customerId: user.id, preferredName: input.preferredName, alternativeName1: input.firstAlternativeName, alternativeName2: input.secondAlternativeName || null, formationState: input.formationState, businessActivity: input.businessActivity, businessDescription: input.description, addressRequirements: input.addressRequirement, ownershipType: input.membership, managementStructure: input.management, owners: { create: input.owners.map((owner) => ({ fullLegalName: owner.fullName, email: owner.email.trim().toLowerCase(), phone: owner.phone, nationality: owner.nationality, countryOfResidence: owner.residence, residentialAddress: owner.address, ownershipBasisPoints: Math.round(owner.ownership * 100) })) } } });
        const application = await tx.application.create({ data: { companyId: company.id, customerId: user.id, serviceId: service.id, packageId: pack.id, additionalServices: input.additionalServices } });
        await tx.applicationStatusHistory.create({ data: { applicationId: application.id, newStatus: "DRAFT", changedById: user.id, reason: "Draft created" } });
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "APPLICATION_DRAFT_CREATED", resourceType: "Application", resourceId: application.id } });
        return application;
      });
      return json({ application: cleanApplication(await findOwnApplication(item.id, user.id)) }, 201);
    }
    if (resource === "applications" && id && action === "submit") {
      const input = z.object({ confirmed: z.literal(true) }).parse(await body(request));
      if (!input.confirmed) throw new ApiError(400, "Review confirmation required");
      const current = await findOwnApplication(id, user.id);
      if (current.status !== "DRAFT") throw new ApiError(409, "Application has already been submitted");
      const form = applicationDraftInput.parse({ preferredName: current.company.preferredName, firstAlternativeName: current.company.alternativeName1, secondAlternativeName: current.company.alternativeName2 ?? "", formationState: current.company.formationState, businessActivity: current.company.businessActivity, description: current.company.businessDescription, addressRequirement: current.company.addressRequirements, membership: current.company.ownershipType, management: current.company.managementStructure, packageSlug: current.package.slug, additionalServices: current.additionalServices, owners: current.company.owners.map((owner) => ({ fullName: owner.fullLegalName, email: owner.email, phone: owner.phone, nationality: owner.nationality, residence: owner.countryOfResidence, address: owner.residentialAddress, ownership: owner.ownershipBasisPoints / 100 })) });
      validateOwners(form);
      const required = await db.serviceDocumentRequirement.findMany({ where: { serviceId: current.serviceId, required: true, OR: [{ stateCode: null }, { stateCode: current.company.formationState }] } });
      for (const requirement of required) {
        const matching = current.documents.filter((document) => document.documentType === requirement.documentType && document.reviewStatus !== "REPLACEMENT_REQUIRED");
        if (requirement.documentType === "OWNER_ID" && current.company.owners.some((owner) => !matching.some((document) => document.ownerId === owner.id))) throw new ApiError(409, "Upload identification for each owner before submitting");
        if (requirement.documentType !== "OWNER_ID" && !matching.length) throw new ApiError(409, `Required document missing: ${requirement.documentType}`);
      }
      const result = await db.$transaction(async (tx) => {
        const claim = await tx.application.updateMany({ where: { id, customerId: user.id, status: "DRAFT" }, data: { status: "AWAITING_PAYMENT", customerConfirmedAt: new Date(), submittedAt: new Date() } });
        if (claim.count !== 1) throw new ApiError(409, "Application has already been submitted");
        const order = await tx.order.create({ data: { applicationId: id, serviceFeeCents: current.package.serviceFeeCents, currency: current.package.currency, paymentStatus: "UNPAID", items: { create: [{ description: current.package.name, amountCents: current.package.serviceFeeCents }] } } });
        await tx.applicationStatusHistory.create({ data: { applicationId: id, previousStatus: "DRAFT", newStatus: "AWAITING_PAYMENT", changedById: user.id, reason: "Customer confirmed application; payment not verified" } });
        await tx.notification.create({ data: { userId: user.id, type: "APPLICATION_SUBMITTED", title: "Application received", message: "Your formation application was submitted. Payment details will follow after fees are confirmed.", relatedEntity: id } });
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "APPLICATION_SUBMITTED", resourceType: "Application", resourceId: id } });
        return order;
      });
      return json({ application: cleanApplication(await findOwnApplication(id, user.id)), orderId: result.id });
    }
    if (resource === "applications" && id && action === "respond") {
      const input = z.object({ message: z.string().trim().min(10).max(2000) }).parse(await body(request));
      const current = await findOwnApplication(id, user.id);
      if (!["INFORMATION_REQUIRED", "AWAITING_CUSTOMER_CONFIRMATION", "ADDITIONAL_ACTION_REQUIRED"].includes(current.status)) throw new ApiError(409, "This application is not awaiting a response");
      const latestRequest = [...current.statusHistory].reverse().find((event) => event.newStatus === current.status);
      if (!latestRequest || current.customerResponses.some((response) => response.createdAt >= latestRequest.createdAt)) throw new ApiError(409, "A response has already been sent for this request");
      try {
        await db.$transaction(async (tx) => {
          await tx.customerResponse.create({ data: { applicationId: id, customerId: user.id, requestEventId: latestRequest.id, body: input.message } });
          const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
          await tx.notification.createMany({ data: owners.map((owner) => ({ userId: owner.id, type: "CUSTOMER_RESPONSE", title: "Customer responded", message: `A customer responded to an information request for ${current.company.preferredName}.`, relatedEntity: id })) });
          await tx.auditLog.create({ data: { actorUserId: user.id, action: "CUSTOMER_RESPONSE_SUBMITTED", resourceType: "Application", resourceId: id } });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "A response has already been sent for this request");
        throw error;
      }
      return json({ application: cleanApplication(await findOwnApplication(id, user.id)) }, 201);
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "CLIENT");
    const [resource, id] = (await context.params).segments;
    if (resource === "applications" && id) return json({ application: await updateDraft(id, user.id, applicationDraftInput.parse(await body(request))) });
    if (resource === "notifications" && id) {
      const update = await db.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } });
      if (!update.count) throw new ApiError(404, "Notification not found");
      return json({ ok: true });
    }
    throw new ApiError(404, "Not found");
  } catch (error) { return handleError(error); }
}
