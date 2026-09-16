/* ==========================================================================
   LifeOS — compréhension du français
   L'assistant doit comprendre « ajoute réviser stats demain 14h 1h30 en
   priorité haute » sans serveur ni modèle distant. Ce fichier ne fait que
   repérer des morceaux : dates, heures, durées, montants, priorités,
   domaines, projets. L'interprétation, elle, est dans assistant.js.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date;
  var fold = L.util.fold;

  var DAY_WORDS = {
    dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6
  };
  var MONTH_WORDS = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6,
    aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11
  };
  var NUM_WORDS = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
    huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30
  };

  function num(word) {
    if (word === undefined || word === null) return null;
    var n = parseFloat(String(word).replace(',', '.'));
    if (!isNaN(n)) return n;
    return NUM_WORDS[fold(word)] !== undefined ? NUM_WORDS[fold(word)] : null;
  }

  var NLP = {
    DAY_WORDS: DAY_WORDS,
    MONTH_WORDS: MONTH_WORDS,
    num: num,

    /* --- date ---
       Renvoie { date, matched } pour pouvoir retirer le morceau du titre. */
    date: function (text) {
      var t = fold(text);
      var today = D.today();
      var hit = function (date, matched) { return { date: date, matched: matched }; };

      if (/\baujourd'?hui\b|\bce soir\b|\bcet apres-midi\b|\bce matin\b|\bmaintenant\b/.test(t)) {
        var m = t.match(/aujourd'?hui|ce soir|cet apres-midi|ce matin|maintenant/);
        return hit(today, m ? m[0] : null);
      }
      if (/\bapres-?demain\b/.test(t)) return hit(D.addDays(today, 2), 'apres-demain');
      if (/\bdemain\b/.test(t)) return hit(D.addDays(today, 1), 'demain');
      if (/\bhier\b/.test(t)) return hit(D.addDays(today, -1), 'hier');

      var rel = t.match(/\bdans\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|quinze)\s*(jours?|semaines?|mois)\b/);
      if (rel) {
        var n = num(rel[1]) || 1;
        var unit = rel[2];
        if (/mois/.test(unit)) return hit(D.addMonths(today, n), rel[0]);
        return hit(D.addDays(today, /semaine/.test(unit) ? n * 7 : n), rel[0]);
      }

      var week = t.match(/\b(ce|cette|le|la)?\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*(prochain|prochaine)?\b/);
      if (week) {
        var target = DAY_WORDS[week[2]];
        var cur = D.dow(today);
        var delta = (target - cur + 7) % 7;
        if (delta === 0) delta = 7;                       // « lundi » un lundi = le suivant
        if (week[3]) delta = delta <= 0 ? delta + 7 : delta;
        return hit(D.addDays(today, delta), week[0].trim());
      }

      var full = t.match(/\b(\d{1,2})\s*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s*(\d{4})?\b/);
      if (full) {
        var y = full[3] ? +full[3] : +today.slice(0, 4);
        var mm = MONTH_WORDS[full[2]];
        var iso = y + '-' + (mm + 1 < 10 ? '0' : '') + (mm + 1) + '-' + (+full[1] < 10 ? '0' : '') + (+full[1]);
        if (!full[3] && iso < today) iso = (y + 1) + iso.slice(4);
        return hit(iso, full[0]);
      }

      var slash = t.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
      if (slash) {
        var year = slash[3] ? (slash[3].length === 2 ? 2000 + +slash[3] : +slash[3]) : +today.slice(0, 4);
        var iso2 = year + '-' + (+slash[2] < 10 ? '0' : '') + (+slash[2]) + '-' + (+slash[1] < 10 ? '0' : '') + (+slash[1]);
        if (!slash[3] && iso2 < today) iso2 = (year + 1) + iso2.slice(4);
        return hit(iso2, slash[0]);
      }

      if (/\bla semaine prochaine\b/.test(t)) return hit(D.addDays(D.startOfWeek(today, 1), 7), 'la semaine prochaine');
      if (/\ble mois prochain\b/.test(t)) return hit(D.startOfMonth(D.addMonths(today, 1)), 'le mois prochain');
      if (/\bce week-?end\b/.test(t)) {
        var toSat = (6 - D.dow(today) + 7) % 7;
        return hit(D.addDays(today, toSat || 7), 'ce week-end');
      }
      return null;
    },

    /* Parcourt toutes les occurrences d'un motif et retient la première qui
       satisfait la règle : « 14h 1h30 » contient deux candidats, seul le
       premier est une heure de la journée. */
    scan: function (text, re, accept) {
      var m, out = null;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        out = accept(m);
        if (out) break;
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      return out;
    },

    /* --- heure ---
       « 14h30 », « 9h », « à 6 heures », « midi ». Une heure inférieure à 7
       n'est prise pour un moment de la journée que si elle est annoncée
       (« à 6h ») : sinon « 2h » est une durée, pas un rendez-vous. */
    time: function (text) {
      var t = fold(text);
      var hhmm = function (hour, min) {
        return (hour < 10 ? '0' : '') + hour + ':' + (min === undefined ? '00' : min);
      };
      var found = NLP.scan(t, /\b(a\s+)?(\d{1,2})\s*[h:]\s*(\d{2})\b(?!\s*(?:min|mn|minutes))/g, function (m) {
        if (+m[2] > 23 || +m[3] > 59) return null;
        if (+m[2] < 7 && !m[1]) return null;
        return { time: hhmm(+m[2], m[3]), matched: m[0] };
      });
      if (found) return found;

      found = NLP.scan(t, /\b(a\s+)?(\d{1,2})\s*h\b(?!\s*\d{2}\b(?!\s*(?:min|mn|minutes)))/g, function (m) {
        if (+m[2] > 23) return null;
        if (+m[2] < 7 && !m[1]) return null;
        return { time: hhmm(+m[2]), matched: m[0] };
      });
      if (found) return found;

      var m2 = t.match(/\ba\s+(\d{1,2})\s*heures?\b/);
      if (m2 && +m2[1] <= 23) return { time: hhmm(+m2[1]), matched: m2[0] };
      if (/\bmidi\b/.test(t)) return { time: '12:00', matched: 'midi' };
      if (/\bminuit\b/.test(t)) return { time: '00:00', matched: 'minuit' };
      return null;
    },

    /* --- durée en minutes ---
       « 45 min », « 1h30 », « 2 heures », « demi-heure ». Une durée notée
       « 1h30 » ne dépasse pas six heures : au-delà, c'est une heure de la
       journée (« 14h30 »). */
    duration: function (text) {
      var t = fold(text);
      var m = t.match(/\b(\d+)\s*(minutes?|min|mn)\b/);
      if (m) return { minutes: +m[1], matched: m[0] };

      var found = NLP.scan(t, /\b(\d{1,2})\s*h\s*(\d{2})\b(?!\s*(?:min|mn|minutes))/g, function (x) {
        if (+x[1] > 6 || +x[2] > 59) return null;
        return { minutes: +x[1] * 60 + +x[2], matched: x[0] };
      });
      if (found) return found;

      m = t.match(/\b(\d+([.,]\d+)?|une|deux|trois|quatre|cinq|six|sept|huit|dix)\s*heures?\b/);
      if (m && !/\ba\s*$/.test(t.slice(0, m.index))) return { minutes: Math.round((num(m[1]) || 1) * 60), matched: m[0] };

      found = NLP.scan(t, /\b(\d{1,2})\s*h\b(?!\s*\d{2}\b(?!\s*(?:min|mn|minutes)))/g, function (x) {
        if (+x[1] > 6) return null;
        return { minutes: +x[1] * 60, matched: x[0] };
      });
      if (found) return found;

      if (/\bdemi[- ]heure\b/.test(t)) return { minutes: 30, matched: 'demi-heure' };
      if (/\bun quart d'?heure\b/.test(t)) return { minutes: 15, matched: "quart d'heure" };
      return null;
    },

    /* --- montant --- */
    amount: function (text) {
      var t = text.replace(/\s/g, ' ');
      var m = t.match(/(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(€|eur\b|euros?\b)/i);
      if (m) return { amount: L.format.parseAmount(m[1]), matched: m[0] };
      m = t.match(/(?:^|\s)(\d+(?:[.,]\d{1,2})?)(?:\s|$)/);
      if (m) return { amount: L.format.parseAmount(m[1]), matched: m[1] };
      return null;
    },

    /* --- priorité --- */
    priority: function (text) {
      var t = fold(text);
      if (/\burgent|\bp0\b|tres important|critique/.test(t)) return { priority: 0, matched: (t.match(/urgent\w*|p0|critique/) || [])[0] };
      if (/\bimportant|\bp1\b|priorite haute|prioritaire/.test(t)) return { priority: 1, matched: (t.match(/important\w*|p1|prioritaire/) || [])[0] };
      if (/\bpas urgent|plus tard|\bp3\b|quand j'?aurai le temps/.test(t)) return { priority: 3, matched: (t.match(/pas urgent|plus tard|p3/) || [])[0] };
      return null;
    },

    energy: function (text) {
      var t = fold(text);
      if (/fatigue|creve|epuise|pas la tete|mou/.test(t)) return 'low';
      if (/en forme|motive|frais|concentre/.test(t)) return 'high';
      return null;
    },

    /* --- période d'analyse --- */
    period: function (text) {
      var t = fold(text);
      var today = D.today();
      if (/\baujourd'?hui\b|\bce jour\b/.test(t)) return { from: today, to: today, label: "aujourd'hui" };
      if (/\bhier\b/.test(t)) { var y = D.addDays(today, -1); return { from: y, to: y, label: 'hier' }; }
      if (/\bcette semaine\b|\bde la semaine\b/.test(t)) {
        var s = D.startOfWeek(today, 1); return { from: s, to: D.addDays(s, 6), label: 'cette semaine' };
      }
      if (/\bla semaine derniere\b|\bsemaine passee\b/.test(t)) {
        var ls = D.addDays(D.startOfWeek(today, 1), -7);
        return { from: ls, to: D.addDays(ls, 6), label: 'la semaine dernière' };
      }
      if (/\ble mois dernier\b|\bmois passe\b/.test(t)) {
        var lm = D.startOfMonth(D.addMonths(today, -1));
        return { from: lm, to: D.endOfMonth(lm), label: 'le mois dernier' };
      }
      if (/\bcette annee\b|\bde l'?annee\b/.test(t)) {
        return { from: D.startOfYear(today), to: D.endOfYear(today), label: 'cette année' };
      }
      if (/\bce mois\b|\bdu mois\b|\bce mois-ci\b/.test(t)) {
        return { from: D.startOfMonth(today), to: D.endOfMonth(today), label: 'ce mois-ci' };
      }
      var last = t.match(/\b(\d+)\s*derniers?\s*(jours|semaines|mois)\b/);
      if (last) {
        var n = +last[1];
        var from = /semaine/.test(last[2]) ? D.addDays(today, -n * 7)
          : /mois/.test(last[2]) ? D.addMonths(today, -n) : D.addDays(today, -n);
        return { from: from, to: today, label: 'les ' + last[0].replace(/^\d+\s*/, n + ' ') };
      }
      return null;
    },

    /* --- plage horaire : « ce soir », « cet après-midi », « de 18h à 21h » --- */
    window: function (text) {
      var t = fold(text);
      var range = t.match(/\bde\s*(\d{1,2})\s*h\s*(\d{2})?\s*(?:a|jusqu'?a)\s*(\d{1,2})\s*h\s*(\d{2})?/);
      if (range) {
        return {
          from: (+range[1]) * 60 + (+(range[2] || 0)),
          to: (+range[3]) * 60 + (+(range[4] || 0)),
          label: 'de ' + range[1] + ' h à ' + range[3] + ' h'
        };
      }
      if (/\bsoir(ee)?\b|\bapres le diner\b/.test(t)) return { from: Math.max(D.nowMinutes(), 18 * 60), to: 23 * 60, label: 'ce soir' };
      if (/\bapres-midi\b/.test(t)) return { from: Math.max(D.nowMinutes(), 13 * 60), to: 18 * 60, label: 'cet après-midi' };
      if (/\bmatin(ee)?\b/.test(t)) return { from: Math.max(D.nowMinutes(), 7 * 60), to: 12 * 60, label: 'ce matin' };
      if (/\bcette nuit\b/.test(t)) return { from: Math.max(D.nowMinutes(), 21 * 60), to: 24 * 60 - 1, label: 'cette nuit' };
      return null;
    },

    /* --- récurrence --- */
    recurrence: function (text) {
      var t = fold(text);
      if (/\btous les jours\b|\bchaque jour\b|\bquotidien/.test(t)) return { rec: { freq: 'daily', interval: 1 }, matched: (t.match(/tous les jours|chaque jour|quotidien\w*/) || [])[0] };
      if (/\bchaque semaine\b|\btoutes les semaines\b|\bhebdo/.test(t)) return { rec: { freq: 'weekly', interval: 1 }, matched: (t.match(/chaque semaine|toutes les semaines|hebdo\w*/) || [])[0] };
      if (/\bchaque mois\b|\btous les mois\b|\bmensuel/.test(t)) return { rec: { freq: 'monthly', interval: 1 }, matched: (t.match(/chaque mois|tous les mois|mensuel\w*/) || [])[0] };
      var days = [];
      Object.keys(DAY_WORDS).forEach(function (d) {
        if (new RegExp('\\btous les ' + d + 's?\\b|\\bchaque ' + d + '\\b').test(t)) days.push(DAY_WORDS[d]);
      });
      if (days.length) return { rec: { freq: 'weekly', interval: 1, days: days }, matched: null };
      return null;
    },

    /* --- rapprochement avec les données existantes --- */
    match: function (text, list, key) {
      var t = fold(text);
      var best = null, bestScore = 0;
      list.forEach(function (item) {
        var name = fold(item[key || 'title'] || item.name || '');
        if (!name || name.length < 3) return;
        var score = 0;
        if (t.indexOf(name) > -1) score = 100 + name.length;
        else {
          /* Assez de mots en commun pour être sûr de la cible. */
          var words = name.split(' ').filter(function (w) { return w.length > 3; });
          if (!words.length) return;
          var hits = words.filter(function (w) { return t.indexOf(w) > -1; }).length;
          if (hits >= Math.max(1, Math.ceil(words.length * 0.6))) score = 40 + hits * 5;
        }
        if (score > bestScore) { bestScore = score; best = item; }
      });
      return bestScore >= 40 ? best : null;
    },

    /* Enlève du texte les morceaux déjà interprétés pour ne garder que
       l'intitulé. La comparaison ignore accents et casse, mais la découpe
       se fait sur le texte d'origine : « réviser » ne perd pas son accent. */
    strip: function (text, parts) {
      var out = String(text);
      (parts || []).filter(Boolean).forEach(function (part) {
        var needle = fold(part);
        if (!needle) return;
        var hay = fold(out);
        var at = hay.indexOf(needle);
        if (at === -1) {
          out = out.replace(new RegExp(String(part).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
        } else {
          out = out.slice(0, at) + ' ' + out.slice(at + needle.length);
        }
      });
      return out.replace(/\s{2,}/g, ' ').trim();
    },

    /* Lecture complète d'une phrase de création de tâche.
       L'ordre compte : l'heure est lue avant la durée, car « 14h » désigne
       un moment et « 1h30 » une durée. */
    phrase: function (text) {
      var rest = String(text || '');
      var time = NLP.time(rest);
      if (time) rest = NLP.strip(rest, [time.matched]);
      var duration = NLP.duration(rest);
      if (duration) rest = NLP.strip(rest, [duration.matched]);
      var date = NLP.date(rest);
      if (date) rest = NLP.strip(rest, [date.matched]);
      var priority = NLP.priority(rest);
      if (priority && priority.matched) rest = NLP.strip(rest, [priority.matched]);
      var recurrence = NLP.recurrence(rest);
      if (recurrence && recurrence.matched) rest = NLP.strip(rest, [recurrence.matched]);

      var project = NLP.match(rest, L.projects.all(), 'name');
      if (project) rest = NLP.strip(rest, [project.name]);
      var domain = project ? null : NLP.match(rest, L.domains.all(), 'name');
      if (domain) rest = NLP.strip(rest, [domain.name]);

      return {
        date: date, time: time, duration: duration,
        priority: priority, recurrence: recurrence,
        project: project, domain: domain,
        rest: rest, title: NLP.title(rest)
      };
    },

    /* Nettoie un intitulé de tâche : retire les formules d'appel. */
    title: function (text) {
      var out = text
        .replace(/^\s*(ajoute|ajouter|cree|créer|crée|nouvelle|nouveau|note|rappelle[- ]moi de|il faut que je|je dois|faut que je)\s+/i, '')
        .replace(/^\s*(une |un |la |le |les |l'|de |d')\s*/i, '')
        .replace(/\b(pour|le|la|a|à|en|dans)\s*$/i, '')
        .replace(/[,;:]\s*$/, '')
        .trim();
      return out.charAt(0).toUpperCase() + out.slice(1);
    }
  };

  L.nlp = NLP;
})(window.LifeOS = window.LifeOS || {});
