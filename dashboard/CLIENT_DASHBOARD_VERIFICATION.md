# Payment-aware client dashboard

Implemented in the existing Next.js dashboard. No schema or historical migration changes; no public website changes.

## Behavior

- Prepayment: server-side quote, approved fee/add-on breakdown, pending-item reasons, invoice link and existing secure Stripe payment control. No order means continue the saved application. Missing invoice/configuration shows payment setup pending.
- Postpayment: five summary cards, company details, recorded formation milestones, approved company documents, assigned staff when present, support and recent company activity.
- Unlocking requires a matching full verified receipt ledger AND verified order status. Redirect query parameters never unlock the dashboard. Partial payments, disputes, full refunds and inconsistent receipts remain separate states; refunds do not invent a new payable balance.
- Company selection is checked against the authenticated account, persists in browser storage, refreshes the workspace and scopes documents/activity/support. Late refresh responses cannot overwrite newer responses. Refresh button, window focus, tab visibility and the existing 30-second polling refresh shared documents/status.
- Admin upload, private filesystem storage, explicit sharing, notifications/email outbox, visibility updates and authorization reuse the existing systems. View and Download use the protected document API. The full Documents page now offers both actions.
- Structured verified EIN and assigned company business-address fields do not exist in the current schema. The UI shows Pending/Not assigned and links to shared EIN/formation documents where present. It never derives an EIN/address from an owner's residential address or a requested address service. There is no recurring subscription model; no billing date is invented.

## Changed files

- `src/app/api/v1/client/[...segments]/route.ts`: payment/milestone projections, draft quotes and ownership-filtered support updates.
- `src/lib/client-workspace.ts`: receipt-backed payment and evidence-backed milestone derivation.
- `src/components/dashboard/CompanyDashboard.tsx`: the two dashboard experiences.
- `src/components/dashboard/ClientView.tsx`: route integration and selected-company support context.
- `src/components/dashboard/ClientDemoContext.tsx`: selected-company persistence and refresh ordering.
- `src/components/dashboard/ClientDocumentCenter.tsx`: authorized View links alongside downloads.
- `src/components/dashboard/InvoicePaymentControl.tsx`: reusable Complete Payment label, immediate duplicate-click guard and configuration-pending message.
- `src/components/dashboard/SupportCenter.tsx`: company-scoped tickets while retaining general account support.
- `src/app/globals.css`: dashboard-only responsive layout.
- `tests/client-workspace.test.tsx`, `tests/client-dashboard.integration.test.cjs`, `package.json`: regression tests/commands.

## Local validation

- Prisma validation, TypeScript, ESLint and production build passed.
- Dashboard unit/render tests: 6 passed.
- Pricing/package/state approval tests: 41 passed.
- Workflow status tests: 2 passed.
- Dashboard integration: passed against isolated local `apex_dashboard_test`, with fictional users/orders/payments/documents only. Covers no application; Basic unpaid and Advanced paid; missing-receipt order flag; pending/failed payments; scoped dashboard records; authorized and denied private file access; internal files; visibility changes; notification/outbox creation; support ownership and status updates.
- Headless Edge/Playwright: passed at 390/768/1440px. Covers five paid summary cards, support navigation, actual Admin upload form, client refresh, company switch, persistence after reload and enabled existing Complete Payment control for a fictional issued unpaid invoice. Screenshots were visually inspected; test screenshots remain ignored under `.local/`.
- Existing Stripe integration: passed with the local mock transport, including provider-event processing. No external Stripe transaction was created by this task. Existing invoice regression tests: 2 passed.
- Existing migration-recovery regression: passed, preserving business rows and historical migration files, replaying adjustments without duplicates and reporting zero schema drift in a fresh isolated recovery database. This does not verify production recovery.

## Deployment boundary

No production database access, migration execution, secret changes or manual deployment occurred. Production recovery and Coolify automatic-deployment configuration remain unconfirmed, as reported by the owner. A main-branch push must remain paused until automatic deployment is disabled or the production recovery/deployment blockers are verified. Local tests do not prove production migration history is repaired.

To run browser checks with an available local Playwright install, set `APEX_PLAYWRIGHT_MODULE` to that module path and run `npm run test:client-dashboard:integration` against the production build on localhost:3002 started using `tests/test-env.cjs`. No Playwright dependency was added to the production application.
