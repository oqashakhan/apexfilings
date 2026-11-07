
export const PRICING_CATEGORIES = [
  { id: 'us-llc', label: 'US LLC' },
  { id: 'uk-ltd', label: 'UK Ltd' },
] as const;

export type PricingCategory = (typeof PRICING_CATEGORIES)[number]['id'];

export const PRICING_DISCLAIMER = 'Package prices exclude applicable state filing fees. Additional third-party charges may apply. EIN processing and bank account or payment provider approvals depend on the relevant authorities and providers.';

export function pricingComparisonLabel(feature: string) {
  return feature === 'Secure Digital Document Access Through Our Client Portal'
    ? 'Secure Digital Document Access'
    : feature;
}
