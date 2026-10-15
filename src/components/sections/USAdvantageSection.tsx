import { useState } from 'react';
import { ArrowUpRight, Building2, Globe2, ShieldCheck } from 'lucide-react';
import './USAdvantageSection.css';

const advantages = [
  {
    number: '01',
    title: 'A Recognized Foundation',
    summary: 'Give your business a clear identity for partners and customers.',
    detail: 'A registered US company gives your business a defined name and structure to present when you work with customers, vendors and service providers.',
    points: ['A registered business identity', 'A clearer starting point for contracts', 'A structure partners can review'],
    icon: Globe2,
  },
  {
    number: '02',
    title: 'A Layer of Protection',
    summary: 'A US LLC can help separate your business obligations from your personal affairs.',
    detail: '',
    points: [],
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Space to Grow',
    summary: 'Build on a structure designed for your next stage of business.',
    detail: '',
    points: [],
    icon: Building2,
  },
];

export function USAdvantageSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = advantages[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <section id="us-advantage" className="us-advantage-section relative overflow-hidden py-20 lg:py-28" aria-labelledby="us-advantage-title">
      <div className="us-advantage-decor" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="us-advantage-intro mb-11 max-w-2xl lg:mb-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#F04623]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#D63E1D]">The US advantage</span>
          </div>
          <h2 id="us-advantage-title" className="text-3xl font-extrabold tracking-tight text-[#191F29] sm:text-4xl lg:text-[2.8rem]">
            Why Incorporate <span className="text-[#F04623]">in the US?</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            A US company can give your plans a clear foundation. Explore the main reasons founders choose the US, and what each one could mean for you.
          </p>
        </div>

        <div className="us-advantage-grid grid gap-4 md:grid-cols-3 lg:gap-5" aria-label="Reasons to form a US business">
          {advantages.map((advantage, index) => {
            const Icon = advantage.icon;
            const isActive = activeIndex === index;

            return (
              <button
                key={advantage.number}
                data-scroll-reveal
                type="button"
                aria-pressed={isActive}
                aria-controls="us-advantage-detail"
                onClick={() => setActiveIndex(index)}
                className={`us-advantage-card group relative flex min-h-[250px] w-full flex-col overflow-hidden border p-6 text-left transition-[transform,background-color,border-color,box-shadow,color] duration-300 motion-reduce:transition-none sm:p-7 lg:min-h-[270px] lg:p-8 ${
                  isActive
                    ? 'us-advantage-card--active text-white'
                    : 'us-advantage-card--inactive text-[#17202E]'
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]`}
              >
                <span className="us-advantage-card__halo" aria-hidden="true" />
                <span className="flex w-full items-start justify-between">
                  <span className="us-advantage-card__icon flex h-12 w-12 items-center justify-center rounded-2xl">
                    <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="us-advantage-card__number text-sm font-bold tracking-widest" aria-hidden="true">{advantage.number}</span>
                </span>
                <span className="mt-8 block text-xl font-bold tracking-tight sm:text-[1.35rem]">{advantage.title}</span>
                <span className={`mt-2 block max-w-[27ch] text-sm leading-relaxed ${isActive ? 'text-white/70' : 'text-slate-600'}`}>
                  {advantage.summary}
                </span>
                <span className={`mt-auto flex items-center gap-2 pt-6 text-xs font-bold uppercase tracking-[0.12em] ${isActive ? 'text-[#FFAA8F]' : 'text-[#D94320]'}`}>
                  {isActive ? 'Currently exploring' : 'Explore this benefit'}
                  <ArrowUpRight className={`h-4 w-4 transition-transform duration-300 motion-reduce:transition-none ${isActive ? 'rotate-45' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        <div
          key={active.number}
          id="us-advantage-detail"
          role="region"
          aria-label={`${active.title} details`}
          aria-live="polite"
          className={`us-advantage-detail mt-5 grid gap-8 p-6 sm:p-8 lg:items-center lg:gap-12 lg:p-10 ${active.points.length ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}
        >
          <div>
            <div className="mb-5 flex items-center gap-3 text-[#D94320]">
              <span className="us-advantage-detail__icon flex h-10 w-10 items-center justify-center rounded-xl">
                <ActiveIcon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.15em]">Benefit {active.number} / 03</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-[#17202E] sm:text-[1.75rem]">{active.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{active.detail || active.summary}</p>
          </div>
          {active.points.length > 0 && <div className="us-advantage-detail__offer rounded-2xl p-5 sm:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">What this can offer</p>
            <ul className="space-y-4">
              {active.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm font-medium leading-6 text-[#253044]">
                  <span className="us-advantage-detail__check" aria-hidden="true">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>}
        </div>
        <p className="us-advantage-disclaimer mt-5 text-xs text-slate-500">This is general information, not legal advice.</p>
      </div>
    </section>
  );
}
