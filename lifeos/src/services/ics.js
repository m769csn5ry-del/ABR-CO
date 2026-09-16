/* ==========================================================================
   LifeOS — passerelle calendrier (.ics)
   Le format .ics est le seul langage commun à Google Agenda, Apple Calendar
   et Outlook. On exporte ce que l'app contient (événements, tâches datées,
   échéances) et on importe un fichier ou un abonnement collé à la main.

   Une synchronisation bidirectionnelle automatique demande un serveur et un
   compte OAuth : l'adaptateur est prévu pour, l'import/export fonctionne
   dès maintenant sans rien installer.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(isoDate, hhmm) {
    var d = D.parse(isoDate);
    if (!d) return null;
    var mins = D.toMinutes(hhmm || '00:00') || 0;
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' +
      pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  function dateStamp(isoDate) { return String(isoDate).replace(/-/g, ''); }

  function esc(text) {
    return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\;')
      .replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function fold(line) {
    /* RFC 5545 : 75 octets par ligne, la suite commence par une espace. */
    if (line.length <= 73) return line;
    var out = [line.slice(0, 73)];
    for (var i = 73; i < line.length; i += 72) out.push(' ' + line.slice(i, i + 72));
    return out.join('\r\n');
  }

  function rrule(rec) {
    if (!rec || !rec.freq) return null;
    var map = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
    var parts = ['FREQ=' + map[rec.freq]];
    if (rec.interval && rec.interval > 1) parts.push('INTERVAL=' + rec.interval);
    if (rec.freq === 'weekly' && rec.days && rec.days.length) {
      var names = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      parts.push('BYDAY=' + rec.days.map(function (d) { return names[d]; }).join(','));
    }
    if (rec.until) parts.push('UNTIL=' + dateStamp(rec.until) + 'T235900Z');
    return parts.join(';');
  }

  var ICS = {
    /* --- export --- */
    build: function (opts) {
      opts = opts || {};
      var S = L.store.state;
      var lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LifeOS//FR', 'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH', 'X-WR-CALNAME:LifeOS'
      ];
      var now = stamp(D.today(), D.nowTime());

      S.events.forEach(function (e) {
        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + e.id + '@lifeos');
        lines.push('DTSTAMP:' + now + 'Z');
        if (e.allDay) {
          lines.push('DTSTART;VALUE=DATE:' + dateStamp(e.date));
          lines.push('DTEND;VALUE=DATE:' + dateStamp(D.addDays(e.date, 1)));
        } else {
          lines.push('DTSTART:' + stamp(e.date, e.start));
          lines.push('DTEND:' + stamp(e.date, e.end));
        }
        lines.push(fold('SUMMARY:' + esc(e.title)));
        if (e.location) lines.push(fold('LOCATION:' + esc(e.location)));
        if (e.notes) lines.push(fold('DESCRIPTION:' + esc(e.notes)));
        var r = rrule(e.recurrence);
        if (r) lines.push('RRULE:' + r);
        lines.push('END:VEVENT');
      });

      if (opts.tasks !== false) {
        S.tasks.forEach(function (t) {
          if (!t.date || !L.tasks.OPEN_STATUS[t.status]) return;
          lines.push('BEGIN:VEVENT');
          lines.push('UID:' + t.id + '@lifeos');
          lines.push('DTSTAMP:' + now + 'Z');
          if (t.time) {
            lines.push('DTSTART:' + stamp(t.date, t.time));
            lines.push('DTEND:' + stamp(t.date, D.toTime((D.toMinutes(t.time) || 0) + (t.estimate || 30))));
          } else {
            lines.push('DTSTART;VALUE=DATE:' + dateStamp(t.date));
            lines.push('DTEND;VALUE=DATE:' + dateStamp(D.addDays(t.date, 1)));
          }
          lines.push(fold('SUMMARY:' + esc(t.title)));
          if (t.notes) lines.push(fold('DESCRIPTION:' + esc(t.notes)));
          lines.push('CATEGORIES:LifeOS,Tâche');
          lines.push('END:VEVENT');
        });
      }

      if (opts.deadlines !== false) {
        S.tasks.forEach(function (t) {
          if (!t.due || !L.tasks.OPEN_STATUS[t.status]) return;
          lines.push('BEGIN:VEVENT');
          lines.push('UID:' + t.id + '-due@lifeos');
          lines.push('DTSTAMP:' + now + 'Z');
          lines.push('DTSTART;VALUE=DATE:' + dateStamp(t.due));
          lines.push('DTEND;VALUE=DATE:' + dateStamp(D.addDays(t.due, 1)));
          lines.push(fold('SUMMARY:' + esc('Échéance — ' + t.title)));
          lines.push('END:VEVENT');
        });
      }

      lines.push('END:VCALENDAR');
      return lines.join('\r\n');
    },

    download: function (opts) {
      L.util.download('lifeos-' + D.today() + '.ics', ICS.build(opts), 'text/calendar;charset=utf-8');
    },

    /* --- import --- */
    parse: function (text) {
      var unfolded = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
      var lines = unfolded.split(/\r?\n/);
      var events = [], cur = null;

      function unesc(v) {
        return String(v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',')
          .replace(/\;/g, ';').replace(/\\\\/g, '\\');
      }
      function parseWhen(value, params) {
        var allDay = /VALUE=DATE(?!-TIME)/.test(params || '');
        var m = String(value).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
        if (!m) return null;
        var date = m[1] + '-' + m[2] + '-' + m[3];
        if (allDay || !m[4]) return { date: date, time: null, allDay: true };
        if (m[7]) {
          /* Horodatage UTC : on repasse à l'heure locale de l'appareil. */
          var utc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
          return { date: D.iso(utc), time: D.toTime(utc.getHours() * 60 + utc.getMinutes()), allDay: false };
        }
        return { date: date, time: m[4] + ':' + m[5], allDay: false };
      }

      lines.forEach(function (raw) {
        var line = raw.trim();
        if (line === 'BEGIN:VEVENT') { cur = {}; return; }
        if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; return; }
        if (!cur) return;
        var idx = line.indexOf(':');
        if (idx === -1) return;
        var left = line.slice(0, idx), value = line.slice(idx + 1);
        var name = left.split(';')[0].toUpperCase();
        var params = left.slice(name.length);

        if (name === 'SUMMARY') cur.title = unesc(value);
        else if (name === 'LOCATION') cur.location = unesc(value);
        else if (name === 'DESCRIPTION') cur.notes = unesc(value);
        else if (name === 'UID') cur.uid = value;
        else if (name === 'DTSTART') cur._start = parseWhen(value, params);
        else if (name === 'DTEND') cur._end = parseWhen(value, params);
        else if (name === 'RRULE') cur._rrule = value;
      });

      return events.map(function (e) {
        var start = e._start || {};
        var end = e._end || {};
        var rec = null;
        if (e._rrule) {
          var parts = {};
          e._rrule.split(';').forEach(function (p) { var kv = p.split('='); parts[kv[0]] = kv[1]; });
          var freq = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }[parts.FREQ];
          if (freq) {
            var names = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
            rec = {
              freq: freq, interval: +(parts.INTERVAL || 1), start: start.date,
              days: parts.BYDAY ? parts.BYDAY.split(',').map(function (d) { return names[d.slice(-2)]; }).filter(function (x) { return x !== undefined; }) : null,
              until: parts.UNTIL ? parts.UNTIL.slice(0, 4) + '-' + parts.UNTIL.slice(4, 6) + '-' + parts.UNTIL.slice(6, 8) : null
            };
          }
        }
        return L.schema.make.event({
          title: e.title || 'Événement',
          date: start.date || D.today(),
          start: start.time || '09:00',
          end: end.time || D.toTime((D.toMinutes(start.time || '09:00') || 540) + 60),
          allDay: !!start.allDay,
          location: e.location || '', notes: e.notes || '',
          recurrence: rec, source: 'ics', uid: e.uid || null
        });
      });
    },

    /* Import : on ne recrée jamais un événement déjà présent (même UID,
       ou même titre au même horaire). */
    importText: function (text) {
      var parsed = ICS.parse(text);
      var added = 0, skipped = 0;
      L.store.update(function (s) {
        parsed.forEach(function (e) {
          var dup = s.events.some(function (x) {
            return (e.uid && x.uid === e.uid) ||
              (x.title === e.title && x.date === e.date && x.start === e.start);
          });
          if (dup) { skipped++; return; }
          s.events.push(e); added++;
        });
      }, 'Calendrier importé');
      L.notify && L.notify.reschedule();
      return { added: added, skipped: skipped, total: parsed.length };
    },

    importFile: function () {
      return L.util.pickFile('.ics,text/calendar').then(function (file) {
        if (!file) return null;
        return L.util.readFile(file).then(function (text) { return ICS.importText(text); });
      });
    },

    /* Abonnement à une URL .ics publique (Google : « adresse secrète au
       format iCal », Apple : « calendrier public »). Le navigateur exige
       que l'hébergeur autorise la lecture inter-domaine. */
    importURL: function (url) {
      var clean = String(url || '').replace(/^webcal:/, 'https:');
      return fetch(clean).then(function (r) {
        if (!r.ok) throw new Error('réponse ' + r.status);
        return r.text();
      }).then(function (text) { return ICS.importText(text); });
    }
  };

  L.ics = ICS;
})(window.LifeOS = window.LifeOS || {});
