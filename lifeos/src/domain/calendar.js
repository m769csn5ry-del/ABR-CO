/* ==========================================================================
   LifeOS — calendrier
   Le calendrier n'est pas une liste d'événements : c'est la vue unifiée de
   la journée. Événements, tâches posées à une heure, échéances et habitudes
   y entrent par la même porte, et c'est de là que sortent les créneaux
   libres utilisés par le planning automatique.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  function part(minutes) {
    if (minutes < 12 * 60) return 'morning';
    if (minutes < 18 * 60) return 'afternoon';
    return 'evening';
  }

  var C = {
    part: part,

    /* --- événements --- */
    get: function (id) { return store.byId('events', id); },
    create: function (patch) {
      var e = make.event(patch || {});
      store.update(function (s) { s.events.push(e); }, 'Événement ajouté');
      L.notify && L.notify.reschedule();
      return e;
    },
    save: function (id, patch) {
      var out = null;
      store.update(function (s) { s.events.forEach(function (e) { if (e.id === id) out = Object.assign(e, patch); }); }, 'Événement modifié');
      L.notify && L.notify.reschedule();
      return out;
    },
    remove: function (id) {
      store.update(function (s) { s.events = s.events.filter(function (e) { return e.id !== id; }); }, 'Événement supprimé');
    },

    /* Occurrences réelles d'un jour : les événements récurrents sont
       déroulés à la volée, jamais dupliqués dans les données. */
    eventsOn: function (isoDate) {
      var out = [];
      S().events.forEach(function (e) {
        if (e.date === isoDate) { out.push(e); return; }
        if (e.recurrence && e.recurrence.freq && isoDate > e.date &&
            D.matchesRecurrence(e.recurrence, isoDate, e.date)) {
          out.push(Object.assign({}, e, { date: isoDate, _occurrence: true }));
        }
      });
      return out.sort(function (a, b) {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (D.toMinutes(a.start) || 0) - (D.toMinutes(b.start) || 0);
      });
    },

    eventsBetween: function (fromISO, toISO) {
      var out = [];
      D.range(fromISO, toISO).forEach(function (d) { out = out.concat(C.eventsOn(d)); });
      return out;
    },

    /* --- agenda unifié --- */
    agenda: function (isoDate, opts) {
      opts = opts || {};
      var items = [];

      C.eventsOn(isoDate).forEach(function (e) {
        items.push({
          kind: 'event', id: e.id, title: e.title, allDay: e.allDay,
          start: e.allDay ? null : D.toMinutes(e.start),
          end: e.allDay ? null : D.toMinutes(e.end),
          domainId: e.domainId, ref: e, location: e.location
        });
      });

      L.tasks.forDate(isoDate, { includeDue: false }).forEach(function (t) {
        var start = t.time ? D.toMinutes(t.time) : null;
        items.push({
          kind: 'task', id: t.id, title: t.title,
          start: start, end: start === null ? null : start + (t.estimate || 30),
          allDay: start === null, domainId: t.domainId, ref: t, status: t.status
        });
      });

      if (opts.deadlines !== false) {
        S().tasks.forEach(function (t) {
          if (t.due !== isoDate || t.date === isoDate) return;
          if (!L.tasks.OPEN_STATUS[t.status]) return;
          items.push({ kind: 'due', id: t.id, title: t.title, allDay: true, start: null, end: null,
            domainId: t.domainId, ref: t });
        });
        S().projects.forEach(function (p) {
          if (p.due === isoDate && p.status !== 'done') {
            items.push({ kind: 'due', id: p.id, title: 'Échéance projet — ' + p.name, allDay: true, ref: p });
          }
        });
        S().goals.forEach(function (g) {
          if (g.targetDate === isoDate && g.status === 'active') {
            items.push({ kind: 'due', id: g.id, title: 'Date cible — ' + g.name, allDay: true, ref: g });
          }
        });
      }

      if (opts.habits) {
        L.habits.today(isoDate).forEach(function (h) {
          if (!h.habit.reminder && !h.habit.slot) return;
          var start = h.habit.reminder ? D.toMinutes(h.habit.reminder) : null;
          items.push({
            kind: 'habit', id: h.habit.id, title: h.habit.name,
            start: start, end: start === null ? null : start + (h.habit.duration || 30),
            allDay: start === null, ref: h.habit, done: h.done
          });
        });
      }

      return items.sort(function (a, b) {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.start || 0) - (b.start || 0);
      });
    },

    /* --- occupation et créneaux libres --- */
    busy: function (isoDate, opts) {
      opts = opts || {};
      var blocks = [];
      C.eventsOn(isoDate).forEach(function (e) {
        if (e.allDay) return;
        var a = D.toMinutes(e.start), b = D.toMinutes(e.end);
        if (a === null || b === null || b <= a) return;
        blocks.push({ start: a, end: b, label: e.title, kind: 'event', id: e.id });
      });
      if (opts.tasks !== false) {
        L.tasks.forDate(isoDate, { includeDue: false }).forEach(function (t) {
          if (!t.time || !L.tasks.OPEN_STATUS[t.status]) return;
          var a = D.toMinutes(t.time);
          blocks.push({ start: a, end: a + (t.estimate || 30), label: t.title, kind: 'task', id: t.id });
        });
      }
      return C.merge(blocks);
    },

    merge: function (blocks) {
      var sorted = blocks.slice().sort(function (a, b) { return a.start - b.start; });
      var out = [];
      sorted.forEach(function (b) {
        var last = out[out.length - 1];
        if (last && b.start <= last.end) { last.end = Math.max(last.end, b.end); last.labels.push(b.label); }
        else out.push({ start: b.start, end: b.end, labels: [b.label] });
      });
      return out;
    },

    /* Créneaux disponibles d'une journée, une fois retirés les événements
       et les tâches déjà posées à une heure fixe. */
    freeSlots: function (isoDate, opts) {
      opts = opts || {};
      var settings = S().settings.day;
      var from = opts.from !== undefined ? opts.from : D.toMinutes(settings.start);
      var to = opts.to !== undefined ? opts.to : D.toMinutes(settings.end);
      if (isoDate === D.today() && opts.fromNow !== false) {
        var now = D.nowMinutes() + 5;
        from = Math.max(from, Math.ceil(now / 5) * 5);
      }
      if (to <= from) return [];

      var busy = C.busy(isoDate, opts);
      var slots = [];
      var cursor = from;
      busy.forEach(function (b) {
        if (b.end <= cursor || b.start >= to) return;
        if (b.start > cursor) slots.push({ start: cursor, end: Math.min(b.start, to) });
        cursor = Math.max(cursor, b.end);
      });
      if (cursor < to) slots.push({ start: cursor, end: to });

      var min = opts.minMinutes || settings.minBlock || 15;
      return slots.filter(function (s) { return s.end - s.start >= min; })
        .map(function (s) {
          return { start: s.start, end: s.end, minutes: s.end - s.start, part: part(s.start) };
        });
    },

    availableMinutes: function (isoDate, opts) {
      return L.util.sum(C.freeSlots(isoDate, opts), function (s) { return s.minutes; });
    },

    /* --- vues --- */
    monthMatrix: function (anchorISO) {
      var first = D.startOfMonth(anchorISO);
      var start = D.startOfWeek(first, S().settings.firstDayOfWeek);
      var end = D.endOfWeek(D.endOfMonth(anchorISO), S().settings.firstDayOfWeek);
      var month = D.monthKey(anchorISO);
      return D.range(start, end).map(function (d) {
        return {
          date: d,
          inMonth: D.monthKey(d) === month,
          today: d === D.today(),
          items: C.agenda(d, { habits: false })
        };
      });
    },

    weekDays: function (anchorISO) {
      var start = D.startOfWeek(anchorISO, S().settings.firstDayOfWeek);
      return D.range(start, D.addDays(start, 6));
    },

    /* Charge d'une journée : minutes engagées / minutes disponibles. */
    load: function (isoDate) {
      var settings = S().settings.day;
      var window_ = D.toMinutes(settings.end) - D.toMinutes(settings.start);
      var busy = L.util.sum(C.busy(isoDate, { tasks: true }), function (b) { return b.end - b.start; });
      var tasks = L.util.sum(
        L.tasks.forDate(isoDate, { includeDue: false }).filter(function (t) {
          return L.tasks.OPEN_STATUS[t.status] && !t.time;
        }), function (t) { return t.estimate || 0; });
      var habits = L.util.sum(L.habits.today(isoDate).filter(function (h) { return !h.done; }),
        function (h) { return h.habit.duration || 0; });
      var planned = busy + tasks + habits;
      return {
        window: window_, busy: busy, tasks: tasks, habits: habits, planned: planned,
        free: Math.max(0, window_ - planned),
        ratio: window_ ? planned / window_ : 0,
        overloaded: planned > window_
      };
    }
  };

  L.calendar = C;
})(window.LifeOS = window.LifeOS || {});
