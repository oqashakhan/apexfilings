import { useEffect, useRef } from 'react';
import {
  ArrowRight, Building2, CalendarCheck, ClipboardCheck, FileText,
  Files, Globe2, Headphones, Mail, MapPin, Phone, ShieldCheck, Target,
} from 'lucide-react';
import './WhyApexPage.css';

const facts = [
  { value: '5 Years', label: 'In Business' },
  { value: 'USA & Pakistan', label: 'Business Registrations' },
  { value: 'Peshawar & Lahore', label: 'Office Locations, Pakistan' },
];

const benefits = [
  { title: 'Guided Process', description: 'Understand the steps, documents, and requirements involved.', icon: ClipboardCheck },
  { title: 'International Business Experience', description: 'Business registration experience in the United States and Pakistan.', icon: Globe2 },
  { title: 'Transparent Services', description: 'Clear service inclusions, pricing, and applicable additional fees.', icon: FileText },
  { title: 'Personalized Support', description: 'Get assistance based on your business needs and selected services.', icon: Headphones },
  { title: 'Beyond Formation', description: 'Access selected business documentation, amendment, and compliance support.', icon: Files },
];

const serviceGroups = [
  { title: 'US LLC Formation', description: 'Assistance with company formation and relevant documentation.', icon: Building2 },
  { title: 'EIN Assistance', description: 'Guidance with the Employer Identification Number application process.', icon: FileText },
  { title: 'Registered Agent & Business Address', description: 'Eligible registered agent and address solutions.', icon: ShieldCheck },
  { title: 'Business Documentation', description: 'Operating agreements, amendments, and selected company documents.', icon: Files },
  { title: 'Business Management & Compliance', description: 'Annual reports, good standing certificates, dissolution, and selected tax or compliance assistance.', icon: CalendarCheck },
];

const audiences = [
  'Freelancers', 'E-commerce Sellers', 'Consultants', 'Online Business Owners',
  'International Founders', 'Existing Business Owners',
];

