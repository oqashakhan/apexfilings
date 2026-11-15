import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { handleError, json, requireRole } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "OWNER");
    const id = request.nextUrl.searchParams.get("id")?.slice(0,100);
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0,120);
    const requests = await db.serviceRequest.findMany({ where: { ...(id ? { id } : {}), ...(search ? { OR: [{ customer: { fullName: { contains: search, mode: "insensitive" } } }, { customer: { clientReference: search } }, { company: { preferredName: { contains: search, mode: "insensitive" } } }, { service: { name: { contains: search, mode: "insensitive" } } }] } : {}) }, include: { customer: { select: { id: true, fullName: true, email: true, clientReference: true } }, company: { select: { id: true, preferredName: true, formationState: true } }, service: { select: { id: true, name: true, priceCents: true, currency: true, priceApproved: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return json({ requests });
  } catch (error) { return handleError(error); }
}
