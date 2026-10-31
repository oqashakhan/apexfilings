CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportReply" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_customerId_createdAt_idx" ON "SupportTicket"("customerId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportReply_ticketId_createdAt_idx" ON "SupportReply"("ticketId", "createdAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportReply" ADD CONSTRAINT "SupportReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportReply" ADD CONSTRAINT "SupportReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
