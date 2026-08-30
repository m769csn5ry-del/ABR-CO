import type { Page } from '@playwright/test';

/** Toutes les routes publiques du site, telles qu'un visiteur les atteint. */
export const ROUTES = [
  '/',
  '/shop',
  '/shop/new-balance-990v6-grey',
  '/nettoyage',
  '/nettoyage/commande',
  '/avant-apres',
  '/a-propos',
  '/faq',
  '/contact',
  '/panier',
  '/commande',
  '/compte',
  '/compte/connexion',
  '/compte/inscription',
  '/compte/mot-de-passe-oublie',
  '/compte/commandes',
  '/compte/entretiens',
  '/compte/adresses',
  '/suivi',
  '/suivi?ref=NF-A1B2C3',
  '/mentions-legales',
  '/cgv',
  '/confidentialite',
  '/livraison-retours',
];

/** Collecte les erreurs console et les exceptions non rattrapées. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Le 501 volontaire des routes non raccordées produit un log réseau
    // attendu : ce n'est pas un défaut, c'est le comportement voulu.
    if (text.includes('501') || text.includes('Failed to load resource')) return;
    errors.push(text);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** Débordement horizontal du document, en pixels. */
export async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Va sur une route ET attend l'hydratation : avant elle, un clic est perdu. */
export async function gotoReady(page: Page, route: string) {
  await page.goto(route);
  await page.waitForSelector('html[data-hydrated="true"]', { timeout: 15_000 });
}
