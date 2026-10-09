import { ArrowRight, Building2, IdCard, ShieldCheck, BadgeCheck, FileSignature, MessagesSquare, CalendarDays, FilePenLine, ClipboardCheck, UserRoundCog, Award, CircleX, type LucideIcon } from 'lucide-react';
import type { Language } from './Navbar';

type Labels = Record<Language, string>;
type ServiceLink = { labels: Labels; icon: LucideIcon; href?: string };
const groups: { titles: Labels; items: ServiceLink[] }[] = [
  {
    titles: { en: 'Business Formation', es: 'Formación empresarial', fr: 'Création d’entreprise', pt: 'Abertura de empresa' },
    items: [
      { labels: { en: 'LLC Formation', es: 'Formación de LLC', fr: 'Création de LLC', pt: 'Abertura de LLC' }, icon: Building2, href: '/services/llc-formation' },
      { labels: { en: 'EIN Application', es: 'Solicitud de EIN', fr: 'Demande d’EIN', pt: 'Solicitação de EIN' }, icon: IdCard, href: '/services/ein' },
      { labels: { en: 'Registered Agent Service', es: 'Agente registrado', fr: 'Agent enregistré', pt: 'Agente registrado' }, icon: ShieldCheck, href: '/services/registered-agent' },
      { labels: { en: 'Business Licenses & Permits', es: 'Licencias y permisos', fr: 'Licences et permis', pt: 'Licenças e permissões' }, icon: BadgeCheck, href: '/services/business-licenses' },
      { labels: { en: 'Operating Agreement', es: 'Acuerdo operativo', fr: 'Accord d’exploitation', pt: 'Acordo operacional' }, icon: FileSignature },
      { labels: { en: 'Business Formation Consultation', es: 'Consulta de formación', fr: 'Conseil en création', pt: 'Consultoria de abertura' }, icon: MessagesSquare },
    ],
  },
  {
    titles: { en: 'Business Management', es: 'Gestión empresarial', fr: 'Gestion d’entreprise', pt: 'Gestão empresarial' },
    items: [
      { labels: { en: 'Annual Report Filing', es: 'Presentación del informe anual', fr: 'Dépôt du rapport annuel', pt: 'Entrega do relatório anual' }, icon: CalendarDays },
      { labels: { en: 'Business Amendments', es: 'Modificaciones empresariales', fr: 'Modifications d’entreprise', pt: 'Alterações empresariais' }, icon: FilePenLine },
      { labels: { en: 'Compliance Management', es: 'Gestión de cumplimiento', fr: 'Gestion de conformité', pt: 'Gestão de conformidade' }, icon: ClipboardCheck, href: '/services/annual-compliance' },
      { labels: { en: 'Change Registered Agent', es: 'Cambiar agente registrado', fr: 'Changer d’agent enregistré', pt: 'Alterar agente registrado' }, icon: UserRoundCog, href: '/services/registered-agent' },
      { labels: { en: 'Certificate of Good Standing', es: 'Certificado de vigencia', fr: 'Certificat de conformité', pt: 'Certificado de regularidade' }, icon: Award },
      { labels: { en: 'Dissolve Your Company', es: 'Disolver su empresa', fr: 'Dissoudre votre entreprise', pt: 'Dissolver sua empresa' }, icon: CircleX },
    ],
  },
];

const copy = {
  en: { soon: 'Coming Soon', all: 'Explore all services', start: 'Start Your Business' },
  es: { soon: 'Próximamente', all: 'Ver todos los servicios', start: 'Inicie su empresa' },
  fr: { soon: 'Bientôt', all: 'Tous les services', start: 'Créer votre entreprise' },
  pt: { soon: 'Em breve', all: 'Ver todos os serviços', start: 'Abra sua empresa' },
};

export function ServicesMegaMenu({ language, onNavigate, mobile = false }: { language: Language; onNavigate: () => void; mobile?: boolean }) {
  const text = copy[language];
  return (
    <div className={mobile ? 'apex-services-mobile' : 'apex-services-panel'}>
      <div className="apex-services-columns">
        {groups.map((group, index) => (
          <section className="apex-services-column" key={group.titles.en} aria-labelledby={`${mobile ? 'mobile' : 'desktop'}-service-group-${index}`}>
            <h2 id={`${mobile ? 'mobile' : 'desktop'}-service-group-${index}`} className="apex-services-heading">{group.titles[language]}</h2>
            <ul className="apex-services-list">
              {group.items.map(({ labels, icon: Icon, href }) => (
                <li key={labels.en}>
                  {href ? (
                    <a href={href} onClick={onNavigate} className="apex-service-item">
                      <span className="apex-service-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                      <span>{labels[language]}</span>
                      <ArrowRight className="apex-service-arrow" size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="apex-service-item apex-service-item--disabled" aria-disabled="true">
                      <span className="apex-service-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                      <span className="apex-service-label">{labels[language]}<span className="apex-service-soon">{text.soon}</span></span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="apex-services-footer">
        <a href="/#services" onClick={onNavigate} className="apex-services-all">{text.all}</a>
        <a href="/how-it-works" onClick={onNavigate} className="apex-services-start polish-button polish-primary">{text.start}<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </div>
  );
}
