import { useEffect } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, Check, ChevronDown, ChevronRight,
  CircleHelp, FileSignature, FileText, IdCard, Landmark, Mail, MessagesSquare,
  ScanLine, ShieldCheck, Sparkles, type LucideIcon,
} from 'lucide-react';
import type { UsServicePage as UsServicePageData } from '../../data/usServicePages';
import { ConsultationFormSection } from '../forms/ConsultationForm';

const icons: Record<string, LucideIcon> = {
  ein: IdCard,
  'registered-agent': ShieldCheck,
  'mail-forwarding': Mail,
  'business-banking': Landmark,
  'operating-agreement': FileSignature,
  'business-licenses': BadgeCheck,
  itin: ScanLine,
  trademark: Sparkles,
  consultation: MessagesSquare,
};

const primaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(240,70,35,0.8)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[#dc3c1b] motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]';
const sectionClass = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">{children}</p>;
}

export function UsServicePage({ page }: { page: UsServicePageData }) {
  const Icon = icons[page.id] ?? Building2;
  const requestHref = `/consultation?service=${encodeURIComponent(page.id)}`;

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = page.pageTitle;
    if (description) description.content = page.pageDescription;
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, [page]);

  const faqSchema = page.faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  } : null;

  return (
    <div className="overflow-x-clip bg-white text-[#171717]">
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />}
      <section className="relative overflow-hidden border-b border-orange-100 bg-[#fcf9f8] py-12 sm:py-16 lg:py-20" aria-labelledby="service-title">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
        <div className={sectionClass}>
          <nav aria-label="Breadcrumb" className="mb-10 text-xs font-semibold text-slate-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><a href="/" className="hover:text-[#F04623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]">Home</a></li>
              <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
              <li><a href="/#services" className="hover:text-[#F04623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]">Services</a></li>
              <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
              <li aria-current="page" className="text-[#171717]">{page.title}</li>
            </ol>
          </nav>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.13fr)_minmax(0,0.87fr)] lg:gap-16">
            <div>
              <SectionLabel>US LLC services</SectionLabel>
              <h1 id="service-title" className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">{page.h1}</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{page.intro}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={requestHref} className={primaryClass}>{page.cta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                <a href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">View US LLC Pricing</a>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Service requests open the consultation form; no appointment is booked automatically.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">State, IRS and USPTO fees are paid in addition to the Apex Filings price.</p>
            </div>
            <div className="relative mx-auto w-full max-w-lg">
              <div className="pointer-events-none absolute inset-8 rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
              <div className="premium-glass premium-glass--frosted relative rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-[0_25px_65px_-42px_rgba(23,23,23,0.35)] sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{page.title}</span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff1ec] text-[#F04623]"><Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></span>
                </div>
                <div className="mt-7 h-px bg-orange-100" />
                <ul className="mt-6 space-y-4">
                  {page.included.slice(0, 3).map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#F04623]"><Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" /></span>{item}</li>)}
                </ul>
                <a href="#included" className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-[#c53618] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]">See what’s included <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="service-explained">
        <div className={sectionClass}>
          <SectionLabel>The essentials</SectionLabel>
          <h2 id="service-explained" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Understand the service</h2>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_45px_-36px_rgba(23,23,23,0.3)] sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#F04623]"><FileText className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-bold">What is it?</h3><p className="mt-3 text-base leading-8 text-slate-600">{page.what}</p></article>
            <article className="accent-glass rounded-3xl border border-orange-100 bg-[#fffaf8] p-7 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#F04623]"><CircleHelp className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-bold">Who needs it?</h3><p className="mt-3 text-base leading-8 text-slate-600">{page.who}</p></article>
          </div>
        </div>
      </section>

      <section id="included" className="scroll-mt-24 bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="service-included">
        <div className={sectionClass}>
          <SectionLabel>Your service</SectionLabel>
          <h2 id="service-included" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">What is included</h2>
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.included.map((item) => <li key={item} data-scroll-reveal className="soft-glass flex min-h-28 items-start gap-3 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-semibold leading-6 text-slate-700 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:shadow-[0_18px_35px_-25px_rgba(23,23,23,0.3)]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#F04623]"><Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="service-process">
        <div className={sectionClass}>
          <SectionLabel>Step by step</SectionLabel>
          <h2 id="service-process" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.process.map((step, index) => <li key={`${index}-${step}`} data-scroll-reveal className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_15px_35px_-32px_rgba(23,23,23,0.35)]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1ec] text-sm font-extrabold text-[#F04623]">{String(index + 1).padStart(2, '0')}</span><p className="mt-5 text-sm font-semibold leading-7 text-slate-700">{step}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="service-needs">
        <div className={`${sectionClass} grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12`}>
          <div className="rounded-3xl border border-orange-100 bg-white p-7 sm:p-9">
            <SectionLabel>Before you begin</SectionLabel>
            <h2 id="service-needs" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">What we need from you</h2>
            <ul className="mt-7 space-y-4">{page.needs.map((need) => <li key={need} className="flex items-start gap-3 text-sm leading-7 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{need}</li>)}</ul>
          </div>
          <aside className="accent-glass rounded-3xl border border-orange-100 bg-[#fff8f5] p-7 sm:p-9" aria-labelledby="service-good-to-know"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#F04623]"><CircleHelp className="h-5 w-5" aria-hidden="true" /></span><h2 id="service-good-to-know" className="mt-5 text-2xl font-extrabold tracking-tight">Good to know</h2><p className="mt-4 text-sm leading-8 text-slate-700">{page.goodToKnow}</p></aside>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="service-faq">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionLabel>Common questions</SectionLabel>
          <h2 id="service-faq" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          {page.faqs.length ? <div className="mt-9 space-y-3">{page.faqs.map((faq) => <details key={faq.id} className="group rounded-2xl border border-slate-200 bg-white p-5 open:border-orange-200 open:bg-[#fffaf8]"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><span>{faq.question}</span><ChevronDown className="h-5 w-5 shrink-0 text-[#F04623] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-4 border-t border-orange-100 pt-4 text-sm leading-7 text-slate-600">{faq.answer}</p></details>)}</div> : <div className="mt-8 rounded-2xl border border-orange-100 bg-[#fffaf8] p-6 text-sm leading-7 text-slate-700">For current address and forwarding details, <a href={requestHref} className="font-semibold text-[#c53618] underline underline-offset-4">contact our team</a>.</div>}
        </div>
      </section>

      <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="related-services">
        <div className={sectionClass}>
          <SectionLabel>Explore more</SectionLabel>
          <h2 id="related-services" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Related services</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.related.map(({ label, href }) => href ? <a key={label} href={href} className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-[#171717] transition-[transform,border-color,box-shadow] duration-200 hover:border-orange-200 hover:shadow-lg motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><span>{label}</span><ArrowRight className="h-4 w-4 shrink-0 text-[#F04623] transition-transform duration-200 motion-safe:group-hover:translate-x-1" aria-hidden="true" /></a> : <div key={label} aria-disabled="true" className="flex min-h-20 items-center rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-sm font-bold text-slate-500">{label}</div>)}</div>
        </div>
      </section>

      <section className="bg-[#171717] py-16 text-white sm:py-20" aria-labelledby="service-final-cta">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 id="service-final-cta" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready for the next step?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-300">{page.intro}</p>
          <a href={requestHref} className={`${primaryClass} mt-8 w-full sm:w-auto`}>{page.cta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>
      <ConsultationFormSection serviceSlug={page.id} />
    </div>
  );
}
