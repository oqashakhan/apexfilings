# Apex Filings Dashboard

This is the separate Next.js dashboard and versioned `/api/v1` service for Apex Filings. The public React/Vite website at the repository root is separate. This service uses PostgreSQL through Prisma, Argon2id password hashes, server-side role and record checks, HttpOnly sessions, and private filesystem document storage.

## Local setup

Use Node.js 24, npm, and PostgreSQL 16 or newer. From `dashboard/`:

```bash
npm ci
cp .env.example .env
# Edit DATABASE_URL, APP_ORIGIN, and PRIVATE_DOCUMENT_DIR.
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev -- --port 3001
```

Use a local-only PostgreSQL database. `db:seed` inserts service/package configuration and all 50 states plus DC with **unverified government fees left blank**. It creates no customer, payment, or identity records. New development migrations can be created with `npm run db:migrate`; production uses only `npm run db:deploy`. Database reset is a development-only operation: drop and recreate a dedicated local development database, then run `db:deploy` and `db:seed` again. Never reset a shared or production database.

Create the first owner once with a private environment value:

```bash
OWNER_EMAIL=owner@example.com OWNER_FULL_NAME="Owner Name" OWNER_PASSWORD="replace-with-a-unique-secret-7!" npm run owner:bootstrap
```

The script requires a strong password of at least 16 characters and refuses to run if an owner already exists. Do not commit or share the bootstrap password. Public registration creates client accounts only.

## Current backend flows

- Client registration, login, logout, session lookup, and password-reset token validation; request-reset is generic and does not send production mail until a verified provider is configured.
- Owner/client role checks on pages and APIs; clients are scoped to their own companies, applications, orders, documents, and notifications.
- Six-step US LLC application: saved draft, owner information, optional service interests, private owner ID uploads, review/confirmation, and an unpaid order. The $199 Basic and $299 Premium prices are Apex service fees only. Government/other fees remain unconfirmed until an owner records them.
- Owner application review, transition history, customer replies to information requests, internal notes, document review, fee confirmation, owner-configured manual payment instructions, manual payment recording and verification, catalog drafts, notifications, and audit records.
- Private uploaded files live outside `public/` on a persistent volume. PDF, JPEG, and PNG are signature-checked, limited to 8 MB, and served only through authorized downloads. Submitted owner documents stay under review until an owner accepts or requests replacement. A malware scanner is not integrated; configure one before accepting real production identity documents.

**Not connected:** payment gateway, actual refund transfer, production email delivery, support tickets, website content publishing, staff and B2B dashboards, government filing integrations. The interface must not present those as completed actions. UK Ltd formation is outside this workflow.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Integration tests require an isolated local PostgreSQL cluster with an `apex_dashboard_test` database, the same credentials as local `apex_dashboard`, migrations and seed applied to the test DB, and a production build listening on port 3002 with `node -r ./tests/test-env.cjs node_modules/next/dist/bin/next start -p 3002`. Then run `npm run test:integration`. The preloader refuses non-local database hosts and other database names. The integration test creates fictional users and a fictional payment in the test database only.

## Coolify preparation

Deploy this `dashboard/` directory as a **separate** Next.js service using Node.js 24. It serves the UI and API from one origin. Keep the existing public website service unchanged. Provision PostgreSQL as a private Coolify resource with persistent storage and scheduled backups. Set `DATABASE_URL`, `APP_ORIGIN` (exact HTTPS dashboard origin), and an **absolute** `PRIVATE_DOCUMENT_DIR` on a separate private persistent volume. Do not expose PostgreSQL or the document volume to the public internet. Store all values in Coolify secrets, not Git. Run `npm ci`, `npm run db:generate`, and `npm run build` for the image; run `npm run db:deploy` before startup. Set the health check to `/api/v1/health`, enable HTTPS at the reverse proxy, and test backup restoration before handling customer documents.

The server rejects cross-origin mutations and uses `Secure`, `HttpOnly`, `SameSite=Lax` session cookies in production. `APP_ORIGIN` must match the browser origin exactly. The owner can configure payment instructions in Admin Settings; no bank details are seeded. Production reset emails, verified payment instructions, malware scanning, and a document retention/deletion policy must be configured and reviewed before live customer onboarding. This repository does not deploy automatically.

Dependency note: the October 2026 npm audit flags a high-severity `deepmerge-ts` advisory through Prisma 6's configuration/CLI dependency. Zod was updated to the patched 4.6.6 release. Upgrading Prisma to 7 is a separate migration because its client generation and connection configuration changed; review that upgrade before production deployment. Do not run `npm audit fix --force` without testing schema generation, migrations, and the integration suite.
