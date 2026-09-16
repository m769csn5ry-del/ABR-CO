/* ==========================================================================
   LifeOS — Habitudes
   Le suivi du jour d'abord, la régularité ensuite. Une habitude n'est pas
   une case à cocher de plus : c'est une série, une tendance, et un temps
   réservé dans le planning.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function weekStrip(habit) {
    var start = D.startOfWeek(D.today(), L.store.state.settings.firstDayOfWeek);
    var days = D.range(start, D.addDays(start, 6));
    return h('div.habit-week', days.map(function (day) {
      var scheduled = L.habits.isScheduled(habit, day);
      var done = L.habits.isDone(habit, day);
      return h('button.habit-day' +
        (done ? '.habit-day--done' : '') +
        (!scheduled ? '.habit-day--off' : '') +
        (day === D.today() ? '.habit-day--today' : ''), {
        title: D.format(day, 'long') + (done ? ' · fait' : scheduled ? ' · à faire' : ' · non prévu'),
        onclick: function () { if (scheduled || done) L.habits.toggle(habit.id, day); }
      }, D.DAYS_SHORT[D.dow(day)].charAt(0).toUpperCase());
    }));
  }

  function detail(habit) {
    var s = L.habits.summary(habit);
    var series90 = L.habits.series(habit, 91);
    var series30 = L.habits.series(habit, 30);
    var goal = habit.goalId ? L.goals.get(habit.goalId) : null;
    var domain = habit.domainId ? L.domains.get(habit.domainId) : null;

    return h('div.view', [
      h('div.view__head', [
        h('button.btn.btn--s.btn--ghost', {
          style: { marginBottom: 'var(--sp-4)' },
          onclick: function () { L.router.go('habits'); }
        }, [L.icon('chevron-left'), 'Toutes les habitudes']),
        h('div.between.wrap', [
          h('div', [
            h('div.row.wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
              domain ? h('span.chip', [L.dom.dot(domain.color), domain.name]) : null,
              h('span.chip', L.schema.label(L.schema.HABIT_KINDS, habit.kind)),
              h('span.chip', L.habits.targetLabel(habit))
            ]),
            h('h1.view__title', habit.name),
            h('p.view__lead', (habit.days || []).length === 7 ? 'Tous les jours'
              : 'Les ' + habit.days.map(function (d) { return D.DAYS[d]; }).join(', '))
          ]),
          h('div.row', [
            h('button.btn', { onclick: function () { L.forms.habit(habit, null, function (saved) { if (!saved) L.router.go('habits'); }); } }, 'Modifier'),
            h('button.btn.btn--primary', {
              onclick: function () { L.habits.toggle(habit.id); }
            }, s.doneToday ? 'Décocher aujourd\'hui' : 'Cocher aujourd\'hui')
          ])
        ])
      ]),

      h('div.grid.grid--4.grid--keep2', [
        L.views.stat('Série en cours', s.streak + ' j', 'record ' + s.best + ' j'),
        L.views.stat('30 derniers jours', L.format.percent(s.rate30, 0), 'de réussite', { bar: s.rate30 }),
        L.views.stat('7 derniers jours', L.format.percent(s.rate7, 0),
          s.trend > 0.05 ? 'en progrès' : s.trend < -0.05 ? 'en baisse' : 'stable',
          { tone: s.trend > 0.05 ? 'positive' : s.trend < -0.05 ? 'negative' : null }),
        L.views.stat('Cette semaine', s.week.done + ' / ' + s.week.target, 'objectif hebdomadaire', { bar: s.week.ratio })
      ]),

      h('div.section', [
        L.views.sectionHead('Régularité · 13 semaines'),
        h('div.card', { style: { overflowX: 'auto' } }, [
          L.charts.heatmap(series90),
          h('div.legend', { style: { marginTop: 'var(--sp-4)' } }, [
            h('span.legend__item', [h('span.heat__cell', { 'data-v': '0' }), 'non prévu']),
            h('span.legend__item', [h('span.heat__cell', { 'data-miss': '1' }), 'manqué']),
            h('span.legend__item', [h('span.heat__cell', { 'data-v': '4' }), 'tenu'])
          ])
        ])
      ]),

      habit.kind !== 'check' ? h('div.section', [
        L.views.sectionHead('Valeurs relevées · 30 jours'),
        h('div.card', [
          L.charts.bars(series30.map(function (d) {
            return { label: D.format(d.date, 'numS'), value: habit.kind === 'time' ? (D.toMinutes(d.value) || 0) : (Number(d.value) || 0) };
          }), {
            height: 180, barWidth: 10,
            format: function (v) { return habit.kind === 'duration' ? Math.round(v / 60) + ' h' : L.format.compact(v); }
          })
        ])
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Quinze derniers jours'),
        h('div.list.list--framed', D.range(D.addDays(D.today(), -14), D.today()).reverse().map(function (day) {
          var scheduled = L.habits.isScheduled(habit, day);
          var value = L.habits.valueOn(habit, day);
          var done = L.habits.isDone(habit, day);
          return h('div.list__item', [
            L.dom.checkbox(done, function () { L.habits.toggle(habit.id, day); }, { round: true, label: day }),
            h('div.grow', [
              h('div.t-s' + (scheduled ? '' : '.faint'), D.format(day, 'long')),
              h('div.t-xs.faint', scheduled ? (done ? 'Tenue' : 'Manquée') : 'Non prévue')
            ]),
            h('button.chip.chip--tap', {
              onclick: function () {
                if (habit.kind === 'check') { L.habits.toggle(habit.id, day); return; }
                L.modal.prompt({
                  title: habit.name + ' — ' + D.format(day, 'short'),
                  label: habit.kind === 'time' ? 'Heure' : habit.kind === 'duration' ? 'Minutes' : 'Valeur',
                  value: value === null ? '' : String(value)
                }).then(function (v) {
                  if (v === null) return;
                  L.habits.log(habit.id, day, habit.kind === 'time' ? v : (parseFloat(String(v).replace(',', '.')) || 0));
                });
              }
            }, L.habits.label(habit, value))
          ]);
        }))
      ]),

      goal ? h('div.section', [
        L.views.sectionHead('Objectif alimenté'),
        L.views.goalCard(goal)
      ]) : null
    ]);
  }

  L.views.habits = function (params) {
    if (params.id) {
      var habit = L.habits.get(params.id);
      if (habit) return detail(habit);
    }

    var all = L.habits.all();
    var todayList = L.habits.today();
    var completion = L.habits.dayCompletion();
    var table = L.stats.habitTable(30);

    return h('div.view', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Habitudes'),
            h('p.view__lead', all.length + ' ' + L.util.plural(all.length, 'habitude') +
              ' · ' + completion.done + ' / ' + completion.total + ' tenues aujourd\'hui')
          ]),
          h('button.btn.btn--primary', { onclick: function () { L.forms.habit(); } }, [L.icon('plus'), 'Nouvelle habitude'])
        ])
      ]),

      todayList.length ? h('div.card', [
        h('div.card__head', [
          h('div.card__title', "Aujourd'hui"),
          h('span.t-xs.muted.num', L.format.percent(completion.ratio, 0))
        ]),
        h('div', { style: { marginBottom: 'var(--sp-3)' } }, [
          L.dom.bar(completion.ratio, completion.ratio === 1 ? 'positive' : null, { thin: true })
        ]),
        h('div.list', todayList.map(function (x) { return L.views.habitRow(x.habit); }))
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Toutes les habitudes'),
        all.length
          ? h('div.grid.grid--auto-l', all.map(function (habit) {
              var s = L.habits.summary(habit);
              var domain = habit.domainId ? L.domains.get(habit.domainId) : null;
              var line = table.filter(function (t) { return t.habit.id === habit.id; })[0];
              return h('div.card', [
                h('div.between', [
                  h('button.grow', {
                    style: { textAlign: 'left', minWidth: 0 },
                    onclick: function () { L.router.go('habits', { id: habit.id }); }
                  }, [
                    h('div.t-s.w-600.truncate', habit.name),
                    h('div.row.t-xs.muted', { style: { gap: '8px', marginTop: '3px' } }, [
                      domain ? h('span.row', { style: { gap: '4px' } }, [L.dom.dot(domain.color), domain.name]) : null,
                      h('span', L.habits.targetLabel(habit))
                    ])
                  ]),
                  h('div.row', [
                    s.streak ? h('span.chip', '🔥 ' + s.streak) : null,
                    h('button.iconbtn', {
                      'aria-label': 'Options',
                      onclick: function (e) {
                        L.menu(e.currentTarget, [
                          { icon: 'edit', label: 'Modifier', run: function () { L.forms.habit(habit); } },
                          { icon: 'chart', label: 'Voir le détail', run: function () { L.router.go('habits', { id: habit.id }); } },
                          { icon: 'trash', label: 'Supprimer', danger: true, run: function () {
                            L.modal.confirm({ title: 'Supprimer', text: 'L\'historique sera effacé.', danger: true, confirm: 'Supprimer' })
                              .then(function (ok) { if (ok) L.habits.remove(habit.id); });
                          } }
                        ], { align: 'right' });
                      }
                    }, L.icon('more'))
                  ])
                ]),
                h('div', { style: { marginTop: 'var(--sp-4)' } }, [weekStrip(habit)]),
                h('div.between.t-xs.faint', { style: { marginTop: 'var(--sp-3)' } }, [
                  h('span', '30 j : ' + L.format.percent(line ? line.ratio : 0, 0)),
                  h('span', 'record ' + s.best + ' j')
                ])
              ]);
            }))
          : L.dom.empty('repeat', 'Aucune habitude',
              'Une habitude, c\'est un geste répété qu\'on veut voir tenir : sport, lecture, heure de coucher…',
              h('button.btn.btn--primary', { onclick: function () { L.forms.habit(); } }, 'Créer une habitude'))
      ]),

      table.length ? h('div.section', [
        L.views.sectionHead('Classement de régularité · 30 jours'),
        h('div.card', [
          L.charts.ranking(table.map(function (t) {
            return { label: t.habit.name, value: Math.round(t.ratio * 100) };
          }), { format: function (v) { return Math.round(v) + ' %'; } })
        ])
      ]) : null
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
