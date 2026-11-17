# Client meeting audit — 15 November 2026

Scope: current local checkout, including pre-existing uncommitted work. Production, Coolify, live provider accounts and the production database were not accessed. Statuses describe the requested end-to-end requirement, not just whether code exists. VERIFIED is reserved for the specific test coverage named below; it is not a production certification.

## Final production QA follow-up — 17 November 2026

- **VERIFIED locally:** Prisma schema validation and isolated `apex_dashboard_test` migration status (29 migrations) and Prisma schema diff passed. Production pending migrations and history remain unknown. Repository ordering still places invoice adjustment inserts before the migration creating InvoiceLineItem; see the recovery guide before any production migration. The historical isolated recovery test was not rerun in this follow-up because it creates fictional verified payment and refund fixtures.
- **VERIFIED locally:** A new focused test suspends a fictional CLIENT through the Owner API, confirms session revocation, blocked old session and blocked password login, and refuses an OWNER target or unauthorized client. Chat rejects unauthenticated and invalid requests and enforces its 30-per-minute send limit. Existing isolated document and staff boundary checks are summarized below. This does not establish production account status.
- **VERIFIED locally:** Public SEO crawler files and metadata/browser tests passed at desktop/mobile; the live server still serves old metadata, gives unknown routes HTTP 200, and does not redirect HTTPS www. The actual Coolify/nginx configuration remains unavailable.
- **BLOCKED:** Do not use the existing client-deletion SQL: placeholders remain, and it intentionally aborts when any invoice exists. The reported unpaid LEGACY invoice and dependent records must be retained. No production account was suspended or deleted. A retention-first checklist is in `PRODUCTION_QA_CHECKLIST.md`.
- **NOT TESTED:** Full registration/OAuth, all application review/status transitions, all private document access cases, every settings form, production delivery, Coolify settings, complete page visual/accessibility audit and production schema. Previous scoped isolated results remain documented below. No real email, payment, refund or production migration was executed.
- **CHECKS:** Public TypeScript and translation tests, dashboard TypeScript and ESLint, isolated Prisma validation/status/diff, SEO tests (2), support/suspension tests (2) and chat tests (3) passed. Both production builds passed during the immediately preceding integration pass; Next.js warned of a known security vulnerability and recommends an upgrade. The Vite build reports a future config-loader warning.
## Follow-up — 17 November 2026, functionality and integrations

Scope: local isolated `apex_dashboard_test` and mocked email provider only. No production access, real email delivery, payment creation, Stripe processing or refunds were performed in this follow-up. Existing historical findings remain below; this section applies only to the checks named here.

- **FIXED:** Public business-management pages previously displayed hardcoded Apex fees independently of published Admin pricing. `src/components/services/ManagementServicePage.tsx` now uses the existing published pricing catalog and shows an approved USD fee only when the selected state satisfies its published availability; otherwise it shows Quote required. Static fee claims in management FAQs and unverified Basic-package inclusion claims in registered-agent and address descriptions were removed. The existing public API masks unapproved prices. This does not establish what the correct business address price or package inclusion should be; Owner approval and authoritative source remain necessary. `tests/management-pricing.test.mjs` verifies published, missing and state-restricted price display in Edge with a mocked API.
- **VERIFIED (isolated):** Chat integration passed both API and mobile Client/desktop Admin browser tests: General Support and company association, retries, read states, incremental messages, refresh/login persistence, staff assignment and revocation, cross-client denial, in-app notification recipients. See `tests/chat.integration.test.cjs`; no real email delivery is implied.
- **VERIFIED (isolated):** Company document upload/publication, duplicate notification prevention, client/other-client access, test worker handling, company switching and browser links; identity upload accepts CNIC and passport. Assigned Staff request, rejection, replacement, approval and cancellation were checked by `meeting-workflows.integration.test.cjs`. Provider inbox delivery and production storage mount were not tested.
- **VERIFIED (isolated):** New `tests/support-safe.integration.test.cjs` checks 105-ticket server pagination and date/status filtering, name/reference association, cross-client denial, assignment, status, internal-note privacy, idempotent replies, and queued email/in-app records in both directions without creating payment records. Assigned Staff reply/status and unrelated-ticket denial additionally passed in meeting workflows.
- **VERIFIED (isolated):** Meeting workflows cover Staff invitation and login, assignment and suspension/revocation, customer responses pagination and read states, Admin settings selected save/cancel/reload, draft/publish/discard and mobile public pricing refresh, consent-aware broadcast batching/cancellation with no delivery, and scoped Staff access to an existing invoice PDF. The service-request integration checked ownership, duplicate prevention and notifications.
- **VERIFIED (unit):** 41 pricing/wizard tests passed, including Basic and Advanced, approved/pending state fees, optional service deduplication, and immutable finalized order snapshots. This is not official verification of present-day state fees or business-address pricing.
- **NOT TESTED:** Live email delivery, real Google OAuth, real provider payments or refunds, every Admin Settings field, all application status transitions and review decisions, every invoice/notification UI and every service/state combination. No claim of complete end-to-end functionality is made. Existing snapshot-backed lists may still have limits.
- **BLOCKED:** Production deployment remains contingent on checking existing migration history (especially invoice recovery and the application-reference migration), Coolify status, official government fee verification and Owner pricing approvals. Next.js build reports a known security vulnerability and recommends upgrading; no framework upgrade was made here.
- **CHECKS:** Prisma validation, dashboard TypeScript and ESLint, public TypeScript, both production builds (dashboard passed on retry after Next.js upgrade warning), chat (2), document/identity (2), meeting workflows (6), safe support (1), additional service requests (1), pricing unit/render (41), and public management pricing browser test (1) passed. No new migration was created.
## Continuation — current checkout

