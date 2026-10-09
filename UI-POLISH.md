# Public website polish — October 8, 2026

## Scope and audit

Kept the existing layouts, section order, copy, images, branding, navigation destinations and business behavior. Reviewed the supplied Bizee, Micahguru and Doola websites for reference. The attachment contained the written brief only; no recording was available.

The highest-impact issues were the homepage illustration's long stagger, repeated formation-page entrances on reverse scrolling, broad `transition-all` declarations, and hover elevation on static testimonials.

## Files changed

- `src/marketing-polish.css` (new): scoped timing, CTA/card feedback, subtle header/active-link treatment, translucent existing trust badges, desktop-only native map drift, reduced-motion rules.
- `src/hooks/useScrollReveal.ts` (new): one-time IntersectionObserver enhancement, default-visible content, media-query handling and cleanup.
- `src/App.tsx`: imports the stylesheet and adds a marketing scope class; routing is unchanged.
- `src/components/pages/FormationProcessPage.tsx`: one-time CSS reveals; scroll-linked progress and nodes retained. React state updates occur only when a node crosses its active threshold.
- `src/components/hero/FormationJourney.css`: shorter stagger and visible-by-default cards; reduced-motion fallback.
- `src/components/layout/Navbar.tsx`: adds the header styling class only.
- `src/components/layout/ServicesMegaMenu.tsx`: adds CTA interaction classes only.
- `src/components/sections/HeroSection.tsx`: CTA classes and gradient-only existing decorative layer.
- `src/components/sections/WhyApexSection.tsx`: one-time copy/image reveals and CTA classes.
- `src/components/sections/ServicesSection.tsx`: one-time heading reveal.
- `src/components/services/ServiceCard.tsx`: shared interactive-card class.
- `src/components/services/ServiceDetailPage.tsx`, `src/components/why/WhyApexPage.tsx`, `src/components/sections/ExclusiveBonusesSection.tsx`: CTA interaction classes only.
- `src/components/sections/TestimonialsSection.tsx`: removes static-card hover lift.
- `src/components/sections/FAQSection.tsx`, `ContactSection.tsx`, `TopStatesSection.tsx`, `USAdvantageSection.tsx`: replace broad transition-all with explicit visual properties.

## Animation and visual refinements

- Selected reveals: 18px on desktop / 12px on mobile, 560ms / 460ms, 65ms stagger. Each target is unobserved once reached. Finished animation classes are removed.
- Timeline content remains visible after its first reveal. Its line and nodes still reverse with actual scrolling.
- Homepage illustration cards finish entering in about 695ms instead of the former multi-second sequence.
- Fine-pointer CTA lift is 2px, existing arrows move 3px, and interactive service cards lift 3px. Touch does not receive the new hover motion.
- Existing dotted world map drifts only 16px total, using a native CSS scroll timeline on supported desktop browsers. It is static on mobile, with reduced motion, and in unsupported browsers.
- Mega-menu entrance uses a controlled 220ms curve. Existing hover bridge, Escape, keyboard navigation, categories and links are unchanged.
- Existing trust badges receive a very light translucent surface and 4px blur; main cards remain white.

## Performance and verification

- No dependencies added. No perpetual JS animation loop, mouse tracking or new scroll listener.
- Replaced the large hero filter blur with a static radial gradient. No added will-change layers. Reveals affect opacity/transform, never document layout.
- Main production JS gzip changed from 96.80kB to 97.13kB; main CSS gzip from 14.05kB to 14.78kB. These are build sizes, not runtime benchmark scores.
- `npm run lint` and `npm run build` pass. The existing Vite warning about future native config-loader support for `__dirname` remains outside this scope.
- Homepage and journey checked at 375, 390, 430, 768, 1024, 1440 and 1920px; no horizontal overflow or clipped timeline cards observed.
- Checked desktop hover path, keyboard Arrow Down/Escape, mobile Services accordion, pricing comparison, benefits expansion and FAQ toggles.
- Production direct navigation and refresh checked on home, journey, pricing, about, contact, LLC service and registration.
- Reduced-motion disables new reveals, decorative drift, button motion and smooth marketing anchors. Offscreen reveal targets remain visible before observation, and finished targets return to animation:none.
- No formal Lighthouse/Core Web Vitals score is claimed; final hardware-dependent performance should be monitored after deployment.

## Deliberately unchanged

The registration wizard files, authentication adapter and all data files were hash-checked against the pre-edit versions and remain identical. No backend, payment, dashboard, database, route, content, image, logo or section-layout changes were made. Existing image loading/dimensions and code splitting were retained. The pre-existing global smooth-scroll setting is unchanged outside the marketing scope.
