# LLC wizard redesign

Implemented for the existing dashboard. Public website source, production configuration, and production records were not changed.

## Delivered behavior

- Compact Basic and Advanced package cards, eight Basic features in two columns on desktop, green checks, and five expandable Advanced benefits. Existing package identifiers remain unchanged.
- Two-column optional service cards on desktop and one column on mobile, selected orange states, approved USD prices, included-service labels, and removal controls for previously selected services that become unavailable.
- Server quotes still calculate all amounts in integer cents. Included services cannot incur duplicate charges. Unpriced, inactive, or state-restricted extras cannot produce a payable total. Switching packages preserves unrelated company information and existing draft persistence.
- Admin can edit names, descriptions, USD prices, approval/availability, categories, state availability and display order. Package inclusion is configured through labelled service checkboxes in the package editor. Empty state availability means all states.
- Short customer Payment Summary: package, government fee, itemized paid services, additional subtotal, discount, applicable tax and payable total. Pending pricing displays a short notice. Detailed stored pricing issues are available in the Admin order detail. Recurring state fees and processing estimates are expandable.
- Each owner can upload CNIC, Passport, or both. Neither is rejected by the wizard and submission API. Existing OWNER_ID records remain valid. Rejected or superseded documents do not satisfy the identity requirement. Admin filing approval requires at least one accepted identity file for each owner; a successful upload alone does not approve it. Other independently required documents and explicit Admin document requests remain enforced.
- Existing private upload storage, format/signature validation, 8 MB restriction, authenticated downloads, owner scoping, notifications and review workflow remain in use.

## Migration

`prisma/migrations/20261107_service_availability/migration.sql` adds only `Service.availableStateCodes` (empty array default) and `Service.displayOrder` (zero default). Applied only to the guarded local `apex_dashboard_test` database during validation. No document records are rewritten and no document enum migration is needed.

## Files

Created:

- `src/components/forms/WizardCards.tsx`
- `src/app/llc-wizard.css`
- `src/lib/identity-documents.ts`
- `prisma/migrations/20261107_service_availability/migration.sql`
- `tests/wizard-redesign.test.tsx`
- `tests/identity-integration.test.cjs`

Updated:

- `src/components/forms/ApplicationWizard.tsx`
- `src/components/forms/PricingSummary.tsx`
- `src/components/dashboard/PricingManager.tsx`
- `src/components/dashboard/AdminDemoContext.tsx`
- `src/components/dashboard/AdminOperations.tsx`
- `src/app/layout.tsx`
- `src/app/api/v1/admin/pricing/route.ts`
- `src/app/api/v1/admin/[...segments]/route.ts`
- `src/app/api/v1/client/[...segments]/route.ts`
- `src/app/api/v1/documents/[...segments]/route.ts`
- `src/lib/admin-models.ts`
- `src/lib/pricing.ts`
- `src/server/pricing.ts`
- `src/server/admin-snapshot.ts`
- `src/server/next-action.ts`
- `prisma/schema.prisma`
- `tests/payment-summary.test.tsx`
- `tests/pricing-integration.test.cjs`
- `package.json`

## Validation

- 32 pricing, component and identity unit tests passed.
- Seven existing next-action and OAuth-feedback unit tests passed.
- Identity API integration passed: CNIC-only, Passport-only, both and neither; invalid files; missing owner; upload vs acceptance; filing approval with one accepted alternative.
- Pricing API integration passed: owner permissions, editable service fields, invalid state restrictions, persisted selections, state/package pricing, and immutable historical totals.
- Both existing onboarding/application integration tests passed.
- Existing mocked Stripe regression passed. No real payment was collected.
- Dashboard TypeScript, ESLint and production build passed.
- Authenticated browser review used fictional records in the test database. Desktop package, service and identity cards and a 390 px mobile layout were inspected. A priced service updated the itemized summary. Screenshots are local, ignored test artifacts under `.local/llc-redesign-*.png`.

## Remaining rollout requirements

No optional service prices were invented. Unconfigured services remain quotation-only, and unverified state fees remain unavailable for payment. The normal local development database still has older pending migrations; this work did not apply unrelated migrations or rewrite its records. Review all pending migrations and apply them through the existing approved deployment workflow before running this code against that database.

The changes are prepared on a separate Git branch to avoid triggering a production deployment. No production deployment, database reset, live payment activation, real provider transaction or real identity upload was performed. Live Google OAuth and real email delivery were not exercised; their existing code was preserved and local regression tests passed.