The original findings and earlier results below are retained as the baseline. This section supersedes their status only for the flows explicitly tested here. The two earlier fixes remain in place.

- **1, 3, 21 — catalog and publishing.** Owner pricing now saves isolated per-record PostgreSQL drafts for packages, fees and services. Drafts can be reloaded, reviewed, published or discarded. The API checks revision conflicts and state attestations, records the actor/time and old/new price, and updates only catalog records. The earlier state-fee “save inactive” control deactivated live pricing. It now saves an unpublished draft. Package descriptions, features and optional services come from the published API on the Vite pricing page. The terms page points to published pricing. No official state fee or address rule was approved during this work. Local Edge verified that an open mobile public pricing page retained the old price through draft save and showed the new price after Owner browser publication and focus refresh. A subsequent server quote matched; discard and stale-edit rejection passed.
- **2, 11, 15, 18, 19 — document requests.** Existing application requests now store a title, deadline and cancellation time. Staff authorization uses the assigned application. A generic identity request accepts one passport or CNIC. The upload, replacement, review and private download continue using the original document chain. Completed requests no longer lock out a future request; a new request for an already approved file requires explicit confirmation. Cancelling an outstanding request leaves its historical records intact. The request, notification and upload writes check the application scope. The local integration exercised an invitation, assigned Staff and cross-client denial, CNIC upload, rejection, replacement, approval, repeat request and cancellation. It checked the actual notification and queued email record. VPS mount and inbox delivery remain unverified.
- **8, 13, 16, 17, 23 — staff.** Owners invite a new normalized email through the existing password reset/outbox mechanism and manage the account at /admin/staff. The application detail supports assigning an operations reviewer. The /staff workspace selects only assigned applications and tickets. Staff can review documents, request files, reply to assigned tickets and open an issued PDF for an assigned application. Operations and support scopes use the existing STAFF role. Downgrades and suspensions revoke sessions and remove incompatible assignments. Local integration exercised activation and password login, reassignment boundaries, scoped review/reply, privacy of another company, audit/notifications and suspension. An authenticated request downloaded an existing issued PDF for assigned Staff and returned 404 for unrelated Staff. The test changed only the test application assignment and restored it. The browser print flow and every role permutation remain unverified.
- **9, 22 — settings.** Owner profile edits persist with an audit event. Security controls moved into Security, notification settings link to the actual preferences and Permissions links to Staff Management. Preference toggles and invoice settings no longer save uninitialized defaults after a failed fetch. Invoice settings support cancel. The shared operations mailbox keeps its configuration; category preferences apply to matching Owner mailboxes on application, document, manual-payment and support paths. Stripe notifier logic was preserved. Integration verified profile name and preferences persistence and Client denial. Contact remains a read-only display. Production integrations and external OAuth remain unverified.
- **12 — customer responses.** /admin/responses reads the existing response table, searches client, company, reference or text, paginates and marks responses read. Links open the associated application for follow-up. Isolated integration checked 27 responses across two pages, read/unread counts and Client denial.
- **20 — broadcasts.** /admin/email-broadcasts supports a saved preview, eligible count, selected recipients, consent-bound marketing, service audiences, Owner-address test queue, explicit confirmation, recipient snapshot, cancellation, guarded retries and delivery history. The existing worker stages bounded batches; dispatch checks the current address, consent, suppression and cancellation again. Marketing requires an approved sender identity/address. Client Settings and tokenized unsubscribe handle marketing preferences. Existing signed Resend events feed suppression and delivery status. PostgreSQL integration exercised opt-in/out, suppression, a stale preview, duplicate confirmation, batch size, unsubscribe after queueing and cancellation. Tests inspected outbox rows with zero dispatch attempts. Provider delivery, network retry behavior and in-flight cancellation cannot be certified by queue tests.
- **4, 5, 6, 7, 10, 14, 24–25.** Rechecked reference lookup, invoice and refund evidence gates, service request routes, workflow transitions, audit projection and payment-dependent dashboard against the baseline. These keep their earlier scoped results. The Owner navigation and profile links use existing IDs. The Clients directory now searches, filters, counts and pages in PostgreSQL; a two-page fixture verified no overlap across filtered pages. Some other lists still depend on capped Admin snapshots. Exhaustive browser coverage of every state, screen, viewport and production account remains open. State-specific address requirements need an authoritative business source.
- **26–28 — migration and release.** The additive migration `20261115_dashboard_workflows` follows `20261114_company_document_metadata`. The local test database already contained invoice prerequisites and all earlier migrations. Prisma status identified only this new migration as pending, deploy applied it, and schema diff reported no differences. The production database and Coolify were not queried. During implementation the working checkout changed externally to main at 17c94f0. That commit contains some changes from this work, including the migration. Its commit title is not a complete description of its contents. No push, checkout, deployment, production recovery or production migration was performed by this audit.

