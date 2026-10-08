# Apex Filings - US LLC Formation Platform

Official public website and frontend architecture for **Apex Filings** (apexfiling.com), accurately converted from the approved Google Stitch design into a clean, responsive, and maintainable TypeScript + Tailwind CSS codebase.

---

## 1. Project Overview

Apex Filings empowers international and domestic founders to form and maintain US LLCs, acquire IRS Employer Identification Numbers (EIN), secure 1-year registered agent services, open US business bank accounts (Mercury, Relay, Wise), and accept payments through Stripe and PayPal.

- **Brand:** Apex Filings
- **Domain:** [apexfiling.com](https://apexfiling.com)
- **Primary Color:** `#F04623` (Vermilion)
- **Dark Surface:** `#171717` / `#0F172A`
- **Background Canvas:** `#fcf9f8` / `#FFFFFF`

---

## 2. Technology Stack

- **Framework:** React 19 with Vite; client-side routes are handled in `src/App.tsx` (no Next.js or React Router).
- **Language:** TypeScript (Strict typing)
- **Styling:** Tailwind CSS with Plus Jakarta Sans typography
- **Icons:** Lucide React
- **Animations:** Hardware-accelerated CSS keyframes & Framer Motion
- **Future Integration:** Prepared for PostgreSQL + Prisma ORM + Auth.js + Stripe

---

## 3. Project Architecture & Folder Structure

### Netlify deployment

`netlify.toml` sets the build command to `npm run build` and the publish directory to `dist`.
Vite copies `public/_redirects` into `dist/_redirects`. Its `/* /index.html 200` rule lets Netlify serve the React entry point for direct route requests and refreshes.

Supported page routes include `/pricing`, `/contact`, `/why-us` (also available as `/about`), `/start`, and `/services/:serviceId`. Trailing slashes are accepted.

After changing deployment configuration, redeploy the site. For a manual Netlify upload, upload the entire freshly built `dist` folder, including `_redirects`, rather than the source folder.

```
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             # Responsive header with mobile drawer
│   │   │   └── Footer.tsx             # Official mega-footer with disclaimers
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx        # 3D glass dashboard mockup & deliverables
│   │   │   ├── TrustMetrics.tsx       # 4-column proof statistics
│   │   │   ├── WhyApexSection.tsx     # Value story & digital company hub
│   │   │   ├── ServicesSection.tsx    # 6 comprehensive service cards with modals
│   │   │   ├── USAdvantageSection.tsx # Global trust & asset protection
│   │   │   ├── PricingSection.tsx     # Residency toggle & transparent plans
│   │   │   ├── GlobalHubsSection.tsx  # Dubai & Hong Kong waitlist triggers
│   │   │   ├── ExclusiveBonusesSection.tsx # Orbital ecosystem illustration
│   │   │   ├── TestimonialsSection.tsx# Verified founder testimonials
│   │   │   ├── TopStatesSection.tsx   # Wyoming, Delaware, Florida, New Mexico
│   │   │   ├── FAQSection.tsx         # Accessible accordion
│   │   │   └── ContactSection.tsx     # Validated lead capture & support desk
│   │   ├── modals/
│   │   │   ├── StartBusinessModal.tsx # Multi-step LLC formation flow
│   │   │   ├── AccountManagerModal.tsx# Live concierge chat simulator
│   │   │   ├── WaitlistModal.tsx      # Global hubs priority waitlist
│   │   │   └── LoginPortalModal.tsx   # Client/B2B/Admin portal selector
│   │   └── ui/
│   │       └── BrandLogo.tsx          # Official verified vector/image logo
│   ├── data/
│   │   ├── assets.ts                  # Official Stitch image assets
│   │   ├── navigation.ts              # Header and footer link sets
│   │   ├── services.ts                # Services content & deliverables
│   │   ├── pricing.ts                 # Basic & Premium plan definitions
│   │   ├── states.ts                  # Top 4 US formation jurisdictions
│   │   ├── faqs.ts                    # Formation questions & answers
│   │   └── testimonials.ts            # Client reviews & proof metrics
│   ├── lib/
│   │   └── utils.ts                   # Utility functions
│   ├── types/
│   │   └── index.ts                   # Strong TypeScript definitions
│   ├── App.tsx                        # Master layout assembler
│   ├── index.css                      # Tailwind theme tokens & glass styles
│   └── main.tsx                       # React application mount
├── .env.example                       # Environment configuration template
├── metadata.json                      # AI Studio applet metadata
└── package.json
```

---

## 4. Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Starts the local dev server at `http://localhost:3000`.

### Production Build
```bash
npm run build
```

### Linting & Type Checking
```bash
npm run lint
```

---

## 5. Next Steps for Codex Backend Migration

When imported into Codex for full-stack platform development:
1. **Database:** Initialize Prisma schema with models: `User`, `CompanyApplication`, `Document`, `Payment`, `AuditLog`.
2. **Authentication:** Configure Auth.js session handling with roles (`CLIENT`, `B2B_CLIENT`, `ADMIN`, `SUPER_ADMIN`).
3. **Payments:** Hook Stripe Checkout and webhook events to `src/components/modals/StartBusinessModal.tsx`.
4. **Private Documents:** Hostinger VPS private storage mounting via authenticated streaming routes (`/api/documents/[id]`).
5. **Nginx & Cloudflare:** Self-hosted production deployment behind Cloudflare CDN with SSL and rate limiting.
