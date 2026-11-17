# Production QA and retention checklist

Prepared 17 November 2026. No production operation was performed in this review.

## Release order

1. Confirm the public site's and dashboard's Coolify automatic-deployment settings and capture the existing public nginx, reverse-proxy, domain and build configuration. Do not deploy or push until their behavior and the planned revisions are understood.
2. Obtain a current PostgreSQL backup and verify restoration in isolated PostgreSQL. Keep the private-document volume backed up separately. Capture the current application revision and an executable rollback plan.
3. In the production dashboard environment, inspect `prisma migrate status` and the `_prisma_migrations` ledger read-only, including failed or rolled-back rows. Compare all 29 repository migrations and checksums. The local isolated test database is current; this does not establish which migrations are pending in production.
4. Pay special attention to `20261108_invoice_adjustment_rows`: its inserts require `InvoiceLineItem`, created by the later-named `20261108_invoice_pricing_and_attempts`. If P3009 or missing prerequisites persist, stop and follow `INVOICE_MIGRATION_RECOVERY.md` only after examining the actual production state and backup. Never mark the failed migration applied without proving its work complete; preserve historical adjustment rows and issued invoices.
5. Review each truly pending migration in chronological order, including `20261114_company_document_metadata`, `20261115_dashboard_workflows`, `20261116_live_chat`, and `20261117_application_reference`. The latter adds a unique sequence-generated reference, backfills existing applications and blocks changes; assess locking, capacity, sequence and recovery before scheduling. Preserve all prior migrations. Only an authorized operator may apply approved changes during the agreed maintenance window.
6. After controlled application of approved migrations, check Prisma status and schema consistency, app health, authenticated login, real client ownership boundaries, document volume, message access, notification queue and previously issued invoice/PDF integrity. Do not test with live payments or real email broadcasts.
7. Review the Next.js known-security-vulnerability warning and prepare a separately tested framework upgrade. Verify the exact advisory and compatible dependency versions before release.
8. Review and deploy the public SEO changes separately; verify HTML, crawler files, real 404s and host redirects before submitting the sitemap. Search Console and Bing setup are in `SEO_AUDIT.md`.

## Test account retention plan — do not delete

The owner reported 10 test clients and one protected unpaid LEGACY invoice; this review did not independently inspect production. Do not execute `delete-confirmed-test-clients.sql`: it contains placeholder IDs and deliberately refuses to delete when invoices or financial records exist. Preserve issued/legacy invoices, orders, payments, refunds, audit evidence and associated ownership records. Do not bypass triggers, rewrite history or delete private files merely because an account is a test account.

After an owner reviews a fresh read-only inventory and confirms the exact CLIENT identities, consider using the existing Admin client status action to suspend each confirmed test account. This retains records, changes status and revokes sessions through the existing transaction. The isolated test `support-safe.integration.test.cjs` verified that client suspension blocks the old session and password login, and cannot target an OWNER through the client action. The OWNER Waseem and all Admin/Staff accounts must remain active. Production account status and sessions have not been checked or changed.

If later physical deletion or anonymization is still desired, first document legal/accounting retention, data ownership, invoice immutability, external provider records, document storage and dependencies. Prepare and test a narrowly scoped separate plan against a restored isolated copy and obtain explicit approval for exact IDs and effects. Never infer deletion permission from this plan.

## Public server configuration still needed

The live server reports nginx, but the repository contains no actual Coolify/nginx configuration. Obtain the actual site server block, proxy/router settings and static root before editing; do not replace a generated configuration blindly. The responsible operator must configure and test: HTTPS canonical-host redirect preserving path/query; directory route HTML from the Vite `dist` output; valid React routes and refreshes; unknown route HTTP 404 using `404.html`; and correct robots/sitemap content types. Ensure dashboard authentication and `/api/translate` routing remain unchanged. Exact deploy-specific directives cannot be determined until the actual configuration is inspected.
