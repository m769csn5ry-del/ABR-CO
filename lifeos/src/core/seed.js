/* ==========================================================================
   LifeOS — contenu initial
   `structure()` : les domaines, comptes, catégories et habitudes de départ.
   Tout y est modifiable ou supprimable ensuite — rien n'est verrouillé.
   `demo()` : un jeu d'exemple, proposé au premier lancement, jamais imposé.
   ========================================================================== */
(function (L) {
  'use strict';

  var make = L.schema.make;
  var D = L.date;

  function structure(state) {
    var order = 0;
    [
      ['Personnel',    'user',      '#7A8590'],
      ['Études',       'book',      '#3C6E9F'],
      ['Alternance',   'briefcase', '#3F8F7A'],
      ['Finances',     'wallet',    '#A9761A'],
      ['Sport',        'activity',  '#B2554A'],
      ['Permis',       'car',       '#6B5FA8'],
      ['Projets',      'folder',    '#2F7F8C'],
      ['Apprentissage', 'sparkle',  '#9A5B3C']
    ].forEach(function (d) {
      state.domains.push(make.domain({ name: d[0], icon: d[1], color: d[2], order: order++ }));
    });

    state.accounts.push(make.account({ name: 'Compte courant', kind: 'courant', opening: 0, color: '#5B7FC7' }));
    state.accounts.push(make.account({ name: 'Épargne', kind: 'épargne', opening: 0, color: '#3F8F7A' }));

    var co = 0;
    [
      ['Salaire', 'income', '#3F8F7A', '💼'],
      ['Revenus business', 'income', '#2F7F8C', '📈'],
      ['Aides & autres', 'income', '#4B7F52', '➕'],
      ['Loyer & charges', 'expense', '#3C6E9F', '🏠'],
      ['Courses', 'expense', '#A9761A', '🛒'],
      ['Transport', 'expense', '#6B5FA8', '🚉'],
      ['Abonnements', 'expense', '#7A8590', '🔁'],
      ['Restaurants & sorties', 'expense', '#B2554A', '🍽'],
      ['Santé', 'expense', '#3F8F7A', '⚕'],
      ['Études & formation', 'expense', '#2F7F8C', '🎓'],
      ['Sport', 'expense', '#9A5B3C', '🏋'],
      ['Vêtements', 'expense', '#8A6A9B', '👕'],
      ['Divers', 'expense', '#7A8590', '•'],
      ['Épargne', 'saving', '#4B7F52', '🏦']
    ].forEach(function (c) {
      state.categories.push(make.category({ name: c[0], type: c[1], color: c[2], icon: c[3], order: co++ }));
    });

    var dom = function (name) {
      var d = state.domains.filter(function (x) { return x.name === name; })[0];
      return d ? d.id : null;
    };

    [
      { name: 'Sport', icon: 'activity', kind: 'check', target: 1, days: [1, 3, 5], domain: 'Sport', duration: 60, slot: 'evening' },
      { name: 'Sommeil', icon: 'moon', kind: 'duration', target: 450, unit: 'min', domain: 'Personnel', duration: 0 },
      { name: "Temps d'écran", icon: 'phone', kind: 'duration', target: 120, unit: 'min', direction: 'at_most', domain: 'Personnel', duration: 0 },
      { name: 'Travail business', icon: 'briefcase', kind: 'duration', target: 60, unit: 'min', days: [1, 2, 3, 4, 5], domain: 'Projets', duration: 60, slot: 'evening' },
      { name: 'Études', icon: 'book', kind: 'duration', target: 45, unit: 'min', days: [1, 2, 3, 4, 5], domain: 'Études', duration: 45, slot: 'afternoon' },
      { name: 'Lecture', icon: 'book', kind: 'duration', target: 20, unit: 'min', domain: 'Apprentissage', duration: 20, slot: 'evening' },
      { name: 'Alimentation', icon: 'leaf', kind: 'check', target: 1, domain: 'Personnel', duration: 0 },
      { name: 'Heure de réveil', icon: 'sun', kind: 'time', target: '07:00', domain: 'Personnel', duration: 0 },
      { name: 'Heure de coucher', icon: 'moon', kind: 'time', target: '23:30', direction: 'at_most', domain: 'Personnel', duration: 0 }
    ].forEach(function (h, i) {
      state.habits.push(make.habit({
        name: h.name, icon: h.icon, kind: h.kind, target: h.target, unit: h.unit || '',
        days: h.days || [0, 1, 2, 3, 4, 5, 6], direction: h.direction || 'at_least',
        domainId: dom(h.domain), duration: h.duration, slot: h.slot || null, order: i
      }));
    });

    state.folders.push(make.folder({ name: 'Idées', order: 0 }));
    state.folders.push(make.folder({ name: 'Cours', order: 1 }));
    state.meta.seeded = true;
    return state;
  }

  /* --- jeu de démonstration --- */
  function demo(state) {
    var today = D.today();
    var dom = function (name) {
      var d = state.domains.filter(function (x) { return x.name === name; })[0];
      return d ? d.id : null;
    };
    var cat = function (name) {
      var c = state.categories.filter(function (x) { return x.name === name; })[0];
      return c ? c.id : null;
    };
    var acc = state.accounts[0], sav = state.accounts[1];

    var goalSave = make.goal({
      name: 'Économiser 4 500 €', category: 'Finances', domainId: dom('Finances'),
      start: 1250, current: 1500, target: 4500, unit: '€',
      startDate: D.startOfMonth(today), targetDate: '2027-01-01',
      source: { type: 'savings', accountId: sav ? sav.id : null }
    });
    var goalLicense = make.goal({
      name: 'Obtenir le permis', category: 'Personnel', domainId: dom('Permis'),
      start: 0, current: 0, target: 100, unit: '%', targetDate: D.addDays(today, 120),
      source: { type: 'tasks' }
    });
    var goalStudy = make.goal({
      name: 'Lire 12 livres cette année', category: 'Apprentissage', domainId: dom('Apprentissage'),
      start: 0, current: 4, target: 12, unit: 'livres',
      startDate: D.startOfYear(today), targetDate: D.endOfYear(today), source: { type: 'manual' }
    });
    state.goals.push(goalSave, goalLicense, goalStudy);

    var pSite = make.project({
      name: 'Refonte du portfolio', domainId: dom('Projets'), status: 'active',
      objective: 'Un site propre qui présente mon travail', due: D.addDays(today, 24),
      description: 'Maquette, intégration, mise en ligne.',
      milestones: [
        { id: L.util.uid('ms'), title: 'Maquette validée', due: D.addDays(today, 6), done: true },
        { id: L.util.uid('ms'), title: 'Intégration', due: D.addDays(today, 16), done: false },
        { id: L.util.uid('ms'), title: 'Mise en ligne', due: D.addDays(today, 24), done: false }
      ],
      budget: 120
    });
    var pExam = make.project({
      name: 'Partiels — semestre', domainId: dom('Études'), status: 'active',
      objective: 'Viser 14 de moyenne', due: D.addDays(today, 32)
    });
    var pLicense = make.project({
      name: 'Permis de conduire', domainId: dom('Permis'), status: 'active',
      goalId: goalLicense.id, objective: 'Code puis conduite', due: D.addDays(today, 110)
    });
    state.projects.push(pSite, pExam, pLicense);
    goalLicense.projectIds = [pLicense.id];

    var T = [
      { title: 'Réviser le chapitre 4 — statistiques', domain: 'Études', project: pExam.id, prio: 1, date: today, estimate: 60, energy: 'high',
        subtasks: ['Relire le cours', 'Faire 10 exercices'] },
      { title: 'Séance de sport — haut du corps', domain: 'Sport', prio: 2, date: today, estimate: 60, energy: 'medium' },
      { title: 'Intégrer la page projets', domain: 'Projets', project: pSite.id, prio: 1, date: today, estimate: 90, energy: 'high' },
      { title: 'Répondre aux mails de l\'alternance', domain: 'Alternance', prio: 2, date: today, estimate: 20, energy: 'low' },
      { title: 'Série de code — 40 questions', domain: 'Permis', project: pLicense.id, prio: 1, date: today, estimate: 30, energy: 'medium' },
      { title: 'Préparer la présentation client', domain: 'Alternance', prio: 0, due: D.addDays(today, 2), estimate: 120, energy: 'high' },
      { title: 'Faire les courses de la semaine', domain: 'Personnel', prio: 2, date: D.addDays(today, 1), estimate: 45, energy: 'low' },
      { title: 'Rendre le dossier de gestion', domain: 'Études', project: pExam.id, prio: 0, due: D.addDays(today, 4), estimate: 180, energy: 'high' },
      { title: 'Appeler l\'auto-école pour les heures', domain: 'Permis', project: pLicense.id, prio: 1, due: D.addDays(today, 3), estimate: 10, energy: 'low' },
      { title: 'Mettre à jour le budget du mois', domain: 'Finances', prio: 2, date: D.addDays(today, 2), estimate: 25, energy: 'low' },
      { title: 'Lire 20 pages', domain: 'Apprentissage', prio: 3, estimate: 25, energy: 'low', recurrence: { freq: 'daily', interval: 1, start: today } },
      { title: 'Nettoyer le bureau', domain: 'Personnel', prio: 3, estimate: 20, energy: 'low' },
      { title: 'Réviser les formules — chapitre 2', domain: 'Études', project: pExam.id, prio: 1, due: D.addDays(today, 7), estimate: 50, energy: 'high' },
      { title: 'Écrire les textes du portfolio', domain: 'Projets', project: pSite.id, prio: 2, due: D.addDays(today, 9), estimate: 60, energy: 'medium' }
    ];
    T.forEach(function (t, i) {
      state.tasks.push(make.task({
        title: t.title, domainId: dom(t.domain), projectId: t.project || null,
        priority: t.prio, date: t.date || null, due: t.due || null,
        estimate: t.estimate, energy: t.energy, recurrence: t.recurrence || null,
        order: i,
        subtasks: (t.subtasks || []).map(function (s) { return make.subtask(s); })
      }));
    });
    /* Quelques tâches déjà faites : les statistiques ont de quoi parler. */
    for (var d = 1; d <= 21; d++) {
      var n = 1 + Math.floor(Math.random() * 3);
      for (var k = 0; k < n; k++) {
        var day = D.addDays(today, -d);
        state.tasks.push(make.task({
          title: ['Révisions', 'Sport', 'Travail projet', 'Administratif', 'Lecture'][(d + k) % 5] + ' — ' + D.format(day, 'short'),
          domainId: dom(['Études', 'Sport', 'Projets', 'Personnel', 'Apprentissage'][(d + k) % 5]),
          status: 'done', date: day, estimate: 30 + ((d + k) % 4) * 20,
          actual: 30 + ((d + k) % 4) * 20,
          completedAt: (D.parse(day) || new Date()).getTime() + 54000000
        }));
      }
    }

    state.events.push(make.event({ title: 'Cours — Gestion', date: today, start: '09:00', end: '12:00', domainId: dom('Études') }));
    state.events.push(make.event({ title: 'Point équipe alternance', date: today, start: '14:00', end: '15:00', domainId: dom('Alternance') }));
    state.events.push(make.event({ title: 'Leçon de conduite', date: D.addDays(today, 2), start: '10:00', end: '12:00', domainId: dom('Permis') }));
    state.events.push(make.event({ title: 'Dîner famille', date: D.addDays(today, 3), start: '19:30', end: '22:00', domainId: dom('Personnel') }));
    state.events.push(make.event({ title: 'Examen blanc', date: D.addDays(today, 10), start: '08:30', end: '12:30', domainId: dom('Études') }));

    var monthStart = D.startOfMonth(today);
    var tx = [
      ['income', 'Salaire alternance', 1350, cat('Salaire'), monthStart, true],
      ['income', 'Vente en ligne', 180, cat('Revenus business'), D.addDays(monthStart, 8), false],
      ['expense', 'Loyer', 480, cat('Loyer & charges'), D.addDays(monthStart, 1), true],
      ['expense', 'Abonnement mobile', 19.99, cat('Abonnements'), D.addDays(monthStart, 2), true],
      ['expense', 'Abonnement musique', 10.99, cat('Abonnements'), D.addDays(monthStart, 2), true],
      ['expense', 'Courses', 62.4, cat('Courses'), D.addDays(monthStart, 3), false],
      ['expense', 'Courses', 48.9, cat('Courses'), D.addDays(monthStart, 10), false],
      ['expense', 'Abonnement transport', 38, cat('Transport'), D.addDays(monthStart, 4), true],
      ['expense', 'Restaurant', 24.5, cat('Restaurants & sorties'), D.addDays(monthStart, 6), false],
      ['expense', 'Salle de sport', 29.9, cat('Sport'), D.addDays(monthStart, 5), true],
      ['expense', 'Heures de conduite', 150, cat('Études & formation'), D.addDays(monthStart, 7), false],
      ['saving', 'Virement épargne', 250, cat('Épargne'), D.addDays(monthStart, 2), true]
    ];
    tx.forEach(function (t) {
      state.transactions.push(make.transaction({
        type: t[0], description: t[1], amount: t[2], categoryId: t[3], date: t[4], fixed: t[5],
        accountId: acc ? acc.id : null,
        toAccountId: t[0] === 'saving' && sav ? sav.id : null,
        goalId: t[0] === 'saving' ? goalSave.id : null,
        /* Ce qui est fixe se répète : l'application le réenregistrera seule. */
        recurrence: t[5] ? { freq: 'monthly', interval: 1, start: t[4] } : null
      }));
    });
    /* Deux mois d'historique pour que les courbes aient du relief. */
    for (var m = 1; m <= 5; m++) {
      var ms = D.startOfMonth(D.addMonths(today, -m));
      state.transactions.push(make.transaction({ type: 'income', description: 'Salaire alternance', amount: 1350, categoryId: cat('Salaire'), date: ms, accountId: acc.id, fixed: true }));
      state.transactions.push(make.transaction({ type: 'expense', description: 'Loyer', amount: 480, categoryId: cat('Loyer & charges'), date: D.addDays(ms, 1), accountId: acc.id, fixed: true }));
      state.transactions.push(make.transaction({ type: 'expense', description: 'Courses du mois', amount: 210 + m * 12, categoryId: cat('Courses'), date: D.addDays(ms, 12), accountId: acc.id }));
      state.transactions.push(make.transaction({ type: 'expense', description: 'Sorties', amount: 90 - m * 8, categoryId: cat('Restaurants & sorties'), date: D.addDays(ms, 16), accountId: acc.id }));
      state.transactions.push(make.transaction({ type: 'saving', description: 'Virement épargne', amount: 250, categoryId: cat('Épargne'), date: D.addDays(ms, 2), accountId: acc.id, toAccountId: sav.id, goalId: goalSave.id, fixed: true }));
    }
    var open = state.accounts[0]; open.opening = 820;
    if (sav) sav.opening = 750;

    /* Historique d'habitudes : régularité imparfaite, comme dans la vraie vie. */
    state.habits.forEach(function (h) {
      var log = state.habitLogs[h.id] || (state.habitLogs[h.id] = {});
      for (var i = 1; i <= 40; i++) {
        var day = D.addDays(today, -i);
        if (h.days.indexOf(D.dow(day)) === -1) continue;
        if (Math.random() < 0.26) continue;
        if (h.kind === 'check') log[day] = 1;
        else if (h.kind === 'duration') log[day] = Math.round(h.target * (0.7 + Math.random() * 0.6));
        else if (h.kind === 'quantity') log[day] = Math.round(h.target * (0.6 + Math.random() * 0.8));
        else if (h.kind === 'time') log[day] = h.target;
      }
    });

    state.notes.push(make.note({
      title: 'Idées pour le portfolio',
      body: 'Garder trois projets maximum sur la page d\'accueil.\nUne étude de cas détaillée par projet.\nContact en bas de page, sans formulaire.',
      folderId: state.folders[0] ? state.folders[0].id : null,
      tags: ['portfolio'], links: { taskIds: [], projectIds: [pSite.id], goalIds: [] }
    }));
    state.notes.push(make.note({
      title: 'Cours — statistiques, chapitre 4',
      body: 'Moyenne, médiane, écart-type.\nBien revoir la formule de la variance.',
      folderId: state.folders[1] ? state.folders[1].id : null,
      tags: ['études'], checklist: [
        { id: L.util.uid('ck'), title: 'Refaire les exercices 3 à 8', done: false },
        { id: L.util.uid('ck'), title: 'Fiche de révision', done: false }
      ]
    }));
    state.notes.push(make.note({
      title: 'Budget — règles que je me fixe',
      body: 'Épargner au minimum 250 € par mois.\nPas plus de 100 € de sorties.\nRevoir les abonnements tous les trimestres.',
      tags: ['finances'], pinned: true
    }));

    return state;
  }

  L.seed = { structure: structure, demo: demo };
})(window.LifeOS = window.LifeOS || {});
