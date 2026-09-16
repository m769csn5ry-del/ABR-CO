/* ==========================================================================
   LifeOS — planification de la semaine
   Même moteur que la journée, mais à sept jours : on regarde la capacité
   réelle de chaque jour, on place les échéances avant leur date, on repère
   les objectifs qui décrochent et les journées qui vont déborder.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, store = L.store;
  function S() { return store.state; }

  var W = {
    key: function (isoDate) { return D.weekKey(isoDate || D.today()); },

    get: function (isoDate) { return S().weekPlans[W.key(isoDate)] || null; },

    build: function (anchorISO) {
      var settings = S().settings;
      var start = D.startOfWeek(anchorISO || D.today(), settings.firstDayOfWeek);
      var days = D.range(start, D.addDays(start, 6));
      var today = D.today();

      /* --- capacité réelle de chaque jour --- */
      var capacity = days.map(function (d) {
        /* La capacité d'un jour se mesure sans compter les tâches déjà
           posées à une heure : celles-ci figurent dans la charge, pas dans
           la place restante — sinon elles seraient comptées deux fois. */
        var room = L.calendar.availableMinutes(d, { tasks: false, fromNow: d === today });
        var events = L.calendar.eventsOn(d).filter(function (e) { return !e.allDay; });
        var habits = L.util.sum(L.habits.today(d).filter(function (h) { return !h.done; }),
          function (h) { return h.habit.duration || 0; });
        var isWork = (settings.day.workDays || []).indexOf(D.dow(d)) > -1;
        return {
          date: d, free: Math.max(0, room - habits), rawFree: room, habitMinutes: habits,
          events: events.length, past: d < today, workDay: isWork,
          assigned: [], assignedMinutes: 0
        };
      });

      /* --- ce qu'il y a à caser --- */
      var pool = [];
      var seen = {};
      function add(t, forced) {
        if (seen[t.id] || !L.tasks.OPEN_STATUS[t.status]) return;
        seen[t.id] = 1;
        pool.push({
          task: t, minutes: Math.max(10, t.estimate || 30),
          score: L.tasks.score(t), due: t.due || null, forced: !!forced,
          fixed: !!(t.date && t.date >= start && t.date <= days[6] && t.time)
        });
      }
      L.tasks.overdue().forEach(function (t) { add(t, true); });
      S().tasks.forEach(function (t) {
        if (!L.tasks.OPEN_STATUS[t.status]) return;
        if (t.due && t.due >= start && t.due <= days[6]) add(t, true);
        else if (t.date && t.date >= start && t.date <= days[6]) add(t, true);
      });
      L.tasks.filter({ status: 'open', sort: 'score' }).forEach(function (t) {
        if (t.date && t.date > days[6]) return;
        add(t, false);
      });

      /* Les tâches déjà posées à une heure gardent leur place. */
      pool.filter(function (p) { return p.fixed; }).forEach(function (p) {
        var slot = capacity.filter(function (c) { return c.date === p.task.date; })[0];
        if (slot) { slot.assigned.push({ id: p.task.id, minutes: p.minutes, fixed: true }); slot.assignedMinutes += p.minutes; }
      });

      /* --- répartition ---
         En retard et échéances d'abord, au plus tôt ; le reste comble les
         jours les plus creux pour éviter les journées à rallonge. */
      var placed = [], postpone = [];
      var queue = pool.filter(function (p) { return !p.fixed; })
        .sort(function (a, b) {
          var da = a.due || '9999-12-31', db = b.due || '9999-12-31';
          if (da !== db) return da < db ? -1 : 1;
          return b.score - a.score;
        });

      queue.forEach(function (p) {
        var eligible = capacity.filter(function (c) {
          if (c.past) return false;
          if (p.due && c.date > p.due) return false;
          if (p.task.date && p.task.date !== c.date && p.forced && p.task.date >= start) return c.date >= p.task.date;
          return true;
        });
        if (!eligible.length) {
          postpone.push({ task: p.task, reason: p.due && p.due < today ? 'Échéance déjà passée' : 'Aucun jour disponible avant la date limite' });
          return;
        }
        /* Jour au plus tôt qui a la place, sinon le plus creux. */
        var target = null;
        for (var i = 0; i < eligible.length; i++) {
          if (eligible[i].free - eligible[i].assignedMinutes >= p.minutes) { target = eligible[i]; break; }
        }
        if (!target) {
          /* Faute de journée qui l'accueille en entier, on accepte le jour le
             plus creux — mais seulement si la moitié de la tâche y tient.
             Entasser trois heures dans un jour qui n'en a plus une seule ne
             produit pas un planning, juste une liste de vœux. */
          var need = Math.min(p.minutes, Math.max(20, p.minutes * 0.5));
          var sorted = eligible.slice().sort(function (a, b) {
            return (b.free - b.assignedMinutes) - (a.free - a.assignedMinutes);
          });
          if (sorted[0] && sorted[0].free - sorted[0].assignedMinutes >= need) target = sorted[0];
        }
        if (!target) {
          postpone.push({ task: p.task, reason: 'La semaine est déjà pleine' });
          return;
        }
        target.assigned.push({ id: p.task.id, minutes: p.minutes });
        target.assignedMinutes += p.minutes;
        placed.push({ taskId: p.task.id, date: target.date, minutes: p.minutes });
      });

      /* --- priorités de la semaine --- */
      var priorities = pool.slice()
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 5)
        .map(function (p) {
          return { taskId: p.task.id, title: p.task.title, why: L.tasks.reason(p.task), minutes: p.minutes };
        });

      /* --- objectifs et projets à faire avancer --- */
      var goals = L.goals.active().map(L.goals.summary)
        .sort(function (a, b) { return (a.gap || 0) - (b.gap || 0); })
        .slice(0, 4)
        .map(function (g) {
          return {
            goalId: g.goal.id, name: g.goal.name, percent: g.percent,
            behind: g.behind || g.late,
            advice: L.goals.advice(g.goal),
            perWeek: g.perWeek
          };
        });

      var projects = L.projects.active().map(L.projects.summary)
        .filter(function (p) { return p.nextMilestone || p.atRisk || p.overdue; })
        .slice(0, 4)
        .map(function (p) {
          return {
            projectId: p.project.id, name: p.project.name, percent: p.percent,
            atRisk: p.atRisk, overdue: p.overdue,
            milestone: p.nextMilestone ? p.nextMilestone.title : null,
            milestoneDue: p.nextMilestone ? p.nextMilestone.due : null
          };
        });

      /* --- risques --- */
      var risks = [];
      capacity.forEach(function (c) {
        if (c.past) return;
        if (c.assignedMinutes > c.free * 1.05 && c.assignedMinutes > 0) {
          risks.push({ level: 'warning', date: c.date, text: D.format(c.date, 'long') + ' : ' + D.duration(c.assignedMinutes) + ' prévus pour ' + D.duration(c.free) + ' disponibles.' });
        }
      });
      if (postpone.length) {
        risks.push({ level: 'danger', text: postpone.length + ' ' + L.util.plural(postpone.length, 'tâche') + ' ne ' + (postpone.length > 1 ? 'rentrent' : 'rentre') + ' pas dans la semaine.' });
      }
      var totalFree = L.util.sum(capacity.filter(function (c) { return !c.past; }), function (c) { return c.free; });
      var totalNeed = L.util.sum(pool, function (p) { return p.minutes; });
      if (totalNeed && totalFree && totalNeed < totalFree * 0.5) {
        risks.push({ level: 'positive', text: 'Semaine confortable : ' + D.duration(totalFree - totalNeed) + ' de marge après tout ce qui est prévu.' });
      }

      /* --- habitudes de la semaine --- */
      var habits = L.habits.all().map(function (h) {
        var wp = L.habits.weekProgress(h, start);
        return { habitId: h.id, name: h.name, done: wp.done, target: wp.target, ratio: wp.ratio };
      });

      return {
        key: W.key(start), start: start, end: days[6], createdAt: Date.now(), status: 'proposed',
        days: capacity.map(function (c) {
          return {
            date: c.date, free: c.free, assignedMinutes: c.assignedMinutes, past: c.past,
            events: c.events, habitMinutes: c.habitMinutes,
            tasks: c.assigned.map(function (a) {
              var t = L.tasks.get(a.id);
              return { id: a.id, title: t ? t.title : '—', minutes: a.minutes, fixed: !!a.fixed };
            })
          };
        }),
        priorities: priorities,
        goals: goals,
        projects: projects,
        habits: habits,
        postpone: postpone.map(function (p) { return { taskId: p.task.id, title: p.task.title, reason: p.reason }; }),
        risks: risks,
        totals: { free: totalFree, need: totalNeed, placed: placed.length }
      };
    },

    save: function (plan, status) {
      store.update(function (s) {
        s.weekPlans[plan.key] = Object.assign({}, plan, { status: status || 'proposed', savedAt: Date.now() });
      }, 'Semaine enregistrée');
      return W.get(plan.start);
    },

    /* Valider : chaque tâche placée reçoit sa date. Rien d'autre n'est
       touché — les heures restent à la charge du planning quotidien. */
    accept: function (plan) {
      store.update(function (s) {
        plan.days.forEach(function (day) {
          day.tasks.forEach(function (entry) {
            if (entry.fixed) return;
            s.tasks.forEach(function (t) {
              if (t.id === entry.id && L.tasks.OPEN_STATUS[t.status]) {
                t.date = day.date;
                if (t.status === 'postponed') t.status = 'todo';
                t.updatedAt = Date.now();
              }
            });
          });
        });
        s.weekPlans[plan.key] = Object.assign({}, plan, { status: 'accepted', acceptedAt: Date.now() });
      }, 'Semaine validée');
      L.notify && L.notify.reschedule();
      return W.get(plan.start);
    },

    reject: function (isoDate) {
      var k = W.key(isoDate);
      store.update(function (s) { delete s.weekPlans[k]; }, 'Semaine refusée');
    },

    /* Bilan de la semaine écoulée : ce qui a été fait, ce qui a glissé. */
    review: function (anchorISO) {
      var start = D.startOfWeek(anchorISO || D.today(), S().settings.firstDayOfWeek);
      var end = D.addDays(start, 6);
      var stats = L.tasks.stats(start, end);
      var habits = L.habits.all().map(function (h) {
        var wp = L.habits.weekProgress(h, start);
        return { name: h.name, ratio: wp.ratio, done: wp.done, target: wp.target };
      });
      var money = L.finance.period(start, end);
      return { start: start, end: end, tasks: stats, habits: habits, money: money };
    }
  };

  L.weekly = W;
})(window.LifeOS = window.LifeOS || {});
