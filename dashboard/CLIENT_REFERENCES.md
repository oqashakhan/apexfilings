# Permanent client reference numbers

## Implementation

The existing project used `User.id` (a CUID) as the client reference in registration emails. There was no dedicated client reference column. Internal IDs remain the relationship/authorization keys everywhere.

`User.clientReference` is now a unique text value. A PostgreSQL check requires every CLIENT to have exactly nine digits with a nonzero first digit. It remains nullable for non-client roles. A database trigger assigns the number automatically to every newly inserted CLIENT, including email, public onboarding and Google registrations, and users promoted to the CLIENT role. Clients and Owners cannot replace a valid assigned value through normal updates; request bodies containing `clientReference` are rejected.

Generation uses PostgreSQL's `gen_random_uuid()` secure random bytes, takes the first 32 random bits, and uses rejection sampling to generate an unbiased value from 100000000 through 999999999. No sequence, timestamp, user count or frontend randomness is used. PostgreSQL's [UUID generator source](https://github.com/postgres/postgres/blob/master/src/backend/utils/adt/uuid.c) uses `pg_strong_random`. This requires PostgreSQL 13+ and does not require an additional extension.

Each candidate is atomically reserved by inserting into `ClientReferenceHistory`, whose reference has a unique constraint. `ON CONFLICT DO NOTHING` retries up to 100 times. The unique constraint on `User.clientReference` is an additional protection. Reservations and user creation commit/roll back together. The history's user FK is deferred so the BEFORE INSERT trigger can reserve a number before its user row exists. Failed registration does not commit an orphan reservation.

## Migration and history

`prisma/migrations/20261107_unique_client_references/migration.sql` is an atomic additive migration:

1. Adds a nullable text field and unique index without replacing `User.id`.
2. Creates `ClientReferenceHistory` with `userId`, `previousReference`, `clientReference` and assignment time. The old reference is the actual previous displayed ID, or a staged legacy reference if present.
3. Installs automatic generation and immutability triggers/functions.
4. Backfills existing clients, reserving valid nine-digit legacy values before allocating new random numbers. Existing valid unique numbers are preserved. Invalid/missing values get new numbers.
5. Enforces format and required-for-CLIENT checks after backfill.

No users, credentials, OAuth links, sessions, applications, companies, notifications, documents, orders, invoices or Stripe references are deleted or re-keyed. Existing email outbox contents and issued documents are not rewritten. History preserves old-to-new lookup for authorized operational/audit access. References are identifiers, not authentication credentials.

The initial backfill runs in the migration transaction and briefly locks the User table with the schema change. `apex_backfill_client_references()` is idempotent; the separate command below can check/rerun it later. It does not regenerate valid references.

## Locations

- Client: account overview, profile, application details and support, with Copy Reference.
- Owner: client table, customer workspace/profile, application review, order customer details and support requests.
- Owner client search: an exact nine-digit query is sent to the authenticated database-backed API, including clients outside the snapshot's 1000-row display limit.
- New admin registration emails use the new reference while their links retain internal IDs.
- Client dashboard, Owner snapshot, client detail/list, application/customer, order/document/payment and support API projections include the database value where appropriate. All existing authorization checks remain in place.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20261107_unique_client_references/migration.sql`
- `scripts/backfill-client-references.ts`
- `package.json`
- `src/server/http.ts`
- `src/server/client-auth.ts`
- `src/server/google-client.ts`
- `src/server/admin-snapshot.ts`
- `src/app/api/v1/auth/google/route.ts`
- `src/app/api/v1/admin/[...segments]/route.ts`
- `src/lib/admin-models.ts`
- `src/components/dashboard/ClientReference.tsx`
- `src/components/dashboard/ClientDemoContext.tsx`
- `src/components/dashboard/ClientView.tsx`
- `src/components/dashboard/AdminOperations.tsx`
- `src/components/dashboard/AdminClientWorkspace.tsx`
- `src/components/dashboard/AdminApplicationDetail.tsx`
- `src/components/dashboard/SupportCenter.tsx`
- `tests/client-references.test.cjs`
- `tests/integration.test.cjs`
- This report.

## Production steps — not executed

Use the normal backed-up dashboard deployment process, not a database reset. Generate Prisma Client for the new schema during the normal build (`npm run db:generate`, then `npm run build`). Apply `npm run db:deploy` to the dashboard's actual database before starting the new application code; this migration automatically assigns references to existing clients and records the mapping. Do not start the new code against the old schema.

After migration, in the same dashboard container:

```sh
npm run clients:backfill-references
```

This defaults to a read-only count: clients and those needing backfill. It prints no credentials, names, emails or individual reference values. Only if repair/backfill is needed:

```sh
npm run clients:backfill-references -- --apply
```

This calls the idempotent database function. It assigns references only to missing/invalid client records and preserves valid numbers and internal IDs. No seed command is required. Verify one existing account, a new email registration, a new Google registration and Owner exact-reference search after deployment.

## Validation

The migration and backfill were executed only against isolated local `apex_dashboard_test`; the normal local database and production were not migrated. A pre-migration numeric legacy ID was preserved. Missing/invalid staged records, valid preservation and repeated backfill were also tested in a rolled-back isolated transaction.

Tests cover 32 concurrent creations across ordinary and the actual Google account-creation helper, forced candidate collision/retry, database uniqueness, immutability, profile edits, historical mappings, matching Client/Owner API values, Owner exact search, unauthorized access, API edit rejection, support details, additional companies/applications and unchanged document relationships. The shared display component was server-rendered and checked for the stored value and Copy Reference action. Existing HTTP email/public onboarding registration tests assert references and stability through security/application/payment/document workflows. Google identity-provider redirects/token exchange were not exercised against a live Google account.

Passed: four client-reference integration tests, both existing onboarding/dashboard integration tests, the pricing API integration test, Stripe Checkout/provider lifecycle integration test and all 41 pricing/component tests (49 tests total). TypeScript, ESLint and the production build passed. The default check and explicit idempotent backfill command were tested against the isolated database and reported zero remaining invalid clients/zero changes on rerun. The public website source tree was unchanged.
