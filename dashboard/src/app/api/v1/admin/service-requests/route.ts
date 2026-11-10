import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { handleError, json, requireRole } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "OWNER");
    const requests = await db.serviceRequest.findMany({ include: { customer: { select: { id: true, fullName: true, email: true, clientReference: true } }, company: { select: { id: true, preferredName: true, formationState: true } }, service: { select: { id: true, name: true, priceCents: true, currency: true, priceApproved: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return json({ requests });
  } catch (error) { return handleError(error); }
}
