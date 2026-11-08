# Stripe Checkout setup for Apex Filings

The dashboard uses the official Stripe Node SDK and Stripe-hosted Checkout. Live checkout stays disabled unless explicitly enabled. The public Vite site does not need a Stripe key.

## Coolify environment

Set these server-side variables on the **dashboard** application:

| Variable | Test mode | Live mode |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the test webhook endpoint | Signing secret from the live webhook endpoint |
| `STRIPE_PAYMENT_MODE` | `test` | `live` |
| `STRIPE_LIVE_PAYMENTS_ENABLED` | `false` | `true` only after account and business approval |
| `APP_ORIGIN` | The HTTPS dashboard origin | `https://app.apexfilings.com` |

Retain the dashboard's existing database, session, Resend, and email configuration. Never put secret keys in `NEXT_PUBLIC_` or `VITE_` variables. The local integration suite uses a fictional test transport restricted to a localhost test database; do not set `TEST_STRIPE_BASE_URL` or `TEST_EMAIL_OUTBOX` in Coolify.

## Stripe webhook

Configure a Stripe webhook endpoint at:

`https://app.apexfilings.com/api/v1/payments/stripe/webhook`

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `refund.updated`, `refund.failed`, `charge.dispute.created`, and `charge.dispute.closed`. Use the signing secret for this exact endpoint and environment. Checkout and refund API calls use the secret key from the same Stripe account and mode.

## Order and payment behavior

An LLC submission creates one order. An Owner confirms the government, third-party, additional, and discount amounts. The backend accepts Checkout only when every fee is confirmed and the saved integer total matches the line items. Starting Checkout locks order fees and disables the manual-payment path for that order. A return to the order page does not mark it paid. Verified Stripe webhook or Owner reconciliation records payment, advances the application to `PAYMENT_RECEIVED`, and queues the existing notifications and emails. Further filing approval stays in the separate Admin review workflow.

The canonical invoice is prepared from the order and must be issued with approved seller settings before Checkout. Stripe-created invoice identifiers and URLs remain provider metadata; they never replace the canonical invoice number. See [INVOICE_PAYMENT_FIX.md](INVOICE_PAYMENT_FIX.md) for pending invoices, backfill, partial manual payments and the new attempt history. The Client order endpoint exposes a Stripe invoice and receipt only to the authenticated customer; Owners can inspect them on the Admin order page.

The customer may request refund review. An Owner reviews it against the published refund policy before entering an amount and initiating the Stripe refund. The order is marked refunded only after Stripe confirms the full paid amount has been refunded. Partial refunds keep the order paid with a separate refund record. The Owner-only reconcile action rereads the Checkout Session and refunds from Stripe.

## Before enabling live mode

Confirm the business has a legitimate, approved Stripe account in a supported country with accurate identity, address, bank, tax, and invoice details. Configure the live webhook independently and exercise the entire flow with test credentials and fictional records first. Run `npm ci --include=dev --include=optional`, `npm run db:generate`, `npm run db:deploy`, and `npm run build` in the dashboard deployment workflow. Review the additive migrations and back up production PostgreSQL before applying them. Only then set `STRIPE_PAYMENT_MODE=live` and `STRIPE_LIVE_PAYMENTS_ENABLED=true` with approved live credentials. No application code sets that flag automatically.
