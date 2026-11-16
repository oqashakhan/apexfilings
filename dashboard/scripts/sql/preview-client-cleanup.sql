-- Run with psql against the inspected production database using a read-only role.
-- Output contains private customer information. Store it securely.
BEGIN READ ONLY;

SELECT id, role, "fullName", email, "clientReference", status, "createdAt"
FROM "User" ORDER BY role, "createdAt", id;

SELECT u.id, u."fullName", u.email, u."clientReference",
  (SELECT count(*) FROM "Company" c WHERE c."customerId"=u.id) AS companies,
  (SELECT count(*) FROM "Application" a WHERE a."customerId"=u.id) AS applications,
  (SELECT count(*) FROM "Document" d JOIN "Application" a ON a.id=d."applicationId" WHERE a."customerId"=u.id) AS documents,
  (SELECT count(*) FROM "Order" o JOIN "Application" a ON a.id=o."applicationId" WHERE a."customerId"=u.id) AS orders,
  (SELECT count(*) FROM "Invoice" i JOIN "Order" o ON o.id=i."orderId" JOIN "Application" a ON a.id=o."applicationId" WHERE a."customerId"=u.id) AS invoices,
  (SELECT count(*) FROM "Payment" p JOIN "Order" o ON o.id=p."orderId" JOIN "Application" a ON a.id=o."applicationId" WHERE a."customerId"=u.id) AS payments,
  (SELECT count(*) FROM "Payment" p JOIN "Order" o ON o.id=p."orderId" JOIN "Application" a ON a.id=o."applicationId" WHERE a."customerId"=u.id AND p."verifiedAt" IS NOT NULL) AS verified_payments,
  (SELECT count(*) FROM "RefundRequest" r JOIN "Order" o ON o.id=r."orderId" JOIN "Application" a ON a.id=o."applicationId" WHERE a."customerId"=u.id) AS refunds,
  (SELECT count(*) FROM "SupportTicket" t WHERE t."customerId"=u.id) AS support_tickets,
  (SELECT count(*) FROM "SupportReply" r JOIN "SupportTicket" t ON t.id=r."ticketId" WHERE t."customerId"=u.id) AS support_replies,
  (SELECT count(*) FROM "Notification" n WHERE n."userId"=u.id) AS notifications,
  (SELECT count(*) FROM "AuditLog" l WHERE l."actorUserId"=u.id) AS actor_audit_events,
  (SELECT count(*) FROM "ServiceRequest" s WHERE s."customerId"=u.id) AS service_requests
FROM "User" u WHERE u.role='CLIENT' ORDER BY u."createdAt",u.id;

-- Check optional tables before querying them; these may not yet exist in production.
SELECT to_regclass('"ChatConversation"') AS chat_conversation_table,
       to_regclass('"ChatMessage"') AS chat_message_table,
       to_regclass('"InvoiceLineItem"') AS invoice_line_item_table,
       to_regclass('"BroadcastRecipient"') AS broadcast_recipient_table;

-- Inspect every actual foreign key, including locally added or legacy dependencies.
SELECT conrelid::regclass AS referencing_table, conname,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype='f' AND confrelid IN (
  '"User"'::regclass, '"Company"'::regclass, '"Application"'::regclass,
  '"Order"'::regclass, '"Invoice"'::regclass, '"SupportTicket"'::regclass
) ORDER BY 1,2;
COMMIT;
