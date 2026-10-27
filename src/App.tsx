import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './marketing-polish.css';
import './clay-system.css';
import { usePageScrollReveals } from './hooks/usePageScrollReveals';
import { Navbar } from './components/layout/Navbar';
import { isLanguage, type Language } from './i18n/languages';
import { useSiteTranslation } from './i18n/useSiteTranslation';
import './i18n/translation.css';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/sections/HeroSection';
import { TrustMetrics } from './components/sections/TrustMetrics';
import { WhyApexSection } from './components/sections/WhyApexSection';
import { ServicesSection } from './components/sections/ServicesSection';
import { USAdvantageSection } from './components/sections/USAdvantageSection';
import { USStateMapSection } from './components/sections/USStateMapSection';
import { PricingSection } from './components/sections/PricingSection';
import { TestimonialsSection } from './components/sections/TestimonialsSection';
import { TopStatesSection } from './components/sections/TopStatesSection';
import { FAQSection } from './components/sections/FAQSection';
import { ContactSection } from './components/sections/ContactSection';
import { dashboardApplicationUrl, dashboardUrl } from './lib/dashboardLinks';
import { PricingPage } from './components/pages/PricingPage';
import { ContactPage } from './components/pages/ContactPage';
import { RefundPolicyPage } from './components/pages/RefundPolicyPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/pages/TermsConditionsPage';
import { getServiceBySlug } from './data/services';
import { getUsServicePage } from './data/usServicePages';
import { getManagementServicePage } from './data/managementServicePages';
import { PricingPlan, TopState } from './types';

