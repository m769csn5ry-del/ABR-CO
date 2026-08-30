/* Filet de sécurité : l'app se charge, navigue, crée une tâche et survit au
   responsive — sans erreur console. À lancer avant de considérer un changement fini. */
const { test, expect } = require('@playwright/test');

/* Collecte les erreurs console et les exceptions non rattrapées pour chaque test. */
function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test.describe('Orga', () => {
  test('se charge sans erreur console', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/todo/');
    await expect(page.locator('#viewTitle')).toHaveText("Aujourd'hui");
    await expect(page.locator('#view')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('les quatre onglets changent de vue', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/todo/');

    for (const [tab, titre] of [['upcoming', 'À venir'], ['projects', 'Projets'], ['habits', 'Séries']]) {
      await page.locator(`.tab[data-tab="${tab}"]`).click();
      await expect(page.locator('#viewTitle')).toHaveText(titre);
      await expect(page.locator(`.tab[data-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
    }

    await page.locator('.tab[data-tab="today"]').click();
    await expect(page.locator('#viewTitle')).toHaveText("Aujourd'hui");
    expect(errors).toEqual([]);
  });

  test('crée une tâche et la retrouve dans la vue', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/todo/');

    await page.locator('#add').click();
    const sheet = page.locator('#sheetTask');
    await expect(sheet).toBeVisible();

    const titre = 'Tester le site avec Playwright aujourd’hui';
    await page.locator('#fTitle').fill(titre);
    await page.locator('#taskSubmit').click();

    await expect(sheet).toBeHidden();
    await expect(page.locator('#view')).toContainText('Playwright');
    expect(errors).toEqual([]);
  });

  test('la feuille se ferme via Annuler et le scrim', async ({ page }) => {
    await page.goto('/todo/');
    const sheet = page.locator('#sheetTask');

    await page.locator('#add').click();
    await expect(sheet).toBeVisible();
    await page.locator('#taskCancel').click();
    await expect(sheet).toBeHidden();

    await page.locator('#add').click();
    await expect(sheet).toBeVisible();
    await page.locator('#scrim').click({ position: { x: 5, y: 5 } });
    await expect(sheet).toBeHidden();
  });
});

/* Le layout ne doit jamais déborder horizontalement, du petit iPhone au grand écran. */
test.describe('Responsive', () => {
  const tailles = [
    { nom: 'iPhone SE', width: 375, height: 667 },
    { nom: 'iPhone 15 Pro Max', width: 430, height: 932 },
    { nom: 'iPad', width: 768, height: 1024 },
    { nom: 'Bureau', width: 1440, height: 900 },
  ];

  for (const { nom, width, height } of tailles) {
    test(`pas de débordement horizontal — ${nom}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/todo/');
      await expect(page.locator('#viewTitle')).toBeVisible();

      const debord = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(debord).toBeLessThanOrEqual(1);

      // La barre d'onglets doit rester atteignable, pas poussée hors écran.
      await expect(page.locator('.tabbar')).toBeInViewport();
    });
  }
});
