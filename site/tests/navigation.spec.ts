import { test, expect } from '@playwright/test';
import { overflow, gotoReady } from './helpers';

test.describe('Navigation', () => {
  test('la promesse double est lisible immédiatement', async ({ page }) => {
    await gotoReady(page, '/');
    // Les deux métiers doivent être présents dès le premier écran.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Neuve, ou comme neuve');
    await expect(page.getByRole('link', { name: /Shopper les sneakers/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Nettoyer ma paire/ }).first()).toBeVisible();
  });

  test('les deux parcours mènent aux bonnes pages', async ({ page }) => {
    await gotoReady(page, '/');
    await page.getByRole('link', { name: /Shopper les sneakers/ }).first().click();
    await expect(page).toHaveURL(/\/shop$/);

    await gotoReady(page, '/');
    await page.getByRole('link', { name: /Nettoyer ma paire/ }).first().click();
    await expect(page).toHaveURL(/\/nettoyage$/);
  });

  test('le menu mobile s’ouvre, navigue et se referme', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'menu réservé aux petites largeurs');
    await gotoReady(page, '/');

    const toggle = page.getByRole('button', { name: 'Ouvrir le menu' });
    await toggle.click();
    await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeVisible();

    // Le panier reste atteignable pendant que le menu est ouvert.
    await expect(page.getByRole('banner').getByRole('link', { name: /Panier/ })).toBeVisible();

    await page.getByRole('navigation', { name: 'Navigation mobile' })
      .getByRole('link', { name: 'FAQ' })
      .click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeHidden();
  });

  test('le menu mobile se ferme avec Échap', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'menu réservé aux petites largeurs');
    await gotoReady(page, '/');
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeHidden();
  });

  test('la navigation principale est complète sur grand écran', async ({ page, isMobile }) => {
    test.skip(isMobile, 'barre réservée aux grandes largeurs');
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoReady(page, '/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    for (const label of ['Shop', 'Nettoyage', 'Avant / Après', 'À propos', 'FAQ', 'Contact']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('le pied de page porte tous les liens attendus', async ({ page }) => {
    await gotoReady(page, '/');
    const footer = page.locator('footer');
    for (const label of [
      'Mentions légales',
      'CGV',
      'Confidentialité',
      'Livraison et retours',
      'FAQ',
      'Contact',
      'Instagram',
      'TikTok',
    ]) {
      await expect(footer.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('aucun débordement de la page d’accueil, quelle que soit la largeur', async ({ page }) => {
    for (const width of [320, 375, 414, 768, 1024, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoReady(page, '/');
      const culprits = await page.evaluate((w) => {
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > w + 1 || r.left < -1)) {
            out.push(`${el.tagName}.${String(el.className).slice(0, 70)}`);
          }
        }
        return out.slice(0, 3);
      }, width);
      expect(
        await overflow(page),
        `débordement à ${width}px — ${culprits.join(' | ')}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});
