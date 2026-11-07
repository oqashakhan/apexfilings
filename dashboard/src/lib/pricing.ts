export type PricePackage = { id: string; slug: string; name: string; serviceFeeCents: number; currency: string; available: boolean; includedServices: string[]; includedServiceSlugs: string[] };
export type PriceService = { id: string; slug: string; name: string; description: string; available: boolean; priceCents: number | null; currency: string; priceApproved: boolean };
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
  const items: { description: string; amountCents: number; serviceSlug?: string }[] = [];
  const packageValid = !!pack && pack.currency === 'USD' && Number.isSafeInteger(pack.serviceFeeCents) && pack.serviceFeeCents >= 0;
  if (!packageValid) issues.push('Select an available USD package.');
  else items.push({ description: pack.name, amountCents: pack.serviceFeeCents });
  const governmentFeeCents = state?.active && state.verifiedAt && state.sourceReference && Number.isSafeInteger(state.filingFeeCents) && state.filingFeeCents! >= 0 ? state.filingFeeCents : null;
  if (governmentFeeCents === null) {
    const description = `Government filing fee — ${(state?.state ?? stateName) || 'select a state'}`;
    const reason = state ? 'Owner verification and approval required' : 'State fee record missing';
    const reference = state?.referenceFilingFeeCents;
    pendingItems.push({ description, referenceAmountCents: typeof reference === 'number' && Number.isSafeInteger(reference) && reference >= 0 ? reference : null, reason });
    issues.push(`${description}: ${reason}.`);
  }
  else items.push({ description: `Government filing fee — ${state!.state}`, amountCents: governmentFeeCents });
  let additionalFeeCents = 0;
  const charged = new Set<string>();
  for (const slug of new Set(selected.map(value => serviceSelectionSlug(value, catalog.services)))) {
    if (pack?.includedServiceSlugs.includes(slug)) continue;
    const service = catalog.services.find(s => s.slug === slug || s.name === slug);
    if (service && pack?.includedServiceSlugs.includes(service.slug)) continue;
    if (service && charged.has(service.slug)) continue;
    if (service) charged.add(service.slug);
    if (!service?.available || !service.priceApproved || service.priceCents === null || !Number.isSafeInteger(service.priceCents) || service.priceCents < 0 || service.currency !== 'USD') {
      const description = service?.name ?? slug;
      const reason = !service ? 'Service record missing' : !service.available ? 'Service unavailable' : service.priceCents === null ? 'Service price missing' : !service.priceApproved ? 'Service price requires approval' : 'Service price or currency invalid';
      pendingItems.push({ description, referenceAmountCents: null, reason });
      issues.push(`Price to be confirmed: ${description} — ${reason}.`); continue;
    }
    additionalFeeCents += service.priceCents;
    items.push({ description: service.name, amountCents: service.priceCents, serviceSlug: service.slug });
  }
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  if (!Number.isSafeInteger(total) || total > 2147483647 || total <= 0) issues.push('Order total requires review.');
  const referenceSubtotal = total + pendingItems.reduce((sum, item) => sum + (item.referenceAmountCents ?? 0), 0);
  const referenceSubtotalCents = packageValid && pendingItems.every(item => item.referenceAmountCents !== null) && Number.isSafeInteger(referenceSubtotal) && referenceSubtotal <= 2147483647 ? referenceSubtotal : null;
  return { packageName: pack?.name ?? '', includedServices: pack?.includedServices ?? [], serviceFeeCents: pack?.serviceFeeCents ?? null, governmentFeeCents, additionalFeeCents, discountCents: 0, taxCents: 0, currency: 'USD', items, pendingItems, referenceSubtotalCents, issues, totalCents: issues.length ? null : total, state: state?.state ?? stateName, recurringFeeDescription: state?.recurringFeeDescription ?? null, processingTime: state?.processingTime ?? null };
}
