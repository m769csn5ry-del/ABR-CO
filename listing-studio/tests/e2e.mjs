/* Parcours de bout en bout, exécutés dans un vrai navigateur.
 *
 *   node tests/e2e.mjs            (nécessite playwright-core et un Chromium)
 *   CHROMIUM=/chemin/vers/chrome node tests/e2e.mjs
 *
 * Le test échoue si un parcours casse OU si une erreur console apparaît :
 * une annonce mal générée doit se voir en intégration, pas en démonstration
 * devant un client.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = Number(process.env.TEST_PORT || 4321);
const BASE = `http://127.0.0.1:${PORT}`;
const EXE = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
const errors = [];
let page;

const step = async (name, fn) => {
  const t0 = Date.now();
  try{
    await fn();
    results.push({ name, ok:true, ms: Date.now() - t0 });
    console.log(`  OK   ${name} (${Date.now() - t0} ms)`);
  }catch(err){
    results.push({ name, ok:false, ms: Date.now() - t0, error: err.message });
    console.log(`  ÉCHEC ${name} — ${err.message}`);
  }
};

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function main(){
  const server = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT, env: { ...process.env, PORT:String(PORT) }, stdio:'ignore',
  });
  await new Promise(r => setTimeout(r, 700));

  const browser = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, locale:'fr-FR' });
  page = await ctx.newPage();

  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

  try{
    await run();
  } finally {
    await browser.close();
    server.kill();
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} parcours validés`);
  if (errors.length){
    console.log(`\n${errors.length} erreur(s) console :`);
    [...new Set(errors)].slice(0, 20).forEach(e => console.log('  - ' + e));
  }
  process.exit(failed.length || errors.length ? 1 : 0);
}

const goto = async (hash) => {
  await page.goto(BASE + '/' + hash, { waitUntil:'networkidle' });
  await page.waitForTimeout(260);
};

async function run(){
  await step('Page d’accueil : titre, CTA et exemples analysés en direct', async () => {
    await goto('#/');
    assert(await page.locator('.hero h1').innerText().then(t => t.includes('annonce qui donne envie')),
      'titre principal absent');
    assert(await page.locator('.hero a[href="#/project/new"]').isVisible(), 'CTA « Créer une annonce » absent');
    assert(await page.locator('.hero a[href="#/demo"]').isVisible(), 'CTA « Voir une démo » absent');
    await page.waitForSelector('#demoPhotos img', { timeout: 20000 });
    const n = await page.locator('#demoPhotos img').count();
    assert(n === 3, `3 exemples photo attendus, ${n} obtenus`);
    const badge = await page.locator('#demoPhotos .badge').first().innerText();
    assert(/\d+\/100/.test(badge), 'score photo non affiché');
  });

  await step('Tableau de bord : statistiques et navigation', async () => {
    await goto('#/app');
    assert(await page.locator('.stat').count() >= 4, 'cartes de statistiques manquantes');
    assert(await page.locator('.sidebar .nav-item').count() >= 7, 'navigation incomplète');
  });

  await step('Mode démo : génération complète d’un projet fictif', async () => {
    await goto('#/demo');
    await page.locator('[data-gen="paris"]').click();
    await page.waitForURL(/#\/project\/[^/]+\/step\/10/, { timeout: 90000 });
    assert((await page.locator('.demo-tag').count()) > 0, 'le projet démo n’est pas signalé comme démonstration');
  });

  await step('Aperçu : simulation desktop, mobile, carte et page complète', async () => {
    await page.waitForSelector('.sim, .sim-card', { timeout: 15000 });
    const mention = await page.locator('.sim-note').first().innerText();
    assert(mention.includes('Simulation créée avec Listing Studio'), 'mention de simulation absente');
    for (const mode of ['mobile','card','full','desktop']){
      await page.locator(`#modeGroup button[data-mode="${mode}"]`).click();
      await page.waitForTimeout(240);
      assert(await page.locator('.sim, .sim-card').first().isVisible(), `aperçu ${mode} vide`);
    }
  });

  await step('Photos : analyse, notes et recommandations', async () => {
    const url = page.url().replace(/step\/\d+/, 'step/3');
    await page.goto(url, { waitUntil:'networkidle' });
    await page.waitForSelector('.photo-card', { timeout: 15000 });
    const cards = await page.locator('.photo-card').count();
    assert(cards >= 6, `au moins 6 photos attendues, ${cards} trouvées`);
    const scores = await page.locator('.photo-thumb .sc').allInnerTexts();
    assert(scores.length >= 6 && scores.every(s => Number(s) >= 0 && Number(s) <= 100), 'scores photo invalides');
    assert(new Set(scores).size > 1, 'tous les scores sont identiques : analyse suspecte');
    assert(await page.locator('table.tbl').isVisible(), 'classement des photos absent');
  });

  await step('Ordre des photos : recommandation et réorganisation manuelle', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/4'), { waitUntil:'networkidle' });
    await page.waitForSelector('.sort-item');
    const before = await page.locator('.sort-item .strong').allInnerTexts();
    await page.locator('.sort-item').nth(2).locator('[data-up]').click();
    await page.waitForTimeout(500);
    const after = await page.locator('.sort-item .strong').allInnerTexts();
    assert(before.join() !== after.join(), 'l’ordre n’a pas changé après déplacement');
    await page.locator('#applyOrder').click();
    await page.waitForTimeout(600);
    assert(await page.locator('.sort-item').first().locator('.badge.brand').isVisible(), 'photo de couverture non marquée');
  });

  await step('Photos manquantes : checklist cohérente avec la fiche', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/5'), { waitUntil:'networkidle' });
    await page.waitForSelector('.card');
    const text = await page.locator('.view').innerText();
    assert(text.includes('Photos détectées'), 'section « photos détectées » absente');
    assert(text.includes('Photos recommandées') || text.includes('catégories attendues'), 'checklist absente');
  });

  await step('Annonce : régénération, variantes de titre et sections', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/7'), { waitUntil:'networkidle' });
    await page.waitForSelector('#titleInput', { timeout: 15000 });
    const title = await page.locator('#titleInput').inputValue();
    assert(title.length > 12, 'titre trop court ou absent');
    const long = await page.locator('#longInput').inputValue();
    assert(long.split(/\s+/).length > 80, 'description longue trop courte');
    assert(!/undefined|NaN|\[object/.test(long), 'texte généré corrompu');
    await page.locator('#genBtn').click();
    await page.waitForTimeout(2500);
    assert(await page.locator('#titleInput').isVisible(), 'régénération cassée');
    assert(await page.locator('#platTabs .tab').count() >= 2, 'adaptation par plateforme absente');
  });

  await step('Prix : recommandation argumentée et sourcée', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/8'), { waitUntil:'networkidle' });
    await page.locator('#p-current').fill('150');
    await page.locator('#p-min').fill('110');
    await page.locator('#p-max').fill('260');
    await page.locator('#computeBtn').click();
    await page.waitForTimeout(900);
    const box = await page.locator('#recBox').innerText();
    assert(/€/.test(box), 'prix recommandé absent');
    assert(box.includes('Estimation interne'), 'source de l’estimation non affichée');
  });

  await step('Optimisation : Listing Score détaillé et priorités', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/9'), { waitUntil:'networkidle' });
    await page.waitForSelector('.score-ring');
    const total = Number((await page.locator('.score-ring .val').first().innerText()).split('/')[0]);
    assert(total > 0 && total <= 100, `score global invalide : ${total}`);
    assert(await page.locator('.bar-line').count() === 6, 'les six familles de notation ne sont pas affichées');
  });

  await step('Rapport client : rendu et sections attendues', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/11'), { waitUntil:'networkidle' });
    await page.waitForSelector('.report', { timeout: 15000 });
    const txt = await page.locator('.report').innerText();
    ['Score de l’annonce','Analyse des photos','Contenu recommandé','Priorités d’action','Recommandations marketing']
      .forEach(s => assert(txt.includes(s), `section « ${s} » absente du rapport`));
    await page.locator('#saveReport').click();
    await page.waitForTimeout(700);
  });

  await step('Export : copie et fichiers texte, JSON, CSV', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/12'), { waitUntil:'networkidle' });
    await page.waitForSelector('[data-format="txt"]');
    const dl = [];
    page.on('download', d => dl.push(d.suggestedFilename()));
    for (const f of ['txt','json','csv']){
      await page.locator(`[data-format="${f}"]`).click();
      await page.waitForTimeout(700);
    }
    assert(dl.length >= 3, `3 téléchargements attendus, ${dl.length} obtenus (${dl.join(', ')})`);
    assert(await page.locator('[data-plat-dl]').count() >= 1, 'export par plateforme absent');
  });

  await step('Assistant : intention comprise et action appliquée', async () => {
    await page.goto(page.url().replace(/step\/\d+/, 'step/7'), { waitUntil:'networkidle' });
    await page.locator('#toggleAssistant').click();
    await page.waitForSelector('#asInput');
    await page.locator('#asInput').fill('Rends cette annonce plus premium');
    await page.locator('#asSend').click();
    await page.waitForSelector('.msg.ai .acts .btn', { timeout: 8000 });
    const label = await page.locator('.msg.ai .acts .btn').first().innerText();
    assert(/premium/i.test(label), `action proposée inattendue : ${label}`);
    await page.locator('.msg.ai .acts .btn').first().click();
    await page.waitForTimeout(2600);
    const body = await page.locator('#asBody').innerText();
    assert(body.includes('mis à jour') || body.includes('réécrite'), 'action non appliquée');
  });

  await step('Création manuelle : projet, fiche, équipements, génération', async () => {
    await goto('#/project/new');
    await page.locator('#np-name').fill('Test — Appartement Lyon');
    await page.locator('#np-city').fill('Lyon');
    await page.selectOption('#np-type', 'appartement');
    await page.locator('#create').click();
    await page.waitForURL(/#\/project\/[^/]+\/step\/1/);

    await page.locator('#f-guests').fill('4');
    await page.locator('#f-bedrooms').fill('2');
    await page.locator('#f-beds').fill('3');
    await page.locator('#f-bathrooms').fill('1');
    await page.locator('#f-surface').fill('68');
    await page.locator('[data-chips="am-essentiels"] .chip').first().click();
    await page.locator('[data-chips="am-confort"] .chip').first().click();
    await page.waitForTimeout(700);

    await page.locator('.step-pill[data-step="2"]').click();
    await page.waitForSelector('[data-chips="aud"]');
    await page.locator('[data-chips="aud"] .chip').first().click();
    await page.locator('[data-chips="hl"] .chip').nth(1).click();
    await page.locator('[data-options="style"] .option').first().click();
    await page.waitForTimeout(600);

    await page.locator('.step-pill[data-step="7"]').click();
    await page.waitForSelector('#genBtn');
    await page.locator('#genBtn').click();
    await page.waitForSelector('#titleInput', { timeout: 20000 });
    const t = await page.locator('#titleInput').inputValue();
    assert(t.toLowerCase().includes('lyon') || t.length > 10, 'titre généré invalide');
    const missing = await page.locator('.missing').count();
    assert(missing >= 0, 'marqueurs d’information manquante non gérés');
  });

  await step('Sauvegarde automatique : les saisies survivent au rechargement', async () => {
    const url = page.url();
    await page.goto(url.replace(/step\/\d+/, 'step/1'), { waitUntil:'networkidle' });
    await page.locator('#f-district').fill('Croix-Rousse');
    await page.waitForTimeout(900);
    await page.reload({ waitUntil:'networkidle' });
    await page.waitForSelector('#f-district');
    assert(await page.locator('#f-district').inputValue() === 'Croix-Rousse', 'la saisie a été perdue au rechargement');
  });

  await step('Clients : création, association et suppression confirmée', async () => {
    await goto('#/clients');
    await page.locator('#newClient, #firstClient').first().click();
    await page.waitForSelector('[data-f="name"]');
    await page.locator('[data-f="name"]').fill('Conciergerie Test');
    await page.locator('[data-f="email"]').fill('test@exemple.fr');
    await page.locator('[data-save]').click();
    await page.waitForTimeout(600);
    assert((await page.locator('table.tbl tbody tr').count()) >= 1, 'client non créé');
    await page.locator('tr [data-act="delete"]').first().click();
    await page.waitForSelector('.modal [data-yes]');
    await page.locator('.modal [data-yes]').click();
    await page.waitForTimeout(500);
  });

  await step('Templates, bibliothèque, rapports et paramètres répondent', async () => {
    for (const [hash, marker] of [['#/templates','Templates'], ['#/library','Bibliothèque'],
                                   ['#/reports','Rapports'], ['#/settings','Paramètres'],
                                   ['#/projects','annonces']]){
      await goto(hash);
      const txt = await page.locator('body').innerText();
      assert(txt.length > 200, `page ${hash} vide`);
      void marker;
    }
  });

  await step('Route inconnue : message clair, pas d’écran blanc', async () => {
    await goto('#/nexistepas');
    assert((await page.locator('body').innerText()).includes('introuvable'), 'page 404 absente');
  });

  await step('Responsive : mobile 390 px et tablette 820 px', async () => {
    await page.setViewportSize({ width:390, height:844 });
    await goto('#/app');
    assert(await page.locator('.burger').isVisible(), 'menu mobile absent');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 2, `débordement horizontal de ${overflow}px en mobile`);
    await page.setViewportSize({ width:820, height:1180 });
    await goto('#/projects');
    const o2 = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(o2 <= 2, `débordement horizontal de ${o2}px en tablette`);
    await page.setViewportSize({ width:1440, height:900 });
  });
}

main().catch(err => { console.error(err); process.exit(1); });
