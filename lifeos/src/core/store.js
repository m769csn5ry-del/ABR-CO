/* ==========================================================================
   LifeOS — état de l'application
   Un seul objet contient toutes les données ; toute modification passe par
   `update()`. Les écrans s'abonnent et se redessinent : rien ne met à jour
   le DOM en douce dans un coin.
   ========================================================================== */
(function (L) {
  'use strict';

  var bus = L.util.emitter();
  var state = L.schema.emptyState();
  var adapter = null;
  var undoStack = [];
  var redoStack = [];
  var saving = false, dirty = false, lastError = null;

  var flush = L.util.debounce(function () { persist(); }, 500);

  function persist() {
    if (!adapter) return Promise.resolve();
    if (saving) { dirty = true; return Promise.resolve(); }
    saving = true;
    var snapshot = state;
    return adapter.save(snapshot).then(function () {
      saving = false; lastError = null;
      bus.emit('saved', snapshot);
      if (dirty) { dirty = false; persist(); }
    }, function (err) {
      saving = false; lastError = err;
      console.error('[LifeOS] écriture impossible', err);
      bus.emit('error', err);
    });
  }

  var store = {
    /* --- cycle de vie --- */
    attach: function (nextAdapter) {
      adapter = nextAdapter;
      return adapter.load().then(function (raw) {
        var fresh = !raw;
        state = L.schema.migrate(raw);
        if (fresh) {
          L.seed.structure(state);
          state.meta.createdAt = Date.now();
        }
        L.format.setup(state.settings.locale, state.settings.currency);
        bus.emit('loaded', { fresh: fresh });
        bus.emit('change', { reason: 'load' });
        if (fresh) persist();
        return { fresh: fresh };
      });
    },

    detach: function () { adapter = null; state = L.schema.emptyState(); },

    /* --- lecture --- */
    get state() { return state; },
    settings: function () { return state.settings; },
    lastError: function () { return lastError; },

    byId: function (collection, id) {
      if (!id) return null;
      var list = state[collection] || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    /* --- écriture ---
       `label` sert au message « Annuler » ; sans label, pas d'historique
       (les changements de réglages n'encombrent pas la pile). */
    update: function (mutator, label) {
      if (label) {
        undoStack.push(JSON.stringify(state));
        if (undoStack.length > 40) undoStack.shift();
        redoStack.length = 0;
      }
      var result = mutator(state);
      state.meta.updatedAt = Date.now();
      flush();
      bus.emit('change', { reason: label || 'update' });
      return result;
    },

    /* Remplace tout l'état (import, restauration, chargement d'exemple). */
    replace: function (next, label) {
      undoStack.push(JSON.stringify(state));
      state = L.schema.migrate(next);
      L.format.setup(state.settings.locale, state.settings.currency);
      persist();
      bus.emit('change', { reason: label || 'replace' });
    },

    canUndo: function () { return undoStack.length > 0; },
    undo: function () {
      if (!undoStack.length) return false;
      redoStack.push(JSON.stringify(state));
      state = L.schema.migrate(JSON.parse(undoStack.pop()));
      persist();
      bus.emit('change', { reason: 'undo' });
      return true;
    },
    redo: function () {
      if (!redoStack.length) return false;
      undoStack.push(JSON.stringify(state));
      state = L.schema.migrate(JSON.parse(redoStack.pop()));
      persist();
      bus.emit('change', { reason: 'redo' });
      return true;
    },

    /* --- réglages --- */
    setSetting: function (path, value) {
      store.update(function (s) {
        var parts = path.split('.'), node = s.settings;
        for (var i = 0; i < parts.length - 1; i++) {
          if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = value;
        s.settings.updatedAt = Date.now();
      });
      if (path === 'locale' || path === 'currency') {
        L.format.setup(state.settings.locale, state.settings.currency);
      }
      bus.emit('settings', { path: path, value: value });
    },

    /* --- abonnements --- */
    on: bus.on,
    emit: bus.emit,
    subscribe: function (fn) { return bus.on('change', fn); },

    /* --- persistance immédiate (fermeture d'onglet) --- */
    flush: function () { return persist(); },

    /* --- sauvegarde / restauration --- */
    exportJSON: function () {
      return JSON.stringify({
        app: 'LifeOS', schema: L.schema.VERSION,
        exportedAt: new Date().toISOString(),
        state: state
      }, null, 2);
    },

    importJSON: function (text) {
      var parsed = JSON.parse(text);
      var next = parsed && parsed.state ? parsed.state : parsed;
      if (!next || typeof next !== 'object') throw new Error('fichier illisible');
      store.replace(next, 'import');
      return true;
    }
  };

  L.store = store;
})(window.LifeOS = window.LifeOS || {});
