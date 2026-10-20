import type { Language } from './languages';

// Add reviewed copy here using the exact English source string as the key.
// Reviewed entries always win over the translation provider and cached results.
// Legal, pricing, and compliance text should be reviewed here before publication.
export const approvedTranslations: Partial<Record<Language, Record<string, string>>> = {
  es: {
    Home: 'Inicio', Services: 'Servicios', Pricing: 'Precios', About: 'Nosotros', Contact: 'Contacto',
    'Client portal': 'Portal del cliente', 'Explore all services': 'Ver todos los servicios',
  },
  fr: {
    Home: 'Accueil', Services: 'Services', Pricing: 'Tarifs', About: 'À propos', Contact: 'Contact',
    'Client portal': 'Portail client', 'Explore all services': 'Tous les services',
  },
  pt: {
    Home: 'Início', Services: 'Serviços', Pricing: 'Preços', About: 'Sobre', Contact: 'Contato',
    'Client portal': 'Portal do cliente', 'Explore all services': 'Ver todos os serviços',
  },
};

export function approvedTranslation(language: Language, english: string): string | undefined {
  return approvedTranslations[language]?.[english];
}
