import { SERVICES } from '../data/services';
import { US_SERVICE_PAGES } from '../data/usServicePages';
import { MANAGEMENT_SERVICE_PAGES } from '../data/managementServicePages';

export const SITE_ORIGIN = 'https://apexfilings.com';
export type SeoPage = { path: string; title: string; description: string; heading: string; intro: string };
const pages: SeoPage[] = [
  { path: '/', title: 'US LLC Formation for Non-Residents | Apex Filings', description: 'Explore online US LLC formation, EIN assistance, registered agent and business services with Apex Filings.', heading: 'Start your US business with Apex Filings', intro: 'Explore US LLC formation and related business services for entrepreneurs and international founders.' },
  { path: '/why-us', title: 'About Apex Filings | Helping Entrepreneurs Build with Confidence', description: 'Learn about Apex Filings and its business formation and ongoing support services for entrepreneurs.', heading: 'About Apex Filings', intro: 'Apex Filings helps entrepreneurs establish and manage businesses with guided formation and related services.' },
  { path: '/pricing', title: 'LLC Formation Pricing & Packages | Apex Filings', description: 'Compare Apex Filings LLC formation packages and review the services included with each option.', heading: 'LLC formation pricing and packages', intro: 'Compare available formation packages and review their included services. Government fees may vary by state.' },
  { path: '/contact', title: 'Contact Apex Filings | US LLC Formation Support', description: 'Contact Apex Filings about US LLC formation, business services and your next steps.', heading: 'Contact Apex Filings', intro: 'Tell us about your business and ask our team about formation and related services.' },
  { path: '/how-it-works', title: 'How US LLC Formation Works | Apex Filings', description: 'Learn the steps involved in starting a US LLC with Apex Filings, from your application to formation.', heading: 'How US LLC formation works', intro: 'Explore the steps involved in providing your business details and completing the formation process.' },
  { path: '/services/uk-ltd-formation', title: 'UK Ltd Company Formation | Apex Filings', description: 'Explore UK Ltd company formation with Apex Filings: Companies House filing, required documents, government fees and next steps.', heading: 'UK Ltd company formation', intro: 'Explore the information and steps involved in forming a UK limited company.' },
];
for (const service of SERVICES) pages.push({ path: `/services/${service.id}`, title: service.metaTitle, description: service.metaDescription, heading: service.heroTitle, intro: service.overview });
for (const service of US_SERVICE_PAGES) {
  const entry = { path: `/services/${service.id}`, title: service.pageTitle, description: service.pageDescription, heading: service.h1, intro: service.intro };
  const index = pages.findIndex(page => page.path === entry.path);
  if (index >= 0) pages[index] = entry; else pages.push(entry);
}
for (const service of MANAGEMENT_SERVICE_PAGES) {
  const entry = { path: `/services/${service.id}`, title: `${service.title} | Apex Filings`, description: service.description, heading: service.title, intro: service.description };
  const index = pages.findIndex(page => page.path === entry.path);
  if (index >= 0) pages[index] = entry; else pages.push(entry);
}
export const SEO_PAGES = pages;
export function findSeoPage(path: string) { return SEO_PAGES.find(page => page.path === path); }
export function canonicalUrl(path: string) { return `${SITE_ORIGIN}${path === '/' ? '/' : `${path}/`}`; }
