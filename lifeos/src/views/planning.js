/* ==========================================================================
   LifeOS — Planning
   Deux échelles : la journée et la semaine. Dans les deux cas le principe
   est le même — une proposition argumentée, que l'on accepte, retouche ou
   refuse. Rien n'est écrit dans les tâches avant l'acceptation.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;
  var draft = null;        // proposition en attente (jour)
  var weekDraft = null;    // proposition en attente (semaine)

  /* ---------------- plage de la journée ---------------- */
  var PRESETS = [
    { id: 'day', label: 'Toute la journée' },
    { id: 'morning', label: 'Matin' },
    { id: 'afternoon', label: 'Après-midi' },
    { id: 'evening', label: 'Soirée' },
    { id: 'now2', label: '2 h maintenant' },
    { id: 'custom', label: 'Sur mesure' }
  ];

  function presetWindow(id, day) {
    var s = L.store.state.settings.day;
    var now = D.nowMinutes();
    var isToday = day === D.today();
    switch (id) {
      case 'morning': return { from: Math.max(D.toMinutes(s.start), isToday ? now : 0), to: 12 * 60 };
      case 'afternoon': return { from: Math.max(13 * 60, isToday ? now : 0), to: 18 * 60 };
      case 'evening': return { from: Math.max(18 * 60, isToday ? now : 0), to: D.toMinutes(s.end) };
      case 'now2': return { from: now, to: Math.min(now + 120, 24 * 60 - 1) };
      default: return { from: undefined, to: undefined };
    }
  }

  function warnings(list) {
    if (!list || !list.length) return null;
    return h('div.col', { style: { gap: '8px' } }, list.map(function (w) {
      var tone = w.level === 'danger' ? 'chip--danger' : w.level === 'warning' ? 'chip--warning' : w.level === 'positive' ? 'chip--positive' : 'chip--info';
      return h('div.row-top', { style: { gap: '10px' } }, [
        h('span.chip.' + tone, { style: { flex: 'none' } }, w.level === 'positive' ? '✓' : '!'),
        h('span.t-s.muted', w.text)
      ]);
    }));
  }

  /* ---------------- onglet « jour » ---------------- */
  function dayTab(params) {
    var day = params.date || D.today();
    var saved = L.planner.get(day);
    var preset = params.preset || 'day';
    var custom = {
      from: params.from ? +params.from : D.nowMinutes(),
      to: params.to ? +params.to : D.toMinutes(L.store.state.settings.day.end)
    };

    function build() {
      var win = preset === 'custom' ? custom : presetWindow(preset, day);
      draft = L.planner.build(day, { from: win.from, to: win.to, fromNow: day === D.today() });
      L.app.render();
    }

    if (params.generate === 'day' && (!draft || draft.date !== day)) {
      setTimeout(build, 0);
    }

    var plan = draft && draft.date === day ? draft : null;
    var showing = plan || saved;

    var head = h('div.card', [
      h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
        h('div', [
          h('div.eyebrow', 'Journée organisée'),
          h('div.t-l.w-600', { style: { marginTop: '2px' } }, D.caps(D.format(day, 'long'))),
          h('div.t-xs.muted', { style: { marginTop: '4px' } },
            D.duration(L.calendar.availableMinutes(day, { fromNow: day === D.today() })) + ' de libre · ' +
            L.tasks.forDate(day, { includeOverdue: day === D.today() }).filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; }).length + ' tâches ouvertes')
        ]),
        h('div.row', [
          h('button.iconbtn', { 'aria-label': 'Jour précédent', onclick: function () { draft = null; L.router.setParams({ date: D.addDays(day, -1), generate: '' }); } }, L.icon('chevron-left')),
          h('input.input', {
            type: 'date', value: day, style: { width: '150px' },
            oninput: function (e) { draft = null; L.router.setParams({ date: e.target.value || D.today(), generate: '' }); }
          }),
          h('button.iconbtn', { 'aria-label': 'Jour suivant', onclick: function () { draft = null; L.router.setParams({ date: D.addDays(day, 1), generate: '' }); } }, L.icon('chevron-right'))
        ])
      ]),

      h('div.toolbar', { style: { marginTop: 'var(--sp-5)' } }, [
        L.dom.segmented(PRESETS.map(function (p) { return { id: p.id, label: p.label }; }), preset, function (id) {
          draft = null;
          L.router.setParams({ preset: id, generate: '' });
        })
      ]),

      preset === 'custom' ? h('div.row', { style: { marginTop: 'var(--sp-4)', gap: '10px' } }, [
        L.dom.field('De', h('input.input', {
          type: 'time', value: D.toTime(custom.from), style: { width: '120px' },
          oninput: function (e) { custom.from = D.toMinutes(e.target.value) || 0; }
        })),
        L.dom.field('À', h('input.input', {
          type: 'time', value: D.toTime(custom.to), style: { width: '120px' },
          oninput: function (e) { custom.to = D.toMinutes(e.target.value) || 0; }
        }))
      ]) : null,

      h('div.row.wrap', { style: { marginTop: 'var(--sp-5)', gap: '8px' } }, [
        h('button.btn.btn--primary', { onclick: build }, [L.icon('sparkle'), showing ? 'Recalculer' : 'Proposer un planning']),
        saved ? h('button.btn', { onclick: function () { L.router.go('today', { date: day }); } }, 'Voir la journée') : null,
        saved ? h('button.btn.btn--ghost', {
          onclick: function () {
            L.planner.reject(day); draft = null;
            L.toast.show('Planning effacé');
          }
        }, 'Effacer') : null
      ])
    ]);

    if (!showing) {
      return [head, h('div.section', [
        L.dom.empty('sparkle', 'Aucun planning pour ce jour',
          'Le moteur croise tes créneaux libres, tes échéances, tes priorités, ton niveau d\'énergie et tes habitudes pour proposer un déroulé réaliste.')
      ])];
    }

    var isDraft = !!plan;
    var stats = h('div.grid.grid--3.grid--keep2', { style: { marginTop: 'var(--sp-5)' } }, [
      L.views.stat('Travail placé', D.duration(showing.plannedMinutes, { zero: '0' }), showing.blocks.filter(function (b) { return b.type === 'task'; }).length + ' blocs de tâches'),
      L.views.stat('Temps libre restant', D.duration(showing.leftoverMinutes, { zero: '0' }), 'après le planning'),
      L.views.stat('Non casé', showing.unscheduled.length ? String(showing.unscheduled.length) : '—',
        showing.unscheduled.length ? D.duration(L.util.sum(showing.unscheduled, function (u) { return u.minutes; })) + ' à reporter' : 'tout rentre')
    ]);

    return [
      head,
      stats,
      showing.warnings && showing.warnings.length ? h('div.card', { style: { marginTop: 'var(--sp-4)' } }, [warnings(showing.warnings)]) : null,

      h('div.section', [
        L.views.sectionHead(isDraft ? 'Proposition' : 'Planning enregistré',
          h('span.chip' + (isDraft ? '' : '.chip--positive'), isDraft ? 'À valider' : (showing.status === 'accepted' ? 'Accepté' : 'Modifié'))),
        h('div.card', [L.views.planTimeline(showing, { editable: !isDraft })]),
        isDraft ? h('div.row.wrap', { style: { marginTop: 'var(--sp-4)', gap: '8px' } }, [
          h('button.btn.btn--primary.btn--l', {
            onclick: function () {
              L.planner.accept(showing);
              draft = null;
              L.toast.show('Planning accepté — les tâches ont pris leur heure');
              L.router.go('today', { date: day });
            }
          }, [L.icon('check'), 'Accepter']),
          h('button.btn.btn--l', {
            onclick: function () {
              L.planner.save(showing, 'edited');
              draft = null;
              L.toast.show('Planning gardé en brouillon — modifie les blocs à ta main');
            }
          }, 'Garder et retoucher'),
          h('button.btn.btn--ghost.btn--l', { onclick: function () { draft = null; L.app.render(); } }, 'Refuser')
        ]) : null
      ]),

      showing.unscheduled.length ? h('div.section', [
        L.views.sectionHead('Ne rentre pas dans la journée'),
        h('div.list.list--framed', showing.unscheduled.map(function (u) {
          var task = L.tasks.get(u.id);
          return h('div.list__item', [
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.truncate', u.title),
              h('div.t-xs.faint', D.duration(u.minutes) + ' · ' + (u.why || ''))
            ]),
            task ? h('button.btn.btn--s', {
              onclick: function () { L.tasks.postpone(task.id, D.addDays(day, 1)); L.toast.undo('Reportée à demain'); }
            }, 'Demain') : null
          ]);
        }))
      ]) : null
    ];
  }

  /* ---------------- onglet « semaine » ---------------- */
  function weekTab(params) {
    var anchor = params.date || D.today();
    var saved = L.weekly.get(anchor);

    function build() {
      weekDraft = L.weekly.build(anchor);
      L.app.render();
    }
    if (params.generate === 'week' && (!weekDraft || weekDraft.start !== D.startOfWeek(anchor, L.store.state.settings.firstDayOfWeek))) {
      setTimeout(build, 0);
    }

    var plan = weekDraft || saved;
    var start = D.startOfWeek(anchor, L.store.state.settings.firstDayOfWeek);

    var head = h('div.card', [
      h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
        h('div', [
          h('div.eyebrow', 'Semaine'),
          h('div.t-l.w-600', { style: { marginTop: '2px' } },
            'Du ' + D.format(start, 'short') + ' au ' + D.format(D.addDays(start, 6), 'short')),
          h('div.t-xs.muted', { style: { marginTop: '4px' } }, D.weekKey(start))
        ]),
        h('div.row', [
          h('button.iconbtn', { 'aria-label': 'Semaine précédente', onclick: function () { weekDraft = null; L.router.setParams({ date: D.addDays(start, -7), generate: '' }); } }, L.icon('chevron-left')),
          h('button.btn.btn--s', { onclick: function () { weekDraft = null; L.router.setParams({ date: D.today(), generate: '' }); } }, 'Cette semaine'),
          h('button.iconbtn', { 'aria-label': 'Semaine suivante', onclick: function () { weekDraft = null; L.router.setParams({ date: D.addDays(start, 7), generate: '' }); } }, L.icon('chevron-right'))
        ])
      ]),
      h('div.row.wrap', { style: { marginTop: 'var(--sp-5)', gap: '8px' } }, [
        h('button.btn.btn--primary', { onclick: build }, [L.icon('sparkle'), plan ? 'Recalculer la semaine' : 'Préparer ma semaine']),
        h('p.t-xs.faint', { style: { marginLeft: '4px' } },
          'Prévu chaque ' + D.DAYS[(L.store.state.settings.notifications.weeklyPlan || {}).day || 0] +
          ' à ' + ((L.store.state.settings.notifications.weeklyPlan || {}).time || '10:00'))
      ])
    ]);

    if (!plan) {
      return [head, h('div.section', [
        L.dom.empty('layout', 'Semaine non préparée',
          'La préparation regarde la capacité réelle de chaque jour, place les échéances avant leur date, repère les objectifs qui décrochent et signale les journées qui vont déborder.')
      ])];
    }

    var isDraft = !!weekDraft;
    var maxCapacity = Math.max.apply(null, plan.days.map(function (d) { return Math.max(d.free, d.assignedMinutes); }).concat([60]));

    return [
      head,
      h('div.grid.grid--3.grid--keep2', { style: { marginTop: 'var(--sp-5)' } }, [
        L.views.stat('Temps disponible', D.duration(plan.totals.free, { zero: '0' }), 'sur les jours restants'),
        L.views.stat('Charge à caser', D.duration(plan.totals.need, { zero: '0' }), plan.totals.placed + ' tâches placées'),
        L.views.stat('À reporter', plan.postpone.length ? String(plan.postpone.length) : '—',
          plan.postpone.length ? 'ne rentrent pas' : 'tout rentre')
      ]),

      plan.risks.length ? h('div.card', { style: { marginTop: 'var(--sp-4)' } }, [warnings(plan.risks)]) : null,

      h('div.section', [
        L.views.sectionHead('Priorités de la semaine'),
        plan.priorities.length
          ? h('div.list.list--framed', plan.priorities.map(function (p, i) {
              var task = L.tasks.get(p.taskId);
              return h('button.list__item', {
                onclick: function () { if (task) L.views.taskDetail(task.id); }
              }, [
                h('span.t-xs.faint.num', { style: { width: '18px' } }, String(i + 1)),
                h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
                  h('div.t-s.truncate', p.title),
                  h('div.t-xs.faint', p.why + ' · ' + D.duration(p.minutes))
                ]),
                task && task.status === 'done' ? h('span.chip.chip--positive', 'Fait') : null
              ]);
            }))
          : L.dom.empty('check', 'Rien de saillant', 'Aucune tâche ouverte cette semaine.')
      ]),

      h('div.section', [
        L.views.sectionHead('Répartition jour par jour'),
        h('div.col', { style: { gap: '10px' } }, plan.days.map(function (d) {
          var ratio = d.free ? d.assignedMinutes / d.free : (d.assignedMinutes ? 1.2 : 0);
          var over = d.assignedMinutes > d.free;
          return h('div.card', { style: { padding: 'var(--sp-4)', opacity: d.past ? '.55' : '1' } }, [
            h('div.between', [
              h('div.row', [
                h('span.t-s.w-600', D.caps(D.format(d.date, 'dayNum'))),
                d.date === D.today() ? h('span.chip.chip--accent', "aujourd'hui") : null
              ]),
              h('span.t-xs' + (over ? '.negative' : '.muted') + '.num',
                D.duration(d.assignedMinutes, { zero: '0' }) + ' / ' + D.duration(d.free, { zero: '0' }))
            ]),
            h('div', { style: { margin: '10px 0' } }, [
              L.dom.bar(L.util.clamp(d.assignedMinutes / Math.max(maxCapacity, 1), 0, 1), over ? 'danger' : null, { thin: true })
            ]),
            d.tasks.length
              ? h('div.row.wrap', { style: { gap: '6px' } }, d.tasks.map(function (t) {
                  return h('button.chip.chip--tap', {
                    onclick: function () { L.views.taskDetail(t.id); }
                  }, [t.fixed ? L.icon('clock', 11) : null, t.title.length > 34 ? t.title.slice(0, 34) + '…' : t.title]);
                }))
              : h('div.t-xs.faint', d.past ? 'Jour passé' : 'Rien de prévu'),
            d.events ? h('div.t-xs.faint', { style: { marginTop: '6px' } },
              d.events + ' ' + L.util.plural(d.events, 'rendez-vous', 'rendez-vous') +
              (d.habitMinutes ? ' · ' + D.duration(d.habitMinutes) + ' d\'habitudes' : '')) : null
          ]);
        }))
      ]),

      plan.goals.length ? h('div.section', [
        L.views.sectionHead('Objectifs à faire avancer'),
        h('div.grid.grid--auto', plan.goals.map(function (g) {
          var goal = L.goals.get(g.goalId);
          if (!goal) return null;
          return L.views.goalCard(goal);
        }).filter(Boolean))
      ]) : null,

      plan.projects.length ? h('div.section', [
        L.views.sectionHead('Projets à surveiller'),
        h('div.list.list--framed', plan.projects.map(function (p) {
          return h('button.list__item', { onclick: function () { L.router.go('projects', { id: p.projectId }); } }, [
            h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
              h('div.t-s.truncate', p.name),
              h('div.t-xs.faint', [
                p.percent + ' %',
                p.milestone ? ' · ' + p.milestone : '',
                p.milestoneDue ? ' (' + D.relative(p.milestoneDue, { caps: false }) + ')' : ''
              ].join(''))
            ]),
            p.atRisk ? h('span.chip.chip--warning', 'Charge tendue') : null,
            p.overdue ? h('span.chip.chip--danger', p.overdue + ' en retard') : null
          ]);
        }))
      ]) : null,

      plan.postpone.length ? h('div.section', [
        L.views.sectionHead('À reporter ou raccourcir'),
        h('div.list.list--framed', plan.postpone.map(function (p) {
          return h('div.list__item', [
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.truncate', p.title),
              h('div.t-xs.faint', p.reason)
            ]),
            h('button.btn.btn--s', {
              onclick: function () {
                L.tasks.postpone(p.taskId, D.addDays(D.addDays(start, 7), 0));
                L.toast.undo('Reportée à la semaine prochaine');
              }
            }, 'Semaine prochaine')
          ]);
        }))
      ]) : null,

      isDraft ? h('div.section', [
        h('div.row.wrap', { style: { gap: '8px' } }, [
          h('button.btn.btn--primary.btn--l', {
            onclick: function () {
              L.weekly.accept(plan);
              weekDraft = null;
              L.toast.show('Semaine validée — chaque tâche a reçu son jour');
            }
          }, [L.icon('check'), 'Valider la semaine']),
          h('button.btn.btn--l', {
            onclick: function () { L.weekly.save(plan, 'edited'); weekDraft = null; L.toast.show('Semaine gardée en brouillon'); }
          }, 'Garder sans appliquer'),
          h('button.btn.btn--ghost.btn--l', { onclick: function () { weekDraft = null; L.app.render(); } }, 'Refuser')
        ])
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Bilan de la semaine écoulée'),
        (function () {
          var r = L.weekly.review(D.addDays(start, -7));
          return h('div.grid.grid--3.grid--keep2', [
            L.views.stat('Tâches terminées', String(r.tasks.done), r.tasks.postponed + ' reportées'),
            L.views.stat('Temps travaillé', D.duration(r.tasks.minutes, { zero: '0' }), 'sur la semaine'),
            L.views.stat('Solde', L.format.money(r.money.income - r.money.expense - r.money.put, { sign: true, decimals: 0 }),
              L.format.money(r.money.expense, { decimals: 0 }) + ' dépensés')
          ]);
        })()
      ])
    ];
  }

  L.views.planning = function (params) {
    var tab = params.tab === 'week' ? 'week' : 'day';
    return h('div.view', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Planning'),
            h('p.view__lead', 'Une proposition argumentée, jamais imposée.')
          ]),
          L.dom.segmented([
            { id: 'day', label: 'Journée', icon: 'sun' },
            { id: 'week', label: 'Semaine', icon: 'layout' }
          ], tab, function (id) {
            draft = null; weekDraft = null;
            L.router.setParams({ tab: id, generate: '' });
          })
        ])
      ]),
      h('div.col', { style: { gap: 'var(--sp-4)' } }, tab === 'day' ? dayTab(params) : weekTab(params))
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
