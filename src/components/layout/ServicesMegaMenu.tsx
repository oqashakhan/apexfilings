import { useState } from 'react';
import {
  ArrowRight, Award, BadgeCheck, Building2, CalendarDays,
  ChevronDown, CircleX, FilePenLine, FileSignature,
  IdCard, Landmark, Mail, MessagesSquare, ReceiptText, RotateCcw,
  ScanLine, ShieldCheck, ShoppingBag, UserRoundCog,
  type LucideIcon,
} from 'lucide-react';
import type { Language } from '../../i18n/languages';

type ServiceLink = { label: string; icon: LucideIcon; href?: string };
type ServiceCategory = { id: string; title: string; items: ServiceLink[] };

const categories: ServiceCategory[] = [
  {
    id: 'formation', title: 'Business Formation', items: [
        { label: 'LLC Formation', icon: Building2, href: '/services/llc-formation' },
        { label: 'EIN Application', icon: IdCard, href: '/services/ein' },
        { label: 'Registered Agent Service', icon: ShieldCheck, href: '/services/registered-agent' },
        { label: 'US Address & Mail Forwarding', icon: Mail, href: '/services/mail-forwarding' },
        { label: 'US Business Bank Account Support', icon: Landmark, href: '/services/business-banking' },
        { label: 'Operating Agreement', icon: FileSignature, href: '/services/operating-agreement' },
        { label: 'Business Licenses & Permits', icon: BadgeCheck, href: '/services/business-licenses' },
        { label: 'ITIN Application', icon: ScanLine, href: '/services/itin' },
        { label: 'Trademark Registration', icon: Award, href: '/services/trademark' },
        { label: 'Business Formation Consultation', icon: MessagesSquare, href: '/services/consultation' },
        { label: 'UK Ltd', icon: Building2, href: '/services/uk-ltd-formation' },
    ],
  },
  {
    id: 'management', title: 'Business Management', items: [
        { label: 'Annual Report Filing', icon: CalendarDays, href: '/services/annual-report' },
        { label: 'Tax Filing for Foreign-Owned LLCs (Form 5472 + pro forma Form 1120)', icon: ReceiptText },
        { label: 'LLC Amendments', icon: FilePenLine },
        { label: 'Change Registered Agent', icon: UserRoundCog },
        { label: 'Certificate of Good Standing', icon: Award },
        { label: 'Reinstatement', icon: RotateCcw },
        { label: 'Resale Certificate', icon: ShoppingBag, href: '/services/resale-certificate' },
        { label: 'LLC Dissolution', icon: CircleX, href: '/services/dissolve-llc' },
    ],
  },
];

const copy = {
  en: { all: 'Explore all services', start: 'Start Your Business' },
  es: { all: 'Ver todos los servicios', start: 'Inicie su empresa' },
  fr: { all: 'Tous les services', start: 'Créer votre entreprise' },
  pt: { all: 'Ver todos os serviços', start: 'Abra sua empresa' },
};

function ServiceItems({ items, onNavigate }: { items: ServiceLink[]; onNavigate: () => void }) {
  return (
    <ul className="apex-services-list">
      {items.map(({ label, icon: Icon, href }) => (
        <li key={label}>
          {href ? (
            <a href={href} onClick={onNavigate} className="apex-service-item">
              <span className="apex-service-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="apex-service-label">{label}</span>
              <ArrowRight className="apex-service-arrow" size={14} aria-hidden="true" />
            </a>
          ) : (
            <span className="apex-service-item apex-service-item--disabled" aria-disabled="true">
              <span className="apex-service-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="apex-service-label">{label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ServicesMegaMenu({ language, onNavigate, mobile = false }: { language: Language; onNavigate: () => void; mobile?: boolean }) {
  const text = copy.en;
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div className={mobile ? 'apex-services-mobile' : 'apex-services-panel'}>
      {mobile ? (
        <div className="apex-services-mobile-categories">
          {categories.map((category) => (
            <section className="apex-services-mobile-category" key={category.id}>
              <button type="button" className="apex-services-accordion-button" aria-expanded={openCategory === category.id} aria-controls={`mobile-${category.id}`} onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}>
                {category.title}<ChevronDown size={17} aria-hidden="true" />
              </button>
              <div id={`mobile-${category.id}`} className="apex-services-accordion-content" data-open={openCategory === category.id} aria-hidden={openCategory !== category.id} inert={openCategory !== category.id}>
                <div className="apex-services-accordion-inner apex-services-mobile-items"><ServiceItems items={category.items} onNavigate={onNavigate} /></div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="apex-services-columns">
          {categories.map((category) => (
            <section className="apex-services-column" key={category.id} aria-labelledby={`desktop-${category.id}`}>
              <h2 id={`desktop-${category.id}`} className="apex-services-heading"><span>{category.title}</span></h2>
              <div className={category.id === 'formation' ? 'apex-formation-items' : ''}>
                <ServiceItems items={category.items} onNavigate={onNavigate} />
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="apex-services-footer">
        <a href="/#services" onClick={onNavigate} className="apex-services-all">{text.all}</a>
        <a href="/how-it-works" onClick={onNavigate} className="apex-services-start polish-button polish-primary">{text.start}<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </div>
  );
}
