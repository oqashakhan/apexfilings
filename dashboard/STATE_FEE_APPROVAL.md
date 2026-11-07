# Government filing fee approval fix

## Live follow-up investigation — November 7, 2026

Read-only request to `https://app.apexfilings.com/api/v1/pricing` at 16:20 UTC returned HTTP 200 and `Cache-Control: no-store`. The running production API returned Louisiana as:

```json
{"code":"LA","state":"Louisiana","referenceFilingFeeCents":10000,"filingFeeCents":null,"active":false,"verifiedAt":null,"sourceReference":"Client reference: State price online processing time filing fee annual fee.docx; not independently verified"}
```

Advanced's live `serviceFeeCents` is 29900. All 51 live reference fields match `prisma/state-pricing-reference.json` (50 supplied values and unspecified Alabama). No live state record is active. This proves the reference data is present in the running application's database-facing API; it is not evidence of Owner approval. No authenticated production quote, customer record, migration ledger or Coolify configuration was accessed.

### Exact trace and cause

- `src/components/forms/ApplicationWizard.tsx`: the state selector supplies `Louisiana`; `useApplicationQuote.ts` POSTs it with package slug `premium` to `/api/v1/pricing/quote`.
- `src/app/api/v1/pricing/selection/route.ts`: draft persistence resolves the state name to its database record and stores `Company.formationState`. The quote accepts either trimmed state name or state code `LA`.
- `src/server/pricing.ts`: reads `StateFilingFee` directly through Prisma on each catalog/quote request. No server pricing cache is present.
- `prisma/schema.prisma`, model `StateFilingFee`: `referenceFilingFeeCents` is informational. `filingFeeCents` is the charge. There is no separate state `priceApproved` flag: approval is represented by `active`, a configured fee, `verifiedAt` and a valid HTTPS source.
- `src/lib/pricing.ts`, `quotePricing`: the live Louisiana fields fail these checks; the reference is never substituted as a charge. Reproducing this pending state through the authenticated local API returns `governmentFeeCents: null`, `totalCents: null`, `knownSubtotalCents: 29900`, `referenceSubtotalCents: 39900`, `paymentAllowed: false`. The reference subtotal is explicitly not payable. These quote fields were not obtained using a production customer session.
- `src/components/forms/PricingSummary.tsx`: renders `Being confirmed` when the server's government fee is null. Changing that text or forcing $100 would conceal the unresolved approval.
- `src/server/http.ts` sets `Cache-Control: no-store`; catalog and quote fetches also use `no-store`. The wizard reloads its catalog every 30 seconds and on window focus, and requests another quote when the catalog changes. Finalized orders intentionally retain snapshots; pending orders recalculate from the catalog.

`20261107_dynamic_pricing/migration.sql` adds the reference/approval fields and imports Louisiana's reference at 10000 cents. It deliberately does not activate the fee. `20261107_exact_order_pricing/migration.sql` only adds `Service.automaticCharge` and `Service.requiredCharge`; it neither imports nor approves state fees. `prisma/seed.ts` creates unconfigured state records; running the seed is not an approval operation. Re-running an already applied migration will not turn reference values into charges.

### Follow-up code changes

- New `src/lib/state-fee-diagnostics.ts`: shared missing/pending/approved checks and exact blocker codes. Also rejects future verification dates consistently with the approval API.
- `src/lib/pricing.ts`: uses that shared check and exposes the specific blockers in quote `pendingItems[].reason` and `issues`.
- `src/components/dashboard/StateFeeApproval.tsx`: uses the same check and displays the actual payment blockers to the Owner.
- New `scripts/diagnose-state-pricing.ts`, exposed as `npm run pricing:diagnose`: read-only transaction against the environment's configured database; lists pending/failed migrations, schema gaps, reference mismatches and each state's approval blockers. Never prints connection credentials or customer data. Exit 1 indicates migration/import/schema problems; pending approvals are reported separately.
- `tests/state-fee-approval.test.tsx` and `tests/pricing-integration.test.cjs`: missing, pending, approved, source/date/amount validation and uncached quote refresh coverage. API fixtures restore the prior state records.

### Required production steps — not executed

1. In the **dashboard** Coolify container, after explicitly deploying this diagnostic code through the normal process, run `npm run pricing:diagnose`. It uses that container's `DATABASE_URL`; a local database result does not establish production migration status.
2. Review its pending/failed migration list. If migrations are pending, take the normal backup and apply them through the existing deployment/startup workflow (`npm run db:deploy`). Repository deployment instructions specify `npm run db:deploy && npm run start -- -p 3000`; the actual live Coolify command was not available to verify. No new migration is introduced by this follow-up. Do not reset or blindly rerun the catalog seed.
3. Sign in as an existing **OWNER**. Open Admin → Services & Pricing → State fees → Louisiana. Verify the applicable current official initial filing fee; enter the verified amount, source URL and verification date, check the confirmation(s), and click **Verify and approve filing fee**. The owner-only PATCH endpoint enforces this and records `STATE_FEE_APPROVED`. A client cannot approve pricing.
4. If the genuinely verified amount is $100, the record must contain `filingFeeCents: 10000`, `active: true`, a valid nonfuture `verifiedAt` and its official HTTPS source. A fresh unfinalized Advanced quote then returns `governmentFeeCents: 10000`, `totalCents: 39900`, `paymentAllowed: true` (with no other unresolved items). Repeat verification separately for each supported state. Do not bulk approve reference prices.
5. Focus/reload the client wizard or allow its 30-second catalog refresh. Confirm the server quote and summary. A code push alone cannot perform the Owner's verification or approval.

