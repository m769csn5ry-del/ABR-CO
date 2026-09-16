/* ==========================================================================
   LifeOS — graphiques
   Dessinés au canvas, sans bibliothèque. Ils lisent les couleurs du thème
   en cours : un passage en mode sombre les redessine aux bonnes teintes.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function palette() {
    return {
      ink: cssVar('--ink', '#111'),
      soft: cssVar('--ink-3', '#777'),
      faint: cssVar('--ink-4', '#999'),
      line: cssVar('--line', 'rgba(0,0,0,.1)'),
      lineSoft: cssVar('--line-soft', 'rgba(0,0,0,.05)'),
      accent: cssVar('--accent', '#111'),
      surface: cssVar('--surface', '#fff'),
      positive: cssVar('--positive', '#1B7F5A'),
      danger: cssVar('--danger', '#B23A32'),
      warning: cssVar('--warning', '#9A6B12'),
      info: cssVar('--info', '#2C5AA0')
    };
  }

  /* Crée un canvas qui se redessine à chaque changement de taille ou de
     thème — une seule mécanique pour tous les graphiques. */
  function makeCanvas(height, draw) {
    var canvas = h('canvas.chart', { style: { width: '100%', height: height + 'px', display: 'block' } });
    var wrap = h('div.chart', [canvas]);

    function render() {
      var w = wrap.clientWidth || wrap.parentNode && wrap.parentNode.clientWidth || 320;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.round(height * dpr);
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);
      draw(ctx, w, height, palette());
    }

    wrap._render = render;
    requestAnimationFrame(render);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(L.util.throttle(render, 120));
      ro.observe(wrap);
    } else {
      window.addEventListener('resize', L.util.throttle(render, 200));
    }
    document.addEventListener('lifeos:theme', render);
    return wrap;
  }

  function niceMax(value) {
    if (value <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(value)));
    var n = value / exp;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * exp;
  }

  /* Palette catégorielle : teintes désaturées, écartées les unes des autres,
     lisibles sur fond clair comme sur fond sombre. Sert aux domaines, aux
     catégories de dépense et aux graphiques à parts. */
  var CATEGORICAL = [
    '#3C6E9F', '#3F8F7A', '#A9761A', '#B2554A', '#6B5FA8',
    '#2F7F8C', '#8A6A9B', '#7A8590', '#4B7F52', '#9A5B3C'
  ];

  var Charts = {
    palette: palette,
    CATEGORICAL: CATEGORICAL,
    colorAt: function (i) { return CATEGORICAL[i % CATEGORICAL.length]; },

    /* --- courbe --- */
    line: function (points, opts) {
      opts = opts || {};
      return makeCanvas(opts.height || 160, function (ctx, w, hgt, c) {
        if (!points.length) return;
        var padL = opts.labels === false ? 4 : 34, padR = 8, padT = 10, padB = opts.labels === false ? 4 : 20;
        var max = opts.max !== undefined ? opts.max : niceMax(Math.max.apply(null, points.map(function (p) { return p.value; })));
        var min = opts.min !== undefined ? opts.min : 0;
        var plotW = w - padL - padR, plotH = hgt - padT - padB;
        var x = function (i) { return padL + (points.length === 1 ? plotW / 2 : i / (points.length - 1) * plotW); };
        var y = function (v) { return padT + plotH - ((v - min) / (max - min || 1)) * plotH; };

        /* grille horizontale */
        ctx.strokeStyle = c.lineSoft; ctx.lineWidth = 1;
        ctx.fillStyle = c.faint; ctx.font = '10px ' + cssVar('--ui', 'sans-serif');
        for (var g = 0; g <= 2; g++) {
          var v = min + (max - min) * (g / 2);
          var yy = Math.round(y(v)) + 0.5;
          ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
          if (opts.labels !== false) {
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(opts.format ? opts.format(v) : Math.round(v), padL - 6, yy);
          }
        }

        /* repère « attendu » (progression théorique d'un objectif) */
        if (opts.reference) {
          ctx.save();
          ctx.setLineDash([4, 4]); ctx.strokeStyle = c.faint; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x(0), y(opts.reference.from));
          ctx.lineTo(x(points.length - 1), y(opts.reference.to));
          ctx.stroke();
          ctx.restore();
        }

        /* aire + trait */
        var color = opts.color || c.accent;
        ctx.beginPath();
        points.forEach(function (p, i) { i ? ctx.lineTo(x(i), y(p.value)) : ctx.moveTo(x(i), y(p.value)); });
        if (opts.area !== false) {
          ctx.save();
          ctx.lineTo(x(points.length - 1), padT + plotH);
          ctx.lineTo(x(0), padT + plotH);
          ctx.closePath();
          var grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
          grad.addColorStop(0, hexA(color, 0.16));
          grad.addColorStop(1, hexA(color, 0));
          ctx.fillStyle = grad; ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        points.forEach(function (p, i) { i ? ctx.lineTo(x(i), y(p.value)) : ctx.moveTo(x(i), y(p.value)); });
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();

        /* dernier point mis en évidence */
        var last = points[points.length - 1];
        ctx.beginPath(); ctx.arc(x(points.length - 1), y(last.value), 3.2, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = c.surface; ctx.lineWidth = 2; ctx.stroke();

        if (opts.labels !== false) {
          ctx.fillStyle = c.faint; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          var every = Math.ceil(points.length / Math.max(2, Math.floor(w / 62)));
          points.forEach(function (p, i) {
            if (i % every && i !== points.length - 1) return;
            ctx.fillText(p.label || '', x(i), hgt - padB + 5);
          });
        }
      });
    },

    /* --- barres (simples ou groupées) --- */
    bars: function (groups, opts) {
      opts = opts || {};
      return makeCanvas(opts.height || 170, function (ctx, w, hgt, c) {
        if (!groups.length) return;
        var series = opts.series || [{ key: 'value', color: c.accent }];
        var padL = opts.labels === false ? 4 : 36, padR = 8, padT = 10, padB = 22;
        var maxVal = 0;
        groups.forEach(function (g) { series.forEach(function (s) { maxVal = Math.max(maxVal, Math.abs(g[s.key] || 0)); }); });
        var max = niceMax(maxVal);
        var plotW = w - padL - padR, plotH = hgt - padT - padB;
        var slot = plotW / groups.length;
        var barW = Math.max(3, Math.min(opts.barWidth || 16, (slot - 6) / series.length));

        ctx.strokeStyle = c.lineSoft; ctx.fillStyle = c.faint;
        ctx.font = '10px ' + cssVar('--ui', 'sans-serif');
        for (var g2 = 0; g2 <= 2; g2++) {
          var v = max * (g2 / 2);
          var yy = Math.round(padT + plotH - (v / max) * plotH) + 0.5;
          ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
          if (opts.labels !== false) {
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(opts.format ? opts.format(v) : Math.round(v), padL - 6, yy);
          }
        }

        groups.forEach(function (grp, i) {
          var cx = padL + slot * i + slot / 2;
          var offset = -(series.length * barW + (series.length - 1) * 3) / 2;
          series.forEach(function (s, si) {
            var value = Math.abs(grp[s.key] || 0);
            var bh = Math.max(value > 0 ? 2 : 0, (value / max) * plotH);
            var bx = cx + offset + si * (barW + 3);
            var by = padT + plotH - bh;
            ctx.fillStyle = s.color || c.accent;
            roundRect(ctx, bx, by, barW, bh, Math.min(4, barW / 2));
            ctx.fill();
          });
          ctx.fillStyle = c.faint; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          var every = Math.ceil(groups.length / Math.max(2, Math.floor(w / 46)));
          if (!(i % every)) ctx.fillText(grp.label || '', cx, hgt - padB + 5);
        });
      });
    },

    /* --- anneau --- */
    donut: function (slices, opts) {
      opts = opts || {};
      return makeCanvas(opts.height || 180, function (ctx, w, hgt, c) {
        var total = L.util.sum(slices, function (s) { return s.value; });
        var cx = w / 2, cy = hgt / 2;
        var r = Math.min(w, hgt) / 2 - 6;
        var inner = r * (opts.thickness === undefined ? 0.62 : opts.thickness);
        if (!total) {
          ctx.strokeStyle = c.lineSoft; ctx.lineWidth = r - inner;
          ctx.beginPath(); ctx.arc(cx, cy, (r + inner) / 2, 0, Math.PI * 2); ctx.stroke();
          return;
        }
        var angle = -Math.PI / 2;
        slices.forEach(function (s) {
          var span = (s.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle, angle + span);
          ctx.arc(cx, cy, inner, angle + span, angle, true);
          ctx.closePath();
          ctx.fillStyle = s.color || c.accent;
          ctx.fill();
          ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.stroke();
          angle += span;
        });
        if (opts.center) {
          ctx.fillStyle = c.ink;
          ctx.font = '600 15px ' + cssVar('--ui', 'sans-serif');
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(opts.center, cx, cy - (opts.centerSub ? 7 : 0));
          if (opts.centerSub) {
            ctx.fillStyle = c.faint;
            ctx.font = '11px ' + cssVar('--ui', 'sans-serif');
            ctx.fillText(opts.centerSub, cx, cy + 10);
          }
        }
      });
    },

    /* --- courbe minuscule, sans axes --- */
    spark: function (values, opts) {
      opts = opts || {};
      return makeCanvas(opts.height || 34, function (ctx, w, hgt, c) {
        if (values.length < 2) return;
        var max = Math.max.apply(null, values) || 1;
        var min = Math.min.apply(null, values);
        var span = max - min || 1;
        ctx.beginPath();
        values.forEach(function (v, i) {
          var x = (i / (values.length - 1)) * (w - 2) + 1;
          var y = hgt - 2 - ((v - min) / span) * (hgt - 4);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.strokeStyle = opts.color || c.accent;
        ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();
      });
    },

    /* --- carte de régularité (habitudes) --- */
    heatmap: function (days, opts) {
      opts = opts || {};
      var cells = days.map(function (d) {
        var level = d.scheduled ? Math.ceil(L.util.clamp(d.ratio, 0, 1) * 4) : 0;
        return L.h('div.heat__cell', {
          'data-v': String(level),
          'data-miss': d.scheduled && !d.done ? '1' : null,
          title: L.date.format(d.date, 'short') + ' · ' + (d.done ? 'fait' : d.scheduled ? 'manqué' : 'non prévu')
        });
      });
      return L.h('div.heat', cells);
    },

    /* --- barres horizontales étiquetées --- */
    ranking: function (items, opts) {
      opts = opts || {};
      var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
      return L.h('div.col', items.map(function (item) {
        return L.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } }, [
          L.h('div.between.t-xs', [
            L.h('span.truncate', [item.color ? L.dom.dot(item.color) : null, ' ', item.label]),
            L.h('span.num.muted', opts.format ? opts.format(item.value) : String(item.value))
          ]),
          L.dom.bar(item.value / max, opts.variant, { thin: true })
        ]);
      }));
    }
  };

  function roundRect(ctx, x, y, w, h2, r) {
    var radius = Math.min(r, w / 2, h2 / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h2, radius);
    ctx.arcTo(x + w, y + h2, x, y + h2, radius);
    ctx.arcTo(x, y + h2, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /* Transparence appliquée à une couleur quelle que soit sa notation. */
  function hexA(color, alpha) {
    var c = String(color).trim();
    if (c[0] === '#') {
      var hex = c.slice(1);
      if (hex.length === 3) hex = hex.split('').map(function (x) { return x + x; }).join('');
      var n = parseInt(hex, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }
    if (c.indexOf('rgb') === 0) {
      var nums = c.match(/[\d.]+/g) || [0, 0, 0];
      return 'rgba(' + nums[0] + ',' + nums[1] + ',' + nums[2] + ',' + alpha + ')';
    }
    return c;
  }

  L.charts = Charts;
})(window.LifeOS = window.LifeOS || {});
