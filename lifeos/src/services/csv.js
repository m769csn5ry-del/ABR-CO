/* ==========================================================================
   LifeOS — import d'un relevé
   Les banques exportent toutes un CSV, jamais le même. On devine le
   séparateur, les colonnes et le sens des montants, puis on montre ce qui
   sera importé avant d'écrire quoi que ce soit.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date;

  /* Découpe une ligne en respectant les guillemets. */
  function splitLine(line, sep) {
    var out = [], cur = '', quoted = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if (c === sep && !quoted) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function (v) { return v.trim(); });
  }

  function detectSeparator(sample) {
    var candidates = [';', ',', '\t', '|'];
    var best = ';', bestScore = -1;
    candidates.forEach(function (sep) {
      var counts = sample.slice(0, 5).map(function (line) { return splitLine(line, sep).length; });
      var min = Math.min.apply(null, counts);
      var score = min > 1 && counts.every(function (c) { return c === counts[0]; }) ? min : 0;
      if (score > bestScore) { bestScore = score; best = sep; }
    });
    return best;
  }

  /* Reconnaît les formats de date les plus répandus. */
  function parseDate(value) {
    var v = String(value || '').trim();
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (m) {
      var year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return year + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    }
    var parsed = L.nlp.date(v);
    return parsed ? parsed.date : null;
  }

  function parseAmount(value) {
    var v = String(value || '').replace(/\s| /g, '').replace(/[^\d,.\-+]/g, '');
    if (!v) return null;
    var negative = v.indexOf('-') > -1;
    v = v.replace(/[-+]/g, '');
    if (v.indexOf(',') > -1 && v.indexOf('.') > -1) {
      v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
    } else if (v.indexOf(',') > -1) v = v.replace(',', '.');
    var n = parseFloat(v);
    if (isNaN(n)) return null;
    return negative ? -n : n;
  }

  var CSV = {
    parse: function (text) {
      var lines = String(text).split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (!lines.length) return null;
      var sep = detectSeparator(lines);
      var rows = lines.map(function (l) { return splitLine(l, sep); });

      /* Une première ligne sans date ni montant lisible est un en-tête. */
      var first = rows[0];
      var hasHeader = !first.some(function (cell) { return parseDate(cell); });
      var header = hasHeader ? first : first.map(function (_, i) { return 'Colonne ' + (i + 1); });
      var body = hasHeader ? rows.slice(1) : rows;

      /* Devine le rôle de chaque colonne d'après le contenu réel. */
      var sample = body.slice(0, 12);
      var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var score = { date: [], amount: [], text: [] };
      for (var c = 0; c < width; c++) {
        var dates = 0, amounts = 0, letters = 0;
        sample.forEach(function (r) {
          var cell = r[c] || '';
          if (parseDate(cell)) dates++;
          else if (parseAmount(cell) !== null && /\d/.test(cell)) amounts++;
          if (/[a-zA-Zéèêàùç]{3,}/.test(cell)) letters++;
        });
        score.date.push(dates);
        score.amount.push(amounts);
        score.text.push(letters);
      }
      var pick = function (list, exclude) {
        var best = -1, bestValue = 0;
        list.forEach(function (v, i) {
          if (exclude.indexOf(i) > -1) return;
          if (v > bestValue) { bestValue = v; best = i; }
        });
        return bestValue ? best : -1;
      };
      var dateCol = pick(score.date, []);
      var amountCol = pick(score.amount, [dateCol]);
      var textCol = pick(score.text, [dateCol, amountCol]);

      return {
        separator: sep, header: header, rows: body, width: width,
        mapping: { date: dateCol, amount: amountCol, description: textCol }
      };
    },

    /* Transforme les lignes en transactions, sans rien écrire. */
    preview: function (parsed, mapping, opts) {
      opts = opts || {};
      var out = [];
      parsed.rows.forEach(function (row) {
        var date = parseDate(row[mapping.date]);
        var amount = parseAmount(row[mapping.amount]);
        if (!date || amount === null || !amount) return;
        var description = (row[mapping.description] || '').replace(/\s{2,}/g, ' ').trim();
        out.push({
          date: date,
          amount: Math.abs(amount),
          type: amount < 0 ? 'expense' : (opts.reverse ? 'expense' : 'income'),
          description: description || (amount < 0 ? 'Dépense' : 'Revenu')
        });
      });
      return out;
    },

    /* L'import ignore ce qui existe déjà : réimporter un relevé qui se
       recoupe avec le précédent ne crée pas de doublon. */
    apply: function (entries, opts) {
      opts = opts || {};
      var added = 0, skipped = 0;
      L.store.update(function (s) {
        entries.forEach(function (e) {
          var duplicate = s.transactions.some(function (t) {
            return t.date === e.date && Math.abs(t.amount - e.amount) < 0.005 &&
              L.util.fold(t.description).slice(0, 24) === L.util.fold(e.description).slice(0, 24);
          });
          if (duplicate) { skipped++; return; }
          s.transactions.unshift(L.schema.make.transaction({
            type: e.type, amount: e.amount, description: e.description, date: e.date,
            accountId: opts.accountId || null,
            categoryId: opts.categoryId || null
          }));
          added++;
        });
      }, 'Relevé importé');
      return { added: added, skipped: skipped };
    },

    parseDate: parseDate,
    parseAmount: parseAmount
  };

  L.csv = CSV;
})(window.LifeOS = window.LifeOS || {});
