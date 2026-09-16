/* ==========================================================================
   LifeOS — Aujourd'hui
   Une seule journée, vue de bout en bout : ce qui est calé, ce qui reste à
   faire, les habitudes, et le bilan du soir. On peut reculer ou avancer
   d'un jour sans changer d'écran.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function header(day) {
    var isToday = day === D.today();
    return h('div.view__head', [
      h('div.between.wrap', [
        h('div', [
          h('div.eyebrow', isToday ? "Aujourd'hui" : D.relative(day)),
          h('h1.view__title', D.caps(D.format(day, 'long')))
        ]),
        h('div.row', [
          h('button.iconbtn', { 'aria-label': 'Jour précédent', onclick: function () { L.router.setParams({ date: D.addDays(day, -1) }); } }, L.icon('chevron-left')),
          isToday ? null : h('button.btn.btn--s', { onclick: function () { L.router.setParams({ date: D.today() }); } }, "Aujourd'hui"),
          h('button.iconbtn', { 'aria-label': 'Jour suivant', onclick: function () { L.router.setParams({ date: D.addDays(day, 1) }); } }, L.icon('chevron-right'))
        ])
      ])
    ]);
  }

  function summary(day) {
    var tasks = L.tasks.forDate(day, { includeOverdue: day === D.today() });
    var open = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
    var done = tasks.filter(function (t) { return t.status === 'done'; });
    var load = L.calendar.load(day);
    var habits = L.habits.dayCompletion(day);
    var free = L.calendar.availableMinutes(day, { fromNow: day === D.today() });

    return h('div.grid.grid--4.grid--keep2', [
      L.views.stat('À faire', String(open.length), D.duration(L.util.sum(open, function (t) { return t.estimate || 0; })) + ' estimées'),
      L.views.stat('Terminées', String(done.length), done.length ? D.duration(L.util.sum(done, function (t) { return t.actual || t.estimate || 0; })) + ' de travail' : '—'),
      L.views.stat('Temps libre', D.duration(free, { zero: '0 min' }), load.overloaded ? 'Journée en surcharge' : 'sur la plage de la journée',
        { bar: L.util.clamp(load.ratio, 0, 1), barVariant: load.overloaded ? 'danger' : null }),
      L.views.stat('Habitudes', habits.total ? habits.done + ' / ' + habits.total : '—',
        habits.total ? L.format.percent(habits.ratio, 0) + ' tenues' : 'aucune prévue',
        { bar: habits.ratio, barVariant: habits.ratio === 1 ? 'positive' : null })
    ]);
  }

  L.views.today = function (params) {
    var day = params.date || D.today();
    var plan = L.planner.get(day);
    var agenda = L.calendar.agenda(day, { habits: false });
    var events = agenda.filter(function (i) { return i.kind === 'event'; });
    var deadlines = agenda.filter(function (i) { return i.kind === 'due'; });
    var tasks = L.tasks.forDate(day, { includeOverdue: day === D.today() });
    var open = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
    var done = tasks.filter(function (t) { return t.status !== 'todo' && t.status !== 'doing' && t.status !== 'postponed'; });
    var habits = L.habits.today(day);

    return h('div.view', [
      header(day),
      summary(day),

      /* --- déroulé --- */
      h('div.section', [
        L.views.sectionHead(plan ? 'Ton déroulé' : 'Journée', h('div.row', [
          plan ? h('button.btn.btn--s', { onclick: function () { L.router.go('planning', { date: day }); } }, 'Modifier') : null,
          h('button.btn.btn--s.btn--primary', {
            onclick: function () { L.router.go('planning', { date: day, generate: 'day' }); }
          }, [L.icon('sparkle'), plan ? 'Refaire' : 'Organiser'])
        ])),
        plan && plan.blocks.length
          ? h('div.card', [L.views.planTimeline(plan, { editable: true })])
          : events.length
            ? h('div.list.list--framed', events.map(function (i) { return L.views.agendaItem(i); }))
            : L.dom.empty('layout', 'Rien de calé', 'Aucun rendez-vous ce jour-là. Laisse le planning répartir tes tâches.',
                h('button.btn.btn--primary', { onclick: function () { L.router.go('planning', { date: day, generate: 'day' }); } }, 'Organiser la journée'))
      ]),

      /* --- échéances --- */
      deadlines.length ? h('div.section', [
        L.views.sectionHead('Échéances du jour'),
        h('div.list.list--framed', deadlines.map(function (i) { return L.views.agendaItem(i); }))
      ]) : null,

      /* --- tâches --- */
      h('div.section', [
        L.views.sectionHead('Tâches' + (open.length ? ' · ' + open.length : ''), h('div.row', [
          h('button.btn.btn--s', { onclick: function () { L.forms.quickTask(null, ''); } }, [L.icon('plus'), 'Ajouter'])
        ])),
        open.length
          ? h('div.list--framed', open.map(function (t) { return L.views.taskRow(t); }))
          : L.dom.empty('check', 'Tout est fait', 'Aucune tâche ouverte pour cette journée.')
      ]),

      /* --- habitudes --- */
      habits.length ? h('div.section', [
        L.views.sectionHead('Habitudes', h('button.btn.btn--s.btn--ghost', {
          onclick: function () { L.router.go('habits'); }
        }, 'Gérer')),
        h('div.list--framed', habits.map(function (x) { return L.views.habitRow(x.habit, day); }))
      ]) : null,

      /* --- ce qui est déjà derrière --- */
      done.length ? h('div.section', [
        L.views.sectionHead('Terminé · ' + done.length),
        h('div.list--framed', done.map(function (t) { return L.views.taskRow(t, { actions: false }); }))
      ]) : null,

      /* --- bilan du soir --- */
      (day === D.today() && new Date().getHours() >= 18) ? h('div.section', [
        h('div.card.card--ink', [
          h('div.card__title', { style: { marginBottom: '10px' } }, 'Bilan de la journée'),
          h('p.t-s', done.length
            ? done.length + ' ' + L.util.plural(done.length, 'tâche') + ' ' + L.util.plural(done.length, 'terminée') + ', ' +
              D.duration(L.util.sum(done, function (t) { return t.actual || t.estimate || 0; })) + ' de travail' +
              (open.length ? ' — il reste ' + open.length + ' ' + L.util.plural(open.length, 'tâche') + '.' : ' — journée bouclée.')
            : 'Rien de coché aujourd\'hui. Ça arrive : reporte ce qui ne tenait pas et repars demain.'),
          h('div.row', { style: { marginTop: '14px', gap: '8px' } }, [
            open.length ? h('button.btn.btn--s', {
              onclick: function () {
                var ids = open.map(function (t) { return t.id; });
                L.store.update(function (s) {
                  s.tasks.forEach(function (t) {
                    if (ids.indexOf(t.id) > -1) { t.date = D.addDays(day, 1); t.status = 'postponed'; }
                  });
                }, 'Tâches reportées');
                L.toast.undo(ids.length + ' ' + L.util.plural(ids.length, 'tâche') + ' ' + L.util.plural(ids.length, 'reportée') + ' à demain');
              }
            }, 'Tout reporter à demain') : null,
            h('button.btn.btn--s', { onclick: function () { L.router.go('planning', { date: D.addDays(day, 1), generate: 'day' }); } }, 'Préparer demain')
          ])
        ])
      ]) : null
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
