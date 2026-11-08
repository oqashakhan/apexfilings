-- Read-only. Run before recovery, and retain the output privately.
SELECT current_database() AS database, current_schema() AS schema, current_user AS role;
SELECT migration_name,started_at,finished_at,rolled_back_at,applied_steps_count,
 left(logs,2000) AS failure_log
FROM public._prisma_migrations ORDER BY migration_name,started_at;
SELECT name,to_regclass(format('public.%I',name)) AS relation
FROM (VALUES ('Invoice'),('InvoiceLineItem'),('PaymentAttempt'),('InvoiceSettings'),('InvoiceCreditNote'),('Order'),('Payment'),('RefundRequest'),('Document')) t(name);
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Invoice','InvoiceLineItem','PaymentAttempt','InvoiceSettings','InvoiceCreditNote') ORDER BY table_name,ordinal_position;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('Invoice','InvoiceLineItem','PaymentAttempt','InvoiceCreditNote') ORDER BY tablename,indexname;
SELECT conrelid::regclass AS relation,conname,contype,convalidated,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid::regclass::text IN ('"Invoice"','"InvoiceLineItem"','"PaymentAttempt"','"InvoiceCreditNote"','"ClientReferenceHistory"') ORDER BY relation,conname;
SELECT c.relname AS relation,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname IN ('Invoice','InvoiceLineItem','InvoiceCreditNote');
SELECT sequencename FROM pg_sequences WHERE schemaname='public' AND sequencename IN ('apex_invoice_number_seq','apex_credit_note_number_seq');
