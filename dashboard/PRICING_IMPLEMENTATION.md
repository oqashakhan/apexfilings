# Dynamic LLC pricing implementation

Implemented November 7, 2026. No deployment or production database changes were made. Existing uncommitted Stripe work was preserved; Stripe was not implemented or activated by this task.

## Configuration

- Basic LLC Formation: initial $199, eight included features.
- Advanced LLC Formation: initial $299, thirteen included features. The existing `premium` slug and database identities remain intact.
- Existing package prices are preserved during migration; the supplied initial prices are used only when a package is absent. Authorized owners can publish future prices.
- Agent, EIN, operating agreement, and one-year business address are included in both packages. Banking and payment guidance are additionally included in Advanced. Mail forwarding remains separate.
- No optional paid prices were supplied. Existing services receive nullable, unapproved prices. Owners must enter an approved USD price before customer selection is enabled.
- 51 jurisdictions are represented. Fifty supplied filing fees are imported as reference values, with recurring-fee descriptions and processing estimates. Alabama has no supplied value. DC's combined source label requires verification; Washington State remains separate.
- All imported state fees start inactive. Existing confirmed order totals and invoices are not updated. Official fee verification was not completed; attempted official DC/Washington pages were inaccessible through the research tool.
- Future recurring fees are displayed separately and never added to initial formation totals. No new tax engine or promotion engine was added. Quotes assess no tax or discount automatically; existing owner-authorized order discounts remain supported during pending-quotation confirmation.

## Connected workflow

The public website and application wizard load `/api/v1/pricing`. The same pure integer-cent calculator is used in the wizard and backend. `/api/v1/pricing/quote` provides an authenticated server quote. Application submission recalculates from database records inside the order transaction and stores an itemized `pricingSnapshot`.

Package changes preserve company information, remove newly included extras, and do not add paid extras on downgrade. Existing drafts autosave pricing selections through the owned `/api/v1/pricing/selection` endpoint. Unknown or legacy unpriced selections produce a pending quotation, never an invented payable amount.

The existing Services & Pricing screen now exposes an owner-only publishing editor for packages, service prices/inclusions, and state references, verification dates, processing estimates and approval status. Changes are audited. Public and wizard catalogs refresh every 30 seconds and on window focus. Finalized snapshots cannot be repriced through the order-fee endpoint. Pending quotations require approved state/service pricing before owner confirmation.

## Files created

- `prisma/migrations/20261107_dynamic_pricing/migration.sql`
- `prisma/state-pricing-reference.json`
- `src/lib/pricing.ts`
- `src/server/pricing.ts`
- `src/app/api/v1/pricing/route.ts`
- `src/app/api/v1/pricing/quote/route.ts`
- `src/app/api/v1/pricing/selection/route.ts`
- `src/app/api/v1/admin/pricing/route.ts`
- `src/components/forms/PricingSummary.tsx`
- `src/components/dashboard/PricingManager.tsx`
- `tests/pricing.test.ts`
- `tests/pricing-integration.test.cjs`
- Public website: `src/lib/usePricingCatalog.ts`

## Existing files modified by this task

- Dashboard: `package.json`, `prisma/schema.prisma`, `prisma/catalog.ts`, `prisma/seed.ts`.
- Dashboard API: client catch-all and admin catch-all routes.
- Dashboard UI: `ApplicationWizard.tsx`, `ClientDemoContext.tsx`, `ClientView.tsx`, `AdminManagement.tsx`.
- Existing regression fixture: `tests/integration.test.cjs` now requires state approval before confirming a new pending quotation.
- Public website: `src/data/pricing.ts`, `PricingSection.tsx`, `FormationWizard.tsx`, `USStateMapSection.tsx`, `StateFeeDetails.tsx`.

These are this task's changes; other modified/untracked files existed before this task.

## Validation

Prisma generation, guarded test-database migration, public TypeScript/build, dashboard TypeScript/lint/build, ten pricing unit tests, seven existing next-action/OAuth unit tests, the pricing API integration test, both application integration tests, and the existing mocked Stripe integration test passed during implementation. The first pricing integration run exposed duplicate fictional client emails in the new fixture; the fixture was corrected and the test passed on rerun.

The pricing integration test exercises owner authorization, publishing validation, server quote totals, customer isolation, saved selections, application submission, itemized snapshots, catalog updates, public catalog consistency, and prevention of repricing finalized orders. Fictional records exist only in `apex_dashboard_test`. No real provider payment or email was sent. Browser interaction/layout QA and a real Google OAuth round trip were not performed.

## Deployment sequence requiring separate approval

1. Review the entire dirty working tree, including pre-existing untracked migrations and Stripe code. Do not deploy an isolated migration without its compatible application changes.
2. Verify existing Coolify configuration and backup/restore procedures. Keep existing auth, email, storage, and origins. The public site must use its existing `VITE_DASHBOARD_URL` pointing to the dashboard origin; that origin's `PUBLIC_SITE_ORIGIN` must allow the public site.
3. Build an isolated staging environment and run the regression suites there. Use the existing test preloader and port 3002 for local database integration; it refuses nonlocal/non-test database targets.
4. After backup and deployment approval, use the existing dashboard migration startup workflow (`npm run db:deploy`), generated Prisma client, and production build. No reset, customer deletion, secret rotation, or duplicate worker is required.
5. Publish the dashboard API before the public website changes. Public pricing intentionally shows unavailable when the catalog API is unreachable; it does not fall back to stale hardcoded prices.
6. Review Alabama, DC/Washington mapping, and every official state fee; enter official HTTPS sources and dates before activating fees. Approve optional service prices only after the business supplies them.
7. Verify wizard interactions, mobile layout, origins/CORS, snapshots, authentication, OTP, outbox delivery, and document downloads in staging. Payment collection must remain disabled under the separate Stripe rollout policy.

The implementation is not declared production-ready while state verification, optional-price approval, staging/browser QA, and review of the pre-existing Stripe changes remain outstanding.
