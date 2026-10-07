import { NavItem } from '../types';

export const NAVIGATION_ITEMS: NavItem[] = [
  { label: 'Home', href: '/#home' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'About', href: '/why-us' },
  { label: 'Contact', href: '/#contact' },
];

export const FOOTER_LINKS = {
  services: [
    { label: 'US LLC Formation', href: '/services/llc-formation' },
    { label: 'IRS EIN Registration', href: '/services/ein' },
    { label: 'Registered Agent', href: '/services/registered-agent' },
    { label: 'ITIN Filing Assistance', href: '/#services' },
    { label: 'US Bank Account Setup', href: '/#services' },
  ],
  company: [
    { label: 'About Apex Filings', href: '/why-us' },
    { label: 'Contact Support', href: '/#contact' },
    { label: 'Pricing Plans', href: '/#pricing' },
    { label: 'FAQ & Guides', href: '/#faq' },
    { label: 'Client Reviews', href: '/#testimonials' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Refund Policy', href: '#' },
    { label: 'Terms and Conditions', href: '#' },
    { label: 'Legal Disclaimer', href: '#' },
    { label: 'Service Accessibility', href: '#' },
  ],
  languages: ['English', 'Español', 'Français', 'Português'],
};
