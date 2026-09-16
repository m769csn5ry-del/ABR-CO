/* ==========================================================================
   LifeOS — bilan financier
   Ce qui s'est passé ce mois-ci, comparé à d'habitude, et ce qu'il y a à en
   faire. Chaque constat est chiffré et rattaché à des opérations réelles :
   aucune phrase de coaching qui ne s'appuie sur rien.

   Le bilan dit aussi ce qu'il ne sait pas : si un tiers des dépenses n'est
   pas classé, l'analyse le signale avant de conclure quoi que ce soit.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, store = L.store;
  function S() { return store.state; }

  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  var I = {
    /* --- engagements récurrents ---
       Un prélèvement qui revient au moins trois mois sur six, pour un montant
       quasi identique, pèse sur chaque mois à venir. Le loyer, un abonnement
       et un virement d'épargne programmé en font partie ; les courses, non —
       elles reviennent tous les mois mais leur montant varie, c'est une
       habitude de dépense, pas un engagement. D'où le seuil serré sur la
       stabilité du montant. */
    subscriptions: function (monthsBack) {
      var months = monthsBack || 6;
      var from = D.startOfMonth(D.addMonths(D.today(), -(months - 1)));
      var list = L.finance.filter({ from: from, to: D.today() })
        .filter(function (t) { return t.type === 'expense' || t.type === 'saving' || t.type === 'invest'; });

      var groups = {};
      list.forEach(function (t) {
        var key = L.rules.signature(t.description);
        if (!key || key.length < 3) return;
        (groups[key] || (groups[key] = [])).push(t);
      });

      return Object.keys(groups).map(function (key) {
        var items = groups[key];
        var byMonth = {};
        items.forEach(function (t) { byMonth[D.monthKey(t.date)] = t; });
        var monthsSeen = Object.keys(byMonth).sort();
        if (monthsSeen.length < 3) return null;

        var amounts = monthsSeen.map(function (m) { return byMonth[m].amount; });
        var typical = median(amounts);
        if (!typical) return null;
        /* Un engagement se reconnaît à son montant : le même, tous les mois.
           Huit pour cent de tolérance couvrent les indexations et les
           arrondis, pas les variations d'un panier de courses. */
        var stable = amounts.every(function (a) { return Math.abs(a - typical) <= typical * 0.08 + 0.5; });
        if (!stable) return null;

        var last = byMonth[monthsSeen[monthsSeen.length - 1]];
        var cat = last.categoryId ? L.finance.category(last.categoryId) : null;
        return {
          key: key,
          type: last.type,
          isSaving: last.type === 'saving' || last.type === 'invest',
          label: last.description,
          amount: L.util.round(typical, 2),
          yearly: L.util.round(typical * 12, 2),
          months: monthsSeen.length,
          lastDate: last.date,
          category: cat,
          transactions: items,
          /* Prélevé les mois précédents mais pas celui-ci : soit il est à
             venir, soit il s'est arrêté. */
          activeThisMonth: monthsSeen.indexOf(D.monthKey(D.today())) > -1
        };
      }).filter(Boolean).sort(function (a, b) { return b.amount - a.amount; });
    },

    /* --- dépenses inhabituelles ---
       Comparaison à la médiane des mois précédents, pas à la moyenne : un
       seul gros mois ne doit pas devenir la norme. */
    anomalies: function (monthKey) {
      var key = monthKey || D.monthKey(D.today());
      var from = key + '-01', to = D.endOfMonth(from);
      var out = [];

      var history = [];
      for (var i = 1; i <= 6; i++) history.push(D.monthKey(D.addMonths(from, -i)));

      L.finance.categories('expense').forEach(function (cat) {
        var past = history.map(function (m) {
          return L.util.sum(L.finance.filter({
            from: m + '-01', to: D.endOfMonth(m + '-01'), categoryId: cat.id, type: 'expense'
          }), function (t) { return t.amount; });
        }).filter(function (v) { return v > 0; });
        if (past.length < 2) return;

        var usual = median(past);
        var now = L.util.sum(L.finance.filter({ from: from, to: to, categoryId: cat.id, type: 'expense' }),
          function (t) { return t.amount; });
        if (!usual || now <= usual * 1.4 || now - usual < 25) return;

        out.push({
          kind: 'category',
          category: cat,
          amount: L.util.round(now, 2),
          usual: L.util.round(usual, 2),
          extra: L.util.round(now - usual, 2),
          ratio: now / usual
        });
      });

      /* Une opération isolée très au-dessus de ce qu'on voit d'habitude. */
      var monthList = L.finance.filter({ from: from, to: to, type: 'expense' });
      var typicalTx = median(L.finance.filter({
        from: D.monthKey(D.addMonths(from, -6)) + '-01', to: D.addDays(from, -1), type: 'expense'
      }).map(function (t) { return t.amount; }));
      monthList.forEach(function (t) {
        if (typicalTx && t.amount > Math.max(typicalTx * 6, 150)) {
          out.push({
            kind: 'transaction', transaction: t,
            amount: t.amount, usual: L.util.round(typicalTx, 2)
          });
        }
      });

      return out.sort(function (a, b) { return (b.extra || b.amount) - (a.extra || a.amount); });
    },

    /* --- le bilan du mois --- */
    month: function (monthKey) {
      var key = monthKey || D.monthKey(D.today());
      var from = key + '-01', to = D.endOfMonth(from);
      var today = D.today();
      var isCurrent = key === D.monthKey(today);

      var period = L.finance.period(from, to);
      var previousKey = D.monthKey(D.addMonths(from, -1));
      var previous = L.finance.month(previousKey);

      /* Moyenne des trois mois précédents : une référence plus juste que le
         seul mois d'avant, qui peut être atypique. */
      var refMonths = [1, 2, 3].map(function (n) { return D.monthKey(D.addMonths(from, -n)); });
      var refPeriods = refMonths.map(function (m) { return L.finance.month(m); });
      var average = {
        income: L.util.round(L.util.sum(refPeriods, function (p) { return p.income; }) / refPeriods.length, 2),
        expense: L.util.round(L.util.sum(refPeriods, function (p) { return p.expense; }) / refPeriods.length, 2),
        put: L.util.round(L.util.sum(refPeriods, function (p) { return p.put; }) / refPeriods.length, 2)
      };

      var categories = L.finance.byCategory(from, to, 'expense').map(function (c) {
        var pastValues = refMonths.map(function (m) {
          return L.util.sum(L.finance.filter({
            from: m + '-01', to: D.endOfMonth(m + '-01'), categoryId: c.id, type: 'expense'
          }), function (t) { return t.amount; });
        });
        var usual = L.util.round(median(pastValues), 2);
        return Object.assign({}, c, {
          usual: usual,
          delta: L.util.round(c.total - usual, 2),
          deltaRatio: usual ? (c.total - usual) / usual : null,
          share: period.expense ? c.total / period.expense : 0
        });
      });

      var fixed = L.util.sum(L.finance.filter({ from: from, to: to, type: 'expense' })
        .filter(function (t) { return t.fixed; }), function (t) { return t.amount; });

      var subs = I.subscriptions(6);
      /* L'épargne programmée est un engagement, mais ce n'est pas une
         dépense : la mélanger aux sorties fausserait toutes les proportions. */
      var subsExpense = subs.filter(function (x) { return !x.isSaving; });
      var subsSaving = subs.filter(function (x) { return x.isSaving; });
      var subsMonthly = L.util.sum(subsExpense, function (x) { return x.amount; });
      var savingMonthly = L.util.sum(subsSaving, function (x) { return x.amount; });

      /* Reste à vivre : ce qui est entré, moins ce qui est sorti, moins ce
         qui doit encore tomber avant la fin du mois. */
      var upcoming = L.util.sum(L.finance.upcoming(D.diffDays(today, to)).filter(function (u) {
        return u.model.type !== 'income' && u.date <= to;
      }), function (u) { return u.model.amount; });
      var daysLeft = isCurrent ? Math.max(0, D.diffDays(today, to)) : 0;
      var available = period.income - period.expense - period.put - upcoming;

      var uncategorized = L.rules.uncategorized(from, to);
      var uncategorizedAmount = L.util.sum(uncategorized.filter(function (t) { return t.type === 'expense'; }),
        function (t) { return t.amount; });

      return {
        month: key,
        from: from, to: to, isCurrent: isCurrent,
        period: period,
        previous: previous,
        average: average,
        delta: {
          income: L.util.round(period.income - average.income, 2),
          expense: L.util.round(period.expense - average.expense, 2),
          put: L.util.round(period.put - average.put, 2)
        },
        categories: categories,
        fixed: L.util.round(fixed, 2),
        variable: L.util.round(period.expense - fixed, 2),
        fixedShare: period.income ? fixed / period.income : 0,
        subscriptions: subs,
        subscriptionsExpense: subsExpense,
        subscriptionsSaving: subsSaving,
        subscriptionsMonthly: L.util.round(subsMonthly, 2),
        savingCommitments: L.util.round(savingMonthly, 2),
        subscriptionsShare: period.expense ? L.util.clamp(subsMonthly / period.expense, 0, 1) : 0,
        anomalies: I.anomalies(key),
        forecast: L.finance.forecast(key),
        available: L.util.round(available, 2),
        daysLeft: daysLeft,
        perDay: daysLeft > 0 ? L.util.round(available / daysLeft, 2) : null,
        goals: L.store.state.goals.filter(function (g) {
          return g.status === 'active' && ((g.source || {}).type === 'savings' || g.unit === '€');
        }).map(L.goals.summary),
        coverage: {
          missing: uncategorized.length,
          amount: L.util.round(uncategorizedAmount, 2),
          ratio: period.expense ? 1 - (uncategorizedAmount / period.expense) : 1
        }
      };
    },

    /* --- ce qu'il y a à en faire ---
       Chaque conseil porte un montant : sans chiffre, ce n'est qu'une
       remarque. Rien n'est proposé qui ne découle des données. */
    advice: function (report) {
      var r = report || I.month();
      var out = [];
      var add = function (item) { out.push(item); };

      /* 0. Avant tout : dire ce que l'analyse ne voit pas. */
      if (r.coverage.missing > 3 && r.coverage.ratio < 0.85) {
        add({
          id: 'coverage', kind: 'caveat', weight: 100,
          title: r.coverage.missing + ' ' + L.util.plural(r.coverage.missing, 'opération') + ' sans catégorie',
          detail: L.format.money(r.coverage.amount) + ' de dépenses ne sont rattachées à rien — soit ' +
            L.format.percent(1 - r.coverage.ratio, 0) + ' du mois. Les conclusions ci-dessous portent sur le reste.',
          action: { label: 'Classer maintenant', type: 'categorize' }
        });
      }

      /* 1. Les engagements récurrents : ce qui part sans qu'on y pense. */
      if (r.subscriptionsMonthly > 0) {
        var top = r.subscriptionsExpense.slice(0, 3).map(function (s) { return s.label.slice(0, 28); }).join(', ');
        add({
          id: 'subs', kind: r.subscriptionsShare > 0.5 ? 'warning' : 'info', weight: 80,
          title: L.format.money(r.subscriptionsMonthly) + ' par mois d\'engagements récurrents',
          detail: r.subscriptionsExpense.length + ' ' +
            L.util.plural(r.subscriptionsExpense.length, 'prélèvement', 'prélèvements') +
            ' au montant fixe — loyer, abonnements, assurances — soit ' +
            L.format.money(r.subscriptionsMonthly * 12) + ' sur l\'année et ' +
            L.format.percent(r.subscriptionsShare, 0) + ' de tes dépenses. Les plus lourds : ' + top + '.' +
            (r.savingCommitments ? ' S\'y ajoute ' + L.format.money(r.savingCommitments) + ' d\'épargne programmée, qui elle te revient.' : ''),
          gain: null,
          action: { label: 'Voir le détail', type: 'subscriptions' }
        });

        /* Deux abonnements dans la même catégorie : souvent un de trop. */
        var byCategory = {};
        r.subscriptionsExpense.forEach(function (s) {
          var name = s.category ? s.category.name : 'Sans catégorie';
          (byCategory[name] || (byCategory[name] = [])).push(s);
        });
        Object.keys(byCategory).forEach(function (name) {
          var group = byCategory[name];
          /* Deux loyers ou deux assurances ne sont pas un doublon : le
             conseil ne vaut que pour ce qu'on peut réellement résilier. */
          if (group.length < 2 || name === 'Sans catégorie' || name === 'Loyer & charges') return;
          var smallest = group.slice().sort(function (a, b) { return a.amount - b.amount; })[0];
          add({
            id: 'subs-dup-' + name, kind: 'action', weight: 75,
            title: group.length + ' ' + L.util.plural(group.length, 'abonnement') + ' en « ' + name + ' »',
            detail: group.map(function (s) { return s.label.slice(0, 24) + ' (' + L.format.money(s.amount) + ')'; }).join(', ') +
              '. En couper un, c\'est ' + L.format.money(smallest.yearly) + ' par an.',
            gain: smallest.amount
          });
        });
      }

      /* 2. Les postes qui dérapent par rapport à l'ordinaire. */
      r.categories.filter(function (c) {
        return c.deltaRatio !== null && c.deltaRatio > 0.25 && c.delta > 30;
      }).slice(0, 3).forEach(function (c) {
        add({
          id: 'cat-' + c.id, kind: 'warning', weight: 70,
          title: c.name + ' : ' + L.format.money(c.delta, { sign: true }) + ' au-dessus de l\'ordinaire',
          detail: L.format.money(c.total) + ' ce mois-ci contre ' + L.format.money(c.usual) +
            ' habituellement. Revenir à ce niveau libère ' + L.format.money(c.delta) + ' par mois.',
          gain: c.delta,
          action: { label: 'Voir les opérations', type: 'category', categoryId: c.id }
        });
      });

      /* 3. Les budgets dépassés. */
      var budget = L.finance.budget(r.month);
      (budget.categories || []).filter(function (b) { return b.state === 'over'; }).forEach(function (b) {
        add({
          id: 'budget-' + b.category.id, kind: 'warning', weight: 85,
          title: 'Budget « ' + b.category.name + ' » dépassé de ' + L.format.money(-b.left),
          detail: L.format.money(b.spent) + ' dépensés pour un plafond de ' + L.format.money(b.budget) + '.',
          gain: -b.left
        });
      });
      if (budget.global && budget.global.state === 'over') {
        add({
          id: 'budget-global', kind: 'warning', weight: 90,
          title: 'Budget du mois dépassé de ' + L.format.money(-budget.global.left),
          detail: L.format.money(budget.global.spent) + ' dépensés pour un plafond de ' + L.format.money(budget.global.budget) + '.',
          gain: -budget.global.left
        });
      }

      /* 4. Le poids des charges fixes : au-delà de la moitié des revenus,
            la marge de manœuvre disparaît. */
      if (r.fixedShare > 0.5 && r.period.income > 0) {
        add({
          id: 'fixed', kind: 'warning', weight: 65,
          title: 'Tes charges fixes prennent ' + L.format.percent(r.fixedShare, 0) + ' de tes revenus',
          detail: L.format.money(r.fixed) + ' d\'engagements pour ' + L.format.money(r.period.income) +
            ' de revenus. En dessous de 50 %, chaque imprévu redevient absorbable.'
        });
      }

      /* 5. Le taux d'épargne, rapporté à un objectif atteignable. */
      if (r.period.income > 0) {
        var rate = r.period.rate;
        var target = rate < 0.1 ? 0.1 : rate < 0.2 ? 0.2 : null;
        if (target) {
          var needed = L.util.round(r.period.income * target - r.period.put, 2);
          add({
            id: 'rate', kind: 'action', weight: 60,
            title: 'Taux d\'épargne : ' + L.format.percent(rate, 0),
            detail: 'Pour atteindre ' + L.format.percent(target, 0) + ', il manque ' + L.format.money(needed) +
              ' par mois — soit ' + L.format.money(needed / 30) + ' par jour.',
            gain: needed
          });
        } else if (rate >= 0.2) {
          add({
            id: 'rate-ok', kind: 'positive', weight: 30,
            title: 'Taux d\'épargne : ' + L.format.percent(rate, 0),
            detail: L.format.money(r.period.put) + ' mis de côté ce mois-ci. C\'est au-dessus du seuil de 20 % que visent la plupart des méthodes.'
          });
        }
      }

      /* 6. Les objectifs financiers, avec le rythme réellement nécessaire. */
      r.goals.forEach(function (g) {
        if (g.done) return;
        if (g.perMonth === null || g.perMonth === undefined) return;
        var missing = L.util.round(g.perMonth - r.period.put, 2);
        add({
          id: 'goal-' + g.goal.id, kind: g.behind || g.late ? 'warning' : 'info', weight: g.behind ? 88 : 55,
          title: g.goal.name + ' : ' + L.format.money(g.perMonth) + ' par mois à tenir',
          detail: g.late
            ? 'La date cible est passée de ' + Math.abs(g.daysLeft) + ' jours. Il reste ' + L.format.money(g.remaining) + '.'
            : L.format.money(g.remaining) + ' à réunir en ' + g.daysLeft + ' jours. ' +
              (missing > 0
                ? 'Au rythme de ce mois (' + L.format.money(r.period.put) + '), il manque ' + L.format.money(missing) + ' par mois.'
                : 'Ce que tu as mis de côté ce mois-ci y suffit.'),
          gain: missing > 0 ? missing : null,
          action: { label: 'Ouvrir l\'objectif', type: 'goal', goalId: g.goal.id }
        });
      });

      /* 7. Les dépenses inhabituelles, nommées. */
      r.anomalies.filter(function (a) { return a.kind === 'transaction'; }).slice(0, 2).forEach(function (a) {
        add({
          id: 'anom-' + a.transaction.id, kind: 'info', weight: 45,
          title: 'Dépense inhabituelle : ' + L.format.money(a.amount),
          detail: (a.transaction.description || 'Opération') + ' le ' + D.format(a.transaction.date) +
            ', alors que tes opérations tournent autour de ' + L.format.money(a.usual) + '.'
        });
      });

      /* 8. Le reste à vivre, quand le mois est encore devant. */
      if (r.isCurrent && r.daysLeft > 0) {
        add({
          id: 'left', kind: r.available < 0 ? 'warning' : 'info', weight: 95,
          title: r.available < 0
            ? 'Il manque ' + L.format.money(-r.available) + ' pour finir le mois'
            : L.format.money(r.perDay) + ' par jour jusqu\'à la fin du mois',
          detail: L.format.money(r.available) + ' disponibles sur ' + r.daysLeft + ' jours, une fois retirées ' +
            'les échéances qui doivent encore tomber.'
        });
      }

      /* 9. Ce qui va mieux mérite d'être dit aussi. */
      if (r.delta.expense < -50) {
        add({
          id: 'better', kind: 'positive', weight: 35,
          title: L.format.money(-r.delta.expense) + ' de dépenses en moins que d\'habitude',
          detail: L.format.money(r.period.expense) + ' ce mois-ci contre ' + L.format.money(r.average.expense) +
            ' en moyenne sur les trois mois précédents.'
        });
      }

      return out.sort(function (a, b) { return b.weight - a.weight; });
    },

    /* Le bilan en texte, pour l'assistant et les notifications. */
    summarize: function (report) {
      var r = report || I.month();
      var advice = I.advice(r);
      var lines = [
        D.caps(D.format(r.from, 'month')) + ' — ' +
        L.format.money(r.period.income) + ' de revenus, ' +
        L.format.money(r.period.expense) + ' de dépenses, ' +
        L.format.money(r.period.put) + ' d\'épargne (' + L.format.percent(r.period.rate, 0) + ').'
      ];
      if (r.delta.expense) {
        lines.push(r.delta.expense > 0
          ? L.format.money(r.delta.expense) + ' de plus que la moyenne des trois mois précédents.'
          : L.format.money(-r.delta.expense) + ' de moins que la moyenne des trois mois précédents.');
      }
      if (advice.length) {
        lines.push('');
        advice.slice(0, 4).forEach(function (a) { lines.push('• ' + a.title + ' — ' + a.detail); });
      }
      var gains = advice.filter(function (a) { return a.gain > 0; });
      if (gains.length) {
        var total = L.util.sum(gains, function (a) { return a.gain; });
        lines.push('');
        lines.push('Marge identifiée : jusqu\'à ' + L.format.money(total) + ' par mois.');
      }
      return lines.join('\n');
    }
  };

  L.insights = I;
})(window.LifeOS = window.LifeOS || {});
