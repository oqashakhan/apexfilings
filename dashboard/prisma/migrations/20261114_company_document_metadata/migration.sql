BEGIN;
-- Additive only: existing documents retain their filenames and storage keys.
ALTER TABLE "Document"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "uploadKey" TEXT,
  ADD COLUMN "uploadFingerprint" TEXT;
CREATE UNIQUE INDEX "Document_uploadKey_key" ON "Document"("uploadKey");
COMMIT;
