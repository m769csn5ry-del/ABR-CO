/* ==========================================================================
   LifeOS — passerelle bancaire
   Trois façons de faire entrer un relevé, de la plus sûre à la plus lourde :

   1. FICHIER (disponible ici, sans rien installer) — toutes les banques
      françaises exportent les opérations en CSV, OFX ou QIF. Aucun identifiant
      ne quitte ta banque, rien ne transite par un tiers.
   2. AGRÉGATEUR AGRÉÉ (à brancher) — depuis la DSP2, seul un établissement
      enregistré auprès de l'ACPR peut interroger l'API d'une banque. Un
      particulier ne peut pas s'enregistrer : il faut passer par un agrégateur
      (Powens, Bridge, GoCardless Bank Account Data, Tink…). L'adaptateur
      ci-dessous attend ce branchement, qui exige un petit serveur : une clé
      d'agrégateur ne peut pas vivre dans un navigateur.
   3. RÉCUPÉRATION DES IDENTIFIANTS — jamais. C'est contraire aux conditions
      de ta banque et cela reviendrait à confier ton accès à un programme.

   Le format de la banque n'a pas à contaminer le reste de l'application :
   tout ressort ici sous la même forme { date, amount, type, description }.
   ========================================================================== */
(function (L) {
  'use strict';

  /* --- lecture du fichier, encodage compris ---
     Les banques françaises exportent encore beaucoup en Windows-1252 : lu en
     UTF-8, « Décathlon » devient « DÃ©cathlon ». On tente l'UTF-8 strict, et
     on retombe sur l'encodage latin si le texte n'est pas valide. */
  function decode(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      try { return new TextDecoder('windows-1252').decode(buffer); }
      catch (e2) { return new TextDecoder('iso-8859-1').decode(buffer); }
    }
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(decode(reader.result)); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(file);
    });
  }

  function detectFormat(text, filename) {
    var head = text.slice(0, 4000).toUpperCase();
    if (head.indexOf('<OFX') > -1 || head.indexOf('OFXHEADER') > -1) return 'ofx';
    if (/^!TYPE:/m.test(head) || /^\^\s*$/m.test(text.slice(0, 2000))) return 'qif';
    if (/\.ofx$/i.test(filename || '')) return 'ofx';
    if (/\.qif$/i.test(filename || '')) return 'qif';
    return 'csv';
  }

  /* --- OFX ---
     Format de Quicken, proposé par la plupart des banques françaises sous le
     nom « Money » ou « logiciel de comptabilité ». Tolérant : la version 1 est
     du SGML sans balises fermantes, la version 2 du XML. Le même filet les
     attrape toutes les deux. */
  function parseOFX(text) {
    var out = [];
    var blocks = text.split(/<STMTTRN>/i).slice(1);
    blocks.forEach(function (raw) {
      var block = raw.split(/<\/STMTTRN>/i)[0];
      var field = function (name) {
        var m = block.match(new RegExp('<' + name + '>([^<\\r\\n]*)', 'i'));
        return m ? m[1].trim() : '';
      };
      var stamp = field('DTPOSTED') || field('DTUSER');
      var amount = parseFloat(String(field('TRNAMT')).replace(',', '.'));
      if (!stamp || isNaN(amount)) return;
      var date = stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6, 8);
      var label = [field('NAME'), field('MEMO')].filter(Boolean).join(' — ');
      out.push({
        date: date,
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        description: label || (amount < 0 ? 'Dépense' : 'Revenu'),
        reference: field('FITID') || null
      });
    });
    return out;
  }

  /* --- QIF ---
     Le plus ancien et le plus simple : un champ par ligne, un « ^ » sépare
     les opérations. */
  function parseQIF(text) {
    var out = [];
    var current = null;
    String(text).split(/\r?\n/).forEach(function (line) {
      var code = line.charAt(0);
      var value = line.slice(1).trim();
      if (code === '^') {
        if (current && current.date && current.amount !== null) out.push(current);
        current = null;
        return;
      }
      if (!current) current = { date: null, amount: null, type: 'expense', description: '', reference: null };
      if (code === 'D') current.date = L.csv.parseDate(value);
      else if (code === 'T' || code === 'U') {
        var n = L.csv.parseAmount(value);
        if (n !== null) { current.amount = Math.abs(n); current.type = n < 0 ? 'expense' : 'income'; }
      } else if (code === 'P') current.description = value;
      else if (code === 'M' && !current.description) current.description = value;
      else if (code === 'N') current.reference = value || null;
    });
    if (current && current.date && current.amount !== null) out.push(current);
    return out.filter(function (e) { return e.date; });
  }

  /* --- réglages connus ---
     Les intitulés de colonnes varient d'une banque à l'autre ; ceux-ci
     couvrent le CIC et le Crédit Mutuel, qui partagent le même système. */
  var PRESETS = {
    cic: {
      label: 'CIC / Crédit Mutuel',
      separator: ';',
      headers: {
        date: ['date', "date d'operation", 'date operation', 'date de comptabilisation'],
        debit: ['debit', 'montant debit', 'depenses'],
        credit: ['credit', 'montant credit', 'recettes'],
        amount: ['montant', 'montant de l operation'],
        description: ['libelle', 'libelle simplifie', 'libelle operation', 'nature de l operation', 'details']
      },
      help: 'CIC : Comptes → Télécharger les opérations → format Excel/CSV ou OFX.'
    }
  };

  var Bank = {
    PRESETS: PRESETS,
    decode: decode,
    readFile: readFile,
    detectFormat: detectFormat,
    parseOFX: parseOFX,
    parseQIF: parseQIF,

    /* Point d'entrée unique : un fichier entre, des opérations sortent. */
    readStatement: function (file) {
      return readFile(file).then(function (text) {
        var format = detectFormat(text, file.name);
        if (format === 'ofx') return { format: 'ofx', entries: parseOFX(text), text: text };
        if (format === 'qif') return { format: 'qif', entries: parseQIF(text), text: text };
        var parsed = L.csv.parse(text);
        return { format: 'csv', parsed: parsed, entries: null, text: text };
      });
    },

    /* --- adaptateur d'agrégateur ---
       Rien n'est branché : la méthode décrit ce qu'il faudrait pour l'être,
       plutôt que de faire croire à une connexion qui n'existe pas. */
    aggregator: {
      configured: function () {
        var cfg = (L.store.state.settings.bank || {});
        return !!(cfg.provider && cfg.endpoint);
      },

      /* Un agrégateur agréé s'interroge depuis un serveur, jamais depuis le
         navigateur : sa clé signerait sinon n'importe quelle requête venue de
         n'importe où. `endpoint` est l'adresse de ce petit service, qui garde
         la clé et renvoie les opérations déjà filtrées. */
      fetch: function (sinceISO) {
        var cfg = (L.store.state.settings.bank || {});
        if (!Bank.aggregator.configured()) {
          return Promise.reject(new Error(
            'Aucun agrégateur configuré. Une connexion directe à une banque française ' +
            'passe obligatoirement par un établissement agréé par l\'ACPR — voir Paramètres → Banque.'));
        }
        return fetch(cfg.endpoint.replace(/\/$/, '') + '/transactions?since=' + encodeURIComponent(sinceISO || ''), {
          headers: cfg.token ? { authorization: 'Bearer ' + cfg.token } : {}
        }).then(function (r) {
          if (!r.ok) throw new Error('le service a répondu ' + r.status);
          return r.json();
        }).then(function (data) {
          var rows = Array.isArray(data) ? data : (data.transactions || []);
          return rows.map(function (t) {
            var amount = Number(t.amount);
            return {
              date: String(t.date || t.booking_date || '').slice(0, 10),
              amount: Math.abs(amount),
              type: amount < 0 ? 'expense' : 'income',
              description: t.description || t.label || t.remittance_information || 'Opération',
              reference: t.id || t.transaction_id || null
            };
          }).filter(function (t) { return t.date && t.amount; });
        });
      },

      /* Ce qu'il faut réunir pour brancher une vraie connexion. */
      requirements: [
        'Un agrégateur agréé qui couvre le CIC : Powens, Bridge, Tink, ou GoCardless Bank Account Data (offre gratuite pour un usage personnel).',
        'Un compte développeur chez lui, et ses identifiants d\'application.',
        'Un petit service en ligne qui garde la clé secrète et expose /transactions — une trentaine de lignes suffisent.',
        'L\'adresse de ce service, à coller dans Paramètres → Banque.'
      ]
    }
  };

  L.bank = Bank;
})(window.LifeOS = window.LifeOS || {});