Evidence and files: `tests/meeting-workflows.integration.test.cjs`, Admin pricing/staff/document-request/responses/broadcast APIs and matching dashboard forms, `src/server/broadcasts.ts`, existing outbox/Resend routes, `prisma/schema.prisma`, the additive migration and public `usePricingCatalog` / `PricingSection`. The test runs against a production-mode Next server on localhost:3002 and Vite on localhost:3000. External delivery and financial execution are excluded.

### Latest verification

- PASSED: Prisma generation and validation, isolated migration deploy and schema diff, standalone TypeScript, dashboard ESLint, dashboard Next.js production build, and public Vite production build.
- PASSED: six new integration scenarios in `tests/meeting-workflows.integration.test.cjs`. Five ran together and the subsequent Staff PDF case ran separately against an existing issued test invoice. Edge exercised cross-app publication, mobile broadcast preview, Owner profile save/cancel/reload, and note failure/retry. The notification and broadcast tests checked queues, permissions and dispatch eligibility only. Assigned Staff ticket status updates persisted, and unauthorized reassignment was denied.
- PASSED: existing pricing integration, service request integration, four client-reference tests and identity upload integration. Existing unit/render checks passed for package and state pricing, identity, dashboard, activity, company documents, workflow transitions and invoice presentation.
- Test procedure: start local PostgreSQL, run the production dashboard with `node -r ./tests/test-env.cjs node_modules/next/dist/bin/next start -p 3002`, and run Vite on localhost:3000 with VITE_DASHBOARD_URL=http://localhost:3002. From dashboard run `node --conditions=react-server --import tsx -r ./tests/test-env.cjs --test tests/meeting-workflows.integration.test.cjs` with APEX_PLAYWRIGHT_MODULE set to the installed Playwright module for browser checks.
- Still open: production invoice migration history/Coolify status, current official state-specific requirements and fee approvals, end-to-end real provider delivery or payments, all legacy snapshot-backed lists at production scale, and exhaustive visual/accessibility coverage. Real inboxes, simulated payment processing, and production recovery were excluded. Granting marketing consent to existing customers is never part of the migration.

## Original requirement findings

