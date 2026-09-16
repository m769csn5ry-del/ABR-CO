/* ==========================================================================
   LifeOS — mise en forme des nombres
   La devise et la langue viennent des réglages : rien n'est codé en dur
   ailleurs que dans ce fichier.
   ========================================================================== */
(function (L) {
  'use strict';

  var cache = {};
  function nf(key, opts) {
    if (!cache[key]) {
      try { cache[key] = new Intl.NumberFormat(L.format.locale, opts); }
      catch (e) { cache[key] = { format: function (n) { return String(n); } }; }
    }
    return cache[key];
  }

  var F = {
    locale: 'fr-FR',
    currency: 'EUR',

    setup: function (locale, currency) {
      F.locale = locale || 'fr-FR';
      F.currency = currency || 'EUR';
      cache = {};
    },

    /* 1 234,50 € — le signe n'est affiché que si on le demande. */
    money: function (amount, opts) {
      opts = opts || {};
      var n = Number(amount) || 0;
      /* « 1 530 € » se lit mieux que « 1 530,00 € » ; les centimes ne
         s'affichent que s'il y en a. */
      var dec = opts.decimals === undefined ? (Math.round(n) === n ? 0 : 2) : opts.decimals;
      var f = nf('m' + dec + (opts.compact ? 'c' : ''), {
        style: 'currency', currency: F.currency,
        minimumFractionDigits: dec, maximumFractionDigits: dec,
        notation: opts.compact ? 'compact' : 'standard'
      });
      var out = f.format(Math.abs(n));
      if (opts.sign) return (n > 0 ? '+' : n < 0 ? '−' : '') + out;
      return (n < 0 ? '−' : '') + out;
    },

    number: function (n, dec) {
      return nf('n' + (dec || 0), { minimumFractionDigits: dec || 0, maximumFractionDigits: dec === undefined ? 2 : dec })
        .format(Number(n) || 0);
    },

    compact: function (n) { return nf('cp', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0); },

    percent: function (ratio, dec) {
      var v = (Number(ratio) || 0) * 100;
      return F.number(v, dec === undefined ? (Math.abs(v) < 10 ? 1 : 0) : dec) + ' %';
    },

    /* Quantité + unité pour les objectifs et les habitudes. */
    quantity: function (value, unit) {
      var u = (unit || '').trim();
      if (u === '€' || L.util.fold(u) === 'eur' || L.util.fold(u) === 'euros') return F.money(value);
      if (u === 'min' || u === 'minutes') return L.date.duration(value);
      if (u === 'h' || u === 'heures') return F.number(value, 1) + ' h';
      if (u === '%') return F.number(value, 0) + ' %';
      return F.number(value, Number.isInteger(Number(value)) ? 0 : 1) + (u ? ' ' + u : '');
    },

    /* Découpe un montant tapé à la main : « 12,50 », « 12.5 €», « 1 200 ». */
    parseAmount: function (str) {
      if (typeof str === 'number') return str;
      var s = String(str || '').replace(/[^\d,.\-]/g, '').replace(/\s/g, '');
      if (!s) return null;
      if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(',', '.');
      var n = parseFloat(s);
      return isNaN(n) ? null : n;
    },

    fileSize: function (bytes) {
      var b = Number(bytes) || 0;
      if (b < 1024) return b + ' o';
      if (b < 1048576) return F.number(b / 1024, 0) + ' Ko';
      return F.number(b / 1048576, 1) + ' Mo';
    }
  };

  L.format = F;
})(window.LifeOS = window.LifeOS || {});
