import { TestimonialItem, TrustStat } from '../types';

export const TRUST_STATS: TrustStat[] = [
  { value: 3000, suffix: '+', label: 'Businesses Formed', icon: 'building' },
  { value: 4000, suffix: '+', label: 'Clients Served', icon: 'users' },
  { value: 150, suffix: '+', label: 'Countries Reached', icon: 'globe' },
  { value: 7, suffix: '+', label: 'Years of Experience', icon: 'award' },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't-1',
    quote:
      'Apex Filings made forming our Wyoming LLC from London completely effortless. The state approval arrived in under 36 hours, and our Stripe and Mercury bank accounts were active within days.',
    author: 'Oliver Henderson',
    role: 'Co-founder, CloudRoute Tech',
    country: 'United Kingdom',
    flag: '🇬🇧',
    rating: 5,
  },
  {
    id: 't-2',
    quote:
      'As a non-US resident running an international digital marketing agency, navigating state fees and IRS EINs seemed daunting. Marcus and the team walked me through every single step transparently.',
    author: 'Soraya Al-Mansoor',
    role: 'Founder, Vertex Media FZ',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
    rating: 5,
  },
  {
    id: 't-3',
    quote:
      'The client dashboard is clean, fast, and organized. Having all official state articles, tax documents, and compliance deadlines in one secure vault gives our investors complete peace of mind.',
    author: 'Kenji Takahashi',
    role: 'CEO, Hyperion Robotics LLC',
    country: 'Japan & US',
    flag: '🇯🇵',
    rating: 5,
  },
];
