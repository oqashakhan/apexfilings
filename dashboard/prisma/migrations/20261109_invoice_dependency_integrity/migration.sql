-- Forward-only correction: older hand-written migrations omitted Prisma's
-- ON UPDATE CASCADE default on these five relations. No rows/IDs are changed.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
DO $$ DECLARE r record; actual record; BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('InvoiceLineItem','invoiceId','Invoice'),
 ('PaymentAttempt','orderId','Order'),
 ('InvoiceCreditNote','invoiceId','Invoice'),
 ('InvoiceCreditNote','refundId','RefundRequest'),
 ('ClientReferenceHistory','userId','User')
 ) AS targets(tab,col,parent) LOOP
  IF to_regclass(format('public.%I',r.tab)) IS NULL THEN
   RAISE EXCEPTION 'Missing prerequisite table %. Complete the invoice recovery runbook before deploy',r.tab;
  END IF;
  SELECT c.* INTO actual FROM pg_constraint c
  WHERE c.conrelid=to_regclass(format('public.%I',r.tab)) AND c.contype='f'
    AND c.conname=r.tab||'_'||r.col||'_fkey';
  IF actual.oid IS NULL OR actual.confrelid<>to_regclass(format('public.%I',r.parent))
   OR actual.confdeltype<>'r' OR NOT actual.convalidated
   OR actual.conkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=actual.conrelid AND attname=r.col)]::smallint[]
   OR actual.confkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=actual.confrelid AND attname='id')]::smallint[]
  THEN RAISE EXCEPTION 'Unexpected parent constraint for %.%; review before changing it',r.tab,r.col; END IF;
  IF actual.confupdtype<>'c' THEN
   -- ClientReferenceHistory reserves a reference BEFORE the User insert.
   -- Its deferred FK is essential; preserve deferrability on every relation.
   EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I, ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE RESTRICT ON UPDATE CASCADE %s',r.tab,actual.conname,actual.conname,r.col,r.parent,
    CASE WHEN actual.condeferrable THEN CASE WHEN actual.condeferred THEN 'DEFERRABLE INITIALLY DEFERRED' ELSE 'DEFERRABLE INITIALLY IMMEDIATE' END ELSE 'NOT DEFERRABLE' END);
  END IF;
 END LOOP;
END $$;
COMMIT;
