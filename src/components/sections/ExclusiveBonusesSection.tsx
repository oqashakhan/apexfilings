import { useState } from 'react';
import { ArrowRight, Brush, FileText, Landmark, MessageCircle, Sparkles } from 'lucide-react';

const bonuses = [
  {
    id: 'concierge',
    title: 'Dedicated Concierge',
    description: 'Ask about one-to-one support options.',
    detail: 'Our team can explain available support channels and any separate service terms.',
    icon: MessageCircle,
  },
  {
    id: 'banking',
    title: 'Business Banking',
    description: 'Explore application assistance for eligible providers.',
    detail: 'Get guidance preparing an application. Each banking provider makes its own eligibility and approval decisions.',
    icon: Landmark,
  },
  {
    id: 'branding',
    title: 'Brand Identity',
    description: 'Explore custom branding and logo support.',
    detail: 'Ask our team about available design services and any separate pricing.',
    icon: Brush,
  },
  {
    id: 'tax',
    title: 'Tax Strategy',
    description: 'Discuss options for a CPA consultation.',
    detail: 'Ask about availability and any separate charges. Tax advice is provided by qualified professionals.',
    icon: FileText,
  },
];

export function ExclusiveBonusesSection() {
  const [expandedBenefits, setExpandedBenefits] = useState<string[]>([]);
  const allExpanded = expandedBenefits.length === bonuses.length;

  const toggleBenefit = (id: string) => {
    setExpandedBenefits((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <section
      id="bonuses"
      aria-labelledby="additional-support-title"
      className="relative overflow-hidden bg-[#FFFAF7] py-20 lg:py-28"
    >
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-6 xl:gap-10">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E54723] sm:text-sm">
              Additional support
            </p>
            <h2
              id="additional-support-title"
              className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#101828] sm:text-5xl xl:text-[3.35rem]"
            >
              More Value for
              <span className="mt-1 block text-[#F04623]">a Smarter Start</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#536078]">
              Explore optional support beyond your LLC formation package, from business banking guidance
              to branding, tax consultation, and one-to-one help. Availability and separate charges may apply.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#F5DCCF] bg-[#FFF0E8] px-3 py-1.5 text-xs font-semibold text-[#B93E1F]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Optional services · ask for details
            </span>

            <div id="additional-support-cards" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {bonuses.map((bonus) => {
                const Icon = bonus.icon;
                const expanded = expandedBenefits.includes(bonus.id);

                return (
                  <div
                    key={bonus.id}
                    data-scroll-reveal
                    className={`premium-glass premium-glass--support self-start overflow-hidden rounded-2xl border transition-[border-color,box-shadow,transform] duration-250 motion-reduce:transition-none ${expanded ? 'premium-glass--selected' : ''}`}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`additional-support-${bonus.id}`}
                      onClick={() => toggleBenefit(bonus.id)}
                      className="group flex min-h-28 w-full items-center gap-3 rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#F04623]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EC] text-[#F04623]">
                        <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-5 tracking-tight text-[#101828]">{bonus.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#536078]">{bonus.description}</span>
                      </span>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 text-[#263142] transition-transform duration-200 group-hover:text-[#F04623] motion-reduce:transition-none ${expanded ? 'rotate-90' : 'group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0'}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div id={`additional-support-${bonus.id}`} hidden={!expanded} className="px-4 pb-4">
                      <p className="border-t border-[#F1EBE7] pt-3 text-xs leading-5 text-[#536078]">{bonus.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-5">
              <a
                href="/start"
                className="polish-button polish-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#F04623] to-[#FF682D] px-6 py-3.5 text-sm font-bold text-white shadow-[0_9px_20px_-10px_rgba(240,70,35,0.65)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-105 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
              >
                Start My Business
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => setExpandedBenefits(allExpanded ? [] : bonuses.map((bonus) => bonus.id))}
                aria-expanded={allExpanded}
                aria-controls="additional-support-cards"
                className="group inline-flex min-h-11 items-center gap-3 border-b border-[#F04623] py-2 text-sm font-semibold text-[#101828] transition-colors hover:text-[#F04623] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
              >
                {allExpanded ? 'Hide Option Details' : 'See All Options'}
                <ArrowRight className={`h-4 w-4 text-[#F04623] transition-transform motion-reduce:transition-none ${allExpanded ? '-rotate-90' : 'group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto flex min-h-[420px] w-full max-w-2xl items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FFF1E8] via-[#FFFAF7] to-[#FFE0CF] p-5 sm:min-h-[520px] sm:p-10 lg:min-h-[580px]">
            <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-[#F9BEA4] bg-[#FFE1D0]/60" />
            <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full border border-[#F9BEA4] bg-white/45" />
            <div className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-[#F0D9CE] bg-white shadow-[0_32px_75px_-35px_rgba(109,47,20,0.38)]">
              <div className="flex items-center justify-between border-b border-[#F4E8E2] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF2EA]"><img src="/images/apex-navbar-logo.png" alt="" className="h-6 w-6 object-contain" loading="lazy" /></span>
                  <span className="text-sm font-bold text-[#171717]">Apex Filings</span>
                </div>
                <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#F6C9B6]" /><span className="h-2 w-2 rounded-full bg-[#F6C9B6]" /><span className="h-2 w-2 rounded-full bg-[#F6C9B6]" /></div>
              </div>
              <div className="p-5 sm:p-7">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#E54723]">Optional services</span>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-[#101828] sm:text-2xl">Support for what comes next</h3>
                <p className="mt-2 text-xs leading-5 text-[#667085] sm:text-sm">Explore available help beyond your formation package.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {bonuses.map((bonus) => {
                    const Icon = bonus.icon;
                    return <div key={bonus.id} className="rounded-2xl border border-[#F1E8E3] bg-[#FFFBF9] p-3.5 sm:p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E9] text-[#F04623]"><Icon size={21} strokeWidth={1.8} /></span><span className="mt-3 block text-xs font-semibold text-[#1D2939] sm:text-sm">{bonus.title}</span></div>;
                  })}
                </div>
                <div className="mt-5 rounded-xl bg-[#FFF2EA] px-4 py-3 text-xs font-medium text-[#9B442D]">Availability and separate charges may apply.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
