-- Assertion gate BEFORE resolving 20261108_invoice_pricing_and_attempts.
-- Run with psql -X -v ON_ERROR_STOP=1. Exits on missing/conflicting objects.
BEGIN;
SET LOCAL search_path=public,pg_temp;
DO $$ DECLARE missing text; BEGIN
 IF to_regclass('public."InvoiceSettings"') IS NULL OR to_regclass('public."InvoiceCreditNote"') IS NULL
 OR to_regclass('public.apex_invoice_number_seq') IS NULL OR to_regclass('public.apex_credit_note_number_seq') IS NULL
 THEN RAISE EXCEPTION 'Professional invoice parent tables/numbering sequences are missing; inspect earlier migration drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public."Invoice"'::regclass AND tgname='Invoice_immutable' AND NOT tgisinternal AND tgenabled IN ('O','A') AND tgfoid=to_regprocedure('public.apex_invoice_immutable()'))
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public."InvoiceCreditNote"'::regclass AND tgname='InvoiceCreditNote_immutable' AND NOT tgisinternal AND tgenabled IN ('O','A') AND tgfoid=to_regprocedure('public.apex_credit_note_immutable()'))
 THEN RAISE EXCEPTION 'Existing invoice/credit-note immutability protection is missing; stop and inspect'; END IF;
 SELECT string_agg(t||'.'||c,', ') INTO missing FROM (VALUES
 ('InvoiceLineItem','id','text',false),('InvoiceLineItem','invoiceId','text',false),
 ('InvoiceLineItem','position','int4',false),('InvoiceLineItem','description','text',false),
 ('InvoiceLineItem','quantity','int4',false),('InvoiceLineItem','unitCents','int4',true),
 ('InvoiceLineItem','amountCents','int4',true),('InvoiceLineItem','kind','text',false),('InvoiceLineItem','approved','bool',false),
 ('PaymentAttempt','id','text',false),('PaymentAttempt','orderId','text',false),('PaymentAttempt','key','text',false),
 ('PaymentAttempt','sessionId','text',true),('PaymentAttempt','amountCents','int4',false),
 ('PaymentAttempt','status','text',false),('PaymentAttempt','createdAt','timestamp',false),('PaymentAttempt','updatedAt','timestamp',false)
 ) expected(t,c,typ,nullable)
 WHERE NOT EXISTS(SELECT 1 FROM information_schema.columns x WHERE x.table_schema='public' AND x.table_name=t AND x.column_name=c AND x.udt_name=typ AND (x.is_nullable='YES')=nullable);
 IF missing IS NOT NULL THEN RAISE EXCEPTION 'Missing or incompatible columns: %',missing; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='InvoiceLineItem' AND column_name='quantity' AND column_default='1')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='InvoiceLineItem' AND column_name='kind' AND column_default='''CHARGE''::text')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='InvoiceLineItem' AND column_name='approved' AND column_default='false')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='PaymentAttempt' AND column_name='status' AND column_default='''CREATING''::text')
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='PaymentAttempt' AND column_name='createdAt' AND column_default='CURRENT_TIMESTAMP')
 THEN RAISE EXCEPTION 'Required defaults are missing or different'; END IF;
END $$;
CREATE FUNCTION pg_temp.require_index(tab text,cols text[],uniq boolean,pk boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=to_regclass(format('public.%I',tab)) AND i.indisvalid AND i.indisready
 AND (NOT uniq OR i.indisunique) AND (NOT pk OR i.indisprimary) AND i.indpred IS NULL
 AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,n) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num ORDER BY k.n)=cols)
 THEN RAISE EXCEPTION 'Missing valid index on %.% (unique %, primary %)',tab,cols,uniq,pk; END IF;
