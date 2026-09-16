/* ==========================================================================
   LifeOS — briques d'affichage communes
   La ligne de tâche, la carte d'objectif, le déroulé d'une journée : ces
   morceaux apparaissent sur plusieurs écrans. Les écrire une fois garantit
   qu'une tâche se coche de la même façon partout.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;
  L.views = L.views || {};

  var V = {
    /* ---------- tâche ---------- */
    taskRow: function (task, opts) {
      opts = opts || {};
      var domain = task.domainId ? L.domains.get(task.domainId) : null;
      var project = task.projectId ? L.projects.get(task.projectId) : null;
      var goal = L.goals.forTask(task);
      var overdue = L.tasks.isOverdue(task);
      var done = task.status === 'done';
      var subDone = (task.subtasks || []).filter(function (s) { return s.done; }).length;

      var meta = [];
      if (opts.showDate !== false && (task.date || task.due)) {
        var when = task.due || task.date;
        meta.push(h('span' + (overdue ? '.negative' : ''), [
          task.due ? L.icon('flag', 11) : null,
          ' ' + D.relative(when)
        ]));
      }
      if (task.time) meta.push(h('span', task.time));
      if (task.estimate) meta.push(h('span', D.duration(task.estimate)));
      if (project) meta.push(h('span.truncate', { style: { maxWidth: '150px' } }, project.name));
      else if (domain) meta.push(h('span.truncate', [L.dom.dot(domain.color), ' ' + domain.name]));
      if (goal && opts.showGoal !== false) meta.push(h('span.truncate', { style: { maxWidth: '150px' } }, [L.icon('target', 11), ' ' + goal.name]));
      if ((task.subtasks || []).length) meta.push(h('span', subDone + '/' + task.subtasks.length));
      if (task.recurrence) meta.push(h('span', { title: D.recurrenceLabel(task.recurrence) }, L.icon('repeat', 11)));
      if ((task.tags || []).length) meta.push(h('span.truncate', task.tags.map(function (t) { return '#' + t; }).join(' ')));
      if (task.status === 'postponed') meta.push(h('span.warning', 'Reportée'));
      if (task.status === 'doing') meta.push(h('span.accent', 'En cours'));

      var node = h('div.task' + (done ? '.task--done' : '') + (task.status === 'cancelled' ? '.task--cancelled' : ''), {
        'data-id': task.id
      }, [
        h('div.prio.prio--' + task.priority, { title: L.schema.priority(task.priority).label }),
        L.dom.checkbox(done, function () {
          var spawned = L.tasks.setStatus(task.id, done ? 'todo' : 'done');
          if (!done) {
            L.toast.show('« ' + task.title + ' » terminée' + (spawned ? ' — prochaine occurrence le ' + D.format(spawned.date || spawned.due, 'short') : ''), {
              action: { label: 'Annuler', run: function () { L.store.undo(); } }
            });
          }
        }, { round: true, label: 'Terminer ' + task.title }),
        h('div.task__main', {
          onclick: function () { V.taskDetail(task.id); }
        }, [
          h('div.task__title', task.title),
          meta.length ? h('div.task__meta', meta) : null
        ]),
        h('div.task__side', [
          opts.actions === false ? null : h('button.iconbtn', {
            'aria-label': 'Options',
            onclick: function (e) { e.stopPropagation(); V.taskMenu(e.currentTarget, task); }
          }, L.icon('more'))
        ])
      ]);
      return node;
    },

    taskMenu: function (anchor, task) {
      var open = L.tasks.OPEN_STATUS[task.status];
      L.menu(anchor, [
        { icon: 'edit', label: 'Modifier', run: function () { L.forms.task(task); } },
        open ? { icon: 'play', label: task.status === 'doing' ? 'Marquer à faire' : 'Marquer en cours',
          run: function () { L.tasks.setStatus(task.id, task.status === 'doing' ? 'todo' : 'doing'); } } : null,
        '-',
        { label: 'Reporter', header: true },
        { icon: 'sun', label: "Aujourd'hui", run: function () { L.tasks.postpone(task.id, D.today()); L.toast.undo('Reportée à aujourd\'hui'); } },
        { icon: 'arrow-right', label: 'Demain', run: function () { L.tasks.postpone(task.id, D.addDays(D.today(), 1)); L.toast.undo('Reportée à demain'); } },
        { icon: 'calendar', label: 'Semaine prochaine', run: function () { L.tasks.postpone(task.id, D.addDays(D.startOfWeek(D.today(), 1), 7)); L.toast.undo('Reportée'); } },
        { icon: 'clock', label: 'Choisir une date…', run: function () {
          L.modal.prompt({ title: 'Reporter à', label: 'Date (AAAA-MM-JJ)', value: task.date || D.today() }).then(function (v) {
            if (v) { L.tasks.postpone(task.id, v); L.toast.undo('Tâche reportée'); }
          });
        } },
        '-',
        { icon: 'copy', label: 'Dupliquer', run: function () { L.tasks.duplicate(task.id); L.toast.show('Tâche dupliquée'); } },
        { icon: 'x', label: 'Annuler la tâche', run: function () { L.tasks.setStatus(task.id, 'cancelled'); L.toast.undo('Tâche annulée'); } },
        { icon: 'trash', label: 'Supprimer', danger: true, run: function () {
          L.tasks.remove(task.id); L.toast.undo('Tâche supprimée');
        } }
      ].filter(Boolean), { align: 'right' });
    },

    /* Fiche détaillée : lecture rapide, sous-tâches cochables, liens. */
    taskDetail: function (id) {
      var task = L.tasks.get(id);
      if (!task) return;
      var domain = task.domainId ? L.domains.get(task.domainId) : null;
      var project = task.projectId ? L.projects.get(task.projectId) : null;
      var goal = L.goals.forTask(task);
      var linkedNotes = L.notes.forEntity(task.id);

      L.modal.open({
        title: 'Tâche',
        size: 'wide',
        headAction: h('button.iconbtn', {
          'aria-label': 'Modifier',
          onclick: function () { L.modal.closeTop(); setTimeout(function () { L.forms.task(task); }, 180); }
        }, L.icon('edit')),
        body: function (api) {
          var subWrap = h('div.col', { style: { gap: '6px' } });
          function drawSubs() {
            var fresh = L.tasks.get(id) || task;
            L.dom.mount(subWrap, (fresh.subtasks || []).map(function (s) {
              return h('div.subtask' + (s.done ? '.subtask--done' : ''), [
                L.dom.checkbox(s.done, function () { L.tasks.toggleSubtask(id, s.id); drawSubs(); }),
                h('span.grow', s.title)
              ]);
            }).concat([
              h('button.btn.btn--s.btn--ghost', {
                onclick: function () {
                  L.modal.prompt({ title: 'Sous-tâche', label: 'Intitulé' }).then(function (v) {
                    if (v) { L.tasks.addSubtask(id, v); drawSubs(); }
                  });
                }
              }, [L.icon('plus'), 'Ajouter'])
            ]));
          }
          drawSubs();

          return [
            h('div.row-top', [
              h('div.prio.prio--' + task.priority, { style: { minHeight: '38px' } }),
              h('div.grow', [
                h('h3', task.title),
                h('div.row.wrap.t-xs.muted', { style: { marginTop: '6px', gap: '10px' } }, [
                  h('span', L.schema.label(L.schema.TASK_STATUS, task.status)),
                  h('span', L.schema.priority(task.priority).label),
                  task.estimate ? h('span', D.duration(task.estimate) + ' estimées') : null,
                  task.actual ? h('span', D.duration(task.actual) + ' passées') : null
                ])
              ])
            ]),
            task.notes ? L.dom.text(task.notes, 't-s') : null,
            h('div.grid.grid--2', { style: { marginTop: '4px' } }, [
              task.date ? L.dom.field('Prévue le', h('div.t-s', D.format(task.date, 'long') + (task.time ? ' à ' + task.time : ''))) : null,
              task.due ? L.dom.field('Date limite', h('div.t-s' + (L.tasks.isOverdue(task) ? '.negative' : ''), D.format(task.due, 'long') + ' · ' + D.relative(task.due))) : null,
              domain ? L.dom.field('Domaine', h('div.row.t-s', [L.dom.dot(domain.color), domain.name])) : null,
              project ? L.dom.field('Projet', h('button.t-s.accent', {
                style: { textAlign: 'left' },
                onclick: function () { api.close(); L.router.go('projects', { id: project.id }); }
              }, project.name)) : null,
              goal ? L.dom.field('Objectif', h('button.t-s.accent', {
                style: { textAlign: 'left' },
                onclick: function () { api.close(); L.router.go('goals', { id: goal.id }); }
              }, goal.name)) : null,
              task.recurrence ? L.dom.field('Répétition', h('div.t-s', D.recurrenceLabel(task.recurrence))) : null
            ].filter(Boolean)),
            (task.subtasks || []).length || true ? L.dom.field('Sous-tâches', subWrap) : null,
            (task.attachments || []).length ? L.dom.field('Pièces jointes', h('div.col', { style: { gap: '4px' } },
              task.attachments.map(function (att) {
                return h('div.row.t-s', [
                  L.icon(att.kind === 'link' ? 'link' : 'paperclip'),
                  att.kind === 'link'
                    ? h('a.accent.truncate', { href: att.url, target: '_blank', rel: 'noopener' }, att.name)
                    : h('span.truncate', att.name)
                ]);
              }))) : null,
            linkedNotes.length ? L.dom.field('Notes liées', h('div.col', { style: { gap: '4px' } },
              linkedNotes.map(function (n) {
                return h('button.t-s.accent', {
                  style: { textAlign: 'left' },
                  onclick: function () { api.close(); L.forms.note(n); }
                }, n.title);
              }))) : null
          ];
        },
        footerSplit: true,
        footer: function (api) {
          return [
            h('button.btn.btn--ghost', {
              onclick: function () { api.close(); setTimeout(function () { V.taskMenuFallback(task); }, 120); }
            }, 'Reporter…'),
            h('div.row', [
              h('button.btn', { onclick: function () { api.close(); } }, 'Fermer'),
              h('button.btn.btn--primary', {
                onclick: function () {
                  L.tasks.setStatus(task.id, task.status === 'done' ? 'todo' : 'done');
                  api.close();
                  L.toast.undo(task.status === 'done' ? 'Tâche rouverte' : 'Tâche terminée');
                }
              }, task.status === 'done' ? 'Rouvrir' : 'Terminer')
            ])
          ];
        }
      });
    },

    taskMenuFallback: function (task) {
      L.modal.open({
        title: 'Reporter « ' + task.title + ' »',
        size: 'narrow',
        body: h('div.col', [
          h('button.btn.btn--full', { onclick: function () { L.tasks.postpone(task.id, D.today()); L.modal.closeTop(); L.toast.undo('Reportée'); } }, "Aujourd'hui"),
          h('button.btn.btn--full', { onclick: function () { L.tasks.postpone(task.id, D.addDays(D.today(), 1)); L.modal.closeTop(); L.toast.undo('Reportée'); } }, 'Demain'),
          h('button.btn.btn--full', { onclick: function () { L.tasks.postpone(task.id, D.addDays(D.today(), 7)); L.modal.closeTop(); L.toast.undo('Reportée'); } }, 'Dans une semaine')
        ])
      });
    },

    /* Liste encadrée, avec regroupement facultatif.
       Au-delà de 200 lignes on s'arrête : une liste plus longue ne se lit
       pas, et la rendre entièrement ralentirait chaque frappe. */
    taskList: function (tasks, opts) {
      opts = opts || {};
      if (!tasks.length) {
        return opts.empty || L.dom.empty('check', 'Rien à faire', 'Aucune tâche ne correspond.');
      }
      var LIMIT = opts.limit || 200;
      var shown = tasks.slice(0, LIMIT);
      var hidden = tasks.length - shown.length;
      var more = hidden > 0
        ? h('div.t-xs.faint', { style: { padding: 'var(--sp-3) var(--sp-4)' } },
            hidden + ' ' + L.util.plural(hidden, 'tâche') + ' de plus — affine les filtres pour les voir.')
        : null;

      if (!opts.group) {
        return h('div.list--framed', shown.map(function (t) { return V.taskRow(t, opts); }).concat([more]));
      }
      tasks = shown;
      var groups = L.util.groupBy(tasks, opts.group);
      var keys = Object.keys(groups).sort(opts.sortGroups || undefined);
      return h('div.col', { style: { gap: 'var(--sp-5)' } }, keys.map(function (key) {
        return h('div', [
          h('div.eyebrow', { style: { marginBottom: '8px' } }, (opts.groupLabel ? opts.groupLabel(key) : key) + '  ·  ' + groups[key].length),
          h('div.list--framed', groups[key].map(function (t) { return V.taskRow(t, opts); }))
        ]);
      }).concat([more]));
    },

    /* ---------- objectif ---------- */
    goalCard: function (goal, opts) {
      opts = opts || {};
      var s = L.goals.summary(goal);
      var variant = s.done ? 'positive' : s.late ? 'danger' : s.behind ? 'warning' : s.ahead ? 'positive' : null;
      return h('button.card.card--tap', {
        onclick: function () { opts.onClick ? opts.onClick(goal) : L.router.go('goals', { id: goal.id }); }
      }, [
        h('div.between', [
          h('div.grow', { style: { minWidth: 0 } }, [
            h('div.t-s.w-600.truncate', goal.name),
            h('div.t-xs.muted', { style: { marginTop: '2px' } }, goal.category || '')
          ]),
          L.dom.ring(s.progress, 40, {
            label: s.percent + ' %',
            color: variant === 'danger' ? 'var(--danger)'
              : variant === 'warning' ? 'var(--warning)'
              : variant === 'positive' ? 'var(--positive)' : 'var(--accent)'
          })
        ]),
        h('div', { style: { marginTop: '14px' } }, [
          h('div.between.t-xs', { style: { marginBottom: '6px' } }, [
            h('span.w-600.num', L.format.quantity(s.current, goal.unit)),
            h('span.faint.num', 'sur ' + L.format.quantity(goal.target, goal.unit))
          ]),
          L.dom.bar(s.progress, variant)
        ]),
        h('div.t-xs.muted', { style: { marginTop: '10px' } }, [
          s.late ? h('span.negative', 'Date cible dépassée')
            : s.behind ? h('span.warning', 'En retard sur le rythme')
            : s.ahead ? h('span.positive', 'En avance')
            : h('span', s.daysLeft !== null ? s.daysLeft + ' jours restants' : 'Sans date cible')
        ]),
        s.perMonth && !s.done ? h('div.t-xs.faint', { style: { marginTop: '2px' } },
          L.format.quantity(L.util.round(s.perMonth, 2), goal.unit) + ' par mois pour tenir') : null
      ]);
    },

    /* ---------- projet ---------- */
    projectCard: function (project, opts) {
      opts = opts || {};
      var s = L.projects.summary(project);
      var domain = project.domainId ? L.domains.get(project.domainId) : null;
      return h('button.card.card--tap', {
        onclick: function () { opts.onClick ? opts.onClick(project) : L.router.go('projects', { id: project.id }); }
      }, [
        h('div.between', [
          h('div.grow', { style: { minWidth: 0 } }, [
            h('div.t-s.w-600.truncate', project.name),
            h('div.row.t-xs.muted', { style: { marginTop: '3px', gap: '8px' } }, [
              domain ? h('span.row', { style: { gap: '4px' } }, [L.dom.dot(domain.color), domain.name]) : null,
              h('span', L.schema.label(L.schema.PROJECT_STATUS, project.status))
            ])
          ]),
          h('span.t-s.w-600.num', s.percent + ' %')
        ]),
        h('div', { style: { marginTop: '12px' } }, [L.dom.bar(s.progress, s.atRisk ? 'warning' : null)]),
        h('div.row.wrap.t-xs.muted', { style: { marginTop: '10px', gap: '10px' } }, [
          h('span', s.tasksDone + '/' + s.tasksTotal + ' tâches'),
          s.remainingMinutes ? h('span', D.duration(s.remainingMinutes) + ' restantes') : null,
          project.due ? h('span' + (s.daysLeft !== null && s.daysLeft < 0 ? '.negative' : ''), D.relative(project.due)) : null,
          s.overdue ? h('span.negative', s.overdue + ' en retard') : null,
          s.budget ? h('span', L.format.money(s.spent) + ' / ' + L.format.money(s.budget)) : null
        ]),
        s.nextMilestone ? h('div.t-xs.faint', { style: { marginTop: '6px' } },
          'Prochaine étape : ' + s.nextMilestone.title) : null
      ]);
    },

    /* ---------- habitude ---------- */
    habitRow: function (habit, isoDate, opts) {
      opts = opts || {};
      var day = isoDate || D.today();
      var done = L.habits.isDone(habit, day);
      var value = L.habits.valueOn(habit, day);
      var streak = L.habits.streak(habit).current;
      var domain = habit.domainId ? L.domains.get(habit.domainId) : null;

      function edit() {
        if (habit.kind === 'check') { L.habits.toggle(habit.id, day); return; }
        L.modal.prompt({
          title: habit.name,
          label: habit.kind === 'time' ? 'Heure (HH:MM)' : habit.kind === 'duration' ? 'Minutes' : 'Valeur' + (habit.unit ? ' (' + habit.unit + ')' : ''),
          value: value === null ? '' : String(value),
          hint: 'Objectif : ' + L.habits.targetLabel(habit)
        }).then(function (v) {
          if (v === null) return;
          L.habits.log(habit.id, day, habit.kind === 'time' ? v : (parseFloat(String(v).replace(',', '.')) || 0));
        });
      }

      return h('div.task', [
        L.dom.checkbox(done, function () { L.habits.toggle(habit.id, day); }, { round: true, label: habit.name }),
        h('div.task__main', { onclick: edit }, [
          h('div.task__title' + (done ? '.muted' : ''), habit.name),
          h('div.task__meta', [
            h('span', L.habits.targetLabel(habit)),
            value !== null && habit.kind !== 'check' ? h('span.accent', L.habits.label(habit, value)) : null,
            streak ? h('span', '🔥 ' + streak + ' j') : null,
            domain ? h('span.truncate', [L.dom.dot(domain.color), ' ' + domain.name]) : null
          ])
        ]),
        h('div.task__side', [
          opts.actions === false ? null : h('button.iconbtn', {
            'aria-label': 'Options',
            onclick: function (e) {
              e.stopPropagation();
              L.menu(e.currentTarget, [
                { icon: 'edit', label: 'Saisir une valeur', run: edit },
                { icon: 'settings', label: 'Modifier l\'habitude', run: function () { L.forms.habit(habit); } },
                { icon: 'chart', label: 'Voir le détail', run: function () { L.router.go('habits', { id: habit.id }); } }
              ], { align: 'right' });
            }
          }, L.icon('more'))
        ])
      ]);
    },

    /* ---------- transaction ---------- */
    txRow: function (tx, opts) {
      opts = opts || {};
      var cat = tx.categoryId ? L.finance.category(tx.categoryId) : null;
      var sign = L.finance.sign(tx.type);
      var project = tx.projectId ? L.projects.get(tx.projectId) : null;
      return h('button.tx', {
        onclick: function () { L.forms.transaction(tx); }
      }, [
        h('div.tx__icon', { style: cat ? { color: cat.color } : null }, cat ? cat.icon : '•'),
        h('div.grow', { style: { minWidth: 0 } }, [
          h('div.t-s.w-500.truncate', tx.description || (cat ? cat.name : 'Transaction')),
          h('div.t-xs.faint.truncate', [
            D.format(tx.date, 'short'),
            cat ? ' · ' + cat.name : '',
            project ? ' · ' + project.name : '',
            tx.fixed ? ' · fixe' : ''
          ].join(''))
        ]),
        h('div.tx__amount' + (tx.type === 'income' ? '.positive' : sign === 0 ? '.muted' : ''),
          (tx.type === 'income' ? '+' : sign === 0 ? '' : '−') + L.format.money(tx.amount).replace('−', ''))
      ]);
    },

    /* ---------- agenda / planning ---------- */
    planTimeline: function (plan, opts) {
      opts = opts || {};
      if (!plan || !plan.blocks.length) {
        return L.dom.empty('layout', 'Journée libre', 'Aucun bloc pour l\'instant.');
      }
      var now = D.nowMinutes();
      var isToday = plan.date === D.today();
      var nodes = [];
      var nowPlaced = false;

      plan.blocks.forEach(function (b) {
        if (isToday && !nowPlaced && b.start > now) {
          nodes.push(h('div.nowline', [
            h('span.nowline__label', D.toTime(now)),
            h('span.nowline__rule')
          ]));
          nowPlaced = true;
        }
        var past = isToday && b.end <= now;
        var ref = b.type === 'task' ? L.tasks.get(b.refId) : null;
        var doneTask = ref && ref.status === 'done';

        nodes.push(h('div.block.block--' + b.type + (past ? '.block--past' : ''), [
          h('div.block__time', D.toTime(b.start)),
          h('div.block__rule'),
          h('div.block__body', [
            h('div.between', [
              h('div.grow', { style: { minWidth: 0 } }, [
                h('div.block__title' + (doneTask ? '.strike.muted' : ''), b.title),
                h('div.block__why', [
                  D.toTime(b.start) + ' – ' + D.toTime(b.end),
                  ' · ' + D.duration(b.minutes),
                  b.partial ? ' · à poursuivre' : '',
                  b.why ? ' · ' + b.why : ''
                ].join(''))
              ]),
              opts.actions === false ? null : h('div.row', { style: { gap: '4px' } }, [
                b.type === 'task' && ref ? L.dom.checkbox(doneTask, function () {
                  L.tasks.setStatus(ref.id, doneTask ? 'todo' : 'done');
                }, { round: true, label: 'Terminer' }) : null,
                b.type === 'habit' ? L.dom.checkbox(L.habits.isDone(L.habits.get(b.refId) || {}, plan.date), function () {
                  L.habits.toggle(b.refId, plan.date);
                }, { round: true, label: 'Terminer' }) : null,
                opts.editable ? h('button.iconbtn', {
                  'aria-label': 'Retirer',
                  onclick: function () { L.planner.removeBlock(plan.date, b.id); }
                }, L.icon('x')) : null
              ])
            ])
          ])
        ]));
      });

      if (isToday && !nowPlaced) {
        nodes.push(h('div.nowline', [h('span.nowline__label', D.toTime(now)), h('span.nowline__rule')]));
      }
      return h('div.timeline', nodes);
    },

    agendaItem: function (item, opts) {
      opts = opts || {};
      var icon = item.kind === 'event' ? 'calendar' : item.kind === 'due' ? 'flag' : item.kind === 'habit' ? 'repeat' : 'check';
      var domain = item.domainId ? L.domains.get(item.domainId) : null;
      return h('button.list__item', {
        onclick: function () {
          if (item.kind === 'event') L.forms.event(item.ref);
          else if (item.kind === 'habit') L.router.go('habits', { id: item.id });
          else V.taskDetail(item.id);
        }
      }, [
        h('span.t-xs.muted.num', { style: { width: '44px', flex: 'none' } },
          item.allDay ? '—' : D.toTime(item.start)),
        h('span', { style: { color: domain ? domain.color : 'var(--ink-4)' } }, L.icon(icon, 15)),
        h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
          h('div.t-s.truncate', item.title),
          h('div.t-xs.faint.truncate', [
            item.allDay ? (item.kind === 'due' ? 'Échéance' : 'Toute la journée')
              : D.toTime(item.start) + ' – ' + D.toTime(item.end),
            item.location ? ' · ' + item.location : ''
          ].join(''))
        ])
      ]);
    },

    /* ---------- cartes de chiffres ---------- */
    stat: function (label, value, hint, opts) {
      opts = opts || {};
      return h('div.card' + (opts.flat ? '.card--flat' : ''), [
        h('div.stat__label', label),
        h('div.stat__value' + (opts.small ? '.stat__value--s' : '') + (opts.tone ? '.' + opts.tone : ''), value),
        hint ? h('div.stat__hint', hint) : null,
        opts.bar !== undefined ? h('div', { style: { marginTop: '10px' } }, [L.dom.bar(opts.bar, opts.barVariant)]) : null,
        opts.extra || null
      ]);
    },

    sectionHead: function (title, action) {
      return h('div.section__head', [h('h2.section__title', title), action || null]);
    },

    /* ---------- « Je suis perdu » ---------- */
    lost: function () {
      var res = L.focus.next(3);
      var context = L.focus.context();

      L.modal.open({
        title: 'Prochaines actions',
        size: 'narrow',
        body: function (api) {
          return h('div.col', { style: { gap: 'var(--sp-4)' } }, [
            context ? h('p.t-xs.muted', context) : null,
            h('div.col', { style: { gap: '10px' } }, res.actions.map(function (a, i) {
              return h('div.card', { style: { padding: 'var(--sp-4)' } }, [
                h('div.row-top', [
                  h('div', {
                    style: {
                      width: '22px', height: '22px', borderRadius: '50%', flex: 'none',
                      background: 'var(--ink)', color: 'var(--bg)',
                      display: 'grid', placeItems: 'center',
                      fontSize: '11px', fontWeight: '700'
                    }
                  }, String(i + 1)),
                  h('div.grow', { style: { minWidth: 0 } }, [
                    h('div.t-s.w-600', a.title),
                    a.detail ? h('div.t-xs.muted', { style: { marginTop: '3px' } }, a.detail) : null,
                    a.why ? h('div.t-xs.faint', { style: { marginTop: '3px' } }, a.why) : null
                  ])
                ]),
                a.kind === 'task' || a.kind === 'habit' ? h('div.row', { style: { marginTop: '12px', gap: '6px' } }, [
                  h('button.btn.btn--s.btn--primary', {
                    onclick: function () {
                      if (a.kind === 'task') L.tasks.setStatus(a.id, 'doing');
                      api.close();
                      L.toast.show('C\'est parti : ' + a.title);
                    }
                  }, 'Je commence'),
                  h('button.btn.btn--s', {
                    onclick: function () {
                      if (a.kind === 'task') { L.tasks.setStatus(a.id, 'done'); L.toast.undo('Terminée'); }
                      else { L.habits.toggle(a.id); L.toast.show('Habitude cochée'); }
                      api.close();
                    }
                  }, 'Déjà fait'),
                  a.kind === 'task' ? h('button.btn.btn--s.btn--ghost', {
                    onclick: function () { L.tasks.postpone(a.id, D.addDays(D.today(), 1)); api.close(); L.toast.undo('Reportée à demain'); }
                  }, 'Plus tard') : null
                ]) : null
              ]);
            }))
          ]);
        },
        footer: function (api) {
          return [
            h('button.btn', { onclick: function () { api.close(); L.router.go('planning', { generate: 'day' }); } }, 'Organiser la suite'),
            h('button.btn.btn--primary', { onclick: function () { api.close(); } }, 'Compris')
          ];
        }
      });
    },

    /* Ouvre l'objet correspondant à un résultat de recherche. */
    openEntity: function (kind, id) {
      switch (kind) {
        case 'task': V.taskDetail(id); break;
        case 'project': L.router.go('projects', { id: id }); break;
        case 'goal': L.router.go('goals', { id: id }); break;
        case 'note': {
          var n = L.notes.get(id);
          if (n) L.forms.note(n);
          break;
        }
        case 'transaction': {
          var t = L.finance.get(id);
          if (t) L.forms.transaction(t);
          break;
        }
        case 'habit': L.router.go('habits', { id: id }); break;
        case 'event': {
          var e = L.calendar.get(id);
          if (e) L.forms.event(e);
          break;
        }
        case 'domain': L.router.go('settings', { tab: 'domains' }); break;
        default: L.router.go('home');
      }
    }
  };

  Object.assign(L.views, V);
})(window.LifeOS = window.LifeOS || {});
