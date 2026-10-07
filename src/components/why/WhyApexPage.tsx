import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight, Bell, Building2, CalendarCheck, Check, CheckCircle2,
  ClipboardList, FileCheck2, FileText, FolderLock, Globe2, HelpCircle,
  LayoutDashboard, LockKeyhole, MessageCircle, SearchCheck, ShieldCheck,
  Sparkles, UsersRound,
} from 'lucide-react';
import { SERVICES } from '../../data/services';
import { FAQSection } from '../sections/FAQSection';
import type { FAQItem } from '../../types';

const values = [
  { title: 'Simple Process', copy: 'Clear guidance from start to finish.', icon: ClipboardList },
  { title: 'Transparent Experience', copy: "Understand what you're selecting before moving forward.", icon: SearchCheck },
  { title: 'Secure & Reliable', copy: 'Business information and documents handled responsibly.', icon: ShieldCheck },
  { title: 'Built for Global Founders', copy: 'Start your US business from wherever you are.', icon: Globe2 },
];

const features = [
  { number: '01', title: 'Simple LLC Formation', copy: 'A guided process that makes forming your business easier to understand.', icon: Building2, span: 'lg:col-span-2', tone: 'bg-[#fff8f5]' },
  { number: '02', title: 'Clear Process', copy: "Know what step you're on and what comes next.", icon: ClipboardList, span: '', tone: 'bg-white' },
  { number: '03', title: 'Business Services in One Place', copy: 'Access formation and supporting business services through one platform.', icon: LayoutDashboard, span: '', tone: 'bg-white' },
  { number: '04', title: 'Online Application Tracking', copy: 'A planned account view will help you follow application progress without unnecessary back-and-forth.', icon: SearchCheck, span: 'lg:col-span-2', tone: 'bg-white' },
  { number: '05', title: 'Document Access', copy: 'The planned account will bring important business documents together in one place.', icon: FolderLock, span: 'lg:col-span-2', tone: 'bg-white' },
  { number: '06', title: 'Support When You Need It', copy: 'Get help when you have questions during the process.', icon: MessageCircle, span: '', tone: 'bg-[#fff8f5]' },
];

const process = [
  { title: 'Choose Your Service', copy: "Select the business service that fits what you're trying to accomplish." },
  { title: 'Tell Us About Your Business', copy: 'Provide the basic information needed to begin.' },
  { title: 'Track Your Progress', copy: 'Follow your application and stay informed as it moves forward.' },
  { title: 'Manage Everything Online', copy: 'Access your information and business documents through your Apex Filings account.' },
];

const serviceIcons = {
  Building2, ShieldCheck, FileText, FileCheck2, CalendarCheck, FolderLock,
};

const comparison = [
  ['Multiple disconnected steps', 'A guided online process'],
  ['Unclear progress', 'Planned application tracking'],
  ['Documents spread across emails', 'Planned organized document access'],
  ['Hard to know what happens next', 'Clear next steps'],
];

const whyFaqs: FAQItem[] = [
  { id: 'why-help', question: 'What does Apex Filings help with?', answer: 'Apex Filings offers LLC formation and supporting services including registered agent service, EIN assistance, business licenses, annual compliance, and business documents.' },
  { id: 'why-online', question: 'Can I start the process online?', answer: 'Yes. You can begin by selecting a service and providing the basic information needed for your application online.' },
  { id: 'why-global', question: 'Can international founders use Apex Filings?', answer: 'The process is designed for founders in and outside the US. The information and requirements for a service can vary with your circumstances and the state you choose.' },
  { id: 'why-track', question: 'How can I track my application?', answer: 'The planned client account will show application updates and next steps in one place. Your team can also help with questions as the service progresses.' },
  { id: 'why-docs', question: 'Where will I access my business documents?', answer: 'The planned client account is designed to organize your important business documents so they are easier to find when needed.' },
  { id: 'why-next', question: 'What happens after I start my application?', answer: 'You will provide the details needed for the selected service. Apex Filings will guide you through the next steps and communicate updates as your application moves forward.' },
];

