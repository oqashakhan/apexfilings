import { validFeeSource } from './state-fee-approval';
export type PricePackage = { id: string; slug: string; name: string; serviceFeeCents: number; currency: string; available: boolean; includedServices: string[]; includedServiceSlugs: string[] };
export type PriceService = { id: string; slug: string; name: string; description: string; available: boolean; priceCents: number | null; currency: string; priceApproved: boolean; availableStateCodes?: string[]; category?: string; displayOrder?: number; automaticCharge?: boolean; requiredCharge?: boolean };
export type PriceState = { code: string; state: string; filingFeeCents: number | null; referenceFilingFeeCents?: number | null; active: boolean; verifiedAt: string | Date | null; sourceReference: string | null; recurringFeeDescription: string | null; recurringFeePeriod: string | null; processingTime: string | null };
export type PricingCatalog = { packages: PricePackage[]; services: PriceService[]; states: PriceState[] };
export type QuoteSnapshot = ReturnType<typeof quotePricing>;
export const serviceSelectionSlug = (value: string, services: PriceService[]) => services.find(s => s.slug === value || s.name === value)?.slug ?? (value === 'Payment Processing Assistance' ? 'payment-processing' : value);
export function quotePricing(catalog: PricingCatalog, slug: string, stateName: string, selected: string[]) {
  const pack = catalog.packages.find(p => p.slug === slug && p.available);
  const stateKey = stateName.trim().toLowerCase();
  const state = catalog.states.find(s => s.state.toLowerCase() === stateKey || s.code.toLowerCase() === stateKey);
  const issues: string[] = [];
  const pendingItems: { description: string; referenceAmountCents: number | null; reason: string }[] = [];
  const items: { description: string; amountCents: number; serviceSlug?: string; category?: 'PACKAGE' | 'GOVERNMENT' | 'ADDITIONAL' | 'THIRD_PARTY'; currency?: string; approved?: boolean }[] = [];
  const packageValid = !!pack && pack.currency === 'USD' && Number.isSafeInteger(pack.serviceFeeCents) && pack.serviceFeeCents >= 0;
  if (!packageValid) issues.push('Select an available USD package.');
  else items.push({ description: pack.name, amountCents: pack.serviceFeeCents });
  const governmentFeeCents = state?.active && state.verifiedAt && Number.isFinite(new Date(state.verifiedAt).getTime()) && validFeeSource(state.sourceReference) && Number.isSafeInteger(state.filingFeeCents) && state.filingFeeCents! >= 0 ? state.filingFeeCents : null;
  if (governmentFeeCents === null) {
    const description = `Government filing fee — ${(state?.state ?? stateName) || 'select a state'}`;
    const reason = state ? 'Owner verification and approval required' : 'State fee record missing';
    const reference = state?.referenceFilingFeeCents;
    pendingItems.push({ description, referenceAmountCents: typeof reference === 'number' && Number.isSafeInteger(reference) && reference >= 0 ? reference : null, reason });
    issues.push(`${description}: ${reason}.`);
  }
  else items.push({ description: `Government filing fee — ${state!.state}`, amountCents: governmentFeeCents });
  let additionalFeeCents = 0;
  let thirdPartyFeeCents = 0;
  for (const charge of catalog.services.filter(s => s.automaticCharge && s.available && (!s.availableStateCodes?.length || (state && s.availableStateCodes.includes(state.code))))) {
    if (pack?.includedServiceSlugs.includes(charge.slug)) continue;
    const valid = charge.priceApproved && charge.currency === 'USD' && charge.priceCents !== null && Number.isSafeInteger(charge.priceCents) && charge.priceCents >= 0;
    if (!valid) {
      if (charge.requiredCharge) { pendingItems.push({ description: charge.name, referenceAmountCents: null, reason: 'Required third-party price missing or unapproved' }); issues.push(`${charge.name}: required third-party price missing or unapproved.`); }
      continue;
    }
    thirdPartyFeeCents += charge.priceCents!;
    items.push({ description: charge.name, amountCents: charge.priceCents!, category: 'THIRD_PARTY', currency: 'USD', approved: true });
  }
  const charged = new Set<string>();
  for (const slug of new Set(selected.map(value => serviceSelectionSlug(value, catalog.services)))) {
    if (pack?.includedServiceSlugs.includes(slug)) continue;
    const service = catalog.services.find(s => s.slug === slug || s.name === slug);
    if (service?.automaticCharge) continue;
    if (service && pack?.includedServiceSlugs.includes(service.slug)) continue;
    if (service && charged.has(service.slug)) continue;
    if (service) charged.add(service.slug);
    if (service?.availableStateCodes?.length && (!state || !service.availableStateCodes.includes(state.code))) {
      pendingItems.push({ description: service.name, referenceAmountCents: null, reason: 'Not available in the selected state' });
      issues.push(`${service.name}: not available in ${state?.state ?? stateName}.`); continue;
    }
    if (!service?.available || !service.priceApproved || service.priceCents === null || !Number.isSafeInteger(service.priceCents) || service.priceCents < 0 || service.currency !== 'USD') {
      const description = service?.name ?? slug;
      const reason = !service ? 'Service record missing' : !service.available ? 'Service unavailable' : service.priceCents === null ? 'Service price missing' : !service.priceApproved ? 'Service price requires approval' : 'Service price or currency invalid';
      pendingItems.push({ description, referenceAmountCents: null, reason });
      issues.push(`Price to be confirmed: ${description} — ${reason}.`); continue;
    }
    additionalFeeCents += service.priceCents;
    items.push({ description: service.name, amountCents: service.priceCents, serviceSlug: service.slug, category: 'ADDITIONAL' });
  }
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  if (!Number.isSafeInteger(total) || total > 2147483647 || total <= 0) issues.push('Order total requires review.');
  const referenceSubtotal = total + pendingItems.reduce((sum, item) => sum + (item.referenceAmountCents ?? 0), 0);
  const referenceSubtotalCents = packageValid && pendingItems.every(item => item.referenceAmountCents !== null) && Number.isSafeInteger(referenceSubtotal) && referenceSubtotal <= 2147483647 ? referenceSubtotal : null;
  const lineItems = items.map((item,index) => ({ ...item, currency: 'USD', approved: true, category: item.category ?? (index === 0 ? 'PACKAGE' as const : 'GOVERNMENT' as const) }));
  const knownSubtotalCents = total;
  return { packageName: pack?.name ?? '', includedServices: pack?.includedServices ?? [], serviceFeeCents: pack?.serviceFeeCents ?? null, governmentFeeCents, thirdPartyFeeCents, additionalFeeCents, discountCents: 0, taxCents: 0, currency: 'USD', items: lineItems, pendingItems: pendingItems.map(item => ({...item, amountCents: null, currency: 'USD', approved: false})), referenceSubtotalCents, knownSubtotalCents, pricingComplete: issues.length === 0, needsOrderConfirmation: false, paymentAllowed: issues.length === 0, issues, totalCents: issues.length ? null : total, state: state?.state ?? stateName, recurringFeeDescription: state?.recurringFeeDescription ?? null, processingTime: state?.processingTime ?? null };
}

