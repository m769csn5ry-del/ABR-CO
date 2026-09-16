/* ==========================================================================
   LifeOS — projets
   L'avancement n'est jamais saisi à la main : il vient des tâches et des
   étapes. Un projet dépense aussi : les transactions qui lui sont liées
   alimentent son budget.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var P = {
    all: function () { return S().projects; },
    get: function (id) { return store.byId('projects', id); },
    active: function () {
      return S().projects.filter(function (p) { return p.status === 'active' || p.status === 'planned'; });
    },

    create: function (patch) {
      var p = make.project(patch || {});
      store.update(function (s) { s.projects.unshift(p); }, 'Projet créé');
      return p;
    },

    save: function (id, patch) {
      var out = null;
      store.update(function (s) {
        s.projects.forEach(function (p) {
          if (p.id === id) out = Object.assign(p, patch, { updatedAt: Date.now() });
        });
      }, 'Projet modifié');
      return out;
    },

    remove: function (id, withTasks) {
      store.update(function (s) {
        s.projects = s.projects.filter(function (p) { return p.id !== id; });
        if (withTasks) s.tasks = s.tasks.filter(function (t) { return t.projectId !== id; });
        else s.tasks.forEach(function (t) { if (t.projectId === id) t.projectId = null; });
        s.transactions.forEach(function (t) { if (t.projectId === id) t.projectId = null; });
        s.notes.forEach(function (n) {
          if (n.links && n.links.projectIds) n.links.projectIds = n.links.projectIds.filter(function (x) { return x !== id; });
        });
        s.goals.forEach(function (g) {
          if (g.projectIds) g.projectIds = g.projectIds.filter(function (x) { return x !== id; });
        });
      }, 'Projet supprimé');
    },

    tasks: function (id, opts) {
      return L.tasks.filter(Object.assign({ projectId: id }, opts || {}));
    },

    /* Avancement : les tâches pèsent selon leur durée estimée, les étapes
       comptent pour un tiers quand il y en a. */
    progress: function (project) {
      var tasks = S().tasks.filter(function (t) {
        return t.projectId === project.id && t.status !== 'cancelled';
      });
      var weightDone = 0, weightAll = 0;
      tasks.forEach(function (t) {
        var w = Math.max(10, t.estimate || 30);
        weightAll += w;
        if (t.status === 'done') weightDone += w;
        else if ((t.subtasks || []).length) {
          var done = t.subtasks.filter(function (s) { return s.done; }).length;
          weightDone += w * (done / t.subtasks.length) * 0.6;
        }
      });
      var taskRatio = weightAll ? weightDone / weightAll : null;

      var ms = project.milestones || [];
      var msRatio = ms.length ? ms.filter(function (m) { return m.done; }).length / ms.length : null;

      if (taskRatio === null && msRatio === null) return project.status === 'done' ? 1 : 0;
      if (taskRatio === null) return msRatio;
      if (msRatio === null) return taskRatio;
      return taskRatio * 0.65 + msRatio * 0.35;
    },

    spent: function (project) {
      return L.util.sum(S().transactions.filter(function (t) {
        return t.projectId === project.id && (t.type === 'expense' || t.type === 'invest');
      }), function (t) { return t.amount; });
    },

    summary: function (project) {
      var tasks = S().tasks.filter(function (t) { return t.projectId === project.id; });
      var open = tasks.filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; });
      var progress = P.progress(project);
      var spent = P.spent(project);
      var nextMs = (project.milestones || []).filter(function (m) { return !m.done; })
        .sort(function (a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; })[0] || null;
      var remainingMinutes = L.util.sum(open, function (t) { return t.estimate || 0; });
      var daysLeft = project.due ? D.diffDays(D.today(), project.due) : null;

      return {
        project: project,
        progress: progress,
        percent: Math.round(progress * 100),
        tasksTotal: tasks.length,
        tasksOpen: open.length,
        tasksDone: tasks.filter(function (t) { return t.status === 'done'; }).length,
        overdue: open.filter(L.tasks.isOverdue).length,
        remainingMinutes: remainingMinutes,
        spent: spent,
        budget: project.budget,
        budgetLeft: project.budget === null || project.budget === undefined ? null : project.budget - spent,
        nextMilestone: nextMs,
        daysLeft: daysLeft,
        /* Alerte : reste-t-il assez de jours ouvrés pour la charge restante ? */
        atRisk: daysLeft !== null && daysLeft >= 0 && remainingMinutes > Math.max(1, daysLeft) * 120,
        goal: project.goalId ? L.goals.get(project.goalId) : null
      };
    },

    /* --- étapes --- */
    addMilestone: function (id, title, due) {
      var ms = { id: L.util.uid('ms'), title: title || 'Étape', due: due || null, done: false };
      store.update(function (s) {
        var p = s.projects.filter(function (x) { return x.id === id; })[0];
        if (p) p.milestones.push(ms);
      }, 'Étape ajoutée');
      return ms;
    },
    toggleMilestone: function (id, msId) {
      store.update(function (s) {
        var p = s.projects.filter(function (x) { return x.id === id; })[0];
        if (p) (p.milestones || []).forEach(function (m) { if (m.id === msId) m.done = !m.done; });
      });
    },
    removeMilestone: function (id, msId) {
      store.update(function (s) {
        var p = s.projects.filter(function (x) { return x.id === id; })[0];
        if (p) p.milestones = p.milestones.filter(function (m) { return m.id !== msId; });
      });
    }
  };

  L.projects = P;
})(window.LifeOS = window.LifeOS || {});
