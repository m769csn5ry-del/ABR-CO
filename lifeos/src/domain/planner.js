/* ==========================================================================
   LifeOS — organisation automatique de la journée
   Le moteur croise en une passe : créneaux libres, tâches ouvertes,
   échéances, priorités, durées estimées, niveau d'énergie, habitudes du jour
   et objectifs en retard. Il en sort un déroulé horaire justifié, que l'on
   peut accepter, retoucher ou refuser.

   Rien n'est écrit dans les données tant que le planning n'est pas accepté.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, store = L.store;
  function S() { return store.state; }

  var ENERGY_RANK = { high: 3, medium: 2, low: 1 };

  /* Compatibilité entre l'exigence d'une tâche et l'énergie du créneau.
     Une tâche difficile placée en fin de soirée ne sera pas faite ;
     une tâche facile ne doit pas manger le meilleur moment de la journée. */
  function energyFit(taskEnergy, slotEnergy) {
    var t = ENERGY_RANK[taskEnergy] || 2;
    var s = ENERGY_RANK[slotEnergy] || 2;
    if (t === s) return 1;
    if (t > s) return t - s === 1 ? 0.55 : 0.2;   // trop exigeant pour le moment
    return 0.85;                                   // moment « trop bon », léger gâchis
  }

  function slotEnergy(partName) {
    var e = S().settings.day.energy || {};
    return e[partName] || 'medium';
  }

  var P = {
    /* --- construction --- */
    build: function (isoDate, opts) {
      opts = opts || {};
      var day = isoDate || D.today();
      var settings = S().settings.day;
      var maxFocus = opts.maxFocus || settings.maxFocus || 90;
      var breakMin = opts.breakMinutes === undefined ? (settings.breakMinutes || 10) : opts.breakMinutes;
      var minBlock = opts.minBlock || settings.minBlock || 15;

      var slots = L.calendar.freeSlots(day, {
        from: opts.from, to: opts.to, minMinutes: minBlock, fromNow: opts.fromNow
      });
      var totalFree = L.util.sum(slots, function (s) { return s.minutes; });

      var candidates = P.candidates(day, opts);
      var fixed = P.fixedBlocks(day, opts);

      var blocks = [], used = {}, remaining = {};
      candidates.forEach(function (c) { remaining[c.id] = c.minutes; });

      slots.forEach(function (slot) {
        var cursor = slot.start;
        var energy = slotEnergy(slot.part);
        var guard = 0;
        while (cursor < slot.end - 1 && guard++ < 40) {
          var left = slot.end - cursor;
          var best = null, bestScore = -1;

          candidates.forEach(function (c) {
            if (used[c.id] && remaining[c.id] <= 0) return;
            if (c.fixedTime) return;
            var want = Math.min(remaining[c.id], maxFocus);
            if (want < minBlock) return;
            /* On accepte de couper une tâche longue, jamais d'en poser un
               morceau ridicule : au moins minBlock ou la tâche entière. */
            var give = Math.min(want, left);
            if (give < Math.min(minBlock, remaining[c.id])) return;

            var fit = energyFit(c.energy, energy);
            var completion = give >= remaining[c.id] ? 1.15 : 1;   // finir vaut mieux qu'entamer
            var slotPref = c.slot && c.slot !== slot.part ? 0.6 : 1;
            var score = c.score * fit * completion * slotPref;
            /* Une échéance du jour passe devant tout le reste. */
            if (c.dueToday) score *= 1.3;
            if (score > bestScore) { bestScore = score; best = { c: c, give: give }; }
          });

          if (!best) break;

          var c = best.c, give = best.give;
          var end = cursor + give;
          blocks.push({
            id: L.util.uid('blk'),
            type: c.type, refId: c.id, title: c.title,
            start: cursor, end: end, minutes: give,
            partial: give < remaining[c.id],
            why: c.why, domainId: c.domainId, energy: c.energy
          });
          remaining[c.id] -= give;
          used[c.id] = true;
          cursor = end;

          /* Pause courte après un bloc long, si le créneau le permet. */
          if (breakMin && give >= 50 && slot.end - cursor > breakMin + minBlock) {
            blocks.push({
              id: L.util.uid('blk'), type: 'break', refId: null,
              title: 'Pause', start: cursor, end: cursor + breakMin, minutes: breakMin,
              why: 'Souffler avant le bloc suivant'
            });
            cursor += breakMin;
          }
        }
      });

      var unscheduled = candidates.filter(function (c) {
        return !c.fixedTime && remaining[c.id] >= Math.min(c.minutes, 15) && !used[c.id];
      });
      var partials = candidates.filter(function (c) { return used[c.id] && remaining[c.id] > 0; });

      var all = fixed.concat(blocks).sort(function (a, b) { return a.start - b.start; });
      var plannedMinutes = L.util.sum(blocks.filter(function (b) { return b.type !== 'break'; }), function (b) { return b.minutes; });

      var plan = {
        date: day,
        createdAt: Date.now(),
        status: 'proposed',
        blocks: all,
        window: slots.length ? { start: slots[0].start, end: slots[slots.length - 1].end } : null,
        freeMinutes: totalFree,
        plannedMinutes: plannedMinutes,
        leftoverMinutes: Math.max(0, totalFree - L.util.sum(blocks, function (b) { return b.minutes; })),
        unscheduled: unscheduled.map(function (c) { return { id: c.id, type: c.type, title: c.title, minutes: remaining[c.id], why: c.why }; }),
        partials: partials.map(function (c) { return { id: c.id, title: c.title, left: remaining[c.id] }; }),
        warnings: []
      };

      /* --- avertissements utiles, pas de bruit --- */
      if (!slots.length) {
        plan.warnings.push({ level: 'info', text: 'Aucun créneau libre sur cette plage : la journée est déjà pleine.' });
      }
      var missedDeadlines = unscheduled.filter(function (c) { return c.dueSoon; });
      if (missedDeadlines.length) {
        plan.warnings.push({
          level: 'danger',
          text: missedDeadlines.length + ' ' + L.util.plural(missedDeadlines.length, 'tâche') + ' à échéance proche ne ' +
            (missedDeadlines.length > 1 ? 'tiennent' : 'tient') + ' pas dans la journée : ' +
            missedDeadlines.slice(0, 2).map(function (c) { return '« ' + c.title + ' »'; }).join(', ') + '.'
        });
      }
      var need = L.util.sum(candidates, function (c) { return c.minutes; });
      if (need > totalFree * 1.25 && totalFree > 0) {
        plan.warnings.push({
          level: 'warning',
          text: 'Surcharge : ' + D.duration(need) + ' de travail pour ' + D.duration(totalFree) +
            ' disponibles. Reporte ou raccourcis ' + Math.ceil((need - totalFree) / 60) + ' h.'
        });
      }
      if (plan.leftoverMinutes >= 45 && !unscheduled.length) {
        plan.warnings.push({ level: 'positive', text: D.duration(plan.leftoverMinutes) + ' restent libres après tout ce qui était prévu.' });
      }
      return plan;
    },

    /* --- ce qui peut entrer dans la journée --- */
    candidates: function (isoDate, opts) {
      opts = opts || {};
      var out = [];
      var day = isoDate || D.today();
      var today = D.today();

      if (opts.taskIds) {
        opts.taskIds.forEach(function (id) {
          var t = L.tasks.get(id);
          if (t && L.tasks.OPEN_STATUS[t.status]) out.push(P.fromTask(t, day));
        });
        return out;
      }

      var seen = {};
      /* 1. ce qui est posé ce jour-là, 2. les retards, 3. les échéances
         proches, 4. le meilleur du reste pour remplir. */
      L.tasks.forDate(day, { includeDue: false }).forEach(function (t) {
        if (!L.tasks.OPEN_STATUS[t.status] || seen[t.id]) return;
        seen[t.id] = 1; out.push(P.fromTask(t, day));
      });
      if (day >= today) {
        L.tasks.overdue().forEach(function (t) {
          if (seen[t.id]) return; seen[t.id] = 1; out.push(P.fromTask(t, day));
        });
        L.tasks.dueWithin(3).forEach(function (t) {
          if (seen[t.id]) return; seen[t.id] = 1; out.push(P.fromTask(t, day));
        });
      }

      if (opts.habits !== false) {
        L.habits.today(day).forEach(function (h) {
          if (h.done || !h.habit.duration) return;
          out.push({
            id: h.habit.id, type: 'habit', title: h.habit.name,
            minutes: h.habit.duration, energy: 'medium',
            slot: h.habit.slot || null,
            fixedTime: !!h.habit.reminder,
            score: 60 + (h.streak > 2 ? 12 : 0),
            domainId: h.habit.domainId,
            why: h.streak > 1 ? 'Série de ' + h.streak + ' jours à préserver' : 'Habitude du jour'
          });
        });
      }

      /* Remplissage : on ne propose du « rab » que s'il reste de la place. */
      var need = L.util.sum(out, function (c) { return c.minutes; });
      var free = opts._free === undefined
        ? L.calendar.availableMinutes(day, { from: opts.from, to: opts.to, fromNow: opts.fromNow })
        : opts._free;
      if (need < free) {
        var backlog = L.tasks.filter({ status: 'open', sort: 'score' });
        for (var i = 0; i < backlog.length && need < free; i++) {
          var t = backlog[i];
          if (seen[t.id]) continue;
          if (t.date && t.date > day) continue;      // posée plus tard : on n'y touche pas
          seen[t.id] = 1;
          var c = P.fromTask(t, day);
          c.filler = true;
          c.score *= 0.7;
          out.push(c);
          need += c.minutes;
        }
      }
      return out;
    },

    fromTask: function (t, day) {
      var due = t.due ? D.diffDays(day, t.due) : null;
      return {
        id: t.id, type: 'task', title: t.title,
        minutes: Math.max(10, t.estimate || 30),
        energy: t.energy || 'medium',
        slot: null,
        fixedTime: !!t.time,
        time: t.time || null,
        score: L.tasks.score(t, day),
        dueToday: due === 0,
        dueSoon: due !== null && due <= 1,
        domainId: t.domainId,
        why: L.tasks.reason(t)
      };
    },

    /* Ce qui ne bouge pas : rendez-vous, cours, tâches posées à une heure. */
    fixedBlocks: function (isoDate, opts) {
      var out = [];
      L.calendar.eventsOn(isoDate).forEach(function (e) {
        if (e.allDay) return;
        var a = D.toMinutes(e.start), b = D.toMinutes(e.end);
        if (a === null || b === null) return;
        if (opts && opts.from !== undefined && b <= opts.from) return;
        if (opts && opts.to !== undefined && a >= opts.to) return;
        out.push({
          id: L.util.uid('blk'), type: 'event', refId: e.id, title: e.title,
          start: a, end: b, minutes: b - a, fixed: true,
          why: e.location || 'Au calendrier', domainId: e.domainId
        });
      });
      L.tasks.forDate(isoDate, { includeDue: false }).forEach(function (t) {
        if (!t.time || !L.tasks.OPEN_STATUS[t.status]) return;
        var a = D.toMinutes(t.time);
        out.push({
          id: L.util.uid('blk'), type: 'task', refId: t.id, title: t.title,
          start: a, end: a + (t.estimate || 30), minutes: t.estimate || 30, fixed: true,
          why: 'Heure fixée', domainId: t.domainId
        });
      });
      return out;
    },

    /* --- mémoire des plannings --- */
    get: function (isoDate) { return S().plans[isoDate || D.today()] || null; },

    save: function (plan, status) {
      store.update(function (s) {
        s.plans[plan.date] = Object.assign({}, plan, { status: status || plan.status || 'proposed', savedAt: Date.now() });
      }, 'Planning enregistré');
      return P.get(plan.date);
    },

    /* Accepter, c'est inscrire le planning dans les données : les tâches
       prennent leur jour et leur heure, le calendrier les affiche, les
       notifications s'y accrochent. */
    accept: function (plan) {
      store.update(function (s) {
        plan.blocks.forEach(function (b) {
          if (b.type !== 'task' || b.fixed) return;
          s.tasks.forEach(function (t) {
            if (t.id !== b.refId) return;
            /* Premier bloc de la tâche : c'est lui qui donne l'heure. */
            var first = plan.blocks.filter(function (x) { return x.refId === t.id && x.type === 'task'; })[0];
            if (first && first.id === b.id) {
              t.date = plan.date;
              t.time = D.toTime(b.start);
              t.updatedAt = Date.now();
            }
          });
        });
        s.plans[plan.date] = Object.assign({}, plan, { status: 'accepted', acceptedAt: Date.now() });
      }, 'Planning accepté');
      L.notify && L.notify.reschedule();
      return P.get(plan.date);
    },

    reject: function (isoDate) {
      store.update(function (s) { delete s.plans[isoDate]; }, 'Planning refusé');
    },

    /* Déplacer ou retirer un bloc à la main, sans tout recalculer. */
    moveBlock: function (isoDate, blockId, startMinutes) {
      store.update(function (s) {
        var plan = s.plans[isoDate];
        if (!plan) return;
        plan.blocks.forEach(function (b) {
          if (b.id !== blockId) return;
          var len = b.end - b.start;
          b.start = Math.max(0, Math.min(23 * 60 + 30, startMinutes));
          b.end = b.start + len;
        });
        plan.blocks.sort(function (a, b) { return a.start - b.start; });
        plan.status = 'edited';
      }, 'Bloc déplacé');
    },

    removeBlock: function (isoDate, blockId) {
      store.update(function (s) {
        var plan = s.plans[isoDate];
        if (!plan) return;
        plan.blocks = plan.blocks.filter(function (b) { return b.id !== blockId; });
        plan.status = 'edited';
      }, 'Bloc retiré');
    },

    /* Bloc en cours, pour l'accueil et la notification « au suivant ». */
    currentBlock: function (plan) {
      if (!plan) return null;
      var now = D.nowMinutes();
      return plan.blocks.filter(function (b) { return b.start <= now && b.end > now; })[0] || null;
    },
    nextBlock: function (plan) {
      if (!plan) return null;
      var now = D.nowMinutes();
      return plan.blocks.filter(function (b) { return b.start > now; })[0] || null;
    },

    /* Résumé en une phrase, réutilisé par l'assistant et les notifications. */
    describe: function (plan) {
      if (!plan || !plan.blocks.length) return 'Rien de planifié pour le moment.';
      var tasks = plan.blocks.filter(function (b) { return b.type === 'task'; });
      var events = plan.blocks.filter(function (b) { return b.type === 'event'; });
      var habits = plan.blocks.filter(function (b) { return b.type === 'habit'; });
      var bits = [];
      if (events.length) bits.push(events.length + ' ' + L.util.plural(events.length, 'rendez-vous', 'rendez-vous'));
      if (tasks.length) bits.push(tasks.length + ' ' + L.util.plural(tasks.length, 'tâche') + ' (' + D.duration(L.util.sum(tasks, function (b) { return b.minutes; })) + ')');
      if (habits.length) bits.push(habits.length + ' ' + L.util.plural(habits.length, 'habitude'));
      return bits.join(' · ');
    }
  };

  L.planner = P;
})(window.LifeOS = window.LifeOS || {});
