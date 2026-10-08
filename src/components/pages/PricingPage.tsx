import { useEffect } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { PricingSection } from '../sections/PricingSection';
import type { PricingPlan } from '../../types';

export function PricingPage({ onSelectPlan }: { onSelectPlan: (plan: PricingPlan, isNonUs: boolean) => void }) {
  useEffect(() => {
    document.title = 'Pricing & Packages | Apex Filings';
    return () => { document.title = 'Apex Filings | Start Your US Business With Confidence'; };
  }, []);

  return (
    <>
      <PricingSection asPage onSelectPlan={onSelectPlan} />
      <section className="bg-[#fcf9f8] px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="pricing-help-title">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-3xl border border-orange-100 bg-white p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-orange-50 p-3 text-[#F04623]"><MessageSquare className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <h2 id="pricing-help-title" className="text-2xl font-bold text-[#171717]">A little guidance before you start?</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Tell us about your business and the services you need. We can help you understand the packages before you choose.</p>
            </div>
          </div>
          <a href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white hover:bg-[#e03e1b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">Contact our team <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>
    </>
  );
}
