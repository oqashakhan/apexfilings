import { useEffect, useRef } from 'react';
import { ArrowRight, ClipboardCheck, FileCheck2, Globe2, Layers3 } from 'lucide-react';
import './WhyApexSection.css';

const benefits = [
  { title: 'Guided Formation', description: 'Clear steps from start to finish.', icon: ClipboardCheck },
  { title: 'Essential Services', description: 'Formation, EIN, and compliance support.', icon: Layers3 },
  { title: 'Built for Global Founders', description: 'Start from wherever you are.', icon: Globe2 },
];

export function WhyApexSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let version = 0;
    let context: { add: (callback: () => void) => void; revert: () => void } | undefined;

    async function setup() {
      if (preference.matches || !section) return;
      const currentVersion = ++version;
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
        if (disposed || preference.matches || currentVersion !== version) return;
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {}, section);
        context.add(() => {
          const left = section.querySelector<HTMLElement>('.why-apex-copy');
          const eyebrow = section.querySelector<HTMLElement>('.why-apex-eyebrow');
          const title = section.querySelector<HTMLElement>('.why-apex-title');
          const summary = section.querySelector<HTMLElement>('.why-apex-summary');
          const cta = section.querySelector<HTMLElement>('.why-apex-cta');
          const rows = gsap.utils.toArray<HTMLElement>('.why-apex-benefit', section);
          const visual = section.querySelector<HTMLElement>('.why-apex-visual');
          const statuses = gsap.utils.toArray<HTMLElement>('.why-apex-status', section);
          if (!left || !eyebrow || !title || !summary || !cta || !visual) return;

          ScrollTrigger.create({
            trigger: left, start: 'top 84%', once: true,
            onEnter: () => context?.add(() => {
              gsap.timeline()
                .fromTo(eyebrow, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power2.out', clearProps: 'all' })
                .fromTo(title, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, '-=0.16')
                .fromTo(summary, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.48, ease: 'power2.out', clearProps: 'all' }, '-=0.3')
                .fromTo(rows, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }, '-=0.18')
                .fromTo(cta, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out', clearProps: 'all' }, '-=0.18');
            }),
          });

          ScrollTrigger.create({
            trigger: visual, start: 'top 87%', once: true,
            onEnter: () => context?.add(() => {
              gsap.timeline()
                .fromTo(visual, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', clearProps: 'all' })
                .fromTo(statuses, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.1, ease: 'power2.out', clearProps: 'all' }, '-=0.32');
            }),
          });
        });
      } catch {
        // The unanimated section remains fully visible if GSAP cannot load.
      }
    }

    const onPreferenceChange = () => {
      version += 1;
      context?.revert();
      context = undefined;
      if (!preference.matches) void setup();
    };
    preference.addEventListener('change', onPreferenceChange);
    void setup();
    return () => {
      disposed = true;
      version += 1;
      preference.removeEventListener('change', onPreferenceChange);
      context?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="why-apex-section scroll-mt-20" id="why-us" aria-labelledby="home-why-title">
      <div className="why-apex-inner">
        <div data-polish-reveal="0" className="why-apex-copy">
          <p className="why-apex-eyebrow">Why Apex Filings</p>
          <h2 id="home-why-title" className="why-apex-title">A Simpler Way to Start Your US Business</h2>
          <p className="why-apex-summary">Start and manage your US business with clear guidance and essential services in one place.</p>
          <ul className="why-apex-benefits">
            {benefits.map(({ title, description, icon: Icon }) => (
              <li key={title} className="why-apex-benefit">
                <span className="why-apex-benefit-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                <span><strong>{title}</strong><small>{description}</small></span>
              </li>
            ))}
          </ul>
          <a href="/start" className="why-apex-cta">Start My Business <ArrowRight size={17} aria-hidden="true" /></a>
        </div>

        <div className="why-apex-visual">
          <img
            src="/images/why-apex-founder.png"
            alt="Smiling entrepreneur working on a laptop in a bright workspace"
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
            className="why-apex-photo"
          />
          <div className="why-apex-status why-apex-status--top" aria-hidden="true">
            <FileCheck2 size={17} strokeWidth={1.9} />
            <span>Documents Ready</span>
          </div>
          <div className="why-apex-status why-apex-status--bottom" aria-hidden="true">
            <ClipboardCheck size={17} strokeWidth={1.9} />
            <span>Application Submitted</span>
          </div>
        </div>
      </div>
    </section>
  );
}
