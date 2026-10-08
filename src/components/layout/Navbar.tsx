import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CircleUserRound, Globe2, Menu, X } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../data/navigation';
import { SERVICES } from '../../data/services';
import { BrandLogo } from '../ui/BrandLogo';

const linkClasses =
  'rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-orange-50 hover:text-[#F04623] aria-[current=page]:bg-orange-50 aria-[current=page]:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]';

export type Language = 'en' | 'es' | 'fr' | 'pt';

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

const navigationCopy = {
  en: { home: 'Home', services: 'Services', allServices: 'All services', pricing: 'Pricing', about: 'About', contact: 'Contact', portal: 'Client portal', serviceNames: ['LLC Formation', 'Registered Agent', 'EIN', 'Business Licenses', 'Annual Compliance', 'Business Documents'] },
  es: { home: 'Inicio', services: 'Servicios', allServices: 'Todos los servicios', pricing: 'Precios', about: 'Nosotros', contact: 'Contacto', portal: 'Portal del cliente', serviceNames: ['Formación de LLC', 'Agente registrado', 'EIN', 'Licencias comerciales', 'Cumplimiento anual', 'Documentos empresariales'] },
  fr: { home: 'Accueil', services: 'Services', allServices: 'Tous les services', pricing: 'Tarifs', about: 'À propos', contact: 'Contact', portal: 'Portail client', serviceNames: ["Création d’une LLC", 'Agent enregistré', 'EIN', 'Licences commerciales', 'Conformité annuelle', 'Documents commerciaux'] },
  pt: { home: 'Início', services: 'Serviços', allServices: 'Todos os serviços', pricing: 'Preços', about: 'Sobre', contact: 'Contato', portal: 'Portal do cliente', serviceNames: ['Abertura de LLC', 'Agente registrado', 'EIN', 'Licenças comerciais', 'Conformidade anual', 'Documentos empresariais'] },
};

interface NavbarProps {
  onOpenClientPortal: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export function Navbar({ onOpenClientPortal, language, onLanguageChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const copy = navigationCopy[language];
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  const changeLanguage = (code: Language) => {
    onLanguageChange(code);
    setLanguageOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setServicesOpen(false);
        setMobileMenuOpen(false);
        setLanguageOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setServicesOpen(false);
        setMobileMenuOpen(false);
        setLanguageOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const closeMenus = () => {
    setServicesOpen(false);
    setMobileMenuOpen(false);
    setLanguageOpen(false);
  };

  const serviceLinks = SERVICES.map((service, index) => (
    <a
      key={service.id}
      href={`/services/${service.id}`}
      onClick={closeMenus}
      className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-orange-50 hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]"
    >
      {copy.serviceNames[index]}
    </a>
  ));

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="/#home" onClick={closeMenus} className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]" aria-label="Apex Filings Home">
          <BrandLogo />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <a href={NAVIGATION_ITEMS[0].href} className={linkClasses}>{copy.home}</a>
          <div className="relative">
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-controls="desktop-services-menu"
              onClick={() => {
                setServicesOpen((open) => !open);
                setLanguageOpen(false);
              }}
              className={`${linkClasses} inline-flex items-center gap-1`}
            >
              {copy.services}
              <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {servicesOpen && (
              <div id="desktop-services-menu" className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <a href="/#services" onClick={closeMenus} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[#F04623] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]">
                  {copy.allServices}
                </a>
                <div className="my-1 border-t border-slate-100" />
                {serviceLinks}
              </div>
            )}
          </div>
          {NAVIGATION_ITEMS.slice(1).map((item) => (
            <a key={item.label} href={item.href} aria-current={currentPath === item.href ? 'page' : undefined} className={linkClasses}>{copy[item.label.toLowerCase() as 'pricing' | 'about' | 'contact']}</a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label={`Language: ${languages.find((item) => item.code === language)?.name}`}
              aria-expanded={languageOpen}
              aria-controls="language-menu"
              onClick={() => {
                setLanguageOpen((open) => !open);
                setServicesOpen(false);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] sm:px-3"
            >
              <Globe2 className="h-4 w-4 text-[#F04623]" aria-hidden="true" />
              <span>{language.toUpperCase()}</span>
              <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${languageOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {languageOpen && (
              <div id="language-menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Navigation language</p>
                {languages.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    lang={item.code}
                    onClick={() => changeLanguage(item.code)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-orange-50 hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]"
                  >
                    <span>{item.nativeName}</span>
                    {language === item.code && <Check className="h-4 w-4 text-[#F04623]" aria-hidden="true" />}
                  </button>
                ))}
                <p className="border-t border-slate-100 px-3 pt-2 text-[11px] leading-relaxed text-slate-500">Full-page translations are being prepared. The main content is currently in English.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Client portal — coming soon"
            title="Client portal — coming soon"
            onClick={() => {
              closeMenus();
              onOpenClientPortal();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623]"
          >
            <CircleUserRound className="h-5 w-5" aria-hidden="true" />
          </button>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => {
            setMobileMenuOpen((open) => !open);
            setServicesOpen(false);
            setLanguageOpen(false);
          }}
          className="rounded-lg p-2.5 text-slate-700 transition-colors hover:bg-orange-50 hover:text-[#F04623] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04623] lg:hidden"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            <a href={NAVIGATION_ITEMS[0].href} onClick={closeMenus} className={linkClasses}>{copy.home}</a>
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-controls="mobile-services-menu"
              onClick={() => setServicesOpen((open) => !open)}
              className={`${linkClasses} flex w-full items-center justify-between text-left`}
            >
              {copy.services}
              <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {servicesOpen && (
              <div id="mobile-services-menu" className="ml-3 border-l border-slate-200 pl-3">
                <a href="/#services" onClick={closeMenus} className={`${linkClasses} block`}>{copy.allServices}</a>
                {serviceLinks}
              </div>
            )}
            {NAVIGATION_ITEMS.slice(1).map((item) => (
              <a key={item.label} href={item.href} aria-current={currentPath === item.href ? 'page' : undefined} onClick={closeMenus} className={linkClasses}>{copy[item.label.toLowerCase() as 'pricing' | 'about' | 'contact']}</a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
