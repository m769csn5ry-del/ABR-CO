/* Suite de vérifications de LifeOS, exécutée dans un vrai navigateur.
   On y contrôle ce qui compte : les calculs (objectifs, budgets, planning),
   les liens entre modules, l'isolation des profils, le chiffrement et les
   sauvegardes. Usage :
   NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-test.js */
const { chromium } = require('playwright');
const BASE = process.env.LIFEOS_URL || 'http://127.0.0.1:8099/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const crashes = [];
  page.on('pageerror', (e) => crashes.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('.auth__panel input.input', 'Test');
  await page.click('.auth__panel .btn--primary');
  await page.waitForSelector('.shell');
  await page.waitForTimeout(500);
  if (await page.locator('.scrim').count()) await page.keyboard.press('Escape');

  const results = await page.evaluate(async () => {
    const L = window.LifeOS;
    const D = L.date;
    const out = [];
    const ok = (name, cond, detail) => out.push({ name, pass: !!cond, detail: detail || '' });
    const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.01 : eps);

    /* --- 1. état vierge, structure de départ --- */
    ok('8 domaines par défaut', L.domains.all().length === 8, L.domains.all().length + ' domaines');
    ok('9 habitudes par défaut', L.habits.all().length === 9);
    ok('catégories de dépense présentes', L.finance.categories('expense').length >= 10);

    /* --- 2. tâches : création, sous-tâches, récurrence --- */
    const t1 = L.tasks.create({ title: 'Tâche test', estimate: 45, priority: 1, date: D.today() });
    ok('création de tâche', L.tasks.get(t1.id) && L.tasks.get(t1.id).title === 'Tâche test');

    L.tasks.addSubtask(t1.id, 'a');
    L.tasks.addSubtask(t1.id, 'b');
    const subs = L.tasks.get(t1.id).subtasks;
    L.tasks.toggleSubtask(t1.id, subs[0].id);
    L.tasks.toggleSubtask(t1.id, subs[1].id);
    ok('toutes les sous-tâches cochées terminent la tâche', L.tasks.get(t1.id).status === 'done');

    const rec = L.tasks.create({
      title: 'Récurrente', date: D.today(), estimate: 20,
      recurrence: { freq: 'daily', interval: 1, start: D.today() }
    });
    const spawned = L.tasks.setStatus(rec.id, 'done');
    ok('une tâche récurrente engendre l\'occurrence suivante',
      spawned && spawned.date === D.addDays(D.today(), 1), spawned ? spawned.date : 'aucune');
    ok('l\'occurrence terminée reste dans l\'historique', L.tasks.get(rec.id).status === 'done');

    /* --- 3. report --- */
    const t2 = L.tasks.create({ title: 'À reporter', date: D.today() });
    L.tasks.postpone(t2.id, D.addDays(D.today(), 3));
    ok('report de tâche', L.tasks.get(t2.id).date === D.addDays(D.today(), 3));

    /* --- 4. projet : l'avancement vient des tâches --- */
    const p = L.projects.create({ name: 'Projet test' });
    const pt1 = L.tasks.create({ title: 'P1', projectId: p.id, estimate: 60 });
    const pt2 = L.tasks.create({ title: 'P2', projectId: p.id, estimate: 60 });
    ok('projet vide à 0 %', L.projects.summary(p).percent === 0);
    L.tasks.setStatus(pt1.id, 'done');
    ok('projet à 50 % après une tâche sur deux', L.projects.summary(p).percent === 50,
      L.projects.summary(p).percent + ' %');
    L.tasks.setStatus(pt2.id, 'done');
    ok('projet à 100 %', L.projects.summary(p).percent === 100);

    /* --- 5. objectif branché sur les tâches --- */
    const g = L.goals.create({ name: 'Objectif tâches', target: 100, unit: '%', source: { type: 'tasks' }, projectIds: [p.id] });
    ok('objectif « tâches » à 100 %', L.goals.summary(g).current === 100, L.goals.summary(g).current + '');

    /* --- 6. objectif d'épargne et rythme nécessaire --- */
    const acc = L.finance.createAccount({ name: 'Épargne test', kind: 'épargne', opening: 0 });
    const gs = L.goals.create({
      name: 'Économiser', start: 1500, target: 4500, unit: '€',
      startDate: D.today(), targetDate: D.addDays(D.today(), 300),
      source: { type: 'savings', accountId: acc.id }
    });
    L.finance.create({ type: 'saving', amount: 500, date: D.today(), toAccountId: acc.id, goalId: gs.id });
    const gsum = L.goals.summary(gs);
    ok('épargne liée comptée dans l\'objectif', gsum.current === 2000, gsum.current + ' €');
    ok('reste à épargner', gsum.remaining === 2500, gsum.remaining + ' €');
    ok('rythme mensuel calculé', near(gsum.perMonth, 2500 / (300 / 30.44), 1), Math.round(gsum.perMonth) + ' €/mois');
    ok('pas de double comptage (goalId + compte)',
      L.goals.value(gs) === 2000, L.goals.value(gs) + '');

    /* --- 7. finances : soldes et budget --- */
    const courant = L.finance.accounts()[0];
    const before = L.finance.balance(courant.id);
    L.finance.create({ type: 'income', amount: 1000, accountId: courant.id, date: D.today() });
    L.finance.create({ type: 'expense', amount: 300, accountId: courant.id, date: D.today() });
    ok('solde = ouverture + entrées − sorties',
      near(L.finance.balance(courant.id), before + 700), L.finance.balance(courant.id) + '');

    L.store.setSetting('finance.monthlyBudget', 200);
    const budget = L.finance.budget();
    ok('budget dépassé détecté', budget.global && budget.global.state === 'over', budget.global.state);

    const m = L.finance.month();
    ok('taux d\'épargne cohérent', m.rate > 0 && m.rate <= 1, Math.round(m.rate * 100) + ' %');

    /* --- 8. habitudes : séries et taux --- */
    const hb = L.habits.create({ name: 'Test quotidien', kind: 'check', days: [0, 1, 2, 3, 4, 5, 6] });
    for (let i = 0; i < 5; i++) L.habits.log(hb.id, D.addDays(D.today(), -i), 1);
    ok('série d\'habitude de 5 jours', L.habits.streak(hb).current === 5, L.habits.streak(hb).current + '');
    ok('taux sur 7 jours', near(L.habits.rate(hb, 7).ratio, 5 / 7, 0.02));
    const hbMax = L.habits.create({ name: 'Écran', kind: 'duration', target: 60, direction: 'at_most' });
    L.habits.log(hbMax.id, D.today(), 30);
    ok('objectif « au plus » respecté', L.habits.isDone(hbMax, D.today()));
    L.habits.log(hbMax.id, D.today(), 90);
    ok('objectif « au plus » dépassé', !L.habits.isDone(hbMax, D.today()));

    /* --- 9. calendrier : créneaux libres --- */
    L.store.setSetting('day.start', '08:00');
    L.store.setSetting('day.end', '20:00');
    const evDay = D.addDays(D.today(), 2);
    L.calendar.create({ title: 'Réunion', date: evDay, start: '10:00', end: '12:00' });
    const slots = L.calendar.freeSlots(evDay, { fromNow: false });
    const free = L.calendar.availableMinutes(evDay, { fromNow: false });
    ok('un rendez-vous découpe la journée en deux créneaux', slots.length === 2, slots.length + ' créneaux');
    ok('temps libre = plage − rendez-vous', free === 12 * 60 - 120, free + ' min');

    /* --- 10. planning : rien ne chevauche, rien ne sort de la plage --- */
    for (let i = 0; i < 5; i++) {
      L.tasks.create({ title: 'Bloc ' + i, date: evDay, estimate: 60, priority: 1, energy: 'medium' });
    }
    const plan = L.planner.build(evDay, { fromNow: false });
    const blocks = plan.blocks.slice().sort((a, b) => a.start - b.start);
    let overlap = false, outside = false;
    for (let i = 1; i < blocks.length; i++) if (blocks[i].start < blocks[i - 1].end) overlap = true;
    blocks.forEach((b) => { if (b.start < 8 * 60 || b.end > 20 * 60) outside = true; });
    ok('aucun chevauchement dans le planning', !overlap);
    ok('aucun bloc hors de la plage de la journée', !outside);
    ok('le rendez-vous est repris comme bloc fixe',
      blocks.some((b) => b.type === 'event' && b.start === 600 && b.end === 720));
    ok('des tâches sont placées', blocks.filter((b) => b.type === 'task').length > 0);

    /* Accepter le planning date et heure les tâches. */
    L.planner.accept(plan);
    const firstTaskBlock = plan.blocks.filter((b) => b.type === 'task' && !b.fixed)[0];
    if (firstTaskBlock) {
      const t = L.tasks.get(firstTaskBlock.refId);
      ok('accepter le planning inscrit l\'heure sur la tâche',
        t && t.date === evDay && t.time === D.toTime(firstTaskBlock.start), t ? t.date + ' ' + t.time : 'absente');
    }

    /* --- 11. planification de la semaine --- */
    const week = L.weekly.build();
    ok('la semaine propose des priorités', week.priorities.length > 0);
    ok('la semaine couvre sept jours', week.days.length === 7);
    /* Ce que l'on contrôle, c'est la répartition : les tâches déjà posées à
       une heure par l'utilisateur peuvent légitimement dépasser la capacité,
       mais la semaine ne doit pas en rajouter par-dessus. */
    const badlyFilled = week.days.filter((d) => {
      if (d.past) return false;
      const placed = d.tasks.filter((t) => !t.fixed);
      const placedMinutes = placed.reduce((sum, t) => sum + t.minutes, 0);
      const fixedMinutes = d.tasks.filter((t) => t.fixed).reduce((sum, t) => sum + t.minutes, 0);
      return placedMinutes > Math.max(0, d.free - fixedMinutes) + 60;
    });
    ok('la semaine n\'entasse pas au-delà de la capacité', badlyFilled.length === 0,
      badlyFilled.map((d) => d.date).join(', '));

    /* --- 12. « Je suis perdu » --- */
    const focus = L.focus.next(3);
    ok('« Je suis perdu » propose 1 à 3 actions', focus.actions.length >= 1 && focus.actions.length <= 3);
    ok('chaque action est concrète', focus.actions.every((a) => a.title && (a.detail || a.kind === 'empty')));

    /* --- 13. recherche globale --- */
    const found = L.search.run('Tâche test');
    ok('la recherche retrouve une tâche', found.some((r) => r.kind === 'task' && r.title === 'Tâche test'));
    ok('la recherche ignore les accents', L.search.run('tache test').length > 0);

    /* --- 14. assistant : intentions --- */
    const asked = {};
    for (const q of ['Quelles sont mes priorités ?', 'Combien ai-je dépensé ce mois-ci ?',
                     'Organise ma soirée', 'Ajoute appeler le dentiste demain 10h 30 min',
                     'Ajoute une dépense de 12,50 € en courses', 'Quels objectifs sont en retard ?',
                     'Combien dois-je économiser par mois ?', 'Je suis perdu']) {
      const r = await L.assistant.ask(q);
      asked[q] = r.intent;
    }
    ok('intentions reconnues', Object.values(asked).every((i) => i && i !== 'unknown'), JSON.stringify(asked));
    const added = L.tasks.filter({ query: 'dentiste' })[0];
    ok('l\'assistant crée la tâche avec date et heure',
      added && added.date === D.addDays(D.today(), 1) && added.time === '10:00' && added.estimate === 30,
      added ? added.date + ' ' + added.time + ' ' + added.estimate : 'absente');

    /* --- 15. annulation --- */
    const countBefore = L.store.state.tasks.length;
    const doomed = L.tasks.create({ title: 'À annuler' });
    L.tasks.remove(doomed.id);
    L.store.undo();
    ok('annulation d\'une suppression', L.tasks.get(doomed.id) !== null);
    L.store.undo();
    ok('annulation d\'une création', L.store.state.tasks.length === countBefore, L.store.state.tasks.length + ' vs ' + countBefore);

    /* --- 16. export / import --- */
    const dump = L.store.exportJSON();
    const parsed = JSON.parse(dump);
    ok('export complet', parsed.state && parsed.state.tasks.length === L.store.state.tasks.length);
    const taskCount = L.store.state.tasks.length;
    L.store.replace(L.schema.emptyState(), 'vide');
    ok('remise à zéro', L.store.state.tasks.length === 0);
    L.store.importJSON(dump);
    ok('import restaure tout', L.store.state.tasks.length === taskCount, L.store.state.tasks.length + '');

    /* --- 17. export .ics --- */
    const ics = L.ics.build();
    ok('le calendrier exporté est un .ics valide',
      ics.indexOf('BEGIN:VCALENDAR') === 0 && ics.indexOf('END:VCALENDAR') > 0);
    const reimported = L.ics.parse(ics);
    ok('le .ics se relit', reimported.length > 0, reimported.length + ' événements');

    /* --- 18. notifications : file cohérente --- */
    L.store.setSetting('notifications.enabled', true);
    const queue = L.notify.queue();
    ok('la file de rappels est triée', queue.every((q, i) => i === 0 || queue[i - 1].at <= q.at));
    ok('la file contient le planning du matin', queue.some((q) => q.key.indexOf('daily:') === 0));

    return out;
  });

  /* --- 19. isolation des profils : un second profil ne voit rien du premier --- */
  const isolation = await page.evaluate(async () => {
    const L = window.LifeOS;
    const first = L.app.profile();
    const firstCount = L.store.state.tasks.length;
    const second = L.auth.createLocal('Autre');
    const adapter = L.storage.open(L.auth.namespace(second));
    const raw = await adapter.load();
    /* On remet le profil d'origine en place. */
    L.auth.switchTo(first.id);
    return { firstCount, secondEmpty: raw === null, sameNamespace: L.auth.namespace(first) === L.auth.namespace(second) };
  });

  /* --- 20. chiffrement : relecture impossible sans la phrase secrète --- */
  const crypto = await page.evaluate(async () => {
    const L = window.LifeOS;
    const adapter = L.storage.open('test-chiffre');
    adapter.setPassphrase('phrase-secrete');
    await adapter.save({ secret: 'valeur sensible', schema: 1 });
    const encrypted = await adapter.isEncrypted();
    const clear = L.storage.open('test-chiffre');
    let refused = false;
    try { await clear.load(); } catch (e) { refused = e.code === 'LOCKED'; }
    let wrong = false;
    const bad = L.storage.open('test-chiffre');
    bad.setPassphrase('mauvaise');
    try { await bad.load(); } catch (e) { wrong = e.code === 'BAD_PASSPHRASE'; }
    const back = await adapter.load();
    await adapter.clear();
    return { encrypted, refused, wrong, roundTrip: back && back.secret === 'valeur sensible' };
  });

  /* --- 21. hors ligne : l'app se relance sans réseau --- */
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
  await page.waitForTimeout(1200);
  await ctx.setOffline(true);
  let offlineOk = false;
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.shell,.auth', { timeout: 8000 });
    offlineOk = true;
  } catch (e) { offlineOk = false; }
  await ctx.setOffline(false);

  await browser.close();

  const all = results.concat([
    { name: 'profils isolés : espaces de stockage distincts', pass: !isolation.sameNamespace },
    { name: 'profils isolés : nouveau profil sans données', pass: isolation.secondEmpty },
    { name: 'chiffrement : données illisibles sur le disque', pass: crypto.encrypted },
    { name: 'chiffrement : lecture refusée sans phrase', pass: crypto.refused },
    { name: 'chiffrement : mauvaise phrase rejetée', pass: crypto.wrong },
    { name: 'chiffrement : aller-retour fidèle', pass: crypto.roundTrip },
    { name: 'hors ligne : l\'application redémarre', pass: offlineOk }
  ]);

  let failed = 0;
  all.forEach((r) => {
    if (!r.pass) failed++;
    console.log((r.pass ? '  ok  ' : '  ÉCHEC  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
  });
  crashes.forEach((c) => { failed++; console.log('  ÉCHEC  exception : ' + c); });
  console.log('\n' + (all.length - failed) + ' / ' + all.length + ' vérifications passées.');
  if (failed) process.exitCode = 1;
})();
