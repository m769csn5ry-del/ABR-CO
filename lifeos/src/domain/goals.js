/* ==========================================================================
   LifeOS — objectifs
   Un objectif n'est pas une case à cocher : il connaît sa source de valeur
   (saisie manuelle, épargne enregistrée, tâches liées, habitude, projet),
   son rythme nécessaire et son retard éventuel. C'est ce qui permet au
   planning et à l'assistant de faire remonter les bonnes tâches.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var G = {
    all: function () { return S().goals; },
    get: function (id) { return store.byId('goals', id); },
    active: function () { return S().goals.filter(function (g) { return g.status === 'active'; }); },

    create: function (patch) {
      var goal = make.goal(patch || {});
      store.update(function (s) { s.goals.unshift(goal); }, 'Objectif créé');
      return goal;
    },

    save: function (id, patch) {
      var out = null;
      store.update(function (s) {
        s.goals.forEach(function (g) {
          if (g.id !== id) return;
          /* Toute valeur saisie à la main laisse une trace : la courbe de
             progression a besoin d'un historique. */
          if (patch.current !== undefined && patch.current !== g.current) {
            g.checkpoints = (g.checkpoints || []).concat([{ date: D.today(), value: patch.current }]).slice(-200);
          }
          out = Object.assign(g, patch, { updatedAt: Date.now() });
        });
      }, 'Objectif modifié');
      return out;
    },

    remove: function (id) {
      store.update(function (s) {
        s.goals = s.goals.filter(function (g) { return g.id !== id; });
        s.tasks.forEach(function (t) { if (t.goalId === id) t.goalId = null; });
        s.projects.forEach(function (p) { if (p.goalId === id) p.goalId = null; });
        s.transactions.forEach(function (t) { if (t.goalId === id) t.goalId = null; });
      }, 'Objectif supprimé');
    },

    /* --- valeur courante, selon la source --- */
    value: function (goal) {
      var src = goal.source || { type: 'manual' };
      switch (src.type) {
        case 'savings': {
          var seen = {}, total = 0;
          S().transactions.forEach(function (t) {
            if (t.date < goal.startDate) return;
            var linked = (t.goalId === goal.id) ||
              (src.accountId && t.toAccountId === src.accountId && (t.type === 'saving' || t.type === 'invest'));
            if (!linked || seen[t.id]) return;
            seen[t.id] = 1;
            total += (t.type === 'expense') ? -t.amount : t.amount;
          });
          return (goal.start || 0) + total;
        }
        case 'tasks': {
          var linked = G.linkedTasks(goal);
          if (!linked.length) return goal.start || 0;
          var done = linked.filter(function (t) { return t.status === 'done'; }).length;
          if (goal.unit === '%') return Math.round(done / linked.length * 100);
          return (goal.start || 0) + done;
        }
        case 'habit': {
          var log = S().habitLogs[src.habitId] || {};
          var sum = 0, count = 0;
          Object.keys(log).forEach(function (day) {
            if (day < goal.startDate) return;
            if (goal.targetDate && day > goal.targetDate) return;
            sum += Number(log[day]) || 0; count++;
          });
          return (goal.start || 0) + (src.mode === 'count' ? count : sum);
        }
        case 'project': {
          var p = store.byId('projects', src.projectId);
          if (!p) return goal.current || 0;
          return Math.round(L.projects.progress(p) * 100);
        }
        default:
          return goal.current || 0;
      }
    },

    linkedTasks: function (goal) {
      var ids = {};
      (goal.projectIds || []).forEach(function (id) { ids[id] = 1; });
      S().projects.forEach(function (p) { if (p.goalId === goal.id) ids[p.id] = 1; });
      return S().tasks.filter(function (t) {
        return t.goalId === goal.id || (t.projectId && ids[t.projectId]);
      });
    },

    linkedProjects: function (goal) {
      return S().projects.filter(function (p) {
        return p.goalId === goal.id || (goal.projectIds || []).indexOf(p.id) > -1;
      });
    },

    /* --- tableau de bord d'un objectif --- */
    summary: function (goal) {
      var current = G.value(goal);
      var start = goal.start || 0;
      var target = goal.target || 0;
      var span = target - start;
      var progress = span === 0 ? (current >= target ? 1 : 0) : L.util.clamp((current - start) / span, 0, 1);
      var remaining = Math.max(0, target - current);

      var today = D.today();
      var daysLeft = goal.targetDate ? D.diffDays(today, goal.targetDate) : null;
      var daysTotal = goal.targetDate ? Math.max(1, D.diffDays(goal.startDate || today, goal.targetDate)) : null;
      var elapsed = daysTotal ? L.util.clamp(D.diffDays(goal.startDate || today, today) / daysTotal, 0, 1) : null;

      var perDay = (daysLeft && daysLeft > 0) ? remaining / daysLeft : null;
      var weeksLeft = daysLeft ? daysLeft / 7 : null;
      var monthsLeft = daysLeft ? daysLeft / 30.44 : null;

      var gap = elapsed === null ? 0 : progress - elapsed;
      var done = progress >= 1 || goal.status === 'done';

      return {
        goal: goal,
        current: current, start: start, target: target,
        unit: goal.unit || '',
        progress: progress,
        percent: Math.round(progress * 100),
        remaining: remaining,
        daysLeft: daysLeft,
        daysTotal: daysTotal,
        expected: elapsed,
        gap: gap,
        behind: !done && elapsed !== null && gap < -0.05,
        ahead: !done && elapsed !== null && gap > 0.05,
        late: !done && daysLeft !== null && daysLeft < 0,
        done: done,
        perDay: perDay,
        perWeek: (weeksLeft && weeksLeft > 0) ? remaining / weeksLeft : null,
        perMonth: (monthsLeft && monthsLeft > 0) ? remaining / monthsLeft : null,
        /* À ce rythme, l'objectif tombe quand ? */
        projection: G.projection(goal, current)
      };
    },

    /* Rythme constaté depuis le départ, projeté jusqu'à la cible. */
    projection: function (goal, current) {
      var today = D.today();
      var days = Math.max(1, D.diffDays(goal.startDate || today, today));
      var gained = (current === undefined ? G.value(goal) : current) - (goal.start || 0);
      if (gained <= 0) return null;
      var perDay = gained / days;
      var remaining = Math.max(0, (goal.target || 0) - (current === undefined ? G.value(goal) : current));
      if (perDay <= 0) return null;
      var needed = Math.ceil(remaining / perDay);
      if (needed > 3650) return null;
      return { date: D.addDays(today, needed), days: needed, perDay: perDay };
    },

    /* Phrase prête à afficher : « 3 000 € restants, soit 188 € par mois ». */
    advice: function (goal) {
      var s = G.summary(goal);
      if (s.done) return 'Objectif atteint.';
      var unit = goal.unit || '';
      var rest = L.format.quantity(s.remaining, unit);
      if (!s.daysLeft) return rest + ' restants. Fixe une date cible pour connaître le rythme à tenir.';
      if (s.daysLeft < 0) return rest + ' restants — la date cible est passée de ' + Math.abs(s.daysLeft) + ' jours.';
      var perMonth = s.perMonth ? L.format.quantity(L.util.round(s.perMonth, 2), unit) + ' par mois' : '';
      var perWeek = s.perWeek ? L.format.quantity(L.util.round(s.perWeek, 2), unit) + ' par semaine' : '';
      return rest + ' en ' + s.daysLeft + ' jours — ' + (perMonth || perWeek) +
        (perMonth && perWeek ? ' (' + perWeek + ')' : '') + '.';
    },

    behind: function () {
      return G.active().map(G.summary).filter(function (s) { return s.behind || s.late; });
    },

    /* Contribution d'une tâche : sert à expliquer pourquoi elle remonte. */
    forTask: function (task) {
      if (task.goalId) return G.get(task.goalId);
      if (task.projectId) {
        var p = store.byId('projects', task.projectId);
        if (p && p.goalId) return G.get(p.goalId);
        if (p) {
          var byList = S().goals.filter(function (g) { return (g.projectIds || []).indexOf(p.id) > -1; });
          if (byList.length) return byList[0];
        }
      }
      return null;
    }
  };

  L.goals = G;
})(window.LifeOS = window.LifeOS || {});
