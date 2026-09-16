/* ==========================================================================
   LifeOS — minuteur de concentration
   Le temps réellement passé sur une tâche ne s'estime pas : il se mesure.
   Le minuteur survit à un rechargement et à la fermeture de l'onglet — il ne
   garde qu'un instant de départ, jamais un décompte à faire tourner.
   ========================================================================== */
(function (L) {
  'use strict';

  var bus = L.util.emitter();
  var ticker = null;

  function state() {
    var s = L.store.state;
    if (!s.timer) s.timer = null;
    return s.timer;
  }

  /* Minutes écoulées : temps accumulé avant la dernière pause, plus le
     temps qui court depuis la reprise. */
  function elapsedMs(t) {
    if (!t) return 0;
    return (t.accumulated || 0) + (t.startedAt ? Date.now() - t.startedAt : 0);
  }

  function tick() {
    var t = state();
    if (!t || !t.startedAt) return;
    bus.emit('tick', { minutes: elapsedMs(t) / 60000, timer: t });
  }

  function watch() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 1000);
  }

  var T = {
    on: bus.on,

    current: function () { return state(); },
    running: function () { var t = state(); return !!(t && t.startedAt); },
    minutes: function () { return Math.round(elapsedMs(state()) / 60000); },
    seconds: function () { return Math.round(elapsedMs(state()) / 1000); },

    task: function () {
      var t = state();
      return t && t.taskId ? L.tasks.get(t.taskId) : null;
    },

    label: function () {
      var total = T.seconds();
      var m = Math.floor(total / 60), sec = total % 60;
      return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
    },

    start: function (taskId, opts) {
      opts = opts || {};
      var existing = state();
      if (existing && existing.taskId && existing.taskId !== taskId) T.stop({ silent: true });
      L.store.update(function (s) {
        s.timer = {
          taskId: taskId || null,
          label: opts.label || null,
          startedAt: Date.now(),
          accumulated: 0,
          goal: opts.goal || null        // durée visée, en minutes
        };
        if (taskId) {
          s.tasks.forEach(function (t) {
            if (t.id === taskId && L.tasks.OPEN_STATUS[t.status]) t.status = 'doing';
          });
        }
      });
      watch();
      bus.emit('start', state());
      return state();
    },

    pause: function () {
      var t = state();
      if (!t || !t.startedAt) return;
      L.store.update(function (s) {
        s.timer.accumulated = elapsedMs(s.timer);
        s.timer.startedAt = null;
      });
      bus.emit('pause', state());
    },

    resume: function () {
      var t = state();
      if (!t || t.startedAt) return;
      L.store.update(function (s) { s.timer.startedAt = Date.now(); });
      watch();
      bus.emit('resume', state());
    },

    /* Arrêter, c'est inscrire le temps mesuré sur la tâche : c'est lui qui
       nourrit les statistiques de temps par domaine et par projet. */
    stop: function (opts) {
      opts = opts || {};
      var t = state();
      if (!t) return 0;
      var minutes = Math.max(0, Math.round(elapsedMs(t) / 60000));
      var taskId = t.taskId;
      L.store.update(function (s) {
        if (taskId && minutes) {
          s.tasks.forEach(function (task) {
            if (task.id !== taskId) return;
            task.actual = (task.actual || 0) + minutes;
            task.updatedAt = Date.now();
            if (opts.complete) {
              task.status = 'done';
              task.completedAt = Date.now();
            } else if (task.status === 'doing' && !opts.keepDoing) {
              task.status = 'todo';
            }
          });
        }
        s.timer = null;
      }, minutes ? 'Temps enregistré' : null);
      if (ticker) { clearInterval(ticker); ticker = null; }
      bus.emit('stop', { minutes: minutes, taskId: taskId });
      if (!opts.silent && minutes) {
        L.toast.show(D_label(minutes) + ' enregistrées' + (opts.complete ? ' · tâche terminée' : ''));
      }
      return minutes;
    },

    cancel: function () {
      L.store.update(function (s) {
        if (s.timer && s.timer.taskId) {
          s.tasks.forEach(function (t) {
            if (t.id === s.timer.taskId && t.status === 'doing') t.status = 'todo';
          });
        }
        s.timer = null;
      });
      if (ticker) { clearInterval(ticker); ticker = null; }
      bus.emit('stop', { minutes: 0 });
    },

    /* Au démarrage de l'app, un minuteur laissé en route reprend son cours. */
    init: function () {
      var t = state();
      if (t && t.startedAt) watch();
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && T.running()) watch();
      });
    }
  };

  function D_label(minutes) { return L.date.duration(minutes, { zero: '0 min' }); }

  L.timer = T;
})(window.LifeOS = window.LifeOS || {});