### 1. Basic and Advanced packages
- Before: PARTIAL. `PricingManager`, `pricingCatalog`, `ApplicationWizard`, `usePricingCatalog`, quote/invoice logic use catalog data; `premium` maps to Advanced. Terms page still contains fixed prices and there is no persisted publish-draft separation.
- Fix: no additional change in this audit. Earlier checkout edits hide unapproved public amounts and clarify immediate publication.
- Verification: pricing unit and local pricing API integration; included-service deduplication and Basic/Advanced quoted. Full public-to-dashboard publish flow not verified.
- After: BLOCKED. Implement persistent drafts and sync all public price references; review historical names and package descriptions.

### 2. Identity document alternatives
- Before: PARTIAL. `identity-documents.ts` accepts OWNER_ID/CNIC/PASSPORT for an owner; wizard, document upload and review paths exist.
- Fix: none this audit.
- Verification: wizard/identity unit tests cover CNIC, passport, both and neither; actual request UX and every review path are not fully verified.
- After: IMPLEMENTED BUT UNTESTED end-to-end for all requested permutations; request form currently sends the generic OWNER_ID type.

### 3. Business address
- Before: PARTIAL. Wizard stores address choice; `pricing.ts` excludes included slugs. Catalog and government requirements need authoritative review.
- Fix: none; no state requirements or prices invented.
- Verification: quote tests cover generic included-service deduplication, not every address/state combination.
- After: IMPLEMENTED BUT UNTESTED for complete address workflow and public consistency.

### 4. Permanent client reference
- Before: PARTIAL. Prisma client-reference constraints/history and `AdminClientIdentity` exist; some lists are snapshot capped.
- Fix: none this audit.
- Verification: local client-reference and Admin identity tests (see test outcomes below); no production backfill was run.
- After: IMPLEMENTED BUT UNTESTED across every list and existing production account. Never regenerate references.

### 5. Invoices
- Before: PARTIAL. Existing invoice ledger, snapshot, authenticated PDF and client-profile `InvoiceCenter` are present.
- Fix: none this audit. Existing list labels incomplete totals as Pricing pending.
- Verification: local invoice API/PDF/ledger tests (below); browser coverage does not establish every profile state.
- After: IMPLEMENTED BUT UNTESTED for the full profile/browser journey and real provider payment evidence.

### 6. Refund requests
- Before: BROKEN for repeat requests after a decline; a VERIFIED order status was accepted without a corresponding verified payment record.
- Fix: `src/app/api/v1/client/[...segments]/route.ts` checks verified payment evidence and remaining balance inside the order lock; declined requests no longer block a new request. It does not execute a refund. `tests/integration.test.cjs` exercises missing verification evidence and decline/re-request.
- Verification: local mocked/integration tests below. Stripe live account and manual refund evidence not tested.
- After: IMPLEMENTED BUT UNTESTED in live provider environment; a real refund requires the existing authorized provider workflow.

### 7. Client Additional Services
- Before: PARTIAL. Existing ServiceRequest APIs/UI and notification outbox use catalog approvals and package inclusions.
- Fix: none this audit.
- Verification: local service-request integration; not every card, state and real notification delivery tested.
- After: IMPLEMENTED BUT UNTESTED across all services and live delivery.

### 8. Client support
- Before: PARTIAL. Existing support conversation API, idempotency, notifications and Owner controls; Owner search/filter pagination was added earlier.
- Fix: none this audit.
- Verification: local general integration and admin-workspace integration cover create/reply, private notes, assignment, status, search and pagination; staff support access is denied.
- After: IMPLEMENTED BUT UNTESTED for every UX/state and live delivery.

### 9. Client account security
- Before: PARTIAL. `auth/[action]/route.ts` and `AccountSecurity` implement email/password flows, rate limiting, session handling and Google-only setup.
- Fix: none this audit.
- Verification: general integration exercises selected authentication/account paths; external Google OAuth and real mailbox delivery not tested.
- After: IMPLEMENTED BUT UNTESTED for complete real-provider flows.

### 10. Application status changes
- Before: PARTIAL. `workflow.ts`, Admin API and application detail use transition gates, recorded history and notifications.
- Fix: none this audit; no payment/refund/filing status fabricated.
- Verification: workflow unit and integration tests exercise selected valid/blocked transitions; not every UI option and viewport tested.
- After: IMPLEMENTED BUT UNTESTED for all transitions and mobile dialogs.

