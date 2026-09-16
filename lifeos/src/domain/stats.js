/* ==========================================================================
   LifeOS — statistiques
   Rien n'est stocké ici : tout est recalculé à partir des tâches, des
   habitudes, des transactions et des objectifs réels. Un chiffre affiché
   est toujours vérifiable en ouvrant l'écran correspondant.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, store = L.store;
  function S() { return store.state; }

  var ST = {
    PERIODS: [
      { id: 'today', label: "Aujourd'hui" },
      { id: 'week',  label: 'Cette semaine' },
      { id: 'month', label: 'Ce mois' },
      { id: 'year',  label: 'Cette année' },
      { id: 'custom', label: 'Personnalisée' }
    ],

    range: function (period, custom) {
      var today = D.today();
      switch (period) {
        case 'today': return { from: today, to: today, label: "Aujourd'hui" };
        case 'week': {
          var s = D.startOfWeek(today, S().settings.firstDayOfWeek);
          return { from: s, to: D.addDays(s, 6), label: 'Semaine du ' + D.format(s, 'short') };
        }
        case 'year': return { from: D.startOfYear(today), to: D.endOfYear(today), label: 'Année ' + today.slice(0, 4) };
        case 'custom': return { from: (custom && custom.from) || D.addDays(today, -30), to: (custom && custom.to) || today, label: 'Période choisie' };
        default: {
          var m = D.startOfMonth(today);
          return { from: m, to: D.endOfMonth(today), label: D.format(m, 'month') };
        }
      }
    },

    /* --- tâches --- */
    taskDay: function (isoDate) {
      var done = 0, minutes = 0, postponed = 0;
      S().tasks.forEach(function (t) {
        if (t.status === 'done' && t.completedAt && D.iso(new Date(t.completedAt)) === isoDate) {
          done++; minutes += t.actual || t.estimate || 0;
        } else if (t.status === 'postponed' && t.date === isoDate) postponed++;
      });
      return { date: isoDate, done: done, minutes: minutes, postponed: postponed };
    },

    taskSeries: function (fromISO, toISO) {
      return D.range(fromISO, toISO).map(ST.taskDay);
    },

    /* --- temps par domaine ---
       Le temps « travaillé » vient des durées réelles (ou estimées) des
       tâches terminées : c'est la seule mesure honnête dont on dispose
       sans chronomètre. */
    byDomain: function (fromISO, toISO) {
      var map = {};
      S().tasks.forEach(function (t) {
        if (t.status !== 'done' || !t.completedAt) return;
        var day = D.iso(new Date(t.completedAt));
        if (day < fromISO || day > toISO) return;
        var key = t.domainId || '—';
        (map[key] || (map[key] = { minutes: 0, count: 0 }));
        map[key].minutes += t.actual || t.estimate || 0;
        map[key].count++;
      });
      return Object.keys(map).map(function (k) {
        var dom = store.byId('domains', k);
        return {
          id: k, name: dom ? dom.name : 'Sans domaine',
          color: dom ? dom.color : '#8A8F98',
          minutes: map[k].minutes, count: map[k].count
        };
      }).sort(function (a, b) { return b.minutes - a.minutes; });
    },

    byProject: function (fromISO, toISO) {
      var map = {};
      S().tasks.forEach(function (t) {
        if (t.status !== 'done' || !t.projectId || !t.completedAt) return;
        var day = D.iso(new Date(t.completedAt));
        if (day < fromISO || day > toISO) return;
        (map[t.projectId] || (map[t.projectId] = { minutes: 0, count: 0 }));
        map[t.projectId].minutes += t.actual || t.estimate || 0;
        map[t.projectId].count++;
      });
      return Object.keys(map).map(function (k) {
        var p = store.byId('projects', k);
        return { id: k, name: p ? p.name : '—', minutes: map[k].minutes, count: map[k].count };
      }).sort(function (a, b) { return b.minutes - a.minutes; });
    },

    /* --- habitudes --- */
    habitSeries: function (fromISO, toISO) {
      var habits = L.habits.all();
      return D.range(fromISO, toISO).map(function (d) {
        var planned = 0, done = 0;
        habits.forEach(function (h) {
          if (!L.habits.isScheduled(h, d)) return;
          planned++;
          if (L.habits.isDone(h, d)) done++;
        });
        return { date: d, planned: planned, done: done, ratio: planned ? done / planned : 0 };
      });
    },

    habitTable: function (days) {
      return L.habits.all().map(function (h) {
        var r = L.habits.rate(h, days || 30);
        var st = L.habits.streak(h);
        return { habit: h, ratio: r.ratio, done: r.done, planned: r.planned, streak: st.current, best: st.best };
      }).sort(function (a, b) { return b.ratio - a.ratio; });
    },

    /* --- vue d'ensemble --- */
    overview: function (fromISO, toISO) {
      var tasks = L.tasks.stats(fromISO, toISO);
      var money = L.finance.period(fromISO, toISO);
      var domains = ST.byDomain(fromISO, toISO);
      var habitDays = ST.habitSeries(fromISO, toISO);
      var habitRatio = habitDays.length
        ? L.util.sum(habitDays, function (d) { return d.ratio; }) / habitDays.length : 0;
      var days = Math.max(1, D.diffDays(fromISO, toISO) + 1);

      var goals = L.goals.active().map(L.goals.summary);
      var avgGoal = goals.length ? L.util.sum(goals, function (g) { return g.progress; }) / goals.length : 0;

      /* Comparaison avec la période précédente de même longueur. */
      var prevTo = D.addDays(fromISO, -1);
      var prevFrom = D.addDays(prevTo, -(days - 1));
      var prev = L.tasks.stats(prevFrom, prevTo);

      return {
        from: fromISO, to: toISO, days: days,
        tasks: tasks,
        tasksPrev: prev,
        tasksDelta: prev.done ? (tasks.done - prev.done) / prev.done : null,
        minutesPerDay: Math.round(tasks.minutes / days),
        money: money,
        domains: domains,
        habitRatio: habitRatio,
        habitDays: habitDays,
        goals: goals,
        goalsAverage: avgGoal,
        goalsBehind: goals.filter(function (g) { return g.behind || g.late; }).length,
        projects: L.projects.active().map(L.projects.summary)
      };
    },

    /* Une ligne de bilan, réutilisée par l'accueil et l'assistant. */
    weekProgress: function () {
      var start = D.startOfWeek(D.today(), S().settings.firstDayOfWeek);
      var end = D.addDays(start, 6);
      var stats = L.tasks.stats(start, D.today());
      var planned = L.util.sum(D.range(start, end), function (d) {
        return L.tasks.forDate(d, { includeDue: false }).length;
      });
      var elapsed = D.diffDays(start, D.today()) + 1;
      return {
        done: stats.done, minutes: stats.minutes, planned: planned,
        elapsed: elapsed, ratio: planned ? L.util.clamp(stats.done / Math.max(planned, 1), 0, 1) : 0,
        habits: L.util.sum(L.habits.all(), function (h) { return L.habits.weekProgress(h).ratio; }) / Math.max(1, L.habits.all().length)
      };
    }
  };

  L.stats = ST;
})(window.LifeOS = window.LifeOS || {});
