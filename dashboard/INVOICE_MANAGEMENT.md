# Invoice management implementation

Current invoice pricing/payment behavior and operational steps are documented in [INVOICE_PAYMENT_FIX.md](INVOICE_PAYMENT_FIX.md). This document records the earlier implementation.

## Existing behavior and changes

The existing `Invoice` was an order-linked reference plus optional Stripe URLs. Owner fee confirmation created an `AF-{orderId}` reference; Stripe handlers could replace its number with the provider number. There were no immutable parties/line snapshots, local invoice PDFs, invoice directory, seller settings or full invoice lifecycle.

The implementation extends that model and its existing unique `orderId` constraint. It reuses `Order`, `OrderItem`, `Payment`, `RefundRequest`, `AuditLog`, `Notification` and the existing Resend outbox/worker. There is no separate backend, authentication system, email worker or public document directory.

## Issuance and financial accuracy

- Finalized, fully priced orders automatically obtain an invoice at application submission or Owner fee confirmation. Checkout also ensures a missing eligible invoice before payment starts.
- New official invoices require a complete finalized server pricing snapshot, non-null government fee, internally consistent integer amounts, and approved seller settings. Missing/unapproved prices never become invoice charges. Incomplete orders retain their pending quote and have no official invoice.
- If pricing is complete but legitimate seller settings are unapproved, the invoice stays **Draft** with captured customer/company/price details. PDF issue and payment from the invoice are blocked. Owner Settings supplies the required approval action; the Owner can then issue the Draft.
- `lifecycle` is distinct from the derived financial status. Lifecycle is DRAFT, ISSUED, VOIDED or LEGACY (historical review required). Financial views support Unpaid, Partially Paid, Paid, Overdue, Voided, Partially Refunded and Refunded.
- Only verified payment records with a verification date count as receipts. A pending manual payment, browser Checkout return or arbitrary frontend action cannot mark an invoice paid. Existing payment collection remains full-order only; partial statuses represent genuine partial verified ledger records, without inventing a new partial-payment collection flow.
- Completed refunds are counted once by their existing IDs; provider-backed refunds must be succeeded. Refunds do not erase the original total or reopen the original receivable. Gross receipts, refunded amount, net collected and balance are separate values. Disputes/overpayments/refunds exceeding receipts are flagged for reconciliation.
- Stripe payment/verified manual payment handlers synchronize invoice notifications. Stripe's invoice ID, number and URLs are stored as provider metadata, without renumbering the canonical invoice. Delayed paid-invoice events remain valid after a genuine refund; delayed pending/failed refund events cannot reverse a succeeded refund.
- Invoice itemization uses the frozen quote and existing included-service exclusions. Future annual/biennial state fees remain outside the initial order. Taxes and discounts are taken from the approved finalized quote, in integer cents. No tax rate, jurisdiction, registration number or legal policy is invented or enabled by this change.

## Numbering, immutability and credit notes

