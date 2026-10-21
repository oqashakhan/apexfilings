import {
  Accessibility, BookOpen, FileText, IdCard, Landmark, LockKeyhole,
  Mail, MapPin, Phone, ReceiptText, RotateCcw, Scale, ScrollText, Shield,
  ShieldCheck, Star, Tag, UsersRound,
} from 'lucide-react';
import { APEX_EXTERNAL_LINKS, FOOTER_LINKS } from '../../data/navigation';
import { LANGUAGES, type Language } from '../../i18n/languages';
import './Footer.css';

interface FooterProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  management?: boolean;
}

const serviceIcons = [FileText, IdCard, Shield, ReceiptText, Landmark];
const companyIcons = [UsersRound, Mail, Tag, BookOpen, Star];
const legalIcons = [LockKeyhole, RotateCcw, ScrollText, Scale, Accessibility];
const serviceLabels = ['US LLC Formation', 'EIN Application', 'Registered Agent Service', 'ITIN Application', 'US Bank Account Support'];
const companyLabels = ['About Apex Filings', 'Contact', 'Pricing', 'FAQ / Guides', 'Reviews'];
const legalLabels = ['Privacy Policy', 'Refund Policy', 'Terms of Service', 'Legal Disclaimer', 'Accessibility'];
const locationLink = APEX_EXTERNAL_LINKS.find((link) => link.label === 'Location');
const facebookLink = APEX_EXTERNAL_LINKS.find((link) => link.label === 'Facebook');
const tiktokLink = APEX_EXTERNAL_LINKS.find((link) => link.label === 'TikTok');
const officeLocations = [
  {
    city: 'Lahore, Pakistan',
    address: '2nd Floor, NE Plot No. 03, Block C, NFC Society, College Road, Lahore 54000, Pakistan.',
  },
  {
    city: 'Sheridan, Wyoming, USA',
    address: '30 N Gould St, #69370, Sheridan, WY 82801, USA.',
  },
  {
    city: 'Peshawar, Pakistan',
    address: 'Office No. 303, Block-B, City Tower, University Road, Peshawar',
  },
];

export function Footer({ language, onLanguageChange, management = false }: FooterProps) {
  return (
    <footer className="apex-footer border-t border-slate-200 bg-white text-[#191F29]">
      <div className="mx-auto max-w-[1320px] px-4 pb-7 pt-14 sm:px-8 sm:pt-16 lg:px-10">
        <div className="apex-footer-grid">
          <div>
            <a href="/#home" className="apex-footer-logo block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F04623]" aria-label="Apex Filings Home">
              <img className="theme-logo--light" src="/images/apex-logo-white-bg.png" alt="" width="500" height="500" loading="lazy" />
              <img className="theme-logo--dark" src="/images/apex-logo-dark-bg.png" alt="" width="500" height="500" loading="lazy" />
            </a>
            <p className="mt-4 max-w-[260px] text-[13px] leading-6 text-slate-600">
              Making US business formation simple, worldwide.
            </p>
            <div className="apex-footer-contact">
              <a className="apex-footer-contact-link" href="mailto:info@apexfilings.com"><Mail aria-hidden="true" size={16} /><span>info@apexfilings.com</span></a>
              <a className="apex-footer-contact-link" href="tel:+16822864111"><Phone aria-hidden="true" size={16} /><span>+1 (682) 286-4111</span></a>
            </div>
            <div className="apex-footer-presence">
              {locationLink && <a href={locationLink.href} target="_blank" rel="noopener noreferrer" className="apex-footer-location"><MapPin aria-hidden="true" size={16} /><span>Location</span></a>}
              <nav className="apex-footer-socials" aria-label="Apex Filings social media">
                {facebookLink && <a href={facebookLink.href} target="_blank" rel="noopener noreferrer" className="apex-footer-social-link" aria-label="Apex Filings on Facebook"><img src="/images/facebook-logo.png" alt="" width="22" height="22" loading="lazy" /></a>}
                {tiktokLink && <a href={tiktokLink.href} target="_blank" rel="noopener noreferrer" className="apex-footer-social-link" aria-label="Apex Filings on TikTok"><img src="/images/tiktok-logo.png" alt="" width="22" height="22" loading="lazy" /></a>}
              </nav>
            </div>
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
                    : link.href !== '#'
                    ? <a className="apex-footer-link" href={link.href}><Icon className="apex-footer-icon" aria-hidden="true" /><span>{legalLabels[index]}</span></a>
                    : <span className="apex-footer-unavailable"><Icon className="apex-footer-icon" aria-hidden="true" /><span>{legalLabels[index]}</span></span>}
                </li>;
              })}
            </ul>
          </div>
        </div>

        <section className="apex-footer-locations" aria-labelledby="apex-footer-locations-heading">
          <h2 id="apex-footer-locations-heading" className="apex-footer-heading">Our Locations</h2>
          <ul className="apex-footer-locations-grid">
            {officeLocations.map(({ city, address }) => (
              <li key={city} className="apex-footer-location-item">
                <MapPin className="apex-footer-location-icon" aria-hidden="true" size={17} strokeWidth={1.8} />
                <div>
                  <strong className="apex-footer-location-city">{city}</strong>
                  {address && <address className="apex-footer-location-address">{address}</address>}
                </div>
              </li>
            ))}
          </ul>
        </section>

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
          <label className="inline-flex items-center gap-2 text-sm" translate="no">
            <span>Language</span>
            <select aria-label="Website language" value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[#191F29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">
              {LANGUAGES.map((item) => <option key={item.code} value={item.code} lang={item.code}>{item.nativeName}</option>)}
            </select>
          </label>
        </div>
      </div>
    </footer>
  );
}
