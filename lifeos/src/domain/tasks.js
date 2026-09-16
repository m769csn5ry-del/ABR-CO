/* ==========================================================================
   LifeOS — tâches
   Tout ce qui touche à une tâche passe par ici : création, filtres, tri,
   report, récurrence, achèvement. Les écrans n'écrivent jamais dans l'état
   directement, sinon la progression des projets et des objectifs cesserait
   de suivre.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var OPEN = { todo: 1, doing: 1, postponed: 1 };

  var T = {
    OPEN_STATUS: OPEN,

    all: function () { return S().tasks; },
    get: function (id) { return store.byId('tasks', id); },
    isOpen: function (t) { return !!(t && OPEN[t.status]); },

    /* --- création / édition --- */
    create: function (patch) {
      var task = make.task(patch || {});
      if (!task.title.trim()) task.title = 'Nouvelle tâche';
      store.update(function (s) { s.tasks.unshift(task); }, 'Tâche ajoutée');
      L.notify && L.notify.reschedule();
      return task;
    },

    save: function (id, patch) {
      var updated = null;
      store.update(function (s) {
        for (var i = 0; i < s.tasks.length; i++) {
          if (s.tasks[i].id === id) {
            updated = Object.assign(s.tasks[i], patch, { updatedAt: Date.now() });
            break;
          }
        }
      }, 'Tâche modifiée');
      L.notify && L.notify.reschedule();
      return updated;
    },

    remove: function (id) {
      store.update(function (s) {
        s.tasks = s.tasks.filter(function (t) { return t.id !== id; });
        /* Les notes gardent des liens vers les tâches : on les nettoie. */
        s.notes.forEach(function (n) {
          if (n.links && n.links.taskIds) n.links.taskIds = n.links.taskIds.filter(function (x) { return x !== id; });
        });
        Object.keys(s.plans).forEach(function (day) {
          var p = s.plans[day];
          if (p && p.blocks) p.blocks = p.blocks.filter(function (b) { return b.refId !== id; });
        });
      }, 'Tâche supprimée');
    },

    duplicate: function (id) {
      var t = T.get(id);
      if (!t) return null;
      var copy = make.task(Object.assign(L.util.clone(t), {
        id: null, status: 'todo', completedAt: null, actual: 0,
        title: t.title + ' (copie)', createdAt: Date.now(), order: Date.now(),
        subtasks: (t.subtasks || []).map(function (s) { return { id: L.util.uid('sub'), title: s.title, done: false }; })
      }));
      copy.id = L.util.uid('tsk');
      store.update(function (s) { s.tasks.unshift(copy); }, 'Tâche dupliquée');
      return copy;
    },

    /* --- statut ---
       Terminer une tâche récurrente crée l'occurrence suivante : la série
       continue sans intervention, et l'historique des faites reste intact. */
    setStatus: function (id, status) {
      var spawned = null;
      store.update(function (s) {
        var t = null;
        for (var i = 0; i < s.tasks.length; i++) if (s.tasks[i].id === id) { t = s.tasks[i]; break; }
        if (!t) return;
        var was = t.status;
        t.status = status;
        t.updatedAt = Date.now();

        if (status === 'done') {
          t.completedAt = Date.now();
          if (!t.actual) t.actual = t.estimate || 0;
          (t.subtasks || []).forEach(function (sub) { sub.done = true; });
          if (t.recurrence && t.recurrence.freq) {
            var anchor = t.date || t.due || D.today();
            var next = D.nextOccurrence(t.recurrence, D.addDays(anchor, 1), t.recurrence.start || anchor);
            if (next) {
              spawned = make.task(Object.assign(L.util.clone(t), {
                id: L.util.uid('tsk'), status: 'todo', completedAt: null, actual: 0,
                date: t.date ? next : null,
                due: t.due ? D.addDays(next, D.diffDays(anchor, t.due)) : null,
                seriesId: t.seriesId || t.id,
                createdAt: Date.now(), updatedAt: Date.now(),
                subtasks: (t.subtasks || []).map(function (sub) {
                  return { id: L.util.uid('sub'), title: sub.title, done: false };
                })
              }));
              s.tasks.unshift(spawned);
            }
          }
        } else if (was === 'done') {
          t.completedAt = null;
        }
      }, status === 'done' ? 'Tâche terminée' : 'Statut modifié');
      L.notify && L.notify.reschedule();
      return spawned;
    },

    toggle: function (id) {
      var t = T.get(id);
      if (!t) return;
      return T.setStatus(id, t.status === 'done' ? 'todo' : 'done');
    },

    postpone: function (id, toISO) {
      var t = T.get(id);
      if (!t) return;
      var target = toISO || D.addDays(t.date || D.today(), 1);
      T.save(id, { date: target, status: t.status === 'done' ? 'todo' : 'postponed' });
      return target;
    },

    /* --- sous-tâches --- */
    addSubtask: function (id, title) {
      var sub = make.subtask(title);
      store.update(function (s) {
        var t = s.tasks.filter(function (x) { return x.id === id; })[0];
        if (t) { t.subtasks.push(sub); t.updatedAt = Date.now(); }
      });
      return sub;
    },
    toggleSubtask: function (id, subId) {
      store.update(function (s) {
        var t = s.tasks.filter(function (x) { return x.id === id; })[0];
        if (!t) return;
        (t.subtasks || []).forEach(function (sub) { if (sub.id === subId) sub.done = !sub.done; });
        /* Toutes les sous-tâches faites : la tâche bascule d'elle-même. */
        if (t.subtasks.length && t.subtasks.every(function (x) { return x.done; }) && OPEN[t.status]) {
          t.status = 'done'; t.completedAt = Date.now();
          if (!t.actual) t.actual = t.estimate || 0;
        } else if (t.status === 'done' && t.subtasks.some(function (x) { return !x.done; })) {
          t.status = 'doing'; t.completedAt = null;
        }
        t.updatedAt = Date.now();
      });
    },
    removeSubtask: function (id, subId) {
      store.update(function (s) {
        var t = s.tasks.filter(function (x) { return x.id === id; })[0];
        if (t) t.subtasks = t.subtasks.filter(function (x) { return x.id !== subId; });
      });
    },

    /* --- sélections --- */
    filter: function (opts) {
      opts = opts || {};
      var list = S().tasks.slice();

      if (opts.status && opts.status !== 'all') {
        if (opts.status === 'open') list = list.filter(function (t) { return OPEN[t.status]; });
        else list = list.filter(function (t) { return t.status === opts.status; });
      }
      if (opts.domainId) list = list.filter(function (t) { return t.domainId === opts.domainId; });
      if (opts.projectId) list = list.filter(function (t) { return t.projectId === opts.projectId; });
      if (opts.goalId) list = list.filter(function (t) { return t.goalId === opts.goalId; });
      if (opts.tag) list = list.filter(function (t) { return (t.tags || []).indexOf(opts.tag) > -1; });
      if (opts.priority !== undefined && opts.priority !== null && opts.priority !== 'all') {
        list = list.filter(function (t) { return t.priority === +opts.priority; });
      }
      if (opts.date) list = list.filter(function (t) { return t.date === opts.date; });
      if (opts.from) list = list.filter(function (t) { return (t.date || t.due) >= opts.from; });
      if (opts.to) list = list.filter(function (t) { return (t.date || t.due) <= opts.to; });
      if (opts.overdue) list = list.filter(function (t) { return T.isOverdue(t); });
      if (opts.query) {
        var q = L.util.fold(opts.query);
        list = list.filter(function (t) {
          return L.util.fold(t.title).indexOf(q) > -1 ||
                 L.util.fold(t.notes).indexOf(q) > -1 ||
                 (t.tags || []).some(function (tag) { return L.util.fold(tag).indexOf(q) > -1; });
        });
      }
      return T.sort(list, opts.sort);
    },

    sort: function (list, mode) {
      switch (mode) {
        case 'priority':
          return L.util.sortBy(list, function (t) { return t.priority * 1e12 + (t.order || 0); });
        case 'due':
          return list.slice().sort(function (a, b) {
            var da = a.due || a.date || '9999', db = b.due || b.date || '9999';
            return da === db ? a.priority - b.priority : (da < db ? -1 : 1);
          });
        case 'created':
          return L.util.sortBy(list, function (t) { return t.createdAt; }, 'desc');
        case 'estimate':
          return L.util.sortBy(list, function (t) { return t.estimate || 0; }, 'desc');
        case 'alpha':
          return list.slice().sort(function (a, b) { return L.util.fold(a.title) < L.util.fold(b.title) ? -1 : 1; });
        case 'score':
          return L.util.sortBy(list, function (t) { return T.score(t); }, 'desc');
        default: /* « intelligent » : l'urgence d'abord, la priorité ensuite */
          return list.slice().sort(function (a, b) {
            var oa = OPEN[a.status] ? 0 : 1, ob = OPEN[b.status] ? 0 : 1;
            if (oa !== ob) return oa - ob;
            return T.score(b) - T.score(a);
          });
      }
    },

    /* Pour un jour donné : ce qui est posé ce jour-là, plus les retards
       si c'est aujourd'hui (rien ne doit disparaître en silence). */
    forDate: function (isoDate, opts) {
      opts = opts || {};
      var list = S().tasks.filter(function (t) {
        if (t.date === isoDate) return true;
        if (opts.includeDue !== false && t.due === isoDate && OPEN[t.status]) return true;
        return false;
      });
      if (opts.includeOverdue && isoDate === D.today()) {
        S().tasks.forEach(function (t) {
          if (!OPEN[t.status]) return;
          if (list.indexOf(t) > -1) return;
          if (T.isOverdue(t)) list.push(t);
        });
      }
      return T.sort(list, opts.sort || 'smart');
    },

    isOverdue: function (t) {
      if (!OPEN[t.status]) return false;
      var today = D.today();
      if (t.due && t.due < today) return true;
      if (!t.due && t.date && t.date < today) return true;
      return false;
    },

    overdue: function () { return T.sort(S().tasks.filter(T.isOverdue), 'due'); },

    dueWithin: function (days) {
      var today = D.today(), limit = D.addDays(today, days);
      return T.sort(S().tasks.filter(function (t) {
        return OPEN[t.status] && t.due && t.due >= today && t.due <= limit;
      }), 'due');
    },

    inbox: function () {
      return T.sort(S().tasks.filter(function (t) {
        return OPEN[t.status] && !t.date && !t.due;
      }), 'smart');
    },

    /* --- score d'importance ---
       Sert au planning automatique, au mode « Je suis perdu » et au tri
       intelligent. Une seule formule pour toute l'app : ce qui remonte
       ici remonte partout. */
    score: function (t, refISO) {
      if (!OPEN[t.status]) return -1;
      var today = refISO || D.today();
      var s = L.schema.priority(t.priority).weight;

      if (t.due) {
        var left = D.diffDays(today, t.due);
        if (left < 0) s += 45 + Math.min(20, -left * 2);       // en retard
        else if (left === 0) s += 40;
        else if (left <= 2) s += 30;
        else if (left <= 7) s += 18;
        else if (left <= 14) s += 8;
      }
      if (t.date === today) s += 22;
      else if (t.date && t.date < today) s += 26;
      if (t.status === 'doing') s += 12;
      if (t.status === 'postponed') s += 6;

      /* Une tâche qui fait avancer un objectif en retard passe devant. */
      if (t.goalId || t.projectId) {
        var goal = t.goalId ? store.byId('goals', t.goalId) : null;
        if (!goal && t.projectId) {
          var prj = store.byId('projects', t.projectId);
          if (prj && prj.goalId) goal = store.byId('goals', prj.goalId);
        }
        if (goal && goal.status === 'active' && L.goals) {
          var g = L.goals.summary(goal);
          s += g.behind ? 14 : 6;
        } else if (t.projectId) s += 4;
      }

      var age = (Date.now() - (t.createdAt || Date.now())) / 86400000;
      s += Math.min(10, age * 0.6);                              // ancienneté
      if ((t.subtasks || []).some(function (x) { return x.done; })) s += 5;  // déjà entamée
      return Math.round(s);
    },

    /* Pourquoi cette tâche remonte : phrase courte affichée dans le planning
       et par l'assistant. */
    reason: function (t) {
      var today = D.today();
      if (t.due && t.due < today) return 'En retard de ' + Math.abs(D.diffDays(today, t.due)) + ' ' + L.util.plural(Math.abs(D.diffDays(today, t.due)), 'jour');
      if (t.due === today) return "Date limite aujourd'hui";
      if (t.due && D.diffDays(today, t.due) <= 2) return 'Échéance ' + D.relative(t.due, { caps: false });
      if (t.priority === 0) return 'Marquée urgente';
      if (t.status === 'doing') return 'Déjà commencée';
      if (t.date === today) return 'Prévue aujourd\'hui';
      if (t.goalId || t.projectId) {
        var p = t.projectId ? store.byId('projects', t.projectId) : null;
        if (p) return 'Fait avancer « ' + p.name + ' »';
        var g = store.byId('goals', t.goalId);
        if (g) return 'Fait avancer « ' + g.name + ' »';
      }
      if (t.priority === 1) return 'Importante';
      return 'À traiter';
    },

    /* --- agrégats --- */
    stats: function (fromISO, toISO) {
      var list = S().tasks;
      var done = 0, postponed = 0, cancelled = 0, open = 0, minutes = 0;
      list.forEach(function (t) {
        var day = t.status === 'done'
          ? D.iso(new Date(t.completedAt || Date.now()))
          : (t.date || t.due);
        if (fromISO && (!day || day < fromISO)) return;
        if (toISO && (!day || day > toISO)) return;
        if (t.status === 'done') { done++; minutes += t.actual || t.estimate || 0; }
        else if (t.status === 'postponed') postponed++;
        else if (t.status === 'cancelled') cancelled++;
        else open++;
      });
      return { done: done, postponed: postponed, cancelled: cancelled, open: open, minutes: minutes };
    },

    load: function (isoDate) {
      var list = T.forDate(isoDate, { includeDue: false });
      return L.util.sum(list.filter(function (t) { return OPEN[t.status]; }), function (t) { return t.estimate || 0; });
    },

    tags: function () {
      var all = [];
      S().tasks.forEach(function (t) { all = all.concat(t.tags || []); });
      return L.util.unique(all).sort();
    }
  };

  L.tasks = T;
})(window.LifeOS = window.LifeOS || {});
