/* ==========================================================================
   LifeOS — assistant
   Il lit les données de l'application et répond avec des chiffres vrais.
   Deux modes :
     • local (par défaut) — tout est calculé sur l'appareil, hors ligne,
       sans clé ni compte : les questions courantes sont reconnues et les
       actions (ajouter, reporter, créer) sont exécutées directement ;
     • distant (facultatif) — une clé d'API Claude saisie dans les réglages
       permet de poser des questions libres ; le contexte envoyé est réduit
       au nécessaire et l'envoi des finances peut être coupé.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, N = L.nlp;

  function fmtList(items) { return items.filter(Boolean).join('\n'); }

  /* --- réponses --- */
  function reply(text, extra) {
    return Object.assign({ text: text, list: null, plan: null, actions: [], intent: null }, extra || {});
  }

  /* ======================================================================
     Intentions locales
     Chaque entrée : un test sur la phrase, une fonction qui répond.
     ====================================================================== */
  var INTENTS = [
    /* ---------- que faire maintenant ---------- */
    {
      id: 'next_action',
      test: /je suis perdu|par quoi (je )?commenc|quoi faire maintenant|je fais quoi|aide[- ]moi a demarrer|(j'?ai|il me reste) .*(libre|devant moi)/i,
      run: function (text) {
        var win = N.window(text);
        var dur = N.duration(text);
        var res = L.focus.next(3);
        var lines = res.actions.map(function (a, i) {
          return (i + 1) + '. ' + a.title + (a.detail ? '  —  ' + a.detail : '') + (a.why ? '\n   ' + a.why : '');
        });
        var head = dur
          ? 'Avec ' + D.duration(dur.minutes) + ' devant toi, voilà par quoi commencer :'
          : (win ? 'Pour ' + win.label + ', commence par là :' : 'Commence par là :');
        return reply(head + '\n\n' + fmtList(lines), {
          intent: 'next_action',
          actions: [{ label: 'Organiser la suite', type: 'open', payload: { view: 'planning' } }]
        });
      }
    },

    /* ---------- organiser la journée / une plage ---------- */
    {
      id: 'organize_day',
      test: /organis\w*|planifi\w*|prepare\w*|cale\b|remplis/i,
      guard: function (text) { return !/semaine/i.test(text); },
      run: function (text) {
        var win = N.window(text);
        var dur = N.duration(text);
        var when = N.date(text);
        var day = when ? when.date : D.today();

        var opts = {};
        if (win) { opts.from = win.from; opts.to = win.to; }
        else if (dur) { opts.from = D.nowMinutes(); opts.to = D.nowMinutes() + dur.minutes; }
        var plan = L.planner.build(day, opts);

        var label = win ? win.label : (dur ? D.duration(dur.minutes) + ' à partir de maintenant' : D.relative(day, { caps: false }));
        var head = 'Voilà une proposition pour ' + label + ' — ' +
          D.duration(plan.freeMinutes) + ' disponibles, ' + D.duration(plan.plannedMinutes) + ' de travail placé.';
        return reply(head, {
          intent: 'organize_day',
          plan: plan,
          actions: [
            { label: 'Accepter', type: 'accept-plan', payload: { plan: plan } },
            { label: 'Voir le planning', type: 'open', payload: { view: 'planning', date: day } }
          ]
        });
      }
    },

    /* ---------- organiser la semaine ---------- */
    {
      id: 'organize_week',
      test: /(organis\w*|planifi\w*|prepare\w*|cale\b).*(semaine)|semaine.*(organis|planifi|prepare)/i,
      run: function () {
        var plan = L.weekly.build();
        var lines = plan.priorities.map(function (p, i) { return (i + 1) + '. ' + p.title + ' — ' + p.why; });
        var risk = plan.risks.map(function (r) { return '• ' + r.text; });
        return reply(
          'Semaine du ' + D.format(plan.start, 'short') + ' au ' + D.format(plan.end, 'short') + '.\n' +
          D.duration(plan.totals.free) + ' disponibles, ' + D.duration(plan.totals.need) + ' à caser.\n\n' +
          'Priorités :\n' + fmtList(lines) + (risk.length ? '\n\n' + fmtList(risk) : ''),
          {
            intent: 'organize_week',
            actions: [
              { label: 'Ouvrir la semaine', type: 'open', payload: { view: 'planning', tab: 'week' } },
              { label: 'Valider la semaine', type: 'accept-week', payload: { plan: plan } }
            ]
          });
      }
    },

    /* ---------- la journée ---------- */
    {
      id: 'day_plan',
      test: /(que|quoi|qu'?est[- ]ce).*(faire|dois).*(aujourd'?hui|ce jour)|ma journee|mon programme|au programme|mon planning(?! de la semaine)/i,
      run: function () {
        var today = D.today();
        var plan = L.planner.get(today);
        var agenda = L.calendar.agenda(today, { habits: true });
        var tasks = L.tasks.forDate(today, { includeOverdue: true }).filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
        var free = L.calendar.availableMinutes(today);

        var lines = agenda.filter(function (i) { return i.kind === 'event'; }).map(function (i) {
          return '• ' + (i.allDay ? 'Journée' : D.toTime(i.start) + '–' + D.toTime(i.end)) + ' · ' + i.title;
        });
        var top = tasks.slice(0, 5).map(function (t) {
          return '• ' + t.title + ' (' + D.duration(t.estimate) + (t.due ? ', échéance ' + D.relative(t.due, { caps: false }) : '') + ')';
        });

        return reply(
          D.format(today, 'full').replace(/^./, function (c) { return c.toUpperCase(); }) + '.\n' +
          (lines.length ? '\nAu calendrier :\n' + fmtList(lines) + '\n' : '\nAucun rendez-vous.\n') +
          (top.length ? '\n' + tasks.length + ' ' + L.util.plural(tasks.length, 'tâche') + ' ouverte' + (tasks.length > 1 ? 's' : '') + ' :\n' + fmtList(top) : '\nAucune tâche ouverte.') +
          '\n\n' + D.duration(free) + ' de temps libre' + (plan ? ' · planning déjà établi.' : ' — veux-tu que je t\'organise ça ?'),
          {
            intent: 'day_plan',
            actions: plan
              ? [{ label: "Voir aujourd'hui", type: 'open', payload: { view: 'today' } }]
              : [{ label: 'Organiser ma journée', type: 'ask', payload: { text: 'organise ma journée' } }]
          });
      }
    },

    /* ---------- priorités ---------- */
    {
      id: 'priorities',
      test: /priorit|le plus important|urgent/i,
      run: function () {
        var list = L.tasks.filter({ status: 'open', sort: 'score' }).slice(0, 6);
        if (!list.length) return reply('Aucune tâche ouverte — rien ne presse.');
        return reply('Dans l\'ordre, voilà ce qui compte le plus :', {
          intent: 'priorities',
          list: list.map(function (t) {
            return { id: t.id, kind: 'task', title: t.title, meta: L.tasks.reason(t) + ' · ' + D.duration(t.estimate) };
          }),
          actions: [{ label: 'Ouvrir les tâches', type: 'open', payload: { view: 'tasks' } }]
        });
      }
    },

    /* ---------- retards ---------- */
    {
      id: 'overdue',
      test: /en retard|depass|rattrap|oubli/i,
      guard: function (text) { return !/objectif/i.test(text); },
      run: function () {
        var late = L.tasks.overdue();
        if (!late.length) return reply('Rien en retard. Tout est à jour.');
        return reply(late.length + ' ' + L.util.plural(late.length, 'tâche') + ' en retard :', {
          intent: 'overdue',
          list: late.slice(0, 10).map(function (t) {
            return { id: t.id, kind: 'task', title: t.title, meta: 'Échéance ' + D.relative(t.due || t.date, { caps: false }) };
          }),
          actions: [{ label: 'Tout reporter à aujourd\'hui', type: 'bulk-today', payload: { ids: late.map(function (t) { return t.id; }) } }]
        });
      }
    },

    /* ---------- objectifs ---------- */
    {
      id: 'goals_late',
      test: /objectifs?.*(retard|en retard|decroch)|quels objectifs/i,
      run: function () {
        var behind = L.goals.behind();
        if (!behind.length) {
          var all = L.goals.active();
          if (!all.length) return reply('Aucun objectif actif pour le moment.');
          return reply('Aucun objectif en retard. Avancement moyen : ' +
            Math.round(L.util.sum(all.map(L.goals.summary), function (g) { return g.progress; }) / all.length * 100) + ' %.');
        }
        return reply(behind.length + ' ' + L.util.plural(behind.length, 'objectif') + ' ' + (behind.length > 1 ? 'décrochent' : 'décroche') + ' :', {
          intent: 'goals_late',
          list: behind.map(function (s) {
            return { id: s.goal.id, kind: 'goal', title: s.goal.name, meta: s.percent + ' % · ' + L.goals.advice(s.goal) };
          }),
          actions: [{ label: 'Ouvrir les objectifs', type: 'open', payload: { view: 'goals' } }]
        });
      }
    },

    {
      id: 'goal_pace',
      test: /combien (dois|faut|devrais).*(economis|epargn|mettre de cote|par mois|par semaine)|rythme/i,
      run: function (text) {
        var goals = L.goals.active();
        if (!goals.length) return reply("Aucun objectif actif. Crée-en un et je calcule le rythme à tenir.");
        var target = N.match(text, goals, 'name');
        var list = target ? [target] : goals;
        var lines = list.map(function (g) {
          var s = L.goals.summary(g);
          return '• ' + g.name + ' — ' + L.goals.advice(g) + (s.behind ? '  (en retard)' : '');
        });
        return reply(fmtList(lines), { intent: 'goal_pace' });
      }
    },

    /* ---------- finances ---------- */
    {
      id: 'spending',
      test: /combien.*(depens|coute|sorti)|mes depenses|j'?ai depense/i,
      run: function (text) {
        var p = N.period(text) || L.stats.range('month');
        var period = L.finance.period(p.from, p.to);
        var cats = L.finance.byCategory(p.from, p.to, 'expense').slice(0, 5);
        var cat = N.match(text, L.finance.categories('expense'), 'name');
        if (cat) {
          var only = L.util.sum(L.finance.filter({ from: p.from, to: p.to, categoryId: cat.id, type: 'expense' }), function (t) { return t.amount; });
          return reply(L.format.money(only) + ' en « ' + cat.name + ' » ' + (p.label || 'ce mois-ci') + '.', { intent: 'spending' });
        }
        var lines = cats.map(function (c) { return '• ' + c.name + ' — ' + L.format.money(c.total); });
        var budget = L.finance.budget();
        var extra = '';
        if (budget.global) {
          extra = '\n\nBudget du mois : ' + L.format.money(budget.global.spent) + ' / ' + L.format.money(budget.global.budget) +
            (budget.global.state === 'over' ? ' — dépassé.' : budget.global.state === 'near' ? ' — tu approches de la limite.' : '.');
        }
        return reply(
          L.format.money(period.expense) + ' dépensés ' + (p.label || 'ce mois-ci') + ' pour ' +
          L.format.money(period.income) + ' de revenus.' +
          (lines.length ? '\n\nPrincipaux postes :\n' + fmtList(lines) : '') + extra,
          { intent: 'spending', actions: [{ label: 'Ouvrir les finances', type: 'open', payload: { view: 'finance' } }] });
      }
    },

    {
      id: 'balance',
      test: /mon solde|combien (il )?me reste|sur mes comptes|ma tresorerie|combien j'?ai/i,
      run: function () {
        var accounts = L.finance.accounts().map(function (a) {
          return '• ' + a.name + ' — ' + L.format.money(L.finance.balance(a.id));
        });
        var f = L.finance.forecast();
        return reply(
          'Solde total : ' + L.format.money(L.finance.totalBalance()) + '.\n\n' + fmtList(accounts) +
          '\n\nÀ ce rythme, tu finirais le mois avec ' + L.format.money(f.income - f.projected) + ' de marge.',
          { intent: 'balance' });
      }
    },

    {
      id: 'income',
      test: /combien.*(gagn|touche|revenus?)|mes revenus/i,
      run: function (text) {
        var p = N.period(text) || L.stats.range('month');
        var period = L.finance.period(p.from, p.to);
        return reply(L.format.money(period.income) + ' de revenus ' + (p.label || 'ce mois-ci') + ', ' +
          L.format.money(period.put) + ' mis de côté (' + L.format.percent(period.rate) + ' des revenus).',
          { intent: 'income' });
      }
    },

    /* ---------- agenda ---------- */
    {
      id: 'agenda',
      test: /rendez[- ]vous|mon calendrier|qu'?est[- ]ce que j'?ai (demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|mon agenda/i,
      run: function (text) {
        var when = N.date(text);
        var day = when ? when.date : D.today();
        var items = L.calendar.agenda(day, { habits: false });
        if (!items.length) return reply('Rien de prévu ' + D.relative(day, { caps: false }) + '.', { intent: 'agenda' });
        return reply(D.format(day, 'long') + ' :', {
          intent: 'agenda',
          list: items.map(function (i) {
            return {
              id: i.id, kind: i.kind, title: i.title,
              meta: i.allDay ? (i.kind === 'due' ? 'Échéance' : 'Toute la journée') : D.toTime(i.start) + ' – ' + D.toTime(i.end)
            };
          }),
          actions: [{ label: 'Ouvrir le calendrier', type: 'open', payload: { view: 'calendar', date: day } }]
        });
      }
    },

    {
      id: 'free_time',
      test: /temps libre|combien de temps|de dispo|disponible/i,
      run: function (text) {
        var when = N.date(text);
        var day = when ? when.date : D.today();
        var win = N.window(text);
        var free = L.calendar.availableMinutes(day, win ? { from: win.from, to: win.to } : {});
        var slots = L.calendar.freeSlots(day, win ? { from: win.from, to: win.to } : {});
        var lines = slots.map(function (s) { return '• ' + D.toTime(s.start) + ' – ' + D.toTime(s.end) + ' (' + D.duration(s.minutes) + ')'; });
        return reply(D.duration(free) + ' de libre ' + (win ? win.label : D.relative(day, { caps: false })) +
          (lines.length ? ' :\n' + fmtList(lines) : '.'), {
          intent: 'free_time',
          actions: [{ label: 'Remplir ce temps', type: 'ask', payload: { text: 'organise ' + (win ? win.label : 'ma journée') } }]
        });
      }
    },

    /* ---------- habitudes ---------- */
    {
      id: 'habits',
      test: /habitude|ma serie|mes series|routine/i,
      run: function () {
        var list = L.habits.today();
        if (!list.length) return reply('Aucune habitude prévue aujourd\'hui.');
        var done = list.filter(function (h) { return h.done; }).length;
        return reply(done + ' / ' + list.length + ' habitudes tenues aujourd\'hui.', {
          intent: 'habits',
          list: list.map(function (h) {
            return {
              id: h.habit.id, kind: 'habit', title: h.habit.name,
              meta: (h.done ? 'Fait' : 'À faire') + ' · ' + L.habits.targetLabel(h.habit) + (h.streak ? ' · série ' + h.streak + ' j' : '')
            };
          }),
          actions: [{ label: 'Ouvrir les habitudes', type: 'open', payload: { view: 'habits' } }]
        });
      }
    },

    /* ---------- bilan ---------- */
    {
      id: 'stats',
      test: /bilan|statistiq|combien de taches|ma semaine|mon mois|comment (ca va|je m'?en sors)|progress/i,
      run: function (text) {
        var p = N.period(text) || L.stats.range('week');
        var o = L.stats.overview(p.from, p.to);
        var domains = o.domains.slice(0, 4).map(function (d) { return '• ' + d.name + ' — ' + D.duration(d.minutes); });
        return reply(
          (p.label ? p.label.charAt(0).toUpperCase() + p.label.slice(1) : 'Période') + ' : ' +
          o.tasks.done + ' ' + L.util.plural(o.tasks.done, 'tâche') + ' ' + L.util.plural(o.tasks.done, 'terminée') + ', ' +
          D.duration(o.tasks.minutes) + ' de travail, ' + L.format.percent(o.habitRatio) + ' d\'habitudes tenues.' +
          (domains.length ? '\n\nTemps par domaine :\n' + fmtList(domains) : '') +
          (o.goalsBehind ? '\n\n' + o.goalsBehind + ' ' + L.util.plural(o.goalsBehind, 'objectif') + ' en retard.' : ''),
          { intent: 'stats', actions: [{ label: 'Ouvrir les statistiques', type: 'open', payload: { view: 'stats' } }] });
      }
    },

    /* ---------- projets ---------- */
    {
      id: 'project',
      test: /ou en est|avancement|mon projet|le projet/i,
      run: function (text) {
        var projects = L.projects.all();
        var p = N.match(text, projects, 'name');
        if (!p) {
          var act = L.projects.active().map(L.projects.summary);
          if (!act.length) return reply('Aucun projet en cours.');
          return reply('Tes projets en cours :', {
            intent: 'project',
            list: act.map(function (s) {
              return { id: s.project.id, kind: 'project', title: s.project.name, meta: s.percent + ' % · ' + s.tasksOpen + ' ' + L.util.plural(s.tasksOpen, 'tâche') + ' ouverte' + (s.tasksOpen > 1 ? 's' : '') };
            })
          });
        }
        var s = L.projects.summary(p);
        return reply(
          p.name + ' — ' + s.percent + ' % (' + s.tasksDone + '/' + s.tasksTotal + ' tâches).' +
          (s.nextMilestone ? '\nProchaine étape : ' + s.nextMilestone.title + (s.nextMilestone.due ? ' (' + D.relative(s.nextMilestone.due, { caps: false }) + ')' : '') : '') +
          (s.remainingMinutes ? '\nReste ' + D.duration(s.remainingMinutes) + ' de travail estimé.' : '') +
          (s.budget ? '\nBudget : ' + L.format.money(s.spent) + ' / ' + L.format.money(s.budget) + '.' : '') +
          (s.atRisk ? '\n\nAttention : la charge restante tient difficilement avant l\'échéance.' : ''),
          { intent: 'project', actions: [{ label: 'Ouvrir le projet', type: 'open', payload: { view: 'projects', id: p.id } }] });
      }
    },

    /* ---------- actions : ajouter une tâche ---------- */

    /* ---------- actions : reporter / terminer ---------- */
    {
      id: 'postpone',
      test: /report|decale|deplace|remets?\b.*(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine)/i,
      run: function (text) {
        var open = L.tasks.filter({ status: 'open' });
        var task = N.match(text, open, 'title');
        if (!task) return reply('Quelle tâche veux-tu reporter ? Donne son intitulé.');
        var when = N.date(text);
        var to = when ? when.date : D.addDays(task.date || D.today(), 1);
        L.tasks.postpone(task.id, to);
        return reply('« ' + task.title + ' » est reportée à ' + D.relative(to, { caps: false }) + '.', {
          intent: 'postpone', actions: [{ label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'complete',
      test: /marque\w*.*(termin|fait|fini)|j'?ai (fini|termine|fait)\b|coche/i,
      run: function (text) {
        var open = L.tasks.filter({ status: 'open' });
        var task = N.match(text, open, 'title');
        if (!task) {
          var habit = N.match(text, L.habits.all(), 'name');
          if (habit) {
            L.habits.toggle(habit.id);
            return reply('« ' + habit.name + ' » cochée pour aujourd\'hui.', { intent: 'complete' });
          }
          return reply('De quelle tâche s\'agit-il ?');
        }
        L.tasks.setStatus(task.id, 'done');
        return reply('« ' + task.title + ' » est terminée.', {
          intent: 'complete', actions: [{ label: 'Annuler', type: 'undo' }]
        });
      }
    },

    /* ---------- actions : dépense / revenu ---------- */

    /* ---------- actions : objectif / projet / note / habitude / événement ---------- */

    /* ---------- actions ---------- */
    {
      id: 'add_expense',
      test: /(ajoute|note|enregistre|j'?ai (depense|paye|achete)).*(depense|euros?|€)|^depense\b/i,
      run: function (text) {
        var amount = N.amount(text);
        if (!amount || !amount.amount) return reply('Quel montant ? Par exemple : « ajoute une dépense de 24,50 € en courses ».');
        var when = N.date(text);
        var cat = N.match(text, L.finance.categories('expense'), 'name');
        var project = N.match(text, L.projects.all(), 'name');
        var desc = N.title(N.strip(text, [
          amount.matched, when && when.matched, 'ajoute une depense', 'ajoute une dépense',
          'enregistre', 'j ai depense', "j'ai dépensé", 'depense', 'dépense', 'de', 'en', 'pour',
          cat && cat.name, project && project.name
        ])) || (cat ? cat.name : 'Dépense');
        var tx = L.finance.create({
          type: 'expense', amount: amount.amount, description: desc,
          categoryId: cat ? cat.id : null, date: when ? when.date : D.today(),
          projectId: project ? project.id : null
        });
        var budget = L.finance.budget();
        var warn = '';
        if (budget.global && budget.global.state !== 'ok') {
          warn = '\n\nBudget du mois : ' + L.format.money(budget.global.spent) + ' / ' + L.format.money(budget.global.budget) +
            (budget.global.state === 'over' ? ' — dépassé.' : ' — tu approches de la limite.');
        }
        return reply('Dépense enregistrée : ' + L.format.money(tx.amount) + (cat ? ' en « ' + cat.name + ' »' : '') +
          ' le ' + D.format(tx.date) + '.' + warn, {
          intent: 'add_expense',
          actions: [{ label: 'Ouvrir les finances', type: 'open', payload: { view: 'finance' } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'add_income',
      test: /(ajoute|note|enregistre).*(revenu|salaire|rentree)|j'?ai (recu|touche)/i,
      run: function (text) {
        var amount = N.amount(text);
        if (!amount || !amount.amount) return reply('Quel montant as-tu reçu ?');
        var cat = N.match(text, L.finance.categories('income'), 'name');
        var when = N.date(text);
        var tx = L.finance.create({
          type: 'income', amount: amount.amount,
          description: N.title(N.strip(text, [amount.matched, when && when.matched, 'ajoute', 'enregistre', 'revenu', 'salaire'])) || (cat ? cat.name : 'Revenu'),
          categoryId: cat ? cat.id : null, date: when ? when.date : D.today()
        });
        return reply('Revenu enregistré : ' + L.format.money(tx.amount) + '.', {
          intent: 'add_income', actions: [{ label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'create_goal',
      test: /(cree|crée|creer|ajoute|nouvel?).*(objectif)|je veux (economiser|epargner|atteindre)/i,
      run: function (text) {
        var amount = N.amount(text);
        var when = N.date(text);
        var name = N.title(N.strip(text, [
          'cree un objectif', 'crée un objectif', 'creer un objectif', 'ajoute un objectif',
          'nouvel objectif', when && when.matched
        ]));
        var isMoney = amount && /€|euros?/i.test(text);
        var goal = L.goals.create({
          name: name || 'Nouvel objectif',
          target: amount ? amount.amount : 100,
          unit: isMoney ? '€' : '',
          current: 0, start: 0,
          targetDate: when ? when.date : null,
          category: isMoney ? 'Finances' : 'Personnel',
          source: isMoney ? { type: 'savings' } : { type: 'manual' }
        });
        return reply('Objectif créé : « ' + goal.name + ' » — ' + L.format.quantity(goal.target, goal.unit) +
          (goal.targetDate ? ' d\'ici le ' + D.format(goal.targetDate, 'short') : '') + '.\n' + L.goals.advice(goal), {
          intent: 'create_goal',
          actions: [{ label: 'Ouvrir', type: 'open-entity', payload: { kind: 'goal', id: goal.id } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'create_project',
      test: /(cree|crée|creer|ajoute|nouveau).*(projet)/i,
      run: function (text) {
        var when = N.date(text);
        var domain = N.match(text, L.domains.all(), 'name');
        var name = N.title(N.strip(text, ['cree un projet', 'crée un projet', 'creer un projet', 'ajoute un projet', 'nouveau projet', when && when.matched, domain && domain.name]));
        var p = L.projects.create({ name: name || 'Nouveau projet', due: when ? when.date : null, domainId: domain ? domain.id : null });
        return reply('Projet créé : « ' + p.name + ' ».', {
          intent: 'create_project',
          actions: [{ label: 'Ouvrir', type: 'open-entity', payload: { kind: 'project', id: p.id } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'create_note',
      test: /^(note|prends? note|ecris|écris)\b|(cree|crée|ajoute).*(note)/i,
      run: function (text) {
        var body = N.title(N.strip(text, ['prends note', 'note que', 'note :', 'note', 'ecris', 'écris', 'cree une note', 'crée une note', 'ajoute une note']));
        if (!body) return reply('Que faut-il noter ?');
        var title = body.split(/[.\n]/)[0].slice(0, 60);
        var n = L.notes.create({ title: title, body: body });
        return reply('Note enregistrée : « ' + n.title + ' ».', {
          intent: 'create_note',
          actions: [{ label: 'Ouvrir', type: 'open-entity', payload: { kind: 'note', id: n.id } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'create_habit',
      test: /(cree|crée|creer|ajoute|nouvelle).*(habitude)|je veux (me mettre a|commencer a)/i,
      run: function (text) {
        var dur = N.duration(text);
        var rec = N.recurrence(text);
        var name = N.title(N.strip(text, ['cree une habitude', 'crée une habitude', 'ajoute une habitude', 'nouvelle habitude', dur && dur.matched, rec && rec.matched]));
        var h = L.habits.create({
          name: name || 'Nouvelle habitude',
          kind: dur ? 'duration' : 'check',
          target: dur ? dur.minutes : 1,
          unit: dur ? 'min' : '',
          duration: dur ? dur.minutes : 20,
          days: rec && rec.rec.days ? rec.rec.days : [0, 1, 2, 3, 4, 5, 6]
        });
        return reply('Habitude créée : « ' + h.name + ' » — ' + L.habits.targetLabel(h) + '.', {
          intent: 'create_habit',
          actions: [{ label: 'Ouvrir', type: 'open', payload: { view: 'habits' } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'create_event',
      test: /(rendez[- ]vous|rdv|reunion|cours|entretien)\b.*(demain|aujourd|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}[h:\/])|ajoute.*(evenement|événement)/i,
      run: function (text) {
        var when = N.date(text), time = N.time(text), dur = N.duration(text);
        var title = N.title(N.strip(text, [when && when.matched, time && time.matched, dur && dur.matched, 'ajoute un rendez-vous', 'ajoute', 'rdv']));
        var start = time ? time.time : '09:00';
        var e = L.calendar.create({
          title: title || 'Rendez-vous',
          date: when ? when.date : D.today(),
          start: start,
          end: D.toTime((D.toMinutes(start) || 540) + (dur ? dur.minutes : 60))
        });
        return reply('Ajouté au calendrier : « ' + e.title + ' » — ' + D.format(e.date, 'long') + ' à ' + e.start + '.', {
          intent: 'create_event',
          actions: [{ label: 'Ouvrir le calendrier', type: 'open', payload: { view: 'calendar', date: e.date } }, { label: 'Annuler', type: 'undo' }]
        });
      }
    },
    {
      id: 'add_task',
      test: /^(ajoute|ajouter|cree|creer|nouvelle|rappelle[- ]moi)\b|^(note|penser) (de|a|à)\b|\b(tache|todo)\b/i,
      run: function (text) {
        var p = N.phrase(text.replace(/^\s*(ajoute|ajouter|cree|creer)\s+(une?\s+)?(tache|tâche)\s*/i, ''));
        var title = p.title;
        if (!title || title.length < 2) {
          return reply('Dis-moi ce qu\'il faut ajouter, par exemple : « ajoute réviser les stats demain 14h, 1 h ».');
        }
        var asDeadline = /avant le|pour le|echeance|échéance|limite|rendre|rendu/i.test(text) && p.date;

        var task = L.tasks.create({
          title: title,
          date: asDeadline ? null : (p.date ? p.date.date : null),
          time: p.time ? p.time.time : null,
          due: asDeadline ? p.date.date : null,
          estimate: p.duration ? p.duration.minutes : 30,
          priority: p.priority ? p.priority.priority : 2,
          projectId: p.project ? p.project.id : null,
          domainId: p.domain ? p.domain.id : (p.project ? p.project.domainId : null),
          recurrence: p.recurrence ? Object.assign({ start: p.date ? p.date.date : D.today() }, p.recurrence.rec) : null
        });

        var bits = [D.duration(task.estimate)];
        if (task.date) bits.push(D.relative(task.date, { caps: false }) + (task.time ? ' à ' + task.time : ''));
        if (task.due) bits.push('échéance ' + D.relative(task.due, { caps: false }));
        if (p.project) bits.push('projet ' + p.project.name);
        if (task.recurrence) bits.push(D.recurrenceLabel(task.recurrence).toLowerCase());

        return reply('Ajouté : « ' + task.title + ' »  —  ' + bits.join(' · '), {
          intent: 'add_task',
          actions: [
            { label: 'Ouvrir', type: 'open-entity', payload: { kind: 'task', id: task.id } },
            { label: 'Annuler', type: 'undo' }
          ]
        });
      }
    },
    /* ---------- aide ---------- */
    {
      id: 'help',
      test: /aide|que sais[- ]tu faire|comment ca marche|tes capacites/i,
      run: function () {
        return reply(
          'Je lis tes tâches, ton calendrier, tes objectifs, tes habitudes et tes finances. Tu peux me demander :\n\n' +
          '• « Organise ma soirée » ou « j\'ai 2 heures, que faire ? »\n' +
          '• « Quelles sont mes priorités ? »\n' +
          '• « Combien ai-je dépensé ce mois-ci ? »\n' +
          '• « Combien dois-je économiser par mois ? »\n' +
          '• « Quels objectifs sont en retard ? »\n' +
          '• « Ajoute réviser les stats demain 14h, 1 h »\n' +
          '• « Reporte les courses à samedi »\n' +
          '• « Ajoute une dépense de 24,50 € en courses »',
          { intent: 'help' });
      }
    }
  ];

  /* ======================================================================
     Fournisseur distant (facultatif)
     ====================================================================== */
  var remote = {
    available: function () {
      var ai = L.store.state.settings.ai;
      return ai.provider === 'anthropic' && !!ai.apiKey;
    },

    /* Contexte transmis : compact, et amputé des finances si l'utilisateur
       préfère les garder pour lui. */
    context: function () {
      var S = L.store.state, today = D.today();
      var ctx = {
        date: today,
        heure: D.nowTime(),
        journee: {
          fenetre: S.settings.day.start + '–' + S.settings.day.end,
          libre_minutes: L.calendar.availableMinutes(today),
          agenda: L.calendar.agenda(today, { habits: false }).slice(0, 12).map(function (i) {
            return { type: i.kind, titre: i.title, debut: i.allDay ? null : D.toTime(i.start), fin: i.allDay ? null : D.toTime(i.end) };
          })
        },
        taches: L.tasks.filter({ status: 'open', sort: 'score' }).slice(0, 30).map(function (t) {
          return {
            id: t.id, titre: t.title, priorite: L.schema.priority(t.priority).label,
            date: t.date, echeance: t.due, minutes: t.estimate, statut: t.status,
            projet: t.projectId ? (L.projects.get(t.projectId) || {}).name : null,
            domaine: t.domainId ? L.domains.name(t.domainId) : null
          };
        }),
        objectifs: L.goals.active().map(function (g) {
          var s = L.goals.summary(g);
          return { id: g.id, nom: g.name, actuel: s.current, cible: g.target, unite: g.unit, echeance: g.targetDate, pourcent: s.percent, en_retard: s.behind };
        }),
        projets: L.projects.active().map(function (p) {
          var s = L.projects.summary(p);
          return { id: p.id, nom: p.name, pourcent: s.percent, taches_ouvertes: s.tasksOpen, echeance: p.due };
        }),
        habitudes: L.habits.today().map(function (h) {
          return { nom: h.habit.name, fait: h.done, objectif: L.habits.targetLabel(h.habit), serie: h.streak };
        })
      };
      if (L.store.state.settings.ai.shareFinance) {
        var m = L.finance.month();
        var b = L.finance.budget();
        ctx.finances = {
          solde: L.finance.totalBalance(),
          revenus_mois: m.income, depenses_mois: m.expense, epargne_mois: m.put,
          taux_epargne: Math.round(m.rate * 100),
          budget: b.global ? { plafond: b.global.budget, consomme: b.global.spent } : null
        };
      }
      return ctx;
    },

    system: function () {
      return [
        "Tu es l'assistant intégré de LifeOS, une application personnelle d'organisation.",
        "Tu réponds en français, brièvement, sans formule de politesse inutile, sans inventer de chiffre.",
        "Les données ci-dessous sont la seule source de vérité ; si une information manque, dis-le.",
        "Les durées sont en minutes, les montants dans la devise de l'utilisateur.",
        "Pour AGIR, termine ta réponse par un bloc JSON seul sur ses lignes, entre ```action et ```, de la forme :",
        '{"type":"add_task","titre":"...","date":"AAAA-MM-JJ","heure":"HH:MM","minutes":30,"priorite":0..3}',
        '{"type":"add_expense","montant":12.5,"categorie":"Courses","description":"..."}',
        '{"type":"postpone_task","id":"tsk_...","date":"AAAA-MM-JJ"}',
        '{"type":"complete_task","id":"tsk_..."}',
        '{"type":"create_goal","nom":"...","cible":4500,"unite":"€","date":"AAAA-MM-JJ"}',
        '{"type":"create_project","nom":"..."}  {"type":"create_note","titre":"...","texte":"..."}',
        "N'émets un bloc action que si l'utilisateur demande explicitement une modification."
      ].join('\n');
    },

    ask: function (question, history) {
      var ai = L.store.state.settings.ai;
      var messages = (history || []).slice(-8).map(function (m) {
        return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text };
      });
      messages.push({
        role: 'user',
        content: 'Données actuelles (JSON) :\n' + JSON.stringify(remote.context()) + '\n\nQuestion : ' + question
      });
      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ai.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: ai.model || 'claude-sonnet-5',
          max_tokens: 1200,
          system: remote.system(),
          messages: messages
        })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('API ' + r.status + ' — ' + t.slice(0, 200)); });
        return r.json();
      }).then(function (data) {
        var text = (data.content || []).filter(function (c) { return c.type === 'text'; })
          .map(function (c) { return c.text; }).join('\n').trim();
        return text || 'Réponse vide.';
      });
    }
  };

  /* Exécute un bloc ```action``` renvoyé par le modèle. */
  function runRemoteAction(block) {
    var a;
    try { a = JSON.parse(block); } catch (e) { return null; }
    if (!L.store.state.settings.ai.allowActions) return 'Action ignorée : les actions de l\'assistant sont désactivées dans les réglages.';
    switch (a.type) {
      case 'add_task': {
        var t = L.tasks.create({
          title: a.titre || a.title || 'Tâche', date: a.date || null, time: a.heure || null,
          estimate: a.minutes || 30, priority: a.priorite === undefined ? 2 : a.priorite, due: a.echeance || null
        });
        return 'Tâche ajoutée : « ' + t.title + ' ».';
      }
      case 'add_expense': {
        var cat = a.categorie ? N.match(a.categorie, L.finance.categories('expense'), 'name') : null;
        var tx = L.finance.create({ type: 'expense', amount: a.montant, description: a.description || (cat ? cat.name : 'Dépense'), categoryId: cat ? cat.id : null, date: a.date || D.today() });
        return 'Dépense enregistrée : ' + L.format.money(tx.amount) + '.';
      }
      case 'postpone_task': {
        var target = a.id ? L.tasks.get(a.id) : N.match(a.titre || '', L.tasks.filter({ status: 'open' }), 'title');
        if (!target) return 'Tâche introuvable.';
        L.tasks.postpone(target.id, a.date);
        return '« ' + target.title + ' » reportée.';
      }
      case 'complete_task': {
        var done = a.id ? L.tasks.get(a.id) : N.match(a.titre || '', L.tasks.filter({ status: 'open' }), 'title');
        if (!done) return 'Tâche introuvable.';
        L.tasks.setStatus(done.id, 'done');
        return '« ' + done.title + ' » terminée.';
      }
      case 'create_goal': {
        var g = L.goals.create({ name: a.nom || 'Objectif', target: a.cible || 100, unit: a.unite || '', targetDate: a.date || null });
        return 'Objectif créé : « ' + g.name + ' ».';
      }
      case 'create_project': {
        var p = L.projects.create({ name: a.nom || 'Projet', due: a.date || null });
        return 'Projet créé : « ' + p.name + ' ».';
      }
      case 'create_note': {
        var n = L.notes.create({ title: a.titre || 'Note', body: a.texte || '' });
        return 'Note créée : « ' + n.title + ' ».';
      }
    }
    return null;
  }

  /* ======================================================================
     Point d'entrée
     ====================================================================== */
  var A = {
    INTENTS: INTENTS,

    route: function (text) {
      /* Les expressions sont écrites sans accents : on compare donc sur une
         version repliée de la phrase, tout en gardant l'originale pour en
         extraire les intitulés. */
      var folded = L.util.fold(text);
      for (var i = 0; i < INTENTS.length; i++) {
        var it = INTENTS[i];
        if (!it.test.test(folded)) continue;
        if (it.guard && !it.guard(folded)) continue;
        return it;
      }
      return null;
    },

    ask: function (text) {
      var question = String(text || '').trim();
      if (!question) return Promise.resolve(reply(''));
      var intent = A.route(question);

      if (intent) {
        var res;
        try { res = intent.run(question); }
        catch (e) {
          console.error('[LifeOS] assistant', e);
          res = reply("Je n'ai pas réussi à traiter cette demande.");
        }
        res.intent = res.intent || intent.id;
        return Promise.resolve(res);
      }

      if (remote.available()) {
        return remote.ask(question, L.store.state.chat).then(function (answer) {
          var actionText = null;
          var cleaned = answer.replace(/```action\s*([\s\S]*?)```/g, function (_, body) {
            actionText = runRemoteAction(body.trim());
            return '';
          }).trim();
          return reply(cleaned + (actionText ? '\n\n' + actionText : ''), {
            intent: 'remote',
            actions: actionText ? [{ label: 'Annuler', type: 'undo' }] : []
          });
        }, function (err) {
          return reply('Le service distant n\'a pas répondu : ' + err.message +
            '\n\nJe reste utilisable hors ligne pour tes plannings, tes chiffres et tes ajouts.');
        });
      }

      return Promise.resolve(reply(
        "Je n'ai pas compris cette demande. Essaie par exemple :\n\n" +
        '• « Organise ma soirée »\n• « Quelles sont mes priorités ? »\n' +
        '• « Combien ai-je dépensé ce mois-ci ? »\n• « Ajoute une tâche réviser demain 14h »\n\n' +
        'Pour les questions libres, ajoute une clé d\'API Claude dans Paramètres → Assistant.',
        { intent: 'unknown' }));
    },

    /* Suggestions affichées sous la conversation, adaptées au moment. */
    suggestions: function () {
      var out = [];
      var hour = new Date().getHours();
      var overdue = L.tasks.overdue().length;
      var behind = L.goals.behind().length;

      if (hour >= 17) out.push('Organise ma soirée');
      else if (hour < 12) out.push('Organise ma journée');
      else out.push('Organise mon après-midi');

      out.push('Quelles sont mes priorités ?');
      if (overdue) out.push("Qu'est-ce qui est en retard ?");
      if (behind) out.push('Quels objectifs sont en retard ?');
      out.push('Combien ai-je dépensé ce mois-ci ?');
      if (D.dow(D.today()) === 0) out.push('Organise ma semaine');
      out.push("J'ai deux heures libres, que faire ?");
      return out.slice(0, 6);
    },

    /* Journal de conversation : conservé avec les données, donc local. */
    history: function () { return L.store.state.chat; },
    remember: function (role, text, meta) {
      L.store.update(function (s) {
        s.chat.push({ id: L.util.uid('msg'), role: role, text: text, at: Date.now(), meta: meta || null });
        if (s.chat.length > 200) s.chat = s.chat.slice(-200);
      });
    },
    clearHistory: function () { L.store.update(function (s) { s.chat = []; }, 'Conversation effacée'); },

    remote: remote
  };

  L.assistant = A;
})(window.LifeOS = window.LifeOS || {});
