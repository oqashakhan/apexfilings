import { FOOTER_LINKS } from '../../data/navigation';
import type { Language } from './Navbar';
import './Footer.css';

interface FooterProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  management?: boolean;
}

export function Footer({ language, onLanguageChange, management = false }: FooterProps) {
  return (
    <footer className="bg-[#171717] border-t border-neutral-800 pt-16 pb-12 text-xs text-neutral-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Summary */}
          <div className="col-span-2 space-y-4">
            <a href="/#home" className="apex-footer-logo block w-fit rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]" aria-label="Apex Filings Home">
              <img src="/images/apex-logo-dark-bg.png" alt="" width="500" height="500" />
            </a>

            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              Apex Filings provides comprehensive US LLC formation and business compliance services.
              Powering entrepreneurs worldwide to form their companies in the United States with
              clarity and zero administrative headaches.
            </p>

            <div className="pt-1 text-xs text-neutral-400">
              <a
                className="hover:text-white transition-colors underline underline-offset-4"
                href="https://apexfiling.com"
                target="_blank"
                rel="noreferrer"
              >
                apexfiling.com
              </a>
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Services
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.services.map((link, idx) => (
                <li key={`footer-srv-${idx}`}>
                  <a className="hover:text-white transition-colors" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Company
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.company.map((link, idx) => (
                <li key={`footer-cmp-${idx}`}>
                  <a className="hover:text-white transition-colors" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map((link, idx) => (
                <li key={`footer-leg-${idx}`}>
                  <a className="hover:text-white transition-colors" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer Paragraph */}
        <div className="border-t border-neutral-800 pt-8 text-[11px] text-neutral-500 leading-relaxed space-y-2">
          <p>{management ? 'Apex Filings is a business formation service and is not a law firm. We do not provide legal, tax or accounting advice.' : 'Apex Filings is a business formation service and is not a law firm. We do not provide legal or tax advice.'}</p>
          <p>
            <strong className="text-neutral-400">Disclaimer:</strong> Apex Filings is not a law firm
            and does not provide legal, tax, or investment advice. The materials and information
            provided on apexfiling.com, as well as shared through direct communication, are for informational purposes only
            and should not be taken as certified legal counsel. By accessing our services, you agree
            to our Terms of Service and Privacy Policy.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-neutral-800/80">
            <p>© 2026 Apex Filings. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-neutral-400">Navigation language:</span>
              {FOOTER_LINKS.languages.map((lang, idx) => (
                <button
                  key={`lang-${idx}`}
                  type="button"
                  onClick={() => onLanguageChange((['en', 'es', 'fr', 'pt'] as const)[idx])}
                  aria-pressed={language === (['en', 'es', 'fr', 'pt'] as const)[idx]}
                  className={`transition-colors cursor-pointer hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] ${language === (['en', 'es', 'fr', 'pt'] as const)[idx] ? 'text-white underline underline-offset-4' : 'text-neutral-400'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
