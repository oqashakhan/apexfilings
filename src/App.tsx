import { lazy, Suspense, useEffect, useState } from 'react';
import { Navbar, type Language } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/sections/HeroSection';
import { TrustMetrics } from './components/sections/TrustMetrics';
import { WhyApexSection } from './components/sections/WhyApexSection';
import { ServicesSection } from './components/sections/ServicesSection';
import { USAdvantageSection } from './components/sections/USAdvantageSection';
import { PricingSection } from './components/sections/PricingSection';
import { ExclusiveBonusesSection } from './components/sections/ExclusiveBonusesSection';
import { TestimonialsSection } from './components/sections/TestimonialsSection';
import { TopStatesSection } from './components/sections/TopStatesSection';
import { FAQSection } from './components/sections/FAQSection';
import { ContactSection } from './components/sections/ContactSection';
import { StartPage } from './components/start/StartPage';
import { LoginPortalModal } from './components/modals/LoginPortalModal';
import { getServiceBySlug } from './data/services';
import { PricingPlan, TopState } from './types';

const WhyApexPage = lazy(() => import('./components/why/WhyApexPage').then((module) => ({ default: module.WhyApexPage })));
const ServiceDetailPage = lazy(() => import('./components/services/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })));

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

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

  const navigateToStart = (stateId?: string) => {
    const url = stateId ? `/start?state=${encodeURIComponent(stateId)}` : '/start';
    window.history.pushState(null, '', url);
    setPath('/start');
    window.scrollTo(0, 0);
  };

  const returnToSite = () => {
    window.history.pushState(null, '', '/');
    setPath('/');
    window.scrollTo(0, 0);
  };

  const handleSelectPlan = (_plan: PricingPlan) => navigateToStart();
  const handleSelectState = (state: TopState) => navigateToStart(state.id);

  if (path === '/start') {
    return <StartPage onBackToSite={returnToSite} initialState={new URLSearchParams(window.location.search).get('state') ?? undefined} />;
  }

  const serviceSlug = path.startsWith('/services/') ? path.slice('/services/'.length).replace(/\/$/, '') : null;
  const selectedService = serviceSlug ? getServiceBySlug(serviceSlug) : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-slate-700 font-sans selection:bg-[#F04623] selection:text-white">
      {/* Navigation */}
      <Navbar onOpenClientPortal={() => setLoginModalOpen(true)} language={language} onLanguageChange={handleLanguageChange} />

      {/* Main Content */}
      <main className="flex-1">
        {serviceSlug ? (
          selectedService ? <Suspense fallback={<div className="min-h-screen bg-white" />}><ServiceDetailPage service={selectedService} /></Suspense> : <section className="mx-auto min-h-[60vh] max-w-7xl px-4 py-24 text-center"><h1 className="text-3xl font-bold text-[#171717]">Service not found</h1><p className="mt-4 text-slate-600">Explore the services currently available through Apex Filings.</p><a href="/#services" className="mt-6 inline-flex text-sm font-semibold text-[#F04623] underline underline-offset-4">View all services</a></section>
        ) : path === '/why-us' ? <Suspense fallback={<div className="min-h-screen bg-white" />}><WhyApexPage /></Suspense> : <>
        {/* 1. Hero Section */}
        <HeroSection
          onStart={() => navigateToStart()}
        />

        {/* 2. Trust Metrics Bar */}
        <TrustMetrics />

        {/* 3. Why Us Section */}
        <WhyApexSection />

        {/* 4. Comprehensive Services */}
        <ServicesSection />

        {/* 5. Why Incorporate In The US */}
        <USAdvantageSection />

        {/* 6. Transparent Pricing */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* 7. Exclusive Bonuses for Premium Clients */}
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
