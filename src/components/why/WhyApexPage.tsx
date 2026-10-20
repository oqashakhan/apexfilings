import { useEffect, useRef } from 'react';
import {
  ArrowRight, Building2, CalendarCheck, ClipboardCheck, FileText,
  Files, Globe2, Headphones, Mail, MapPin, Phone,
} from 'lucide-react';
import './WhyApexPage.css';

const facts = [
  { value: '5 Years', label: 'In Business' },
  { value: 'USA & Pakistan', label: 'Business Registrations' },
  { value: 'Peshawar & Lahore', label: 'Office Locations' },
];

const benefits = [
  { title: 'Guided Process', description: 'Clear steps and helpful guidance throughout formation.', icon: ClipboardCheck },
  { title: 'International Presence', description: 'Business registrations in the USA and Pakistan.', icon: Globe2 },
  { title: 'Transparent Services', description: 'Straightforward packages and clearly explained inclusions.', icon: FileText },
  { title: 'Personalized Support', description: 'Assistance tailored to your business needs.', icon: Headphones },
];

const serviceGroups = [
  { title: 'Business Formation', description: 'US LLC formation, EIN assistance, and registered agent services.', icon: Building2 },
  { title: 'Business Documentation', description: 'Business address solutions, company documents, and amendments.', icon: Files },
  { title: 'Business Management', description: 'Annual reports, registered agent changes, and selected compliance support.', icon: CalendarCheck },
];

export function WhyApexPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'About Apex Filings | Business Formation Made Simpler';
    if (description) description.content = 'Learn about Apex Filings, our mission, and how we support entrepreneurs with business formation and essential services.';
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
          for (const selector of ['.about-story', '.about-mission', '.about-contact', '.about-cta']) {
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
            <h1 id="about-title">Making Business Formation Simpler</h1>
            <p className="about-hero-lead">Helping entrepreneurs start and manage their businesses with clear guidance and dependable support.</p>
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
          <div data-about-motion><p className="about-eyebrow">Who we are</p><h2 id="about-story-title">Our Story</h2></div>
          <div className="about-editorial-copy" data-about-motion>
            <h3>Built to Simplify Business Formation</h3>
            <p>Starting a business should be an exciting step, not a complicated process.</p>
            <p>Apex Filings was created to help entrepreneurs navigate company registration, documentation, and essential business requirements with greater clarity.</p>
            <p>With business registrations in the United States and Pakistan, we support freelancers, online sellers, consultants, and entrepreneurs looking to establish and manage their businesses.</p>
          </div>
        </div>
      </section>

      <section className="about-editorial about-mission" aria-labelledby="about-mission-title">
        <div className="about-wrap about-editorial-grid">
          <div data-about-motion><p className="about-eyebrow">What guides us</p><h2 id="about-mission-title">Our Mission</h2></div>
          <div className="about-editorial-copy" data-about-motion>
            <h3>Clear Guidance. Simpler Business Setup.</h3>
            <p>Our mission is to make business formation and management easier to understand and access.</p>
            <p>From US LLC formation and EIN assistance to registered agent and selected compliance services, we help entrepreneurs understand requirements and move forward with confidence.</p>
          </div>
        </div>
      </section>

      <section className="about-benefits" aria-labelledby="about-benefits-title">
        <div className="about-wrap">
          <div className="about-centered-heading">
            <p className="about-eyebrow">The Apex Filings advantage</p>
            <h2 id="about-benefits-title">Why Choose Apex Filings?</h2>
            <p>Practical support for entrepreneurs at every stage.</p>
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
            <h2 id="about-services-title">Support Beyond Company Formation</h2>
            <p>From setting up your company to handling important business requirements, Apex Filings offers services to support your next steps.</p>
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
            <div><MapPin size={18} aria-hidden="true" /><span><small>Offices</small>Peshawar and Lahore, Pakistan</span></div>
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
