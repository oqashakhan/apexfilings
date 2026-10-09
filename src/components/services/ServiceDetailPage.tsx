import { useEffect } from 'react';
import { ArrowRight, Check, ChevronRight, CircleHelp, Sparkles } from 'lucide-react';
import { SERVICES } from '../../data/services';
import type { ServiceItem } from '../../types';
import { FAQSection } from '../sections/FAQSection';
import { ServiceCard } from './ServiceCard';
import { serviceIcons } from './serviceIcons';

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>}
    </div>
  );
}

function ServiceHero({ service }: { service: ServiceItem }) {
  const Icon = serviceIcons[service.iconName];
  const startHref = service.id === 'llc-formation' ? '/formation/start?source=service&service=llc-formation' : '/how-it-works';

  return (
    <section className="bg-[#fcf9f8] pb-20 pt-10 sm:pb-24 sm:pt-14" aria-labelledby="service-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-10 text-xs font-medium text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li><a href="/#home" className="hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">Home</a></li>
            <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
            <li><a href="/#services" className="hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">Services</a></li>
            <li><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></li>
            <li aria-current="page" className="font-semibold text-[#171717]">{service.title}</li>
          </ol>
        </nav>

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c52e0f]">Apex Filings Services</p>
            <h1 id="service-title" className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#171717] sm:text-5xl lg:text-[3.5rem]">{service.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">{service.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={startHref} className="polish-button polish-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F04623] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">Start My Business <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              <a href="#how-it-works" className="polish-button inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">How It Works</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="pointer-events-none absolute inset-[15%] rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#ece5e1] bg-white p-7 shadow-[0_25px_70px_-45px_rgba(23,23,23,0.36)] sm:p-9">
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Service overview</span><Sparkles className="h-4 w-4 text-orange-300" aria-hidden="true" /></div>
              <span className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-[#fff6f2] text-[#F04623]"><Icon className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" /></span>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#171717]">{service.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">A clear place to begin and understand your next steps.</p>
              <div className="mt-7 border-t border-slate-100 pt-6">
                <ul className="space-y-3">
                  {service.cardBenefits.map((benefit) => <li key={benefit} className="flex items-start gap-3 text-sm font-medium text-slate-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#F04623]"><Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" /></span>{benefit}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceBenefits({ service }: { service: ServiceItem }) {
  return (
    <section className="bg-white py-20 sm:py-24" aria-label={`About ${service.title}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
          <div><SectionHeading eyebrow="The essentials" title={service.overviewHeading} /><p className="-mt-4 max-w-xl text-base leading-8 text-slate-600">{service.overview}</p></div>
          <div className="rounded-3xl border border-[#eae4e1] bg-[#fffaf8] p-7 sm:p-9"><CircleHelp className="h-6 w-6 text-[#F04623]" strokeWidth={1.8} aria-hidden="true" /><h3 className="mt-5 text-xl font-bold text-[#171717]">Why You May Need It</h3><p className="mt-3 text-base leading-8 text-slate-600">{service.whyItMatters}</p></div>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {service.benefits.map((benefit, index) => <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-xs font-bold tracking-[0.16em] text-[#F04623]">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-5 text-lg font-bold text-[#171717]">{benefit.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{benefit.description}</p></article>)}
        </div>
      </div>
    </section>
  );
}

function ServiceIncluded({ service }: { service: ServiceItem }) {
  return (
    <section className="bg-[#fcf9f8] py-20 sm:py-24" aria-label="What is included">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:px-8">
        <SectionHeading eyebrow="Your service" title="What's Included" description="A practical view of the support and information covered as you get started." />
        <ul className="grid gap-3 sm:grid-cols-2">
          {service.included.map((item) => <li key={item} className="flex items-start gap-3 rounded-2xl border border-[#eae4e1] bg-white p-5 text-sm font-semibold leading-6 text-[#171717]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F04623]" strokeWidth={2.5} aria-hidden="true" />{item}</li>)}
        </ul>
      </div>
    </section>
  );
}

function ServiceProcess({ service }: { service: ServiceItem }) {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-20 sm:py-24" aria-label="How the service works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="A clearer path" title="How It Works" description="The steps below show the general flow. Details can vary based on your service and circumstances." />
        <ol className="relative grid gap-7 before:absolute before:bottom-4 before:left-[23px] before:top-5 before:w-px before:bg-orange-200 md:grid-cols-4 md:gap-5 md:before:bottom-auto md:before:left-[7%] md:before:right-[7%] md:before:top-6 md:before:h-px md:before:w-auto">
          {service.process.map((step, index) => <li key={step.title} className="relative flex gap-4 md:block"><span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-[#fff7f4] text-sm font-extrabold text-[#F04623]">{String(index + 1).padStart(2, '0')}</span><div className="pt-1 md:pt-6"><h3 className="text-base font-bold text-[#171717]">{step.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p></div></li>)}
        </ol>
      </div>
    </section>
  );
}

export function ServiceDetailPage({ service }: { service: ServiceItem }) {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = service.metaTitle;
    if (description) description.content = service.metaDescription;
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, [service]);

  const related = service.relatedIds.map((id) => SERVICES.find((item) => item.id === id)).filter((item): item is ServiceItem => Boolean(item));

  return (
    <div className="overflow-hidden bg-white">
      <ServiceHero service={service} />
      <ServiceBenefits service={service} />
      <ServiceIncluded service={service} />
      <ServiceProcess service={service} />
      <FAQSection items={service.faqs} eyebrow={`${service.title} questions`} heading="Frequently Asked Questions" description={`Answers to common questions about ${service.title.toLowerCase()}.`} />
      <section className="bg-[#fcf9f8] py-20 sm:py-24" aria-label="Related services"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><SectionHeading eyebrow="Keep moving forward" title="You May Also Need" description="Explore related services that can support your next step." /><div className="grid gap-5 md:grid-cols-3">{related.map((item) => <ServiceCard key={item.id} service={item} compact />)}</div></div></section>
      <section className="bg-[#171717] py-20 text-white sm:py-24" aria-label="Get started"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6"><div className="mx-auto mb-6 h-1 w-12 rounded-full bg-[#F04623]" aria-hidden="true" /><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to Get Started?</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-300">Take the first step toward starting and managing your business with Apex Filings.</p><a href={service.id === 'llc-formation' ? '/formation/start?source=service&service=llc-formation' : '/how-it-works'} className="polish-button polish-primary mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F04623] px-7 py-3 text-sm font-semibold text-white transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 hover:bg-[#e03e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 sm:w-auto">Start My Business <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></section>
    </div>
  );
}
