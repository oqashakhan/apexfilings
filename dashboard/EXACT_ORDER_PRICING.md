# Exact order pricing fix

## Root causes

The wizard used fresh quotes, but Client order details, Admin order details and list rows continued to render nullable saved fee columns or an old pending snapshot. Application submission also stored null third-party and additional fee totals whenever any other part of the quote was unresolved. Consequently a missing government approval made otherwise known zero categories appear unconfigured. Historical pending snapshots did not reflect newly approved catalog prices. There was no automatic, catalog-backed third-party fee configuration.

The government reference import itself is correct: all 50 supplied fees were checked against `State price online processing time filing fee annual fee.docx`. Alabama is absent and remains unknown. DC's combined source label remains flagged for review. Reference values are not verification or approval.

Read-only inspection found the normal local `apex_dashboard` database still has only five older migrations. Its Florida, Alaska and Wyoming fees and verification dates are null. It was not migrated or edited during this task. The migrated isolated test database has Florida 12500, Alaska 25000, Wyoming 10000, Delaware 11000, Texas 30800 and California 7000 cents as reference values; all six were inactive/unverified before the test fixtures temporarily approved prices and restored them.

## Implementation

- `quotePricing` remains the authoritative integer-cent calculator. It now includes third-party totals, approved line metadata, pending line reasons/currency, known subtotal, pricing completeness, payment eligibility and order-confirmation state.
- `resolveOrderQuote` shares live pricing for pending orders across every relevant dashboard/API response. Finalized orders use their saved price snapshot and stored amount fields; current catalog changes do not reprice them.
- Zero configured third-party charges, zero extras and zero discounts are zero cents, even when another required fee is unresolved. Missing selected prices remain named blockers. Incomplete quotes display a known subtotal, never a payable subtotal.
- Third-party fees reuse the Service catalog. `automaticCharge` distinguishes an automatically applicable charge from an elective add-on; `requiredCharge` blocks payment when an active applicable charge lacks an approved USD price. State applicability, availability and existing service approval rules are retained. Inactive/out-of-scope charges do not apply. Optional unknown automatic charges are omitted rather than invented. Automatic fees cannot be charged again through add-on selections or when included in the package.
- Owners can create/edit third-party fees through Services & Pricing. Imported government amounts and verification status are shown with the requirement for an official HTTPS source, date and explicit activation. No import was auto-approved.
- Owner fee confirmation validates against the same quote, including third-party prices, recalculates the complete total on the server, snapshots the result, and preserves UNPAID status. Finalized records cannot be repriced, including legacy orders without a JSON snapshot.
- A complete pending quote can require order confirmation before payment becomes available. Pricing completeness and actual payment status remain separate. Reads do not mutate orders, collect payment, or issue a paid invoice.
- Client/Admin order breakdowns and list totals now consume the server quote; invoice references continue to belong to the stored order. Existing taxes and owner-authorized discounts are preserved in finalized snapshots. No tax or promotion amounts were invented.

## Changed files

- `prisma/schema.prisma`
- `prisma/migrations/20261107_exact_order_pricing/migration.sql`
- `src/lib/pricing.ts`
- `src/lib/admin-models.ts`
- `src/app/api/v1/pricing/quote/route.ts`
- `src/app/api/v1/client/[...segments]/route.ts`
- `src/app/api/v1/admin/[...segments]/route.ts`
- `src/app/api/v1/admin/pricing/route.ts`
- `src/server/admin-snapshot.ts`
- `src/components/dashboard/ClientDemoContext.tsx`
- `src/components/dashboard/ClientView.tsx`
- `src/components/dashboard/AdminOperations.tsx`
- `src/components/dashboard/PricingManager.tsx`
- `src/components/forms/PricingSummary.tsx`
- `src/components/forms/WizardCards.tsx`
- `tests/pricing.test.ts`
- `tests/pricing-integration.test.cjs`
- `tests/payment-summary.test.tsx`

## APIs

- `POST /api/v1/pricing/quote`: complete itemized server quote; owned submitted applications use saved selections/order state.
- `GET /api/v1/client/dashboard`, `/client/applications`, `/client/orders`: attach `order.pricingQuote` or `pricingQuote`.
- `GET /api/v1/admin/orders` and `/admin/snapshot`: attach the same resolved quote.
- `POST /api/v1/admin/pricing`: owner-only creation of a third-party charge, with validation/audit.
- `PATCH /api/v1/admin/pricing`: existing state/service approval with new required-charge configuration.
- `PATCH /api/v1/admin/orders/:id`: authoritative pending-order confirmation; finalized prices remain immutable.

## Validation and limits

35 pricing/component/identity unit tests passed, including Basic/Advanced state totals, extras, zeros, included-service deduplication, unknown required charges and historical snapshot preservation. The expanded pricing API integration passed, including owner-only approval/creation, state scopes, full Client/Admin/wizard consistency, exact confirmation, unpaid status and absence of payment records for the newly confirmed test order. Existing onboarding/application integration and private identity integration passed. TypeScript, ESLint and the production build passed.

Only the guarded local `apex_dashboard_test` database received the additive two-boolean migration and fictional test records. Pricing approvals used by tests were confined to that database and restored after the tests. No real payment, production invoice, customer record or production secret was modified. Public website source was not changed. Live production configuration/database state was not accessed.

## Remaining rollout blockers

Review and apply the pending migrations through the approved existing startup/deployment process before using the normal local database or deploying this revision. Verify official state sources and approve the required fee records through Admin. Supply and approve genuinely applicable optional-service and third-party prices; none were invented. Do not activate live payment collection as part of this pricing fix. No deployment or GitHub push was performed by this task.
