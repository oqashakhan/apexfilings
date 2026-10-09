import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { ContactSection } from '../sections/ContactSection';

export function ContactPage({ consultation = false }: { consultation?: boolean }) {
  useEffect(() => {
    document.title = consultation ? 'Request a Free Consultation | Apex Filings' : 'Contact Our Team | Apex Filings';
    return () => { document.title = 'US LLC Formation for Non-Residents | Apex Filings'; };
  }, [consultation]);

  return (
    <>
      <ContactSection asPage consultation={consultation} />
      <div className="bg-white px-4 py-12 text-center">
        <p className="text-lg font-bold text-[#171717]">Still exploring your options?</p>
        <p className="mt-2 text-sm text-slate-600">Compare our formation packages and what each includes.</p>
        <a href="/pricing" className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#c52e0f] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">View pricing <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </>
  );
}