export function WhyApexPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'About Apex Filings | Helping Entrepreneurs Build with Confidence';
    if (description) description.content = 'Learn about Apex Filings, our story since 2021, and the business formation services we offer entrepreneurs.';
    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let version = 0;
    let context: { add: (callback: () => void) => void; revert: () => void } | undefined;

    async function setup() {
      if (!page || reducedMotion.matches) return;
      const currentVersion = ++version;
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
        if (disposed || reducedMotion.matches || currentVersion !== version) return;

        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {}, page);
        context.add(() => {
          const reveal = (trigger: Element | null, elements: HTMLElement[], stagger = 0) => {
            if (!trigger || elements.length === 0) return;
            ScrollTrigger.create({
              trigger,
              start: 'top 86%',
              once: true,
              onEnter: () => context?.add(() => {
                gsap.fromTo(elements, { autoAlpha: 0, y: 20 }, {
                  autoAlpha: 1, y: 0, duration: 0.62, stagger, ease: 'power2.out', clearProps: 'all',
                });
              }),
            });
          };

          reveal(page.querySelector('.about-hero'), gsap.utils.toArray<HTMLElement>('.about-hero-copy > *, .about-hero-visual', page), 0.08);
          for (const selector of ['.about-story', '.about-mission', '.about-audiences', '.about-commitment', '.about-contact', '.about-cta']) {
            const section = page.querySelector(selector);
            reveal(section, gsap.utils.toArray<HTMLElement>(`${selector} [data-about-motion]`, page), 0.08);
          }
          reveal(page.querySelector('.about-benefits'), gsap.utils.toArray<HTMLElement>('.about-benefit', page), 0.09);
          reveal(page.querySelector('.about-services'), gsap.utils.toArray<HTMLElement>('.about-service', page), 0.1);
        });
      } catch {
        // The page remains readable if motion cannot initialize.
      }
    }

    const onMotionChange = () => {
      version += 1;
      context?.revert();
      context = undefined;
      if (!reducedMotion.matches) void setup();
    };

    reducedMotion.addEventListener('change', onMotionChange);
    void setup();
    return () => {
      disposed = true;
      version += 1;
      reducedMotion.removeEventListener('change', onMotionChange);
      context?.revert();
    };
  }, []);

  return (
    <div ref={pageRef} className="about-page" data-polish-reveal>
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-wrap about-hero-grid">
          <div className="about-hero-copy">
            <p className="about-eyebrow">About Apex Filings</p>
            <h1 id="about-title">Helping Entrepreneurs Build with Confidence</h1>
            <p className="about-hero-lead">Starting a business involves important decisions, paperwork, and legal requirements. Apex Filings simplifies the process with practical formation services, clear guidance, and ongoing business support.</p>
            <dl className="about-facts">
              {facts.map((fact) => (
                <div key={fact.label} className="about-fact">
                  <dt>{fact.value}</dt>
                  <dd>{fact.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="about-hero-visual">
            <div className="about-photo-frame">
              <img src="/images/why-apex-founder.png" alt="Entrepreneur working on a laptop" width="1536" height="1024" fetchPriority="high" decoding="async" />
            </div>
            <div className="about-photo-note">
              <img src="/images/apex-navbar-logo.png" alt="Apex Filings" width="128" height="40" />
              <span>Clear guidance for your next step</span>
            </div>
          </div>
        </div>
      </section>

      <section className="about-editorial about-story" aria-labelledby="about-story-title">
        <div className="about-wrap about-editorial-grid">
          <div className="about-story-heading" data-about-motion>
            <p className="about-eyebrow">Our Journey</p>
            <h2 id="about-story-title">Our Story</h2>
            <h3>Built to Make Business Formation Easier</h3>
          </div>
          <div className="about-editorial-copy">
            <p data-about-motion>Apex Filings was established in 2021 with a simple purpose: to help entrepreneurs navigate business registration and related requirements with greater clarity.</p>
            <p data-about-motion>We understand how confusing company formation, documentation, and ongoing obligations can be, especially when establishing a business in another country. That's why we focus on clear information, straightforward processes, and practical support.</p>
            <p data-about-motion>Today, we assist entrepreneurs with US LLC formation, EIN applications, registered agent services, business documentation, and selected ongoing compliance requirements.</p>
            <p className="about-story-focus" data-about-motion><strong>Our Focus:</strong> Making business formation clearer, more accessible, and easier to navigate.</p>
          </div>
        </div>
      </section>

      <section className="about-mission" aria-labelledby="about-mission-title">
        <div className="about-wrap">
          <div className="about-centered-heading" data-about-motion>
            <p className="about-eyebrow">What guides us</p>
            <h2 id="about-mission-title">What Drives Apex Filings</h2>
          </div>
          <div className="about-mission-grid">
            <div className="about-mission-panel" data-about-motion>
              <span className="about-icon" aria-hidden="true"><Target size={21} strokeWidth={1.8} /></span>
              <p className="about-panel-label">Our Mission</p>
              <h3>Making Business Formation Simpler</h3>
              <p>To help entrepreneurs understand the formation process through clear information, transparent services, guided steps, and responsive support.</p>
            </div>
            <div className="about-mission-panel about-mission-panel--warm" data-about-motion>
              <span className="about-icon" aria-hidden="true"><Globe2 size={21} strokeWidth={1.8} /></span>
              <p className="about-panel-label">Our Vision</p>
              <h3>Supporting Entrepreneurs Worldwide</h3>
              <p>To become a trusted resource for entrepreneurs seeking accessible business formation and management services across international markets.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-benefits" aria-labelledby="about-benefits-title">
        <div className="about-wrap">
          <div className="about-centered-heading">
            <p className="about-eyebrow">The Apex Filings advantage</p>
            <h2 id="about-benefits-title">Why Choose Apex Filings?</h2>
            <p>Practical support. Clear information. Straightforward service.</p>
          </div>
          <ul className="about-benefit-grid">
            {benefits.map(({ title, description, icon: Icon }) => (
              <li key={title} className="about-benefit">
                <span className="about-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.8} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="about-services" aria-labelledby="about-services-title">
        <div className="about-wrap about-services-grid">
          <div className="about-services-intro">
            <p className="about-eyebrow">How we help</p>
            <h2 id="about-services-title">Business Services for Every Stage</h2>
            <p>From starting your US company to managing essential business requirements, we provide practical services to support your journey.</p>
            <a className="about-text-link" href="/#services">Explore Our Services <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <ul className="about-service-list">
            {serviceGroups.map(({ title, description, icon: Icon }) => (
              <li key={title} className="about-service">
                <span className="about-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.8} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="about-audiences" aria-labelledby="about-audiences-title">
        <div className="about-wrap about-audiences-grid">
          <div data-about-motion>
            <p className="about-eyebrow">Who we help</p>
            <h2 id="about-audiences-title">Built for Entrepreneurs Like You</h2>
          </div>
          <ul className="about-audience-list" data-about-motion>
            {audiences.map((audience) => <li key={audience}>{audience}</li>)}
          </ul>
        </div>
      </section>

      <section className="about-commitment" aria-labelledby="about-commitment-title">
        <div className="about-wrap" data-about-motion>
          <p className="about-eyebrow">Our commitment</p>
          <h2 id="about-commitment-title">Clarity at Every Step</h2>
          <p>We believe customers should understand the services they choose, the documents they may need, the costs involved, and the next steps. Our goal is to provide practical guidance that helps entrepreneurs make informed business decisions.</p>
        </div>
      </section>

      <section className="about-contact" aria-labelledby="about-contact-title">
        <div className="about-wrap about-contact-grid">
          <div data-about-motion>
            <p className="about-eyebrow">Talk with us</p>
            <h2 id="about-contact-title">Have Questions?</h2>
            <p>Our team is here to help you understand your business formation options.</p>
          </div>
          <div className="about-contact-items" data-about-motion>
            <a href="mailto:info@apexfilings.com"><Mail size={18} aria-hidden="true" /><span><small>Email</small>info@apexfilings.com</span></a>
            <a href="tel:+16822864111"><Phone size={18} aria-hidden="true" /><span><small>US Phone</small>+1 (682) 286-4111</span></a>
            <div><MapPin size={18} aria-hidden="true" /><span><small>Office Locations</small>Peshawar and Lahore, Pakistan</span></div>
            <div><Globe2 size={18} aria-hidden="true" /><span><small>Business Registrations</small>United States and Pakistan</span></div>
            <a href="https://apexfilings.com"><Building2 size={18} aria-hidden="true" /><span><small>Website</small>https://apexfilings.com</span></a>
          </div>
        </div>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title">
        <div className="about-wrap">
          <div className="about-cta-panel">
            <div data-about-motion>
              <h2 id="about-cta-title">Ready to Start Your Business?</h2>
              <p>Explore your options and take the next step with Apex Filings.</p>
            </div>
            <div className="about-cta-actions" data-about-motion>
              <a className="about-primary-button" href="/start">Start My Business <ArrowRight size={18} aria-hidden="true" /></a>
              <a className="about-secondary-link" href="/contact">Contact Our Team <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
          </div>
          <p className="about-disclaimer">Business formation services do not guarantee approval for government applications, bank accounts, or payment processors. Eligibility and approval depend on the relevant authority or provider.</p>
        </div>
      </section>
    </div>
  );
}
