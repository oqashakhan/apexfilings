# Apex Filings public-site SEO audit

Date: 17 November 2026. Production was inspected read-only; changes below are local and have not been deployed.

## Findings and changes

- FIXED: The homepage canonical, Open Graph URL, ContactPage schema, robots sitemap URL and sitemap used the wrong singular domain (`apexfiling.com`). These now use `https://apexfilings.com`.
- VERIFIED (live, before changes): `/robots.txt` returned 200 `text/plain`; `/sitemap.xml` returned 200 `text/xml`. Both referenced the wrong domain. Public requests using Googlebot, Bingbot and OAI-SearchBot user agents returned 200 for `/services/ein`; this does not prove real crawler access through every upstream security layer.
- FIXED (local build): robots explicitly permits Googlebot, Bingbot, OAI-SearchBot and all other user agents. GPTBot is not specifically blocked. Robots is not access control.
- FIXED (local build): Route-specific static HTML contains descriptive titles, descriptions, canonical and social metadata, a heading, introductory content and internal links. The interactive React application replaces this initial content. Sitemap and generated pages share the existing service data, avoiding invented pricing and last-modified dates.
- FIXED (local): Unknown React routes show a missing-page message instead of the homepage and receive `noindex,follow` after JavaScript runs. Start, formation handoff and consultation routes also receive noindex after JavaScript runs. Indexed pages receive index,follow in the rendered application.
- BLOCKED: The live server returns 200 for nonexistent paths. A real HTTP 404 and server-side noindex for non-indexable paths require inspection and configuration of the actual Coolify web server; client-side metadata cannot change an HTTP status. The existing SPA rewrite must remain for functional routes.
- BLOCKED: The live `www.apexfilings.com` responds 200 instead of redirecting to the preferred host. HTTP to HTTPS redirected in the observed request. Configure and test canonical-host redirects in Coolify without breaking the dashboard. Check both HTTP and HTTPS and trailing slash behavior after deployment.
- NOT TESTED: Whether Coolify serves generated route-specific `dist/<route>/index.html` for direct requests, preserves XML content types, or redirects trailing slashes consistently. Verify these before submitting the sitemap; Vite preview passed, but its behavior does not establish nginx/Coolify behavior.
- VERIFIED (source): The main pricing hook fetches the existing published dashboard pricing API. No new prices were introduced. Existing service copy includes package-inclusion and management-service fee claims that may not track the live published catalog; these require an owner review against approved pricing before relying on them as current. Private dashboard and financial workflows were not changed.
- NOT TESTED: Real crawler access, Search Console coverage, indexing, Core Web Vitals, provider verification and actual content delivery by Coolify. JavaScript execution, firewall behavior and indexing decisions remain external. Search appearance and ChatGPT citations are not guaranteed.
- VERIFIED (source): No Search Console or Bing verification token was found in the inspected source. Do not invent tokens.
- NOT TESTED: Full image/link inventory, all form submissions, every page at every breakpoint, or external-provider behavior. Existing footer includes placeholder legal/accessibility links (`#`). No dedicated state formation pages or separate FAQ page were found; the existing homepage offers a state selector and FAQ section. No unsupported state pages were invented.

## Final robots.txt

```text
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: *
Allow: /

Sitemap: https://apexfilings.com/sitemap.xml
```

## Sitemap URLs

The source of truth is `public/sitemap.xml`; build output regenerates it from `src/lib/seo.ts`. Locally checked routes: /, /why-us/, /pricing/, /contact/, /how-it-works/, and /services/{uk-ltd-formation,llc-formation,registered-agent,ein,business-licenses,annual-report,business-documents,mail-forwarding,business-banking,operating-agreement,itin,trademark,consultation,resale-certificate,dissolve-llc}/. They do not include dashboard, login or private customer URLs. The sitemap intentionally does not claim separate state pages exist.

## Local verification

- VERIFIED: `npm run lint` (TypeScript), `npm run build`, `node --import tsx --test tests/translation.test.ts` (3 passing).
- VERIFIED: `node --test tests/seo.test.mjs tests/seo-browser.test.mjs` with `APEX_PLAYWRIGHT_MODULE` set, against Vite preview: sitemap URLs return 200 and distinct static metadata and headings; JSON-LD parses; robots crawler groups and sitemap reference match; desktop/mobile browser rendering, canonical URLs, rendered robots directives and missing-page UI checked. Mobile overflow was checked on pricing only.
- NOT TESTED: Actual search engine validators, authoritative discovery/coverage, production after deployment, and a complete browser navigation or accessibility audit. Build emits a Vite future native-config-loader extension warning.

## Search engine setup after controlled deployment

1. Confirm the public deployment serves the generated HTML on every sitemap URL, canonical redirects, correct robots and sitemap content types, and genuine 404s for unknown URLs. Verify public pages while retaining dashboard authentication.
2. Add and verify the domain or URL-prefix property in Google Search Console using a Google-provided DNS, HTML file or meta token. Submit `https://apexfilings.com/sitemap.xml`, inspect representative URLs, and monitor indexing and crawl errors.
3. Verify the site in Bing Webmaster Tools using its provided method, submit the same sitemap, and inspect crawl and indexing reports.
4. Check real crawler access and bot-protection logs for Googlebot, Bingbot and OAI-SearchBot. User-agent impersonation alone is not definitive.

## Follow-up verification, 17 November 2026

- LIVE VERIFIED: All 20 URLs in the proposed sitemap returned HTTP 200, but every initial response contained the old homepage title and singular-domain canonical. Live robots and sitemap still use the old domain; the SEO changes have not been deployed.
- FIXED locally: `public/404.html` provides a branded noindex error page ready for a server to serve with HTTP 404. Build output includes initial noindex directives for `/start/`, `/formation/start/`, and `/consultation/` while preserving their React entry points. The branded file alone does not change the HTTP status.
- BLOCKED: Repository inspection found no Coolify, nginx, Docker or Railpack configuration for the public website. `_redirects` and `netlify.toml` are Netlify-specific and do not establish Coolify behavior. No web-server configuration was replaced or assumed. The actual nginx/Coolify configuration is required to implement a genuine 404, static route delivery, and a permanent path/query-preserving www redirect safely. The current live server identifies itself as nginx; its configuration and proxy settings were not accessible.
- Before pushing: independently verify the public application's automatic deployment is disabled in its actual Coolify settings. The existing local main also contains a separate dashboard migration not verified on production; the SEO-only branch is based on `origin/main` and excludes that commit. Do not merge the dashboard migration without its separate production review.
- Local follow-up checks: production build, TypeScript, translation tests and the SEO sitemap/browser suite pass. No standalone ESLint script is configured.

## Final QA follow-up — 17 November 2026

- LIVE VERIFIED: `/robots.txt` returned 200 text/plain and `/sitemap.xml` returned 200 text/xml; production still uses the old singular-domain sitemap. An unknown route returned HTTP 200 and HTTPS www returned 200 without a canonical-host redirect. Neither server fix is deployed.
- LOCAL: the management-service pricing UI now uses the approved published catalog with Quote required fallback; old hardcoded fee and package-inclusion claims were removed. See `tests/management-pricing.test.mjs`. The earlier pricing-copy risk remains for any other unreviewed service copy.
- BLOCKED: actual Coolify/nginx configuration, automatic deployment status and real production migration state remain unavailable. No exact server directives can be safely prescribed until those settings and the server block are inspected. See `dashboard/PRODUCTION_QA_CHECKLIST.md`.
