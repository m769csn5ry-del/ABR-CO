/* ==========================================================================
   LifeOS — « Je suis perdu »
   Une seule question : quoi faire maintenant ? La réponse tient en une à
   trois actions concrètes, chacune avec sa durée, son horaire et sa raison.
   Rien d'autre : pas de liste, pas de tableau de bord.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date;

  var F = {
    next: function (count) {
      var n = count || 3;
      var today = D.today();
      var now = D.nowMinutes();
      var out = [];

      /* 1. Un rendez-vous imminent prend toujours le dessus. */
      var soon = L.calendar.eventsOn(today).filter(function (e) {
        if (e.allDay) return false;
        var start = D.toMinutes(e.start);
        return start !== null && start - now > -15 && start - now <= 45;
      })[0];
      if (soon) {
        var mins = D.toMinutes(soon.start) - now;
        out.push({
          kind: 'event', id: soon.id,
          title: mins <= 0 ? 'En cours : ' + soon.title : 'Préparer « ' + soon.title + ' »',
          detail: mins <= 0 ? 'Commencé à ' + soon.start : 'Commence dans ' + D.duration(Math.max(1, mins)) + (soon.location ? ' · ' + soon.location : ''),
          why: 'Rendez-vous imminent',
          minutes: Math.max(5, mins),
          at: soon.start
        });
      }

      /* 2. Le temps réellement disponible avant le prochain engagement. */
      var slots = L.calendar.freeSlots(today, { minMinutes: 10 });
      var slot = slots[0] || null;
      var available = slot ? slot.minutes : 0;

      /* 3. Les meilleures actions qui tiennent dans ce temps-là. */
      var cands = L.tasks.filter({ status: 'open', sort: 'score' });
      var habits = L.habits.today(today).filter(function (h) { return !h.done && h.habit.duration; });

      var pool = cands.map(function (t) {
        return {
          kind: 'task', id: t.id, ref: t,
          title: t.title,
          minutes: Math.max(5, t.estimate || 30),
          score: L.tasks.score(t),
          why: L.tasks.reason(t),
          energy: t.energy
        };
      }).concat(habits.map(function (h) {
        return {
          kind: 'habit', id: h.habit.id, ref: h.habit,
          title: h.habit.name,
          minutes: h.habit.duration || 20,
          score: 46 + (h.streak > 2 ? 10 : 0),
          why: h.streak > 1 ? 'Série de ' + h.streak + ' jours en jeu' : 'Habitude prévue aujourd\'hui',
          energy: 'medium'
        };
      }));

      /* Ce qui rentre dans le créneau passe devant ce qui déborde : une
         action impossible à commencer maintenant n'aide pas. */
      pool.sort(function (a, b) {
        var fa = available && a.minutes <= available ? 1 : 0;
        var fb = available && b.minutes <= available ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return b.score - a.score;
      });

      var cursor = slot ? Math.max(slot.start, now) : now;
      for (var i = 0; i < pool.length && out.length < n; i++) {
        var c = pool[i];
        var fits = !slot || cursor + c.minutes <= slot.end;
        var give = fits ? c.minutes : Math.min(c.minutes, slot ? Math.max(0, slot.end - cursor) : c.minutes);
        if (slot && give < 10) break;
        var detail;
        if (slot && cursor < slot.end) {
          detail = D.toTime(cursor) + ' → ' + D.toTime(cursor + give) +
            (give < c.minutes ? ' · première tranche de ' + D.duration(give) : ' · ' + D.duration(give));
        } else {
          detail = D.duration(c.minutes) + ' à prévoir';
        }
        out.push({
          kind: c.kind, id: c.id, title: c.title, detail: detail, why: c.why,
          minutes: give, at: slot ? D.toTime(cursor) : null, ref: c.ref
        });
        cursor += give + 5;
        if (slot && cursor >= slot.end) slot = slots[out.length] || null;
      }

      if (!out.length) {
        out.push({
          kind: 'empty',
          title: 'Rien d\'urgent',
          detail: 'Aucune tâche ouverte pour le moment.',
          why: 'Profites-en pour poser une intention : ajoute une tâche ou avance un objectif.'
        });
      }
      return { actions: out.slice(0, n), available: available, generatedAt: Date.now() };
    },

    /* Phrase d'ambiance affichée au-dessus des actions. */
    context: function () {
      var today = D.today();
      var load = L.calendar.load(today);
      var overdue = L.tasks.overdue().length;
      var free = L.calendar.availableMinutes(today);
      var bits = [];
      if (free > 0) bits.push(D.duration(free) + ' devant toi');
      if (overdue) bits.push(overdue + ' en retard');
      if (load.overloaded) bits.push('journée chargée');
      return bits.join(' · ');
    }
  };

  L.focus = F;
})(window.LifeOS = window.LifeOS || {});
