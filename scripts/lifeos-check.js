/* Contrôle de bon fonctionnement : ouvre l'app dans Chromium, crée un profil,
   charge le jeu d'exemple, parcourt tous les écrans et signale la moindre
   erreur de console. Usage :
   NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-check.js [dossier-captures] */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.LIFEOS_URL || 'http://127.0.0.1:8099/';
const SHOTS = process.argv[2] || null;

const VIEWS = ['home', 'today', 'planning', 'calendar', 'tasks', 'projects',
               'goals', 'finance', 'habits', 'stats', 'notes', 'assistant', 'settings'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const errors = [];

  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Profil local + jeu d'exemple, sans passer par les fenêtres.
  await page.fill('.auth__panel input.input', 'Alex');
  await page.click('.auth__panel .btn--primary');
  await page.waitForSelector('.shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const L = window.LifeOS;
    L.store.update((s) => { L.seed.demo(s); }, 'demo');
  });
  // Ferme la fenêtre de bienvenue si elle est là.
  await page.waitForTimeout(700);
  if (await page.locator('.scrim').count()) await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  for (const view of VIEWS) {
    await page.evaluate((v) => { window.location.hash = '#/' + v; }, view);
    await page.waitForTimeout(450);
    const ok = await page.evaluate(() => !!document.querySelector('.view'));
    if (!ok) errors.push('écran vide : ' + view);
    if (SHOTS) {
      await page.screenshot({ path: path.join(SHOTS, 'desk-' + view + '.png'), fullPage: false });
    }
  }

  // Parcours fonctionnel : planning du jour, semaine, assistant, recherche.
  await page.evaluate(() => { window.location.hash = '#/planning?generate=day'; });
  await page.waitForTimeout(900);
  const blocks = await page.locator('.block').count();
  if (!blocks) errors.push('le planning du jour ne produit aucun bloc');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'flow-plan-day.png') });

  await page.evaluate(() => { window.location.hash = '#/planning?tab=week&generate=week'; });
  await page.waitForTimeout(900);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'flow-plan-week.png') });

  // Assistant : question locale
  const answers = await page.evaluate(async () => {
    const L = window.LifeOS;
    const qs = ['Quelles sont mes priorités ?', 'Combien ai-je dépensé ce mois-ci ?',
                'Organise ma soirée', 'Combien dois-je économiser par mois ?',
                "J'ai deux heures libres, que faire ?", 'Ajoute réviser les stats demain 14h 1h30',
                'Ajoute une dépense de 24,50 € en courses', 'Quels objectifs sont en retard ?'];
    const out = [];
    for (const q of qs) {
      const r = await L.assistant.ask(q);
      out.push({ q, intent: r.intent, text: (r.text || '').slice(0, 120) });
    }
    return out;
  });

  // Sélection multiple et actions groupées
  await page.evaluate(() => { window.location.hash = '#/tasks'; });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Sélectionner' }).click();
  await page.waitForTimeout(250);
  const rows = page.locator('.task');
  await rows.nth(0).locator('.checkbox').click();
  await rows.nth(1).locator('.checkbox').click();
  await page.waitForTimeout(250);
  if (!(await page.locator('.selbar').count())) errors.push('la barre de sélection n\'apparaît pas');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'flow-selection.png') });
  const beforeBulk = await page.evaluate(() => window.LifeOS.tasks.filter({ status: 'done' }).length);
  await page.getByRole('button', { name: 'Terminer', exact: true }).first().click();
  await page.waitForTimeout(500);
  const afterBulk = await page.evaluate(() => window.LifeOS.tasks.filter({ status: 'done' }).length);
  if (afterBulk !== beforeBulk + 2) errors.push('l\'action groupée n\'a pas terminé les deux tâches (' + beforeBulk + ' → ' + afterBulk + ')');
  await page.evaluate(() => window.LifeOS.store.undo());
  await page.waitForTimeout(300);

  // Glisser-déposer dans le calendrier : une tâche change de jour
  await page.evaluate(() => { window.location.hash = '#/calendar?mode=month'; });
  await page.waitForTimeout(500);
  const dragResult = await page.evaluate(() => {
    const pill = document.querySelector('.cal-pill--task');
    if (!pill) return { skipped: true };
    const cells = Array.from(document.querySelectorAll('.cal-day'));
    const target = cells[20];
    const dt = new DataTransfer();
    pill.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
    target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    const payload = String(dt.getData('text/plain') || '').split(':');
    return { id: payload[1], from: payload[2] };
  });
  if (!dragResult.skipped) {
    await page.waitForTimeout(400);
    const movedTo = await page.evaluate((id) => {
      const t = window.LifeOS.tasks.get(id);
      return t ? t.date : null;
    }, dragResult.id);
    if (!movedTo || movedTo === dragResult.from) {
      errors.push('le glisser-déposer du calendrier ne déplace rien (' + dragResult.from + ' → ' + movedTo + ')');
    }
    await page.evaluate(() => window.LifeOS.store.undo());
    await page.waitForTimeout(200);
  }

  // Barre de commandes
  await page.evaluate(() => { window.location.hash = '#/home'; });
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(350);
  await page.keyboard.type('révis');
  await page.waitForTimeout(400);
  const paletteItems = await page.locator('.palette__item').count();
  if (!paletteItems) errors.push('la barre de commandes ne renvoie rien');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'flow-palette.png') });
  await page.keyboard.press('Escape');

  // Mode sombre + mobile
  await page.evaluate(() => {
    window.LifeOS.store.setSetting('theme', 'dark');
    window.LifeOS.app.applyTheme();
  });
  await page.waitForTimeout(400);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'desk-dark-home.png') });

  const touchCtx = await browser.newContext({
    viewport: { width: 390, height: 844 }, locale: 'fr-FR',
    hasTouch: true, isMobile: true, deviceScaleFactor: 3
  });
  const mobile = await touchCtx.newPage();
  mobile.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(BASE, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(800);
  for (const view of ['home', 'today', 'tasks', 'calendar', 'assistant', 'finance']) {
    await mobile.evaluate((v) => { window.location.hash = '#/' + v; }, view);
    await mobile.waitForTimeout(450);
    if (SHOTS) await mobile.screenshot({ path: path.join(SHOTS, 'mob-' + view + '.png') });
  }
  // Geste latéral sur une ligne de tâche (téléphone)
  await mobile.evaluate(() => { window.location.hash = '#/tasks'; });
  await mobile.waitForTimeout(500);
  const swipeTarget = mobile.locator('.swipe .task').first();
  if (await swipeTarget.count()) {
    const box = await swipeTarget.boundingBox();
    const titleBefore = await swipeTarget.locator('.task__title').textContent();
    await mobile.evaluate(({ x, y }) => {
      const node = document.querySelector('.swipe .task');
      const touch = (cx) => ({ clientX: cx, clientY: y });
      node.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(x)], bubbles: true }));
      node.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(x + 60)], bubbles: true }));
      node.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(x + 140)], bubbles: true }));
      node.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
    }, { x: box.x + 30, y: box.y + box.height / 2 });
    await mobile.waitForTimeout(500);
    const done = await mobile.evaluate((title) => {
      const t = window.LifeOS.store.state.tasks.filter((x) => x.title === title)[0];
      return t ? t.status : null;
    }, titleBefore);
    if (done !== 'done') errors.push('le geste vers la droite ne termine pas la tâche (statut ' + done + ')');
    await mobile.evaluate(() => window.LifeOS.store.undo());
    await mobile.waitForTimeout(200);
  }

  // Débordement horizontal : le pire défaut sur téléphone.
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) errors.push('débordement horizontal sur mobile : ' + overflow + 'px');

  await browser.close();

  console.log('\n--- Assistant ---');
  answers.forEach((a) => console.log('•', a.q, '→', a.intent, '|', a.text.replace(/\n/g, ' ⏎ ')));
  console.log('\n--- Erreurs ---');
  if (errors.length) { errors.forEach((e) => console.log('✗', e)); process.exitCode = 1; }
  else console.log('Aucune erreur.');
})();
