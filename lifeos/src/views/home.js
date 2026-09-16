/* ==========================================================================
   LifeOS — Accueil
   Le centre de contrôle : ce qui se passe maintenant, ce qui compte
   aujourd'hui, et les quatre gestes que l'on fait vingt fois par jour.
   L'écran suit l'heure : le matin il prépare, le soir il fait le point.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 5) return 'Bonne nuit';
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  function hero() {
    var now = new Date();
    var name = (L.app.profile() && L.app.profile().name || '').split(' ')[0];
    return h('div.hero', [
      h('div', [
        h('div.hero__date', D.caps(D.format(D.today(), 'full'))),
        h('div.hero__greet', greeting() + (name ? ', ' + name : ''))
      ]),
      h('div.hero__clock.desktop-only', D.toTime(now.getHours() * 60 + now.getMinutes()))
    ]);
  }

  /* Raccourcis disponibles pour la barre d'actions rapides. L'ordre et la
     sélection se règlent dans Paramètres → Navigation. */
  var SHORTCUTS = {
    lost:      { label: 'Je suis perdu', icon: 'compass', strong: true, run: function () { L.views.lost(); } },
    task:      { label: 'Tâche', icon: 'check', run: function () { L.forms.quickTask(); } },
    note:      { label: 'Note', icon: 'note', run: function () { L.forms.note(); } },
    expense:   { label: 'Dépense', icon: 'wallet', run: function () { L.forms.transaction(null, { type: 'expense' }); } },
    assistant: { label: 'Assistant', icon: 'sparkle', run: function () { L.router.go('assistant'); } },
    event:     { label: 'Événement', icon: 'calendar', run: function () { L.forms.event(null, { date: D.today() }); } },
    project:   { label: 'Projet', icon: 'folder', run: function () { L.forms.project(); } },
    goal:      { label: 'Objectif', icon: 'target', run: function () { L.forms.goal(); } },
    habit:     { label: 'Habitude', icon: 'repeat', run: function () { L.forms.habit(); } },
    planning:  { label: 'Organiser', icon: 'layout', run: function () { L.router.go('planning', { generate: 'day' }); } },
    search:    { label: 'Rechercher', icon: 'search', run: function () { L.palette.open(); } }
  };

  function quickbar() {
    var home = L.store.state.settings.home || {};
    var list = (home.shortcuts && home.shortcuts.length ? home.shortcuts : ['lost', 'task', 'note', 'expense', 'assistant'])
      .filter(function (id) { return SHORTCUTS[id]; });
    return h('div.quickbar', list.map(function (id) {
      var def = SHORTCUTS[id];
      return h('button.quick' + (def.strong ? '.quick--strong' : ''), { onclick: def.run },
        [L.icon(def.icon), def.label]);
    }));
  }

  /* ---------------- widgets ---------------- */
  var WIDGETS = {
    /* Le déroulé du jour, ou l'invitation à le construire. */
    planning: function () {
      var today = D.today();
      var plan = L.planner.get(today);
      var free = L.calendar.availableMinutes(today);
      var current = plan ? L.planner.currentBlock(plan) : null;
      var next = plan ? L.planner.nextBlock(plan) : null;

      var body;
      if (plan && plan.blocks.length) {
        var blocks = plan.blocks.filter(function (b) { return b.end > D.nowMinutes() - 30; }).slice(0, 4);
        body = h('div.timeline', blocks.map(function (b) {
          var ref = b.type === 'task' ? L.tasks.get(b.refId) : null;
          var done = ref && ref.status === 'done';
          var isNow = current && current.id === b.id;
          return h('div.block.block--' + b.type + (isNow ? '.block--now' : ''), [
            h('div.block__time', D.toTime(b.start)),
            h('div.block__rule'),
            h('div.block__body', [
              h('div.block__title' + (done ? '.strike.muted' : ''), b.title),
              h('div.block__why', D.duration(b.minutes) + (b.why ? ' · ' + b.why : ''))
            ])
          ]);
        }));
      } else {
        body = h('div.col', { style: { gap: '12px' } }, [
          h('p.t-s.muted', free > 30
            ? D.duration(free) + ' de libre aujourd\'hui. Je peux répartir tes tâches, tes habitudes et tes échéances au bon moment.'
            : 'La journée est déjà bien remplie.'),
          h('button.btn.btn--primary', {
            onclick: function () { L.router.go('planning', { generate: 'day' }); }
          }, [L.icon('sparkle'), 'Organiser ma journée'])
        ]);
      }

      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', current ? 'En ce moment' : 'Planning du jour'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('planning'); } }, 'Ouvrir')
        ]),
        current ? h('div', { style: { marginBottom: '14px' } }, [
          h('div.t-l.w-600', current.title),
          h('div.t-xs.muted', D.toTime(current.start) + ' – ' + D.toTime(current.end) +
            ' · reste ' + D.duration(current.end - D.nowMinutes()))
        ]) : null,
        body,
        next && current ? h('div.card__foot.t-xs.muted', 'Ensuite : ' + next.title + ' à ' + D.toTime(next.start)) : null
      ]);
    },

    /* Les tâches qui comptent, dans l'ordre du moteur de priorité. */
    tasks: function () {
      var list = L.tasks.filter({ status: 'open', sort: 'score' }).slice(0, 5);
      var overdue = L.tasks.overdue().length;
      return h('div.card', { style: { padding: '0', overflow: 'hidden' } }, [
        h('div.card__head', { style: { padding: 'var(--sp-5) var(--sp-5) 0', marginBottom: 'var(--sp-3)' } }, [
          h('div.card__title', [
            'Tâches prioritaires',
            overdue ? h('span.chip.chip--danger', { style: { marginLeft: '8px' } }, overdue + ' en retard') : null
          ]),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('tasks'); } }, 'Tout voir')
        ]),
        list.length
          ? h('div', list.map(function (t) { return L.views.taskRow(t, { showGoal: false }); }))
          : h('div', { style: { padding: '0 var(--sp-5) var(--sp-5)' } }, [
              h('p.t-s.muted', 'Aucune tâche ouverte. '),
              h('button.btn.btn--s', { style: { marginTop: '10px' }, onclick: function () { L.forms.quickTask(); } }, 'Ajouter une tâche')
            ])
      ]);
    },

    /* Prochain rendez-vous — et le temps qu'il reste avant. */
    next: function () {
      var today = D.today();
      var now = D.nowMinutes();
      var upcoming = null;
      for (var i = 0; i < 8 && !upcoming; i++) {
        var day = D.addDays(today, i);
        var events = L.calendar.eventsOn(day).filter(function (e) {
          return e.allDay || i > 0 || (D.toMinutes(e.start) || 0) >= now - 30;
        });
        if (events.length) upcoming = { day: day, event: events[0] };
      }
      if (!upcoming) {
        return h('div.card', [
          h('div.card__head', [h('div.card__title', 'Prochain événement')]),
          h('p.t-s.muted', 'Rien de prévu dans les huit prochains jours.'),
          h('button.btn.btn--s', { style: { marginTop: '12px' }, onclick: function () { L.forms.event(null, { date: today }); } },
            [L.icon('plus'), 'Ajouter'])
        ]);
      }
      var e = upcoming.event;
      var mins = upcoming.day === today && !e.allDay ? (D.toMinutes(e.start) - now) : null;
      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Prochain événement'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('calendar', { date: upcoming.day }); } }, 'Calendrier')
        ]),
        h('div.t-l.w-600.truncate', e.title),
        h('div.t-s.muted', { style: { marginTop: '4px' } },
          D.relative(upcoming.day) + (e.allDay ? '' : ' · ' + e.start + ' – ' + e.end) + (e.location ? ' · ' + e.location : '')),
        mins !== null && mins > 0 ? h('div.chip.chip--accent', { style: { marginTop: '12px' } }, 'Dans ' + D.duration(mins))
          : mins !== null ? h('div.chip.chip--danger', { style: { marginTop: '12px' } }, 'En cours') : null
      ]);
    },

    /* Objectifs : les deux qui demandent le plus d'attention. */
    goals: function () {
      var all = L.goals.active().map(L.goals.summary);
      if (!all.length) {
        return h('div.card', [
          h('div.card__head', [h('div.card__title', 'Objectifs')]),
          h('p.t-s.muted', 'Aucun objectif actif. Un objectif donne une direction à tes tâches.'),
          h('button.btn.btn--s', { style: { marginTop: '12px' }, onclick: function () { L.forms.goal(); } }, [L.icon('plus'), 'Créer un objectif'])
        ]);
      }
      var sorted = all.sort(function (a, b) { return (a.gap || 0) - (b.gap || 0); }).slice(0, 2);
      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Objectifs en cours'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('goals'); } }, 'Tout voir')
        ]),
        h('div.col', { style: { gap: 'var(--sp-5)' } }, sorted.map(function (s) {
          var tone = s.late ? 'danger' : s.behind ? 'warning' : s.ahead ? 'positive' : null;
          return h('button', { style: { textAlign: 'left' }, onclick: function () { L.router.go('goals', { id: s.goal.id }); } }, [
            h('div.between.t-s', { style: { marginBottom: '6px' } }, [
              h('span.w-500.truncate', s.goal.name),
              h('span.num.muted', s.percent + ' %')
            ]),
            L.dom.bar(s.progress, tone),
            h('div.t-xs.faint', { style: { marginTop: '5px' } },
              L.format.quantity(s.current, s.unit) + ' / ' + L.format.quantity(s.target, s.unit) +
              (s.perMonth ? ' · ' + L.format.quantity(L.util.round(s.perMonth, 2), s.unit) + '/mois' : ''))
          ]);
        }))
      ]);
    },

    /* Habitudes du jour, cochables directement. */
    habits: function () {
      var list = L.habits.today();
      var completion = L.habits.dayCompletion();
      if (!list.length) {
        return h('div.card', [
          h('div.card__head', [h('div.card__title', 'Habitudes')]),
          h('p.t-s.muted', 'Aucune habitude prévue aujourd\'hui.')
        ]);
      }
      return h('div.card', { style: { padding: '0', overflow: 'hidden' } }, [
        h('div.card__head', { style: { padding: 'var(--sp-5) var(--sp-5) 0', marginBottom: 'var(--sp-3)' } }, [
          h('div.card__title', 'Habitudes du jour'),
          h('span.t-xs.muted.num', completion.done + ' / ' + completion.total)
        ]),
        h('div', { style: { padding: '0 var(--sp-5)', marginBottom: 'var(--sp-3)' } }, [
          L.dom.bar(completion.ratio, completion.ratio === 1 ? 'positive' : null, { thin: true })
        ]),
        h('div', list.slice(0, 5).map(function (x) { return L.views.habitRow(x.habit, D.today(), { actions: false }); })),
        list.length > 5 ? h('div', { style: { padding: 'var(--sp-3) var(--sp-5)' } }, [
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('habits'); } }, 'Voir les ' + list.length + ' habitudes')
        ]) : null
      ]);
    },

    /* Le mois en cours, en trois chiffres. */
    finance: function () {
      var m = L.finance.month();
      var budget = L.finance.budget();
      var forecast = L.finance.forecast();
      var saveGoal = L.goals.active().filter(function (g) {
        return (g.source && g.source.type === 'savings') || g.unit === '€';
      })[0];

      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Ce mois'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('finance'); } }, 'Finances')
        ]),
        h('div.grid.grid--3.grid--keep2', { style: { gap: 'var(--sp-4)' } }, [
          h('div', [
            h('div.stat__label', 'Revenus'),
            h('div.t-l.w-600.num.positive', L.format.money(m.income, { decimals: 0 }))
          ]),
          h('div', [
            h('div.stat__label', 'Dépenses'),
            h('div.t-l.w-600.num', L.format.money(m.expense, { decimals: 0 }))
          ]),
          h('div', [
            h('div.stat__label', 'Épargne'),
            h('div.t-l.w-600.num', L.format.money(m.put, { decimals: 0 }))
          ])
        ]),
        budget.global ? h('div', { style: { marginTop: 'var(--sp-5)' } }, [
          h('div.between.t-xs', { style: { marginBottom: '6px' } }, [
            h('span.muted', 'Budget du mois'),
            h('span.num' + (budget.global.state === 'over' ? '.negative' : budget.global.state === 'near' ? '.warning' : ''),
              L.format.money(budget.global.spent, { decimals: 0 }) + ' / ' + L.format.money(budget.global.budget, { decimals: 0 }))
          ]),
          L.dom.bar(budget.global.ratio, budget.global.state === 'over' ? 'danger' : budget.global.state === 'near' ? 'warning' : null)
        ]) : h('div.t-xs.faint', { style: { marginTop: 'var(--sp-4)' } },
          'Taux d\'épargne : ' + L.format.percent(m.rate) + ' · projection de dépenses ' + L.format.money(forecast.projected, { decimals: 0 })),
        saveGoal ? (function () {
          var s = L.goals.summary(saveGoal);
          return h('div.card__foot', [
            h('div.between.t-xs', { style: { marginBottom: '6px' } }, [
              h('span.truncate', saveGoal.name),
              h('span.num.muted', L.format.quantity(s.current, s.unit) + ' / ' + L.format.quantity(s.target, s.unit))
            ]),
            L.dom.bar(s.progress, s.behind ? 'warning' : 'positive', { thin: true }),
            s.perMonth ? h('div.t-xs.faint', { style: { marginTop: '5px' } },
              L.format.quantity(L.util.round(s.perMonth, 2), s.unit) + ' par mois pour tenir la date cible') : null
          ]);
        })() : null
      ]);
    },

    /* Temps disponible : la ressource la plus rare. */
    time: function () {
      var today = D.today();
      var load = L.calendar.load(today);
      var slots = L.calendar.freeSlots(today);
      var free = L.util.sum(slots, function (s) { return s.minutes; });
      return h('div.card', [
        h('div.card__head', [h('div.card__title', 'Temps disponible')]),
        h('div.stat__value', D.duration(free, { zero: '0 min' })),
        h('div.stat__hint', load.overloaded
          ? 'Journée en surcharge : ' + D.duration(load.planned) + ' prévus'
          : D.duration(load.planned) + ' déjà engagés sur la journée'),
        h('div', { style: { marginTop: 'var(--sp-4)' } }, [
          L.dom.bar(L.util.clamp(load.ratio, 0, 1), load.overloaded ? 'danger' : load.ratio > 0.8 ? 'warning' : null)
        ]),
        slots.length ? h('div.col', { style: { marginTop: 'var(--sp-4)', gap: '4px' } },
          slots.slice(0, 3).map(function (s) {
            return h('div.between.t-xs.muted', [
              h('span', D.toTime(s.start) + ' – ' + D.toTime(s.end)),
              h('span.num', D.duration(s.minutes))
            ]);
          })) : null
      ]);
    },

    /* Où en est la semaine. */
    week: function () {
      var w = L.stats.weekProgress();
      var start = D.startOfWeek(D.today(), L.store.state.settings.firstDayOfWeek);
      var days = D.range(start, D.addDays(start, 6));
      var series = days.map(function (d) {
        var st = L.stats.taskDay(d);
        return { label: D.DAYS_SHORT[D.dow(d)], value: st.done, future: d > D.today() };
      });
      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Cette semaine'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('stats'); } }, 'Statistiques')
        ]),
        h('div.row', { style: { gap: 'var(--sp-6)' } }, [
          h('div', [
            h('div.stat__label', 'Tâches faites'),
            h('div.t-xl.w-600.num', String(w.done))
          ]),
          h('div', [
            h('div.stat__label', 'Temps travaillé'),
            h('div.t-xl.w-600.num', D.duration(w.minutes, { zero: '0' }))
          ]),
          h('div', [
            h('div.stat__label', 'Habitudes'),
            h('div.t-xl.w-600.num', L.format.percent(w.habits || 0, 0))
          ])
        ]),
        h('div', { style: { marginTop: 'var(--sp-4)' } }, [
          L.charts.bars(series, { height: 110, barWidth: 18, labels: true, format: function (v) { return String(Math.round(v)); } })
        ])
      ]);
    },

    /* Premiers pas : visible tant que l'application est vide, et seulement
       là. Chaque étape se coche d'elle-même quand elle est faite. */
    start: function () {
      var S = L.store.state;
      var steps = [
        {
          done: S.tasks.length > 0,
          title: 'Ajoute ta première tâche',
          detail: 'Une phrase suffit : « réviser les stats demain 14h, 1 h ».',
          label: 'Ajouter', run: function () { L.forms.quickTask(); }
        },
        {
          done: Object.keys(S.plans).length > 0,
          title: 'Laisse LifeOS organiser ta journée',
          detail: 'Il place tes tâches dans tes créneaux libres et explique pourquoi.',
          label: 'Organiser', run: function () { L.router.go('planning', { generate: 'day' }); }
        },
        {
          done: S.goals.length > 0,
          title: 'Pose un objectif',
          detail: 'Il devient un rythme à tenir, pas une intention vague.',
          label: 'Créer', run: function () { L.forms.goal(); }
        },
        {
          done: S.transactions.some(function (t) { return t.fixed; }),
          title: 'Déclare tes revenus et charges fixes',
          detail: 'Loyer, abonnements, salaire : ils se réenregistrent seuls chaque mois.',
          label: 'Déclarer', run: function () { L.forms.transaction(null, { type: 'expense', fixed: true }); }
        },
        {
          done: L.habits.dayCompletion().done > 0,
          title: 'Coche une habitude du jour',
          detail: 'La régularité se voit au bout de trois jours.',
          label: 'Voir', run: function () { L.router.go('habits'); }
        }
      ];
      var done = steps.filter(function (x) { return x.done; }).length;

      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Premiers pas'),
          h('span.t-xs.muted.num', done + ' / ' + steps.length)
        ]),
        h('div', { style: { marginBottom: 'var(--sp-4)' } }, [L.dom.bar(done / steps.length, done === steps.length ? 'positive' : null, { thin: true })]),
        h('div.col', { style: { gap: 'var(--sp-3)' } }, steps.map(function (step) {
          return h('div.row-top', { style: { opacity: step.done ? '.5' : '1' } }, [
            h('span', { style: { color: step.done ? 'var(--positive)' : 'var(--ink-4)', marginTop: '1px' } },
              L.icon(step.done ? 'check' : 'circle', 16)),
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.w-500' + (step.done ? '.strike' : ''), step.title),
              h('div.t-xs.faint', step.detail)
            ]),
            step.done ? null : h('button.btn.btn--s', { onclick: step.run }, step.label)
          ]);
        }))
      ]);
    },

    /* Le soir, l'accueil prépare déjà demain. */
    tomorrow: function () {
      var tomorrow = D.addDays(D.today(), 1);
      var items = L.calendar.agenda(tomorrow, { habits: false });
      var tasks = L.tasks.forDate(tomorrow, { includeDue: true }).filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
      return h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Demain'),
          h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('calendar', { date: tomorrow }); } }, 'Voir')
        ]),
        h('div.row.wrap.t-xs.muted', { style: { gap: '10px', marginBottom: 'var(--sp-3)' } }, [
          h('span', items.filter(function (i) { return i.kind === 'event'; }).length + ' rendez-vous'),
          h('span', tasks.length + ' ' + L.util.plural(tasks.length, 'tâche')),
          h('span', D.duration(L.calendar.availableMinutes(tomorrow, { fromNow: false })) + ' de libre')
        ]),
        items.length || tasks.length
          ? h('div.list', items.slice(0, 3).map(function (i) { return L.views.agendaItem(i); })
              .concat(tasks.slice(0, 3).map(function (t) { return L.views.taskRow(t, { actions: false, showDate: false }); })))
          : h('p.t-s.muted', 'Journée libre pour l\'instant.')
      ]);
    }
  };

  L.views.home = function () {
    var settings = L.store.state.settings;
    var hidden = (settings.home && settings.home.hidden) || [];
    var order = (settings.home && settings.home.widgets) || Object.keys(WIDGETS);
    var hour = new Date().getHours();

    /* L'ordre suit le moment de la journée : le soir, demain passe devant
       les tâches du jour. */
    var list = order.filter(function (id) { return WIDGETS[id] && hidden.indexOf(id) === -1; });
    if (hour >= 19 && list.indexOf('tomorrow') === -1) list.splice(1, 0, 'tomorrow');
    if (hour < 19) list = list.filter(function (id) { return id !== 'tomorrow'; });

    /* Tant que l'application est quasi vide, l'accueil montre par où commencer
       plutôt que des cartes sans contenu. */
    var S = L.store.state;
    var young = S.tasks.length < 6 && S.goals.length < 2 && S.projects.length < 2;
    var everyStepDone = S.tasks.length > 0 && Object.keys(S.plans).length > 0 &&
      S.goals.length > 0 && S.transactions.some(function (t) { return t.fixed; }) &&
      L.habits.dayCompletion().done > 0;
    if (young && !everyStepDone && hidden.indexOf('start') === -1) list.unshift('start');

    var big = ['start', 'planning', 'tasks'];
    var primary = list.filter(function (id) { return big.indexOf(id) > -1; });
    var secondary = list.filter(function (id) { return big.indexOf(id) === -1; });

    return h('div.view', [
      hero(),
      quickbar(),
      h('div.grid', {
        style: {
          marginTop: 'var(--sp-6)', alignItems: 'start',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))'
        }
      }, primary.map(function (id) { return WIDGETS[id](); })),
      h('div.grid.grid--auto', { style: { marginTop: 'var(--sp-4)', alignItems: 'start' } },
        secondary.map(function (id) { return WIDGETS[id](); }))
    ]);
  };

  L.views.homeWidgets = WIDGETS;
  L.views.homeShortcuts = SHORTCUTS;
})(window.LifeOS = window.LifeOS || {});
