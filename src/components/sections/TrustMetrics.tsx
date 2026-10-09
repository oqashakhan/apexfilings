import { useEffect, useRef, useState } from 'react';
import { Award, Building2, Globe2, UsersRound } from 'lucide-react';
import { TRUST_STATS } from '../../data/testimonials';
import type { TrustStat } from '../../types';

const icons = {
  building: Building2,
  users: UsersRound,
  globe: Globe2,
  award: Award,
};

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function AnimatedCounter({ value, suffix, play }: Pick<TrustStat, 'value' | 'suffix'> & { play: boolean }) {
  const [current, setCurrent] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  );

  useEffect(() => {
    if (!play) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) {
      setCurrent(value);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const duration = 1700;

    const tick = (time: number) => {
      if (startTime === null) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setCurrent(Math.min(value, Math.round(value * easedProgress)));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    const finishIfReduced = (event: MediaQueryListEvent) => {
      if (event.matches) {
        window.cancelAnimationFrame(frame);
        setCurrent(value);
      }
    };

    motionPreference.addEventListener('change', finishIfReduced);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      motionPreference.removeEventListener('change', finishIfReduced);
    };
  }, [play, value]);

  return (
    <span className="inline-flex items-baseline whitespace-nowrap text-[2.15rem] font-extrabold leading-none tracking-[-0.055em] text-[#171717] tabular-nums sm:text-[2.65rem] lg:text-[3rem]">
      <span aria-hidden="true">{numberFormatter.format(current)}</span>
      {current === value && <span aria-hidden="true" className="ml-0.5 text-[#F04623]">{suffix}</span>}
      <span className="sr-only">{numberFormatter.format(value)}{suffix}</span>
    </span>
  );
}

export function TrustMetrics() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-label="Apex Filings at a glance" className="relative bg-[#fcf9f8] py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#F04623]" aria-hidden="true" />
          <h2 className="text-2xl font-bold tracking-tight text-[#171717] sm:text-3xl">Apex Filings at a Glance</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">Helping founders start and manage their US businesses from anywhere.</p>
        </div>

        <dl className="mx-auto grid max-w-3xl grid-cols-2 overflow-hidden rounded-[1.75rem] border border-[#eae4e1] bg-white px-3 py-6 shadow-[0_16px_45px_-30px_rgba(23,23,23,0.28)] sm:px-6 sm:py-8 lg:px-4 lg:py-9">
          {TRUST_STATS.map((stat, index) => {
            const Icon = icons[stat.icon];
            return (
              <div
                key={stat.label}
                className={`flex min-w-0 flex-col items-center px-2 py-5 text-center motion-safe:transition-colors motion-safe:duration-300 hover:bg-[#fff9f7] sm:px-4 lg:px-6 lg:py-3 ${index > 0 ? 'border-l border-[#eee8e5]' : ''}`}
              >
                <dt className="order-3 mt-3 max-w-36 text-xs font-semibold leading-snug text-slate-600 sm:text-sm">{stat.label}</dt>
                <Icon className="order-1 mb-4 h-5 w-5 text-[#F04623]" strokeWidth={1.8} aria-hidden="true" />
                <dd className="order-2"><AnimatedCounter value={stat.value} suffix={stat.suffix} play={hasEntered} /></dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
