/* ==========================================================================
   LifeOS — Tâches
   Filtres, tri, regroupement, recherche. Les vues rapides à gauche couvrent
   90 % des usages ; les filtres fins servent aux 10 % restants.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  var QUICK = [
    { id: 'today', label: "Aujourd'hui", icon: 'sun' },
    { id: 'week', label: 'Cette semaine', icon: 'layout' },
    { id: 'overdue', label: 'En retard', icon: 'alert' },
    { id: 'inbox', label: 'Sans date', icon: 'inbox' },
    { id: 'open', label: 'Toutes les ouvertes', icon: 'list' },
    { id: 'done', label: 'Terminées', icon: 'check' }
  ];

  function select(options, value, onChange) {
    return L.forms.select(options, value, onChange);
  }

  function resolve(params) {
    var quick = params.quick || 'open';
    var base = {
      domainId: params.domain || null,
      projectId: params.project || null,
      tag: params.tag || null,
      priority: params.priority === undefined || params.priority === '' ? null : params.priority,
      query: params.q || '',
      sort: params.sort || 'smart'
    };
    var list;
    switch (quick) {
      case 'today':
        list = L.tasks.forDate(D.today(), { includeOverdue: true, sort: base.sort });
        list = list.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
        break;
      case 'week': {
        var start = D.today(), end = D.addDays(D.startOfWeek(D.today(), L.store.state.settings.firstDayOfWeek), 6);
        list = L.tasks.filter(Object.assign({}, base, { status: 'open' })).filter(function (t) {
          var when = t.date || t.due;
          return when && when >= D.startOfWeek(start, 1) && when <= end;
        });
        break;
      }
      case 'overdue':
        list = L.tasks.overdue();
        break;
      case 'inbox':
        list = L.tasks.inbox();
        break;
      case 'done':
        list = L.tasks.filter(Object.assign({}, base, { status: 'done', sort: 'created' }));
        break;
      default:
        list = L.tasks.filter(Object.assign({}, base, { status: 'open' }));
    }
    /* Les filtres fins s'appliquent aussi aux vues rapides. */
    if (quick !== 'open' && quick !== 'done') {
      if (base.domainId) list = list.filter(function (t) { return t.domainId === base.domainId; });
      if (base.projectId) list = list.filter(function (t) { return t.projectId === base.projectId; });
      if (base.tag) list = list.filter(function (t) { return (t.tags || []).indexOf(base.tag) > -1; });
      if (base.priority !== null) list = list.filter(function (t) { return t.priority === +base.priority; });
      if (base.query) {
        var q = L.util.fold(base.query);
        list = list.filter(function (t) { return L.util.fold(t.title).indexOf(q) > -1 || L.util.fold(t.notes).indexOf(q) > -1; });
      }
    }
    return list;
  }

  function groupers(mode) {
    switch (mode) {
      case 'domain':
        return {
          group: function (t) { return t.domainId || 'zz'; },
          groupLabel: function (k) { return k === 'zz' ? 'Sans domaine' : (L.domains.name(k) || 'Domaine'); }
        };
      case 'project':
        return {
          group: function (t) { return t.projectId || 'zz'; },
          groupLabel: function (k) {
            if (k === 'zz') return 'Sans projet';
            var p = L.projects.get(k);
            return p ? p.name : 'Projet';
          }
        };
      case 'priority':
        return {
          group: function (t) { return String(t.priority); },
          groupLabel: function (k) { return L.schema.priority(+k).label; }
        };
      case 'date':
        return {
          group: function (t) {
            var when = t.date || t.due;
            if (!when) return 'zz';
            if (when < D.today()) return 'aa';
            if (when === D.today()) return 'ab';
            if (when <= D.addDays(D.today(), 7)) return 'ac';
            return 'ad';
          },
          groupLabel: function (k) {
            return { aa: 'En retard', ab: "Aujourd'hui", ac: 'Cette semaine', ad: 'Plus tard', zz: 'Sans date' }[k] || k;
          }
        };
      case 'status':
        return {
          group: function (t) { return t.status; },
          groupLabel: function (k) { return L.schema.label(L.schema.TASK_STATUS, k); }
        };
      default: return null;
    }
  }

  L.views.tasks = function (params) {
    var quick = params.quick || 'open';
    var groupMode = params.group || 'date';
    var list = resolve(params);
    var grouping = groupers(groupMode);

    var totalMinutes = L.util.sum(list.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; }), function (t) { return t.estimate || 0; });

    var aside = h('div.col', { style: { gap: '2px' } }, [
      h('div.eyebrow', { style: { padding: '0 var(--sp-3) var(--sp-2)' } }, 'Vues'),
      h('div.col', { style: { gap: '1px' } }, QUICK.map(function (q) {
        var count = resolve(Object.assign({}, params, { quick: q.id, q: '' })).length;
        return h('button.navitem', {
          'aria-current': quick === q.id ? 'page' : null,
          onclick: function () { L.router.setParams({ quick: q.id }); }
        }, [L.icon(q.icon), h('span.grow', q.label), h('span.navitem__count', String(count))]);
      })),
      h('div.eyebrow', { style: { padding: 'var(--sp-5) var(--sp-3) var(--sp-2)' } }, 'Domaines'),
      h('div.col', { style: { gap: '1px' } }, L.domains.all().map(function (dom) {
        var s = L.domains.summary(dom.id);
        return h('button.navitem', {
          'aria-current': params.domain === dom.id ? 'page' : null,
          onclick: function () { L.router.setParams({ domain: params.domain === dom.id ? '' : dom.id }); }
        }, [
          h('span.swatch', { style: { background: dom.color, width: '10px', height: '10px', borderRadius: '3px' } }),
          h('span.grow.truncate', dom.name),
          h('span.navitem__count', String(s.open))
        ]);
      }))
    ]);

    var toolbar = h('div.toolbar', { style: { marginBottom: 'var(--sp-4)' } }, [
      h('input.input', {
        placeholder: 'Filtrer…', value: params.q || '', style: { maxWidth: '240px' },
        oninput: L.util.debounce(function (e) { L.router.setParams({ q: e.target.value }, { replace: true }); }, 250)
      }),
      select([{ value: '', label: 'Tous les projets' }].concat(L.projects.all().map(function (p) {
        return { value: p.id, label: p.name };
      })), params.project || '', function (v) { L.router.setParams({ project: v }); }),
      select([
        { value: '', label: 'Toutes priorités' }
      ].concat(L.schema.PRIORITIES.map(function (p) { return { value: p.id, label: p.label }; })),
        params.priority === undefined ? '' : params.priority, function (v) { L.router.setParams({ priority: v }); }),
      select([
        { value: 'smart', label: 'Tri intelligent' },
        { value: 'due', label: 'Par échéance' },
        { value: 'priority', label: 'Par priorité' },
        { value: 'created', label: 'Par création' },
        { value: 'estimate', label: 'Par durée' },
        { value: 'alpha', label: 'Alphabétique' }
      ], params.sort || 'smart', function (v) { L.router.setParams({ sort: v }); }),
      select([
        { value: 'date', label: 'Grouper par date' },
        { value: 'domain', label: 'Grouper par domaine' },
        { value: 'project', label: 'Grouper par projet' },
        { value: 'priority', label: 'Grouper par priorité' },
        { value: 'status', label: 'Grouper par statut' },
        { value: 'none', label: 'Sans regroupement' }
      ], groupMode, function (v) { L.router.setParams({ group: v }); }),
      (params.domain || params.project || params.tag || params.q || params.priority)
        ? h('button.btn.btn--s.btn--ghost', {
            onclick: function () { L.router.setParams({ domain: '', project: '', tag: '', q: '', priority: '' }); }
          }, [L.icon('x'), 'Réinitialiser'])
        : null
    ]);

    var tags = L.tasks.tags();

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Tâches'),
            h('p.view__lead', list.length + ' ' + L.util.plural(list.length, 'tâche') +
              (totalMinutes ? ' · ' + D.duration(totalMinutes) + ' de travail estimé' : ''))
          ]),
          h('div.row', [
            h('button.btn', { onclick: function () { L.forms.task(); } }, 'Nouvelle tâche détaillée'),
            h('button.btn.btn--primary', { onclick: function () { L.forms.quickTask(); } }, [L.icon('plus'), 'Ajout rapide'])
          ])
        ])
      ]),

      h('div.grid', { style: { gridTemplateColumns: 'minmax(0,1fr)', gap: 'var(--sp-5)' } }, [
        h('div.notes-layout', [
          h('div.desktop-only', [aside]),
          h('div', [
            h('div.toolbar.mobile-only', { style: { marginBottom: 'var(--sp-4)', overflowX: 'auto' } },
              QUICK.map(function (q) {
                return h('button.chip.chip--tap' + (quick === q.id ? '.chip--accent' : ''), {
                  onclick: function () { L.router.setParams({ quick: q.id }); }
                }, q.label);
              })),
            toolbar,
            tags.length ? h('div.toolbar.toolbar--scroll', { style: { marginBottom: 'var(--sp-4)' } },
              tags.slice(0, 12).map(function (tag) {
                return h('button.chip.chip--tap' + (params.tag === tag ? '.chip--accent' : ''), {
                  onclick: function () { L.router.setParams({ tag: params.tag === tag ? '' : tag }); }
                }, '#' + tag);
              })) : null,
            list.length
              ? L.views.taskList(list, grouping ? {
                  group: grouping.group,
                  groupLabel: grouping.groupLabel
                } : {})
              : L.dom.empty('check', 'Aucune tâche ici',
                  quick === 'overdue' ? 'Rien en retard — c\'est une bonne nouvelle.' : 'Ajoute une tâche ou change de filtre.',
                  h('button.btn.btn--primary', { onclick: function () { L.forms.quickTask(); } }, 'Nouvelle tâche'))
          ])
        ])
      ])
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
