import { ArrowRight, Facebook, MapPin, MessageCircleQuestion, Music2 } from 'lucide-react';
import { ConsultationForm } from '../forms/ConsultationForm';
import { APEX_EXTERNAL_LINKS } from '../../data/navigation';
import './ContactSection.css';

const externalIcons = [MapPin, Facebook, Music2];

export function ContactSection({ asPage = false, consultation = false, ukLtd = false }: { asPage?: boolean; consultation?: boolean; ukLtd?: boolean }) {
  const Heading = asPage ? 'h1' : 'h2';
  const Subheading = asPage ? 'h2' : 'h3';
  return <section className="apex-contact-section relative py-16 sm:py-20 lg:py-24" id="contact" aria-labelledby="contact-title">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="apex-contact-intro mx-auto mb-9 max-w-3xl text-center sm:mb-11">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Free consultation</p>
        <Heading id="contact-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{asPage ? "Reach Out, We're Here to Help!" : 'Request a Free Consultation'}</Heading>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base">{ukLtd ? 'Ask about UK Ltd formation packages, pricing and the steps for your company.' : 'Tell us about your business and what you need help with. Our team will reply with clear next steps.'}</p>
      </div>

      <div className="apex-contact-panel mx-auto max-w-[1120px]">
        <div className="apex-contact-form-column">
          <Subheading className="mb-6 text-xl font-bold text-[#191F29] sm:text-2xl">Send us a message</Subheading>
          <ConsultationForm contactLayout />
        </div>

        <aside className="apex-contact-visual" aria-labelledby="talk-to-apex">
          <div className="apex-contact-art">
            <img src="/images/contact-support-character.png" alt="Apex Filings support illustration with a person at a laptop, message and email icons" width="1312" height="1199" loading="lazy" decoding="async" />
          </div>
          <div className="apex-contact-aside-copy">
            <Subheading id="talk-to-apex" className="text-lg font-bold text-[#191F29]">Talk to Apex Filings</Subheading>
            <p className="mt-2 text-sm leading-6 text-slate-600">{ukLtd ? 'Have questions about forming a UK company? Share your details and our team can explain the available options.' : 'Have questions about forming your US company? Share your details and the service you need. Our team can help you understand your next steps.'}</p>
            <a href="/#faq" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#bd3517] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]"><MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />Read common questions<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            {asPage && <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-orange-100 pt-3" aria-label="Location and social media">
              {APEX_EXTERNAL_LINKS.map((link, index) => {
                const Icon = externalIcons[index];
                return <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[#536078] hover:text-[#F04623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]"><Icon className="h-4 w-4" aria-hidden="true" />{link.label}</a>;
              })}
            </nav>}
          </div>
        </aside>
      </div>
      {!consultation && asPage && <p className="mx-auto mt-6 max-w-[1120px] text-xs leading-6 text-slate-300">Apex Filings is a business formation service and is not a law firm. We do not provide legal or tax advice.</p>}
    </div>
  </section>;
}
