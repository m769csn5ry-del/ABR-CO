/* ==========================================================================
   LifeOS — dates
   Convention unique dans toute l'app : une date = 'AAAA-MM-JJ' (heure locale),
   une heure = 'HH:MM', une durée = un nombre de minutes.
   On ne manipule jamais d'horodatage UTC pour un jour de calendrier : un
   rendez-vous du 16 reste le 16, quel que soit le fuseau.
   ========================================================================== */
(function (L) {
  'use strict';

  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var DAYS_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin',
                      'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var D = {
    DAYS: DAYS, DAYS_SHORT: DAYS_SHORT, MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT,

    /* --- conversions --- */
    iso: function (d) {
      d = d || new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    parse: function (isoStr) {
      if (!isoStr) return null;
      var p = String(isoStr).slice(0, 10).split('-');
      if (p.length !== 3) return null;
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return isNaN(d.getTime()) ? null : d;
    },
    today: function () { return D.iso(new Date()); },
    nowTime: function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    nowMinutes: function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); },

    toMinutes: function (hhmm) {
      if (!hhmm) return null;
      var m = String(hhmm).match(/^(\d{1,2})[:h.](\d{2})?/);
      if (!m) return null;
      return (+m[1]) * 60 + (+(m[2] || 0));
    },
    toTime: function (minutes) {
      var m = Math.max(0, Math.round(minutes));
      return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
    },

    /* --- arithmétique --- */
    addDays: function (isoStr, n) {
      var d = D.parse(isoStr) || new Date();
      d.setDate(d.getDate() + n);
      return D.iso(d);
    },
    addMonths: function (isoStr, n) {
      var d = D.parse(isoStr) || new Date();
      var day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + n);
      d.setDate(Math.min(day, D.daysInMonth(d.getFullYear(), d.getMonth())));
      return D.iso(d);
    },
    daysInMonth: function (y, m) { return new Date(y, m + 1, 0).getDate(); },
    diffDays: function (a, b) {
      var da = D.parse(a), db = D.parse(b);
      if (!da || !db) return 0;
      return Math.round((db - da) / 86400000);
    },
    dow: function (isoStr) { var d = D.parse(isoStr); return d ? d.getDay() : 0; },

    startOfWeek: function (isoStr, firstDay) {
      var d = D.parse(isoStr) || new Date();
      var first = firstDay === undefined ? 1 : firstDay;
      var shift = (d.getDay() - first + 7) % 7;
      d.setDate(d.getDate() - shift);
      return D.iso(d);
    },
    endOfWeek: function (isoStr, firstDay) { return D.addDays(D.startOfWeek(isoStr, firstDay), 6); },
    startOfMonth: function (isoStr) { var d = D.parse(isoStr) || new Date(); return D.iso(new Date(d.getFullYear(), d.getMonth(), 1)); },
    endOfMonth: function (isoStr) { var d = D.parse(isoStr) || new Date(); return D.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); },
    startOfYear: function (isoStr) { var d = D.parse(isoStr) || new Date(); return D.iso(new Date(d.getFullYear(), 0, 1)); },
    endOfYear: function (isoStr) { var d = D.parse(isoStr) || new Date(); return D.iso(new Date(d.getFullYear(), 11, 31)); },

    range: function (fromISO, toISO) {
      var out = [], cur = fromISO, guard = 0;
      while (cur <= toISO && guard++ < 1500) { out.push(cur); cur = D.addDays(cur, 1); }
      return out;
    },

    monthKey: function (isoStr) { return String(isoStr).slice(0, 7); },

    /* Semaine ISO 8601 : 'AAAA-Snn'. */
    weekKey: function (isoStr) {
      var d = D.parse(isoStr) || new Date();
      var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
      var week1 = new Date(t.getFullYear(), 0, 4);
      var n = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return t.getFullYear() + '-S' + pad(n);
    },

    /* « mercredi 16 septembre » → « Mercredi 16 septembre » : en français,
       seule la première lettre prend la majuscule. */
    caps: function (text) {
      return String(text || '').replace(/^./, function (c) { return c.toUpperCase(); });
    },

    isToday: function (isoStr) { return isoStr === D.today(); },
    isPast: function (isoStr) { return !!isoStr && isoStr < D.today(); },
    isFuture: function (isoStr) { return !!isoStr && isoStr > D.today(); },
    isWeekend: function (isoStr) { var w = D.dow(isoStr); return w === 0 || w === 6; },

    /* --- libellés --- */
    dayName: function (isoStr) { return DAYS[D.dow(isoStr)]; },
    dayShort: function (isoStr) { return DAYS_SHORT[D.dow(isoStr)]; },
    monthName: function (isoStr) { var d = D.parse(isoStr); return d ? MONTHS[d.getMonth()] : ''; },

    /* '16 septembre', 'lundi 16 septembre', '16 sept. 2026' selon le style. */
    format: function (isoStr, style) {
      var d = D.parse(isoStr);
      if (!d) return '';
      var day = d.getDate(), m = d.getMonth(), y = d.getFullYear();
      switch (style) {
        case 'full':  return DAYS[d.getDay()] + ' ' + day + ' ' + MONTHS[m] + ' ' + y;
        case 'long':  return DAYS[d.getDay()] + ' ' + day + ' ' + MONTHS[m];
        case 'short': return day + ' ' + MONTHS_SHORT[m] + (MONTHS_SHORT[m] === MONTHS[m] ? '' : '.');
        case 'num':   return pad(day) + '/' + pad(m + 1) + '/' + y;
        case 'numS':  return pad(day) + '/' + pad(m + 1);
        case 'month': return MONTHS[m] + ' ' + y;
        case 'dayNum': return DAYS_SHORT[d.getDay()] + ' ' + day;
        default:      return day + ' ' + MONTHS[m] + (y !== new Date().getFullYear() ? ' ' + y : '');
      }
    },

    /* « Aujourd'hui », « Demain », « Il y a 3 jours », « Dans 2 semaines ». */
    relative: function (isoStr, opts) {
      if (!isoStr) return '';
      var n = D.diffDays(D.today(), isoStr);
      var caps = !opts || opts.caps !== false;
      if (n === 0) return caps ? "Aujourd'hui" : "aujourd'hui";
      if (n === 1) return caps ? 'Demain' : 'demain';
      if (n === -1) return caps ? 'Hier' : 'hier';
      if (n === 2) return caps ? 'Après-demain' : 'après-demain';
      if (n > 2 && n <= 6) return (caps ? '' : '') + DAYS[D.dow(isoStr)].replace(/^./, function (c) { return caps ? c.toUpperCase() : c; });
      if (n < -1 && n >= -6) return 'Il y a ' + (-n) + ' jours';
      if (n > 6 && n <= 30) return 'Dans ' + n + ' jours';
      if (n < -6 && n >= -60) return 'Il y a ' + Math.round(-n / 7) + ' semaines';
      return D.format(isoStr, 'short');
    },

    /* Durée en minutes → « 45 min », « 1 h 30 », « 2 h ». */
    duration: function (minutes, opts) {
      var m = Math.round(minutes || 0);
      if (!m) return (opts && opts.zero) || '—';
      var sign = m < 0 ? '-' : ''; m = Math.abs(m);
      if (m < 60) return sign + m + ' min';
      var h = Math.floor(m / 60), r = m % 60;
      if (opts && opts.long) return sign + h + ' h' + (r ? ' ' + pad(r) : '') + (h > 1 ? '' : '');
      return sign + h + ' h' + (r ? ' ' + pad(r) : '');
    },

    /* --- récurrences ---
       { freq:'daily'|'weekly'|'monthly'|'yearly', interval:1, days:[1,3,5], until:'AAAA-MM-JJ' } */
    matchesRecurrence: function (rec, isoStr, anchorISO) {
      if (!rec || !rec.freq) return false;
      if (rec.until && isoStr > rec.until) return false;
      var anchor = anchorISO || rec.start || isoStr;
      if (isoStr < anchor) return false;
      var step = Math.max(1, rec.interval || 1);
      switch (rec.freq) {
        case 'daily':
          return D.diffDays(anchor, isoStr) % step === 0;
        case 'weekly': {
          var days = (rec.days && rec.days.length) ? rec.days : [D.dow(anchor)];
          if (days.indexOf(D.dow(isoStr)) === -1) return false;
          var wa = D.startOfWeek(anchor), wb = D.startOfWeek(isoStr);
          return Math.round(D.diffDays(wa, wb) / 7) % step === 0;
        }
        case 'monthly': {
          var a = D.parse(anchor), b = D.parse(isoStr);
          if (!a || !b) return false;
          var months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
          if (months < 0 || months % step !== 0) return false;
          var target = Math.min(a.getDate(), D.daysInMonth(b.getFullYear(), b.getMonth()));
          return b.getDate() === target;
        }
        case 'yearly': {
          var ya = D.parse(anchor), yb = D.parse(isoStr);
          if (!ya || !yb) return false;
          return (yb.getFullYear() - ya.getFullYear()) % step === 0 &&
                 ya.getMonth() === yb.getMonth() && ya.getDate() === yb.getDate();
        }
      }
      return false;
    },

    nextOccurrence: function (rec, fromISO, anchorISO) {
      var cur = fromISO || D.today();
      for (var i = 0; i < 800; i++) {
        if (D.matchesRecurrence(rec, cur, anchorISO)) return cur;
        if (rec && rec.until && cur > rec.until) return null;
        cur = D.addDays(cur, 1);
      }
      return null;
    },

    recurrenceLabel: function (rec) {
      if (!rec || !rec.freq) return 'Jamais';
      var n = Math.max(1, rec.interval || 1);
      if (rec.freq === 'daily') return n === 1 ? 'Tous les jours' : 'Tous les ' + n + ' jours';
      if (rec.freq === 'weekly') {
        var d = (rec.days || []).slice().sort().map(function (x) { return DAYS_SHORT[x]; }).join(', ');
        var base = n === 1 ? 'Chaque semaine' : 'Toutes les ' + n + ' semaines';
        return d ? base + ' · ' + d : base;
      }
      if (rec.freq === 'monthly') return n === 1 ? 'Chaque mois' : 'Tous les ' + n + ' mois';
      if (rec.freq === 'yearly') return 'Chaque année';
      return 'Jamais';
    }
  };

  L.date = D;
})(window.LifeOS = window.LifeOS || {});
