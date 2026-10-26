ALTER TABLE "CustomerResponse" ADD COLUMN "requestEventId" TEXT NOT NULL;
CREATE UNIQUE INDEX "CustomerResponse_requestEventId_key" ON "CustomerResponse"("requestEventId");
