# Invoice pricing and payment flow fix

## Root cause verified in code and isolated database tests

The professional-invoice migration deliberately retained older documents as `LEGACY` without reconstructing their monetary fields. `invoiceView()` subsequently read `Invoice.totalCents` directly, even where the linked `Order.totalCents`, component amounts and item rows were populated. Empty historical fields therefore hid real order prices; an old zero could also appear as zero. The view now exposes the actual stored order pricing for review without silently issuing or rewriting that historical document.

Separately, `ensureInvoice()` returned before creating anything when `Order.totalCents` was null. Pending orders never had an invoice draft to explain known charges. It now creates a nonpayable Draft with explicit approved and pending item rows. Drafts are rebuilt from the finalized order when issued, rather than reusing a potentially stale draft snapshot.

The last UI task intentionally installed a disabled payment placeholder. The Payments section also reused the order directory, while the manual-payment endpoint accepted only the full total. This update connects invoice/payment screens to the existing guarded Checkout flow and implements actual verified partial manual payments.

Production database contents and Coolify settings were not accessed. These causes were reproduced with fictional records in `apex_dashboard_test`; this report does not assert that production migrations or credentials have already been applied.

## Resulting behavior

- Invoice detail and directory show real finalized prices or a known subtotal with named pending charges. An unissued invoice has no collectible balance. Legitimate zero paid/discount values remain zero.
- Historical zero/null invoice amounts display their linked order pricing under **Pending review**, never as an authorized replacement invoice. Existing numbers, documents, dates and payment records remain preserved. An Owner must explicitly review historical reconstruction.
- Status presentation includes Pending review, Ready to pay, Processing, Failed, Partially paid, Paid, refund states and Cancelled, while retaining existing lifecycle and ledger values.
- Client Payments shows the latest invoice, amounts, payment history and Checkout controls. Invoice directory Pay now links lead to the payment control. The order page uses the same control.
- Checkout requires a complete order, an issued matching invoice, approved seller information, no verified/pending manual overlap, and valid server-side configuration. A partial manual balance is completed through the manual workflow; online Checkout remains a full unpaid-order payment and cannot charge the full amount again after a partial receipt.
- Missing Stripe configuration disables the button and gives a clear explanation. Test mode is labeled. No success is inferred from the return URL. The existing success/cancel order routes, verified webhooks and Resend worker are reused.
- Checkout retries retain attempt history. Provider success, asynchronous processing, failure and expiration update that history. Session creation cannot reopen an already settled Checkout after a fast webhook.
- Owners can record partial/full offline receipts through the existing order workflow, then verify them in Payments. Only verified receipts reduce the balance. Only full payment advances an awaiting-payment application.
- Owners can record an offline refund that has already completed, with an external reference and explicit attestation. This records the event and triggers existing credit-note/notification handling; it never transfers money or fabricates a Stripe refund. Duplicate requests and over-refunds are blocked.
- Existing protected invoice and credit-note PDFs remain available to the owning Client and Owner. Unissued local PDFs remain blocked pending legitimate approval. No seller information is invented.

## Database changes

Two additive migrations, tested on the isolated local test database:

1. `20261108_invoice_pricing_and_attempts`: adds `InvoiceLineItem` and `PaymentAttempt`. Existing snapshot items are copied to explicit rows. Issued item rows cannot be edited or deleted.
2. `20261108_invoice_adjustment_rows`: copies previously stored nonzero invoice discounts/taxes into explicit rows where missing. Existing totals and immutable snapshots are untouched.

`InvoiceLineItem` stores invoice/position, description, quantity, nullable unit/amount cents, kind and approval flag. `PaymentAttempt` stores order, unique idempotency key, optional unique session, integer amount, status and timestamps. Its order has a unique invoice relation, providing invoice-to-attempt linking without another competing financial total. No card data is stored. Existing money fields and accounting models are retained.

## Files changed

