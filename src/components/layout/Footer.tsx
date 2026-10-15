import {
  Accessibility, BookOpen, FileText, IdCard, Landmark, LockKeyhole,
  Mail, ReceiptText, RotateCcw, Scale, ScrollText, Shield,
  ShieldCheck, Star, Tag, UsersRound,
} from 'lucide-react';
import { FOOTER_LINKS } from '../../data/navigation';
import type { Language } from './Navbar';
import './Footer.css';

interface FooterProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  management?: boolean;
}

const footerLanguages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];
const serviceIcons = [FileText, IdCard, Shield, ReceiptText, Landmark];
const companyIcons = [UsersRound, Mail, Tag, BookOpen, Star];
const legalIcons = [LockKeyhole, RotateCcw, ScrollText, Scale, Accessibility];
const serviceLabels = ['US LLC Formation', 'EIN Application', 'Registered Agent Service', 'ITIN Application', 'US Bank Account Support'];
const companyLabels = ['About Apex Filings', 'Contact', 'Pricing', 'FAQ / Guides', 'Reviews'];
const legalLabels = ['Privacy Policy', 'Refund Policy', 'Terms & Conditions', 'Legal Disclaimer', 'Accessibility'];

export function Footer({ language, onLanguageChange, management = false }: FooterProps) {
  return (
    <footer className="apex-footer border-t border-slate-200 bg-white text-[#191F29]">
      <div className="mx-auto max-w-[1320px] px-4 pb-7 pt-14 sm:px-8 sm:pt-16 lg:px-10">
        <div className="apex-footer-grid">
          <div>
            <a href="/#home" className="apex-footer-logo block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]" aria-label="Apex Filings Home">
              <img src="/images/apex-logo-white-bg.png" alt="" width="500" height="500" loading="lazy" />
            </a>
            <p className="mt-4 max-w-[260px] text-[13px] leading-6 text-slate-600">
              Apex Filings provides comprehensive US LLC formation and business compliance services.
              Powering entrepreneurs worldwide to form their companies in the United States with
              clarity and zero administrative headaches.
            </p>
          </div>

          <div>
            <h2 className="apex-footer-heading">Services</h2>
            <ul className="apex-footer-links">
              {FOOTER_LINKS.services.map((link, index) => {
                const Icon = serviceIcons[index];
                return <li key={link.label}><a className="apex-footer-link" href={link.href}><Icon className="apex-footer-icon" aria-hidden="true" /><span>{serviceLabels[index]}</span></a></li>;
              })}
            </ul>
          </div>

          <div>
            <h2 className="apex-footer-heading">Company</h2>
            <ul className="apex-footer-links">
              {FOOTER_LINKS.company.map((link, index) => {
                const Icon = companyIcons[index];
                return <li key={link.label}><a className="apex-footer-link" href={link.href}><Icon className="apex-footer-icon" aria-hidden="true" /><span>{companyLabels[index]}</span></a></li>;
              })}
            </ul>
          </div>

          <div>
            <h2 className="apex-footer-heading">Legal</h2>
            <ul className="apex-footer-links">
              {FOOTER_LINKS.legal.map((link, index) => {
                const Icon = legalIcons[index];
                return <li key={link.label}>
                  {link.label === 'Legal Disclaimer'
                    ? <a className="apex-footer-link" href="#footer-disclaimer"><Icon className="apex-footer-icon" aria-hidden="true" /><span>{legalLabels[index]}</span></a>
                    : <span className="apex-footer-unavailable"><Icon className="apex-footer-icon" aria-hidden="true" /><span>{legalLabels[index]}</span></span>}
                </li>;
              })}
            </ul>
          </div>
        </div>

        <div id="footer-disclaimer" className="mt-10 scroll-mt-24 border-t border-slate-200 pt-7 sm:mt-12">
          <div className="apex-footer-disclaimer-content flex items-start gap-5 sm:gap-7">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFF3EF] text-[#F04623] sm:h-16 sm:w-16" aria-hidden="true">
              <ShieldCheck className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 text-sm leading-7 text-slate-500">
              <p><strong className="text-base font-bold text-[#191F29]">Apex Filings is a business formation service and is not a law firm.</strong>{management ? ' We do not provide legal, tax or accounting advice.' : ' We do not provide legal or tax advice.'}</p>
              <p className="mt-1">
                <strong className="font-semibold">Disclaimer:</strong> Apex Filings is not a law firm
                and does not provide legal, tax, or investment advice. The materials and information
                provided by Apex Filings, as well as shared through direct communication, are for informational purposes only
                and should not be taken as certified legal counsel. By accessing our services, you agree
                to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Apex Filings. All rights reserved.</p>
          <div className="apex-footer-languages" role="group" aria-label="Navigation language">
            {footerLanguages.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                lang={code}
                onClick={() => onLanguageChange(code)}
                aria-pressed={language === code}
                className="apex-footer-language"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
