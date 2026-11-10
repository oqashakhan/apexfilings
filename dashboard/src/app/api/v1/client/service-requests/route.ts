import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";

const requestInput = z.object({
  serviceId: z.string().trim().min(1).max(100),
  companyId: z.string().trim().min(1).max(100),
  details: z.string().trim().min(10).max(4000),
  idempotencyKey: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, "CLIENT");
    const [companies, requests] = await Promise.all([
      db.company.findMany({ where: { customerId: user.id }, select: { id: true, preferredName: true, formationState: true }, orderBy: { updatedAt: "desc" } }),
      db.serviceRequest.findMany({ where: { customerId: user.id }, include: { company: { select: { id: true, preferredName: true } }, service: { select: { id: true, name: true, priceCents: true, currency: true, priceApproved: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return json({ companies, requests });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const user = await requireRole(request, "CLIENT");
    const input = requestInput.parse(await body(request));

    const existing = await db.serviceRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.customerId !== user.id) throw new ApiError(409, "This request could not be completed");
      return json({ request: existing, duplicate: true });
    }

    const company = await db.company.findFirst({ where: { id: input.companyId, customerId: user.id }, select: { id: true, preferredName: true } });
    if (!company) throw new ApiError(404, "Company not found");
    const service = await db.service.findFirst({ where: { id: input.serviceId, available: true }, select: { id: true, name: true } });
    if (!service) throw new ApiError(404, "Service is unavailable");

    const recent = await db.serviceRequest.count({ where: { customerId: user.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) } } });
    if (recent >= 10) throw new ApiError(429, "Too many service requests. Please try again later.");

    try {
      const created = await db.$transaction(async (tx) => {
        // Serialize retries for this account; the unique request key makes the operation idempotent.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
        const retry = await tx.serviceRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (retry) {
          if (retry.customerId !== user.id) throw new ApiError(409, "This request could not be completed");
          return { request: retry, duplicate: true };
        }
        const serviceRequest = await tx.serviceRequest.create({ data: { customerId: user.id, companyId: company.id, serviceId: service.id, details: input.details, idempotencyKey: input.idempotencyKey } });
        const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
        for (const owner of owners) await queueNotification(tx, `service-request-new:${serviceRequest.id}:${owner.id}`, owner.id, "SERVICE_REQUEST", "New additional service request", `${service.name} requested for ${company.preferredName}.`, serviceRequest.id);
        if (process.env.ADMIN_NOTIFICATION_EMAIL) await queueEmail(tx, `service-request-new:${serviceRequest.id}:admin`, process.env.ADMIN_NOTIFICATION_EMAIL, "New additional service request — Apex Filings", emailHtml("New additional service request", [`Service: ${service.name}`, `Company: ${company.preferredName}`, `Client: ${user.fullName}`, "Sign in to review the request details securely."], { label: "Review service requests", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/admin/services` }));
        await queueNotification(tx, `service-request-new:${serviceRequest.id}:client`, user.id, "SERVICE_REQUEST", "Service request received", `Your ${service.name} request for ${company.preferredName} is awaiting review.`, serviceRequest.id);
        await tx.auditLog.create({ data: { actorUserId: user.id, action: "SERVICE_REQUEST_CREATED", resourceType: "ServiceRequest", resourceId: serviceRequest.id, safeMetadata: { companyId: company.id, serviceId: service.id } } });
        return { request: serviceRequest, duplicate: false };
      });
      return json(created, created.duplicate ? 200 : 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const retry = await db.serviceRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (retry?.customerId === user.id) return json({ request: retry, duplicate: true });
      }
      throw error;
    }
  } catch (error) { return handleError(error); }
}
