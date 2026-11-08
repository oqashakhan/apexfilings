# Invoice experience update

The Client and Admin invoice directory and detail pages now share a clean invoice document layout. This update changes presentation and adds a read-only status filter. It does not change invoice accounting, issuance rules or database records.

## Files and components

- `src/components/dashboard/InvoiceCenter.tsx`: loading, debounced search, status filtering, pagination and existing Admin actions. The invoice page no longer renders the gateway-connected `BillingActions` component.
- `src/components/dashboard/InvoiceDirectory.tsx`: desktop table and mobile cards, client references, dates, total/paid/balance, search, status filter and related-order/download links.
- `src/components/dashboard/InvoiceDocument.tsx`: branded customer document, itemized charges, billing parties, totals, payment receipts, credit-note downloads, print/download controls and disabled payment placeholder.
- `src/components/dashboard/InvoiceAdminControls.tsx`: collapsible internal approval/reconciliation information, original references, individual payment/refund records and existing issue/send/cancel controls.
- `src/components/dashboard/invoice-experience.css`: scoped invoice styles, responsive cards and print rules.
- `src/lib/invoice-presentation.ts`: shared labels, dates, money formatting and download eligibility. Unpaid and paid use distinct badge styles; the generic status badge is unchanged elsewhere.
- `src/app/api/v1/invoices/route.ts`: validates status filters and applies the existing ledger calculator before pagination. Customer ownership restrictions and no-store responses remain in force. Overview totals continue to cover the full authorized scope, independent of the list filter.
- `src/server/invoice-pdf.ts`: clean A4 template with prominent balance, total/paid amounts, itemization, approved seller details, concise payment note and pagination. Internal reconciliation and historical-review wording stays in Admin rather than customer PDFs.
- `tests/invoice-presentation.test.tsx`: presentation regression tests.
- `tests/invoices.test.cjs`: additional API filter validation and ownership tests.

## Data and payments

No Prisma migration, schema change, reset, pricing change or production secret change is required. Existing immutable invoice snapshots and verified financial calculations remain authoritative. Historical references, original provider documents, refunds and credit notes remain preserved.

The Client invoice payment button is disabled and says **Stripe payments coming soon**. It makes no checkout request and never marks an invoice or order paid. Existing payment backend code and other order/payment screens remain unchanged.

Issued and cancelled invoices with snapshots retain protected PDF downloads. Draft invoices cannot download an unissued local PDF; recorded original HTTPS provider PDFs remain available. Print excludes dashboard navigation, payment placeholders and Admin controls. Approved seller information is used without invented legal/contact details.

## Validation

- `node --import tsx --test tests/invoice-presentation.test.tsx`: 5 tests passed.
- `npm run test:invoices`: 2 tests passed against the isolated local test database, including lifecycle, immutable records, protected PDFs, email delivery, status filters and ownership.
- `npm run test:stripe`: 1 existing regression test passed using a local mock provider, including refunds/credit notes. No real payments were collected.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Browser inspection of the actual presentation components with fictional fixtures: desktop document/directory and 390px mobile document/cards.
- Generated and rendered unpaid, partially paid and paid PDFs; verified one-page fixtures, status, paid/balance amounts and zero discount formatting. Also checked a 10-page long-item invoice and its final totals page.

Visual previews and PDF artifacts were generated only in ignored `.local` storage. No deployment was performed.
