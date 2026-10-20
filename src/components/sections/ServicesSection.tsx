import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { SERVICES } from '../../data/services';
import { serviceIcons } from '../services/serviceIcons';
import './ServicesSection.css';

const summaries: Record<string, string> = {
  'llc-formation': 'Start your US company with a simple formation process.',
  'registered-agent': 'Get help meeting registered agent requirements.',
  ein: 'Get guidance through your federal tax ID application.',
  'business-licenses': 'Understand the licenses your business may need.',
  'annual-report': 'Keep up with important state filing requirements.',
  'business-documents': 'Organize essential company records and agreements.',
};

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    const cards = cardRefs.current.filter((card): card is HTMLLIElement => card !== null);
    if (!section || !grid || cards.length !== SERVICES.length) return;

    let disposed = false;
    let gsapContext: { revert: () => void } | undefined;
    let media: ReturnType<typeof import('gsap').gsap.matchMedia> | undefined;
    let sizeObserver: ResizeObserver | undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      gsapContext = gsap.context(() => {
        media = gsap.matchMedia();

        media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
          section.classList.add('is-storytelling');
          grid.inert = true;
          const rotations = [-3, 2, -2, 3, -1.5, 1.5];
          const driftX = [-26, -9, 20, -19, 7, 26];
          const driftY = [-15, -8, -3, 8, 15, 21];

          // Grid layout determines the destination; offsets only define the layered starting scene.
          const layer = (index: number, card: Element) => {
            const item = card as HTMLElement;
            return {
              x: grid.clientWidth / 2 - (item.offsetLeft + item.offsetWidth / 2) + driftX[index],
              y: grid.clientHeight / 2 - (item.offsetTop + item.offsetHeight / 2) + driftY[index],
            };
          };

          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              // The complete grid is reached before the following section enters.
              // No pin spacer or delayed scrub can leave cards mid-transition at the boundary.
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: (trigger) => {
                // Stacked links are temporarily inactive until each card is readable in the grid.
                grid.inert = trigger.progress < 0.97;
              },
              onRefresh: (trigger) => {
                grid.inert = trigger.progress < 0.97;
              },
            },
          });

          timeline.fromTo(cards, {
            x: (index, card) => layer(index, card).x,
            y: (index, card) => layer(index, card).y + 72,
            scale: 0.87,
            rotation: (index) => rotations[index],
            autoAlpha: 0,
          }, {
            x: (index, card) => layer(index, card).x,
            y: (index, card) => layer(index, card).y,
            scale: 0.94,
            rotation: (index) => rotations[index],
            autoAlpha: 1,
            duration: 0.35,
            stagger: 0.025,
            ease: 'power2.out',
          }, 0);

          timeline.to(cards, {
            x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1,
            duration: 0.7, stagger: 0.035, ease: 'power2.inOut',
          }, 0.5);

          return () => {
            grid.inert = false;
            section.classList.remove('is-storytelling');
          };
        });

        media.add('(min-width: 768px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
          const tweens = cards.map((card) => gsap.fromTo(card, { autoAlpha: 0, y: 24 }, {
            autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 88%', once: true },
            clearProps: 'all',
          }));
          return () => tweens.forEach((tween) => tween.kill());
        });

        media.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
          const tweens = cards.map((card) => gsap.fromTo(card, { autoAlpha: 0, y: 20 }, {
            autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 90%', once: true },
            clearProps: 'all',
          }));
          return () => tweens.forEach((tween) => tween.kill());
        });
      }, section);
      ScrollTrigger.refresh();
      if ('ResizeObserver' in window) {
        sizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
        sizeObserver.observe(grid);
      }
      void document.fonts?.ready.then(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
    }).catch(() => {
      media?.revert();
      gsapContext?.revert();
      grid.inert = false;
      section.classList.remove('is-storytelling');
    });

    return () => {
      disposed = true;
      sizeObserver?.disconnect();
      media?.revert();
      gsapContext?.revert();
      grid.inert = false;
    };
  }, []);

  return (
    <section ref={sectionRef} className="home-services-section scroll-mt-20" id="services" aria-labelledby="services-title">
      <div className="home-services-inner">
        <div data-polish-reveal="0" className="home-services-heading">
          <p className="home-services-eyebrow">Our Services</p>
          <h2 id="services-title">Everything You Need to Start and Manage Your US Business</h2>
          <p className="home-services-subtitle">Essential services to launch, grow, and manage your US business.</p>
        </div>
        <ul ref={gridRef} data-service-grid className="home-services-grid">
          {SERVICES.map((service, index) => {
            const Icon = serviceIcons[service.iconName];
            return (
              <li
                key={service.id}
                ref={(element) => { cardRefs.current[index] = element; }}
                className={`home-service-card${service.id === 'llc-formation' ? ' home-service-card--featured' : ''}`}
              >
                <a href={`/services/${service.id}`} aria-label={`Learn more about ${service.title}`}>
                  <span className="home-service-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                  <h3>{service.title}</h3>
                  <p>{summaries[service.id] ?? service.description}</p>
                  <span className="home-service-link">Learn More <ArrowRight size={16} strokeWidth={2} aria-hidden="true" /></span>
                </a>
              </li>
            );
          })}
        </ul>
        <a className="home-services-more" href="/#services">Explore All Services <ArrowRight size={17} strokeWidth={2} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
