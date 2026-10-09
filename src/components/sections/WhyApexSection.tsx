import { ArrowRight, Building2, ClipboardList, Globe2 } from 'lucide-react';
import { useRef } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const reasons = [
  {
    title: 'A guided start',
    description: 'Understand each step as you begin forming your US business.',
    icon: ClipboardList,
  },
  {
    title: 'Services in one place',
    description: 'Explore formation and the supporting services your business may need.',
    icon: Building2,
  },
  {
    title: 'Built for global founders',
    description: 'Start online and find a clearer path forward, wherever you are.',
    icon: Globe2,
  },
];

export function WhyApexSection() {
  const revealRef = useRef<HTMLElement>(null);
  useScrollReveal(revealRef);
  return (
    <section ref={revealRef} className="scroll-mt-20 bg-[#fcf9f8] py-20 sm:py-24 lg:py-28" id="why-us" aria-labelledby="home-why-title">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8">
        <div data-polish-reveal="0">
          <p className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c52e0f]">
            Why Apex Filings
          </p>
          <h2 id="home-why-title" className="mt-6 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl lg:text-[2.75rem]">
            A clearer way to <span className="text-[#F04623]">start your US business.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
            Starting a business can feel complicated. Apex Filings brings guidance, formation services, and your next steps into one simpler experience.
          </p>

          <div className="mt-8 space-y-5">
            {reasons.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-white text-[#F04623] shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/why-us" className="polish-button polish-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">
              Discover Why Apex Filings <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="/start" className="polish-button inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">
              Start My Business
            </a>
          </div>
        </div>

        <div data-polish-reveal="1" className="relative mx-auto w-full max-w-2xl">
          <div className="pointer-events-none absolute inset-[18%] rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
          <img
            src="/images/why-apex-filings.webp"
            alt="Illustration of a founder using Apex Filings, with business-service and global-access visuals"
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
            className="relative block h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
