import { useEffect, useRef } from 'react';
import { Globe2, ShieldCheck, TrendingUp } from 'lucide-react';
import './USAdvantageSection.css';

const advantages = [
  {
    title: 'A Recognized Foundation',
    description: 'Give your business a clear identity for customers and partners.',
    icon: Globe2,
  },
  {
    title: 'A Layer of Protection',
    description: 'An LLC can help separate business obligations from personal affairs.',
    icon: ShieldCheck,
  },
  {
    title: 'Space to Grow',
    description: 'Build a business structure designed for future growth.',
    icon: TrendingUp,
  },
];

export function USAdvantageSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let version = 0;
    let context: { add: (callback: () => void) => void; revert: () => void } | undefined;

    async function setup() {
      if (!section || reducedMotion.matches) return;
      const currentVersion = ++version;

      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
        if (disposed || reducedMotion.matches || currentVersion !== version) return;

        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {}, section);
        context.add(() => {
          const heading = section.querySelector<HTMLElement>('.us-advantage-heading');
          const description = section.querySelector<HTMLElement>('.us-advantage-description');
          const cards = gsap.utils.toArray<HTMLElement>('.us-advantage-card', section);
          if (!heading || !description || cards.length === 0) return;

          ScrollTrigger.create({
            trigger: section,
            start: 'top 82%',
            once: true,
            onEnter: () => context?.add(() => {
              gsap.timeline()
                .fromTo(heading, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'all' })
                .fromTo(description, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.48, ease: 'power2.out', clearProps: 'all' }, '-=0.28')
                .fromTo(cards, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out', clearProps: 'all' }, '-=0.2');
            }),
          });
        });
      } catch {
        // Content stays visible if the optional animation cannot load.
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
    <section ref={sectionRef} id="us-advantage" className="us-advantage-section" aria-labelledby="us-advantage-title">
      <div className="us-advantage-container" data-polish-reveal>
        <div className="us-advantage-intro">
          <span className="us-advantage-label">The US Advantage</span>
          <h2 id="us-advantage-title" className="us-advantage-heading">Why Incorporate in the US?</h2>
          <p className="us-advantage-description">Build a strong foundation for your business with the advantages of a US company.</p>
        </div>

        <ul className="us-advantage-grid" aria-label="Advantages of forming a US business">
          {advantages.map((advantage) => {
            const Icon = advantage.icon;
            return (
              <li key={advantage.title} className="us-advantage-card">
                <span className="us-advantage-card__icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
                <h3>{advantage.title}</h3>
                <p>{advantage.description}</p>
              </li>
            );
          })}
        </ul>
        <p className="us-advantage-disclaimer">This is general information, not legal advice.</p>
      </div>
    </section>
  );
}
