/* ==========================================================================
   LifeOS — messages, fenêtres et menus
   Sur ordinateur une fenêtre centrée, sur téléphone une feuille qui monte :
   c'est le même composant, la feuille de style décide de la forme.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h;
  var stack = [];

  /* ---------------- messages fugaces ---------------- */
  var toastHost = null;
  function host() {
    if (!toastHost) {
      toastHost = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }

  L.toast = {
    show: function (message, opts) {
      opts = opts || {};
      var node = h('div.toast', [
        opts.icon ? L.icon(opts.icon) : null,
        h('span.grow', message),
        opts.action ? h('button.toast__action', {
          onclick: function () { opts.action.run(); close(); }
        }, opts.action.label) : null
      ]);
      function close() {
        node.style.transition = 'opacity .18s, transform .18s';
        node.style.opacity = '0';
        node.style.transform = 'translateY(8px)';
        setTimeout(function () { node.remove(); }, 200);
      }
      host().appendChild(node);
      setTimeout(close, opts.duration || 3600);
      return close;
    },

    /* Message avec bouton « Annuler » : la pile d'historique du magasin
       permet de revenir en arrière sur n'importe quelle action nommée. */
    undo: function (message) {
      return L.toast.show(message, {
        action: { label: 'Annuler', run: function () { L.store.undo(); } },
        duration: 5200
      });
    },

    error: function (message) {
      return L.toast.show(message, { icon: 'alert', duration: 6000 });
    }
  };

  /* ---------------- fenêtres ---------------- */
  function open(build, opts) {
    opts = opts || {};
    var scrim = h('div.scrim' + (opts.scrimClass ? '.' + opts.scrimClass : ''), {
      onmousedown: function (e) { if (e.target === scrim && opts.dismissible !== false) close(); }
    });
    var api = { close: close, scrim: scrim, node: null };
    var node = build(api);
    api.node = node;
    scrim.appendChild(node);
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';
    stack.push(api);

    var focusable = node.querySelector('input,textarea,select,button');
    if (focusable && !L.util.isMobile()) setTimeout(function () { focusable.focus(); }, 60);

    function close(result) {
      var i = stack.indexOf(api);
      if (i > -1) stack.splice(i, 1);
      scrim.style.transition = 'opacity .16s';
      scrim.style.opacity = '0';
      setTimeout(function () {
        scrim.remove();
        if (!stack.length) document.body.style.overflow = '';
      }, 170);
      if (opts.onClose) opts.onClose(result);
    }
    return api;
  }

  function modal(opts) {
    return open(function (api) {
      var body = h('div.modal__body');
      var content = typeof opts.body === 'function' ? opts.body(api) : opts.body;
      L.dom.mount(body, content);
      return h('div.modal' + (opts.size === 'wide' ? '.modal--wide' : opts.size === 'narrow' ? '.modal--narrow' : ''), {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Fenêtre'
      }, [
        h('div.modal__head', [
          h('div.modal__title.grow', opts.title || ''),
          opts.headAction || null,
          h('button.iconbtn', { onclick: function () { api.close(); }, 'aria-label': 'Fermer' }, L.icon('x'))
        ]),
        body,
        opts.footer === null ? null : h('div.modal__foot' + (opts.footerSplit ? '.modal__foot--split' : ''),
          typeof opts.footer === 'function' ? opts.footer(api) : (opts.footer || [
            h('button.btn', { onclick: function () { api.close(); } }, 'Fermer')
          ]))
      ]);
    }, opts);
  }

  L.modal = {
    open: modal,
    raw: open,

    confirm: function (opts) {
      return new Promise(function (resolve) {
        var decided = false;
        modal({
          title: opts.title || 'Confirmer',
          size: 'narrow',
          body: h('p.t-s.muted', opts.text || ''),
          footer: function (api) {
            return [
              h('button.btn', { onclick: function () { decided = true; api.close(); resolve(false); } }, opts.cancel || 'Annuler'),
              h('button.btn' + (opts.danger ? '.btn--danger' : '.btn--primary'), {
                onclick: function () { decided = true; api.close(); resolve(true); }
              }, opts.confirm || 'Confirmer')
            ];
          },
          onClose: function () { if (!decided) resolve(false); }
        });
      });
    },

    prompt: function (opts) {
      return new Promise(function (resolve) {
        var input = h(opts.multiline ? 'textarea.textarea' : 'input.input', {
          value: opts.value || '', placeholder: opts.placeholder || '',
          onkeydown: function (e) { if (e.key === 'Enter' && !opts.multiline) { e.preventDefault(); done(); } }
        });
        var decided = false, api = null;
        function done() { decided = true; api.close(); resolve(input.value.trim() || null); }
        api = modal({
          title: opts.title || 'Saisir',
          size: 'narrow',
          body: L.dom.field(opts.label || null, input, opts.hint),
          footer: function (m) {
            return [
              h('button.btn', { onclick: function () { decided = true; m.close(); resolve(null); } }, 'Annuler'),
              h('button.btn.btn--primary', { onclick: done }, opts.confirm || 'Valider')
            ];
          },
          onClose: function () { if (!decided) resolve(null); }
        });
      });
    },

    closeTop: function () { if (stack.length) stack[stack.length - 1].close(); },
    depth: function () { return stack.length; }
  };

  /* ---------------- menus contextuels ---------------- */
  var openMenu = null;

  L.menu = function (anchor, items, opts) {
    opts = opts || {};
    if (openMenu) openMenu.remove();
    var node = h('div.menu', { role: 'menu' }, items.map(function (item) {
      if (item === '-') return h('div.menu__sep');
      if (item.label && item.header) return h('div.menu__label', item.label);
      return h('button.menu__item' + (item.danger ? '.menu__item--danger' : ''), {
        role: 'menuitem',
        onclick: function (e) {
          e.stopPropagation();
          hide();
          if (item.run) item.run();
        }
      }, [
        item.icon ? L.icon(item.icon) : null,
        h('span.grow', item.label),
        item.hint ? h('span.faint.t-xs', item.hint) : null,
        item.checked ? L.icon('check-small') : null
      ]);
    }));

    document.body.appendChild(node);
    openMenu = node;

    var rect = anchor.getBoundingClientRect();
    var mw = node.offsetWidth, mh = node.offsetHeight;
    var left = opts.align === 'right' ? rect.right - mw : rect.left;
    left = L.util.clamp(left, 8, window.innerWidth - mw - 8);
    var top = rect.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - 6);
    node.style.left = left + 'px';
    node.style.top = top + 'px';

    function hide() {
      node.remove();
      if (openMenu === node) openMenu = null;
      document.removeEventListener('mousedown', outside, true);
      document.removeEventListener('keydown', esc, true);
      window.removeEventListener('scroll', hide, true);
    }
    function outside(e) { if (!node.contains(e.target)) hide(); }
    function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); hide(); } }
    setTimeout(function () {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', esc, true);
      window.addEventListener('scroll', hide, true);
    }, 0);
    return hide;
  };

  /* Échap ferme la fenêtre du dessus, jamais toute la pile. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) {
      e.preventDefault();
      L.modal.closeTop();
    }
  });
})(window.LifeOS = window.LifeOS || {});
