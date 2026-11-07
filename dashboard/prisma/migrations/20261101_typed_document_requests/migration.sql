CREATE TABLE "DocumentRequest" (
  "id" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "ownerId" TEXT,
  "reason" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentRequest_requestKey_key" ON "DocumentRequest"("requestKey");
CREATE INDEX "DocumentRequest_applicationId_createdAt_idx" ON "DocumentRequest"("applicationId", "createdAt");
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "Document_requestId_key" ON "Document"("requestId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
