import { TopState } from '../types';

export const TOP_STATES: TopState[] = [
  {
    id: 'wyoming',
    name: 'Wyoming',
    tag: '#1 Choice',
    tagVariant: 'emerald',
    description: 'Best for privacy, zero state corporate income tax, and low recurring annual state fees ($60).',
    stateFee: 102,
    speed: '24-48h',
  },
  {
    id: 'delaware',
    name: 'Delaware',
    tag: 'VC Preferred',
    tagVariant: 'brand',
    description: 'The gold standard for tech startups seeking US angel and venture capital investment.',
    stateFee: 140,
    speed: '24-72h',
  },
  {
    id: 'florida',
    name: 'Florida',
    tag: 'Fast Setup',
    tagVariant: 'brand',
    description: 'Ideal for commerce, real estate, Latin American trading partnerships, and global retail.',
    stateFee: 125,
    speed: '48h',
  },
  {
    id: 'new-mexico',
    name: 'New Mexico',
    tag: 'Lowest Cost',
    tagVariant: 'slate',
    description: 'Strict member privacy, zero annual state report fees, and lowest ongoing operating cost.',
    stateFee: 50,
    speed: '48-72h',
  },
];
