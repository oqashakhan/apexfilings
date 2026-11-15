# Client meeting audit — 15 November 2026

Scope: current local checkout, including pre-existing uncommitted work. Production, Coolify, live provider accounts and the production database were not accessed. Statuses describe the requested end-to-end requirement, not just whether code exists. VERIFIED is reserved for the specific test coverage named below; it is not a production certification.

## Requirement findings

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
