# Dashboard authentication and email deployment

The backend, email system, and dashboard changes are in `/dashboard`; the public onboarding form only gained clearer error handling. Apply the additive Prisma migrations before running the new dashboard build. Do not reset the database.

## Registration incident and deployment check

The production log message `Email verification is not configured` is thrown only by the OTP secret check: `EMAIL_OTP_SECRET` is either missing or does not decode from base64url to exactly 32 bytes. Missing `RESEND_API_KEY` or `EMAIL_FROM` produces the distinct message `Verification email delivery is not configured`. `EMAIL_JOB_SECRET` is needed by the scheduled email worker, but is not the source of this registration exception. `npm run start` now runs the readiness check automatically before Next.js starts and fails with variable names only if prerequisites are missing. Configure the variable in the **dashboard** Coolify service, generate a stable value with the command below, and redeploy. Do not rotate an existing valid value casually: active OTPs and encrypted queued messages depend on it.

The previously deployed `/api/v1/auth/register` route returned the `registerClientSession()` promise without `await` inside its `try/catch`. If registration failed during the email prerequisite check, the rejection escaped `handleError()` and Next.js returned an empty HTTP 500; the browser then displayed the generic connection error while parsing the empty response. The handler now awaits registration and returns a safe JSON error with a correlation ID for unexpected failures. The public onboarding endpoint was separately observed returning JSON HTTP 503 before validation because `PUBLIC_SITE_ORIGIN` was not configured for that deployment. Set `PUBLIC_SITE_ORIGIN=https://apexfilings.com` in the dashboard service, then run `npm run email:check` inside its Coolify container to identify any other missing variable names or email tables. The live email prerequisite that triggered the dashboard 500 cannot be narrowed to one variable without the redacted Coolify runtime log; do not assume Resend delivery is working merely because registration returns a response.

## Coolify settings

- Root directory: `/dashboard`
- Node: 24
- Install: `npm ci --include=dev --include=optional`
- Build: `npm run db:generate && npm run build`
- Start: `npm run db:deploy && npm run start -- -p 3000`
- Public dashboard origin: `https://app.apexfilings.com`

Keep the existing `DATABASE_URL`, `APP_ORIGIN`, `PUBLIC_SITE_ORIGIN`, `ONBOARDING_HANDOFF_SECRET`, and `PRIVATE_DOCUMENT_DIR` values. Add server-side environment variables `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `EMAIL_JOB_SECRET`, and `RESEND_WEBHOOK_SECRET`. Also add `EMAIL_OTP_SECRET`, a stable random 32-byte base64url secret generated with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Never prefix these with `NEXT_PUBLIC_` or place them in the Vite application's environment. Keep `EMAIL_OTP_SECRET` stable while codes remain in flight; changing it invalidates pending codes and encrypted outbox messages.

## Google Cloud

Create a Google OAuth **Web application** client. Set the authorized JavaScript origin to `https://app.apexfilings.com` and the exact redirect URI to `https://app.apexfilings.com/api/v1/auth/google`. Configure the OAuth consent screen for your intended audience. Only `openid`, `email`, and `profile` are requested. Put the client ID and secret in Coolify server-side variables. Existing accounts must sign in with their current method and explicitly link Google from their account page; matching email alone never links accounts.

## Resend

Verify `apexfilings.com` in Resend using its required DNS records before setting `EMAIL_FROM=info@apexfilings.com`. `EMAIL_FROM` must be a bare verified email address; the code supplies the display name “Apex Filings”. Set `ADMIN_NOTIFICATION_EMAIL` to the team inbox that should receive new application messages. Do not use an unverified sender.

Create a Resend webhook for `email.delivered`, `email.bounced`, `email.suppressed`, and `email.complained` at `https://app.apexfilings.com/api/v1/webhooks/resend`. Set its signing secret as `RESEND_WEBHOOK_SECRET`. The webhook verifies the raw payload signature before changing delivery status.

## Durable email worker

Set `EMAIL_JOB_SECRET` to a random, long value. In Coolify Scheduled Tasks, run `node scripts/run-email-job.mjs` every minute (`* * * * *`) in the dashboard service with the same environment variables. This calls the protected `/api/v1/jobs/email` endpoint. Each run processes up to five rows, with an eight-second provider timeout per row and a 55-second task timeout. The worker leases queued rows, records attempts, retries failures with backoff, and uses Resend idempotency keys. No process-local timer is used. Check failed rows and provider logs during rollout.

