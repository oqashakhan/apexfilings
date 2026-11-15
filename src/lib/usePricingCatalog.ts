import { useEffect, useState } from 'react';
import { dashboardUrl } from './dashboardLinks';
import type { PricingPlan } from '../types';
type Catalog = { services: {slug:string;name:string;priceCents:number|null;currency:string;automaticCharge:boolean;availableStateCodes:string[]}[]; packages: { slug: string; name: string; description?: string; available: boolean; currency: string; serviceFeeCents: number; includedServices: string[] }[]; states: { code: string; filingFeeCents: number | null; active: boolean; verifiedAt: string | null; referenceFilingFeeCents: number | null; recurringFeeDescription: string | null; processingTime: string | null }[] };
export function usePricingCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => { void fetch(new URL('/api/v1/pricing', dashboardUrl('/login')), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(value => { if (active) {setCatalog(value);setError(false);} }).catch(() => { if (active) {setCatalog(null);setError(true);} }); };
    load(); const timer = setInterval(load, 30000); window.addEventListener('focus', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  const plans: PricingPlan[] = (catalog?.packages ?? []).filter(p => p.available && p.currency === 'USD' && ['basic','premium'].includes(p.slug)).map(p => ({ id: p.slug === 'premium' ? 'advanced' : p.slug, name: p.name, subtitle: p.slug === 'basic' ? 'Essential Company Setup' : 'Complete Business Setup', priceUsResident: p.serviceFeeCents / 100, priceNonUsResident: p.serviceFeeCents / 100, feeNotice: '+ applicable state filing fee', description: p.description || 'Formation assistance. Approvals depend on the relevant authorities and providers.', features: p.includedServices, isPopular: p.slug === 'premium', ctaText: p.slug === 'basic' ? 'Choose Basic' : 'Choose Advanced' }));
  return { plans, states: catalog?.states ?? [], services: catalog?.services.filter(s => !s.automaticCharge && s.slug !== "llc" && s.slug !== "llc-formation") ?? [], error, loading: !catalog && !error };
}
