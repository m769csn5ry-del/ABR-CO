/* ==========================================================================
   LifeOS — Finances
   Quatre volets : la vue d'ensemble (ce qui entre, ce qui sort, ce qui
   reste), le journal des transactions, les budgets et les comptes.
   Tous les chiffres viennent du même livre de comptes.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function monthNav(month, onChange) {
    return h('div.row', [
      h('button.iconbtn', { 'aria-label': 'Mois précédent', onclick: function () { onChange(D.monthKey(D.addMonths(month + '-01', -1))); } }, L.icon('chevron-left')),
      h('span.t-s.w-600', { style: { minWidth: '130px', textAlign: 'center' } }, D.caps(D.format(month + '-01', 'month'))),
      h('button.iconbtn', { 'aria-label': 'Mois suivant', onclick: function () { onChange(D.monthKey(D.addMonths(month + '-01', 1))); } }, L.icon('chevron-right'))
    ]);
  }

  /* ---------------- vue d'ensemble ---------------- */
  function overview(month) {
    var period = L.finance.month(month);
    var budget = L.finance.budget(month);
    var forecast = L.finance.forecast(month);
    var cats = L.finance.byCategory(month + '-01', D.endOfMonth(month + '-01'), 'expense');
    var series = L.finance.series(6);
    var accounts = L.finance.accounts();
    var goals = L.store.state.goals.filter(function (g) {
      return g.status === 'active' && ((g.source || {}).type === 'savings' || g.unit === '€');
    });

    return [
      h('div.grid.grid--4.grid--keep2', [
        L.views.stat('Solde total', L.format.money(L.finance.totalBalance(), { decimals: 0 }),
          accounts.length + ' ' + L.util.plural(accounts.length, 'compte')),
        L.views.stat('Revenus du mois', L.format.money(period.income, { decimals: 0 }), period.count + ' mouvements', { tone: 'positive' }),
        L.views.stat('Dépenses du mois', L.format.money(period.expense, { decimals: 0 }),
          forecast.daysLeft ? 'projection ' + L.format.money(forecast.projected, { decimals: 0 }) : 'mois clos'),
        L.views.stat('Épargne du mois', L.format.money(period.put, { decimals: 0 }),
          'taux ' + L.format.percent(period.rate, 0), { bar: period.rate, barVariant: 'positive' })
      ]),

      budget.global ? h('div.card', { style: { marginTop: 'var(--sp-4)' } }, [
        h('div.between', { style: { marginBottom: '10px' } }, [
          h('div.card__title', 'Budget mensuel'),
          h('span.chip' + (budget.global.state === 'over' ? '.chip--danger' : budget.global.state === 'near' ? '.chip--warning' : '.chip--positive'),
            budget.global.state === 'over' ? 'Dépassé de ' + L.format.money(-budget.global.left)
              : budget.global.state === 'near' ? 'Bientôt atteint'
              : 'Reste ' + L.format.money(budget.global.left))
        ]),
        L.dom.bar(L.util.clamp(budget.global.ratio, 0, 1.2), budget.global.state === 'over' ? 'danger' : budget.global.state === 'near' ? 'warning' : null),
        h('div.between.t-xs.faint', { style: { marginTop: '6px' } }, [
          h('span', L.format.money(budget.global.spent) + ' dépensés'),
          h('span', 'plafond ' + L.format.money(budget.global.budget))
        ])
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Six derniers mois'),
        h('div.card', [
          L.charts.bars(series, {
            height: 200,
            series: [
              { key: 'income', color: L.charts.palette().positive },
              { key: 'expense', color: L.charts.palette().ink },
              { key: 'saving', color: L.charts.palette().info }
            ],
            format: function (v) { return L.format.compact(v); }
          }),
          h('div.legend', { style: { marginTop: 'var(--sp-3)' } }, [
            h('span.legend__item', [h('span.dot', { style: { background: 'var(--positive)' } }), 'Revenus']),
            h('span.legend__item', [h('span.dot', { style: { background: 'var(--ink)' } }), 'Dépenses']),
            h('span.legend__item', [h('span.dot', { style: { background: 'var(--info)' } }), 'Épargne'])
          ])
        ])
      ]),

      h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginTop: 'var(--sp-4)' } }, [
        h('div.card', [
          h('div.card__head', [h('div.card__title', 'Répartition des dépenses')]),
          cats.length ? h('div.row', { style: { gap: 'var(--sp-5)', alignItems: 'center', flexWrap: 'wrap' } }, [
            h('div', { style: { width: '170px', flex: 'none' } }, [
              L.charts.donut(cats.map(function (c) { return { value: c.total, color: c.color }; }), {
                height: 170,
                center: L.format.money(period.expense, { decimals: 0, compact: period.expense > 9999 }),
                centerSub: 'dépensés'
              })
            ]),
            h('div.grow', { style: { minWidth: '160px' } }, [
              L.charts.ranking(cats.slice(0, 6).map(function (c) {
                return { label: c.name, value: c.total, color: c.color };
              }), { format: function (v) { return L.format.money(v, { decimals: 0 }); } })
            ])
          ]) : h('p.t-s.muted', 'Aucune dépense ce mois-ci.')
        ]),

        h('div.card', [
          h('div.card__head', [h('div.card__title', 'Comptes')]),
          h('div.col', { style: { gap: 'var(--sp-3)' } }, accounts.map(function (a) {
            return h('button.between', {
              style: { textAlign: 'left' },
              onclick: function () { L.forms.account(a); }
            }, [
              h('div.row', [
                h('span.swatch', { style: { background: a.color } }),
                h('div', [
                  h('div.t-s.w-500', a.name),
                  h('div.t-xs.faint', a.kind)
                ])
              ]),
              h('span.t-s.w-600.num', L.format.money(L.finance.balance(a.id)))
            ]);
          })),
          h('button.btn.btn--s.btn--ghost', {
            style: { marginTop: 'var(--sp-4)' },
            onclick: function () { L.forms.account(); }
          }, [L.icon('plus'), 'Ajouter un compte'])
        ])
      ]),

      (function () {
        var upcoming = L.finance.upcoming(31);
        if (!upcoming.length) return null;
        var total = L.util.sum(upcoming.filter(function (u) { return u.model.type !== 'income'; }),
          function (u) { return u.model.amount; });
        var income = L.util.sum(upcoming.filter(function (u) { return u.model.type === 'income'; }),
          function (u) { return u.model.amount; });
        return h('div.section', [
          L.views.sectionHead('À venir · 30 jours',
            h('span.t-xs.muted', L.format.money(total) + ' à sortir' + (income ? ' · ' + L.format.money(income) + ' à rentrer' : ''))),
          h('div.list.list--framed', upcoming.slice(0, 8).map(function (u) {
            var cat = u.model.categoryId ? L.finance.category(u.model.categoryId) : null;
            return h('div.list__item', [
              h('span.t-xs.muted.num', { style: { width: '62px', flex: 'none' } }, D.format(u.date, 'short')),
              h('div.tx__icon', { style: cat ? { background: cat.color + '22' } : null }, cat ? cat.icon : '↻'),
              h('div.grow', { style: { minWidth: 0 } }, [
                h('div.t-s.truncate', u.model.description || (cat ? cat.name : 'Mouvement')),
                h('div.t-xs.faint', D.recurrenceLabel(u.model.recurrence) + ' · ' + D.relative(u.date, { caps: false }))
              ]),
              h('span.t-s.w-600.num' + (u.model.type === 'income' ? '.positive' : ''),
                (u.model.type === 'income' ? '+' : '−') + L.format.money(u.model.amount)),
              h('button.btn.btn--s', {
                onclick: function () {
                  L.finance.confirm(u.model, u.date);
                  L.toast.undo('Mouvement enregistré');
                }
              }, 'Enregistrer')
            ]);
          }))
        ]);
      })(),

      goals.length ? h('div.section', [
        L.views.sectionHead('Objectifs financiers'),
        h('div.grid.grid--auto', goals.map(function (g) { return L.views.goalCard(g); }))
      ]) : null,

      h('div.section', [
        L.views.sectionHead('Prévisions'),
        h('div.card', [
          h('div.grid.grid--3.grid--keep2', [
            h('div', [
              h('div.stat__label', 'Rythme de dépense'),
              h('div.t-l.w-600.num', L.format.money(forecast.pace) + ' / jour')
            ]),
            h('div', [
              h('div.stat__label', 'Dépenses fixes à venir'),
              h('div.t-l.w-600.num', L.format.money(forecast.fixedLeft, { decimals: 0 }))
            ]),
            h('div', [
              h('div.stat__label', 'Reste à vivre estimé'),
              h('div.t-l.w-600.num' + (forecast.saveable < 0 ? '.negative' : '.positive'), L.format.money(forecast.saveable, { decimals: 0 }))
            ])
          ]),
          h('p.t-xs.faint', { style: { marginTop: 'var(--sp-4)' } },
            forecast.daysLeft
              ? 'Projection calculée sur le rythme constaté depuis le début du mois, plus les dépenses fixes non encore passées. ' +
                forecast.daysLeft + ' jours restants.'
              : 'Mois terminé : les chiffres ci-dessus sont définitifs.')
        ])
      ])
    ];
  }

  /* ---------------- transactions ---------------- */
  function transactions(params, month) {
    var from = params.all === '1' ? '0000-01-01' : month + '-01';
    var to = params.all === '1' ? '9999-12-31' : D.endOfMonth(month + '-01');
    var list = L.finance.filter({
      from: from, to: to,
      type: params.type || 'all',
      categoryId: params.category || null,
      accountId: params.account || null,
      query: params.q || ''
    });
    var byDay = L.util.groupBy(list, function (t) { return t.date; });
    var days = Object.keys(byDay).sort().reverse();

    return [
      h('div.toolbar', { style: { marginBottom: 'var(--sp-4)' } }, [
        h('input.input', {
          placeholder: 'Rechercher…', 'aria-label': 'Rechercher une transaction',
          value: params.q || '', style: { maxWidth: '220px' },
          oninput: L.util.debounce(function (e) { L.router.setParams({ q: e.target.value }, { replace: true }); }, 250)
        }),
        L.forms.select([{ value: 'all', label: 'Tous les types' }].concat(L.schema.TX_TYPES.map(function (t) {
          return { value: t.id, label: t.label };
        })), params.type || 'all', function (v) { L.router.setParams({ type: v }); }, { 'aria-label': 'Filtrer par type' }),
        L.forms.select([{ value: '', label: 'Toutes catégories' }].concat(L.finance.categories().map(function (c) {
          return { value: c.id, label: c.name };
        })), params.category || '', function (v) { L.router.setParams({ category: v }); }, { 'aria-label': 'Filtrer par catégorie' }),
        L.forms.select([{ value: '', label: 'Tous les comptes' }].concat(L.finance.accounts().map(function (a) {
          return { value: a.id, label: a.name };
        })), params.account || '', function (v) { L.router.setParams({ account: v }); }, { 'aria-label': 'Filtrer par compte' }),
        h('button.chip.chip--tap' + (params.all === '1' ? '.chip--accent' : ''), {
          onclick: function () { L.router.setParams({ all: params.all === '1' ? '' : '1' }); }
        }, 'Tout l\'historique')
      ]),

      h('div.row.wrap.t-xs.muted', { style: { marginBottom: 'var(--sp-4)', gap: '14px' } }, [
        h('span', list.length + ' mouvements'),
        h('span', 'Entrées ' + L.format.money(L.util.sum(list.filter(function (t) { return t.type === 'income'; }), function (t) { return t.amount; }), { decimals: 0 })),
        h('span', 'Sorties ' + L.format.money(L.util.sum(list.filter(function (t) { return t.type === 'expense'; }), function (t) { return t.amount; }), { decimals: 0 }))
      ]),

      list.length
        ? h('div.col', { style: { gap: 'var(--sp-5)' } }, days.map(function (day) {
            var dayList = byDay[day];
            var total = L.util.sum(dayList, function (t) { return L.finance.sign(t.type) * t.amount; });
            return h('div', [
              h('div.between', { style: { marginBottom: '6px' } }, [
                h('span.eyebrow', D.format(day, 'long')),
                h('span.t-xs.faint.num', L.format.money(total, { sign: true, decimals: 2 }))
              ]),
              h('div.list--framed', dayList.map(function (t) { return L.views.txRow(t); }))
            ]);
          }))
        : L.dom.empty('wallet', 'Aucune transaction', 'Rien pour cette période ou ce filtre.',
            h('button.btn.btn--primary', { onclick: function () { L.forms.transaction(null, { type: 'expense' }); } }, 'Ajouter une dépense'))
    ];
  }

  /* ---------------- budgets ---------------- */
  function budgets(month) {
    var budget = L.finance.budget(month);
    var settings = L.store.state.settings.finance || {};
    var cats = L.finance.categories('expense');

    return [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Budget global')]),
        h('div.row.wrap', { style: { gap: 'var(--sp-4)' } }, [
          L.dom.field('Plafond mensuel', h('input.input', {
            type: 'number', min: '0', step: '10',
            value: settings.monthlyBudget === null || settings.monthlyBudget === undefined ? '' : String(settings.monthlyBudget),
            placeholder: 'Aucun', style: { width: '160px' },
            onchange: function (e) {
              L.store.setSetting('finance.monthlyBudget', e.target.value === '' ? null : +e.target.value);
              L.toast.show('Budget enregistré');
            }
          })),
          L.dom.field('Alerte à', h('input.input', {
            type: 'number', min: '10', max: '100', step: '5',
            value: String(Math.round((settings.alertAt || 0.8) * 100)), style: { width: '110px' },
            onchange: function (e) { L.store.setSetting('finance.alertAt', L.util.clamp(+e.target.value, 10, 100) / 100); }
          }), '% du plafond')
        ]),
        budget.global ? h('div', { style: { marginTop: 'var(--sp-5)' } }, [
          L.dom.bar(L.util.clamp(budget.global.ratio, 0, 1.2), budget.global.state === 'over' ? 'danger' : budget.global.state === 'near' ? 'warning' : null),
          h('div.between.t-xs.faint', { style: { marginTop: '6px' } }, [
            h('span', L.format.money(budget.global.spent) + ' dépensés'),
            h('span', L.format.money(Math.max(0, budget.global.left)) + ' restants')
          ])
        ]) : h('p.t-xs.faint', { style: { marginTop: 'var(--sp-3)' } }, 'Aucun plafond global : seules les catégories avec budget sont surveillées.')
      ]),

      h('div.section', [
        L.views.sectionHead('Budgets par catégorie', h('button.btn.btn--s', {
          onclick: function () { L.forms.category(); }
        }, [L.icon('plus'), 'Catégorie'])),
        h('div.card', cats.map(function (c) {
          var line = budget.categories.filter(function (b) { return b.category.id === c.id; })[0];
          var spent = line ? line.spent : L.util.sum(L.finance.filter({
            from: month + '-01', to: D.endOfMonth(month + '-01'), categoryId: c.id, type: 'expense'
          }), function (t) { return t.amount; });
          return h('div.budget', [
            h('div.between', [
              h('button.row', { style: { textAlign: 'left' }, onclick: function () { L.forms.category(c); } }, [
                h('span', { style: { color: c.color } }, c.icon),
                h('span.t-s.w-500', c.name)
              ]),
              h('div.row', [
                h('span.t-xs.num' + (line && line.state === 'over' ? '.negative' : line && line.state === 'near' ? '.warning' : '.muted'),
                  L.format.money(spent, { decimals: 0 }) + (c.budget ? ' / ' + L.format.money(c.budget, { decimals: 0 }) : '')),
                h('input.input.input--mini', {
                  type: 'number', min: '0', step: '10', placeholder: 'budget',
                  'aria-label': 'Budget mensuel de ' + c.name,
                  value: c.budget === null || c.budget === undefined ? '' : String(c.budget),
                  style: { width: '104px' },
                  onchange: function (e) {
                    L.finance.saveCategory(c.id, { budget: e.target.value === '' ? null : +e.target.value });
                  }
                })
              ])
            ]),
            c.budget ? L.dom.bar(L.util.clamp(spent / c.budget, 0, 1.2),
              spent > c.budget ? 'danger' : spent >= c.budget * (L.store.state.settings.finance.alertAt || 0.8) ? 'warning' : null,
              { thin: true }) : null
          ]);
        }))
      ]),

      h('div.section', [
        L.views.sectionHead('Engagements récurrents',
          h('button.btn.btn--s', {
            onclick: function () { L.forms.transaction(null, { type: 'expense', fixed: true }); }
          }, [L.icon('plus'), 'Ajouter'])),
        (function () {
          var models = L.finance.recurring();
          if (!models.length) {
            return h('p.t-s.faint', 'Aucun mouvement récurrent. Déclare la récurrence d\'un loyer ou d\'un abonnement : ' +
              'il se réenregistrera seul et entrera dans la projection de fin de mois.');
          }
          var monthly = L.util.sum(models.filter(function (m) {
            return m.type !== 'income' && m.recurrence.freq === 'monthly';
          }), function (m) { return m.amount; });
          return h('div', [
            h('div.list--framed', models.map(function (m) {
              var cat = m.categoryId ? L.finance.category(m.categoryId) : null;
              return h('button.tx', { onclick: function () { L.forms.transaction(m); } }, [
                h('div.tx__icon', { style: cat ? { background: cat.color + '22' } : null }, cat ? cat.icon : '↻'),
                h('div.grow', { style: { minWidth: 0 } }, [
                  h('div.t-s.w-500.truncate', m.description || (cat ? cat.name : 'Mouvement')),
                  h('div.t-xs.faint.truncate', D.recurrenceLabel(m.recurrence) +
                    (m.recurrence.until ? ' · jusqu\'au ' + D.format(m.recurrence.until, 'short') : ''))
                ]),
                h('div.tx__amount' + (m.type === 'income' ? '.positive' : ''),
                  (m.type === 'income' ? '+' : '−') + L.format.money(m.amount))
              ]);
            })),
            monthly ? h('p.t-xs.faint', { style: { marginTop: 'var(--sp-3)' } },
              L.format.money(monthly) + ' de charges mensuelles engagées avant toute dépense libre.') : null
          ]);
        })()
      ])
    ];
  }

  /* ---------------- bilan du mois ---------------- */
  function adviceCard(item) {
    var tone = item.kind === 'warning' ? 'danger'
      : item.kind === 'positive' ? 'positive'
      : item.kind === 'caveat' ? 'warning' : null;
    var border = tone === 'danger' ? 'var(--danger)'
      : tone === 'positive' ? 'var(--positive)'
      : tone === 'warning' ? 'var(--warning)' : 'var(--line)';

    return h('div.card', { style: { borderLeft: '3px solid ' + border } }, [
      h('div.between.wrap', { style: { gap: 'var(--sp-3)' } }, [
        h('div.grow', { style: { minWidth: 0 } }, [
          h('div.t-s.w-600', item.title),
          item.detail ? h('p.t-xs.muted', { style: { marginTop: '5px' } }, item.detail) : null
        ]),
        item.gain > 0 ? h('span.chip.chip--positive.nowrap', L.format.money(item.gain) + ' / mois') : null
      ]),
      item.action ? h('div.row', { style: { marginTop: 'var(--sp-3)' } }, [
        h('button.btn.btn--s', {
          onclick: function () {
            var a = item.action;
            if (a.type === 'categorize') L.forms.sortUncategorized();
            else if (a.type === 'subscriptions') L.router.setParams({ tab: 'bilan', focus: 'subs' });
            else if (a.type === 'category') L.router.setParams({ tab: 'transactions', category: a.categoryId });
            else if (a.type === 'goal') L.router.go('goals', { id: a.goalId });
          }
        }, item.action.label)
      ]) : null
    ]);
  }

  function bilan(month) {
    var r = L.insights.month(month);
    var advice = L.insights.advice(r);
    var gains = advice.filter(function (a) { return a.gain > 0; });
    var totalGain = L.util.sum(gains, function (a) { return a.gain; });

    return [
      /* --- le mois en quatre chiffres, comparés à l'ordinaire --- */
      h('div.grid.grid--4.grid--keep2', [
        L.views.stat('Revenus', L.format.money(r.period.income, { decimals: 0 }),
          r.delta.income ? L.format.money(r.delta.income, { sign: true, decimals: 0 }) + ' vs moyenne' : 'stable',
          { tone: 'positive' }),
        L.views.stat('Dépenses', L.format.money(r.period.expense, { decimals: 0 }),
          r.delta.expense ? L.format.money(r.delta.expense, { sign: true, decimals: 0 }) + ' vs moyenne' : 'stable',
          { tone: r.delta.expense > 0 ? 'negative' : null }),
        L.views.stat('Épargne', L.format.money(r.period.put, { decimals: 0 }),
          L.format.percent(r.period.rate, 0) + ' des revenus',
          { bar: r.period.rate, barVariant: 'positive' }),
        r.isCurrent && r.daysLeft
          ? L.views.stat('Reste à vivre', r.perDay === null ? '—' : L.format.money(r.perDay) + ' / jour',
              L.format.money(r.available, { decimals: 0 }) + ' sur ' + r.daysLeft + ' jours',
              { tone: r.available < 0 ? 'negative' : null })
          : L.views.stat('Solde du mois', L.format.money(r.period.net, { sign: true, decimals: 0 }),
              r.period.net >= 0 ? 'excédent' : 'déficit',
              { tone: r.period.net >= 0 ? 'positive' : 'negative' })
      ]),

      /* --- ce qu'il y a à en faire --- */
      h('div.section', [
        L.views.sectionHead('Ce que ça dit',
          totalGain > 0 ? h('span.chip.chip--positive', 'jusqu\'à ' + L.format.money(totalGain) + ' / mois') : null),
        advice.length
          ? h('div.col', { style: { gap: 'var(--sp-3)' } }, advice.map(adviceCard))
          : L.dom.empty('sparkle', 'Pas encore de quoi conclure',
              'Importe un relevé ou saisis quelques mois d\'opérations : l\'analyse a besoin d\'un passé pour comparer.',
              h('button.btn.btn--primary', { onclick: function () { L.forms.importStatement(); } }, 'Importer un relevé'))
      ]),

      /* --- les engagements récurrents --- */
      r.subscriptions.length ? h('div.section', [
        L.views.sectionHead('Engagements récurrents',
          h('span.t-xs.muted', L.format.money(r.subscriptionsMonthly) + ' / mois de dépenses' +
            (r.savingCommitments ? ' · ' + L.format.money(r.savingCommitments) + ' d\'épargne' : ''))),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-3)' } },
          'Prélèvements au montant fixe, revenus au moins trois mois de suite.'),
        h('div.list.list--framed', r.subscriptions.map(function (sub) {
          return h('div.list__item', [
            h('div.tx__icon', { style: sub.category ? { background: sub.category.color + '22' } : null },
              sub.category ? sub.category.icon : '↻'),
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.truncate', sub.label),
              h('div.t-xs.faint', sub.months + ' mois consécutifs' +
                (sub.isSaving ? ' · épargne programmée' : '') +
                (sub.category ? ' · ' + sub.category.name : '') +
                (sub.activeThisMonth ? '' : ' · pas encore passé ce mois-ci'))
            ]),
            h('div', { style: { textAlign: 'right', flex: 'none' } }, [
              h('div.t-s.w-600.num', L.format.money(sub.amount)),
              h('div.t-xs.faint.num', L.format.money(sub.yearly, { decimals: 0 }) + ' / an')
            ])
          ]);
        }))
      ]) : null,

      /* --- les postes qui bougent --- */
      r.categories.length ? h('div.section', [
        L.views.sectionHead('Postes du mois, comparés à l\'ordinaire'),
        h('div.card', [
          h('div.col', { style: { gap: 'var(--sp-4)' } }, r.categories.slice(0, 8).map(function (c) {
            var worse = c.deltaRatio !== null && c.deltaRatio > 0.15 && c.delta > 15;
            var better = c.deltaRatio !== null && c.deltaRatio < -0.15 && c.delta < -15;
            return h('div', [
              h('div.between.t-xs', { style: { marginBottom: '5px' } }, [
                h('span.row', { style: { gap: '6px', minWidth: 0 } }, [
                  L.dom.dot(c.color), h('span.truncate', c.name)
                ]),
                h('span.row', { style: { gap: '8px', flex: 'none' } }, [
                  h('span.num.w-600', L.format.money(c.total, { decimals: 0 })),
                  c.usual ? h('span.num' + (worse ? '.negative' : better ? '.positive' : '.faint'),
                    L.format.money(c.delta, { sign: true, decimals: 0 })) : null
                ])
              ]),
              L.dom.bar(r.period.expense ? c.total / r.period.expense : 0,
                worse ? 'danger' : better ? 'positive' : null, { thin: true }),
              c.usual ? h('div.t-xs.faint', { style: { marginTop: '4px' } },
                'habituellement ' + L.format.money(c.usual, { decimals: 0 })) : null
            ]);
          }))
        ])
      ]) : null,

      /* --- fixe contre variable --- */
      r.period.expense ? h('div.section', [
        L.views.sectionHead('Structure des dépenses'),
        h('div.grid.grid--2', [
          L.views.stat('Charges fixes', L.format.money(r.fixed, { decimals: 0 }),
            r.period.income ? L.format.percent(r.fixedShare, 0) + ' de tes revenus' : 'engagements récurrents',
            { bar: L.util.clamp(r.fixedShare, 0, 1), barVariant: r.fixedShare > 0.5 ? 'danger' : null }),
          L.views.stat('Dépenses libres', L.format.money(r.variable, { decimals: 0 }),
            'ce sur quoi tu peux agir ce mois-ci')
        ])
      ]) : null,

      /* --- la fiabilité de l'analyse --- */
      h('div.section', [
        h('div.card.card--flat', [
          h('div.between.wrap', { style: { gap: 'var(--sp-3)' } }, [
            h('div.grow', { style: { minWidth: 0 } }, [
              h('div.t-s.w-600', r.coverage.missing
                ? r.coverage.missing + ' opérations sans catégorie'
                : 'Toutes les opérations sont classées'),
              h('p.t-xs.muted', { style: { marginTop: '4px' } },
                r.coverage.missing
                  ? 'L\'analyse porte sur ' + L.format.percent(r.coverage.ratio, 0) + ' de tes dépenses du mois.'
                  : 'L\'analyse porte sur l\'intégralité du mois.')
            ]),
            h('div.row', { style: { gap: '6px' } }, [
              r.coverage.missing ? h('button.btn.btn--s', {
                onclick: function () { L.forms.sortUncategorized(); }
              }, 'Classer') : null,
              h('button.btn.btn--s', {
                onclick: function () { L.forms.importStatement(); }
              }, [L.icon('upload'), 'Importer un relevé'])
            ])
          ])
        ])
      ])
    ];
  }

  /* ---------------- catégories & comptes ---------------- */
  function structure() {
    return [
      h('div.section', { style: { marginTop: 0 } }, [
        L.views.sectionHead('Comptes', h('button.btn.btn--s', { onclick: function () { L.forms.account(); } }, [L.icon('plus'), 'Ajouter'])),
        h('div.list.list--framed', L.store.state.accounts.map(function (a) {
          return h('div.list__item', [
            h('span.swatch', { style: { background: a.color } }),
            h('div.grow', [
              h('div.t-s.w-500', a.name),
              h('div.t-xs.faint', a.kind + ' · départ ' + L.format.money(a.opening))
            ]),
            h('span.t-s.w-600.num', L.format.money(L.finance.balance(a.id))),
            h('button.iconbtn', { 'aria-label': 'Modifier', onclick: function () { L.forms.account(a); } }, L.icon('edit')),
            h('button.iconbtn', {
              'aria-label': 'Supprimer',
              onclick: function () {
                L.modal.confirm({ title: 'Supprimer le compte', text: 'Les transactions seront conservées mais détachées.', danger: true, confirm: 'Supprimer' })
                  .then(function (ok) { if (ok) { L.finance.removeAccount(a.id); L.toast.undo('Compte supprimé'); } });
              }
            }, L.icon('trash'))
          ]);
        }))
      ]),
      h('div.section', [
        L.views.sectionHead('Catégories', h('button.btn.btn--s', { onclick: function () { L.forms.category(); } }, [L.icon('plus'), 'Ajouter'])),
        h('div.col', { style: { gap: 'var(--sp-5)' } }, ['expense', 'income', 'saving'].map(function (type) {
          var list = L.finance.categories(type);
          return h('div', [
            h('div.eyebrow', { style: { marginBottom: '8px' } },
              type === 'expense' ? 'Dépenses' : type === 'income' ? 'Revenus' : 'Épargne'),
            h('div.list.list--framed', list.map(function (c) {
              return h('div.list__item', [
                h('span', { style: { color: c.color, width: '20px' } }, c.icon),
                h('div.grow', [
                  h('div.t-s', c.name),
                  c.budget ? h('div.t-xs.faint', 'budget ' + L.format.money(c.budget, { decimals: 0 })) : null
                ]),
                h('button.iconbtn', { 'aria-label': 'Modifier', onclick: function () { L.forms.category(c); } }, L.icon('edit')),
                h('button.iconbtn', {
                  'aria-label': 'Supprimer',
                  onclick: function () {
                    L.modal.confirm({ title: 'Supprimer', text: 'Les transactions garderont leur montant mais perdront cette catégorie.', danger: true, confirm: 'Supprimer' })
                      .then(function (ok) { if (ok) { L.finance.removeCategory(c.id); L.toast.undo('Catégorie supprimée'); } });
                  }
                }, L.icon('trash'))
              ]);
            }))
          ]);
        }))
      ])
    ];
  }

  L.views.finance = function (params) {
    var tab = params.tab || 'overview';
    var month = params.month || D.monthKey(D.today());

    var body = tab === 'transactions' ? transactions(params, month)
      : tab === 'bilan' ? bilan(month)
      : tab === 'budgets' ? budgets(month)
      : tab === 'structure' ? structure()
      : overview(month);

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
          h('div', [
            h('h1.view__title', 'Finances'),
            h('p.view__lead', 'Revenus, dépenses, épargne et budgets — au même endroit que le reste de ta vie.')
          ]),
          h('div.row.wrap', { style: { gap: 'var(--sp-2)' } }, [
            tab !== 'structure' ? monthNav(month, function (m) { L.router.setParams({ month: m }); }) : null,
            h('button.btn.btn--primary', { onclick: function () { L.forms.transaction(null, { type: 'expense' }); } }, [L.icon('plus'), 'Transaction']),
            h('button.iconbtn', {
              'aria-label': 'Autres actions',
              onclick: function (e) {
                L.menu(e.currentTarget, [
                  { icon: 'upload', label: 'Importer un relevé (CSV, OFX, QIF)', run: function () { L.forms.importStatement(); } },
                  { icon: 'tag', label: 'Classer les opérations sans catégorie', hint: String(L.rules.uncategorized().length),
                    run: function () { L.forms.sortUncategorized(); } },
                  { icon: 'download', label: 'Exporter les transactions (.csv)', run: function () {
                    var rows = [['Date', 'Type', 'Catégorie', 'Description', 'Montant', 'Compte']];
                    L.finance.all().forEach(function (t) {
                      var cat = t.categoryId ? L.finance.category(t.categoryId) : null;
                      var account = t.accountId ? L.finance.account(t.accountId) : null;
                      rows.push([t.date, L.schema.label(L.schema.TX_TYPES, t.type), cat ? cat.name : '',
                        (t.description || '').replace(/;/g, ','), String(L.finance.sign(t.type) * t.amount).replace('.', ','),
                        account ? account.name : '']);
                    });
                    L.util.download('lifeos-transactions-' + D.today() + '.csv',
                      rows.map(function (r) { return r.join(';'); }).join('\n'), 'text/csv;charset=utf-8');
                    L.toast.show('Transactions exportées');
                  } },
                  '-',
                  { icon: 'repeat', label: 'Voir les engagements récurrents', run: function () { L.router.setParams({ tab: 'budgets' }); } }
                ], { align: 'right' });
              }
            }, L.icon('more'))
          ])
        ]),
        h('div.toolbar', { style: { marginTop: 'var(--sp-5)' } }, [
          L.dom.segmented([
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'bilan', label: 'Bilan', icon: 'sparkle' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'budgets', label: 'Budgets' },
            { id: 'structure', label: 'Comptes & catégories' }
          ], tab, function (id) { L.router.setParams({ tab: id }); })
        ])
      ]),
      h('div.col', { style: { gap: 'var(--sp-4)' } }, body)
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
