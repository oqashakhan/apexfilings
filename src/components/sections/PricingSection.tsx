import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Check, Flag, Gem, Minus } from 'lucide-react';
import { PRICING_CATEGORIES, PRICING_DISCLAIMER, PRICING_PLANS, pricingComparisonLabel, type PricingCategory } from '../../data/pricing';
import { PricingPlan } from '../../types';
import './PricingSection.css';

interface PricingSectionProps {
  onSelectPlan: (plan: PricingPlan, isNonUs: boolean) => void;
  asPage?: boolean;
}

const basicFeatures = PRICING_PLANS.find((plan) => plan.id === 'basic')?.features ?? [];
const comparisonFeatures = Array.from(new Set(PRICING_PLANS.flatMap((plan) => plan.features)));

function includesFeature(plan: PricingPlan, feature: string) {
  return plan.features.includes(feature);
}

export function PricingSection({ onSelectPlan, asPage = false }: PricingSectionProps) {
  const Heading = asPage ? 'h1' : 'h2';
  const [category, setCategory] = useState<PricingCategory>('us-llc');
  const contentRef = useRef<HTMLDivElement>(null);
  const previousHeightRef = useRef<number | null>(null);
  const heightAnimationRef = useRef<Animation | null>(null);
  const isUsLlc = category === 'us-llc';

  const selectCategory = (next: PricingCategory) => {
    if (next === category) return;
    previousHeightRef.current = contentRef.current?.getBoundingClientRect().height ?? null;
    setCategory(next);
  };

  useLayoutEffect(() => {
    const content = contentRef.current;
    const previousHeight = previousHeightRef.current;
    if (!content || previousHeight === null) return;
    previousHeightRef.current = null;
    heightAnimationRef.current?.cancel();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    heightAnimationRef.current = content.animate(
      [{ height: `${previousHeight}px` }, { height: `${content.scrollHeight}px` }],
      { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' },
    );
  }, [category]);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#DFE5EB] bg-[#F6F8FA] px-5 py-14 sm:px-10 lg:px-16 lg:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-[4rem] border border-[#DEE4EA] rotate-[-22deg]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-10 h-[30rem] w-52 rotate-[20deg] rounded-[5rem] border border-[#DEE4EA]" />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#E54723]">Clear pricing, confident choices</span>
          <Heading id="pricing-title" className="mt-4 text-4xl font-bold tracking-tight text-[#191D2A] sm:text-5xl lg:text-[3.5rem]">
            {isUsLlc ? 'Choose Your US LLC Formation Package' : 'Explore UK Ltd Formation'}
          </Heading>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {isUsLlc ? 'Choose the formation package that fits your business. Compare what is included before you begin.' : 'Speak with our team about UK Ltd formation packages and pricing.'}
          </p>

          <div className="mt-8 inline-flex rounded-full border border-[#DEE4EA] bg-white p-1 shadow-sm" role="group" aria-label="Company formation category">
            {PRICING_CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectCategory(option.id)}
                aria-pressed={category === option.id}
                aria-controls="pricing-category-content"
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623] ${category === option.id ? 'bg-[#191D2A] text-white' : 'text-slate-600 hover:text-[#191D2A]'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div id="pricing-category-content" ref={contentRef} className="relative overflow-hidden">
          {isUsLlc ? (
            <div key="us-llc" className="pricing-category-panel">
        <div className="relative mx-auto mt-12 grid max-w-[850px] gap-5 md:grid-cols-2 lg:mt-14">
          {PRICING_PLANS.map((plan) => {
            const featured = plan.isPopular;
            const Icon = featured ? Gem : Flag;
            const price = plan.priceNonUsResident;

            return (
              <article
                key={plan.id}
                className={`pricing-card relative flex min-h-[355px] flex-col overflow-hidden rounded-[1.35rem] border p-6 shadow-[0_14px_35px_-30px_rgba(16,24,40,0.4)] sm:p-7 lg:p-8 ${featured ? 'pricing-card--featured dark-glass clay-card-dark text-white' : 'soft-glass clay-card border-[#E2E7EC] bg-white text-[#191D2A]'}`}
              >
                {featured && (
                  <span className="absolute -right-5 top-8 hidden w-36 rotate-45 bg-[#F04623] py-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#101418] shadow-sm sm:block">
                    {plan.badge}
                  </span>
                )}
                <div className="relative">
                  {featured && <span className="mb-4 inline-flex rounded-full bg-[#F04623] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#101418] sm:hidden">{plan.badge}</span>}
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${featured ? 'border-white/60 bg-white text-[#191D2A]' : 'border-[#E2E7EC] bg-[#FAFBFC] text-[#191D2A]'}`}>
                    <Icon className="h-4 w-4 text-[#F04623]" strokeWidth={2} aria-hidden="true" />
                    {plan.name}
                  </span>

                  <div className="mt-10 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`text-5xl font-bold tracking-tight tabular-nums sm:text-[3.35rem] ${featured ? 'text-[#FF805E]' : ''}`}>${price}</span>
                    <span className={`text-sm font-medium ${featured ? 'text-[#D1D7DF]' : 'text-[#313643]'}`}>{plan.feeNotice}</span>
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${featured ? 'text-[#D1D7DF]' : 'text-slate-600'}`}>{plan.subtitle}</p>
                  <p className={`mt-5 max-w-[32ch] text-sm leading-6 ${featured ? 'text-[#D1D7DF]' : 'text-slate-600'}`}>{plan.description}</p>
                  <p className={`mt-4 text-xs font-semibold ${featured ? 'text-white' : 'text-[#344054]'}`}>{featured ? `All ${basicFeatures.length} Basic services, plus ${plan.features.length - basicFeatures.length} additional services` : `${plan.features.length} services included`}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(plan, true)}
                  className={asPage
                    ? `pricing-page-cta relative mt-auto inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-[background-color,border-color,box-shadow,transform] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623] ${featured ? 'pricing-page-cta--featured' : ''}`
                    : `polish-button relative mt-auto inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623] ${featured ? 'polish-primary bg-[#F04623] text-white hover:bg-[#E03E1B]' : 'border border-[#E3D7D0] bg-white text-[#C83A1A] hover:border-[#F04623] hover:bg-[#FFF8F5]'}`}
                >
                  {asPage && featured ? 'Choose Premium All-In' : plan.ctaText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
        <p className="relative mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-slate-600">{PRICING_DISCLAIMER}</p>

        <div className="relative mt-12 text-center">
          <button
            type="button"
            onClick={() => document.getElementById('pricing-comparison')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}
            className={asPage
              ? "inline-flex min-h-14 items-center gap-3 rounded-full border-2 border-white bg-[#F04623] px-8 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_3px_0_#C43515,0_12px_22px_-12px_rgba(240,70,35,0.75)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#E03E1B] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"
              : "polish-button polish-primary inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#F04623] px-7 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-13px_rgba(240,70,35,0.65)] hover:bg-[#E03E1B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"}
          >
            Compare what's included
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          id="pricing-comparison"
          className="relative mt-12 scroll-mt-24 rounded-2xl border border-[#DFE5EB] bg-white p-5 sm:p-8"
        >
          <h3 className="text-xl font-bold text-[#191D2A] sm:text-2xl">Compare What's Included</h3>
          <p className="mt-2 text-sm text-slate-600">Review the services included in each package.</p>
          <div className="mt-7 grid gap-3 md:hidden" role="list" aria-label="Package service comparison">
            {comparisonFeatures.map((feature) => (
              <div key={feature} role="listitem" className="rounded-xl border border-[#E5E9ED] bg-[#FAFBFC] p-4">
                <p className="text-sm font-semibold leading-5 text-[#344054]">{pricingComparisonLabel(feature)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {PRICING_PLANS.map((plan) => <span key={plan.id} className="inline-flex items-center gap-2 text-xs font-medium text-[#344054]">{includesFeature(plan, feature) ? <Check className="h-4 w-4 shrink-0 text-[#E54723]" aria-label="Included" /> : <Minus className="h-4 w-4 shrink-0 text-slate-400" aria-label="Not included" />}{plan.name}</span>)}
                </div>
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
                    <th scope="row" className="px-5 py-3.5 font-medium leading-5 text-[#344054]">{pricingComparisonLabel(feature)}</th>
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
          ) : (
            <div key="uk-ltd" className="pricing-category-panel accent-glass mx-auto mt-12 flex max-w-[850px] flex-col items-start rounded-[1.35rem] border border-orange-100 bg-white p-7 shadow-[0_14px_35px_-30px_rgba(16,24,40,0.4)] sm:p-10 lg:mt-14">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#F04623]"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-[#171717] sm:text-3xl">UK Ltd Company Formation</h3>
                <p className="mt-4 max-w-[58ch] text-base leading-7 text-slate-600">Looking to register a company in the United Kingdom? Contact our team for available formation packages and pricing.</p>
                <a href="/consultation" className="polish-button polish-primary mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-bold text-white hover:bg-[#E03E1B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">
                  Get UK Ltd Pricing <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
