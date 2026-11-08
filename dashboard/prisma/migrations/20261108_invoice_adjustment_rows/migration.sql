BEGIN;
-- Preserve existing issued snapshots while making their recorded adjustments
-- explicit rows. New invoices already write these rows before issuance.
INSERT INTO "InvoiceLineItem" ("id","invoiceId","position","description","quantity","unitCents","amountCents","kind","approved")
SELECT 'adjustment-discount-'||i.id,i.id,COALESCE((SELECT MAX(l.position) FROM "InvoiceLineItem" l WHERE l."invoiceId"=i.id),-1)+1,
 'Discount',1,-i."discountCents",-i."discountCents",'DISCOUNT',true
FROM "Invoice" i WHERE i."discountCents">0 AND NOT EXISTS(SELECT 1 FROM "InvoiceLineItem" l WHERE l."invoiceId"=i.id AND l.kind='DISCOUNT');
INSERT INTO "InvoiceLineItem" ("id","invoiceId","position","description","quantity","unitCents","amountCents","kind","approved")
SELECT 'adjustment-tax-'||i.id,i.id,COALESCE((SELECT MAX(l.position) FROM "InvoiceLineItem" l WHERE l."invoiceId"=i.id),-1)+1,
 'Tax',1,i."taxCents",i."taxCents",'TAX',true
FROM "Invoice" i WHERE i."taxCents">0 AND NOT EXISTS(SELECT 1 FROM "InvoiceLineItem" l WHERE l."invoiceId"=i.id AND l.kind='TAX');
COMMIT;
