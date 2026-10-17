import { NavItem } from '../types';

export const NAVIGATION_ITEMS: NavItem[] = [
  { label: 'Home', href: '/#home' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/why-us' },
  { label: 'Contact', href: '/contact' },
];

export const FOOTER_LINKS = {
  services: [
    { label: 'US LLC Formation', href: '/services/llc-formation' },
    { label: 'IRS EIN Registration', href: '/services/ein' },
    { label: 'Registered Agent', href: '/services/registered-agent' },
    { label: 'ITIN Filing Assistance', href: '/services/itin' },
    { label: 'US Bank Account Setup', href: '/services/business-banking' },
  ],
  company: [
    { label: 'About Apex Filings', href: '/why-us' },
    { label: 'Contact Support', href: '/contact' },
    { label: 'Pricing Plans', href: '/pricing' },
    { label: 'FAQ & Guides', href: '/#faq' },
    { label: 'Client Reviews', href: '/#testimonials' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Terms of Service', href: '/terms-and-conditions' },
    { label: 'Legal Disclaimer', href: '#' },
    { label: 'Service Accessibility', href: '#' },
  ],
  languages: ['English', 'Español', 'Français', 'Português'],
};

export const APEX_EXTERNAL_LINKS = [
  { label: 'Location', href: 'https://share.google/6vTBW7IbDoE3MlaXa' },
  { label: 'Facebook', href: 'https://www.facebook.com/p/Apex-Filings-100084227452510/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@apexfilings' },
] as const;
