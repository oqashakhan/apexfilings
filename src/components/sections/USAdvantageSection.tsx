import { useState } from 'react';
import { ArrowUpRight, Building2, Globe2, ShieldCheck } from 'lucide-react';

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
    <section className="relative overflow-hidden bg-[#FAF9F7] py-20 lg:py-28" aria-labelledby="us-advantage-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-0 h-96 w-96 rounded-full bg-[#F04623]/[0.055] blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-11 max-w-2xl lg:mb-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#F04623]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#D63E1D]">The US advantage</span>
          </div>
          <h2 id="us-advantage-title" className="text-3xl font-extrabold tracking-tight text-[#17202E] sm:text-4xl lg:text-[2.8rem]">
            Why Incorporate in the US?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            A US company can give your plans a clear foundation. Explore the main reasons founders choose the US, and what each one could mean for you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:gap-5" aria-label="Reasons to form a US business">
          {advantages.map((advantage, index) => {
            const Icon = advantage.icon;
            const isActive = activeIndex === index;

            return (
              <button
                key={advantage.number}
                data-scroll-reveal
                type="button"
                aria-pressed={isActive}
                aria-controls={index === 0 ? 'us-advantage-detail' : undefined}
                onClick={() => setActiveIndex(index)}
                className={`group relative flex min-h-[250px] w-full flex-col overflow-hidden rounded-[1.65rem] border p-6 text-left shadow-sm transition-[transform,background-color,border-color,box-shadow,color] duration-300 motion-reduce:transition-none sm:p-7 lg:min-h-[270px] lg:p-8 ${
                  isActive
                    ? 'border-[#F04623] bg-[#191F29] text-white shadow-[0_18px_38px_-25px_rgba(22,31,44,0.75)]'
                    : 'soft-glass advantage-card border-[#E9E4DF] bg-white text-[#17202E] hover:-translate-y-1 hover:border-[#F5A48F] hover:shadow-[0_18px_38px_-28px_rgba(22,31,44,0.45)] motion-reduce:hover:translate-y-0'
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]`}
              >
                {isActive && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#F04623]" />}
                <span className="flex w-full items-start justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isActive ? 'bg-[#F04623] text-white' : 'bg-[#FFF0EA] text-[#E54723]'}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className={`text-sm font-bold tracking-widest ${isActive ? 'text-white/35' : 'text-slate-300'}`} aria-hidden="true">{advantage.number}</span>
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

        {activeIndex === 0 && <div
          id="us-advantage-detail"
          role="region"
          aria-label={`${active.title} details`}
          aria-live="polite"
          className="accent-glass mt-5 grid gap-8 rounded-[1.65rem] border border-[#E9E4DF] bg-white p-6 shadow-[0_16px_48px_-38px_rgba(22,31,44,0.35)] sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16 lg:p-10"
        >
          <div>
            <div className="mb-5 flex items-center gap-3 text-[#D94320]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0EA]">
                <ActiveIcon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.15em]">Benefit {active.number} / 03</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-[#17202E] sm:text-[1.75rem]">{active.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{active.detail}</p>
          </div>
          <div className="rounded-2xl bg-[#FAF9F7] p-5 sm:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">What this can offer</p>
            <ul className="space-y-4">
              {active.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm font-medium leading-6 text-[#253044]">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F04623]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>}
        <p className="mt-5 text-xs text-slate-500">This is general information, not legal advice.</p>
      </div>
    </section>
  );
}
