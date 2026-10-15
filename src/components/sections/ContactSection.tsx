import { ArrowRight, MessageCircleQuestion } from 'lucide-react';
import { ConsultationForm } from '../forms/ConsultationForm';

export function ContactSection({ asPage = false, consultation = false, ukLtd = false }: { asPage?: boolean; consultation?: boolean; ukLtd?: boolean }) {
  const Heading = asPage ? 'h1' : 'h2';
  return <section className="relative bg-[#fcf9f8] py-16 sm:py-20 lg:py-24" id="contact" aria-labelledby="contact-title">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F04623]">Free consultation</p>
        <Heading id="contact-title" className="mt-3 text-3xl font-extrabold tracking-tight text-[#171717] sm:text-4xl lg:text-5xl">Request a Free Consultation</Heading>
        <p className="mt-4 text-base leading-8 text-slate-600">{ukLtd ? 'Ask about UK Ltd formation packages, pricing and the steps for your company.' : 'Tell us about your business and what you need help with. A specialist will reply with clear next steps for your US company.'}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:gap-8">
        <div className="clay-card-soft rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_24px_70px_-44px_rgba(23,23,23,0.28)] backdrop-blur-sm sm:p-8 lg:p-10">
          <ConsultationForm />
        </div>
        <aside className="space-y-5" aria-labelledby="talk-to-apex">
          <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_24px_70px_-44px_rgba(23,23,23,0.28)]">
            <div className="flex h-60 items-center justify-center bg-[radial-gradient(circle_at_50%_70%,#FFF1E7_0%,#FFF9F5_58%,#F8FAFC_100%)] sm:h-72 lg:h-64">
              <img src="/images/contact-support-character.png" alt="Illustration of a person using a laptop with message and email icons" width="1312" height="1199" loading="lazy" decoding="async" className="h-full w-full object-contain object-bottom" />
            </div>
            <div className="p-6 sm:p-7">
              <h2 id="talk-to-apex" className="text-xl font-bold text-[#171717]">Talk to Apex Filings</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{ukLtd ? 'Have questions about forming a UK company? Share your details and our team can explain the available options.' : 'Have questions about forming your US company? Share your details and the service you need. Our team can help you understand your next steps.'}</p>
              <a href="/#faq" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#bd3517] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />Read common questions<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
          {!consultation && asPage && <p className="px-2 text-xs leading-6 text-slate-500">Apex Filings is a business formation service and is not a law firm. We do not provide legal or tax advice.</p>}
        </aside>
      </div>
    </div>
  </section>;
}
