/* ==========================================================================
   LifeOS — finances
   Un seul livre de comptes : chaque transaction porte son type, sa
   catégorie, son compte, et éventuellement le projet ou l'objectif qu'elle
   sert. Tous les chiffres affichés ailleurs (accueil, objectifs, stats)
   sont calculés ici — jamais recopiés.
   ========================================================================== */
(function (L) {
  'use strict';

  var D = L.date, make = L.schema.make, store = L.store;
  function S() { return store.state; }

  function sign(type) {
    var t = L.schema.TX_TYPES.filter(function (x) { return x.id === type; })[0];
    return t ? t.sign : -1;
  }

  var F = {
    TYPES: L.schema.TX_TYPES,
    sign: sign,

    /* --- transactions --- */
    all: function () { return S().transactions; },
    get: function (id) { return store.byId('transactions', id); },

    create: function (patch) {
      var tx = make.transaction(patch || {});
      if (!tx.accountId && S().accounts.length) tx.accountId = S().accounts[0].id;
      store.update(function (s) { s.transactions.unshift(tx); }, 'Transaction ajoutée');
      return tx;
    },
    save: function (id, patch) {
      var out = null;
      store.update(function (s) {
        s.transactions.forEach(function (t) { if (t.id === id) out = Object.assign(t, patch); });
      }, 'Transaction modifiée');
      return out;
    },
    remove: function (id) {
      store.update(function (s) {
        s.transactions = s.transactions.filter(function (t) { return t.id !== id; });
      }, 'Transaction supprimée');
    },

    filter: function (opts) {
      opts = opts || {};
      var list = S().transactions.slice();
      if (opts.from) list = list.filter(function (t) { return t.date >= opts.from; });
      if (opts.to) list = list.filter(function (t) { return t.date <= opts.to; });
      if (opts.type && opts.type !== 'all') list = list.filter(function (t) { return t.type === opts.type; });
      if (opts.categoryId) list = list.filter(function (t) { return t.categoryId === opts.categoryId; });
      if (opts.accountId) list = list.filter(function (t) {
        return t.accountId === opts.accountId || t.toAccountId === opts.accountId;
      });
      if (opts.projectId) list = list.filter(function (t) { return t.projectId === opts.projectId; });
      if (opts.query) {
        var q = L.util.fold(opts.query);
        list = list.filter(function (t) {
          var cat = F.category(t.categoryId);
          return L.util.fold(t.description).indexOf(q) > -1 || (cat && L.util.fold(cat.name).indexOf(q) > -1);
        });
      }
      return list.sort(function (a, b) { return a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1); });
    },

    /* --- comptes --- */
    accounts: function () { return S().accounts.filter(function (a) { return !a.archived; }); },
    account: function (id) { return store.byId('accounts', id); },
    createAccount: function (patch) {
      var a = make.account(patch);
      store.update(function (s) { s.accounts.push(a); }, 'Compte ajouté');
      return a;
    },
    saveAccount: function (id, patch) {
      store.update(function (s) { s.accounts.forEach(function (a) { if (a.id === id) Object.assign(a, patch); }); }, 'Compte modifié');
    },
    removeAccount: function (id) {
      store.update(function (s) {
        s.accounts = s.accounts.filter(function (a) { return a.id !== id; });
        s.transactions.forEach(function (t) {
          if (t.accountId === id) t.accountId = null;
          if (t.toAccountId === id) t.toAccountId = null;
        });
      }, 'Compte supprimé');
    },

    balance: function (accountId, atISO) {
      var acc = F.account(accountId);
      if (!acc) return 0;
      var total = acc.opening || 0;
      S().transactions.forEach(function (t) {
        if (atISO && t.date > atISO) return;
        if (t.accountId === accountId) total += sign(t.type) * t.amount;
        if (t.toAccountId === accountId) total += t.amount;    // arrivée d'un virement
      });
      return L.util.round(total, 2);
    },

    totalBalance: function (atISO) {
      return L.util.round(L.util.sum(F.accounts(), function (a) { return F.balance(a.id, atISO); }), 2);
    },

    /* --- catégories --- */
    categories: function (type) {
      var list = S().categories.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      return type ? list.filter(function (c) { return c.type === type; }) : list;
    },
    category: function (id) { return store.byId('categories', id); },
    createCategory: function (patch) {
      var c = make.category(patch);
      store.update(function (s) { s.categories.push(c); }, 'Catégorie ajoutée');
      return c;
    },
    saveCategory: function (id, patch) {
      store.update(function (s) { s.categories.forEach(function (c) { if (c.id === id) Object.assign(c, patch); }); }, 'Catégorie modifiée');
    },
    removeCategory: function (id) {
      store.update(function (s) {
        s.categories = s.categories.filter(function (c) { return c.id !== id; });
        s.transactions.forEach(function (t) { if (t.categoryId === id) t.categoryId = null; });
      }, 'Catégorie supprimée');
    },

    /* --- agrégats --- */
    period: function (fromISO, toISO) {
      var list = F.filter({ from: fromISO, to: toISO });
      var income = 0, expense = 0, saving = 0, invest = 0;
      list.forEach(function (t) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
        else if (t.type === 'saving') saving += t.amount;
        else if (t.type === 'invest') invest += t.amount;
      });
      var put = saving + invest;
      return {
        from: fromISO, to: toISO, count: list.length,
        income: L.util.round(income, 2),
        expense: L.util.round(expense, 2),
        saving: L.util.round(saving, 2),
        invest: L.util.round(invest, 2),
        put: L.util.round(put, 2),
        net: L.util.round(income - expense - put, 2),
        /* Taux d'épargne : ce qui est mis de côté rapporté aux revenus. */
        rate: income > 0 ? L.util.clamp(put / income, 0, 1) : 0,
        transactions: list
      };
    },

    month: function (monthKey) {
      var key = monthKey || D.monthKey(D.today());
      var from = key + '-01';
      return F.period(from, D.endOfMonth(from));
    },

    byCategory: function (fromISO, toISO, type) {
      var list = F.filter({ from: fromISO, to: toISO, type: type || 'expense' });
      var map = {};
      list.forEach(function (t) {
        var key = t.categoryId || '—';
        (map[key] || (map[key] = { id: t.categoryId, total: 0, count: 0 })).total += t.amount;
        map[key].count++;
      });
      return Object.keys(map).map(function (k) {
        var cat = F.category(map[k].id);
        return {
          id: map[k].id,
          name: cat ? cat.name : 'Sans catégorie',
          color: cat ? cat.color : '#8A8F98',
          icon: cat ? cat.icon : '•',
          total: L.util.round(map[k].total, 2),
          count: map[k].count
        };
      }).sort(function (a, b) { return b.total - a.total; });
    },

    /* --- budgets --- */
    budget: function (monthKey) {
      var key = monthKey || D.monthKey(D.today());
      var from = key + '-01', to = D.endOfMonth(from);
      var settings = S().settings.finance || {};
      var spent = F.period(from, to).expense;
      var cats = F.categories('expense').filter(function (c) { return c.budget; }).map(function (c) {
        var used = L.util.sum(F.filter({ from: from, to: to, categoryId: c.id, type: 'expense' }), function (t) { return t.amount; });
        return {
          category: c, budget: c.budget, spent: L.util.round(used, 2),
          left: L.util.round(c.budget - used, 2),
          ratio: c.budget ? used / c.budget : 0,
          state: used > c.budget ? 'over' : (used >= c.budget * (settings.alertAt || 0.8) ? 'near' : 'ok')
        };
      });
      var global = null;
      if (settings.monthlyBudget) {
        global = {
          budget: settings.monthlyBudget, spent: spent,
          left: L.util.round(settings.monthlyBudget - spent, 2),
          ratio: spent / settings.monthlyBudget,
          state: spent > settings.monthlyBudget ? 'over'
            : (spent >= settings.monthlyBudget * (settings.alertAt || 0.8) ? 'near' : 'ok')
        };
      }
      return { month: key, global: global, categories: cats,
        alerts: cats.filter(function (c) { return c.state !== 'ok'; }).length + (global && global.state !== 'ok' ? 1 : 0) };
    },

    /* Projection de fin de mois : rythme constaté + dépenses fixes connues
       pas encore passées. */
    forecast: function (monthKey) {
      var key = monthKey || D.monthKey(D.today());
      var from = key + '-01', to = D.endOfMonth(from);
      var today = D.today();
      var isCurrent = key === D.monthKey(today);
      var period = F.period(from, isCurrent ? today : to);
      var daysGone = isCurrent ? Math.max(1, D.diffDays(from, today) + 1) : D.diffDays(from, to) + 1;
      var daysTotal = D.diffDays(from, to) + 1;
      var pace = period.expense / daysGone;

      var fixedLeft = 0;
      if (isCurrent) {
        /* Ce qui est déclaré récurrent et doit encore tomber ce mois-ci. */
        F.upcoming(D.diffDays(today, to)).forEach(function (u) {
          if (u.model.type === 'expense' || u.model.type === 'saving' || u.model.type === 'invest') {
            if (u.date <= to) fixedLeft += u.model.amount;
          }
        });
        /* À défaut de récurrence déclarée, on se fie aux montants fixes du
           mois précédent qui ne sont pas encore repassés. */
        if (!fixedLeft) {
          var lastMonth = D.monthKey(D.addMonths(from, -1));
          F.filter({ from: lastMonth + '-01', to: D.endOfMonth(lastMonth + '-01'), type: 'expense' })
            .filter(function (t) { return t.fixed; })
            .forEach(function (t) {
              var already = F.filter({ from: from, to: to, type: 'expense' }).some(function (x) {
                return x.fixed && x.categoryId === t.categoryId &&
                  L.util.fold(x.description) === L.util.fold(t.description);
              });
              if (!already) fixedLeft += t.amount;
            });
        }
      }

      var projected = isCurrent ? period.expense + pace * (daysTotal - daysGone) * 0.75 + fixedLeft : period.expense;
      return {
        month: key,
        spent: period.expense,
        pace: L.util.round(pace, 2),
        fixedLeft: L.util.round(fixedLeft, 2),
        projected: L.util.round(projected, 2),
        daysLeft: isCurrent ? daysTotal - daysGone : 0,
        income: period.income,
        saveable: L.util.round(period.income - projected, 2)
      };
    },

    /* Séries mensuelles pour les graphiques. */
    series: function (months) {
      var out = [], key = D.today();
      for (var i = (months || 6) - 1; i >= 0; i--) {
        var m = D.monthKey(D.addMonths(key, -i));
        var p = F.month(m);
        out.push({ key: m, label: D.MONTHS_SHORT[+m.slice(5, 7) - 1], income: p.income, expense: p.expense, saving: p.put, net: p.net });
      }
      return out;
    },

    /* --- mouvements récurrents ---
       Un loyer, un abonnement ou un salaire n'a pas à être ressaisi chaque
       mois. La transaction porte sa récurrence ; les occurrences passées sont
       créées au lancement, les suivantes restent des prévisions tant que la
       date n'est pas arrivée. */
    recurring: function () {
      return S().transactions.filter(function (t) { return t.recurrence && t.recurrence.freq && !t.seriesId; });
    },

    /* Occurrences attendues d'ici N jours, non encore enregistrées. */
    upcoming: function (days) {
      var today = D.today();
      var limit = D.addDays(today, days === undefined ? 30 : days);
      var out = [];
      F.recurring().forEach(function (model) {
        var anchor = model.recurrence.start || model.date;
        var cur = D.addDays(today, 1);
        for (var i = 0; i < 400 && cur <= limit; i++) {
          if (D.matchesRecurrence(model.recurrence, cur, anchor) && !F.hasOccurrence(model, cur)) {
            out.push({ model: model, date: cur });
          }
          cur = D.addDays(cur, 1);
        }
      });
      return out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    },

    hasOccurrence: function (model, isoDate) {
      var seriesId = model.seriesId || model.id;
      return S().transactions.some(function (t) {
        return t.date === isoDate && (t.id === model.id || t.seriesId === seriesId);
      });
    },

    /* Rattrapage au lancement : tout ce qui aurait dû tomber depuis la
       dernière ouverture est enregistré, sans jamais créer de doublon. */
    materialize: function () {
      var today = D.today();
      var created = [];
      F.recurring().forEach(function (model) {
        var anchor = model.recurrence.start || model.date;
        var cur = D.addDays(model.date, 1);
        for (var i = 0; i < 800 && cur <= today; i++) {
          if (model.recurrence.until && cur > model.recurrence.until) break;
          if (D.matchesRecurrence(model.recurrence, cur, anchor) && !F.hasOccurrence(model, cur)) {
            created.push(make.transaction(Object.assign(L.util.clone(model), {
              id: L.util.uid('trx'), date: cur, recurrence: null,
              seriesId: model.seriesId || model.id, createdAt: Date.now()
            })));
          }
          cur = D.addDays(cur, 1);
        }
      });
      if (created.length) {
        store.update(function (s) { s.transactions = created.concat(s.transactions); }, null);
      }
      return created;
    },

    /* Enregistrer maintenant une occurrence attendue. */
    confirm: function (model, isoDate) {
      var tx = make.transaction(Object.assign(L.util.clone(model), {
        id: L.util.uid('trx'), date: isoDate, recurrence: null,
        seriesId: model.seriesId || model.id, createdAt: Date.now()
      }));
      store.update(function (s) { s.transactions.unshift(tx); }, 'Mouvement enregistré');
      return tx;
    },

    /* Dépenses fixes du mois : utile pour « combien puis-je engager ? ». */
    fixed: function () {
      var from = D.startOfMonth(D.today());
      return F.filter({ from: from, to: D.endOfMonth(from) }).filter(function (t) { return t.fixed; });
    },

    summary: function () {
      var month = F.month();
      var budget = F.budget();
      return {
        balance: F.totalBalance(),
        month: month,
        budget: budget,
        forecast: F.forecast(),
        accounts: F.accounts().map(function (a) { return { account: a, balance: F.balance(a.id) }; })
      };
    }
  };

  L.finance = F;
})(window.LifeOS = window.LifeOS || {});
