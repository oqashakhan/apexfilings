import 'server-only';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { ApiError, type Actor } from './http';
import { emailHtml, queueEmail, queueNotification } from './mail';

export const documentMetadata = z.object({ title: z.string().trim().min(1).max(160).optional(), description: z.string().trim().max(2000).nullable().optional() });
export function canManageDocument(user: Pick<Actor, 'id' | 'role'>, application: { assignedStaffId: string | null }) {
  return user.role === 'OWNER' || (user.role === 'STAFF' && application.assignedStaffId === user.id);
}
export function documentView(document: { id: string; applicationId: string; companyId: string; title: string | null; description: string | null; documentType: string; originalFilename: string; fileSize: number; reviewStatus: string; clientVisible: boolean; createdAt: Date }) {
  return { id: document.id, applicationId: document.applicationId, companyId: document.companyId, title: document.title ?? document.originalFilename, description: document.description, documentType: document.documentType, originalFilename: document.originalFilename, fileSize: document.fileSize, reviewStatus: document.reviewStatus, clientVisible: document.clientVisible, createdAt: document.createdAt };
}
export async function publishDocumentNotice(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR UPDATE`;
  const document = await tx.document.findUniqueOrThrow({ where: { id }, include: { application: { include: { company: true, customer: { include: { notificationPreference: true } } } } } });
  if (document.companyId !== document.application.companyId || document.application.company.customerId !== document.application.customerId) throw new ApiError(409, 'Document ownership requires review');
  if (!document.clientVisible || document.reviewStatus !== 'COMPLETED_COMPANY_DOCUMENT') return 'private';
  const key = `document-final:${id}`;
  // Preserve the historical initial-upload and share keys; never re-notify legacy publications.
  const oldKeys = { OR: [{ eventKey: key }, { eventKey: { startsWith: `document-share:${id}:` } }] };
  const [notification, email] = await Promise.all([tx.notification.findFirst({ where: oldKeys, select: { id: true } }), tx.emailOutbox.findFirst({ where: oldKeys, select: { id: true } })]);
  if (notification || email) return 'already-notified';
  const customer = document.application.customer;
  const sendEmail = customer.notificationPreference?.documentEmail !== false;
  if (sendEmail && (!customer.emailVerifiedAt || customer.status !== 'ACTIVE')) throw new ApiError(409, 'The client must have an active account and verified email before publication. Save as Admin-only, then publish after verification.');
  const origin = new URL(process.env.APP_ORIGIN ?? 'http://localhost:3001');
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:' && !(process.env.TEST_EMAIL_OUTBOX === '1' && ['localhost','127.0.0.1'].includes(origin.hostname)))) throw new ApiError(503, 'Secure dashboard links are not configured');
  const href = `${origin.origin}/client/documents?document=${encodeURIComponent(id)}`;
  const title = document.title ?? document.originalFilename;
  const company = document.application.company.preferredName;
  await queueNotification(tx, key, customer.id, 'COMPANY_DOCUMENT_READY', 'Company document ready', `${title} for ${company} is ready in your secure Documents page.`, id);
  if (sendEmail) await queueEmail(tx, key, customer.email, 'Your company document is ready — Apex Filings', emailHtml('Your company document is ready', [`Company: ${company}`, `Document: ${title}`, 'Sign in to view or download your document. Private documents are never attached to email.'], { label: 'View company document', href }));
  return sendEmail ? 'queued' : 'email-disabled';
}

export async function updateCompanyDocument(user: Actor, id: string, raw: unknown) {
  const input = documentMetadata.extend({ clientVisible: z.boolean().optional() }).refine(value => Object.values(value).some(v => v !== undefined), 'No changes provided').parse(raw);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR UPDATE`;
    const document = await tx.document.findUnique({ where: { id }, include: { uploadedBy: { select: { role: true } }, application: { select: { assignedStaffId: true, companyId: true } } } });
    if (!document) throw new ApiError(404, 'Document not found');
    if (!canManageDocument(user, document.application)) throw new ApiError(403, 'Not authorized');
    if (!['OWNER','STAFF'].includes(document.uploadedBy.role) || document.reviewStatus !== 'COMPLETED_COMPANY_DOCUMENT' || document.companyId !== document.application.companyId) throw new ApiError(409, 'Only completed company documents can be edited or published');
    const changed = input.clientVisible !== undefined && input.clientVisible !== document.clientVisible;
    const updated = await tx.document.update({ where: { id }, data: input });
    if (changed || input.title !== undefined || input.description !== undefined) await tx.auditLog.create({ data: { actorUserId: user.id, action: changed ? 'DOCUMENT_VISIBILITY_CHANGED' : 'DOCUMENT_METADATA_UPDATED', resourceType: 'Document', resourceId: id, safeMetadata: { clientVisible: updated.clientVisible } } });
    const publication = changed && updated.clientVisible ? await publishDocumentNotice(tx, id) : 'unchanged';
    return { document: documentView(updated), publication };
  });
}