END $$;
SELECT pg_temp.require_index('InvoiceLineItem',ARRAY['id'],true,true);
SELECT pg_temp.require_index('InvoiceLineItem',ARRAY['invoiceId','position'],true,false);
SELECT pg_temp.require_index('PaymentAttempt',ARRAY['id'],true,true);
SELECT pg_temp.require_index('PaymentAttempt',ARRAY['key'],true,false);
SELECT pg_temp.require_index('PaymentAttempt',ARRAY['sessionId'],true,false);
SELECT pg_temp.require_index('PaymentAttempt',ARRAY['orderId','createdAt'],false,false);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='"InvoiceLineItem"'::regclass AND c.confrelid='"Invoice"'::regclass AND c.contype='f' AND c.convalidated AND c.confdeltype='r'
 AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='invoiceId')]::smallint[]
 AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='id')]::smallint[])
 OR NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid='"PaymentAttempt"'::regclass AND c.confrelid='"Order"'::regclass AND c.contype='f' AND c.convalidated AND c.confdeltype='r'
 AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='orderId')]::smallint[]
 AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='id')]::smallint[])
 THEN RAISE EXCEPTION 'Missing validated parent foreign key with ON DELETE RESTRICT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='"InvoiceLineItem"'::regclass AND contype='c' AND convalidated AND pg_get_constraintdef(oid) LIKE '%quantity > 0%')
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='"PaymentAttempt"'::regclass AND contype='c' AND convalidated AND pg_get_constraintdef(oid) LIKE '%"amountCents" > 0%')
 THEN RAISE EXCEPTION 'Required positive quantity/attempt amount checks missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='"InvoiceLineItem"'::regclass AND tgname='InvoiceLineItem_immutable' AND NOT tgisinternal AND tgtype=27 AND tgenabled IN ('O','A') AND tgfoid=to_regprocedure('public.apex_invoice_line_immutable()'))
 THEN RAISE EXCEPTION 'Required enabled BEFORE UPDATE/DELETE immutability trigger missing'; END IF;
 IF EXISTS(SELECT 1 FROM "Invoice" i CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.snapshot->'items','[]'::jsonb)) WITH ORDINALITY a(v,n)
 LEFT JOIN "InvoiceLineItem" l ON l."invoiceId"=i.id AND l.position=(a.n-1)::int
 WHERE l.id IS NULL OR l.description IS DISTINCT FROM a.v->>'description' OR l.quantity IS DISTINCT FROM (a.v->>'quantity')::int
 OR l."unitCents" IS DISTINCT FROM (a.v->>'unitCents')::int OR l."amountCents" IS DISTINCT FROM (a.v->>'amountCents')::int OR NOT l.approved)
 THEN RAISE EXCEPTION 'Frozen snapshot item copy is incomplete or conflicting'; END IF;
 -- Missing adjustments are expected before replay. Existing adjustments must
 -- already be correct, because the historical migration skips existing kinds.
 IF EXISTS(SELECT 1 FROM "InvoiceLineItem" l JOIN "Invoice" i ON i.id=l."invoiceId"
 WHERE l.kind IN ('DISCOUNT','TAX') AND (l.quantity<>1 OR NOT l.approved
 OR (l.kind='DISCOUNT' AND (COALESCE(i."discountCents",0)<=0 OR l."amountCents" IS DISTINCT FROM -i."discountCents" OR l."unitCents" IS DISTINCT FROM -i."discountCents"))
 OR (l.kind='TAX' AND (COALESCE(i."taxCents",0)<=0 OR l."amountCents" IS DISTINCT FROM i."taxCents" OR l."unitCents" IS DISTINCT FROM i."taxCents"))))
 OR EXISTS(SELECT 1 FROM "InvoiceLineItem" WHERE kind IN ('DISCOUNT','TAX') GROUP BY "invoiceId",kind HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Existing adjustment rows conflict or duplicate; review before any history resolution/replay'; END IF;
END $$;
COMMIT;
SELECT 'PREREQUISITES VERIFIED: schema, constraints, indexes, defaults, trigger, frozen snapshot rows' AS result;