### 11. Admin review workflow
- Before: PARTIAL. Checklist, internal review and document/payment approval prerequisites exist.
- Fix: internal note save now awaits the API, retains failed input and reports errors (`AdminApplicationDetail.tsx`).
- Verification: general workflow tests exercise selected checks; the new note failure UX has no browser test.
- After: IMPLEMENTED BUT UNTESTED end-to-end for every decision/reviewer assignment.

### 12. Customer responses
- Before: PARTIAL. Application response records are loaded in scoped Admin snapshots and rendered in application detail; no complete global response search/filter/read tracking.
- Fix: none this audit.
- Verification: general integration checks application response paths, not a full searchable responses workspace.
- After: BLOCKED on unimplemented global search/filter/pagination and read state.

### 13. Internal notes and staff assignment
- Before: PARTIAL. Application notes and support ticket assignment exist; Admin APIs are Owner-only; application staff management is not complete.
- Fix: note save failure handling in `AdminApplicationDetail.tsx`.
- Verification: support integration checks notes remain private and ticket assignment persists; no end-to-end staff application assignment test.
- After: BLOCKED on staff assignment/permissions and assignment notifications.

### 14. Recent activity
- Before: PARTIAL. `AdminActivity`, `admin-activity.ts` and AuditLog projection provide real, filtered and paginated Owner activity.
- Fix: none this audit.
- Verification: admin activity unit/integration and optional Edge browser tests below; recorded event coverage is limited to actual audit entries.
- After: IMPLEMENTED BUT UNTESTED for Staff authorization and all possible event types.

### 15. Client-profile company document upload
- Before: PARTIAL. Existing `CompanyDocumentUpload`, document API, private storage and publication helper provide the workflow.
- Fix: none this audit.
- Verification: company-document integration with local storage, mock email and optional Edge browser tests, including company switching and access checks.
- After: IMPLEMENTED BUT UNTESTED in production and with live email. See `COMPANY_DOCUMENT_PUBLICATION.md`.

### 16. Admin support requests
- Before: PARTIAL. Owner API has server-side search/status/date/pagination; Staff cannot access it.
- Fix: none this audit.
- Verification: admin-workspace integration tests more than 100 tickets, replies, notes, assignment and notification records.
- After: BLOCKED on authorized Staff workflow; provider delivery not verified.

### 17. Client-profile invoices
- Before: PARTIAL. `AdminClientWorkspace` renders `InvoiceCenter` scoped by customer ID; invoice API calculates from verified payment ledger.
- Fix: none this audit.
- Verification: local invoice and Admin integration verify client scope, PDF and ledger behavior; full profile visual journey not independently verified.
- After: IMPLEMENTED BUT UNTESTED in a real client profile/provider environment; Staff invoice access remains blocked.

### 18. Admin requests document
- Before: PARTIAL. Existing request model, upload chain, review and notifications; prior edits expose forms in Admin/client Documents.
- Fix: none this audit.
- Verification: general integration covers request, ownership, upload and approval; full rejection/reupload/UI combinations not fully tested.
- After: BLOCKED on cancellation, due dates, custom names, approved-document replacement warnings and repeat requests; no schema change in this audit.

### 19. Admin document upload
- Before: PARTIAL. Private storage, signature/type/size checks, authorization and deduplicated publication exist. Global and profile entry points differ.
- Fix: none this audit.
- Verification: company-document integration and mock worker; real storage mount and live provider delivery not verified.
- After: IMPLEMENTED BUT UNTESTED across every entry point in production.

### 20. Email all clients
- Before: MISSING dispatch workflow. `BroadcastPreview` is explicitly read-only; no recorded marketing consent, unsubscribe, suppression or campaign history.
- Fix: none this audit; no real bulk email sent.
- Verification: Owner candidate-preview API authorization test only; no campaign or delivery test possible without implementation.
- After: BLOCKED until consent/suppression/unsubscribe, snapshot, controlled queue, cancellation and history are implemented.

### 21. Pricing synchronization
- Before: PARTIAL. Public `/api/v1/pricing` and `usePricingCatalog` read live catalog; price edits immediately affect new quotes. No separate persisted draft or publishing history.
- Fix: none this audit; pre-existing checkout changes sanitize pending amounts and add confirmations.
- Verification: local pricing API integration and both builds; public website browser publishing workflow not tested.
- After: BLOCKED on true draft/review/publish/revert and complete public content sync. Existing finalized snapshots must remain immutable.

