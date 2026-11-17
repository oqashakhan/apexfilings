# Dashboard UI polish progress

Date: 17 November 2026. This report describes the current local checkout; no deployment or production database changes were made.

## Completed

- Both roles use the existing `DashboardShell`, design tokens, button, panel and table styles. Admin navigation already uses the same shell as Client; all 18 Admin navigation entries remain present and grouped.
- Reordered the Client navigation and replaced fragile index-based section labels with Workspace, Billing, Services, Communications and Account groups. Dashboard is active at its root URL; mobile menu exposes its expanded state and controlled navigation.
- Sidebar navigation rows no longer shrink or clip while scrolling; the account area stays outside the scroll region. Shared button, control and link focus indicators and disabled styling were improved.
- Existing permanent application references appear in the client workspace application picker and Admin company-document upload picker. The prior reference migration and internal routing IDs remain unchanged. The Client Messages title is present in the existing title map.

## Verification

- PASS: `npm run typecheck`, `npm run lint`, and `npm run build`. The first Next.js build stopped after compiling to show a security upgrade recommendation; retry completed successfully but repeated the known-vulnerability warning. No upgrade was performed.
- PASS: client dashboard render tests (6), company document unit tests (2), Admin activity render tests (3).
- PASS: isolated PostgreSQL and production-mode Next.js browser test (`tests/application-reference.integration.test.cjs`) at 1440, 768 and 390 pixels. Verified Admin/Client sidebar widths on desktop, Admin profile application tab and upload form, reference display, Messages breadcrumb and mobile drawer controls. Smoke checks opened all 18 Admin and 12 Client navigation routes at desktop and mobile widths, checked active links and page-level horizontal overflow. The application reference test also checked unique concurrent creation and stable API references in the isolated database.
- Route smoke checks do not verify every action, card, loading state, table, form or visual appearance after all asynchronous data has loaded. Application status changes, document submission and the complete navigation interaction matrix were not retested by this UI pass.

## Remaining

- A page-by-page visual and accessibility review remains for all dashboard screens, including long content, empty/error/loading states, narrow and zoomed viewports, and all review, financial and messaging controls. Existing Admin client profile tabs and shared components were preserved; no claim is made that every page has been individually redesigned.
- Production application-reference migration status is unverified. Existing `20261117_application_reference` must be reviewed and applied through a controlled deployment before production code relying on the column runs. No new migration was added by this UI pass.
- Next.js build reported that the installed version is affected by a known security vulnerability. Review the framework advisory and plan a separately tested upgrade; no security upgrade was performed in this UI task.
