import { createHash } from "node:crypto";
import { z } from "zod";
import { canManageDocument, documentMetadata, documentView, publishDocumentNotice, updateCompanyDocument } from "@/server/document-publication";
import { isIdentityDocument } from "@/lib/identity-documents";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { actor, assertVerifiedClient, body, ApiError, checkOrigin, handleError, json } from "@/server/http";
import { loadDocument, maxDocumentBytes, removeDocument, safeFilename, storeDocument, validateDocument } from "@/server/storage";
import { emailHtml, queueEmail, queueNotification } from "@/server/mail";

export const runtime = "nodejs";
type Params = { params: Promise<{ segments: string[] }> };

export async function POST(request: NextRequest, context: Params) {
  let storageKey: string | null = null;
  try {
    checkOrigin(request);
    const user = await actor(request);
    assertVerifiedClient(user);
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
    const replacesDocumentId = String(data.get("replacesDocumentId") ?? "") || null;
    const requirementId = String(data.get("requirementId") ?? "") || null;
    const requestId = String(data.get("requestId") ?? "") || null;
    const documentType = String(data.get("documentType") ?? "").trim();
    const finalDocument = data.get("finalDocument") === "true";
    const shareWithClient = data.get("shareWithClient") === "true";
    if (data.has("shareWithClient") && !["true", "false"].includes(String(data.get("shareWithClient")))) throw new ApiError(400, "Choose whether the document is visible to the client");
    if (!(file instanceof File) || !applicationId || !/^[A-Z_]{3,60}$/.test(documentType)) throw new ApiError(400, "Invalid document request");
    if (file.size === 0 || file.size > maxDocumentBytes) throw new ApiError(400, "File must be between 1 byte and 8 MB");
    const application = await db.application.findUnique({ where: { id: applicationId }, include: { company: { include: { owners: true } } } });
    if (!application) throw new ApiError(404, "Application not found");
    const manage = canManageDocument(user, application);
    if (!manage && (user.role !== "CLIENT" || application.customerId !== user.id)) throw new ApiError(403, "Not authorized");
    if (finalDocument && !manage) throw new ApiError(403, "Not authorized");
    if (!finalDocument && user.role === "CLIENT" && !["DRAFT", "INFORMATION_REQUIRED", "ADDITIONAL_ACTION_REQUIRED"].includes(application.status) && !((replacesDocumentId || requestId) && !["COMPLETED", "CANCELLED", "REFUNDED", "REFUND_REQUESTED"].includes(application.status))) throw new ApiError(409, "Document upload is not available at this stage");
    if (replacesDocumentId && user.role !== "CLIENT") throw new ApiError(400, "Only the client can replace a requested document");
    if ([requirementId, requestId, replacesDocumentId].filter(Boolean).length > 1) throw new ApiError(400, "Choose one document request");
    if (requestId) {
      const requested = await db.documentRequest.findFirst({ where: { id: requestId, applicationId, documentType: isIdentityDocument(documentType) ? {in:[documentType,"OWNER_ID"]} : documentType, ownerId, cancelledAt:null, documents: { none: {} } } });
      if (!requested || user.role !== "CLIENT") throw new ApiError(409, "Document request is no longer available");
    }
    if (requirementId) {
      const requirement = await db.serviceDocumentRequirement.findFirst({ where: { id: requirementId, serviceId: application.serviceId, documentType, required: true, OR: [{ stateCode: null }, { stateCode: application.company.formationState }] } });
      if (!requirement || user.role !== "CLIENT") throw new ApiError(409, "Document requirement is no longer available");
    }
    if (replacesDocumentId) {
      const request = await db.document.findFirst({ where: { id: replacesDocumentId, applicationId, reviewStatus: "REPLACEMENT_REQUIRED", replacement: null } });
      if (!request || request.documentType !== documentType || request.ownerId !== ownerId) throw new ApiError(409, "Document replacement request is no longer available");
    }
    if (ownerId && !application.company.owners.some((owner) => owner.id === ownerId)) throw new ApiError(400, "Owner does not belong to this application");
    if (isIdentityDocument(documentType) && !ownerId) throw new ApiError(400, "Select an owner for identification");
    if (data.get("companyId") && data.get("companyId") !== application.companyId) throw new ApiError(400, "The company does not match the selected application");
    if (data.get("customerId") && data.get("customerId") !== application.customerId) throw new ApiError(400, "The client does not match the selected application");
    if (application.company.customerId !== application.customerId) throw new ApiError(409, "Company ownership requires review");
    const metadata = finalDocument ? documentMetadata.parse({ ...(data.has("title") ? { title: data.get("title") } : {}), ...(data.has("description") ? { description: data.get("description") } : {}) }) : {};
    const key = data.get("idempotencyKey");
    const uploadKey = key === null ? null : `${user.id}:${z.uuid().parse(key)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const identified = validateDocument(buffer, file.type);
    const fingerprint = createHash("sha256").update(JSON.stringify({ applicationId, companyId: application.companyId, ownerId, replacesDocumentId, requestId, documentType, finalDocument, shareWithClient, metadata, filename: safeFilename(file.name), content: createHash("sha256").update(buffer).digest("hex") })).digest("hex");
    if (uploadKey) {
      const previous = await db.document.findUnique({ where: { uploadKey } });
      if (previous) {
        if (previous.uploadFingerprint !== fingerprint) throw new ApiError(409, "This upload retry key belongs to a different file or form. Start a new upload.");
        return json({ document: { ...documentView(previous), ownerId: previous.ownerId, replacesDocumentId: previous.replacesDocumentId }, duplicate: true }, 200);
      }
    }
    storageKey = await storeDocument(buffer, identified.ext);
    const created = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Application" WHERE id=${applicationId} FOR SHARE`;
      const current = await tx.application.findUniqueOrThrow({ where: { id: applicationId }, select: { customerId: true, companyId: true, assignedStaffId: true } });
      if (current.customerId !== application.customerId || current.companyId !== application.companyId || (finalDocument ? !canManageDocument(user, current) : !canManageDocument(user, current) && (user.role !== "CLIENT" || current.customerId !== user.id))) throw new ApiError(403, "Application access changed. Refresh and try again.");
      if (uploadKey) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document-upload:${uploadKey}`}))`;
        const previous = await tx.document.findUnique({ where: { uploadKey } });
        if (previous) {
          if (previous.uploadFingerprint !== fingerprint) throw new ApiError(409, "Upload retry key was reused with different data");
          return { document: previous, duplicate: true, publication: "already-notified" };
        }
      }
      if(requestId && !await tx.documentRequest.count({where:{id:requestId,applicationId,cancelledAt:null,documents:{none:{}}}})) throw new ApiError(409,"This document request is no longer available.");
      const document = await tx.document.create({ data: { ...metadata, uploadKey, uploadFingerprint: uploadKey ? fingerprint : null, applicationId, companyId: application.companyId, ownerId, uploadedById: user.id, documentType, replacesDocumentId, requestId, originalFilename: safeFilename(file.name), privateStorageKey: storageKey!, mimeType: identified.mime, fileSize: buffer.length, clientVisible: user.role === "CLIENT" || (finalDocument && shareWithClient), reviewStatus: finalDocument ? "COMPLETED_COMPANY_DOCUMENT" : "UNDER_REVIEW" } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: "DOCUMENT_UPLOADED", resourceType: "Document", resourceId: document.id, safeMetadata: { documentType, fileSize: buffer.length } } });
      const publication = finalDocument && shareWithClient ? await publishDocumentNotice(tx, document.id) : "private";
      if (!finalDocument && user.role === "CLIENT") {
        const owners = await tx.user.findMany({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
        for (const owner of owners) await queueNotification(tx, `document-upload:${document.id}:${owner.id}`, owner.id, "DOCUMENT_UPLOADED", "Customer document uploaded", `A document was uploaded for ${application.company.preferredName}.`, applicationId);
        if (process.env.ADMIN_NOTIFICATION_EMAIL) await queueEmail(tx, `document-upload:${document.id}:admin`, process.env.ADMIN_NOTIFICATION_EMAIL, "Customer document uploaded — Apex Filings", emailHtml("Document needs review", [`Company: ${application.company.preferredName}`, `Application reference: ${applicationId}`, "Open the secure dashboard to review. Private documents are never attached to email."], { label: "Review documents", href: `${process.env.APP_ORIGIN ?? "http://localhost:3001"}/admin/applications/${applicationId}` }));
      }
      return { document, duplicate: false, publication };
    });
    if (created.duplicate && storageKey) await removeDocument(storageKey);
    storageKey = null; // A committed file is now owned by its database record.
    return json({ document: { ...documentView(created.document), ownerId: created.document.ownerId, replacesDocumentId: created.document.replacesDocumentId }, duplicate: created.duplicate, publication: created.publication }, created.duplicate ? 200 : 201);
  } catch (error) {
    if (storageKey) await removeDocument(storageKey);
    return handleError(error);
  }
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const user = await actor(request);
    assertVerifiedClient(user);
    const [id] = (await context.params).segments;
    const document = await db.document.findUnique({ where: { id }, select: { id: true, applicationId: true, companyId: true, company: { select: { customerId: true } }, originalFilename: true, privateStorageKey: true, mimeType: true, reviewStatus: true, clientVisible: true, application: { select: { customerId: true, companyId: true, assignedStaffId: true } } } });
    if (!document) throw new ApiError(404, "Document not found");
    if (document.companyId !== document.application.companyId || document.company.customerId !== document.application.customerId) throw new ApiError(409, "Document ownership requires review");
    if (!canManageDocument(user, document.application) && (user.role !== "CLIENT" || document.application.customerId !== user.id)) throw new ApiError(403, "Not authorized");
    if (user.role === "CLIENT" && (!document.clientVisible || !["ACCEPTED", "COMPLETED_COMPANY_DOCUMENT"].includes(document.reviewStatus))) throw new ApiError(403, "Document is not available for download");
    const bytes = await loadDocument(document.privateStorageKey);
    await db.auditLog.create({ data: { actorUserId: user.id, action: "DOCUMENT_DOWNLOADED", resourceType: "Document", resourceId: id } });
    const inline = new URL(request.url).searchParams.get("view") === "1" && ["application/pdf", "image/jpeg", "image/png"].includes(document.mimeType);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": inline ? document.mimeType : "application/octet-stream", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFilename(document.originalFilename)}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    checkOrigin(request);
    const user = await actor(request);
    const [id] = (await context.params).segments;
    if (!["OWNER", "STAFF"].includes(user.role)) throw new ApiError(403, "Not authorized");
    return json(await updateCompanyDocument(user, id, await body(request)));
  } catch (error) { return handleError(error); }
}