function SectionIntro({ eyebrow, title, copy, center = false }: { eyebrow: string; title: string; copy?: string; center?: boolean }) {
  return (
    <div className={`mb-10 sm:mb-12 ${center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">{title}</h2>
      {copy && <p className="mt-4 text-base leading-7 text-slate-600">{copy}</p>}
    </div>
  );
}

function StartLink({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <a href="/start" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2 ${dark ? 'bg-white text-[#171717] hover:bg-orange-50' : 'bg-[#F04623] text-white shadow-md shadow-orange-500/20 hover:bg-[#e03e1b]'} ${className}`}>
      Start My Business <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export function WhyApexPage() {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion ? undefined : { opacity: 0, y: 18 };
  const visible = { opacity: 1, y: 0 };

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'Why Apex Filings | A Simpler Way to Start Your US Business';
    if (description) description.content = 'See how Apex Filings makes US business formation clearer with guided steps, supporting services, and an organized experience for founders.';
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative bg-white py-14 sm:py-18 lg:py-20" aria-labelledby="why-page-title">
        <div className="mx-auto grid max-w-7xl items-center gap-9 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-8">
          <motion.div initial={enter} animate={visible} transition={{ duration: 0.55 }}>
            <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c52e0f]">Why Apex Filings</p>
            <h1 id="why-page-title" className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#171717] sm:text-5xl lg:text-[3.4rem]">
              Starting a Business <span className="text-[#F04623]">Shouldn't Feel Complicated.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">Apex Filings simplifies the process of starting and managing your US business, giving you a clear path from formation to ongoing business needs.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <StartLink />
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#171717] transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] focus-visible:ring-offset-2">See How It Works <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 sm:text-sm">
              {['A guided start', 'Clear next steps', 'Support along the way'].map((point) => <span key={point} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#F04623]" aria-hidden="true" />{point}</span>)}
            </div>
          </motion.div>
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.08 }} className="relative mx-auto w-full max-w-2xl">
            <div className="pointer-events-none absolute inset-[16%] -z-10 rounded-full bg-orange-100/70 blur-3xl" aria-hidden="true" />
            <img src="/images/why-apex-filings.webp" alt="Illustration of a founder using the Apex Filings platform, surrounded by business-service and global-access visuals" width="1536" height="1024" fetchPriority="high" decoding="async" className="block h-auto w-full" />
          </motion.div>
        </div>
      </section>

      <section className="bg-white pb-16 sm:pb-20" aria-label="Why the experience feels easier">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-3xl border border-[#eae4e1] bg-[#fffdfc] shadow-[0_18px_45px_-35px_rgba(23,23,23,0.35)] sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ title, copy, icon: Icon }, index) => <div key={title} className={`p-6 sm:p-7 ${index > 0 ? 'lg:border-l lg:border-[#eee8e5]' : ''}`}>
              <Icon className="h-5 w-5 text-[#F04623]" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="mt-4 text-sm font-bold text-[#171717]">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#fcf9f8] py-20 sm:py-24" aria-labelledby="features-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl sm:mb-12"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Why choose us</p><h2 id="features-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">Everything You Need to Move Forward With Confidence</h2><p className="mt-4 text-base leading-7 text-slate-600">Apex Filings brings formation, supporting services, application updates, and important information into one simpler experience.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ number, title, copy, icon: Icon, span, tone }) => <motion.article key={number} initial={enter} whileInView={visible} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.45 }} className={`group min-h-52 rounded-3xl border border-[#eae4e1] p-7 shadow-[0_12px_35px_-30px_rgba(23,23,23,0.3)] sm:p-8 ${span} ${tone}`}>
              <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-[#F04623]"><Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /></div><span className="text-xs font-bold tracking-widest text-orange-400">{number}</span></div>
              <h3 className="mt-7 text-xl font-bold tracking-tight text-[#171717]">{title}</h3><p className="mt-2 max-w-lg text-sm leading-7 text-slate-600">{copy}</p>
            </motion.article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-white py-20 sm:py-24" aria-labelledby="process-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl sm:mb-12"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">A clearer path</p><h2 id="process-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">From Idea to Business, Without the Confusion</h2></div>
          <ol className="relative grid gap-8 before:absolute before:bottom-5 before:left-[23px] before:top-5 before:w-px before:bg-orange-200 md:grid-cols-4 md:gap-6 md:before:bottom-auto md:before:left-[7%] md:before:right-[7%] md:before:top-6 md:before:h-px md:before:w-auto">
            {process.map((step, index) => <li key={step.title} className="relative flex gap-5 md:block">
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-[#fff7f4] text-sm font-extrabold text-[#F04623]">{String(index + 1).padStart(2, '0')}</span>
              <div className="pt-1 md:pt-6"><h3 className="text-base font-bold text-[#171717]">{step.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{step.copy}</p></div>
            </li>)}
          </ol>
        </div>
      </section>

      <section className="bg-[#f8f8f7] py-20 sm:py-24" aria-labelledby="platform-title">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Your business, organized</p><h2 id="platform-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">One Place to Keep Your Business Moving</h2><p className="mt-5 text-base leading-8 text-slate-600">Your Apex Filings account is designed to give you a clear view of your business formation journey, important documents, application updates and services.</p><p className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"><Sparkles className="h-3.5 w-3.5 text-[#F04623]" aria-hidden="true" />Illustrative preview of planned account features</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_25px_70px_-45px_rgba(23,23,23,0.4)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#F04623]"><LayoutDashboard className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-sm font-bold text-[#171717]">Business overview</p><p className="text-xs text-slate-500">Account concept</p></div></div><span className="rounded-full bg-[#fff2ed] px-2.5 py-1 text-[11px] font-semibold text-[#c52e0f]">Preview</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Application Status', copy: 'See where things stand', icon: ClipboardList },
                { title: 'Business Information', copy: 'Keep details together', icon: Building2 },
                { title: 'Documents', copy: 'Find important files', icon: FolderLock },
                { title: 'Notifications', copy: 'Stay informed', icon: Bell },
              ].map(({ title, copy, icon: Icon }) => <div key={title} className="rounded-2xl border border-slate-100 bg-[#fcfbfa] p-4"><Icon className="h-5 w-5 text-[#F04623]" aria-hidden="true" /><h3 className="mt-3 text-sm font-bold text-[#171717]">{title}</h3><p className="mt-1 text-xs text-slate-500">{copy}</p></div>)}
              <div className="rounded-2xl border border-slate-100 bg-[#fcfbfa] p-4 sm:col-span-2"><div className="flex items-center gap-3"><HelpCircle className="h-5 w-5 text-[#F04623]" aria-hidden="true" /><div><h3 className="text-sm font-bold text-[#171717]">Services</h3><p className="mt-1 text-xs text-slate-500">See the services connected to your business</p></div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8f5] py-20 sm:py-24" aria-labelledby="global-title">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.75fr] lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Built for global founders</p><h2 id="global-title" className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">Your Location Shouldn't Limit Your Business.</h2><p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">Apex Filings is designed to make starting a US business easier to understand for entrepreneurs wherever they are.</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{['100% Online Experience', 'Clear Step-by-Step Process', 'Access From Anywhere'].map((benefit) => <div key={benefit} className="flex items-center gap-2 text-sm font-semibold text-[#171717]"><Check className="h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{benefit}</div>)}</div><StartLink className="mt-8 w-full sm:w-auto" /></div>
          <div className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center rounded-full border border-orange-200 bg-white/65"><div className="absolute inset-7 rounded-full border border-orange-100" /><div className="absolute inset-16 rounded-full border border-orange-100" /><Globe2 className="h-36 w-36 text-[#F04623] sm:h-44 sm:w-44" strokeWidth={0.8} aria-hidden="true" /><span className="absolute left-1 top-1/4 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white text-[#F04623] shadow-sm"><UsersRound className="h-5 w-5" aria-hidden="true" /></span><span className="absolute bottom-4 right-6 flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-white text-[#F04623] shadow-sm"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span></div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24" aria-labelledby="services-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-10 max-w-3xl sm:mb-12"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F04623]">Services to support your next step</p><h2 id="services-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#171717] sm:text-4xl">More Than LLC Formation</h2><p className="mt-4 text-base leading-7 text-slate-600">Find the core services you need to start and keep your business organized.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SERVICES.map((service) => { const Icon = serviceIcons[service.iconName as keyof typeof serviceIcons] ?? Building2; return <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-6 transition-[border-color,box-shadow] hover:border-orange-200 hover:shadow-[0_15px_35px_-25px_rgba(23,23,23,0.3)]"><Icon className="h-6 w-6 text-[#F04623]" strokeWidth={1.8} aria-hidden="true" /><h3 className="mt-5 text-base font-bold text-[#171717]">{service.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{service.description}</p><a href={`/services/${service.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#F04623] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">Learn More <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></article>; })}</div></div>
      </section>

      <section className="bg-[#fcf9f8] py-20 sm:py-24" aria-labelledby="comparison-title">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><SectionIntro eyebrow="A simpler experience" title="Why Founders Choose a Simpler Way" copy="Moving forward should feel organized, with useful information at each step." center /><div className="overflow-hidden rounded-3xl border border-[#eae4e1] bg-white shadow-[0_18px_45px_-35px_rgba(23,23,23,0.3)]"><div className="grid grid-cols-2 border-b border-slate-100 bg-[#fffaf8] text-sm font-bold text-[#171717]"><div className="p-5 sm:px-8">Traditional Process</div><div className="border-l border-slate-100 p-5 text-[#c52e0f] sm:px-8">Apex Filings Experience</div></div>{comparison.map(([traditional, apex]) => <div key={traditional} className="grid grid-cols-2 border-b border-slate-100 last:border-b-0"><p className="p-5 text-sm leading-6 text-slate-600 sm:px-8">{traditional}</p><p className="flex gap-2 border-l border-slate-100 p-5 text-sm font-semibold leading-6 text-[#171717] sm:px-8"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F04623]" aria-hidden="true" />{apex}</p></div>)}</div></div>
      </section>

      <FAQSection items={whyFaqs} eyebrow="Choosing Apex Filings" heading="Questions About Working With Us" description="A few helpful answers before you start." />

      <section className="bg-[#171717] py-20 text-white sm:py-24" aria-labelledby="why-final-cta"><div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8"><div className="mx-auto mb-6 h-1 w-12 rounded-full bg-[#F04623]" aria-hidden="true" /><h2 id="why-final-cta" className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Ready to Turn Your Business Idea Into Something Real?</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-300">Start your business formation journey with a simple process built to keep you informed from the beginning.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><StartLink dark /><a href="/#services" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[#F04623] hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">Explore Services</a></div></div></section>
    </div>
  );
}
