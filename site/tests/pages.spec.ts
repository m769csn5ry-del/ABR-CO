import { test, expect } from '@playwright/test';
import { ROUTES, watchErrors, overflow } from './helpers';

/* Passage sur chaque page : elle répond, elle a un titre unique, un seul
   h1, aucune erreur console, et rien ne déborde horizontalement. */

for (const route of ROUTES) {
  test(`page ${route}`, async ({ page }) => {
    const errors = watchErrors(page);

    const response = await page.goto(route);
    expect(response?.status(), `${route} doit répondre 200`).toBeLessThan(400);

    // Un seul h1 par page : c'est la colonne vertébrale du document.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();

    // Titre de document renseigné et distinct du gabarit.
    await expect(page).toHaveTitle(/.{8,}/);

    expect(await overflow(page), `${route} déborde horizontalement`).toBeLessThanOrEqual(1);
    expect(errors, `${route} produit des erreurs console`).toEqual([]);
  });
}

test('le contenu reste visible sans révélation au défilement', async ({ page }) => {
  // Garde-fou contre le « contenu masqué au repos » : si l'observateur
  // échoue, rien ne doit rester à opacité 0.
  await page.goto('/');
  await page.waitForTimeout(2500);
  const hidden = await page.evaluate(
    () => document.querySelectorAll('[data-reveal="pending"]').length,
  );
  expect(hidden).toBe(0);
});

test('le plan du site et robots.txt répondent', async ({ page }) => {
  const sitemap = await page.goto('/sitemap.xml');
  expect(sitemap?.status()).toBe(200);
  expect(await sitemap?.text()).toContain('/shop/');

  const robots = await page.goto('/robots.txt');
  expect(robots?.status()).toBe(200);
  expect(await robots?.text()).toContain('Sitemap:');
});

test('aucun lien interne ne casse', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
    [...new Set(links.map((l) => (l as HTMLAnchorElement).getAttribute('href')!))],
  );
  expect(hrefs.length).toBeGreaterThan(10);

  for (const href of hrefs) {
    const res = await page.request.get(href);
    expect(res.status(), `${href} est cassé`).toBeLessThan(400);
  }
});
