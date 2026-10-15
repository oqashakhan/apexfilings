import { useEffect } from 'react';
import {
  ArrowRight, Building2, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, FileCheck2, Landmark, LogIn, ShieldCheck,
} from 'lucide-react';

const requestHref = '/consultation?service=uk-ltd-formation';
const containerClass = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
const primaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(240,70,35,0.8)] transition-[transform,background-color] hover:bg-[#dc3c1b] motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]';

const included = [
  'Company name availability check',
  'Preparation and filing of your incorporation with Companies House',
  'Standard (model) Articles of Association',
  'Certificate of incorporation',
  'Guidance on director identity verification',
  'Guidance on next steps for banking, Corporation Tax and VAT',
];

const process = [
  'Tell us your proposed company name and formation needs. We check name availability.',
  'Provide your business activity, registered office, director, shareholder and person-with-significant-control details.',
  'Review the available package, confirmed service fee and separate Companies House fee before proceeding.',
  'Complete the required identity verification for directors and people with significant control.',
  'Apex Filings prepares and submits the application to Companies House.',
  'After Companies House approves the filing, receive your certificate of incorporation and company documents online.',
  'Review next steps for banking, Corporation Tax and VAT with our team.',
];

const requirements = [
  'A proposed company name and two alternatives',
  'Business activity; we can help identify the relevant SIC code',
  'At least one individual director aged 16 or over',
  'At least one shareholder and the proposed share structure',
  'Each director’s name, date of birth, nationality, occupation, country of residence, residential address and service address',
  'Details of each person with significant control',
  'Passport or another identity document for verification',
  'A UK registered office address; ask us about address options',
];

const important = [
  'Directors and people with significant control must complete identity verification.',
  'A UK company must file a confirmation statement and annual accounts with Companies House, and meet its Corporation Tax filing obligations.',
  'HMRC must be told within three months when the company starts business activity.',
  'The registered office address is part of the public record.',
  'Companies House makes the final decision and can refuse a company name or application.',
  'UK tax residence and VAT obligations depend on your circumstances. Ask a qualified accountant for tax advice.',
];

const faqs = [
  { question: 'Can I be a director if I live outside the UK?', answer: 'Yes. Directors can live outside the UK. At least one director must be an individual aged 16 or over.' },
  { question: 'Do I need to visit the UK?', answer: 'No UK visit is normally required for the formation process. Our team can explain the current remote filing and identity verification steps.' },
  { question: 'Do I need a UK address?', answer: 'The company needs a UK registered office address. Ask us about the available address options and any separate charges.' },
  { question: 'How much share capital do I need?', answer: 'There is no legal minimum. One common example is 100 shares of £1 each.' },
  { question: 'Can Apex Filings open a bank account for me?', answer: 'We can discuss document preparation and available support. Any bank or payment provider makes its own eligibility and approval decision.' },
];

export function UkLtdServicePage({ onOpenClientPortal }: { onOpenClientPortal: () => void }) {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'UK Ltd Company Formation | Apex Filings';
    if (description) description.content = 'Explore UK Ltd company formation with Apex Filings: Companies House filing, required documents, government fees and next steps.';
    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, []);

  return (
    <div className="overflow-x-clip bg-white text-[#171717]">
      <section className="relative overflow-hidden border-b border-orange-100 bg-[#fcf9f8] py-12 sm:py-16 lg:py-20" aria-labelledby="uk-service-title">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
        <div className={containerClass}>
          <nav aria-label="Breadcrumb" className="mb-10 text-xs font-semibold text-slate-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><a href="/" className="hover:text-[#F04623]">Home</a></li>
              <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
              <li><a href="/#services" className="hover:text-[#F04623]">Services</a></li>
              <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
              <li aria-current="page" className="text-[#171717]">UK Ltd</li>
            </ol>
          </nav>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.13fr)_minmax(0,0.87fr)] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">UK company formation</p>
              <h1 id="uk-service-title" className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">UK Ltd Company Formation</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">A UK private limited company is a separate legal entity registered at Companies House. Apex Filings helps prepare and file your application and delivers your company documents online after approval.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href={requestHref} className={primaryClass}>Form My UK Ltd <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                <button type="button" onClick={onOpenClientPortal} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><LogIn className="h-4 w-4" aria-hidden="true" />Log in</button>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-slate-500">UK online checkout and client account access are being prepared. “Form My UK Ltd” currently opens a consultation request so our team can confirm available packages and next steps.</p>
            </div>
            <aside className="premium-glass premium-glass--frosted relative rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-[0_25px_65px_-42px_rgba(23,23,23,0.35)] sm:p-8" aria-label="UK Ltd formation overview">
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Your UK Ltd formation</span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1ec] text-[#F04623]"><Building2 className="h-6 w-6" aria-hidden="true" /></span></div>
              <div className="mt-7 h-px bg-orange-100" />
              <ul className="mt-6 space-y-4">{included.slice(0, 4).map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{item}</li>)}</ul>
              <a href="#uk-included" className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-[#c53618] hover:underline">See what’s included <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="uk-who">
        <div className={containerClass}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">The essentials</p>
          <h2 id="uk-who" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Who needs a UK Ltd?</h2>
          <div className="accent-glass mt-8 max-w-4xl rounded-3xl border border-orange-100 bg-[#fffaf8] p-7 sm:p-9"><p className="text-base leading-8 text-slate-700">Non-UK founders may choose a UK company for trading, serving UK customers or establishing a UK registered business. Directors and shareholders can live outside the UK.</p></div>
        </div>
      </section>

      <section id="uk-included" className="scroll-mt-24 bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="uk-included-title">
        <div className={containerClass}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Your service</p>
          <h2 id="uk-included-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">What’s included</h2>
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{included.map((item) => <li key={item} data-scroll-reveal className="soft-glass flex min-h-28 items-start gap-3 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-semibold leading-6 text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#F04623]"><Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>{item}</li>)}</ul>
          <p className="mt-5 text-xs leading-6 text-slate-500">A first-year registered office address and share certificate or company records are not listed as included until their package terms are confirmed.</p>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="uk-process-title">
        <div className={containerClass}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Step by step</p>
          <h2 id="uk-process-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{process.map((step, index) => <li key={step} data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_15px_35px_-32px_rgba(23,23,23,0.35)]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1ec] text-sm font-extrabold text-[#F04623]">{String(index + 1).padStart(2, '0')}</span><p className="mt-5 text-sm font-semibold leading-7 text-slate-700">{step}</p></li>)}</ol>
        </div>
      </section>

      <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="uk-requirements-title">
        <div className={`${containerClass} grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:gap-12`}>
          <div className="rounded-3xl border border-orange-100 bg-white p-7 sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Before you begin</p>
            <h2 id="uk-requirements-title" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Required details and documents</h2>
            <ul className="mt-7 space-y-4">{requirements.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{item}</li>)}</ul>
          </div>
          <aside className="accent-glass self-start rounded-3xl border border-orange-100 bg-[#fff8f5] p-7 sm:p-9" aria-labelledby="uk-verification-title"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#F04623]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span><h3 id="uk-verification-title" className="mt-5 text-2xl font-extrabold tracking-tight">Identity verification</h3><p className="mt-4 text-sm leading-8 text-slate-700">Every director and person with significant control must meet Companies House identity verification requirements. The time this takes depends on the applicant and is separate from filing time.</p></aside>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="uk-pricing-title">
        <div className={containerClass}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Clear costs</p>
          <h2 id="uk-pricing-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Pricing and processing time</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_45px_-36px_rgba(23,23,23,0.3)] sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#F04623]"><Landmark className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-bold">Apex Filings package fee</h3><p className="mt-3 text-base font-semibold leading-8 text-slate-700">Contact us for current UK Ltd package pricing.</p><p className="mt-3 text-sm leading-7 text-slate-600">Our service fee is quoted separately from Companies House fees and any optional add-ons.</p></article>
            <article className="accent-glass rounded-3xl border border-orange-100 bg-[#fffaf8] p-7 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#F04623]"><FileCheck2 className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-bold">Companies House government fees</h3><ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700"><li><strong>£100</strong> for digital incorporation</li><li><strong>£156</strong> for same-day digital incorporation via software, where available</li></ul><p className="mt-4 text-xs leading-6 text-slate-500">Government fees are separate and can change. <a href="https://www.gov.uk/government/publications/companies-house-fees/companies-house-fees" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#c53618] underline underline-offset-2">Check current Companies House fees</a> before ordering.</p></article>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#F6F8FA] p-5 text-sm leading-7 text-slate-700"><Clock3 className="mt-1 h-5 w-5 shrink-0 text-[#F04623]" aria-hidden="true" /><p><strong>Processing time:</strong> Our team will confirm the current estimate before you proceed. Identity verification timing varies, and Companies House makes the final approval decision.</p></div>
        </div>
      </section>

      <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="uk-addons-title">
        <div className={containerClass}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Beyond formation</p>
          <h2 id="uk-addons-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Optional add-ons</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Ask our team about availability and separate pricing for a director service address, UK business bank account support, UK VAT registration or bespoke Articles of Association. These are not included in the formation package unless explicitly confirmed in your quote.</p>
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="uk-important-title"><div className={containerClass}><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Good to know</p><h2 id="uk-important-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Important information</h2><ul className="mt-8 grid gap-4 sm:grid-cols-2">{important.map((item) => <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700"><CircleHelp className="mt-1 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{item}</li>)}</ul><p className="mt-5 text-sm text-slate-600">A digital confirmation statement currently carries a separate £50 Companies House fee each payment year.</p></div></section>

      <section className="bg-[#fcf9f8] py-16 sm:py-20" aria-labelledby="uk-faq-title"><div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Common questions</p><h2 id="uk-faq-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently Asked Questions</h2><div className="mt-9 space-y-3">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-5 open:border-orange-200 open:bg-[#fffaf8]"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><span>{faq.question}</span><ChevronDown className="h-5 w-5 shrink-0 text-[#F04623] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-4 border-t border-orange-100 pt-4 text-sm leading-7 text-slate-600">{faq.answer}</p></details>)}</div></div></section>

      <section className="bg-[#191F29] py-16 text-white sm:py-20" aria-labelledby="uk-final-title"><div className="mx-auto max-w-3xl px-4 text-center sm:px-6"><h2 id="uk-final-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to explore your UK Ltd?</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">Tell us about your company so we can confirm available packages, pricing and the steps to form it.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href={requestHref} className={primaryClass}>Form My UK Ltd <ArrowRight className="h-4 w-4" aria-hidden="true" /></a><button type="button" onClick={onOpenClientPortal} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><LogIn className="h-4 w-4" aria-hidden="true" />Log in</button></div></div></section>
    </div>
  );
}