New email/password registrations require email OTP verification before client pages and protected client APIs are available. The six-digit code expires after **5 minutes**, is single-use, and is stored as a keyed hash. Pending OTP email HTML is encrypted in the outbox until dispatch. Registration attempts are limited by normalized email and proxy-provided IP; code requests are limited by account, email, and IP in addition to their 60-second cooldown. Configure the Coolify reverse proxy to replace client IP headers and do not expose the Node service directly. Registration returns a service-unavailable response when delivery credentials or `EMAIL_OTP_SECRET` are missing. New Google accounts with verified Google email claims are already verified. Existing customers retain their current `verificationRequired` value; the migration does not bulk change or lock them out. Previously issued link verification emails remain usable until expiry; new resend requests issue OTP codes. Review existing customer verification policy separately before changing existing records.

The registration handler commits the **pending account and encrypted outbox item together**, then attempts delivery immediately. It reports `emailDeliveryStatus: accepted` only when Resend accepts the message. If delivery fails or times out, the account remains unverified, the API returns HTTP 202 with `emailDeliveryStatus: unconfirmed`, and the verification page explains how to retry after the cooldown. The scheduled worker also retries eligible queued messages with the same idempotency key. A repeated registration cannot create a second account because the normalized email is unique. A resend invalidates the previous OTP and suppresses older queued OTP emails.

Run `npm run email:check` in the Coolify dashboard service terminal after setting variables and applying migrations. This prints missing **variable names**, checks the OTP secret length, verifies the configured sender domain, and checks database connectivity and email tables without printing credentials. It cannot prove that the sender is verified in Resend or that the scheduled task is running; check those separately. `PUBLIC_SITE_ORIGIN` must be the public website origin, `https://apexfilings.com`, for the five-step onboarding API to accept requests.

Existing clients who have not yet verified their mailbox can opt in from **Settings → Account security**. This is an account-initiated step: it queues an OTP, enables the verification gate, and sends them to the verification page. It does not bulk update customer accounts or affect Owners. The resend action issues a new OTP rather than a new link, consistent with the current six-digit signup flow.

## Transactional events and dashboards

The existing PostgreSQL `EmailOutbox` stores queued, sending, sent, delivered, and failed events. The worker now calls the official Resend SDK using each unique `eventKey` as the provider idempotency key. A timed-out worker can retry a leased event without creating a second provider send. Resend webhooks update delivery outcomes. Emails are queued inside successful business transactions; delivery failures do not undo an application, payment review, document review, or support action. The Owner **Email Delivery** page shows counts and recent delivery metadata without email bodies, OTP codes, or API errors.

Email and in-app events cover registration and verification, welcome, password reset and changes, new device, explicit Google linking, application submission and status changes, order creation and fee confirmation/invoice reference, manual payment review/confirmation/rejection, refund request and review, document upload/review/final documents, and support request/reply. Support requests and replies are stored in the new `SupportTicket` and `SupportReply` tables and are visible only to the customer who created them and Owners. Email messages about support or documents link to the secure dashboard; they do not attach or quote private document contents.

The invoice event means an **invoice reference and order totals** are available in the client order view. It does not create a PDF invoice or charge a card. Manual payment verification is performed only by an Owner; a recorded payment is explicitly labeled as awaiting verification. Refund review status changes do not transfer funds.

Apply both additive migrations (`20261031_email_otp` and `20261031_support_tickets`) with `npm run db:deploy` during the normal deployment sequence. Back up the database according to the existing operations process. Do not use `prisma migrate reset` on an existing database.

To safely test real email delivery after configuring the verified sender and scheduled task, create a **fictional client with a mailbox you control**, register once, and confirm the OTP email arrives. Enter the code, then inspect the Owner Email Delivery page and Resend logs for the same event. Test a password reset and fictional application on that same account. Do not use a real customer account, payment, or government filing. If email is not configured, the integration test suite uses a local test outbox and cannot prove external delivery.

## Release checks

Run `npm run db:deploy` against the intended database after taking the normal database backup. Confirm the Google button is enabled only after credentials are configured, registration queues an OTP email, the code verifies the account, reset emails arrive, and a fictional application submission creates both customer and owner notifications. Do not use real customer records for these checks.
