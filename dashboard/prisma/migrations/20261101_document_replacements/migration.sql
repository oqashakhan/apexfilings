ALTER TABLE "Document" ADD COLUMN "replacesDocumentId" TEXT;
ALTER TABLE "Document" ADD COLUMN "reviewReason" TEXT;
CREATE UNIQUE INDEX "Document_replacesDocumentId_key" ON "Document"("replacesDocumentId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_replacesDocumentId_fkey" FOREIGN KEY ("replacesDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
