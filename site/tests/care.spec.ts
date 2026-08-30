import { test, expect } from '@playwright/test';
import path from 'node:path';
import { watchErrors, overflow, gotoReady } from './helpers';

test.describe('Atelier', () => {
  test('le parcours va de bout en bout et ne simule aucun paiement', async ({ page }) => {
    const errors = watchErrors(page);
    await gotoReady(page, '/nettoyage/commande');

    // 1 — prestation : le passage est bloqué sans choix.
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByText('Choisis une prestation pour continuer.')).toBeVisible();
    await page.getByRole('button', { name: /Deep Clean/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 2 — marque et modèle
    await expect(page.getByRole('heading', { name: 'Quelle paire ?' })).toBeVisible();
    await page.getByLabel(/^Marque/).fill('New Balance');
    await page.getByLabel(/^Modèle/).fill('990v6');
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 3 — matière
    await page.getByLabel(/^Matière principale/).selectOption('Suède');
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 4 — problèmes
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByText('Sélectionne au moins un point à traiter.')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Taches' }).check();
    await page.getByRole('checkbox', { name: 'Semelle sale' }).check();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 5 — photos (facultatif)
    await expect(page.getByRole('heading', { name: 'Ajoute des photos' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 6 — remise de la paire
    await page.getByRole('button', { name: /Envoi postal/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 7 — coordonnées
    await page.getByLabel(/^Prénom/).fill('Camille');
    await page.getByLabel(/^Nom/).fill('Durand');
    await page.getByLabel(/^E-mail/).fill('camille@exemple.fr');
    await page.getByLabel(/^Code postal/).fill('75011');
    await page.getByLabel(/^Ville/).fill('Paris');
    await page.getByRole('checkbox', { name: /J'accepte/ }).check();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // 8 — récapitulatif : les saisies sont bien reportées.
    await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
    await expect(page.locator('dl').first().getByText('New Balance 990v6')).toBeVisible();
    await expect(page.locator('dl').first().getByText('Suède', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tout est exact' }).click();

    // 9 — envoi : la route n'est pas raccordée, et le dit.
    await page.getByRole('button', { name: /Envoyer ma demande/ }).click();
    await expect(page.getByText(/n'est pas encore raccordé/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('le retour en arrière ne perd aucune saisie', async ({ page }) => {
    await gotoReady(page, '/nettoyage/commande');
    await page.getByRole('button', { name: /Essential Clean/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel(/^Marque/).fill('adidas');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByLabel(/^Marque/)).toHaveValue('adidas');
  });

  test('la prestation choisie depuis la landing est pré-remplie', async ({ page }) => {
    await gotoReady(page, '/nettoyage/commande?prestation=restore');
    await expect(page.getByRole('button', { name: /Restore/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test("l'ajout de photos affiche un aperçu et permet le retrait", async ({ page }) => {
    await gotoReady(page, '/nettoyage/commande');
    await page.getByRole('button', { name: /Essential Clean/ }).click();
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer' }).click();

    // 2 — 3 — 4 exigent des saisies : on repart depuis l'étape photos
    // en remplissant le minimum.
    await gotoReady(page, '/nettoyage/commande');
    await page.getByRole('button', { name: /Essential Clean/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel(/^Marque/).fill('Nike');
    await page.getByLabel(/^Modèle/).fill('Air Max 1');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel(/^Matière principale/).selectOption('Cuir');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('checkbox', { name: 'Taches' }).check();
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page.getByRole('heading', { name: 'Ajoute des photos' })).toBeVisible();
    await page.setInputFiles('#photos', path.join(__dirname, 'fixtures', 'paire.png'));

    await expect(page.getByText('1 photo sur 8')).toBeVisible();
    await expect(page.getByRole('img', { name: /Aperçu de paire.png/ })).toBeVisible();

    await page.getByRole('button', { name: /Retirer paire.png/ }).click();
    await expect(page.getByText('Aucune photo ajoutée.')).toBeVisible();
  });

  test('le comparateur avant/après se déplace au clavier', async ({ page }) => {
    await gotoReady(page, '/avant-apres');
    const slider = page.getByRole('slider').first();
    await slider.focus();

    const before = await slider.getAttribute('aria-valuenow');
    await slider.press('ArrowDown');
    await slider.press('ArrowDown');
    const after = await slider.getAttribute('aria-valuenow');
    expect(Number(after)).toBeGreaterThan(Number(before));

    await slider.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await slider.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  test('les filtres de la galerie avant/après fonctionnent', async ({ page }) => {
    await gotoReady(page, '/avant-apres');
    const count = page.getByText(/^\d+ intervention/);
    const initial = await count.innerText();

    await page.getByRole('button', { name: 'Suède', exact: true }).click();
    await expect(count).not.toHaveText(initial);

    await page.getByRole('button', { name: 'Tout afficher' }).click();
    await expect(count).toHaveText(initial);
  });

  test('le suivi refuse une référence mal formée et ne fabrique aucun dossier', async ({ page }) => {
    await gotoReady(page, '/suivi');
    await page.getByLabel(/^Référence/).fill('bidon');
    await page.getByRole('button', { name: 'Voir le suivi' }).click();
    await expect(page.getByText(/ressemble à NF-/)).toBeVisible();

    await gotoReady(page, '/suivi/NF-A1B2C3');
    await expect(page.getByText(/Aucun dossier pour NF-A1B2C3/)).toBeVisible();
  });

  test('le parcours tient sur un écran de téléphone', async ({ page }) => {
    await gotoReady(page, '/nettoyage/commande');
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: /Deep Clean/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
