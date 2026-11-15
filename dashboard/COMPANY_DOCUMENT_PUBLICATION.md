# Company document upload and publication

## Root causes and repair

The client workspace's old upload form omitted document titles/descriptions and upload progress. Its snapshot could omit older client records. Upload retries had no persistent identity, and later publication generated random notification keys, allowing repeat notifications. Publication also lacked a verified-recipient requirement.

The workspace now opens a company/application-aware modal with metadata, visibility, signature/size validation, real upload progress and safe retries. Client-scoped snapshots refresh the document list. Files remain in private storage; authenticated View/Download enforce ownership, visibility and assigned-staff access. Failed writes and transaction rollbacks remove only the newly written file.

Uploads accept a scoped UUID idempotency key and compare a server-generated fingerprint. Concurrent matching retries return one document; conflicting reuse is rejected. Publication locks the document and uses its permanent event key. Legacy notification keys are recognized. Metadata edits and hide/re-share do not send another new-document email. Private uploads do not notify the client.

The existing email outbox and in-app notification infrastructure is reused. Email uses the exact requested subject, company/title and authenticated document link, without attachments. First publication requires an active client with verified email when document email is enabled. Otherwise save privately until genuine verification. Existing document-email preferences are respected; opting out still allows the in-app notification.

## Files for this feature

- `prisma/schema.prisma`, `prisma/migrations/20261114_company_document_metadata/migration.sql`: nullable title, description, upload key/fingerprint and unique upload-key index.
- `src/server/document-publication.ts`, `src/server/storage.ts`: shared publication/update permissions, deduplication and file cleanup.
- `src/app/api/v1/documents/[...segments]/route.ts`, Admin/Client API routes: upload, metadata/publication updates, safe DTOs, ownership checks and document metadata projections.
- `src/server/admin-snapshot.ts`, `src/lib/admin-models.ts`, `AdminDemoContext.tsx`: client scope and metadata.
- Dashboard components `CompanyDocumentUpload`, `AdminClientWorkspace`, `AdminOperations`, `ClientDemoContext`, `ClientDocumentCenter`, `CompanyDashboard`: upload, immediate refresh, private/public documents and company-aware deep links.
- `NotificationCenter`, `NotificationDropdown`, layout `DashboardShell`: document links, including reopening the same URL after switching companies.
- `src/lib/admin-activity.ts`, `src/app/globals.css`: friendly metadata activity label and scoped responsive form styles.
- `package.json` and company-document tests; existing integration/client-dashboard/migration-recovery fixtures updated for the new contract. The authentication fixture now derives the actual session cookie name. Historical invoice migrations were not changed.

Prior uncommitted activity/client-identity changes were preserved and are separate from this feature.

## Verification

Passed locally against isolated PostgreSQL `apex_dashboard_test` and the production-mode Next.js server:

- `npm run db:generate`; Prisma schema validation.
- `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`.
- `npm run test:company-documents:unit`: 2 passed.
- `npm run test:company-documents` with external Playwright/Edge: passed. Actual form upload, client visibility, exact company/document deep links, manual company switching, notification bell/mark-read, desktop/mobile and no horizontal overflow.
- API coverage: concurrent upload and publication retries; mismatched key payload; private/default-private documents; explicit publication; metadata edits; legacy notification keys; email opt-out; correct ownership; assigned/unassigned Staff; unauthenticated/cross-client denial; verified-email requirement; invalid/oversize/empty metadata; storage rollback.
- Existing email job processed the two targeted fictional fixtures through a local Resend mock, with correct recipient/subject/link, no attachments and no duplicate sends on the next job run. Live Resend/inbox delivery and the production schedule were not tested.
- `npm run test:client-dashboard:integration` with Edge: passed.
- `npm run test:integration`: 2 passed.
- `npm run test:migration-recovery`: passed in a newly created isolated recovery database, preserving historical records and reporting zero schema drift after all migrations. Existing production PostgreSQL was not accessed or changed.

## Release requirements

One additive migration is required before running this code against an existing database: `20261114_company_document_metadata`. Existing document values remain null and fall back to their original filename; files and business records are preserved.

First verify the previously reported production invoice P3009 recovery using the existing recovery runbook. This change does not resolve or bypass a failed migration. Once recovery is verified, use the existing controlled migration/startup workflow (`npm run db:deploy`, then Prisma generation/build as appropriate to that workflow). Preserve `/data/apex-documents` and the existing every-minute email worker; no new worker is needed.

No deployment, Git push, production-secret change, production migration, database reset or live email send was performed.
