BEGIN;
CREATE TABLE "InvoiceLineItem" (
 "id" TEXT PRIMARY KEY, "invoiceId" TEXT NOT NULL REFERENCES "Invoice"("id") ON DELETE RESTRICT,
 "position" INTEGER NOT NULL, "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity">0),
 "unitCents" INTEGER, "amountCents" INTEGER, "kind" TEXT NOT NULL DEFAULT 'CHARGE', "approved" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "InvoiceLineItem_invoiceId_position_key" ON "InvoiceLineItem"("invoiceId","position");
-- Copy only existing document snapshots. Never reconstruct issued documents from current prices.
INSERT INTO "InvoiceLineItem" ("id","invoiceId","position","description","quantity","unitCents","amountCents","approved")
SELECT i.id||'-item-'||a.n, i.id, (a.n-1)::int, a.v->>'description', (a.v->>'quantity')::int,
 (a.v->>'unitCents')::int, (a.v->>'amountCents')::int, true
FROM "Invoice" i CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.snapshot->'items','[]'::jsonb)) WITH ORDINALITY a(v,n);
CREATE TABLE "PaymentAttempt" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
 "key" TEXT NOT NULL UNIQUE, "sessionId" TEXT UNIQUE, "amountCents" INTEGER NOT NULL CHECK ("amountCents">0),
 "status" TEXT NOT NULL DEFAULT 'CREATING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId","createdAt");
-- Payment attempts and order links are additive; no financial or customer records are deleted.
CREATE FUNCTION apex_invoice_line_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "Invoice" WHERE id=OLD."invoiceId" AND lifecycle IN ('ISSUED','VOIDED')) THEN RAISE EXCEPTION 'Issued invoice rows are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "InvoiceLineItem_immutable" BEFORE UPDATE OR DELETE ON "InvoiceLineItem" FOR EACH ROW EXECUTE FUNCTION apex_invoice_line_immutable();
COMMIT;
