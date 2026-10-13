import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { ContactSection } from '../sections/ContactSection';

export function ContactPage({ consultation = false }: { consultation?: boolean }) {
  useEffect(() => {
    const title = 'Contact Apex Filings | Free US LLC Consultation';
    const description = 'Request a free consultation for your US LLC. Tell us about your business and an Apex Filings specialist will reply with clear next steps.';
    const previousTitle = document.title;
    const metas = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]'];
    const previous = metas.map((selector) => document.querySelector<HTMLMetaElement>(selector)?.content);
    document.title = title;
    metas.forEach((selector, index) => {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta) meta.content = index === 0 || index === 2 || index === 4 ? description : title;
    });
    return () => {
      document.title = previousTitle;
      metas.forEach((selector, index) => {
        const meta = document.querySelector<HTMLMetaElement>(selector);
        if (meta && previous[index]) meta.content = previous[index];
      });
    };
  }, []);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://apexfiling.com/#organization', name: 'Apex Filings', url: 'https://apexfiling.com/' },
      { '@type': 'ContactPage', '@id': `https://apexfiling.com/${consultation ? 'consultation' : 'contact'}#webpage`, name: 'Contact Apex Filings', url: `https://apexfiling.com/${consultation ? 'consultation' : 'contact'}`, description: 'Request a free consultation for your US LLC.', about: { '@id': 'https://apexfiling.com/#organization' } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <ContactSection asPage consultation={consultation} />
      <div className="bg-white px-4 py-12 text-center">
        <p className="text-lg font-bold text-[#171717]">Still exploring your options?</p>
        <p className="mt-2 text-sm text-slate-600">Compare our formation packages and what each includes.</p>
        <a href="/pricing" className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#c52e0f] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F04623]">View pricing <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </>
  );
}