### 22. Admin settings
- Before: PARTIAL. `AdminManagement`, `AccountSecurity`, invoice settings and notification preferences contain both functional settings and read-only placeholders.
- Fix: none this audit; pre-existing changes protect payment-instruction save after load failure.
- Verification: general auth/invoice tests cover selected APIs only.
- After: BLOCKED on complete tab-by-tab persistence, effects, accessibility and permission testing.

### 23. Staff management
- Before: MISSING full management workflow. Roles/assigned application fields exist, but broad Owner-only APIs and no complete invite/role/assignment console.
- Fix: none this audit; existing access boundaries remain intact.
- Verification: tests confirm Staff denial on Owner endpoints and assigned Staff document access only.
- After: BLOCKED until least-privilege management and scoped read/write APIs are designed and tested.

### 24. Pre-/post-payment dashboard
- Before: PARTIAL. `CompanyDashboard`, `ClientDemoContext` and payment/invoice projections use real application records.
- Fix: none this audit.
- Verification: local client-dashboard integration/browser tests and Stripe mock tests; no live Stripe account or real payment tested.
- After: IMPLEMENTED BUT UNTESTED with live provider and all client scenarios.

### 25. UI/UX
- Before: PARTIAL. Responsive styles and several Edge tests exist; not all screens inspected.
- Fix: Admin application note save feedback (`AdminApplicationDetail.tsx`).
- Verification: selected desktop/mobile automated tests; no universal visual or accessibility audit.
- After: IMPLEMENTED BUT UNTESTED across all screens.

### 26. Testing and audit report
- Before: PARTIAL. Existing unit, integration and recovery test suites; no current consolidated meeting report.
- Fix: created this file and added refund evidence/regression checks.
- Verification: outcomes below; tests are local and do not certify production.
- After: IMPLEMENTED BUT UNTESTED as a complete 23-point acceptance audit; unresolved items above remain.

### 27. Implementation strategy
- Before: PARTIAL. Multiple previously requested workflows remain unfinished in this checkout.
- Fix: audited existing sources, repaired refund eligibility and note feedback, ran available focused tests and documented remaining gaps.
- Verification: see outcomes below.
- After: BLOCKED on the explicitly listed unfinished features and their end-to-end verification.

### 28. Production safety
- Before: PARTIAL. Historical invoice migration ordering failure and production recovery status are unresolved; pre-existing additive `20261114_company_document_metadata` is required by current checkout.
- Fix: no migration added, historical migration rewritten, production database changed, push or deployment performed.
- Verification: isolated migration recovery test below; production state and Coolify auto-deployment not checked.
- After: BLOCKED for production rollout until the existing invoice recovery is verified and migrations reviewed in deployment order. See `INVOICE_MIGRATION_RECOVERY.md` and `COMPANY_DOCUMENT_PUBLICATION.md`.

## Verification results

Tests use `tests/test-env.cjs`, which restricts database integration to local `apex_dashboard_test`; migration recovery uses a separate isolated database. Mocked Resend/Stripe tests do not establish live delivery or payment collection.

- Passed: Prisma client generation and schema validation; TypeScript and ESLint; public Vite and dashboard Next.js production builds.
- Passed 65 unit/render tests covering pricing, workflow status, client dashboard, Admin activity, invoice presentation, next actions and company-document forms; identity integration additionally verified private CNIC/passport alternatives and invalid uploads.
- Passed against isolated PostgreSQL and production-mode Next.js: general integration (2), pricing (1), service requests (1), client dashboard (1), Admin activity and support pagination (1), company documents (1), invoices (2), client references (4), mocked Stripe (1), invoice migration recovery (1).
- Client dashboard, Admin activity and company-document integrations included automated headless Edge checks. These cover selected desktop/mobile paths, not every required UI interaction.
- `test:migration-recovery` reproduced and repaired the historic dependency issue in a separate local database and checked preservation/drift. It did not inspect production, and the new document metadata migration is still a release dependency.
- NOT RUN: live Resend/inbox delivery, live Stripe checkout/refunds, real Google OAuth, real Coolify configuration or production database migration inspection; no secrets or production services were used.
- Current audit source changes: client refund-request API, `AdminApplicationDetail.tsx`, `tests/integration.test.cjs`, and this report. The checkout also includes substantial prior uncommitted work listed in Git status, including `20261114_company_document_metadata`.