- `prisma/schema.prisma` and the two migrations above.
- `scripts/backfill-invoices.ts`: includes pending orders in the existing dry-run/Owner-audited backfill.
- `src/server/invoices.ts`: order-backed pricing preview, pending drafts, explicit rows, correct approval/payment eligibility and attempt DTOs.
- `src/server/stripe-config.ts`, `src/server/stripe-events.ts`: tax-aware Checkout validation and attempt state synchronization.
- `src/app/api/v1/invoices/route.ts`: accurate authorized directory summaries and status filters.
- `src/app/api/v1/invoices/[id]/[action]/route.ts`: Owner-only completed offline-refund records.
- `src/app/api/v1/payments/checkout/route.ts`: invoice/config guards, persisted attempts and settlement-safe updates.
- `src/app/api/v1/admin/[...segments]/route.ts`: partial manual receipts, remaining-balance limits and verification.
- `src/components/dashboard/InvoicePaymentControl.tsx`: shared configuration-gated payment control.
- `InvoiceCenter.tsx`, `InvoiceDirectory.tsx`, `InvoiceDocument.tsx`, `InvoiceAdminControls.tsx`, `invoice-experience.css`: invoice/payment presentation, pending breakdowns, history, Admin links and offline refund form.
- `ClientView.tsx`, `BillingActions.tsx`, `AdminOperations.tsx`: Payments workspace and consistent order/manual-payment controls.
- `src/lib/invoice-presentation.ts`: friendly statuses and pending labels.
- `tests/invoice-presentation.test.tsx`, `tests/invoices.test.cjs`, `tests/stripe-integration.test.cjs`, `tests/integration.test.cjs`: regression coverage and updated partial-payment semantics.
- This report, `STRIPE_SETUP.md`, `INVOICE_UX.md`, `INVOICE_MANAGEMENT.md`: current operational guidance.

Component filenames above are relative to `src/components/dashboard/`. No public-site source, dependency version or production secret was changed.

## Validation

- Prisma generate and both migrations: passed locally on the isolated test database.
- Presentation tests: 6 passed, including pending known subtotal and disabled payment behavior.
- Pricing tests: 41 passed, including all supported state/package combinations and included-service exclusions.
- Invoice integration: 2 passed, covering zero-valued historical fields with real order pricing, pending drafts, immutable rows, PDF access, notifications, manual partial receipts, offline refunds, idempotency and ownership.
- Stripe integration: 1 passed with a localhost mock provider, covering successful payments, processing/failure/retry history, duplicate events, refunds, credit notes, signatures and amount mismatches.
- Pricing integration: 1 passed for configured prices, frozen orders and ownership.
- General integration: 2 passed for authentication/onboarding, protected application/document workflows, manual verification and client/Admin synchronization.
- Lint, TypeScript check and production build: passed.
- Desktop and 390px mobile pending-invoice previews inspected. Corrected mobile pending-total wrapping. Existing protected PDF generation/download assertions passed; the PDF template itself was not redesigned again.

## Required production steps — not performed automatically

1. Review and back up the production database through the established operational process. Apply the two additive migrations using the existing startup migration workflow (`npm run db:deploy` in `dashboard`) and regenerate Prisma/build in the usual workflow. Do not reset or reseed production.
2. In the deployed dashboard environment, run `npm run invoices:backfill` to inspect candidates. For a reviewed order, use `npm run invoices:backfill -- --order-id=ACTUAL_ORDER_ID --apply --owner-id=ACTUAL_OWNER_ID`. The Owner ID must be an existing active Owner. The script preserves existing issued/cancelled documents; only missing/draft candidates are prepared by default. It can issue eligible fully priced invoices and send normal notifications, so review the dry run first.
3. Review older `LEGACY` invoices individually in Admin. Issue only after checking original customer, price and document records; the historical-review attestation remains mandatory. Pending state/service prices still need legitimate approval in Services & Pricing, followed by order fee confirmation and invoice issuance. This update does not approve reference fees.
4. Approve the actual seller legal/contact information in invoice business settings. No placeholder legal details should be approved.
5. For Stripe TEST MODE, configure server-only `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `STRIPE_PAYMENT_MODE=test`, `STRIPE_LIVE_PAYMENTS_ENABLED=false` and the correct HTTPS `APP_ORIGIN`. No new public/publishable key is needed for hosted Checkout. Do not set local mock/test transport variables in Coolify.
6. Register the test webhook at `https://app.apexfilings.com/api/v1/payments/stripe/webhook` with the events listed in [STRIPE_SETUP.md](STRIPE_SETUP.md). Retain the existing Resend configuration and single scheduled email worker; do not create another worker.
7. Exercise an actual Stripe test Checkout, failure/cancel return and webhook delivery after the approved deployment. This session verified the full flow with a mock provider, not a real Stripe account or production email delivery. Live processing was not enabled.

The implementation follows Stripe's [server-side payment confirmation guidance](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted). No deployment, production migration, production approval or real payment was performed by this task.
