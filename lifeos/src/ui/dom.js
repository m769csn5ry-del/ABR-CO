/* ==========================================================================
   LifeOS — fabrique d'éléments
   Pas de moteur de gabarits : une fonction `h()` qui crée des nœuds. Le
   texte injecté passe toujours par textContent, donc rien de ce que l'on
   saisit ne peut devenir du balisage.
   ========================================================================== */
(function (L) {
  'use strict';

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    if (child instanceof Node) { node.appendChild(child); return; }
    node.appendChild(document.createTextNode(String(child)));
  }

  /* h('div.card#id', {attrs}, children) — les deux derniers sont optionnels. */
  function h(selector, attrs, children) {
    if (attrs && (Array.isArray(attrs) || attrs instanceof Node || typeof attrs === 'string' || typeof attrs === 'number')) {
      children = attrs; attrs = null;
    }
    var parts = String(selector).split(/([.#])/);
    var tag = parts[0] || 'div';
    var node = document.createElement(tag);
    for (var i = 1; i < parts.length; i += 2) {
      if (parts[i] === '.') node.classList.add(parts[i + 1]);
      else node.id = parts[i + 1];
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class' || key === 'className') { String(value).split(/\s+/).filter(Boolean).forEach(function (c) { node.classList.add(c); }); }
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;   // réservé aux icônes internes
        else if (key.indexOf('on') === 0 && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key in node && key !== 'list' && key !== 'type' && key !== 'form') {
          try { node[key] = value; } catch (e) { node.setAttribute(key, value); }
        } else node.setAttribute(key, value === true ? '' : value);
      });
    }
    append(node, children);
    return node;
  }

  var DOM = {
    h: h,

    frag: function (children) {
      var f = document.createDocumentFragment();
      append(f, children);
      return f;
    },

    clear: function (node) {
      while (node && node.firstChild) node.removeChild(node.firstChild);
      return node;
    },

    mount: function (node, children) {
      DOM.clear(node);
      append(node, children);
      return node;
    },

    on: function (node, evt, sel, fn) {
      node.addEventListener(evt, function (e) {
        var target = e.target.closest(sel);
        if (target && node.contains(target)) fn(e, target);
      });
    },

    /* Petits composants réutilisés partout. */
    chip: function (label, opts) {
      opts = opts || {};
      return h('span.chip' + (opts.variant ? '.chip--' + opts.variant : ''), {
        title: opts.title || null,
        style: opts.color ? { color: opts.color } : null
      }, [opts.icon ? L.icon(opts.icon) : null, label]);
    },

    dot: function (color) { return h('span.dot', { style: { background: color || 'var(--ink-4)' } }); },

    bar: function (ratio, variant, opts) {
      opts = opts || {};
      return h('div.bar' + (opts.thin ? '.bar--thin' : ''), { title: opts.title || null }, [
        h('div.bar__fill' + (variant ? '.bar__fill--' + variant : ''), {
          style: { width: L.util.clamp((ratio || 0) * 100, 0, 100) + '%' }
        })
      ]);
    },

    /* Anneau de progression (SVG) : lisible même à 24 px. */
    ring: function (ratio, size, opts) {
      opts = opts || {};
      var s = size || 34, stroke = opts.stroke || 3;
      var r = (s - stroke) / 2, c = 2 * Math.PI * r;
      var value = L.util.clamp(ratio || 0, 0, 1);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', s); svg.setAttribute('height', s);
      svg.setAttribute('viewBox', '0 0 ' + s + ' ' + s);
      svg.innerHTML =
        '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + (opts.color || 'var(--accent)') + '" stroke-width="' + stroke + '"' +
        ' stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - value)) + '"' +
        ' transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/>';
      return h('div.ring', [svg, opts.label === false ? null : h('span.ring__value', opts.label || Math.round(value * 100) + '')]);
    },

    checkbox: function (checked, onToggle, opts) {
      opts = opts || {};
      return h('button.checkbox' + (opts.round ? '.checkbox--round' : ''), {
        type: 'button',
        role: 'checkbox',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': opts.label || 'Terminer',
        onclick: function (e) { e.stopPropagation(); onToggle(!checked); }
      }, L.icon('check-small'));
    },

    toggle: function (checked, onToggle, label) {
      return h('button.switch', {
        type: 'button', role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label || 'Activer',
        onclick: function () { onToggle(!checked); }
      });
    },

    segmented: function (items, active, onPick) {
      return h('div.segmented', { role: 'tablist' }, items.map(function (item) {
        return h('button.segmented__item', {
          role: 'tab', type: 'button',
          'aria-selected': item.id === active ? 'true' : 'false',
          onclick: function () { onPick(item.id); }
        }, [item.icon ? L.icon(item.icon) : null, item.label]);
      }));
    },

    empty: function (icon, title, text, action) {
      return h('div.empty', [
        L.icon(icon || 'inbox'),
        h('div.empty__title', title || 'Rien ici'),
        text ? h('p.empty__text', text) : null,
        action || null
      ]);
    },

    field: function (label, control, hint) {
      return h('label.field', [
        label ? h('span.field__label', label) : null,
        control,
        hint ? h('span.field__hint', hint) : null
      ]);
    },

    /* Rend un texte multi-lignes sans jamais interpréter de balise. */
    text: function (value, cls) {
      var node = h(cls ? 'div.' + cls : 'div');
      node.textContent = value === null || value === undefined ? '' : String(value);
      return node;
    }
  };

  L.dom = DOM;
  L.h = h;
})(window.LifeOS = window.LifeOS || {});
