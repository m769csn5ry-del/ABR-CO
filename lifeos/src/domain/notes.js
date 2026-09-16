/* ==========================================================================
   LifeOS — notes
   Des notes simples, mais reliées : une note peut pointer vers des tâches,
   des projets et des objectifs, et ces liens sont visibles des deux côtés.
   ========================================================================== */
(function (L) {
  'use strict';

  var make = L.schema.make, store = L.store;
  function S() { return store.state; }

  var N = {
    all: function () { return S().notes; },
    get: function (id) { return store.byId('notes', id); },

    create: function (patch) {
      var n = make.note(patch || {});
      store.update(function (s) { s.notes.unshift(n); }, 'Note créée');
      return n;
    },
    save: function (id, patch) {
      var out = null;
      store.update(function (s) {
        s.notes.forEach(function (n) { if (n.id === id) out = Object.assign(n, patch, { updatedAt: Date.now() }); });
      });
      return out;
    },
    remove: function (id) {
      store.update(function (s) { s.notes = s.notes.filter(function (n) { return n.id !== id; }); }, 'Note supprimée');
    },

    filter: function (opts) {
      opts = opts || {};
      var list = S().notes.slice();
      if (opts.folderId !== undefined && opts.folderId !== null && opts.folderId !== 'all') {
        if (opts.folderId === 'none') list = list.filter(function (n) { return !n.folderId; });
        else {
          var ids = N.descendants(opts.folderId);
          list = list.filter(function (n) { return ids.indexOf(n.folderId) > -1; });
        }
      }
      if (opts.tag) list = list.filter(function (n) { return (n.tags || []).indexOf(opts.tag) > -1; });
      if (opts.query) {
        var q = L.util.fold(opts.query);
        list = list.filter(function (n) {
          return L.util.fold(n.title).indexOf(q) > -1 || L.util.fold(n.body).indexOf(q) > -1 ||
            (n.tags || []).some(function (t) { return L.util.fold(t).indexOf(q) > -1; });
        });
      }
      if (opts.linkedTo) {
        list = list.filter(function (n) {
          var l = n.links || {};
          return (l.taskIds || []).indexOf(opts.linkedTo) > -1 ||
                 (l.projectIds || []).indexOf(opts.linkedTo) > -1 ||
                 (l.goalIds || []).indexOf(opts.linkedTo) > -1;
        });
      }
      return list.sort(function (a, b) {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
    },

    forEntity: function (id) { return N.filter({ linkedTo: id }); },

    link: function (noteId, kind, id) {
      store.update(function (s) {
        s.notes.forEach(function (n) {
          if (n.id !== noteId) return;
          n.links = n.links || { taskIds: [], projectIds: [], goalIds: [] };
          var key = kind + 'Ids';
          n.links[key] = L.util.unique((n.links[key] || []).concat([id]));
          n.updatedAt = Date.now();
        });
      }, 'Note liée');
    },
    unlink: function (noteId, kind, id) {
      store.update(function (s) {
        s.notes.forEach(function (n) {
          if (n.id !== noteId || !n.links) return;
          var key = kind + 'Ids';
          n.links[key] = (n.links[key] || []).filter(function (x) { return x !== id; });
        });
      });
    },

    /* --- dossiers --- */
    folders: function () { return S().folders.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); },
    createFolder: function (name, parentId) {
      var f = make.folder({ name: name, parentId: parentId || null, order: S().folders.length });
      store.update(function (s) { s.folders.push(f); }, 'Dossier créé');
      return f;
    },
    saveFolder: function (id, patch) {
      store.update(function (s) { s.folders.forEach(function (f) { if (f.id === id) Object.assign(f, patch); }); }, 'Dossier modifié');
    },
    removeFolder: function (id) {
      var ids = N.descendants(id);
      store.update(function (s) {
        s.folders = s.folders.filter(function (f) { return ids.indexOf(f.id) === -1; });
        s.notes.forEach(function (n) { if (ids.indexOf(n.folderId) > -1) n.folderId = null; });
      }, 'Dossier supprimé');
    },
    descendants: function (id) {
      var out = [id];
      var walk = function (parent) {
        S().folders.forEach(function (f) {
          if (f.parentId === parent && out.indexOf(f.id) === -1) { out.push(f.id); walk(f.id); }
        });
      };
      walk(id);
      return out;
    },
    tree: function (parentId) {
      return N.folders().filter(function (f) { return (f.parentId || null) === (parentId || null); })
        .map(function (f) {
          return {
            folder: f,
            count: S().notes.filter(function (n) { return n.folderId === f.id; }).length,
            children: N.tree(f.id)
          };
        });
    },

    /* --- listes à cocher --- */
    toggleCheck: function (noteId, itemId) {
      store.update(function (s) {
        s.notes.forEach(function (n) {
          if (n.id !== noteId) return;
          (n.checklist || []).forEach(function (c) { if (c.id === itemId) c.done = !c.done; });
          n.updatedAt = Date.now();
        });
      });
    },
    addCheck: function (noteId, title) {
      var item = { id: L.util.uid('ck'), title: title, done: false };
      store.update(function (s) {
        s.notes.forEach(function (n) {
          if (n.id !== noteId) return;
          n.checklist = (n.checklist || []).concat([item]);
          n.updatedAt = Date.now();
        });
      });
      return item;
    },
    removeCheck: function (noteId, itemId) {
      store.update(function (s) {
        s.notes.forEach(function (n) {
          if (n.id !== noteId) return;
          n.checklist = (n.checklist || []).filter(function (c) { return c.id !== itemId; });
        });
      });
    },

    tags: function () {
      var all = [];
      S().notes.forEach(function (n) { all = all.concat(n.tags || []); });
      return L.util.unique(all).sort();
    },

    excerpt: function (note, len) {
      var body = (note.body || '').replace(/\s+/g, ' ').trim();
      var max = len || 120;
      return body.length > max ? body.slice(0, max) + '…' : body;
    }
  };

  L.notes = N;
})(window.LifeOS = window.LifeOS || {});
