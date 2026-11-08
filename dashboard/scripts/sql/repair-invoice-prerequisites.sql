-- Run with psql -X -v ON_ERROR_STOP=1. No Prisma history is changed here.
-- Completes ALL operations of 20261108_invoice_pricing_and_attempts,
-- not only the table required by the failed adjustment migration.
BEGIN;
SET LOCAL search_path = public, pg_temp;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('apex-invoice-dependency-recovery'));
DO $$ BEGIN
 IF current_database() <> 'apex_filings' AND current_database() NOT LIKE 'apex_invoice_recovery_%' THEN
  RAISE EXCEPTION 'Wrong database: use apex_filings or an isolated apex_invoice_recovery_* test database';
 END IF;
 IF to_regclass('public."Invoice"') IS NULL OR to_regclass('public."Order"') IS NULL THEN
  RAISE EXCEPTION 'Required parent tables are missing; stop and inspect migration history';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public."InvoiceLineItem" (
 "id" TEXT PRIMARY KEY,
 "invoiceId" TEXT NOT NULL REFERENCES public."Invoice"("id") ON DELETE RESTRICT,
 "position" INTEGER NOT NULL,
 "description" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity">0),
 "unitCents" INTEGER,
 "amountCents" INTEGER,
 "kind" TEXT NOT NULL DEFAULT 'CHARGE',
 "approved" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_position_key" ON public."InvoiceLineItem"("invoiceId","position");
CREATE TABLE IF NOT EXISTS public."PaymentAttempt" (
 "id" TEXT PRIMARY KEY,
 "orderId" TEXT NOT NULL REFERENCES public."Order"("id") ON DELETE RESTRICT,
 "key" TEXT NOT NULL UNIQUE,
 "sessionId" TEXT UNIQUE,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents">0),
 "status" TEXT NOT NULL DEFAULT 'CREATING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_createdAt_idx" ON public."PaymentAttempt"("orderId","createdAt");
-- Reject conflicting existing rows rather than overwrite issued financial data.
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM public."Invoice" i
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.snapshot->'items','[]'::jsonb)) WITH ORDINALITY a(v,n)
  JOIN public."InvoiceLineItem" l ON l."invoiceId"=i.id AND l.position=(a.n-1)::int
  WHERE l.description IS DISTINCT FROM a.v->>'description'
    OR l.quantity IS DISTINCT FROM (a.v->>'quantity')::int
    OR l."unitCents" IS DISTINCT FROM (a.v->>'unitCents')::int
    OR l."amountCents" IS DISTINCT FROM (a.v->>'amountCents')::int
    OR NOT l.approved
 ) THEN RAISE EXCEPTION 'Existing invoice rows conflict with frozen snapshots; investigate without overwriting'; END IF;
END $$;
INSERT INTO public."InvoiceLineItem" ("id","invoiceId","position","description","quantity","unitCents","amountCents","approved")
SELECT i.id||'-item-'||a.n,i.id,(a.n-1)::int,a.v->>'description',(a.v->>'quantity')::int,
 (a.v->>'unitCents')::int,(a.v->>'amountCents')::int,true
FROM public."Invoice" i
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.snapshot->'items','[]'::jsonb)) WITH ORDINALITY a(v,n)
ON CONFLICT ("invoiceId","position") DO NOTHING;
-- Do not replace a pre-existing function with an unexpected definition.
DO $outer$ DECLARE body text; expected text := $body$
BEGIN
 IF EXISTS(SELECT 1 FROM "Invoice" WHERE id=OLD."invoiceId" AND lifecycle IN ('ISSUED','VOIDED')) THEN RAISE EXCEPTION 'Issued invoice rows are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $body$;
BEGIN
 SELECT prosrc INTO body FROM pg_proc WHERE oid=to_regprocedure('public.apex_invoice_line_immutable()');
 IF body IS NULL THEN
  EXECUTE 'CREATE FUNCTION public.apex_invoice_line_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS '||quote_literal(expected);
 ELSIF regexp_replace(body,'\s','','g')<>regexp_replace(expected,'\s','','g') THEN
  RAISE EXCEPTION 'Unexpected existing immutability function; stop and review';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public."InvoiceLineItem"'::regclass AND tgname='InvoiceLineItem_immutable' AND NOT tgisinternal) THEN
  EXECUTE 'CREATE TRIGGER "InvoiceLineItem_immutable" BEFORE UPDATE OR DELETE ON public."InvoiceLineItem" FOR EACH ROW EXECUTE FUNCTION public.apex_invoice_line_immutable()';
 END IF;
END $outer$;
COMMIT;
