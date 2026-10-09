export interface NavItem {
  label: string;
  href: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: 'Building2' | 'ShieldCheck' | 'FileText' | 'FileCheck2' | 'CalendarCheck' | 'FolderLock';
  cardBenefits: string[];
  heroTitle: string;
  overviewHeading: string;
  overview: string;
  whyItMatters: string;
  benefits: { title: string; description: string }[];
  included: string[];
  process: { title: string; description: string }[];
  faqs: FAQItem[];
  relatedIds: string[];
  metaTitle: string;
  metaDescription: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  subtitle: string;
  priceUsResident: number;
  priceNonUsResident: number;
  feeNotice: string;
  description: string;
  features: string[];
  excludedFeatures?: string[];
  isPopular?: boolean;
  ctaText: string;
}

export interface TopState {
  id: string;
  name: string;
  tag: string;
  tagVariant: 'emerald' | 'brand' | 'slate';
  description: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface TrustStat {
  value: number;
  suffix: string;
  label: string;
  icon: 'building' | 'users' | 'globe' | 'award';
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  country: string;
  flag: string;
  rating: number;
}
