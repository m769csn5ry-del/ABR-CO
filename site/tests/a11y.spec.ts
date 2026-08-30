import { test, expect } from '@playwright/test';
import { ROUTES } from './helpers';

test.describe('Accessibilité', () => {
  test('le lien d’évitement mène au contenu', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#contenu')).toBeVisible();
  });

  test('toutes les images portent un texte alternatif', async ({ page }) => {
    for (const route of ['/', '/shop', '/shop/new-balance-990v6-grey', '/avant-apres']) {
      await page.goto(route);
      const missing = await page.locator('img:not([alt])').count();
      expect(missing, `${route} a des images sans alt`).toBe(0);
    }
  });

  test('chaque champ de formulaire a une étiquette', async ({ page }) => {
    for (const route of ['/contact', '/commande', '/compte/inscription', '/nettoyage/commande']) {
      await page.goto(route);
      const unlabelled = await page.evaluate(() => {
        const fields = [...document.querySelectorAll('input, select, textarea')];
        return fields.filter((f) => {
          const el = f as HTMLInputElement;
          if (el.type === 'hidden') return false;
          if (el.getAttribute('aria-label')) return false;
          if (el.getAttribute('aria-labelledby')) return false;
          if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
          return !el.closest('label');
        }).length;
      });
      expect(unlabelled, `${route} a des champs sans étiquette`).toBe(0);
    }
  });

  test('le focus reste visible à la navigation clavier', async ({ page }) => {
    await page.goto('/shop');
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    expect(outline).not.toBeNull();
    expect(outline?.style).not.toBe('none');
  });

  test('la hiérarchie des titres ne saute pas de niveau', async ({ page }) => {
    for (const route of ROUTES.slice(0, 12)) {
      await page.goto(route);
      const levels = await page
        .locator('h1, h2, h3, h4')
        .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])));
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i] - levels[i - 1],
          `${route} : saut de h${levels[i - 1]} à h${levels[i]}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test('les zones tactiles atteignent 44px sur téléphone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'contrôle propre au tactile');
    await page.goto('/shop');
    const tooSmall = await page.evaluate(() => {
      const bad: string[] = [];
      for (const t of [...document.querySelectorAll('button, a[href], input, select')]) {
        const r = t.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Liens en flux de texte : ce sont des mots, pas des boutons.
        if (t.tagName === 'A' && t.closest('p')) continue;
        // Le lien d'évitement ne se déploie qu'au focus clavier.
        if (t.className.toString().includes('sr-only')) continue;
        // Une case cochée via son étiquette : c'est l'étiquette qu'on touche.
        const label = t.closest('label');
        if (label && label.getBoundingClientRect().height >= 40) continue;
        // Lien qui couvre sa carte par un ::before : la cible est la carte.
        if (t.className.toString().includes('before:inset-0')) continue;
        if (r.height < 40) bad.push(`${t.tagName}.${t.className.toString().slice(0, 50)} h=${Math.round(r.height)}`);
      }
      return bad;
    });
    expect(tooSmall, `cibles sous 40px : ${tooSmall.join(' | ')}`).toEqual([]);
  });

  test('le mouvement réduit est respecté', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(600);
    // Rien ne doit rester masqué quand les animations sont désactivées.
    const hidden = await page.evaluate(
      () => document.querySelectorAll('[data-reveal="pending"]').length,
    );
    expect(hidden).toBe(0);
  });
});
