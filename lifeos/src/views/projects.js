/* ==========================================================================
   LifeOS — Projets
   Liste ou tableau par statut, puis une fiche complète : avancement calculé
   depuis les tâches et les étapes, budget alimenté par les transactions
   liées, notes et échéances.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  /* ---------------- fiche ---------------- */
  function detail(project) {
    var s = L.projects.summary(project);
    var domain = project.domainId ? L.domains.get(project.domainId) : null;
    var tasks = L.projects.tasks(project.id, { status: 'all', sort: 'smart' });
    var open = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
    var done = tasks.filter(function (t) { return t.status === 'done'; });
    var notes = L.notes.forEntity(project.id);
    var spend = L.finance.filter({ projectId: project.id });

    return h('div.view', [
      h('div.view__head', [
        h('button.btn.btn--s.btn--ghost', {
          style: { marginBottom: 'var(--sp-4)' },
          onclick: function () { L.router.go('projects'); }
        }, [L.icon('chevron-left'), 'Tous les projets']),
        h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
          h('div', { style: { minWidth: 0 } }, [
            h('div.row.wrap', { style: { gap: '8px', marginBottom: '8px' } }, [
              domain ? h('span.chip', [L.dom.dot(domain.color), domain.name]) : null,
              h('span.chip' + (project.status === 'active' ? '.chip--accent' : ''), L.schema.label(L.schema.PROJECT_STATUS, project.status)),
              project.due ? h('span.chip' + (s.daysLeft !== null && s.daysLeft < 0 ? '.chip--danger' : ''), 'Échéance ' + D.relative(project.due, { caps: false })) : null,
              s.atRisk ? h('span.chip.chip--warning', 'Charge tendue') : null
            ]),
            h('h1.view__title', project.name),
            project.objective ? h('p.view__lead', project.objective) : null
          ]),
          h('div.row', [
            h('button.btn', { onclick: function () { L.forms.task(null, { projectId: project.id, domainId: project.domainId }); } }, [L.icon('plus'), 'Tâche']),
            h('button.btn', { onclick: function () { L.forms.project(project, null, function (saved) { if (!saved) L.router.go('projects'); }); } }, 'Modifier')
          ])
        ])
      ]),

      h('div.grid.grid--4.grid--keep2', [
        L.views.stat('Avancement', s.percent + ' %', s.tasksDone + ' / ' + s.tasksTotal + ' tâches', { bar: s.progress }),
        L.views.stat('Reste à faire', D.duration(s.remainingMinutes, { zero: '0' }), s.tasksOpen + ' tâches ouvertes'),
        L.views.stat('Échéance', project.due ? D.format(project.due, 'short') : '—',
          s.daysLeft === null ? 'sans date' : s.daysLeft < 0 ? Math.abs(s.daysLeft) + ' jours de retard' : s.daysLeft + ' jours restants',
          { tone: s.daysLeft !== null && s.daysLeft < 0 ? 'negative' : null }),
        s.budget
          ? L.views.stat('Budget', L.format.money(s.spent, { decimals: 0 }), 'sur ' + L.format.money(s.budget, { decimals: 0 }),
              { bar: L.util.clamp(s.spent / s.budget, 0, 1), barVariant: s.spent > s.budget ? 'danger' : null })
          : L.views.stat('Dépenses', L.format.money(s.spent, { decimals: 0 }), 'aucun budget fixé')
      ]),

      project.description ? h('div.section', [
        L.views.sectionHead('Description'),
        h('div.card', [L.dom.text(project.description, 't-s')])
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Étapes', h('button.btn.btn--s', {
          onclick: function () {
            L.modal.prompt({ title: 'Nouvelle étape', label: 'Intitulé' }).then(function (v) {
              if (v) L.projects.addMilestone(project.id, v);
            });
          }
        }, [L.icon('plus'), 'Ajouter'])),
        (project.milestones || []).length
          ? h('div.list.list--framed', project.milestones.map(function (m) {
              return h('div.list__item', [
                L.dom.checkbox(m.done, function () { L.projects.toggleMilestone(project.id, m.id); }, { label: m.title }),
                h('div.grow', { style: { minWidth: 0 } }, [
                  h('div.t-s' + (m.done ? '.strike.muted' : ''), m.title),
                  m.due ? h('div.t-xs.faint', D.relative(m.due)) : null
                ]),
                h('button.iconbtn', {
                  'aria-label': 'Supprimer',
                  onclick: function () { L.projects.removeMilestone(project.id, m.id); }
                }, L.icon('trash'))
              ]);
            }))
          : h('p.t-s.faint', 'Aucune étape. Découper un projet en trois ou quatre jalons suffit souvent.')
      ]),

      h('div.section', [
        L.views.sectionHead('Tâches · ' + open.length + ' ouvertes'),
        open.length ? h('div.list--framed', open.map(function (t) { return L.views.taskRow(t, { showGoal: false }); }))
          : L.dom.empty('check', 'Aucune tâche ouverte', 'Ajoute la prochaine action concrète du projet.',
              h('button.btn.btn--primary', { onclick: function () { L.forms.task(null, { projectId: project.id, domainId: project.domainId }); } }, 'Nouvelle tâche'))
      ]),

      done.length ? h('div.section', [
        L.views.sectionHead('Terminées · ' + done.length),
        h('div.list--framed', done.slice(0, 20).map(function (t) { return L.views.taskRow(t, { actions: false }); }))
      ]) : null,

      spend.length ? h('div.section', [
        L.views.sectionHead('Dépenses liées'),
        h('div.list--framed', spend.map(function (t) { return L.views.txRow(t); }))
      ]) : null,

      notes.length ? h('div.section', [
        L.views.sectionHead('Notes liées'),
        h('div.grid.grid--auto', notes.map(function (n) {
          return h('button.note-card', { onclick: function () { L.forms.note(n); } }, [
            h('div.t-s.w-600.truncate', n.title),
            h('div.note-card__body.clamp-3', L.notes.excerpt(n, 140))
          ]);
        }))
      ]) : null,

      project.notes ? h('div.section', [
        L.views.sectionHead('Notes du projet'),
        h('div.card', [L.dom.text(project.notes, 't-s')])
      ]) : null,

      s.goal ? h('div.section', [
        L.views.sectionHead('Objectif servi'),
        L.views.goalCard(s.goal)
      ]) : null
    ]);
  }

  /* ---------------- liste ---------------- */
  L.views.projects = function (params) {
    if (params.id) {
      var project = L.projects.get(params.id);
      if (project) return detail(project);
    }

    var status = params.status || 'active';
    var all = L.projects.all();
    var list = status === 'all' ? all : all.filter(function (p) {
      return status === 'active' ? (p.status === 'active' || p.status === 'planned') : p.status === status;
    });
    var mode = params.mode || 'grid';

    var summaries = list.map(L.projects.summary);
    var totalOpen = L.util.sum(summaries, function (s) { return s.tasksOpen; });
    var atRisk = summaries.filter(function (s) { return s.atRisk || s.overdue; }).length;

    var board = h('div.board', L.schema.PROJECT_STATUS.map(function (st) {
      var col = all.filter(function (p) { return p.status === st.id; });
      return h('div.board__col', [
        h('div.board__head', [h('span', st.label), h('span.faint', String(col.length))]),
        h('div.col', { style: { gap: '10px' } }, col.length
          ? col.map(function (p) { return L.views.projectCard(p); })
          : [h('div.card.card--flat', { style: { padding: 'var(--sp-4)' } }, h('span.t-xs.faint', 'Vide'))])
      ]);
    }));

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Projets'),
            h('p.view__lead', list.length + ' ' + L.util.plural(list.length, 'projet') + ' · ' +
              totalOpen + ' ' + L.util.plural(totalOpen, 'tâche') + ' ouverte' + (totalOpen > 1 ? 's' : '') +
              (atRisk ? ' · ' + atRisk + ' à surveiller' : ''))
          ]),
          h('div.row.wrap', [
            L.dom.segmented([
              { id: 'grid', label: 'Grille', icon: 'grid' },
              { id: 'board', label: 'Tableau', icon: 'layout' }
            ], mode, function (id) { L.router.setParams({ mode: id }); }),
            h('button.btn.btn--primary', { onclick: function () { L.forms.project(); } }, [L.icon('plus'), 'Nouveau projet'])
          ])
        ])
      ]),

      mode === 'grid' ? h('div.toolbar', { style: { marginBottom: 'var(--sp-5)' } },
        [{ id: 'active', label: 'Actifs' }].concat(L.schema.PROJECT_STATUS.filter(function (s) {
          return s.id !== 'active';
        }).map(function (s) {
          return { id: s.id, label: s.label };
        })).concat([{ id: 'all', label: 'Tous' }]).map(function (opt) {
          return h('button.chip.chip--tap' + (status === opt.id ? '.chip--accent' : ''), {
            onclick: function () { L.router.setParams({ status: opt.id }); }
          }, opt.label);
        })) : null,

      mode === 'board' ? board
        : (list.length
            ? h('div.grid.grid--auto-l', list.map(function (p) { return L.views.projectCard(p); }))
            : L.dom.empty('folder', 'Aucun projet', 'Un projet regroupe des tâches vers un résultat précis.',
                h('button.btn.btn--primary', { onclick: function () { L.forms.project(); } }, 'Créer un projet')))
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
