-- Read-only assertion after migrate deploy. Each nonzero adjustment must be
-- represented exactly once, with its original amount, regardless of row ID.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public."Invoice" i WHERE i."discountCents">0 AND
 (SELECT count(*) FROM public."InvoiceLineItem" l WHERE l."invoiceId"=i.id AND l.kind='DISCOUNT')<>1)
 OR EXISTS(SELECT 1 FROM public."Invoice" i JOIN public."InvoiceLineItem" l ON l."invoiceId"=i.id AND l.kind='DISCOUNT'
 WHERE i."discountCents">0 AND (l."amountCents" IS DISTINCT FROM -i."discountCents" OR l."unitCents" IS DISTINCT FROM -i."discountCents" OR l.quantity<>1 OR NOT l.approved))
 THEN RAISE EXCEPTION 'Missing, duplicated or conflicting historical discount rows'; END IF;
 IF EXISTS(SELECT 1 FROM public."Invoice" i WHERE i."taxCents">0 AND
 (SELECT count(*) FROM public."InvoiceLineItem" l WHERE l."invoiceId"=i.id AND l.kind='TAX')<>1)
 OR EXISTS(SELECT 1 FROM public."Invoice" i JOIN public."InvoiceLineItem" l ON l."invoiceId"=i.id AND l.kind='TAX'
 WHERE i."taxCents">0 AND (l."amountCents" IS DISTINCT FROM i."taxCents" OR l."unitCents" IS DISTINCT FROM i."taxCents" OR l.quantity<>1 OR NOT l.approved))
 THEN RAISE EXCEPTION 'Missing, duplicated or conflicting historical tax rows'; END IF;
END $$;
SELECT kind,count(*) AS adjustment_rows,sum("amountCents") AS amount_cents
FROM public."InvoiceLineItem" WHERE kind IN ('DISCOUNT','TAX') GROUP BY kind ORDER BY kind;