type StoredOrder = { serviceFeeCents: number; governmentFeeCents: number | null; thirdPartyFeeCents: number | null; additionalFeeCents: number | null; discountCents: number | null; totalCents: number | null; currency: string; pricingSnapshot?: unknown; paymentStatus?: string; status?: string };
export function resolveOrderQuote(catalog: PricingCatalog, order: StoredOrder, app: {package: {slug: string}; company: {formationState: string}; additionalServices: string[]}): QuoteSnapshot {
  const current = quotePricing(catalog, app.package.slug, app.company.formationState, app.additionalServices);
  if (order.totalCents === null) return { ...current, needsOrderConfirmation: current.pricingComplete, paymentAllowed: false };
  const saved = order.pricingSnapshot && typeof order.pricingSnapshot === 'object' ? order.pricingSnapshot as Partial<QuoteSnapshot> : null;
  const result = { ...current, ...saved, serviceFeeCents: order.serviceFeeCents, governmentFeeCents: order.governmentFeeCents, thirdPartyFeeCents: order.thirdPartyFeeCents ?? 0, additionalFeeCents: order.additionalFeeCents ?? 0, discountCents: order.discountCents ?? 0, taxCents: saved?.taxCents ?? 0, totalCents: order.totalCents, knownSubtotalCents: order.totalCents + (order.discountCents ?? 0), pricingComplete: true, needsOrderConfirmation: false, paymentAllowed: (order.paymentStatus === undefined || order.paymentStatus === "UNPAID") && (order.status === undefined || order.status === "OPEN"), currency: order.currency, pendingItems: [], issues: [], referenceSubtotalCents: null, items: saved?.items ?? [
    {description: saved?.packageName ?? current.packageName,amountCents:order.serviceFeeCents,category:'PACKAGE',currency:order.currency,approved:true},
    ...(order.governmentFeeCents !== null ? [{description:`Government filing fee — ${app.company.formationState}`,amountCents:order.governmentFeeCents,category:'GOVERNMENT' as const,currency:order.currency,approved:true}] : []),
  ] };
  result.items = result.items.map((item,index) => ({...item, currency: order.currency, approved: true, category: item.category ?? (item.serviceSlug ? 'ADDITIONAL' : index === 0 ? 'PACKAGE' : item.description.startsWith('Government filing fee') ? 'GOVERNMENT' : 'THIRD_PARTY')}));
  return result;
}