const WhyApexPage = lazy(() => import('./components/why/WhyApexPage').then((module) => ({ default: module.WhyApexPage })));
const StartPage = lazy(() => import('./components/start/StartPage').then((module) => ({ default: module.StartPage })));
const FormationProcessPage = lazy(() => import('./components/pages/FormationProcessPage').then((module) => ({ default: module.FormationProcessPage })));
const ServiceDetailPage = lazy(() => import('./components/services/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })));
const UsServicePage = lazy(() => import('./components/services/UsServicePage').then((module) => ({ default: module.UsServicePage })));
const ManagementServicePage = lazy(() => import('./components/services/ManagementServicePage').then((module) => ({ default: module.ManagementServicePage })));
const UkLtdServicePage = lazy(() => import('./components/services/UkLtdServicePage').then((module) => ({ default: module.UkLtdServicePage })));

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const routePath = path.replace(/\/+$/, '') || '/';
  const mainRef = useRef<HTMLElement>(null);
  usePageScrollReveals(mainRef, routePath);

  const [translationNotice, setTranslationNotice] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem('apex-navigation-language');
    return isLanguage(saved) ? saved : 'en';
  });

  const handleLanguageChange = (nextLanguage: Language) => {
    setTranslationNotice(false);
    setLanguage(nextLanguage);
    window.localStorage.setItem('apex-navigation-language', nextLanguage);
  };
  useSiteTranslation(language, () => {
    setLanguage('en');
    window.localStorage.setItem('apex-navigation-language', 'en');
    setTranslationNotice(true);
  });
  const legalRoute = ['/privacy-policy', '/refund-policy', '/terms-and-conditions'].includes(routePath);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const canonicalPath = routePath === '/about' ? '/why-us' : routePath;
    const canonicalDomain = routePath === '/terms-and-conditions' ? 'https://apexfilings.com' : 'https://apexfiling.com';
    const canonicalUrl = `${canonicalDomain}${canonicalPath}`;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
  }, [routePath]);

  const navigateToHowItWorks = () => {
    window.history.pushState(null, '', '/how-it-works');
    setPath('/how-it-works');
    window.scrollTo(0, 0);
  };

  const navigateToFormation = (options: { source: string; state?: string; plan?: string; residency?: 'us' | 'non-us'; service?: string }) => {
    window.location.assign(dashboardApplicationUrl(options));
  };

  const returnToSite = () => {
    const destination = new URLSearchParams(window.location.search).get('source') === 'home' ? '/' : '/how-it-works';
    window.history.pushState(null, '', destination);
    setPath(destination);
    window.scrollTo(0, 0);
  };

  const handleSelectPlan = (plan: PricingPlan, isNonUs: boolean) => navigateToFormation({
    source: 'pricing',
    state: new URLSearchParams(window.location.search).get('state') || undefined,
    plan: plan.id,
    residency: isNonUs ? 'non-us' : 'us',
    service: 'llc-formation',
  });
  const handleSelectState = (state: TopState) => navigateToFormation({ source: 'state-card', state: state.id, service: 'llc-formation' });

  if (routePath === '/start') {
    return <><Suspense fallback={<div className="theme-route-loading min-h-screen bg-white" role="status">Loading registration…</div>}><StartPage onBackToSite={returnToSite} initialState={new URLSearchParams(window.location.search).get('state') ?? undefined} /></Suspense>{translationNotice && <TranslationNotice />}</>;
  }

  if (routePath === '/formation/start') {
    return <FormationHandoff />;
  }

  const serviceSlug = routePath.startsWith('/services/') ? routePath.slice('/services/'.length) : null;
  const usServicePage = serviceSlug ? getUsServicePage(serviceSlug) : undefined;
  const managementServicePage = serviceSlug ? getManagementServicePage(serviceSlug) : undefined;
  const selectedService = serviceSlug ? getServiceBySlug(serviceSlug) : undefined;

  return (
    <div className="marketing-site clay-theme min-h-screen flex flex-col bg-[#fcf9f8] text-slate-700 font-sans selection:bg-[#F04623] selection:text-white">
      {/* Navigation */}
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      {legalRoute && language !== 'en' && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">Machine translation is provided for convenience. The English policy is authoritative. <button type="button" onClick={() => handleLanguageChange('en')} className="font-semibold underline underline-offset-2">Read English original</button></div>}

      {/* Main Content */}
      <main ref={mainRef} className="flex-1">
        {serviceSlug ? (
          serviceSlug === 'uk-ltd-formation' ? <Suspense fallback={<div className="min-h-screen bg-white" />}><UkLtdServicePage onOpenClientPortal={() => window.location.assign(dashboardUrl('/login'))} /></Suspense> : usServicePage ? <Suspense fallback={<div className="min-h-screen bg-white" />}><UsServicePage page={usServicePage} /></Suspense> : managementServicePage ? <Suspense fallback={<div className="min-h-screen bg-white" />}><ManagementServicePage page={managementServicePage} onOpenClientPortal={() => window.location.assign(dashboardUrl('/login'))} /></Suspense> : selectedService ? <Suspense fallback={<div className="min-h-screen bg-white" />}><ServiceDetailPage service={selectedService} /></Suspense> : <section className="mx-auto min-h-[60vh] max-w-7xl px-4 py-24 text-center"><h1 className="text-3xl font-bold text-[#171717]">Service not found</h1><p className="mt-4 text-slate-600">Explore the services currently available through Apex Filings.</p><a href="/#services" className="mt-6 inline-flex text-sm font-semibold text-[#F04623] underline underline-offset-4">View all services</a></section>
        ) : routePath === '/how-it-works' ? <Suspense fallback={<div className="min-h-screen" role="status">Loading your business journey…</div>}><FormationProcessPage /></Suspense>
          : routePath === '/pricing' ? <PricingPage onSelectPlan={handleSelectPlan} />
          : routePath === '/refund-policy' ? <RefundPolicyPage />
          : routePath === '/privacy-policy' ? <PrivacyPolicyPage />
          : routePath === '/terms-and-conditions' ? <TermsConditionsPage />
          : routePath === '/contact' || routePath === '/consultation' ? <ContactPage consultation={routePath === '/consultation'} />
          : routePath === '/why-us' || routePath === '/about' ? <Suspense fallback={<div className="min-h-screen bg-white" />}><WhyApexPage /></Suspense> : <>
        {/* 1. Hero Section */}
        <HeroSection
          onStart={navigateToHowItWorks}
        />

        {/* 2. Trust Metrics Bar */}
        <TrustMetrics />

        {/* 3. Why Us Section */}
        <WhyApexSection />

        {/* 4. Comprehensive Services */}
        <ServicesSection />

        {/* 5. Why Incorporate In The US */}
        <USAdvantageSection />

        {/* Choose a formation state */}
        <USStateMapSection onStartState={(state, plan, isNonUs) => navigateToFormation({ source: 'map', state, plan, residency: isNonUs ? 'non-us' : 'us', service: 'llc-formation' })} />

        {/* 6. Transparent Pricing */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* 7. Proven Track Record / Testimonials */}
        <TestimonialsSection />

        {/* 8. Top US States */}
        <TopStatesSection onSelectState={handleSelectState} />

        {/* 9. Frequently Asked Questions */}
        <FAQSection />

        {/* 10. Contact / Start Section */}
        <ContactSection />
        </>}
      </main>

      {/* Mega Footer */}
      <Footer language={language} onLanguageChange={handleLanguageChange} management={Boolean(managementServicePage)} />

      {/* Modals & Interactive Overlays */}
      {translationNotice && <TranslationNotice />}
    </div>
  );
}

function FormationHandoff() {
  const query = new URLSearchParams(window.location.search);
  const destination = dashboardApplicationUrl({ state: query.get('state'), plan: query.get('plan') });
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center"><div><p className="text-sm text-slate-600">Continuing to your secure Apex Filings application…</p><a className="mt-4 inline-block font-semibold text-[#F04623] underline" href={destination}>Continue to dashboard</a></div></main>;
}

function TranslationNotice() {
  return <div role="status" translate="no" className="theme-translation-notice fixed bottom-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-center text-sm text-[#191F29] shadow-lg">Translation is unavailable right now. The site is shown in English.</div>;
}
