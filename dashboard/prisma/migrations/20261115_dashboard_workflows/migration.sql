-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "marketingEmailConsent" TEXT,
ADD COLUMN     "staffScope" TEXT NOT NULL DEFAULT 'OPERATIONS';

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CustomerResponse" ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentRequest" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customTitle" TEXT,
ADD COLUMN     "dueDate" DATE;

-- CreateTable
CREATE TABLE "PricingDraft" (
    "kind" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "baseUpdatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingDraft_pkey" PRIMARY KEY ("kind","recordId")
);

-- CreateTable
CREATE TABLE "EmailBroadcast" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "selectedIds" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EmailBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "outboxId" TEXT,
    "suppressedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastSuppression" (
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastSuppression_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_outboxId_key" ON "BroadcastRecipient"("outboxId");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_unsubscribeToken_key" ON "BroadcastRecipient"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_broadcastId_outboxId_idx" ON "BroadcastRecipient"("broadcastId", "outboxId");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_userId_key" ON "BroadcastRecipient"("broadcastId", "userId");

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "EmailBroadcast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "EmailOutbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
