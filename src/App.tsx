import { lazy, Suspense, useEffect, useState } from 'react';
import './marketing-polish.css';
import { Navbar, type Language } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/sections/HeroSection';
import { TrustMetrics } from './components/sections/TrustMetrics';
import { WhyApexSection } from './components/sections/WhyApexSection';
import { ServicesSection } from './components/sections/ServicesSection';
import { USAdvantageSection } from './components/sections/USAdvantageSection';
import { USStateMapSection } from './components/sections/USStateMapSection';
import { PricingSection } from './components/sections/PricingSection';
import { ExclusiveBonusesSection } from './components/sections/ExclusiveBonusesSection';
import { TestimonialsSection } from './components/sections/TestimonialsSection';
import { TopStatesSection } from './components/sections/TopStatesSection';
import { FAQSection } from './components/sections/FAQSection';
import { ContactSection } from './components/sections/ContactSection';
import { LoginPortalModal } from './components/modals/LoginPortalModal';
import { PricingPage } from './components/pages/PricingPage';
import { ContactPage } from './components/pages/ContactPage';
import { getServiceBySlug } from './data/services';
import { PricingPlan, TopState } from './types';

const WhyApexPage = lazy(() => import('./components/why/WhyApexPage').then((module) => ({ default: module.WhyApexPage })));
const StartPage = lazy(() => import('./components/start/StartPage').then((module) => ({ default: module.StartPage })));
const FormationWizard = lazy(() => import('./components/formation/FormationWizard').then((module) => ({ default: module.FormationWizard })));
const FormationProcessPage = lazy(() => import('./components/pages/FormationProcessPage').then((module) => ({ default: module.FormationProcessPage })));
const ServiceDetailPage = lazy(() => import('./components/services/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })));

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const routePath = path.replace(/\/+$/, '') || '/';

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem('apex-navigation-language');
    return saved === 'en' || saved === 'es' || saved === 'fr' || saved === 'pt' ? saved : 'en';
  });

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem('apex-navigation-language', nextLanguage);
  };

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const canonicalPath = routePath === '/about' ? '/why-us' : routePath;
    const canonicalUrl = `https://apexfiling.com${canonicalPath}`;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
  }, [routePath]);

  const navigateToHowItWorks = () => {
    window.history.pushState(null, '', '/how-it-works');
    setPath('/how-it-works');
    window.scrollTo(0, 0);
  };

  const navigateToFormation = (options: { source: string; state?: string; plan?: string; residency?: 'us' | 'non-us'; service?: string }) => {
    const params = new URLSearchParams();
    params.set('source', options.source);
    if (options.state) params.set('state', options.state);
    if (options.plan) params.set('plan', options.plan);
    if (options.residency) params.set('residency', options.residency);
    if (options.service) params.set('service', options.service);
    window.history.pushState(null, '', `/formation/start?${params}`);
    setPath('/formation/start');
    window.scrollTo(0, 0);
  };

  const returnToSite = () => {
    const destination = new URLSearchParams(window.location.search).get('source') === 'home' ? '/' : '/how-it-works';
    window.history.pushState(null, '', destination);
    setPath(destination);
    window.scrollTo(0, 0);
  };

  const handleSelectPlan = (plan: PricingPlan, isNonUs: boolean) => navigateToFormation({ source: 'pricing', plan: plan.id, residency: isNonUs ? 'non-us' : 'us', service: 'llc-formation' });
  const handleSelectState = (state: TopState) => navigateToFormation({ source: 'state-card', state: state.id, service: 'llc-formation' });

  if (routePath === '/start') {
    return <Suspense fallback={<div className="min-h-screen bg-white" role="status">Loading registration…</div>}><StartPage onBackToSite={returnToSite} initialState={new URLSearchParams(window.location.search).get('state') ?? undefined} /></Suspense>;
  }

  if (routePath === '/formation/start') {
    return <Suspense fallback={<div className="min-h-screen bg-[#fcf9f8]" role="status">Loading formation onboarding…</div>}><FormationWizard /></Suspense>;
  }

  const serviceSlug = routePath.startsWith('/services/') ? routePath.slice('/services/'.length) : null;
  const selectedService = serviceSlug ? getServiceBySlug(serviceSlug) : undefined;

  return (
    <div className="marketing-site min-h-screen flex flex-col bg-[#fcf9f8] text-slate-700 font-sans selection:bg-[#F04623] selection:text-white">
      {/* Navigation */}
      <Navbar onOpenClientPortal={() => setLoginModalOpen(true)} language={language} onLanguageChange={handleLanguageChange} />

      {/* Main Content */}
      <main className="flex-1">
        {serviceSlug ? (
          selectedService ? <Suspense fallback={<div className="min-h-screen bg-white" />}><ServiceDetailPage service={selectedService} /></Suspense> : <section className="mx-auto min-h-[60vh] max-w-7xl px-4 py-24 text-center"><h1 className="text-3xl font-bold text-[#171717]">Service not found</h1><p className="mt-4 text-slate-600">Explore the services currently available through Apex Filings.</p><a href="/#services" className="mt-6 inline-flex text-sm font-semibold text-[#F04623] underline underline-offset-4">View all services</a></section>
        ) : routePath === '/how-it-works' ? <Suspense fallback={<div className="min-h-screen" role="status">Loading your business journey…</div>}><FormationProcessPage /></Suspense>
          : routePath === '/pricing' ? <PricingPage onSelectPlan={handleSelectPlan} />
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

        {/* 7. Optional business support */}
        <ExclusiveBonusesSection />

        {/* 8. Proven Track Record / Testimonials */}
        <TestimonialsSection />

        {/* 9. Top US States */}
        <TopStatesSection onSelectState={handleSelectState} />

        {/* 10. Frequently Asked Questions */}
        <FAQSection />

        {/* 11. Contact / Start Section */}
        <ContactSection />
        </>}
      </main>

      {/* Mega Footer */}
      <Footer language={language} onLanguageChange={handleLanguageChange} />

      {/* Modals & Interactive Overlays */}
      <LoginPortalModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
