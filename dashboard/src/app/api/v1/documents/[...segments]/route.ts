import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { actor, ApiError, checkOrigin, handleError, json } from "@/server/http";
import { loadDocument, maxDocumentBytes, removeDocument, safeFilename, storeDocument, validateDocument } from "@/server/storage";

export const runtime = "nodejs";
type Params = { params: Promise<{ segments: string[] }> };

export async function POST(request: NextRequest, context: Params) {
  let storageKey: string | null = null;
  try {
    checkOrigin(request);
    const user = await actor(request);
    const [action] = (await context.params).segments;
    if (action !== "upload") throw new ApiError(404, "Not found");
    if (Number(request.headers.get("content-length") ?? 0) > maxDocumentBytes + 20_000) throw new ApiError(413, "Upload too large");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Empty upload");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxDocumentBytes + 20_000) { await reader.cancel(); throw new ApiError(413, "Upload too large"); }
      chunks.push(value);
    }
    const data = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))) }).formData();
    const file = data.get("file");
    const applicationId = String(data.get("applicationId") ?? "");
    const ownerId = String(data.get("ownerId") ?? "") || null;
    const documentType = String(data.get("documentType") ?? "").trim();
    const finalDocument = data.get("finalDocument") === "true";
    if (!(file instanceof File) || file.size > maxDocumentBytes || !applicationId || !/^[A-Z_]{3,60}$/.test(documentType)) throw new ApiError(400, "Invalid document request");
    const application = await db.application.findUnique({ where: { id: applicationId }, include: { company: { include: { owners: true } } } });
    if (!application) throw new ApiError(404, "Application not found");
    if (user.role !== "OWNER" && (user.role !== "CLIENT" || application.customerId !== user.id)) throw new ApiError(403, "Not authorized");
    if (finalDocument && user.role !== "OWNER") throw new ApiError(403, "Not authorized");
    if (!finalDocument && user.role === "CLIENT" && !["DRAFT", "INFORMATION_REQUIRED", "ADDITIONAL_ACTION_REQUIRED"].includes(application.status)) throw new ApiError(409, "Document upload is not available at this stage");
    if (ownerId && !application.company.owners.some((owner) => owner.id === ownerId)) throw new ApiError(400, "Owner does not belong to this application");
    if (documentType === "OWNER_ID" && !ownerId) throw new ApiError(400, "Select an owner for identification");
    const buffer = Buffer.from(await file.arrayBuffer());
    const identified = validateDocument(buffer, file.type);
    storageKey = await storeDocument(buffer, identified.ext);
    const created = await db.$transaction(async (tx) => {
      const document = await tx.document.create({ data: { applicationId, companyId: application.companyId, ownerId, uploadedById: user.id, documentType, originalFilename: safeFilename(file.name), privateStorageKey: storageKey!, mimeType: identified.mime, fileSize: buffer.length, reviewStatus: finalDocument ? "COMPLETED_COMPANY_DOCUMENT" : "UNDER_REVIEW" } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "DOCUMENT_UPLOADED", resourceType: "Document", resourceId: document.id, safeMetadata: { documentType, fileSize: buffer.length } } });
      if (finalDocument) await tx.notification.create({ data: { userId: application.customerId, type: "FINAL_DOCUMENT", title: "Company document available", message: "A completed company document is available in your dashboard.", relatedEntity: applicationId } });
      return document;
    });
    return json({ document: { id: created.id, applicationId, documentType, ownerId, reviewStatus: created.reviewStatus, originalFilename: created.originalFilename, fileSize: created.fileSize } }, 201);
  } catch (error) {
    if (storageKey) await removeDocument(storageKey);
    return handleError(error);
  }
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const user = await actor(request);
    const [id] = (await context.params).segments;
    const document = await db.document.findUnique({ where: { id }, select: { id: true, applicationId: true, originalFilename: true, privateStorageKey: true, mimeType: true, reviewStatus: true, application: { select: { customerId: true } } } });
    if (!document) throw new ApiError(404, "Document not found");
    if (user.role !== "OWNER" && (user.role !== "CLIENT" || document.application.customerId !== user.id)) throw new ApiError(403, "Not authorized");
    if (user.role === "CLIENT" && !["ACCEPTED", "COMPLETED_COMPANY_DOCUMENT"].includes(document.reviewStatus)) throw new ApiError(403, "Document is not available for download");
    const bytes = await loadDocument(document.privateStorageKey);
    await db.auditLog.create({ data: { actorUserId: user.id, action: "DOCUMENT_DOWNLOADED", resourceType: "Document", resourceId: id } });
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${safeFilename(document.originalFilename)}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return handleError(error); }
}
