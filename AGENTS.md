# APEX FILINGS — PROJECT CONTEXT & DEVELOPMENT RULES

## 1. Project Overview

Apex Filings is a company formation platform offering US LLC formation and related business services.

Public website: https://apexfilings.com

Client and Admin Dashboard: https://app.apexfilings.com

GitHub repository: `oqashakhan/apexfilings`

Company branding:
- Primary orange: #F04623
- Dark: #171717
- White: #FFFFFF
- Optional navy: #191F29

Design preference: Premium, clean, modern SaaS interface. Avoid unnecessary redesigns, clutter, and excessive animations.

## 2. Technology Architecture

### Public Website
- React
- Vite
- JavaScript/TypeScript as used in the existing code
- Existing public website forms and onboarding

### Dashboard
- Next.js App Router
- TypeScript
- Tailwind CSS
- Backend APIs integrated inside Next.js
- API routes under `dashboard/src/app/api/v1/`

### Database
- PostgreSQL
- Prisma ORM
- Schema: `dashboard/prisma/schema.prisma`
- Migrations: `dashboard/prisma/migrations/`

### Hosting
- Hostinger VPS
- Ubuntu 24.04
- Coolify
- Public website: apexfilings.com
- Dashboard: app.apexfilings.com

### Document Storage
- Private VPS storage
- Existing storage directory: `/data/apex-documents`
- Persistent volume configured in Coolify
- Never expose private documents through public filesystem URLs.

IMPORTANT: The dashboard backend is integrated into Next.js. Do not create a separate Express backend or unnecessary backend service.

## 3. Existing Infrastructure

Coolify contains:
1. Public Vite website application.
2. Next.js dashboard application.
3. PostgreSQL database resource.

Dashboard application:
- Base directory: `/dashboard`
- Internal port: `3000`
- Health endpoint: `/api/v1/health`

Existing deployment uses Prisma migrations through the dashboard startup workflow.

Inspect actual Coolify configuration and repository files before suggesting infrastructure changes.

## 4. Features Confirmed Working by the Owner

The owner has confirmed that these features are implemented and working:

- Google Login
- Email/password authentication
- Email OTP verification
- Resend transactional email sending
- Dashboard notifications
- Admin client management

Do not rebuild these features unnecessarily.

Preserve the existing authentication, session management, Resend integration, notification infrastructure, and role permissions.

## 5. Other Features Recently Implemented

The owner has instructed Codex to complete:

- Public website and dashboard integration
- LLC application workflow
- Client company overview
- Application progress tracking
- Next Action card
- Admin customer management workspace
- Admin application status management
- Document upload and review
- Admin document sharing
- Client document downloads
- Client/Admin synchronization
- Mobile responsiveness
- Security and permissions

The owner reported that the non-payment implementation task was completed.

However, inspect and test the actual repository before claiming every feature is fully functional.

## 6. Payment System Status

IMPORTANT: Stripe payment integration has NOT been implemented yet.

The next major development task is:

**Implement Stripe Checkout for Apex Filings.**

Requirements:

- Stripe-hosted Checkout
- Server-side price calculations
- Secure Checkout Session creation
- Stripe webhook signature verification
- Idempotent payment processing
- PostgreSQL payment records
- Order and application integration
- Client payment history
- Admin payment management
- Invoice and receipt handling
- Full and partial refunds
- Refund requests
- Resend customer payment emails
- Admin payment notifications
- Payment audit logs
- Payment reconciliation

Use Stripe TEST MODE first.

Do not enable live payments automatically.

Do not invent company details or bypass Stripe business eligibility requirements.

The business must have a legitimate eligible Stripe account before live processing.

Never store card numbers or CVV.

## 7. Existing Environment Configuration

The dashboard already uses environment variables for:

- DATABASE_URL
- APP_ORIGIN
- PUBLIC_SITE_ORIGIN
- ONBOARDING_HANDOFF_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- RESEND_API_KEY
- EMAIL_FROM
- EMAIL_OTP_SECRET
- EMAIL_JOB_SECRET
- ADMIN_NOTIFICATION_EMAIL
- PRIVATE_DOCUMENT_DIR
- RESET_DELIVERY

Some additional environment variables may exist.

Inspect actual code and Coolify configuration before adding or changing variables.

Never print secret values or commit them to GitHub.

Stripe will require new server-side configuration for test and live modes.

## 8. Email Worker

The project uses a database-backed email outbox and an existing email worker.

Worker command:

`node scripts/run-email-job.mjs`

The scheduled worker should run every minute in the dashboard application environment.

Verify the actual Coolify scheduled task before changing it.

Do not create duplicate workers.

## 9. Development Rules

These rules are mandatory:

1. Inspect the existing repository before editing.
2. Understand existing Prisma models and API routes.
3. Reuse working code and existing components.
4. Do not rebuild the project from scratch.
5. Do not create a separate Express backend.
6. Do not introduce duplicate authentication or notification systems.
7. Do not reset or delete the production PostgreSQL database.
8. Do not delete customer records.
9. Do not change production secrets.
10. Do not break Google Login, OTP, Resend, or document storage.
11. Use safe Prisma migrations.
12. Enforce Admin and Client authorization on the backend.
13. Validate customer ownership on every protected resource.
14. Keep documents private.
15. Use real database data, not production mock data.
16. Preserve existing branding and responsive layouts.
17. Run lint, type checks, builds, and relevant tests.
18. Do not deploy automatically.
19. Do not push to the production branch without explicit approval.
20. Report exactly what was changed and what remains incomplete.

## 10. Working Style

The owner prefers:

- Simple explanations.
- Step-by-step guidance.
- Complete copy/paste implementation prompts when needed.
- No unnecessary technical complexity.
- Practical instructions for Codex and Coolify.
- One deployment step at a time.

When encountering an error:
- Inspect the exact logs.
- Identify the actual cause.
- Fix the root problem.
- Do not randomly change environment variables.
- Never disable security checks just to make deployment pass.

## 11. Current Project Goal

Complete Apex Filings as a reliable US LLC formation platform.

The target customer workflow:

Public Website → Registration/Login → LLC Application → Order Summary → Stripe Payment → Admin Review → Missing Documents if required → Filing Process → Final Company Documents → Client Download.

The Admin must manage customers, companies, applications, documents, orders, payments, notifications, and progress.

The Client must see their own companies, applications, payments, documents, notifications, and next actions.

Every workflow must use real PostgreSQL records and secure backend APIs.

## 12. First Task in the New Codex Account

Start by inspecting the entire existing repository.

Verify:
- Current Git branch and working tree.
- Existing public website architecture.
- Existing dashboard architecture.
- Prisma models.
- Current payment-related code, if any.
- Existing order and invoice models.
- Existing notifications and email outbox.
- Existing application workflow.
- Existing tests.

Then prepare a Stripe implementation plan.

Implement Stripe in test mode only after the audit.

Do not assume a feature is missing merely because it is not described here. Verify the actual code first.