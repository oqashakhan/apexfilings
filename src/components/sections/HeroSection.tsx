import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { AntigravityBackground } from '../hero/AntigravityBackground';
import { EarthHorizon } from '../hero/EarthHorizon';
import '../hero/HeroEffects.css';
import { FormationJourney } from '../hero/FormationJourney';

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  useScrollReveal(heroRef);
  return (
    <section ref={heroRef} id="home" className="apex-hero-effects relative isolate scroll-mt-20 overflow-hidden bg-white px-4 pb-16 pt-14 sm:px-6 sm:pb-20 md:pt-20 lg:px-8 lg:pb-28">
      <EarthHorizon containerRef={heroRef} />
      <AntigravityBackground containerRef={heroRef} desktopCount={20} maxDisplacement={12} />

      <div className="hero-content mx-auto max-w-7xl text-center">
        <p data-polish-reveal="0" className="mx-auto inline-flex max-w-full items-center rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c52e0f] sm:text-xs">
          US LLC Formation <span className="mx-2 text-orange-300">•</span> Simple <span className="mx-2 text-orange-300">•</span> Secure <span className="mx-2 text-orange-300">•</span> Online
        </p>

        <h1 data-polish-reveal="1" className="mx-auto mt-6 max-w-5xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#171717] sm:text-5xl lg:text-6xl">
          Start Your US LLC<br className="hidden sm:block" />{' '}
          <span className="text-[#F04623]">From Anywhere in the World</span>
        </h1>

        <p data-polish-reveal="2" className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Apex Filings helps founders outside the US form a US LLC, get an EIN, and stay compliant. Simple, transparent and 100% online.
        </p>

        <div data-polish-reveal="3" className="mx-auto mt-8 flex max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="polish-button polish-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 sm:text-base"
          >
            Start My Business <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            href="/consultation"
            className="polish-button inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 sm:text-base"
          >
            Book Free Consultation
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-500">A short first step. You can finish your business details later.</p>

        <FormationJourney />
      </div>
    </section>
  );
}
