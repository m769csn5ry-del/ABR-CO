/* ==========================================================================
   LifeOS — notifications
   Les rappels sont calculés à partir des vraies données : une tâche, une
   échéance, un rendez-vous, une habitude, un objectif. Rien n'est « posé »
   une fois pour toutes : à chaque changement, la file est reconstruite.

   Limite assumée : sans serveur de push, les rappels partent quand
   l'application est ouverte (ou vient de l'être). Le planning du matin et
   celui du dimanche sont donc rattrapés au lancement s'ils ont été manqués.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date;
  var timers = [];
  var HORIZON = 6 * 60;           // minutes : au-delà, on replanifiera plus tard
  var fired = {};

  function loadFired() {
    var saved = L.storage.readGlobal('fired', {});
    var today = D.today();
    fired = {};
    Object.keys(saved || {}).forEach(function (k) { if (saved[k] === today) fired[k] = today; });
    L.storage.writeGlobal('fired', fired);
  }
  function markFired(key) {
    fired[key] = D.today();
    L.storage.writeGlobal('fired', fired);
  }

  function permission() {
    return (typeof Notification === 'undefined') ? 'unsupported' : Notification.permission;
  }

  function present(title, body, tag, data) {
    var opts = {
      body: body, tag: tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      data: data || {}, silent: false
    };
    if (permission() === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg && reg.showNotification) reg.showNotification(title, opts);
          else new Notification(title, opts);
        }).catch(function () { try { new Notification(title, opts); } catch (e) {} });
      } else {
        try { new Notification(title, opts); } catch (e) {}
      }
    }
    /* Toujours un écho dans l'app : si la permission est refusée, le rappel
       reste visible quelque part. */
    if (L.toast) L.toast.show(title + (body ? ' — ' + body : ''), { duration: 8000 });
  }

  var N = {
    /* --- permissions --- */
    permission: permission,
    supported: function () { return typeof Notification !== 'undefined'; },

    request: function () {
      if (!N.supported()) return Promise.resolve('unsupported');
      return Notification.requestPermission().then(function (p) {
        L.store.setSetting('notifications.enabled', p === 'granted');
        if (p === 'granted') N.reschedule();
        return p;
      });
    },

    /* --- file de rappels --- */
    clear: function () {
      timers.forEach(clearTimeout);
      timers = [];
    },

    reschedule: L.util.debounce(function () { N.build(); }, 400),

    build: function () {
      N.clear();
      var settings = L.store.state.settings.notifications;
      if (!settings || !settings.enabled) return [];
      var queue = N.queue();
      var now = D.nowMinutes();
      queue.forEach(function (item) {
        if (fired[item.key]) return;
        var delay = (item.at - now) * 60000;
        if (delay < -60000 || delay > HORIZON * 60000) return;
        var id = setTimeout(function () {
          markFired(item.key);
          present(item.title, item.body, item.key, item.data);
        }, Math.max(0, delay));
        timers.push(id);
      });
      return queue;
    },

    /* Tout ce qui devrait sonner aujourd'hui, dans l'ordre. */
    queue: function () {
      var s = L.store.state.settings.notifications;
      var today = D.today();
      var out = [];
      var lead = s.leadMinutes || 10;

      if (s.dailyPlan && s.dailyPlan.on) {
        out.push({
          key: 'daily:' + today, at: D.toMinutes(s.dailyPlan.time) || 450,
          title: 'Ta journée', body: L.planner.describe(L.planner.get(today)) || 'Prépare ta journée en un geste.',
          data: { view: 'today' }
        });
      }
      if (s.weeklyPlan && s.weeklyPlan.on && D.dow(today) === (s.weeklyPlan.day === undefined ? 0 : s.weeklyPlan.day)) {
        out.push({
          key: 'weekly:' + D.weekKey(today), at: D.toMinutes(s.weeklyPlan.time) || 600,
          title: 'Préparer la semaine', body: 'Ton planning hebdomadaire est prêt à être relu.',
          data: { view: 'planning', tab: 'week' }
        });
      }

      if (s.events) {
        L.calendar.eventsOn(today).forEach(function (e) {
          if (e.allDay) return;
          var start = D.toMinutes(e.start);
          if (start === null) return;
          out.push({
            key: 'evt:' + e.id + ':' + today, at: start - lead,
            title: e.title, body: 'Dans ' + lead + ' min' + (e.location ? ' · ' + e.location : ''),
            data: { view: 'calendar', id: e.id }
          });
        });
      }

      if (s.tasks) {
        L.tasks.forDate(today, { includeDue: false }).forEach(function (t) {
          if (!L.tasks.OPEN_STATUS[t.status] || !t.time) return;
          out.push({
            key: 'tsk:' + t.id + ':' + today, at: (D.toMinutes(t.time) || 0) - lead,
            title: t.title, body: 'À ' + t.time + ' · ' + D.duration(t.estimate),
            data: { view: 'tasks', id: t.id }
          });
          (t.reminders || []).forEach(function (r, i) {
            var at = r.at ? D.toMinutes(r.at) : (D.toMinutes(t.time) - (r.offset || 0));
            out.push({ key: 'tskr:' + t.id + ':' + i + ':' + today, at: at, title: t.title, body: 'Rappel', data: { view: 'tasks', id: t.id } });
          });
        });
      }

      if (s.deadlines) {
        L.tasks.filter({ status: 'open' }).forEach(function (t) {
          if (t.due !== today) return;
          out.push({
            key: 'due:' + t.id + ':' + today, at: 9 * 60,
            title: 'Échéance aujourd\'hui', body: t.title, data: { view: 'tasks', id: t.id }
          });
        });
      }

      if (s.habits) {
        L.habits.today(today).forEach(function (h) {
          if (!h.habit.reminder || h.done) return;
          out.push({
            key: 'hab:' + h.habit.id + ':' + today, at: D.toMinutes(h.habit.reminder),
            title: h.habit.name, body: L.habits.targetLabel(h.habit), data: { view: 'habits', id: h.habit.id }
          });
        });
      }

      if (s.goals) {
        L.goals.active().forEach(function (g) {
          if (g.targetDate !== today) return;
          out.push({
            key: 'goal:' + g.id + ':' + today, at: 10 * 60,
            title: 'Date cible — ' + g.name, body: L.goals.advice(g), data: { view: 'goals', id: g.id }
          });
        });
      }

      return out.filter(function (x) { return x.at !== null && x.at !== undefined && !isNaN(x.at); })
        .sort(function (a, b) { return a.at - b.at; });
    },

    /* Rattrapage : au lancement, on montre ce qui devait arriver plus tôt
       dans la journée et qui n'a pas été vu. */
    catchUp: function () {
      var s = L.store.state.settings.notifications;
      if (!s || !s.enabled) return null;
      var now = D.nowMinutes();
      var missed = N.queue().filter(function (item) {
        return item.at <= now && !fired[item.key] && (item.key.indexOf('daily:') === 0 || item.key.indexOf('weekly:') === 0);
      });
      missed.forEach(function (m) { markFired(m.key); });
      return missed[0] || null;
    },

    init: function () {
      loadFired();
      if (permission() === 'granted' && !L.store.state.settings.notifications.enabled) {
        L.store.setSetting('notifications.enabled', true);
      }
      N.build();
      L.store.on('change', function () { N.reschedule(); });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) { loadFired(); N.build(); }
      });
      /* Re-planification régulière : l'horizon glisse avec la journée. */
      setInterval(function () { N.build(); }, 10 * 60000);
    },

    /* Aperçu lisible dans les réglages. */
    preview: function () {
      return N.queue().map(function (q) {
        return { time: D.toTime(q.at), title: q.title, body: q.body, done: !!fired[q.key] };
      });
    },

    test: function () {
      present('LifeOS', 'Les notifications fonctionnent.', 'test', {});
    }
  };

  L.notify = N;
})(window.LifeOS = window.LifeOS || {});
