/* ==========================================================================
   LifeOS — outils de base
   Aucune dépendance : tout le logiciel tient sur ces quelques fonctions.
   ========================================================================== */
(function (L) {
  'use strict';

  var counter = 0;

  var util = {
    /* Identifiant court, trié dans le temps : deux objets créés à la suite
       gardent leur ordre de création même après un tri par id. */
    uid: function (prefix) {
      counter = (counter + 1) % 4096;
      return (prefix || 'x') + '_' +
        Date.now().toString(36) +
        counter.toString(36).padStart(2, '0') +
        Math.random().toString(36).slice(2, 6);
    },

    clamp: function (n, min, max) { return n < min ? min : (n > max ? max : n); },

    round: function (n, d) { var f = Math.pow(10, d || 0); return Math.round(n * f) / f; },

    sum: function (list, pick) {
      var t = 0;
      for (var i = 0; i < list.length; i++) t += (pick ? pick(list[i], i) : list[i]) || 0;
      return t;
    },

    groupBy: function (list, pick) {
      var out = {};
      for (var i = 0; i < list.length; i++) {
        var k = pick(list[i]);
        (out[k] || (out[k] = [])).push(list[i]);
      }
      return out;
    },

    sortBy: function (list, pick, dir) {
      var d = dir === 'desc' ? -1 : 1;
      return list.slice().sort(function (a, b) {
        var x = pick(a), y = pick(b);
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return x > y ? d : -d;
      });
    },

    unique: function (list) {
      var seen = Object.create(null), out = [];
      for (var i = 0; i < list.length; i++) {
        var k = String(list[i]);
        if (!seen[k]) { seen[k] = 1; out.push(list[i]); }
      }
      return out;
    },

    clone: function (v) {
      if (v === null || typeof v !== 'object') return v;
      if (typeof structuredClone === 'function') {
        try { return structuredClone(v); } catch (e) { /* objets non clonables */ }
      }
      return JSON.parse(JSON.stringify(v));
    },

    debounce: function (fn, ms) {
      var t = null;
      return function () {
        var self = this, args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms);
      };
    },

    throttle: function (fn, ms) {
      var last = 0, timer = null;
      return function () {
        var self = this, args = arguments, now = Date.now(), wait = ms - (now - last);
        if (wait <= 0) { last = now; fn.apply(self, args); }
        else if (!timer) {
          timer = setTimeout(function () { timer = null; last = Date.now(); fn.apply(self, args); }, wait);
        }
      };
    },

    escapeHtml: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /* Comparaison souple pour la recherche : sans accents ni casse. */
    fold: function (s) {
      return String(s == null ? '' : s)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().trim();
    },

    /* Score de correspondance approximative, façon barre de commandes :
       > 0 si toutes les lettres de la requête apparaissent dans l'ordre. */
    fuzzy: function (text, query) {
      var t = util.fold(text), q = util.fold(query);
      if (!q) return 1;
      if (t.indexOf(q) === 0) return 1000 - t.length;
      var at = t.indexOf(q);
      if (at > 0) return 700 - at - t.length * 0.1;
      var ti = 0, score = 0, streak = 0;
      for (var qi = 0; qi < q.length; qi++) {
        var found = t.indexOf(q[qi], ti);
        if (found === -1) return 0;
        streak = found === ti ? streak + 1 : 0;
        score += 10 + streak * 4 - Math.min(found - ti, 8);
        ti = found + 1;
      }
      return Math.max(1, score);
    },

    /* Émetteur d'événements minimal. */
    emitter: function () {
      var map = {};
      return {
        on: function (evt, fn) {
          (map[evt] || (map[evt] = [])).push(fn);
          return function () {
            map[evt] = (map[evt] || []).filter(function (f) { return f !== fn; });
          };
        },
        emit: function (evt, payload) {
          var subs = (map[evt] || []).slice();
          for (var i = 0; i < subs.length; i++) {
            try { subs[i](payload); } catch (e) { console.error('[LifeOS]', evt, e); }
          }
        }
      };
    },

    /* Hachage stable (FNV-1a) — sert à nommer l'espace de stockage d'un compte. */
    hash: function (str) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return h.toString(36);
    },

    initials: function (name) {
      var parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
      return parts.map(function (p) { return p[0] || ''; }).join('').toUpperCase() || '?';
    },

    plural: function (n, one, many) { return n <= 1 ? one : (many || one + 's'); },

    /* Découpe « 2 h 30 de sport » en mots utiles pour l'analyse de langage. */
    words: function (s) { return util.fold(s).split(/[^a-z0-9€%.,:'-]+/).filter(Boolean); },

    download: function (filename, content, mime) {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    pickFile: function (accept) {
      return new Promise(function (resolve) {
        var input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
        input.click();
      });
    },

    readFile: function (file, as) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
        if (as === 'dataurl') r.readAsDataURL(file); else r.readAsText(file);
      });
    },

    /* Format téléphone : écran étroit, ou trop bas pour une barre latérale
       (un iPhone en paysage fait 852 px de large mais 393 de haut). */
    MOBILE_QUERY: '(max-width:819px),(max-height:599px)',
    isMobile: function () { return window.matchMedia(util.MOBILE_QUERY).matches; },
    isApple: function () { return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent); },
    modKey: function () { return util.isApple() ? '⌘' : 'Ctrl'; }
  };

  L.util = util;
})(window.LifeOS = window.LifeOS || {});
