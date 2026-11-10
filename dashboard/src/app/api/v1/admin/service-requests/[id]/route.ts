import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, body, checkOrigin, handleError, json, requireRole } from "@/server/http";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

const updateInput = z.object({
  status: z.enum(["REQUESTED", "UNDER_REVIEW", "INFORMATION_REQUIRED", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  note: z.string().trim().max(1000).optional().default(""),
}).refine((value) => value.status !== "INFORMATION_REQUIRED" || value.note.length >= 3, { path: ["note"], message: "Add the information you need from the client." });

const statusLabel = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function PATCH(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const actor = await requireRole(request, "OWNER");
    const { id } = await context.params;
    const input = updateInput.parse(await body(request));
    const current = await db.serviceRequest.findUnique({ where: { id }, include: { customer: { select: { id: true, fullName: true, email: true } }, company: { select: { preferredName: true } }, service: { select: { name: true } } } });
    if (!current) throw new ApiError(404, "Service request not found");

    const updated = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ServiceRequest" WHERE "id" = ${id} FOR UPDATE`;
      const latest = await tx.serviceRequest.findUnique({ where: { id }, include: { customer: { select: { id: true, fullName: true, email: true } }, company: { select: { preferredName: true } }, service: { select: { name: true } } } });
      if (!latest) throw new ApiError(404, "Service request not found");
      const changed = latest.status !== input.status;
      const item = await tx.serviceRequest.update({ where: { id }, data: { status: input.status, statusNote: input.note || null } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: changed ? "SERVICE_REQUEST_STATUS_CHANGED" : "SERVICE_REQUEST_NOTE_UPDATED", resourceType: "ServiceRequest", resourceId: item.id, safeMetadata: { fromStatus: latest.status, toStatus: input.status } } });
      if (changed) {
        const label = statusLabel(input.status);
        const message = input.note ? `Your ${latest.service.name} request for ${latest.company.preferredName} is ${label}. ${input.note}` : `Your ${latest.service.name} request for ${latest.company.preferredName} is ${label}.`;
        await queueNotification(tx, `service-request-status:${item.id}:${item.updatedAt.toISOString()}`, latest.customer.id, "SERVICE_REQUEST", `Service request ${label.toLowerCase()}`, message, item.id);
        const preferences = await tx.notificationPreference.findUnique({ where: { userId: latest.customer.id } });
        if (preferences?.applicationEmail !== false) await queueEmail(tx, `service-request-status:${item.id}:${item.updatedAt.toISOString()}`, latest.customer.email, `Update on your ${latest.service.name} request — Apex Filings`, emailHtml("Service request update", [`Hello ${latest.customer.fullName},`, `Your ${latest.service.name} request for ${latest.company.preferredName} is now ${label}.`, ...(input.note ? [`Message from the Apex Filings team: ${input.note}`] : [])], { label: "View Additional Services", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/client/services` }));
      }
      return item;
    });
    return json({ request: updated });
  } catch (error) { return handleError(error); }
}
