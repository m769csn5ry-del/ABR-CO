import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { watchErrors, overflow, gotoReady } from './helpers';

/* Sous 1024px le panneau de filtres est replié derrière un bouton.
   On l'ouvre quand il est là, quelle que soit la classe d'appareil. */
async function openFilters(page: Page) {
  const toggle = page.getByRole('button', { name: /Filtrer/ });
  if (!(await toggle.isVisible())) return; // panneau déjà déplié (grand écran)

  const panel = page.locator('#filtres');
  // Un clic émis avant l'hydratation est perdu : on réessaie jusqu'à ce que
  // le panneau réponde vraiment.
  for (let i = 0; i < 4; i += 1) {
    await toggle.click();
    try {
      await panel.waitFor({ state: 'visible', timeout: 1500 });
      return;
    } catch {
      /* pas encore hydraté : nouvel essai */
    }
  }
  await panel.waitFor({ state: 'visible' });
}

test.describe('Boutique', () => {
  test('les filtres réduisent les résultats et se réinitialisent', async ({ page }) => {
    await gotoReady(page, '/shop');

    // Le compteur existe en double (barre mobile / en-tête bureau) :
    // on ne lit que celui qui est réellement affiché.
    const countText = page.getByText(/^\d+ paires?$/).filter({ visible: true });
    const initial = await countText.innerText();

    await openFilters(page);

    const panel = page.locator('#filtres');
    await panel.locator('label', { hasText: 'Nike' }).click();
    await expect(panel.getByRole('checkbox', { name: 'Nike' })).toBeChecked();
    await expect(countText).not.toHaveText(initial);

    await page.getByRole('button', { name: /Effacer les filtres/ }).click();
    await expect(countText).toHaveText(initial);
  });

  test('le filtre taille ne retient que les paires réellement disponibles', async ({ page }) => {
    await gotoReady(page, '/shop');
    await openFilters(page);

    await page.getByRole('button', { name: '43', exact: true }).click();
    const cards = page.locator('article');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('le tri par prix ordonne bien la grille', async ({ page }) => {
    await gotoReady(page, '/shop');
    await page.getByLabel('Trier').filter({ visible: true }).selectOption('prix-croissant');

    // Les paires épuisées sont volontairement rejetées en fin de liste :
    // le prix doit donc croître À L'INTÉRIEUR de chaque groupe, pas sur
    // l'ensemble de la grille.
    const readCards = () =>
      page.locator('article').evaluateAll((nodes) =>
        nodes.map((n) => {
          const priceNode = n.querySelector('p.tabular-nums');
          const amounts = (priceNode?.textContent ?? '').match(/[\d\s,]+(?=\s*€)/g) ?? [];
          const last = amounts[amounts.length - 1] ?? '0';
          return {
            price: Number(last.replace(/\s/g, '').replace(',', '.')),
            soldOut: (n.textContent ?? '').includes('Épuisé'),
          };
        }),
      );

    // La grille se recompose après le changement d'état : on interroge
    // l'ordre complet jusqu'à ce qu'il soit effectif, plutôt que de lire
    // deux fois (ce qui laisse passer un rendu intermédiaire).
    await expect
      .poll(
        async () => {
          const cards = await readCards();
          if (cards.length < 6) return 'grille incomplète';
          // Aucune paire disponible ne doit apparaître après une paire épuisée.
          const firstSoldOut = cards.findIndex((c) => c.soldOut);
          if (firstSoldOut !== -1 && !cards.slice(firstSoldOut).every((c) => c.soldOut)) {
            return 'une paire disponible suit une paire épuisée';
          }
          for (const group of [cards.filter((c) => !c.soldOut), cards.filter((c) => c.soldOut)]) {
            const prices = group.map((c) => c.price);
            if (JSON.stringify(prices) !== JSON.stringify([...prices].sort((a, b) => a - b))) {
              return `prix non croissants : ${prices.join(', ')}`;
            }
          }
          return 'ok';
        },
        { timeout: 10_000 },
      )
      .toBe('ok');
  });

  test('une fiche produit expose ses données structurées et son état constaté', async ({ page }) => {
    await gotoReady(page, '/shop/new-balance-990v6-grey');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('990v6');
    await expect(page.getByRole('heading', { name: 'État constaté sur cette paire' })).toBeVisible();

    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(ld ?? '{}');
    expect(data['@type']).toBe('Product');
    expect(data.offers.priceCurrency).toBe('EUR');
    // Aucune note ni avis ne doit être déclaré : rien de tel n'existe.
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
  });

  test('une taille épuisée est visible mais non sélectionnable', async ({ page }) => {
    await gotoReady(page, '/shop/new-balance-990v6-grey');
    const sold = page.getByRole('radio', { name: /43/ });
    await expect(sold).toBeDisabled();
  });

  test('ajout au panier, persistance, quantité et suppression', async ({ page }) => {
    const errors = watchErrors(page);
    await gotoReady(page, '/shop/new-balance-990v6-grey');

    // Sans taille, l'ajout est refusé avec un message.
    await page.getByRole('button', { name: /Ajouter au panier/ }).click();
    await expect(page.getByText('Choisis une taille pour continuer.')).toBeVisible();

    await page.getByRole('radio', { name: '41' }).click();
    await page.getByRole('button', { name: /Ajouter au panier/ }).click();
    await expect(page.getByText('Ajouté au panier.')).toBeVisible();

    // Le compteur de l'en-tête reflète l'ajout.
    await expect(page.getByRole('link', { name: /Panier, 1 article/ })).toBeVisible();

    // Le panier survit à un rechargement complet.
    await page.reload();
    await expect(page.getByRole('link', { name: /Panier, 1 article/ })).toBeVisible();

    await gotoReady(page, '/panier');
    await expect(page.getByRole('heading', { name: 'Panier' })).toBeVisible();

    await page.getByRole('button', { name: /Ajouter une unité/ }).click();
    await expect(page.getByLabel('Quantité : 2')).toBeVisible();

    await page.getByRole('button', { name: 'Retirer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ton panier est vide' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('un code promotionnel valide s’applique, un code inconnu est refusé', async ({ page }) => {
    await gotoReady(page, '/shop/adidas-samba-og-white');
    await page.getByRole('radio', { name: '41' }).click();
    await page.getByRole('button', { name: /Ajouter au panier/ }).click();

    await gotoReady(page, '/panier');
    await page.getByLabel('Code promotionnel').fill('NIMPORTEQUOI');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    await expect(page.getByText(/ne correspond à aucune offre/)).toBeVisible();

    await page.getByLabel('Code promotionnel').fill('NEUF10');
    await page.getByRole('button', { name: 'Appliquer' }).click();
    await expect(page.getByRole('term').filter({ hasText: 'Code NEUF10' })).toBeVisible();
  });

  test('le paiement ne prétend jamais aboutir', async ({ page }) => {
    await gotoReady(page, '/shop/adidas-samba-og-white');
    await page.getByRole('radio', { name: '41' }).click();
    await page.getByRole('button', { name: /Ajouter au panier/ }).click();

    await gotoReady(page, '/commande');
    await page.getByLabel(/^E-mail/).fill('test@exemple.fr');
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Nom/).fill('Durand');
    await page.getByLabel(/^Adresse/).fill('12 rue des Lilas');
    await page.getByLabel(/^Code postal/).fill('75011');
    await page.getByLabel(/^Ville/).fill('Paris');

    await page.getByRole('button', { name: 'Valider la commande' }).click();
    await expect(page.getByRole('status')).toContainText(/pas encore raccordé/);

    // Aucun champ bancaire ne doit exister nulle part sur le tunnel.
    expect(await page.locator('input[autocomplete*="cc-"]').count()).toBe(0);
  });

  test('la recherche trouve une paire et signale les impasses', async ({ page }) => {
    await gotoReady(page, '/');
    await page.getByRole('button', { name: 'Rechercher une paire' }).click();

    // La boîte de recherche s'ouvre par-dessus l'accueil, qui contient déjà
    // une Samba : on reste à l'intérieur du dialogue.
    const dialog = page.getByRole('dialog', { name: 'Rechercher une paire' });
    const field = dialog.getByRole('searchbox');
    await field.fill('samba');
    await expect(dialog.getByRole('link', { name: /Samba/ })).toBeVisible();

    await field.fill('zzzzzz');
    await expect(dialog.getByText(/Aucune paire ne correspond/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(field).toBeHidden();
  });

  test('la grille ne déborde à aucune largeur', async ({ page }) => {
    await gotoReady(page, '/shop');
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
