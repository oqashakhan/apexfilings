import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Flag, Gem, Minus } from 'lucide-react';
import { PRICING_PLANS } from '../../data/pricing';
import { PricingPlan } from '../../types';

interface PricingSectionProps {
  onSelectPlan: (plan: PricingPlan, isNonUs: boolean) => void;
}

const basicFeatures = PRICING_PLANS.find((plan) => plan.id === 'basic')?.features ?? [];
const comparisonFeatures = Array.from(
  new Set(
    PRICING_PLANS.flatMap((plan) =>
      plan.features.filter((feature) => !feature.startsWith('Everything in Basic')),
    ),
  ),
);

function includesFeature(plan: PricingPlan, feature: string) {
  return plan.features.includes(feature) ||
    (plan.features.some((item) => item.startsWith('Everything in Basic')) && basicFeatures.includes(feature));
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [isNonUsResident, setIsNonUsResident] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!comparisonOpen) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    comparisonRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }, [comparisonOpen]);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#DFE5EB] bg-[#F6F8FA] px-5 py-14 sm:px-10 lg:px-16 lg:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-[4rem] border border-[#DEE4EA] rotate-[-22deg]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-10 h-[30rem] w-52 rotate-[20deg] rounded-[5rem] border border-[#DEE4EA]" />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#E54723]">Clear pricing, confident choices</span>
          <h2 id="pricing-title" className="mt-4 text-4xl font-bold tracking-tight text-[#191D2A] sm:text-5xl lg:text-[3.5rem]">
            Choose Your Package
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Choose the formation package that fits your business. Compare what is included before you begin.
          </p>

          <div className="mt-8 inline-flex rounded-full border border-[#DEE4EA] bg-white p-1 shadow-sm" role="group" aria-label="Residency for pricing">
            <button
              type="button"
              onClick={() => setIsNonUsResident(false)}
              aria-pressed={!isNonUsResident}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623] ${!isNonUsResident ? 'bg-[#191D2A] text-white' : 'text-slate-600 hover:text-[#191D2A]'}`}
            >
              US resident
            </button>
            <button
              type="button"
              onClick={() => setIsNonUsResident(true)}
              aria-pressed={isNonUsResident}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623] ${isNonUsResident ? 'bg-[#191D2A] text-white' : 'text-slate-600 hover:text-[#191D2A]'}`}
            >
              Non-US resident
            </button>
          </div>
        </div>

        <div className="relative mx-auto mt-12 grid max-w-[850px] gap-5 md:grid-cols-2 lg:mt-14">
          {PRICING_PLANS.map((plan) => {
            const featured = plan.isPopular;
            const Icon = featured ? Gem : Flag;
            const price = isNonUsResident ? plan.priceNonUsResident : plan.priceUsResident;

            return (
              <article
                key={plan.id}
                className={`relative flex min-h-[355px] flex-col overflow-hidden rounded-[1.35rem] border p-6 shadow-[0_14px_35px_-30px_rgba(16,24,40,0.4)] sm:p-7 lg:p-8 ${featured ? 'border-[#ED5226] bg-gradient-to-br from-[#FF5418] to-[#F46D44] text-white' : 'border-[#E2E7EC] bg-white text-[#191D2A]'}`}
              >
                {featured && (
                  <span className="absolute -right-5 top-8 w-36 rotate-45 bg-[#252525] py-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                    Popular
                  </span>
                )}
                <div className="relative">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${featured ? 'border-white/60 bg-white text-[#191D2A]' : 'border-[#E2E7EC] bg-[#FAFBFC] text-[#191D2A]'}`}>
                    <Icon className="h-4 w-4 text-[#F04623]" strokeWidth={2} aria-hidden="true" />
                    {plan.name}
                  </span>

                  <div className="mt-10 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-5xl font-bold tracking-tight tabular-nums sm:text-[3.35rem]">${price}</span>
                    <span className={`text-sm font-medium ${featured ? 'text-white/90' : 'text-[#313643]'}`}>{plan.feeNotice}</span>
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${featured ? 'text-white/90' : 'text-slate-600'}`}>{plan.subtitle}</p>
                  <p className={`mt-5 max-w-[32ch] text-sm leading-6 ${featured ? 'text-white/90' : 'text-slate-600'}`}>{plan.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(plan, isNonUsResident)}
                  className={`relative mt-auto inline-flex w-fit items-center gap-2 pt-8 text-sm font-bold transition-transform hover:translate-x-1 motion-reduce:transition-none motion-reduce:hover:translate-x-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current ${featured ? 'text-white' : 'text-[#E54723]'}`}
                >
                  {plan.ctaText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>

        <div className="relative mt-12 text-center">
          <button
            type="button"
            onClick={() => setComparisonOpen((open) => !open)}
            aria-expanded={comparisonOpen}
            aria-controls="pricing-comparison"
            className="inline-flex min-h-14 items-center gap-3 rounded-full border-2 border-white bg-[#F04623] px-8 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_3px_0_#C43515,0_12px_22px_-12px_rgba(240,70,35,0.75)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#E03E1B] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
          >
            {comparisonOpen ? 'Hide comparison' : 'Compare packages'}
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${comparisonOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <p className="mt-4 text-xs text-slate-500">Package price plus applicable state filing fee.</p>
        </div>

        <div
          id="pricing-comparison"
          ref={comparisonRef}
          className={`${comparisonOpen ? 'block' : 'hidden'} relative mt-12 scroll-mt-24 rounded-2xl border border-[#DFE5EB] bg-white p-5 sm:p-8`}
        >
          <h3 className="text-xl font-bold text-[#191D2A] sm:text-2xl">Compare what’s included</h3>
          <p className="mt-2 text-sm text-slate-600">Review the services listed in each package.</p>
          <div className="mt-7 grid gap-4 md:hidden">
            {PRICING_PLANS.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-[#E5E9ED] bg-[#FAFBFC] p-5">
                <h4 className="font-bold text-[#191D2A]">{plan.name}</h4>
                <p className="mt-1 text-sm font-semibold text-[#E54723]">
                  ${isNonUsResident ? plan.priceNonUsResident : plan.priceUsResident} {plan.feeNotice}
                </p>
                <ul className="mt-5 space-y-3">
                  {comparisonFeatures.filter((feature) => includesFeature(plan, feature)).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-5 text-[#344054]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E54723]" strokeWidth={2.5} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-7 hidden overflow-x-auto rounded-xl border border-[#E5E9ED] md:block">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-[#F6F8FA] text-[#191D2A]">
                <tr>
                  <th scope="col" className="w-1/2 px-5 py-4 font-bold">Included service</th>
                  {PRICING_PLANS.map((plan) => <th key={plan.id} scope="col" className="px-5 py-4 text-center font-bold">{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature} className="border-t border-[#E9EDF0]">
                    <th scope="row" className="px-5 py-3.5 font-medium leading-5 text-[#344054]">{feature}</th>
                    {PRICING_PLANS.map((plan) => (
                      <td key={plan.id} className="px-5 py-3.5 text-center">
                        {includesFeature(plan, feature) ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0EA] text-[#E54723]" aria-label="Included">
                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="inline-flex h-7 w-7 items-center justify-center text-slate-400" aria-label="Not included">
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
