/* ==========================================================================
   LifeOS — Statistiques
   Rien n'est saisi ici : chaque chiffre vient des tâches terminées, des
   relevés d'habitudes, des transactions et des objectifs. La période se
   change en un geste, et toute la page suit.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function delta(value) {
    if (value === null || value === undefined) return null;
    var pct = Math.round(value * 100);
    if (!isFinite(pct) || pct === 0) return h('span.chip', 'stable');
    return h('span.chip' + (pct > 0 ? '.chip--positive' : '.chip--danger'), (pct > 0 ? '+' : '') + pct + ' %');
  }

  L.views.stats = function (params) {
    var period = params.period || 'week';
    var custom = { from: params.from, to: params.to };
    var range = L.stats.range(period, custom);
    var o = L.stats.overview(range.from, range.to);
    /* Une période qui court jusqu'à la fin du mois ou de l'année ne doit pas
       tracer des jours à venir : on s'arrête à aujourd'hui. */
    var upTo = range.to > D.today() ? D.today() : range.to;
    var taskSeries = L.stats.taskSeries(range.from, upTo);
    var habitSeries = o.habitDays.filter(function (d) { return d.date <= upTo; });
    var days = o.days;

    var labelEvery = days > 45 ? 'month' : 'day';
    var taskPoints = taskSeries.map(function (d) {
      return { label: labelEvery === 'day' ? D.format(d.date, 'numS') : D.MONTHS_SHORT[+d.date.slice(5, 7) - 1], value: d.done };
    });

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
          h('div', [
            h('h1.view__title', 'Statistiques'),
            h('p.view__lead', range.label + ' · du ' + D.format(range.from, 'short') + ' au ' + D.format(range.to, 'short'))
          ]),
          h('div.row.wrap', [
            L.dom.segmented(L.stats.PERIODS.map(function (p) { return { id: p.id, label: p.label }; }), period, function (id) {
              L.router.setParams({ period: id });
            })
          ])
        ]),
        period === 'custom' ? h('div.row', { style: { marginTop: 'var(--sp-4)', gap: '10px' } }, [
          L.dom.field('Du', h('input.input', {
            type: 'date', value: range.from, style: { width: '160px' },
            oninput: function (e) { L.router.setParams({ from: e.target.value }); }
          })),
          L.dom.field('Au', h('input.input', {
            type: 'date', value: range.to, style: { width: '160px' },
            oninput: function (e) { L.router.setParams({ to: e.target.value }); }
          }))
        ]) : null
      ]),

      /* --- chiffres de tête --- */
      h('div.grid.grid--4.grid--keep2', [
        L.views.stat('Tâches terminées', String(o.tasks.done),
          o.tasksPrev.done + ' sur la période précédente', { extra: h('div', { style: { marginTop: '8px' } }, [delta(o.tasksDelta)]) }),
        L.views.stat('Temps travaillé', D.duration(o.tasks.minutes, { zero: '0' }), D.duration(o.minutesPerDay) + ' par jour en moyenne'),
        L.views.stat('Tâches reportées', String(o.tasks.postponed), o.tasks.cancelled + ' annulées'),
        L.views.stat('Habitudes tenues', L.format.percent(o.habitRatio, 0), 'sur la période', { bar: o.habitRatio })
      ]),

      /* --- tâches --- */
      h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', marginTop: 'var(--sp-4)' } }, [
        h('div.card', [
          h('div.card__head', [h('div.card__title', 'Tâches terminées par jour')]),
          taskPoints.length > 1
            ? L.charts.bars(taskPoints, { height: 190, barWidth: days > 31 ? 6 : 16, format: function (v) { return String(Math.round(v)); } })
            : h('p.t-s.muted', 'Pas assez de jours pour tracer une courbe.')
        ]),
        h('div.card', [
          h('div.card__head', [h('div.card__title', 'Régularité des habitudes')]),
          habitSeries.length > 1
            ? L.charts.line(habitSeries.map(function (d) {
                return { label: D.format(d.date, 'numS'), value: Math.round(d.ratio * 100) };
              }), { height: 190, max: 100, format: function (v) { return Math.round(v) + ' %'; } })
            : h('p.t-s.muted', 'Pas encore de relevé sur cette période.')
        ])
      ]),

      /* --- temps par domaine --- */
      h('div.section', [
        L.views.sectionHead('Temps par domaine'),
        h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' } }, [
          h('div.card', [
            o.domains.length
              ? h('div.row', { style: { gap: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' } }, [
                  h('div', { style: { width: '170px', flex: 'none' } }, [
                    L.charts.donut(o.domains.map(function (d) { return { value: d.minutes, color: d.color }; }), {
                      height: 170,
                      center: D.duration(L.util.sum(o.domains, function (d) { return d.minutes; }), { zero: '0' }),
                      centerSub: 'travaillées'
                    })
                  ]),
                  h('div.grow', { style: { minWidth: '160px' } }, [
                    L.charts.ranking(o.domains.map(function (d) {
                      return { label: d.name, value: d.minutes, color: d.color };
                    }), { format: function (v) { return D.duration(v); } })
                  ])
                ])
              : h('p.t-s.muted', 'Aucune tâche terminée sur la période.')
          ]),
          h('div.card', [
            h('div.card__head', [h('div.card__title', 'Par projet')]),
            (function () {
              var byProject = L.stats.byProject(range.from, range.to);
              return byProject.length
                ? L.charts.ranking(byProject.slice(0, 8).map(function (p) {
                    return { label: p.name, value: p.minutes };
                  }), { format: function (v) { return D.duration(v); } })
                : h('p.t-s.muted', 'Aucun temps rattaché à un projet.');
            })()
          ])
        ])
      ]),

      /* --- argent --- */
      h('div.section', [
        L.views.sectionHead('Argent'),
        h('div.grid.grid--4.grid--keep2', [
          L.views.stat('Revenus', L.format.money(o.money.income, { decimals: 0 }), range.label, { tone: 'positive' }),
          L.views.stat('Dépenses', L.format.money(o.money.expense, { decimals: 0 }), o.money.count + ' mouvements'),
          L.views.stat('Épargne', L.format.money(o.money.put, { decimals: 0 }), 'taux ' + L.format.percent(o.money.rate, 0), { bar: o.money.rate, barVariant: 'positive' }),
          L.views.stat('Solde de la période', L.format.money(o.money.net, { sign: true, decimals: 0 }),
            o.money.net >= 0 ? 'excédent' : 'déficit', { tone: o.money.net >= 0 ? 'positive' : 'negative' })
        ]),
        h('div.card', { style: { marginTop: 'var(--sp-4)' } }, [
          h('div.card__head', [h('div.card__title', 'Dépenses par catégorie')]),
          (function () {
            var cats = L.finance.byCategory(range.from, range.to, 'expense');
            return cats.length
              ? L.charts.ranking(cats.slice(0, 8).map(function (c) {
                  return { label: c.name, value: c.total, color: c.color };
                }), { format: function (v) { return L.format.money(v, { decimals: 0 }); } })
              : h('p.t-s.muted', 'Aucune dépense sur la période.');
          })()
        ])
      ]),

      /* --- objectifs --- */
      o.goals.length ? h('div.section', [
        L.views.sectionHead('Objectifs', h('span.t-xs.muted', Math.round(o.goalsAverage * 100) + ' % en moyenne')),
        h('div.card', [
          L.charts.ranking(o.goals.map(function (g) {
            return {
              label: g.goal.name, value: g.percent,
              color: (g.behind || g.late) ? 'var(--danger)' : 'var(--accent)'
            };
          }), { format: function (v) { return Math.round(v) + ' %'; } }),
          o.goalsBehind ? h('p.t-xs.negative', { style: { marginTop: 'var(--sp-4)' } },
            o.goalsBehind + ' ' + L.util.plural(o.goalsBehind, 'objectif') + ' sous le rythme nécessaire.') : null
        ])
      ]) : null,

      /* --- projets --- */
      o.projects.length ? h('div.section', [
        L.views.sectionHead('Projets en cours'),
        h('div.card', [
          L.charts.ranking(o.projects.map(function (p) {
            return { label: p.project.name, value: p.percent, color: p.atRisk ? 'var(--warning)' : 'var(--accent)' };
          }), { format: function (v) { return Math.round(v) + ' %'; } })
        ])
      ]) : null,

      /* --- habitudes --- */
      h('div.section', [
        L.views.sectionHead('Habitudes · 30 jours'),
        h('div.card', [
          (function () {
            var table = L.stats.habitTable(30);
            return table.length
              ? h('div.list', table.map(function (t) {
                  return h('button.list__item', { onclick: function () { L.router.go('habits', { id: t.habit.id }); } }, [
                    h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
                      h('div.t-s.truncate', t.habit.name),
                      h('div.t-xs.faint', t.done + ' / ' + t.planned + ' jours · série record ' + t.best)
                    ]),
                    h('div', { style: { width: '120px', flex: 'none' } }, [L.dom.bar(t.ratio, t.ratio > 0.8 ? 'positive' : t.ratio < 0.4 ? 'danger' : null, { thin: true })]),
                    h('span.t-xs.num.muted', { style: { width: '44px', textAlign: 'right' } }, Math.round(t.ratio * 100) + ' %')
                  ]);
                }))
              : h('p.t-s.muted', 'Aucune habitude suivie.');
          })()
        ])
      ])
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
