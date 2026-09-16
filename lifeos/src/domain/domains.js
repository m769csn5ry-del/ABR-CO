/* ==========================================================================
   LifeOS — domaines de vie
   Huit domaines sont proposés au départ ; aucun n'est imposé. On en ajoute,
   on les renomme, on change l'icône, la couleur, l'ordre, on les supprime.
   Supprimer un domaine ne supprime jamais ce qu'il contenait.
   ========================================================================== */
(function (L) {
  'use strict';

  var make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var Dm = {
    all: function () {
      return S().domains.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    },
    get: function (id) { return store.byId('domains', id); },
    name: function (id) { var d = Dm.get(id); return d ? d.name : null; },
    color: function (id) { var d = Dm.get(id); return d ? d.color : 'var(--ink-4)'; },

    create: function (patch) {
      var d = make.domain(Object.assign({ order: S().domains.length }, patch || {}));
      store.update(function (s) { s.domains.push(d); }, 'Domaine ajouté');
      return d;
    },
    save: function (id, patch) {
      store.update(function (s) { s.domains.forEach(function (d) { if (d.id === id) Object.assign(d, patch); }); }, 'Domaine modifié');
    },
    remove: function (id) {
      store.update(function (s) {
        s.domains = s.domains.filter(function (d) { return d.id !== id; });
        ['tasks', 'projects', 'habits', 'events', 'goals'].forEach(function (col) {
          s[col].forEach(function (x) { if (x.domainId === id) x.domainId = null; });
        });
      }, 'Domaine supprimé');
    },
    reorder: function (ids) {
      store.update(function (s) {
        ids.forEach(function (id, i) {
          s.domains.forEach(function (d) { if (d.id === id) d.order = i; });
        });
      });
    },

    /* Poids réel d'un domaine : ce qu'il reste à faire et ce qui a été fait. */
    summary: function (id) {
      var tasks = S().tasks.filter(function (t) { return t.domainId === id; });
      var open = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
      return {
        domain: Dm.get(id),
        tasks: tasks.length,
        open: open.length,
        minutes: L.util.sum(open, function (t) { return t.estimate || 0; }),
        projects: S().projects.filter(function (p) { return p.domainId === id && p.status !== 'done'; }).length,
        habits: S().habits.filter(function (h) { return h.domainId === id && !h.archived; }).length
      };
    },

    ICONS: ['circle', 'user', 'book', 'briefcase', 'wallet', 'activity', 'car', 'folder',
            'sparkle', 'home', 'target', 'repeat', 'note', 'leaf', 'moon', 'sun', 'phone', 'chart'],
    COLORS: ['#8A8F98', '#5B7FC7', '#3F8F7A', '#A9761A', '#C2533F', '#7A5BC7', '#2F7FB5', '#B5762F', '#C2417F', '#4B5563']
  };

  L.domains = Dm;
})(window.LifeOS = window.LifeOS || {});
