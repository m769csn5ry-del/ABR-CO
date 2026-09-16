/* ==========================================================================
   LifeOS — navigation
   L'adresse reflète l'écran : on peut recharger la page, revenir en
   arrière, ou garder un lien vers « Tâches → domaine Études ».
   ========================================================================== */
(function (L) {
  'use strict';

  var bus = L.util.emitter();
  var current = { view: 'home', params: {} };
  var history = [];

  function encode(view, params) {
    var query = Object.keys(params || {})
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return '#/' + view + (query ? '?' + query : '');
  }

  function decode(hash) {
    var raw = String(hash || '').replace(/^#\/?/, '');
    if (!raw) return { view: 'home', params: {} };
    var parts = raw.split('?');
    var view = parts[0] || 'home';
    var params = {};
    (parts[1] || '').split('&').filter(Boolean).forEach(function (pair) {
      var kv = pair.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { view: view, params: params };
  }

  var Router = {
    on: bus.on,
    current: function () { return current; },
    params: function () { return current.params; },

    go: function (view, params, opts) {
      var known = L.schema.SECTIONS.some(function (s) { return s.id === view; });
      if (!known) view = 'home';
      history.push(current);
      if (history.length > 30) history.shift();
      current = { view: view, params: params || {} };
      var hash = encode(view, current.params);
      if (location.hash !== hash) {
        if (opts && opts.replace) location.replace(hash);
        else location.hash = hash;
      } else {
        bus.emit('change', current);
      }
    },

    setParams: function (params, opts) {
      Router.go(current.view, Object.assign({}, current.params, params), opts);
    },

    back: function () {
      if (history.length) {
        var prev = history.pop();
        current = prev;
        location.hash = encode(prev.view, prev.params);
      } else {
        Router.go('home');
      }
    },

    init: function () {
      window.addEventListener('hashchange', function () {
        current = decode(location.hash);
        bus.emit('change', current);
      });
      current = decode(location.hash);
      if (!location.hash) location.replace(encode(current.view, current.params));
      bus.emit('change', current);
    }
  };

  L.router = Router;
})(window.LifeOS = window.LifeOS || {});
