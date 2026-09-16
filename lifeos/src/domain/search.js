/* ==========================================================================
   LifeOS — recherche globale
   Une requête, tout le contenu : tâches, projets, objectifs, notes,
   transactions, habitudes, événements, domaines. Le classement mélange la
   qualité de la correspondance et la fraîcheur de l'élément.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, store = L.store;
  function S() { return store.state; }

  var KINDS = {
    task:        { label: 'Tâche',       icon: 'check',    view: 'tasks' },
    project:     { label: 'Projet',      icon: 'folder',   view: 'projects' },
    goal:        { label: 'Objectif',    icon: 'target',   view: 'goals' },
    note:        { label: 'Note',        icon: 'note',     view: 'notes' },
    transaction: { label: 'Transaction', icon: 'wallet',   view: 'finance' },
    habit:       { label: 'Habitude',    icon: 'repeat',   view: 'habits' },
    event:       { label: 'Événement',   icon: 'calendar', view: 'calendar' },
    domain:      { label: 'Domaine',     icon: 'circle',   view: 'settings' }
  };

  function push(out, kind, id, title, subtitle, query, boost, extra) {
    var score = L.util.fuzzy(title, query);
    if (!score && subtitle) score = L.util.fuzzy(subtitle, query) * 0.55;
    if (!score) return;
    out.push(Object.assign({
      kind: kind, id: id, title: title, subtitle: subtitle || '',
      score: score + (boost || 0),
      meta: KINDS[kind]
    }, extra || {}));
  }

  var Search = {
    KINDS: KINDS,

    run: function (query, opts) {
      opts = opts || {};
      var q = String(query || '').trim();
      if (!q) return [];
      var out = [];
      var limit = opts.limit || 40;
      var only = opts.kinds || null;
      var want = function (k) { return !only || only.indexOf(k) > -1; };

      if (want('task')) {
        S().tasks.forEach(function (t) {
          var open = L.tasks.OPEN_STATUS[t.status];
          var project = t.projectId ? store.byId('projects', t.projectId) : null;
          var sub = [L.schema.label(L.schema.TASK_STATUS, t.status),
                     project ? project.name : null,
                     t.due ? 'échéance ' + D.relative(t.due, { caps: false }) : (t.date ? D.relative(t.date, { caps: false }) : null)]
            .filter(Boolean).join(' · ');
          push(out, 'task', t.id, t.title, sub, q, open ? 40 : 0, { entity: t });
        });
      }
      if (want('project')) {
        S().projects.forEach(function (p) {
          push(out, 'project', p.id, p.name, p.objective || p.description, q, 30, { entity: p });
        });
      }
      if (want('goal')) {
        S().goals.forEach(function (g) {
          var s = L.goals.summary(g);
          push(out, 'goal', g.id, g.name, s.percent + ' % · ' + L.format.quantity(s.current, g.unit) + ' / ' + L.format.quantity(g.target, g.unit), q, 25, { entity: g });
        });
      }
      if (want('note')) {
        S().notes.forEach(function (n) {
          push(out, 'note', n.id, n.title || 'Note', L.notes.excerpt(n, 80), q, 20, { entity: n });
        });
      }
      if (want('transaction')) {
        S().transactions.forEach(function (t) {
          var cat = t.categoryId ? store.byId('categories', t.categoryId) : null;
          var title = t.description || (cat ? cat.name : 'Transaction');
          push(out, 'transaction', t.id, title,
            L.format.money(t.amount) + ' · ' + D.format(t.date, 'short') + (cat ? ' · ' + cat.name : ''), q, 5, { entity: t });
        });
      }
      if (want('habit')) {
        S().habits.forEach(function (h) {
          push(out, 'habit', h.id, h.name, L.habits.targetLabel(h), q, 15, { entity: h });
        });
      }
      if (want('event')) {
        S().events.forEach(function (e) {
          push(out, 'event', e.id, e.title, D.format(e.date, 'short') + (e.allDay ? '' : ' · ' + e.start), q, 15, { entity: e });
        });
      }
      if (want('domain')) {
        S().domains.forEach(function (d) {
          push(out, 'domain', d.id, d.name, 'Domaine', q, 0, { entity: d });
        });
      }

      return out.sort(function (a, b) { return b.score - a.score; }).slice(0, limit);
    },

    /* Regroupement pour l'écran de recherche. */
    grouped: function (query, opts) {
      var res = Search.run(query, Object.assign({ limit: 120 }, opts || {}));
      var map = {};
      res.forEach(function (r) { (map[r.kind] || (map[r.kind] = [])).push(r); });
      return Object.keys(map).map(function (k) {
        return { kind: k, label: KINDS[k].label, items: map[k] };
      }).sort(function (a, b) { return b.items.length - a.items.length; });
    }
  };

  L.search = Search;
})(window.LifeOS = window.LifeOS || {});