Numbers use the approved prefix, UTC year and a PostgreSQL `NO CYCLE` sequence, e.g. `INV-2026-000001`. [PostgreSQL sequence values](https://www.postgresql.org/docs/current/sql-createsequence.html) are not rolled back and can have gaps; they are not reused. Existing invoice numbers and issue dates are preserved. The unique order constraint and order-row transaction lock prevent duplicate/concurrent issuance. Database triggers prevent identity changes/deletion and changes to issued parties, item snapshots, totals, currency or dates. Voided invoices remain retained and cannot reopen.

Voiding requires an Owner, a reason and an unpaid invoice with no pending/verified payment or Checkout activity. It cancels the associated order so a voided invoice cannot be paid through the existing checkout/manual-payment routes. Paid invoices must use the refund/reconciliation workflow.

When the Owner enables credit notes under the approved accounting process, actual completed refunds receive immutable `CN-{year}-{sequence}` notes. The refund ID is unique, preventing duplicate notes. Original invoice amounts are untouched. Credit-note PDFs use the same protected download and invoice ownership checks. No local jurisdiction-specific credit-note requirement is assumed.

## Dashboard and PDF

- Client **Invoices**: searchable/paginated directory, total/paid/balance/status, detail, related order, protected PDF and genuine receipts. Pay actions reuse existing Stripe configuration gates.
- Owner **Invoice Management**: all authorized invoices, real currency-separated totals/collections/outstanding/refunds/overdue counts (verified receipts remain counted even when the document awaits approval), search by invoice/customer/client reference/company/order, detail/PDF, issue, email and restricted void actions.
- Owner client workspace: **Invoices** tab filtered to that customer's internal ID; it also covers invoices outside the snapshot display limit.
- Owner Settings: approved legal/display name, seller billing address, email, HTTPS website, optional registered/tax details, prefix, terms/footer, due-date terms, reminder opt-in and credit-note opt-in. Blank/unverified defaults never pretend to be legal business details. Changes affect future issue, not existing snapshots.
- Billing/order screens link to the canonical invoice. Provider originals and genuine receipt URLs remain available separately.

PDFKit creates A4 documents on demand from the immutable snapshot, with embedded licensed Noto Sans fonts, Apex orange/dark branding, item quantity/unit/line prices, totals, live verified payment/refund information, terms, repeated page headers and page numbers. Protected endpoints return `private, no-store`; they never reveal private storage paths or public invoice files. Customer residential/owner document addresses are not reused as billing addresses. There is currently no customer billing-address field, so unavailable billing addresses are omitted.

## Emails and worker

Invoice Issued, Payment Received, Invoice Paid, Refund Processed, Invoice Voided and optional Invoice Overdue notices use existing PostgreSQL outbox records and Resend delivery. Content includes the invoice/customer/company/total/status and a sign-in-protected invoice link. No publicly accessible PDF attachment URL is created.

Deterministic event keys, existing unique constraints and row locks prevent repeated automatic emails. Intentional Owner resend uses a request UUID plus a one-minute cooldown and audit event. Payment email preferences are respected; manual send reports a clear blocker when disabled. Existing redundant customer payment-confirmation emails are suppressed when the canonical invoice sends the equivalent notification.

Overdue reminders are opt-in and processed by the existing `/api/v1/jobs/email` job. There is one notice per invoice due date, no new scheduler/worker. Paid/already-notified invoices cannot starve later overdue invoices. The actual production Coolify schedule was not changed or independently verified.

## Migration and production steps — not executed

Migration: `prisma/migrations/20261107_professional_invoices/migration.sql`. It adds Invoice fields, `InvoiceSettings`, `InvoiceCreditNote`, numbering sequences, checks/index and immutability triggers. Existing issued references become LEGACY pending review, retaining original numbers/dates/provider documents. No historical parties/financial facts are silently reconstructed by the migration.

1. Use the existing backed-up deployment process. Build with `npm run db:generate` and `npm run build`.
2. Apply `npm run db:deploy` to the actual dashboard database before starting the new application code. Do not reset PostgreSQL or rerun the catalog seed.
3. In Owner **Settings → Invoice business settings**, enter and verify legitimate seller details and applicable invoice/accounting terms. Approve them. Until then, eligible new invoices remain Draft.
4. Review existing finalized orders with the default **read-only** command:

```sh
npm run invoices:backfill
```

5. After reviewing the candidates, apply with an existing active Owner ID (an internal ID, not the client-facing reference):

```sh
npm run invoices:backfill -- --apply --owner-id=OWNER_INTERNAL_ID
```

This creates missing eligible invoices or issues eligible drafts, preserves existing canonical numbers, and queues issuance emails through the existing outbox. It does not mark payments verified or alter orders. Incomplete/inconsistent snapshots and cancelled orders without an existing issued document are skipped. Use `--order-id=ORDER_INTERNAL_ID` to target one order first. Rerunning is idempotent.

6. Historical references without original item/party snapshots need explicit review against original records. Prefer the Owner invoice detail action per invoice. A reviewed operational backfill requires both acknowledgements:

```sh
npm run invoices:backfill -- --apply --review-legacy --acknowledge-current-details --owner-id=OWNER_INTERNAL_ID --order-id=ORDER_INTERNAL_ID
```

This deliberately captures reviewed current details when original snapshots are unavailable, marks provenance `REVIEWED_BACKFILL`, preserves the original issued number/date and provider documents, and records the Owner in the audit trail. The PDF discloses reviewed reconstruction. Do not use it to imply current profile details were known at the original issue date.

No production migration/backfill, payment collection, live Stripe enablement, secret changes or automatic deployment was performed. Missing legitimate seller information and Owner review of legacy records remain operational requirements.

## Files and validation

Main new files: `src/lib/invoices.ts`; `src/server/invoices.ts`, `invoice-access.ts`, `invoice-pdf.ts`; `/api/v1/invoices` routes; `InvoiceCenter.tsx`, `InvoiceSettings.tsx`; `scripts/backfill-invoices.ts`; the migration; licensed fonts; `tests/invoices.test.cjs`.

Existing schema, Next config/package files, Client/Admin navigation/views, client profile/order billing projections, application submission, Owner fee/manual verification, Stripe handlers, Checkout and existing email job are integrated with these files. `tests/stripe-integration.test.cjs` exercises real verified-event synchronization using the existing local Stripe mock; existing workflow tests retain coverage of auth/OTP/documents/pricing.

Validation covers 51 tests across invoice/financial workflow, verified Stripe events/refunds, existing onboarding/authentication/OTP/document workflow, pricing, package components and permanent client references. All 51 tests passed, along with TypeScript, ESLint and the production build. Embedded regular/bold fonts were confirmed in the invoice route deployment trace. Final A4 PDF samples include a one-page paid invoice, a ten-page 77-line invoice (package, government fee and 75 extras), and a one-page credit note. Text extraction checks the final service, taxes, discounts and total; rendered first/middle/last pages were visually inspected for clipping, row breaks and footer overlap.

The first integration run exposed an incomplete fictional identity-document fixture and the standalone backfill needed an explicit `server-only` dependency. Both were corrected. A PDF closing-text widow was corrected during visual QA. Production backfill was not run.

Dependency audit reports 11 advisories in the existing Prisma/lint dependency trees; no pre-existing package versions were changed and no unrelated audit upgrades were applied. The new PDF/standalone-runtime dependencies were not listed in that audit. Full Google OAuth exchange and live Stripe/production Resend delivery were not exercised; existing mock-provider integration tests validate those boundaries locally.


## Exact changed-file list

- `dashboard/INVOICE_MANAGEMENT.md`
- `dashboard/assets/fonts/NotoSans-Bold.ttf`
- `dashboard/assets/fonts/NotoSans-Regular.ttf`
- `dashboard/assets/fonts/OFL.txt`
- `dashboard/next.config.ts`
- `dashboard/package-lock.json`
- `dashboard/package.json`
- `dashboard/prisma/migrations/20261107_professional_invoices/migration.sql`
- `dashboard/prisma/schema.prisma`
- `dashboard/scripts/backfill-invoices.ts`
- `dashboard/src/app/api/v1/admin/[...segments]/route.ts`
- `dashboard/src/app/api/v1/client/[...segments]/route.ts`
- `dashboard/src/app/api/v1/invoices/[id]/[action]/route.ts`
- `dashboard/src/app/api/v1/invoices/[id]/route.ts`
- `dashboard/src/app/api/v1/invoices/route.ts`
- `dashboard/src/app/api/v1/invoices/settings/route.ts`
- `dashboard/src/app/api/v1/jobs/email/route.ts`
- `dashboard/src/app/api/v1/payments/checkout/route.ts`
- `dashboard/src/components/dashboard/AdminClientWorkspace.tsx`
- `dashboard/src/components/dashboard/AdminOperations.tsx`
- `dashboard/src/components/dashboard/AdminView.tsx`
- `dashboard/src/components/dashboard/BillingActions.tsx`
- `dashboard/src/components/dashboard/ClientDemoContext.tsx`
- `dashboard/src/components/dashboard/ClientView.tsx`
- `dashboard/src/components/dashboard/InvoiceCenter.tsx`
- `dashboard/src/components/dashboard/InvoiceSettings.tsx`
- `dashboard/src/components/dashboard/NotificationCenter.tsx`
- `dashboard/src/components/layout/DashboardShell.tsx`
- `dashboard/src/lib/admin-models.ts`
- `dashboard/src/lib/invoices.ts`
- `dashboard/src/lib/permissions.ts`
- `dashboard/src/server/admin-snapshot.ts`
- `dashboard/src/server/invoice-access.ts`
- `dashboard/src/server/invoice-pdf.ts`
- `dashboard/src/server/invoices.ts`
- `dashboard/src/server/stripe-events.ts`
- `dashboard/tests/integration.test.cjs`
- `dashboard/tests/invoices.test.cjs`
- `dashboard/tests/stripe-integration.test.cjs`
