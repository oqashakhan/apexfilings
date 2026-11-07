# Government filing fee approval fix

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
