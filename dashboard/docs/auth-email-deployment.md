# Dashboard authentication and email deployment

These changes are dashboard-only. Apply the additive Prisma migrations before running the new application build. Do not reset the database.

## Coolify settings

- Root directory: `/dashboard`
- Node: 24
- Install: `npm ci --include=dev --include=optional`
- Build: `npm run db:generate && npm run build`
- Start: `npm run db:deploy && npm run start -- -p 3000`
- Public dashboard origin: `https://app.apexfilings.com`

Keep the existing `DATABASE_URL`, `APP_ORIGIN`, `PUBLIC_SITE_ORIGIN`, `ONBOARDING_HANDOFF_SECRET`, and `PRIVATE_DOCUMENT_DIR` values. Add server-side environment variables `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `EMAIL_JOB_SECRET`, and `RESEND_WEBHOOK_SECRET`. Never prefix these with `NEXT_PUBLIC_` or place them in the Vite application's environment.

## Google Cloud

Create a Google OAuth **Web application** client. Set the authorized JavaScript origin to `https://app.apexfilings.com` and the exact redirect URI to `https://app.apexfilings.com/api/v1/auth/google`. Configure the OAuth consent screen for your intended audience. Only `openid`, `email`, and `profile` are requested. Put the client ID and secret in Coolify server-side variables. Existing accounts must sign in with their current method and explicitly link Google from their account page; matching email alone never links accounts.

## Resend

Verify `apexfilings.com` in Resend using its required DNS records before setting `EMAIL_FROM=info@apexfilings.com`. `EMAIL_FROM` must be a bare verified email address; the code supplies the display name “Apex Filings”. Set `ADMIN_NOTIFICATION_EMAIL` to the team inbox that should receive new application messages. Do not use an unverified sender.

Create a Resend webhook for `email.delivered`, `email.bounced`, `email.suppressed`, and `email.complained` at `https://app.apexfilings.com/api/v1/webhooks/resend`. Set its signing secret as `RESEND_WEBHOOK_SECRET`. The webhook verifies the raw payload signature before changing delivery status.

## Durable email worker

Set `EMAIL_JOB_SECRET` to a random, long value. In Coolify Scheduled Tasks, run `node scripts/run-email-job.mjs` every minute (`* * * * *`) in the dashboard service with the same environment variables. This calls the protected `/api/v1/jobs/email` endpoint. The worker leases queued rows, records attempts, retries failures with backoff, and uses Resend idempotency keys. No process-local timer is used. Check failed rows and provider logs during rollout.

## Release checks

Run `npm run db:deploy` against the intended database after taking the normal database backup. Confirm the Google button is enabled only after credentials are configured, registration queues a verification email, the link verifies the account, reset emails arrive, and a fictional application submission creates both customer and owner notifications. Do not use real customer records for these checks.
