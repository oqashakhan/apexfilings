import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, Check, ChevronDown, ChevronRight, CircleHelp, FileCheck2, FileText, ReceiptText } from 'lucide-react';
import { US_STATES } from '../../data/usStates';
import type { ManagementServicePageData } from '../../data/managementServicePages';
import { ConsultationFormSection } from '../forms/ConsultationForm';

const shell = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
const ctaClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white transition-[transform,background-color] duration-200 hover:bg-[#dc3c1b] motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]';

export function ManagementServicePage({ page, onOpenClientPortal }: { page: ManagementServicePageData; onOpenClientPortal: () => void }) {
  const [state, setState] = useState('');
  const requestHref = state ? `/consultation?service=${encodeURIComponent(page.id)}&state=${encodeURIComponent(state)}` : undefined;
  const Icon = page.id === 'annual-report' ? CalendarCheck : page.id === 'resale-certificate' ? ReceiptText : FileCheck2;

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = `${page.title} | Apex Filings`;
    if (description) description.content = page.description;
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, [page]);

  const requestButton = requestHref ? <a href={requestHref} className={ctaClass}>{page.cta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : <button type="button" disabled className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-500">{page.cta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>;

  return <div className="overflow-x-clip bg-white text-[#171717]">
    <section className="relative overflow-hidden border-b border-orange-100 bg-[#fcf9f8] py-12 sm:py-16 lg:py-20" aria-labelledby="management-title">
      <div className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
      <div className={shell}>
        <nav aria-label="Breadcrumb" className="mb-10 text-xs font-semibold text-slate-500"><ol className="flex flex-wrap items-center gap-2"><li><a href="/" className="hover:text-[#F04623]">Home</a></li><li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li><li><a href="/#services" className="hover:text-[#F04623]">Services</a></li><li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li><li aria-current="page" className="text-[#171717]">{page.title}</li></ol></nav>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">US LLC Business Management</p>
            <h1 id="management-title" className="mt-5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">{page.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{page.description}</p>
            <div className="mt-7 max-w-md"><label htmlFor="management-state" className="mb-2 block text-sm font-bold text-[#171717]">Select the LLC’s state</label><select id="management-state" value={state} onChange={(event) => setState(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]"><option value="">Choose a state</option>{US_STATES.map((entry) => <option key={entry.code} value={entry.name}>{entry.name}</option>)}</select></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">{requestButton}<button type="button" onClick={onOpenClientPortal} className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">Log in</button></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Select a state before requesting this service. The request form does not collect payment.</p>
          </div>
          <aside className="premium-glass premium-glass--frosted rounded-[2rem] border border-orange-100 bg-white/90 p-7 shadow-[0_25px_65px_-42px_rgba(23,23,23,0.35)] sm:p-9" aria-label="Service pricing"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#F04623]"><Icon className="h-7 w-7" aria-hidden="true" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Apex Filings service fee</p><p className="mt-2 text-4xl font-extrabold tracking-tight">US${page.apexFee}</p><div className="mt-6 border-t border-orange-100 pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">State / government fee</p><p className="mt-2 text-sm leading-7 text-slate-700">{page.stateFee}</p></div><p className="mt-5 text-xs leading-6 text-slate-500">A final total can only be given after the applicable state charges are confirmed.</p></aside>
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20" aria-labelledby="management-who"><div className={shell}><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">The essentials</p><h2 id="management-who" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Who needs it</h2><p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{page.who}</p></div></section>
    <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="management-included"><div className={shell}><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Your service</p><h2 id="management-included" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">What’s included</h2><ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{page.included.map((item) => <li key={item} data-scroll-reveal className="flex min-h-28 items-start gap-3 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-semibold leading-6 text-slate-700 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:shadow-lg"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{item}</li>)}</ul></div></section>
    <section className="py-16 sm:py-20" aria-labelledby="management-process"><div className={shell}><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Step by step</p><h2 id="management-process" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2><ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.process.map((step, index) => <li key={step} data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_15px_35px_-32px_rgba(23,23,23,0.35)]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1ec] text-sm font-extrabold text-[#F04623]">{String(index + 1).padStart(2, '0')}</span><p className="mt-5 text-sm font-semibold leading-7 text-slate-700">{step}</p></li>)}</ol></div></section>
    <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="management-needs"><div className={`${shell} grid gap-5 lg:grid-cols-2`}><div className="rounded-3xl border border-orange-100 bg-white p-7 sm:p-9"><FileText className="h-6 w-6 text-[#F04623]" aria-hidden="true" /><h2 id="management-needs" className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">Required documents / information</h2><ul className="mt-6 space-y-3">{page.needs.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{item}</li>)}</ul></div><div className="rounded-3xl border border-orange-100 bg-[#fff8f5] p-7 sm:p-9"><CircleHelp className="h-6 w-6 text-[#F04623]" aria-hidden="true" /><h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">Pricing and processing time</h2><div className="mt-6 space-y-5"><div><h3 className="text-sm font-bold">Pricing</h3><p className="mt-1 text-sm leading-7 text-slate-700">{page.pricing}</p></div><div><h3 className="text-sm font-bold">Processing time</h3><p className="mt-1 text-sm leading-7 text-slate-700">{page.processingTime}</p></div></div></div></div></section>
    <section className="py-16 sm:py-20" aria-labelledby="management-important"><div className={shell}><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Before you proceed</p><h2 id="management-important" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Important information</h2><ul className="mt-7 grid gap-4 md:grid-cols-2">{page.important.map((item) => <li key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">{item}</li>)}</ul></div></section>
    <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="management-faq"><div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Common questions</p><h2 id="management-faq" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently Asked Questions</h2><div className="mt-8 space-y-3">{page.faqs.map((faq) => <details key={faq.id} className="group rounded-2xl border border-slate-200 bg-white p-5 open:border-orange-200"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">{faq.question}<ChevronDown className="h-5 w-5 shrink-0 text-[#F04623] transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-4 border-t border-orange-100 pt-4 text-sm leading-7 text-slate-600">{faq.answer}</p></details>)}</div></div></section>
    <section className="bg-[#171717] py-16 text-white sm:py-20" aria-labelledby="management-final"><div className="mx-auto max-w-3xl px-4 text-center sm:px-6"><h2 id="management-final" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready for the next step?</h2><p className="mt-4 text-sm leading-7 text-neutral-300">{page.description}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{requestButton}<button type="button" onClick={onOpenClientPortal} className="min-h-12 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Log in</button></div></div></section>
    <ConsultationFormSection serviceSlug={page.id} initialState={state} requireState />
  </div>;
}
