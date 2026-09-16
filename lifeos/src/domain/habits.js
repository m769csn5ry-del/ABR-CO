/* ==========================================================================
   LifeOS — habitudes
   Quatre formes possibles : fait/pas fait, quantité, durée, heure. Le suivi
   est un simple journal { habitId: { jour: valeur } } — assez souple pour
   « 8 h de sommeil » comme pour « se coucher avant 23 h 30 ».
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var H = {
    all: function (withArchived) {
      return S().habits.filter(function (h) { return withArchived || !h.archived; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    },
    get: function (id) { return store.byId('habits', id); },

    create: function (patch) {
      var h = make.habit(patch || {});
      store.update(function (s) { s.habits.push(h); }, 'Habitude créée');
      L.notify && L.notify.reschedule();
      return h;
    },
    save: function (id, patch) {
      var out = null;
      store.update(function (s) { s.habits.forEach(function (h) { if (h.id === id) out = Object.assign(h, patch); }); }, 'Habitude modifiée');
      L.notify && L.notify.reschedule();
      return out;
    },
    remove: function (id) {
      store.update(function (s) {
        s.habits = s.habits.filter(function (h) { return h.id !== id; });
        delete s.habitLogs[id];
      }, 'Habitude supprimée');
    },

    /* --- calendrier de l'habitude --- */
    isScheduled: function (habit, isoDate) {
      if (habit.archived) return false;
      if (habit.perWeek) return true;   // souple : n fois dans la semaine
      return (habit.days || []).indexOf(D.dow(isoDate)) > -1;
    },

    valueOn: function (habit, isoDate) {
      var log = S().habitLogs[habit.id];
      if (!log) return null;
      var v = log[isoDate];
      return v === undefined ? null : v;
    },

    /* Réussie ? La règle dépend du sens : « au moins » ou « au plus ». */
    isDone: function (habit, isoDate) {
      var v = H.valueOn(habit, isoDate);
      if (v === null || v === undefined || v === 0 || v === '') return false;
      if (habit.kind === 'check') return !!v;
      if (habit.kind === 'time') {
        var got = D.toMinutes(v), target = D.toMinutes(habit.target);
        if (got === null || target === null) return !!v;
        /* Une heure de coucher après minuit compte pour la nuit précédente. */
        if (habit.direction === 'at_most') return got <= target || got < 240;
        return got >= target;
      }
      var n = Number(v) || 0, t = Number(habit.target) || 0;
      return habit.direction === 'at_most' ? n <= t : n >= t;
    },

    ratio: function (habit, isoDate) {
      var v = H.valueOn(habit, isoDate);
      if (v === null) return 0;
      if (habit.kind === 'check') return v ? 1 : 0;
      if (habit.kind === 'time') return H.isDone(habit, isoDate) ? 1 : 0.4;
      var n = Number(v) || 0, t = Number(habit.target) || 1;
      if (habit.direction === 'at_most') return n <= t ? 1 : L.util.clamp(t / Math.max(n, 1), 0, 1);
      return L.util.clamp(n / t, 0, 1);
    },

    /* --- écriture du journal --- */
    log: function (habitId, isoDate, value) {
      store.update(function (s) {
        var log = s.habitLogs[habitId] || (s.habitLogs[habitId] = {});
        if (value === null || value === undefined || value === '') delete log[isoDate];
        else log[isoDate] = value;
      });
    },

    toggle: function (habitId, isoDate) {
      var h = H.get(habitId);
      if (!h) return;
      var day = isoDate || D.today();
      if (h.kind === 'check') {
        H.log(habitId, day, H.valueOn(h, day) ? null : 1);
      } else {
        /* Pour une quantité ou une durée, un appui vaut « objectif atteint ». */
        H.log(habitId, day, H.isDone(h, day) ? null : h.target);
      }
    },

    /* --- régularité --- */
    streak: function (habit) {
      var today = D.today();
      /* Le jour en cours ne casse pas la série tant qu'il n'est pas fini. */
      var from = (H.isScheduled(habit, today) && !H.isDone(habit, today)) ? D.addDays(today, -1) : today;
      var current = 0;
      for (var i = 0; i < 400; i++) {
        var d = D.addDays(from, -i);
        if (!H.isScheduled(habit, d)) continue;
        if (!H.isDone(habit, d)) break;
        current++;
      }
      var best = current, run = 0;
      for (var j = 365; j >= 0; j--) {
        var dd = D.addDays(today, -j);
        if (!H.isScheduled(habit, dd)) continue;
        if (H.isDone(habit, dd)) { run++; if (run > best) best = run; }
        else run = 0;
      }
      return { current: current, best: best };
    },

    rate: function (habit, days) {
      var n = days || 30, done = 0, planned = 0;
      for (var i = 0; i < n; i++) {
        var d = D.addDays(D.today(), -i);
        if (!H.isScheduled(habit, d)) continue;
        planned++;
        if (H.isDone(habit, d)) done++;
      }
      return { done: done, planned: planned, ratio: planned ? done / planned : 0 };
    },

    weekProgress: function (habit, isoDate) {
      var start = D.startOfWeek(isoDate || D.today(), S().settings.firstDayOfWeek);
      var days = D.range(start, D.addDays(start, 6));
      var done = 0, planned = 0;
      days.forEach(function (d) {
        if (H.isScheduled(habit, d)) planned++;
        if (H.isDone(habit, d)) done++;
      });
      var target = habit.perWeek || planned;
      return { days: days, done: done, planned: planned, target: target, ratio: target ? L.util.clamp(done / target, 0, 1) : 0 };
    },

    series: function (habit, days) {
      var out = [], n = days || 30;
      for (var i = n - 1; i >= 0; i--) {
        var d = D.addDays(D.today(), -i);
        out.push({
          date: d,
          scheduled: H.isScheduled(habit, d),
          value: H.valueOn(habit, d),
          done: H.isDone(habit, d),
          ratio: H.ratio(habit, d)
        });
      }
      return out;
    },

    /* Les habitudes du jour, dans l'ordre d'affichage de l'accueil. */
    today: function (isoDate) {
      var day = isoDate || D.today();
      return H.all().filter(function (h) { return H.isScheduled(h, day); }).map(function (h) {
        return {
          habit: h, date: day,
          value: H.valueOn(h, day),
          done: H.isDone(h, day),
          ratio: H.ratio(h, day),
          streak: H.streak(h).current
        };
      });
    },

    summary: function (habit) {
      var streak = H.streak(habit);
      var r30 = H.rate(habit, 30), r7 = H.rate(habit, 7);
      var week = H.weekProgress(habit);
      return {
        habit: habit,
        streak: streak.current, best: streak.best,
        rate30: r30.ratio, rate7: r7.ratio,
        week: week,
        doneToday: H.isDone(habit, D.today()),
        scheduledToday: H.isScheduled(habit, D.today()),
        trend: r7.ratio - r30.ratio
      };
    },

    /* Part des habitudes du jour déjà tenues : une seule valeur pour l'accueil. */
    dayCompletion: function (isoDate) {
      var list = H.today(isoDate);
      if (!list.length) return { done: 0, total: 0, ratio: 1 };
      var done = list.filter(function (x) { return x.done; }).length;
      return { done: done, total: list.length, ratio: done / list.length };
    },

    label: function (habit, value) {
      if (value === null || value === undefined) return '—';
      if (habit.kind === 'check') return value ? 'Fait' : '—';
      if (habit.kind === 'time') return String(value);
      if (habit.kind === 'duration') return D.duration(Number(value));
      return L.format.quantity(value, habit.unit);
    },

    targetLabel: function (habit) {
      if (habit.kind === 'check') return 'Fait';
      if (habit.kind === 'time') return (habit.direction === 'at_most' ? 'avant ' : 'à partir de ') + habit.target;
      var v = habit.kind === 'duration' ? D.duration(Number(habit.target)) : L.format.quantity(habit.target, habit.unit);
      return (habit.direction === 'at_most' ? 'max ' : '') + v;
    }
  };

  L.habits = H;
})(window.LifeOS = window.LifeOS || {});
