ALTER TABLE "SupportTicket"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';

ALTER TABLE "SupportReply" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "SupportTicket_idempotencyKey_key" ON "SupportTicket"("idempotencyKey");
CREATE UNIQUE INDEX "SupportReply_idempotencyKey_key" ON "SupportReply"("idempotencyKey");
CREATE INDEX "SupportTicket_assignedToId_status_updatedAt_idx" ON "SupportTicket"("assignedToId", "status", "updatedAt");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SupportInternalNote" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportInternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportInternalNote_ticketId_createdAt_idx" ON "SupportInternalNote"("ticketId", "createdAt");
ALTER TABLE "SupportInternalNote" ADD CONSTRAINT "SupportInternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportInternalNote" ADD CONSTRAINT "SupportInternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
