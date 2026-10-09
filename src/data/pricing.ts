import { PricingPlan } from '../types';

export const PRICING_DISCLAIMER = 'Package prices exclude applicable state filing fees. Additional third-party charges may apply. EIN processing and bank account or payment provider approvals depend on the relevant authorities and providers.';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic LLC Formation',
    subtitle: 'Essential Company Setup',
    priceUsResident: 199,
    priceNonUsResident: 199,
    feeNotice: '+ applicable state filing fee',
    description: 'Everything you need to establish your US LLC with a straightforward formation process.',
    features: [
      'US LLC Formation in Your Chosen State',
      'LLC Name Availability Check',
      'Articles of Organization',
      'Registered Agent Service — 1 Year',
      'Business Address — 1 Year',
      'LLC Operating Agreement',
      'EIN Application Assistance',
      'Secure Digital Document Access Through Our Client Portal',
    ],
    isPopular: false,
    ctaText: 'Choose Basic',
  },
  {
    id: 'advanced',
    name: 'Advanced LLC Formation',
    badge: 'POPULAR CHOICE',
    subtitle: 'Complete Business Setup',
    priceUsResident: 299,
    priceNonUsResident: 299,
    feeNotice: '+ applicable state filing fee',
    description: 'For entrepreneurs who want company formation along with additional banking, payment, and compliance support.',
    features: [
      'US LLC Formation in Your Chosen State',
      'LLC Name Availability Check',
      'Articles of Organization',
      'Registered Agent Service — 1 Year',
      'Business Address — 1 Year',
      'LLC Operating Agreement',
      'EIN Application Assistance',
      'Secure Digital Document Access Through Our Client Portal',
      'US Business Bank Account Application Assistance',
      'Payment Processor Application Guidance',
      'Compliance Calendar & Renewal Reminders',
      'Priority Phone & Email Support',
      'Additional Guidance for Eligible Banking and Payment Solutions',
    ],
    isPopular: true,
    ctaText: 'Choose Advanced',
  },
];

export function pricingComparisonLabel(feature: string) {
  return feature === 'Secure Digital Document Access Through Our Client Portal'
    ? 'Secure Digital Document Access'
    : feature;
}
