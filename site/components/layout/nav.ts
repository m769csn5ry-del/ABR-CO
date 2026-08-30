/* Source unique de la navigation : en-tête, menu mobile, pied de page
   et plan du site lisent tous ce tableau. */
export const mainNav = [
  { href: '/', label: 'Accueil' },
  { href: '/shop', label: 'Shop' },
  { href: '/nettoyage', label: 'Nettoyage' },
  { href: '/avant-apres', label: 'Avant / Après' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
] as const;

export const legalNav = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'CGV' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/livraison-retours', label: 'Livraison et retours' },
] as const;
