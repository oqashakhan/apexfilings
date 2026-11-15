import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { ApiError } from './http';
import { activityActions, activityCategories, activityDetail, actorLabels, type ActivityItem, type ActivityCategory } from '@/lib/admin-activity';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).default(''), category: z.enum(['ALL', ...Object.keys(activityCategories) as ActivityCategory[]]).default('ALL'),
  actor: z.enum(['ALL','OWNER','STAFF','CLIENT','SYSTEM']).default('ALL'), sort: z.enum(['newest','oldest']).default('newest'),
  from: day.optional(), to: day.optional(), asOf: z.iso.datetime().optional(),
});
type Row = { id: string; action: string; category: ActivityCategory; label: string; createdAt: Date; actorName: string | null; actorRole: string; customerId: string | null; customerName: string | null; clientReference: string | null; companyName: string | null; applicationId: string | null; orderId: string | null; invoiceId: string | null; ticketId: string | null; resourceType: string; resourceId: string; recordName: string | null; previous: string | null; next: string | null; status: string | null; check: string | null; visible: string | null };
export async function adminActivities(params: URLSearchParams) {
  const input = querySchema.parse(Object.fromEntries(params));
  if (input.from && input.to && input.from > input.to) throw new ApiError(400, 'Start date must be before the end date');
  const asOf = input.asOf ? new Date(input.asOf) : new Date();
  if (asOf.getTime() > Date.now() + 60000) throw new ApiError(400, 'Invalid activity snapshot time');
  // Prisma stores these timestamps without a time zone, in UTC. Bind ISO text
  // explicitly as timestamp to avoid the PostgreSQL session time zone shifting bounds.
  const conditions = [Prisma.sql`a."createdAt" <= ${asOf.toISOString()}::timestamp`];
  if (input.from) conditions.push(Prisma.sql`a."createdAt" >= ${new Date(input.from).toISOString()}::timestamp`);
  if (input.to) conditions.push(Prisma.sql`a."createdAt" < ${new Date(new Date(input.to).getTime() + 86400000).toISOString()}::timestamp`);
  if (input.category !== 'ALL') conditions.push(Prisma.sql`COALESCE(labels.category,'OTHER') = ${input.category}`);
  if (input.actor !== 'ALL') conditions.push(Prisma.sql`COALESCE(actor.role::text,'SYSTEM') = ${input.actor}`);
  if (input.search) {
    // Escape LIKE metacharacters: a literal '%' must never become a wildcard search.
    const search = `%${input.search.replace(/[\\%_]/g, c => `\\${c}`)}%`;
    conditions.push(Prisma.sql`concat_ws(' ', COALESCE(actor."fullName",'System / unrecorded actor'), COALESCE(labels.label,'recorded an administrative action'), customer."fullName", customer."clientReference", company."preferredName", app.id, a."resourceId", ticket.subject, invoice.number, service.name, package.name, state.state) ILIKE ${search}`);
  }
  const source = Prisma.sql`
    WITH labels(action,category,label) AS (VALUES ${Prisma.join(Object.entries(activityActions).map(([action, [category, label]]) => Prisma.sql`(${action},${category},${label})`))})
    SELECT a.id, a.action, COALESCE(labels.category,'OTHER') AS category, COALESCE(labels.label,'recorded an administrative action') AS label, a."createdAt",
      actor."fullName" AS "actorName", COALESCE(actor.role::text,'SYSTEM') AS "actorRole", customer.id AS "customerId", customer."fullName" AS "customerName", customer."clientReference", company."preferredName" AS "companyName",
      app.id AS "applicationId", orders.id AS "orderId", invoice.id AS "invoiceId", ticket.id AS "ticketId", a."resourceType", a."resourceId",
      COALESCE(invoice.number, CASE WHEN document.id IS NOT NULL THEN initcap(replace(document."documentType",'_',' ')) END, ticket.subject, service.name, package.name, state.state) AS "recordName",
      a."safeMetadata"->>'previous' AS previous, COALESCE(a."safeMetadata"->>'next',a."safeMetadata"->>'toStatus') AS next,
      a."safeMetadata"->>'status' AS status, a."safeMetadata"->>'check' AS "check", a."safeMetadata"->>'clientVisible' AS visible
    FROM "AuditLog" a LEFT JOIN labels ON labels.action=a.action
    LEFT JOIN "User" actor ON actor.id=a."actorUserId"
    LEFT JOIN "Document" document ON a."resourceType"='Document' AND document.id=a."resourceId"
    LEFT JOIN "DocumentRequest" request ON a."resourceType"='DocumentRequest' AND request.id=a."resourceId"
    LEFT JOIN "Payment" payment ON a."resourceType"='Payment' AND payment.id=a."resourceId"
    LEFT JOIN "RefundRequest" refund ON a."resourceType"='RefundRequest' AND refund.id=a."resourceId"
    LEFT JOIN "Invoice" invoice ON a."resourceType"='Invoice' AND invoice.id=a."resourceId"
    LEFT JOIN "Order" orders ON orders.id=COALESCE(CASE WHEN a."resourceType"='Order' THEN a."resourceId" END,payment."orderId",refund."orderId",invoice."orderId")
    LEFT JOIN "Application" app ON app.id=COALESCE(CASE WHEN a."resourceType"='Application' THEN a."resourceId" END,document."applicationId",request."applicationId",orders."applicationId")
    LEFT JOIN "ServiceRequest" service_request ON a."resourceType"='ServiceRequest' AND service_request.id=a."resourceId"
    LEFT JOIN "SupportTicket" ticket ON a."resourceType"='SupportTicket' AND ticket.id=a."resourceId"
    LEFT JOIN "Company" company ON company.id=COALESCE(app."companyId",service_request."companyId",ticket."companyId",CASE WHEN a."resourceType"='Company' THEN a."resourceId" END)
    LEFT JOIN "User" subject ON a."resourceType"='User' AND subject.id=a."resourceId" AND subject.role='CLIENT'
    LEFT JOIN "User" customer ON customer.id=COALESCE(app."customerId",company."customerId",ticket."customerId",subject.id)
    LEFT JOIN "Service" service ON service.id=COALESCE(service_request."serviceId",CASE WHEN a."resourceType" IN ('Service','service') THEN a."resourceId" END)
    LEFT JOIN "Package" package ON a."resourceType" IN ('Package','package') AND package.id=a."resourceId"
    LEFT JOIN "StateFilingFee" state ON a."resourceType"='StateFilingFee' AND state.code=a."resourceId"
    WHERE ${Prisma.join(conditions, ' AND ')}
  `;
  const direction = input.sort === 'oldest' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  // A fixed upper timestamp plus deterministic ID tie-break prevents new inserts
  // from moving records between pages while an Owner browses this result set.
  const result = await db.$transaction(async tx => {
    const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total FROM (${source}) activity`);
    const total = Number(count.total), pageCount = Math.max(1, Math.ceil(total / input.pageSize));
    const page = Math.min(input.page, pageCount);
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`${source} ORDER BY a."createdAt" ${direction}, a.id ${direction} LIMIT ${input.pageSize} OFFSET ${(page - 1) * input.pageSize}`);
    return { total, page, pageCount, rows };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const recordLabels: Record<string, string> = { Application: 'LLC application', Order: 'Formation order', Payment: 'Payment record', RefundRequest: 'Refund request', Document: 'Company document', DocumentRequest: 'Document request', User: 'Client profile', ServiceRequest: 'Additional service request', InvoiceSettings: 'Invoice settings', PaymentInstructions: 'Payment instructions', ContentDraft: 'Website content draft' };
  const items: ActivityItem[] = result.rows.map(row => {
    const actorName = row.actorName?.trim() || actorLabels[row.actorRole] || 'Unrecorded actor';
    const href = row.resourceType === 'Invoice' && row.invoiceId ? `/admin/invoices/${encodeURIComponent(row.invoiceId)}` : row.ticketId ? `/admin/support#ticket-${encodeURIComponent(row.ticketId)}` : row.orderId ? `/admin/orders/${encodeURIComponent(row.orderId)}` : row.applicationId ? `/admin/applications/${encodeURIComponent(row.applicationId)}` : row.resourceType === 'ServiceRequest' ? `/admin/services#request-${encodeURIComponent(row.resourceId)}` : row.customerId ? `/admin/clients/${encodeURIComponent(row.customerId)}` : ['Service','ServiceRequest','Package','StateFilingFee','service','package'].includes(row.resourceType) ? '/admin/services' : row.resourceType === 'InvoiceSettings' ? '/admin/settings' : null;
    return { id: row.id, category: row.category, description: `${actorName} ${row.label}`, actorName, actorRole: actorLabels[row.actorRole] ?? 'Other', companyName: row.companyName, customer: row.customerId ? { id: row.customerId, fullName: row.customerName ?? '', clientReference: row.clientReference } : null, recordName: row.recordName ?? recordLabels[row.resourceType] ?? 'Workspace record', href, timestamp: row.createdAt.toISOString(), detail: activityDetail(row.action, row) };
  });
  return { items, total: result.total, page: result.page, pageCount: result.pageCount, pageSize: input.pageSize, asOf: asOf.toISOString() };
}
