/* ==========================================================================
   LifeOS — Objectifs
   Un objectif affiche toujours quatre choses : où j'en suis, ce qu'il reste,
   le temps qu'il reste, et le rythme nécessaire pour y arriver. La
   comparaison entre progression réelle et progression attendue est ce qui
   permet de réagir avant qu'il ne soit trop tard.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  /* Historique reconstitué : points de contrôle saisis, ou valeur calculée
     jour après jour pour les objectifs branchés sur les données. */
  function history(goal, s) {
    var points = [];
    var src = (goal.source || {}).type || 'manual';
    var start = goal.startDate || D.addDays(D.today(), -30);
    var days = Math.max(1, D.diffDays(start, D.today()));
    var step = Math.max(1, Math.round(days / 24));

    if (src === 'savings') {
      for (var i = 0; i <= days; i += step) {
        var day = D.addDays(start, i);
        var total = goal.start || 0;
        L.store.state.transactions.forEach(function (t) {
          if (t.date < start || t.date > day) return;
          var linked = (t.goalId === goal.id) ||
            (goal.source.accountId && t.toAccountId === goal.source.accountId && (t.type === 'saving' || t.type === 'invest'));
          if (linked) total += t.amount;
        });
        points.push({ label: D.format(day, 'numS'), value: total });
      }
    } else if ((goal.checkpoints || []).length) {
      points.push({ label: D.format(start, 'numS'), value: goal.start || 0 });
      goal.checkpoints.forEach(function (c) {
        points.push({ label: D.format(c.date, 'numS'), value: c.value });
      });
    } else {
      points.push({ label: D.format(start, 'numS'), value: goal.start || 0 });
    }
    points.push({ label: "auj.", value: s.current });
    return points;
  }

  function detail(goal) {
    var s = L.goals.summary(goal);
    var tasks = L.goals.linkedTasks(goal);
    var openTasks = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
    var projects = L.goals.linkedProjects(goal);
    var notes = L.notes.forEntity(goal.id);
    var src = (goal.source || {}).type || 'manual';
    var points = history(goal, s);

    var tone = s.done ? 'positive' : s.late ? 'danger' : s.behind ? 'warning' : s.ahead ? 'positive' : null;

    return h('div.view', [
      h('div.view__head', [
        h('button.btn.btn--s.btn--ghost', {
          style: { marginBottom: 'var(--sp-4)' },
          onclick: function () { L.router.go('goals'); }
        }, [L.icon('chevron-left'), 'Tous les objectifs']),
        h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
          h('div', { style: { minWidth: 0 } }, [
            h('div.row.wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
              h('span.chip', goal.category || 'Objectif'),
              h('span.chip' + (goal.status === 'active' ? '.chip--accent' : ''), L.schema.label(L.schema.GOAL_STATUS, goal.status)),
              s.late ? h('span.chip.chip--danger', 'Date dépassée')
                : s.behind ? h('span.chip.chip--warning', 'En retard')
                : s.ahead ? h('span.chip.chip--positive', 'En avance') : null
            ]),
            h('h1.view__title', goal.name),
            goal.description ? h('p.view__lead', goal.description) : null
          ]),
          h('div.row', [
            src === 'manual' ? h('button.btn.btn--primary', {
              onclick: function () {
                L.modal.prompt({
                  title: 'Mettre à jour', label: 'Valeur actuelle' + (goal.unit ? ' (' + goal.unit + ')' : ''),
                  value: String(s.current)
                }).then(function (v) {
                  if (v === null) return;
                  L.goals.save(goal.id, { current: parseFloat(String(v).replace(',', '.')) || 0 });
                  L.toast.show('Objectif mis à jour');
                });
              }
            }, 'Mettre à jour') : null,
            h('button.btn', { onclick: function () { L.forms.goal(goal, null, function (saved) { if (!saved) L.router.go('goals'); }); } }, 'Modifier')
          ])
        ])
      ]),

      /* --- chiffres clés --- */
      h('div.card', [
        h('div.between.wrap', { style: { gap: 'var(--sp-6)' } }, [
          h('div.row', { style: { gap: 'var(--sp-5)' } }, [
            L.dom.ring(s.progress, 92, {
              stroke: 7,
              color: tone === 'danger' ? 'var(--danger)'
                : tone === 'warning' ? 'var(--warning)'
                : tone === 'positive' ? 'var(--positive)' : 'var(--accent)',
              label: s.percent + ' %'
            }),
            h('div', [
              h('div.t-3xl.w-600.num', L.format.quantity(s.current, s.unit)),
              h('div.t-s.muted', { style: { marginTop: '2px' } }, 'sur ' + L.format.quantity(goal.target, s.unit)),
              h('div.t-xs.faint', { style: { marginTop: '6px' } },
                'Départ : ' + L.format.quantity(s.start, s.unit) + ' le ' + D.format(goal.startDate, 'short'))
            ])
          ]),
          h('div.col', { style: { gap: '4px', minWidth: '220px' } }, [
            h('div.between.t-s', [h('span.muted', 'Reste'), h('span.w-600.num', L.format.quantity(s.remaining, s.unit))]),
            s.daysLeft !== null ? h('div.between.t-s', [
              h('span.muted', 'Temps restant'),
              h('span.w-600.num' + (s.daysLeft < 0 ? '.negative' : ''), s.daysLeft < 0 ? Math.abs(s.daysLeft) + ' j de retard' : s.daysLeft + ' jours')
            ]) : null,
            s.perWeek ? h('div.between.t-s', [
              h('span.muted', 'Rythme / semaine'),
              h('span.w-600.num', L.format.quantity(L.util.round(s.perWeek, 2), s.unit))
            ]) : null,
            s.perMonth ? h('div.between.t-s', [
              h('span.muted', 'Rythme / mois'),
              h('span.w-600.num', L.format.quantity(L.util.round(s.perMonth, 2), s.unit))
            ]) : null,
            s.projection ? h('div.between.t-s', [
              h('span.muted', 'À ce rythme'),
              h('span.w-600', D.format(s.projection.date, 'short'))
            ]) : null
          ])
        ]),
        h('div', { style: { marginTop: 'var(--sp-5)' } }, [
          L.dom.bar(s.progress, tone),
          s.expected !== null ? h('div.between.t-xs.faint', { style: { marginTop: '6px' } }, [
            h('span', 'Progression réelle : ' + s.percent + ' %'),
            h('span', 'Attendue à ce stade : ' + Math.round(s.expected * 100) + ' %')
          ]) : null
        ]),
        h('div.card__foot.t-s', [
          h('span' + (s.behind || s.late ? '.negative' : s.done ? '.positive' : '.muted'), L.goals.advice(goal))
        ])
      ]),

      /* --- courbe --- */
      points.length > 1 ? h('div.section', [
        L.views.sectionHead('Progression'),
        h('div.card', [
          L.charts.line(points, {
            height: 190,
            max: Math.max(goal.target, s.current) * 1.05,
            min: Math.min(goal.start || 0, points[0].value),
            reference: s.expected !== null ? { from: goal.start || 0, to: goal.target } : null,
            format: function (v) { return L.format.compact(v); }
          }),
          h('div.legend', { style: { marginTop: 'var(--sp-3)' } }, [
            h('span.legend__item', [h('span.dot', { style: { background: 'var(--accent)' } }), 'Réel']),
            s.expected !== null ? h('span.legend__item', [h('span.dot', { style: { background: 'var(--ink-4)' } }), 'Rythme attendu']) : null
          ])
        ])
      ]) : null,

      /* --- d'où vient la valeur --- */
      h('div.section', [
        L.views.sectionHead('Source de la valeur'),
        h('div.card', [
          h('p.t-s', {
            style: { marginBottom: '10px' }
          }, src === 'savings' ? 'Cet objectif suit les transactions d\'épargne qui lui sont liées.'
            : src === 'tasks' ? 'Cet objectif avance quand les tâches liées sont terminées.'
            : src === 'habit' ? 'Cet objectif cumule les relevés d\'une habitude.'
            : src === 'project' ? 'Cet objectif suit l\'avancement d\'un projet.'
            : 'Valeur saisie à la main.'),
          src === 'savings' ? (function () {
            var txs = L.store.state.transactions.filter(function (t) {
              return t.goalId === goal.id || (goal.source.accountId && t.toAccountId === goal.source.accountId);
            }).slice(0, 8);
            return txs.length ? h('div.list', txs.map(function (t) { return L.views.txRow(t); }))
              : h('p.t-xs.faint', 'Aucun versement enregistré pour l\'instant.');
          })() : null,
          src === 'tasks' ? h('p.t-xs.faint', tasks.filter(function (t) { return t.status === 'done'; }).length +
            ' tâches terminées sur ' + tasks.length + ' liées.') : null,
          src === 'savings' ? h('button.btn.btn--s', {
            style: { marginTop: 'var(--sp-4)' },
            onclick: function () { L.forms.transaction(null, { type: 'saving', goalId: goal.id }); }
          }, [L.icon('plus'), 'Enregistrer un versement']) : null
        ])
      ]),

      projects.length ? h('div.section', [
        L.views.sectionHead('Projets associés'),
        h('div.grid.grid--auto', projects.map(function (p) { return L.views.projectCard(p); }))
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Actions associées · ' + openTasks.length,
          h('button.btn.btn--s', { onclick: function () { L.forms.task(null, { goalId: goal.id, domainId: goal.domainId }); } }, [L.icon('plus'), 'Tâche'])),
        openTasks.length
          ? h('div.list--framed', openTasks.map(function (t) { return L.views.taskRow(t, { showGoal: false }); }))
          : L.dom.empty('target', 'Aucune action liée',
              'Un objectif sans tâche n\'avance pas tout seul : ajoute la prochaine action concrète.',
              h('button.btn.btn--primary', { onclick: function () { L.forms.task(null, { goalId: goal.id }); } }, 'Ajouter une action'))
      ]),

      notes.length ? h('div.section', [
        L.views.sectionHead('Notes liées'),
        h('div.grid.grid--auto', notes.map(function (n) {
          return h('button.note-card', { onclick: function () { L.forms.note(n); } }, [
            h('div.t-s.w-600.truncate', n.title),
            h('div.note-card__body.clamp-3', L.notes.excerpt(n, 140))
          ]);
        }))
      ]) : null
    ]);
  }

  L.views.goals = function (params) {
    if (params.id) {
      var goal = L.goals.get(params.id);
      if (goal) return detail(goal);
    }

    var status = params.status || 'active';
    var all = L.store.state.goals;
    var list = status === 'all' ? all : all.filter(function (g) { return g.status === status; });
    var summaries = list.map(L.goals.summary);
    var behind = summaries.filter(function (s) { return s.behind || s.late; });
    var average = summaries.length ? L.util.sum(summaries, function (s) { return s.progress; }) / summaries.length : 0;

    var categories = L.util.unique(list.map(function (g) { return g.category || 'Autres'; }));

    return h('div.view', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Objectifs'),
            h('p.view__lead', list.length + ' ' + L.util.plural(list.length, 'objectif') +
              ' · avancement moyen ' + Math.round(average * 100) + ' %' +
              (behind.length ? ' · ' + behind.length + ' en retard' : ''))
          ]),
          h('button.btn.btn--primary', { onclick: function () { L.forms.goal(); } }, [L.icon('plus'), 'Nouvel objectif'])
        ])
      ]),

      behind.length ? h('div.card', {
        style: { borderColor: behind.some(function (s) { return s.late; }) ? 'var(--danger)' : 'var(--warning)' }
      }, [
        h('div.card__head', [
          h('div.card__title' + (behind.some(function (s) { return s.late; }) ? '.negative' : '.warning'), 'À rattraper')
        ]),
        h('div.col', { style: { gap: '10px' } }, behind.map(function (s) {
          return h('button.between', {
            style: { textAlign: 'left', gap: 'var(--sp-4)' },
            onclick: function () { L.router.go('goals', { id: s.goal.id }); }
          }, [
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.w-500.truncate', s.goal.name),
              h('div.t-xs.faint', L.goals.advice(s.goal))
            ]),
            h('span.t-s.num' + (s.late ? '.negative' : '.warning'), s.percent + ' %')
          ]);
        }))
      ]) : null,

      h('div.toolbar', { style: { margin: 'var(--sp-5) 0' } },
        [{ id: 'active', label: 'En cours' }].concat(L.schema.GOAL_STATUS.filter(function (s) { return s.id !== 'active'; }))
          .concat([{ id: 'all', label: 'Tous' }]).map(function (opt) {
            return h('button.chip.chip--tap' + (status === opt.id ? '.chip--accent' : ''), {
              onclick: function () { L.router.setParams({ status: opt.id }); }
            }, opt.label);
          })),

      list.length && (categories.length < 2 || list.length < 4)
        ? h('div.grid.grid--auto', list.map(function (g) { return L.views.goalCard(g); }))
        : list.length
        ? h('div.col', { style: { gap: 'var(--sp-7)' } }, categories.map(function (cat) {
            var inCat = list.filter(function (g) { return (g.category || 'Autres') === cat; });
            return h('div', [
              h('div.eyebrow', { style: { marginBottom: 'var(--sp-3)' } }, cat + ' · ' + inCat.length),
              h('div.grid.grid--auto', inCat.map(function (g) { return L.views.goalCard(g); }))
            ]);
          }))
        : L.dom.empty('target', 'Aucun objectif',
            'Un objectif transforme une envie en rythme mesurable : « économiser 4 500 € d\'ici janvier » devient « 250 € par mois ».',
            h('button.btn.btn--primary', { onclick: function () { L.forms.goal(); } }, 'Créer un objectif'))
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
