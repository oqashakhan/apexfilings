BEGIN;
ALTER TABLE "Invoice" ADD COLUMN "stripeInvoiceNumber" TEXT,
 ADD COLUMN "lifecycle" TEXT NOT NULL DEFAULT 'DRAFT', ADD COLUMN "snapshot" JSONB,
 ADD COLUMN "dueAt" TIMESTAMP(3), ADD COLUMN "subtotalCents" INTEGER,
 ADD COLUMN "taxCents" INTEGER, ADD COLUMN "discountCents" INTEGER,
 ADD COLUMN "totalCents" INTEGER, ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
 ADD COLUMN "voidReason" TEXT, ADD COLUMN "voidedAt" TIMESTAMP(3);
-- Existing invoice numbers, dates and provider URLs are not rewritten. Their
-- original parties/line snapshots cannot be reconstructed silently from today's data.
UPDATE "Invoice" SET "lifecycle"='LEGACY' WHERE "issuedAt" IS NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_lifecycle_check" CHECK ("lifecycle" IN ('DRAFT','ISSUED','VOIDED','LEGACY'));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_total_check" CHECK ("totalCents" IS NULL OR "totalCents">=0);
CREATE SEQUENCE apex_invoice_number_seq NO CYCLE;
CREATE SEQUENCE apex_credit_note_number_seq NO CYCLE;
CREATE TABLE "InvoiceSettings" ("id" TEXT PRIMARY KEY DEFAULT 'default', "data" JSONB NOT NULL, "approvedAt" TIMESTAMP(3), "approvedById" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "InvoiceCreditNote" ("id" TEXT PRIMARY KEY, "invoiceId" TEXT NOT NULL, "refundId" TEXT NOT NULL UNIQUE, "number" TEXT NOT NULL UNIQUE, "amountCents" INTEGER NOT NULL CHECK ("amountCents">0), "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "snapshot" JSONB NOT NULL,
 CONSTRAINT "InvoiceCreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT,
 CONSTRAINT "InvoiceCreditNote_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundRequest"("id") ON DELETE RESTRICT);
CREATE INDEX "Invoice_lifecycle_dueAt_idx" ON "Invoice"("lifecycle","dueAt");
CREATE FUNCTION apex_invoice_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invoices must be retained'; END IF;
 IF NEW.number IS DISTINCT FROM OLD.number OR NEW."orderId" IS DISTINCT FROM OLD."orderId" THEN RAISE EXCEPTION 'Invoice identity is permanent'; END IF;
 IF OLD.lifecycle='VOIDED' AND NEW.lifecycle<>'VOIDED' THEN RAISE EXCEPTION 'Voided invoices cannot be reopened'; END IF;
 IF OLD.lifecycle='ISSUED' AND NEW.lifecycle NOT IN ('ISSUED','VOIDED') THEN RAISE EXCEPTION 'Issued invoices cannot become drafts'; END IF;
 IF OLD.lifecycle IN ('ISSUED','VOIDED') AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt" OR NEW."dueAt" IS DISTINCT FROM OLD."dueAt" OR NEW."totalCents" IS DISTINCT FROM OLD."totalCents" OR NEW."subtotalCents" IS DISTINCT FROM OLD."subtotalCents" OR NEW."taxCents" IS DISTINCT FROM OLD."taxCents" OR NEW."discountCents" IS DISTINCT FROM OLD."discountCents" OR NEW.currency IS DISTINCT FROM OLD.currency) THEN RAISE EXCEPTION 'Issued invoice content is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "Invoice_immutable" BEFORE UPDATE OR DELETE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION apex_invoice_immutable();
CREATE FUNCTION apex_credit_note_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Issued credit notes are immutable'; END; $$;
CREATE TRIGGER "InvoiceCreditNote_immutable" BEFORE UPDATE OR DELETE ON "InvoiceCreditNote" FOR EACH ROW EXECUTE FUNCTION apex_credit_note_immutable();
COMMIT;