The local diagnostic reported 13 pending migrations in `apex_dashboard`; the isolated `apex_dashboard_test` had all 18 applied, matching references and zero approved state fees before tests. Neither result was represented as production migration-ledger evidence. Production's live reference fields are present, but its exact ledger must still be checked inside its container.

Follow-up validation passed: 41 unit/component tests; authenticated pricing integration (missing record plus pending/approved Basic and Advanced quotes for LA, FL, AK, WY, CA, DE and TX, optional services, ownership and frozen orders); both existing onboarding/application integration tests; typecheck; lint; production build. The read-only diagnostic was run against both local database schemas without applying migrations or altering approval records. Only isolated integration tests temporarily changed fictional/test pricing and restored original state rows.

## Findings

Louisiana is correctly mapped to `LA`, with an imported initial reference fee of 10000 cents. In the migrated local test database its payable fee is null, `active` is false, and `verifiedAt` is null. The backend correctly excludes an unapproved reference amount. The $299 known subtotal is therefore the Advanced package fee, not a complete payable total.

All 50 supplied filing fee amounts, recurring descriptions, and processing estimates were compared directly with `State price online processing time filing fee annual fee.docx` and match the existing import. Alabama remains absent from the supplied data. The combined DC/Washington label remains marked for jurisdiction verification. No missing Louisiana mapping or incorrect $100 import was found.

The normal local `apex_dashboard` database still reports only five older applied migrations; its Louisiana filing fee and verification date are null. This task did not apply unrelated pending migrations to that database or access the deployed production database.

## Louisiana source discrepancy

As checked November 7, 2026, the Louisiana Secretary of State Forms & Fee Schedule lists domestic LLC articles (#365) at $125, while the supplied client reference is $100. The legislature's fee statute separately lists $100. These sources require owner review of the applicable current filing total; the application must not assume the old reference is the current payable fee.

- Published schedule: https://www.sos.la.gov/business-services/forms-fee-schedule
- Statutory fee text: https://www.legis.la.gov/legis/Law.aspx?d=103670

The code supports Advanced + $100 = $399 and Basic + $100 = $299 when an owner genuinely verifies and approves $100. If $125 is approved, Advanced totals $424 and Basic totals $324. No reference was overwritten, and neither amount was automatically approved.

## Delivered approval workflow

Admin Services & Pricing → State fees → select any state → Verify and approve filing fee.

The dedicated panel shows the imported reference, current payment eligibility and last verification. It provides a USD initial fee field, official HTTPS source URL, verification date and explicit owner attestation. When the entered fee differs from the imported reference, a separate acknowledgement is required. Owners can save an inactive draft without enabling payment. Future recurring fees and processing estimates remain separate editable information.

The owner-only backend enforces these requirements, rejects future verification dates and invalid source URLs, preserves the original reference, and records an approval/draft audit event with the old, reference and entered fee amounts. It does not globally activate imported fees. The quote calculator also rejects an active record whose source is not a valid HTTPS URL.

Approved records flow through the existing database-backed quote API for every supported jurisdiction. Open wizard catalogs refresh every 30 seconds and on focus; this triggers a fresh server quote. Admin context refreshes after publishing. Finalized orders retain their original prices.

## Changed files

- `src/components/dashboard/StateFeeApproval.tsx` — dedicated state verification and approval panel.
- `src/components/dashboard/PricingManager.tsx` — connects the state panel to the existing catalog screen and refresh workflow.
- `src/lib/state-fee-approval.ts` — shared source/date/attestation/difference validation.
- `src/app/api/v1/admin/pricing/route.ts` — enforces approval and writes audit history.
- `src/lib/pricing.ts` — validates the source before using an approved initial fee.
- `tests/state-fee-approval.test.tsx` — all-state package calculations, Louisiana totals, validation and Admin UI rendering.
- `tests/pricing-integration.test.cjs` — owner approval checks and both packages across Louisiana, Florida, Alaska, Wyoming, California, Delaware and Texas.
- `tests/integration.test.cjs` — existing approval fixture now explicitly attests verification.
- `package.json` — includes the new tests in `test:pricing`.

No schema migration or public website source change is required by this fix. Existing pending pricing migrations still need review/application through the approved deployment process where absent.

## Validation

39 unit/component tests passed, including both packages for every imported jurisdiction, unknown Alabama, Louisiana $100/$125 alternatives and separate recurring fee data. Pricing API integration and both existing onboarding/application integration tests passed against the isolated local test database. TypeScript, ESLint and the production build passed after correcting a narrow test-fixture type and JSX apostrophe lint error found during the first checks.

All API approval fixtures are fictional test assertions in `apex_dashboard_test`; they are not genuine verification of production fees. Temporary fee changes are restored by the tests. No production approval, payment collection, database reset, record deletion, deployment or GitHub push was performed. The remaining production requirement is owner verification and approval of the selected state's current applicable fee.
