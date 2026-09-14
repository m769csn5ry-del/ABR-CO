/* Parcours de bout en bout de la console d'exploitation.
 *
 *   node tests/console-e2e.mjs      (nécessite playwright-core et un Chromium)
 *   PLAYWRIGHT_MODULES=/chemin/vers/node_modules node tests/console-e2e.mjs
 *
 * Le test échoue si un parcours casse OU si une erreur console apparaît. Il
 * contrôle aussi le fond, pas seulement l'affichage : une annonce faible doit
 * être notée comme faible, l'optimisation doit produire un gain mesurable, et
 * aucun défaut de langue ne doit atteindre le texte généré.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pw = process.env.PLAYWRIGHT_MODULES
  ? createRequire(path.join(process.env.PLAYWRIGHT_MODULES, 'noop.js'))('playwright-core')
  : (await import('playwright-core'));
const chromium = pw.chromium || pw.default?.chromium;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.TEST_PORT || 4399);
const BASE = `http://127.0.0.1:${PORT}`;
const EXE = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = []; const errors = [];
let page;
const step = async (name, fn) => {
  const t0 = Date.now();
  try{ await fn(); results.push({name, ok:true}); console.log(`  OK   ${name} (${Date.now()-t0} ms)`); }
  catch(err){ results.push({name, ok:false}); console.log(`  ÉCHEC ${name} — ${err.message}`); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };
const goto = async (hash) => { await page.goto(`${BASE}/console.html${hash}`, { waitUntil:'networkidle' }); await page.waitForTimeout(400); };

const server = spawn(process.execPath, ['server/server.js'], { cwd:ROOT, env:{...process.env, PORT:String(PORT)}, stdio:'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath:EXE, args:['--no-sandbox'] });
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, locale:'fr-FR' });
page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text()); });
page.on('pageerror', e => errors.push('pageerror: '+e.message));

try{
  await step('Amorçage : session, démonstration chargée, navigation', async () => {
    await goto('#/');
    await page.waitForTimeout(2500);
    await goto('#/');
    assert(await page.locator('.sidebar .nav-item').count() >= 5, 'navigation incomplète');
    assert(await page.locator('.tile').count() >= 3, 'tuiles de synthèse absentes');
    const txt = await page.locator('#outlet').innerText();
    assert(txt.includes('démonstration'), 'jeu de démonstration absent du tableau de bord');
  });

  await step('Tableau de bord : tâches dérivées de l’état réel', async () => {
    await goto('#/');
    const t = await page.locator('.task').count();
    assert(t >= 1, `aucune tâche dérivée (${t})`);
  });

  await step('Dossiers : pipeline par étape', async () => {
    await goto('#/dossiers');
    assert(await page.locator('.stage-col').count() >= 8, 'colonnes d’étapes manquantes');
    assert(await page.locator('.mini').count() >= 3, 'dossiers de démonstration absents');
  });

  await step('Page d’analyse : score, potentiel, axes, problèmes priorisés', async () => {
    await goto('#/dossiers');
    const links = await page.locator('.mini').all();
    let found = false;
    for (const l of links){
      const txt = await l.innerText();
      if (txt.includes('Studio Gare')){ await l.click(); found = true; break; }
    }
    assert(found, 'dossier « Studio Gare » introuvable');
    await page.waitForTimeout(300);
    const url = page.url();
    const id = url.split('/dossier/')[1].split('/')[0];
    await goto(`#/dossier/${id}/analyse`);
    const score = await page.locator('.score-big').innerText();
    assert(/\d+/.test(score), 'score global absent');
    const total = Number(score.match(/\d+/)[0]);
    assert(total < 45, `annonce faible attendue sous 45, obtenu ${total}`);
    assert((await page.locator('.axis').count()) === 10, 'dix axes attendus');
    assert((await page.locator('.problem').count()) >= 5, 'problèmes priorisés absents');
    assert((await page.locator('#outlet').innerText()).toLowerCase().includes('potentiel atteignable'), 'potentiel absent');
  });

  await step('Optimisation : avant / après, écart de score, validation', async () => {
    await goto('#/dossiers');
    const links = await page.locator('.mini').all();
    for (const l of links){
      if ((await l.innerText()).includes('T3 Krutenau')){ await l.click(); break; }
    }
    await page.waitForTimeout(300);
    const id = page.url().split('/dossier/')[1].split('/')[0];
    await goto(`#/dossier/${id}/optimisation`);
    assert((await page.locator('.compare-col').count()) === 2, 'comparaison avant/après absente');
    const txt = await page.locator('#outlet').innerText();
    assert(txt.toLowerCase().includes('score d’origine'), 'score d’origine absent');
    assert(txt.includes('publiée') || txt.includes('validée'), 'état de version absent');
    const ecart = txt.match(/\+(\d+) pts/);
    assert(ecart && Number(ecart[1]) >= 5, `écart de score trop faible : ${ecart ? ecart[1] : 'aucun'}`);
    assert(!/de un |de une |non_communiqué|undefined|NaN/.test(txt), 'défaut de langue dans le texte généré');
  });

  await step('Performances : comparaison normalisée et réserve de fiabilité', async () => {
    await goto('#/dossiers');
    const links = await page.locator('.mini').all();
    for (const l of links){ if ((await l.innerText()).includes('T3 Krutenau')){ await l.click(); break; } }
    await page.waitForTimeout(300);
    const id = page.url().split('/dossier/')[1].split('/')[0];
    await goto(`#/dossier/${id}/performances`);
    const txt = await page.locator('#outlet').innerText();
    assert(txt.includes('Avant / jour'), 'tableau de comparaison absent');
    assert(txt.includes('corrélés'), 'réserve de causalité absente');
  });

  await step('Finances : trace de calcul de la commission', async () => {
    await goto('#/dossiers');
    const links = await page.locator('.mini').all();
    for (const l of links){ if ((await l.innerText()).includes('T3 Krutenau')){ await l.click(); break; } }
    await page.waitForTimeout(300);
    const id = page.url().split('/dossier/')[1].split('/')[0];
    await goto(`#/dossier/${id}/finances`);
    assert((await page.locator('.trace tr').count()) >= 3, 'trace de calcul absente');
    const txt = await page.locator('#outlet').innerText();
    assert(txt.includes('Chaîne d’attribution'), 'chaîne d’attribution absente');
  });

  await step('Blocage expliqué sur un dossier incomplet', async () => {
    await goto('#/dossiers');
    const links = await page.locator('.mini').all();
    for (const l of links){ if ((await l.innerText()).includes('Robertsau')){ await l.click(); break; } }
    await page.waitForTimeout(300);
    const txt = await page.locator('#outlet').innerText();
    assert(txt.includes('bloque') || txt.includes('Prochaine action'), 'aucune explication de blocage');
  });

  await step('Pipeline commercial, clients, commissions, administration', async () => {
    for (const [hash, marker] of [['#/crm','Pipeline'],['#/clients','contrat'],
                                  ['#/commissions','commission'],['#/admin','Organisation']]){
      await goto(hash);
      const txt = await page.locator('body').innerText();
      assert(txt.toLowerCase().includes(marker.toLowerCase()), `page ${hash} : « ${marker} » absent`);
    }
  });

  await step('Administration : matrice des rôles et journaux', async () => {
    await goto('#/admin?onglet=equipe');
    assert((await page.locator('table tbody tr').count()) >= 10, 'matrice des autorisations absente');
    await goto('#/admin?onglet=audit');
    assert((await page.locator('table tbody tr').count()) >= 5, 'journal d’audit vide');
    await goto('#/admin?onglet=ia');
    assert((await page.locator('#outlet').innerText()).toLowerCase().includes('exécutions'), 'journal IA absent');
  });

  await step('Route inconnue : message clair', async () => {
    await goto('#/nexistepas');
    assert((await page.locator('body').innerText()).includes('introuvable'), 'page 404 absente');
  });

  await step('Responsive : 390 px et 820 px sans débordement', async () => {
    await page.setViewportSize({ width:390, height:844 });
    await goto('#/');
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(o <= 2, `débordement de ${o}px en mobile`);
    await page.setViewportSize({ width:820, height:1180 });
    await goto('#/dossiers');
    const o2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(o2 <= 2, `débordement de ${o2}px en tablette`);
    await page.setViewportSize({ width:1440, height:900 });
  });
} finally {
  await browser.close(); server.kill();
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} parcours validés`);
if (errors.length){ console.log(`\n${errors.length} erreur(s) console :`); [...new Set(errors)].slice(0,15).forEach(e => console.log('  - '+e)); }
process.exit(failed.length || errors.length ? 1 : 0);
