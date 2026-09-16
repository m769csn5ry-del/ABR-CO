/* ==========================================================================
   LifeOS — reconnaissance des libellés bancaires
   « PRLV SEPA FREE MOBILE 0612345678 » doit devenir « Abonnements », sans
   qu'on ait à le dire deux fois. Deux mécanismes se complètent :

   • des règles de départ, écrites pour les libellés des banques françaises ;
   • des règles apprises : classer une opération à la main enseigne le
     marchand, et toutes les suivantes tombent au bon endroit.

   Rien n'est deviné en silence : une opération classée automatiquement le
   dit, et se recatégorise d'un geste.
   ========================================================================== */
(function (L) {
  'use strict';

  var store = L.store;
  function S() { return store.state; }

  /* Les banques françaises préfixent tout : CARTE, PRLV SEPA, VIR, ECH, FAC…
     Ces mots ne disent rien du marchand, pas plus que les dates et les
     numéros de mandat. */
  var NOISE = /\b(carte|cb|paiement|achat|prlv|prelevement|sepa|vir|virement|inst|ech|echeance|fac|facture|retrait|dab|gab|remise|cheque|chq|num|ref|mandat|du|le|de|des|sur|par|pour|avec|x{2,}|\d{2}[\/.]\d{2}([\/.]\d{2,4})?|\d{4,})\b/g;

  /* Réduit un libellé à ce qui identifie le marchand : c'est cette signature
     qui sert à apprendre et à repérer les abonnements. */
  function signature(description) {
    var text = L.util.fold(description).replace(/[*_\-+#,;:]/g, ' ');
    text = text.replace(NOISE, ' ').replace(/\s{2,}/g, ' ').trim();
    var words = text.split(' ').filter(function (w) { return w.length > 2 && !/^\d+$/.test(w); });
    return words.slice(0, 3).join(' ');
  }

  /* --- règles de départ ---
     [ motif, catégorie, type attendu ]. La catégorie est cherchée par son nom
     dans les catégories de l'utilisateur : renommée, elle continue de
     fonctionner ; supprimée, la règle s'efface d'elle-même. */
  var DEFAULTS = [
    /* revenus */
    ['salaire|paie\\b|paye\\b|remuneration|traitement', 'Salaire', 'income'],
    ['caf\\b|pole emploi|france travail|allocation|bourse|aide au logement|apl\\b', 'Aides & autres', 'income'],
    ['stripe|paypal|shopify|etsy|vinted vente|remboursement', 'Revenus business', 'income'],

    /* logement et énergie */
    ['loyer|foncia|nexity|citya|sergic|bail\\b|sci\\b|quittance', 'Loyer & charges', 'expense'],
    ['edf\\b|engie|totalenergies|eni gas|veolia|suez|saur\\b|eau de|gaz de', 'Loyer & charges', 'expense'],
    ['assurance habitation|maif|macif|maaf|matmut|gmf\\b|axa\\b|allianz|groupama', 'Loyer & charges', 'expense'],

    /* courses */
    ['carrefour|leclerc|intermarche|lidl|aldi|auchan|casino|monoprix|franprix|super u|hyper u|grand frais|picard|biocoop|naturalia|action fr', 'Courses', 'expense'],
    ['boulangerie|boucherie|primeur|marche\\b|epicerie', 'Courses', 'expense'],

    /* transport */
    ['sncf|ouigo|trainline|ratp|navigo|tcl\\b|tan\\b|tisseo|transpole|keolis', 'Transport', 'expense'],
    ['total access|esso|shell|bp\\b|avia\\b|station|carburant|peage|vinci autoroute|sanef', 'Transport', 'expense'],
    ['uber\\b|bolt\\b|blablacar|taxi|velib|lime\\b|tier\\b|cityscoot', 'Transport', 'expense'],

    /* abonnements */
    ['free mobile|free hautdebit|orange\\b|sosh|sfr\\b|red by|bouygues|b and you|nordvpn', 'Abonnements', 'expense'],
    ['netflix|spotify|deezer|disney|canal|prime video|amazon music|apple com bill|itunes|google\\b|youtube|microsoft|adobe|dropbox|icloud|openai|anthropic|claude', 'Abonnements', 'expense'],

    /* restaurants et sorties */
    ['restaurant|brasserie|pizzeria|sushi|kebab|mcdo|mc donald|burger king|kfc\\b|subway|starbucks|columbus cafe', 'Restaurants & sorties', 'expense'],
    ['uber eats|deliveroo|just eat|frichti', 'Restaurants & sorties', 'expense'],
    ['cinema|ugc\\b|pathe|gaumont|theatre|concert|fnac spectacles|billetreduc|bar\\b|pub\\b', 'Restaurants & sorties', 'expense'],

    /* santé */
    ['pharmacie|docteur|medecin|dentiste|laboratoire|biogroup|cerballiance|radiologie|opticien|mutuelle|harmonie|alan\\b|cpam', 'Santé', 'expense'],

    /* sport */
    ['basic fit|fitness park|neoness|keepcool|on air|salle de sport|decathlon|intersport|piscine|club sportif', 'Sport', 'expense'],

    /* études et formation */
    ['auto ecole|ecf\\b|permis|code de la route|crous|universite|scolarite|inscription|udemy|coursera|openclassrooms|livre|librairie|gibert', 'Études & formation', 'expense'],

    /* vêtements */
    ['zara|h m\\b|uniqlo|kiabi|celio|jules\\b|bershka|nike|adidas|courir|foot locker|jd sports|vinted', 'Vêtements', 'expense'],

    /* épargne */
    ['livret a|livret jeune|ldds|pel\\b|cel\\b|epargne|versement programme|assurance vie|pea\\b|trade republic|boursorama epargne', 'Épargne', 'saving']
  ];

  var R = {
    signature: signature,
    DEFAULTS: DEFAULTS,

    /* Règles apprises, conservées avec les données du profil. */
    all: function () { return S().rules || []; },

    /* Cherche la catégorie par son nom, sans imposer qu'elle existe. */
    categoryByName: function (name) {
      var wanted = L.util.fold(name);
      var found = S().categories.filter(function (c) { return L.util.fold(c.name) === wanted; })[0];
      return found || null;
    },

    /* Devine la catégorie d'une opération.
       Renvoie { categoryId, source, label } ou null. */
    guess: function (description, type) {
      var text = L.util.fold(description);
      if (!text) return null;

      /* Ce que l'utilisateur a appris passe avant les règles de départ. */
      var learned = R.all().filter(function (rule) {
        return rule.pattern && text.indexOf(rule.pattern) > -1;
      }).sort(function (a, b) { return (b.hits || 0) - (a.hits || 0); })[0];
      if (learned) {
        var cat = store.byId('categories', learned.categoryId);
        if (cat) return { categoryId: cat.id, source: 'apprise', label: cat.name };
      }

      for (var i = 0; i < DEFAULTS.length; i++) {
        var rule = DEFAULTS[i];
        if (type && rule[2] && rule[2] !== type) continue;
        if (!new RegExp(rule[0]).test(text)) continue;
        var target = R.categoryByName(rule[1]);
        if (target) return { categoryId: target.id, source: 'connue', label: target.name };
      }
      return null;
    },

    /* Classer une opération à la main enseigne le marchand. */
    learn: function (description, categoryId) {
      var pattern = signature(description);
      if (!pattern || pattern.length < 3 || !categoryId) return null;
      var existing = null;
      store.update(function (s) {
        if (!s.rules) s.rules = [];
        existing = s.rules.filter(function (r) { return r.pattern === pattern; })[0];
        if (existing) {
          existing.categoryId = categoryId;
          existing.hits = (existing.hits || 1) + 1;
        } else {
          existing = { id: L.util.uid('rul'), pattern: pattern, categoryId: categoryId, hits: 1, createdAt: Date.now() };
          s.rules.push(existing);
        }
      });
      return existing;
    },

    forget: function (id) {
      store.update(function (s) {
        s.rules = (s.rules || []).filter(function (r) { return r.id !== id; });
      }, 'Règle oubliée');
    },

    /* Classe une liste d'opérations avant import : on voit ce qui a été
       reconnu, et ce qui reste à trancher. */
    categorize: function (entries) {
      return entries.map(function (entry) {
        var guessed = R.guess(entry.description, entry.type);
        return Object.assign({}, entry, {
          categoryId: guessed ? guessed.categoryId : null,
          categoryLabel: guessed ? guessed.label : null,
          categorySource: guessed ? guessed.source : null
        });
      });
    },

    /* Rattrape les opérations déjà enregistrées sans catégorie. */
    backfill: function () {
      var touched = 0;
      store.update(function (s) {
        s.transactions.forEach(function (t) {
          if (t.categoryId) return;
          var guessed = R.guess(t.description, t.type);
          if (guessed) { t.categoryId = guessed.categoryId; touched++; }
        });
      }, touched ? 'Opérations classées' : null);
      return touched;
    },

    /* Combien d'opérations restent sans catégorie : c'est ce chiffre qui dit
       si les analyses sont fiables. */
    uncategorized: function (fromISO, toISO) {
      return S().transactions.filter(function (t) {
        if (fromISO && t.date < fromISO) return false;
        if (toISO && t.date > toISO) return false;
        return !t.categoryId && t.type !== 'transfer';
      });
    }
  };

  L.rules = R;
})(window.LifeOS = window.LifeOS || {});
