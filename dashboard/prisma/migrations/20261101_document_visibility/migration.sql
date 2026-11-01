ALTER TABLE "Document" ADD COLUMN "clientVisible" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Document" SET "clientVisible" = true WHERE "reviewStatus" = 'COMPLETED_COMPANY_DOCUMENT' OR "uploadedById" IN (SELECT "customerId" FROM "Application" WHERE "Application"."id" = "Document"."applicationId");
