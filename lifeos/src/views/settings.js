/* ==========================================================================
   LifeOS — Paramètres
   Tout ce qui structure l'application se modifie ici : apparence, ordre des
   sections, domaines, rythme de la journée, notifications, assistant,
   comptes, sécurité et données. Rien n'est verrouillé.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function setting(title, desc, control) {
    return h('div.setting', [
      h('div.setting__text', [
        h('div.setting__title', title),
        desc ? h('div.setting__desc', desc) : null
      ]),
      h('div.setting__control', control)
    ]);
  }

  /* Réordonnancement : glisser-déposer sur ordinateur, flèches partout. */
  function reorderList(items, onMove) {
    var dragIndex = null;
    return h('div', items.map(function (item, i) {
      var row = h('div.reorder', {
        draggable: 'true',
        ondragstart: function (e) { dragIndex = i; row.classList.add('reorder--drag'); e.dataTransfer.effectAllowed = 'move'; },
        ondragend: function () { row.classList.remove('reorder--drag'); dragIndex = null; },
        ondragover: function (e) { e.preventDefault(); row.classList.add('reorder--over'); },
        ondragleave: function () { row.classList.remove('reorder--over'); },
        ondrop: function (e) {
          e.preventDefault();
          row.classList.remove('reorder--over');
          if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i);
        }
      }, [
        h('span.reorder__grip', L.icon('drag')),
        item.content,
        h('div.row', { style: { gap: '2px' } }, [
          h('button.iconbtn', {
            'aria-label': 'Monter', disabled: i === 0,
            onclick: function () { if (i > 0) onMove(i, i - 1); }
          }, L.icon('chevron-left', 14)),
          h('button.iconbtn', {
            'aria-label': 'Descendre', disabled: i === items.length - 1,
            onclick: function () { if (i < items.length - 1) onMove(i, i + 1); }
          }, L.icon('chevron-right', 14))
        ]),
        item.trailing || null
      ]);
      return row;
    }));
  }

  /* ---------------- apparence ---------------- */
  function appearance() {
    var s = L.store.state.settings;
    var ACCENTS = [
      { id: 'encre', label: 'Encre', color: 'var(--ink)' },
      { id: 'bleu', label: 'Bleu', color: '#2E6BE6' },
      { id: 'violet', label: 'Violet', color: '#6B54E8' },
      { id: 'vert', label: 'Vert', color: '#1B7F5A' },
      { id: 'ambre', label: 'Ambre', color: '#A9761A' },
      { id: 'rouge', label: 'Rouge', color: '#B23A32' },
      { id: 'rose', label: 'Rose', color: '#C2417F' }
    ];
    return h('div.card', [
      setting('Thème', 'Suit le système, ou forcé en clair ou sombre.',
        L.dom.segmented([
          { id: 'auto', label: 'Automatique' },
          { id: 'light', label: 'Clair', icon: 'sun' },
          { id: 'dark', label: 'Sombre', icon: 'moon' }
        ], s.theme, function (id) { L.store.setSetting('theme', id); L.app.applyTheme(); })),

      setting('Couleur d\'accent', 'L\'interface reste noir et blanc ; l\'accent ne sert qu\'aux éléments actifs.',
        h('div.row.wrap', { style: { gap: '6px' } }, ACCENTS.map(function (a) {
          return h('button', {
            'aria-label': a.label, title: a.label,
            style: {
              width: '28px', height: '28px', borderRadius: '9px', background: a.color,
              border: s.accent === a.id ? '2px solid var(--ink)' : '2px solid var(--line)',
              outline: s.accent === a.id ? '2px solid var(--bg)' : 'none', outlineOffset: '-4px'
            },
            onclick: function () { L.store.setSetting('accent', a.id); L.app.applyTheme(); }
          });
        }))),

      setting('Densité', 'Compact resserre le rythme vertical.',
        L.dom.segmented([
          { id: 'confort', label: 'Confort' },
          { id: 'compact', label: 'Compact' }
        ], s.density === 'compact' ? 'compact' : 'confort', function (id) {
          L.store.setSetting('density', id); L.app.applyTheme();
        })),

      setting('Premier jour de la semaine', null,
        L.forms.select([
          { value: 1, label: 'Lundi' },
          { value: 0, label: 'Dimanche' },
          { value: 6, label: 'Samedi' }
        ], s.firstDayOfWeek, function (v) { L.store.setSetting('firstDayOfWeek', +v); })),

      setting('Devise', 'Utilisée partout dans les finances et les objectifs.',
        L.forms.select([
          { value: 'EUR', label: 'Euro (€)' },
          { value: 'USD', label: 'Dollar ($)' },
          { value: 'CHF', label: 'Franc suisse' },
          { value: 'GBP', label: 'Livre (£)' },
          { value: 'CAD', label: 'Dollar canadien' }
        ], s.currency, function (v) { L.store.setSetting('currency', v); L.toast.show('Devise mise à jour'); }))
    ]);
  }

  /* ---------------- navigation ---------------- */
  function navigation() {
    var s = L.store.state.settings;
    var defs = {};
    L.schema.SECTIONS.forEach(function (d) { defs[d.id] = d; });

    var items = (s.sections || []).map(function (entry) {
      var def = defs[entry.id];
      if (!def) return null;
      return {
        content: h('div.grow.row', { style: { minWidth: 0 } }, [
          L.icon(def.icon),
          h('span.t-s.truncate', def.label),
          def.hideable ? null : h('span.chip', 'toujours visible')
        ]),
        trailing: def.hideable
          ? L.dom.toggle(!entry.hidden, function (v) {
              var next = L.util.clone(s.sections);
              next.forEach(function (x) { if (x.id === entry.id) x.hidden = !v; });
              L.store.setSetting('sections', next);
            }, 'Afficher ' + def.label)
          : h('span', { style: { width: '42px' } })
      };
    }).filter(Boolean);

    var widgets = {
      planning: 'Planning du jour', tasks: 'Tâches prioritaires', next: 'Prochain événement',
      goals: 'Objectifs', habits: 'Habitudes', finance: 'Finances', time: 'Temps disponible',
      week: 'Progression de la semaine', tomorrow: 'Aperçu de demain'
    };
    var homeOrder = (s.home && s.home.widgets) || [];
    var homeHidden = (s.home && s.home.hidden) || [];

    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Ordre des sections')]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Glisse pour réordonner, ou utilise les flèches. Les sections masquées restent accessibles par la barre de commandes.'),
        reorderList(items, function (from, to) {
          var next = L.util.clone(s.sections);
          var moved = next.splice(from, 1)[0];
          next.splice(to, 0, moved);
          L.store.setSetting('sections', next);
        })
      ]),
      h('div.card', [
        h('div.card__head', [h('div.card__title', "Blocs de l'accueil")]),
        reorderList(homeOrder.filter(function (id) { return widgets[id]; }).map(function (id) {
          return {
            content: h('span.grow.t-s.truncate', widgets[id]),
            trailing: L.dom.toggle(homeHidden.indexOf(id) === -1, function (v) {
              var next = v ? homeHidden.filter(function (x) { return x !== id; }) : homeHidden.concat([id]);
              L.store.setSetting('home.hidden', next);
            }, widgets[id])
          };
        }), function (from, to) {
          var next = homeOrder.slice();
          var moved = next.splice(from, 1)[0];
          next.splice(to, 0, moved);
          L.store.setSetting('home.widgets', next);
        })
      ])
    ]);
  }

  /* ---------------- domaines ---------------- */
  function domains() {
    var list = L.domains.all();
    return h('div.card', [
      h('div.card__head', [
        h('div.card__title', 'Domaines de vie'),
        h('button.btn.btn--s', { onclick: function () { L.forms.domain(); } }, [L.icon('plus'), 'Ajouter'])
      ]),
      h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
        'Supprimer un domaine ne supprime rien de ce qu\'il contenait : les tâches, projets et habitudes sont simplement détachés.'),
      reorderList(list.map(function (dom) {
        var s = L.domains.summary(dom.id);
        return {
          content: h('div.grow.row', { style: { minWidth: 0 } }, [
            h('span', { style: { color: dom.color } }, L.icon(dom.icon)),
            h('div', { style: { minWidth: 0 } }, [
              h('div.t-s.truncate', dom.name),
              h('div.t-xs.faint', s.open + ' tâches · ' + s.projects + ' projets · ' + s.habits + ' habitudes')
            ])
          ]),
          trailing: h('div.row', { style: { gap: '2px' } }, [
            h('button.iconbtn', { 'aria-label': 'Modifier', onclick: function () { L.forms.domain(dom); } }, L.icon('edit')),
            h('button.iconbtn', {
              'aria-label': 'Supprimer',
              onclick: function () {
                L.modal.confirm({
                  title: 'Supprimer « ' + dom.name + ' »',
                  text: 'Le contenu sera conservé, sans domaine.', danger: true, confirm: 'Supprimer'
                }).then(function (ok) { if (ok) { L.domains.remove(dom.id); L.toast.undo('Domaine supprimé'); } });
              }
            }, L.icon('trash'))
          ])
        };
      }), function (from, to) {
        var ids = list.map(function (d) { return d.id; });
        var moved = ids.splice(from, 1)[0];
        ids.splice(to, 0, moved);
        L.domains.reorder(ids);
      })
    ]);
  }

  /* ---------------- journée ---------------- */
  function dayRhythm() {
    var day = L.store.state.settings.day;
    var ENERGY = [
      { value: 'high', label: 'Haute' },
      { value: 'medium', label: 'Moyenne' },
      { value: 'low', label: 'Basse' }
    ];
    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Plage de la journée')]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Le planning automatique ne place rien en dehors de cette plage.'),
        h('div.grid.grid--2', [
          L.dom.field('Début', h('input.input', {
            type: 'time', value: day.start,
            onchange: function (e) { L.store.setSetting('day.start', e.target.value || '08:00'); }
          })),
          L.dom.field('Fin', h('input.input', {
            type: 'time', value: day.end,
            onchange: function (e) { L.store.setSetting('day.end', e.target.value || '22:00'); }
          }))
        ]),
        setting('Jours travaillés', 'Sert à estimer la capacité de la semaine.',
          h('div.row.wrap', { style: { gap: '4px' } }, [1, 2, 3, 4, 5, 6, 0].map(function (d) {
            var on = (day.workDays || []).indexOf(d) > -1;
            return h('button.chip.chip--tap' + (on ? '.chip--accent' : ''), {
              onclick: function () {
                var next = (day.workDays || []).slice();
                var i = next.indexOf(d);
                if (i > -1) next.splice(i, 1); else next.push(d);
                L.store.setSetting('day.workDays', next);
              }
            }, D.DAYS_SHORT[d]);
          })))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Rythme de travail')]),
        setting('Bloc de concentration maximum', 'Une tâche plus longue est découpée en plusieurs blocs.',
          h('div.row', [
            h('input.input', {
              type: 'number', min: '20', max: '240', step: '5', value: String(day.maxFocus), style: { width: '90px' },
              onchange: function (e) { L.store.setSetting('day.maxFocus', L.util.clamp(+e.target.value || 90, 20, 240)); }
            }),
            h('span.t-xs.muted', 'min')
          ])),
        setting('Pause entre deux blocs', 'Insérée après un bloc d\'au moins 50 minutes.',
          h('div.row', [
            h('input.input', {
              type: 'number', min: '0', max: '60', step: '5', value: String(day.breakMinutes), style: { width: '90px' },
              onchange: function (e) { L.store.setSetting('day.breakMinutes', L.util.clamp(+e.target.value || 0, 0, 60)); }
            }),
            h('span.t-xs.muted', 'min')
          ])),
        setting('Bloc minimum', 'En dessous, un créneau est ignoré.',
          h('div.row', [
            h('input.input', {
              type: 'number', min: '5', max: '60', step: '5', value: String(day.minBlock), style: { width: '90px' },
              onchange: function (e) { L.store.setSetting('day.minBlock', L.util.clamp(+e.target.value || 15, 5, 60)); }
            }),
            h('span.t-xs.muted', 'min')
          ]))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', "Niveau d'énergie")]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Les tâches exigeantes sont placées aux moments où tu es le plus en forme ; les tâches faciles remplissent le reste.'),
        setting('Matin', 'Avant 12 h', L.forms.select(ENERGY, day.energy.morning, function (v) { L.store.setSetting('day.energy.morning', v); })),
        setting('Après-midi', 'De 12 h à 18 h', L.forms.select(ENERGY, day.energy.afternoon, function (v) { L.store.setSetting('day.energy.afternoon', v); })),
        setting('Soir', 'Après 18 h', L.forms.select(ENERGY, day.energy.evening, function (v) { L.store.setSetting('day.energy.evening', v); }))
      ])
    ]);
  }

  /* ---------------- notifications ---------------- */
  function notifications() {
    var n = L.store.state.settings.notifications;
    var permission = L.notify.permission();
    var queue = L.notify.preview();

    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Autorisation')]),
        permission === 'granted'
          ? h('div.row', [h('span.chip.chip--positive', 'Autorisées'),
              h('button.btn.btn--s', { onclick: function () { L.notify.test(); } }, 'Envoyer un test')])
          : permission === 'denied'
            ? h('p.t-s.muted', 'Les notifications sont bloquées par le navigateur. Réactive-les dans ses réglages de site, puis reviens ici.')
            : h('div.col', { style: { gap: '10px' } }, [
                h('p.t-s.muted', 'Les rappels partent quand l\'application est ouverte ou installée sur l\'écran d\'accueil.'),
                h('button.btn.btn--primary', {
                  onclick: function () {
                    L.notify.request().then(function (p) {
                      L.toast.show(p === 'granted' ? 'Notifications activées' : 'Autorisation refusée');
                      L.app.render();
                    });
                  }
                }, [L.icon('bell'), 'Activer les notifications'])
              ]),
        setting('Notifications actives', 'Coupe tous les rappels sans changer les réglages.',
          L.dom.toggle(n.enabled, function (v) { L.store.setSetting('notifications.enabled', v); L.notify.build(); }, 'Notifications'))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Ce qui déclenche un rappel')]),
        setting('Tâches à heure fixe', null, L.dom.toggle(n.tasks, function (v) { L.store.setSetting('notifications.tasks', v); }, 'Tâches')),
        setting('Échéances du jour', null, L.dom.toggle(n.deadlines, function (v) { L.store.setSetting('notifications.deadlines', v); }, 'Échéances')),
        setting('Rendez-vous', null, L.dom.toggle(n.events, function (v) { L.store.setSetting('notifications.events', v); }, 'Rendez-vous')),
        setting('Habitudes', 'Seulement celles qui ont une heure de rappel.', L.dom.toggle(n.habits, function (v) { L.store.setSetting('notifications.habits', v); }, 'Habitudes')),
        setting('Dates cibles d\'objectifs', null, L.dom.toggle(n.goals, function (v) { L.store.setSetting('notifications.goals', v); }, 'Objectifs')),
        setting('Anticipation', 'Combien de temps avant l\'heure prévue.',
          h('div.row', [
            h('input.input', {
              type: 'number', min: '0', max: '120', step: '5', value: String(n.leadMinutes), style: { width: '90px' },
              onchange: function (e) { L.store.setSetting('notifications.leadMinutes', L.util.clamp(+e.target.value || 0, 0, 120)); }
            }),
            h('span.t-xs.muted', 'min')
          ]))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Points de repère')]),
        setting('Planning du matin', 'Un résumé de la journée à l\'heure choisie.',
          h('div.row', [
            h('input.input', {
              type: 'time', value: n.dailyPlan.time, style: { width: '120px' },
              onchange: function (e) { L.store.setSetting('notifications.dailyPlan.time', e.target.value); }
            }),
            L.dom.toggle(n.dailyPlan.on, function (v) { L.store.setSetting('notifications.dailyPlan.on', v); }, 'Planning du matin')
          ])),
        setting('Préparation de la semaine', 'Le jour et l\'heure où l\'application prépare ta semaine.',
          h('div.row.wrap', [
            L.forms.select(D.DAYS.map(function (d, i) { return { value: i, label: d.charAt(0).toUpperCase() + d.slice(1) }; }),
              n.weeklyPlan.day, function (v) { L.store.setSetting('notifications.weeklyPlan.day', +v); }),
            h('input.input', {
              type: 'time', value: n.weeklyPlan.time, style: { width: '120px' },
              onchange: function (e) { L.store.setSetting('notifications.weeklyPlan.time', e.target.value); }
            }),
            L.dom.toggle(n.weeklyPlan.on, function (v) { L.store.setSetting('notifications.weeklyPlan.on', v); }, 'Préparation de la semaine')
          ]))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', "Rappels prévus aujourd'hui")]),
        queue.length
          ? h('div.list', queue.map(function (q) {
              return h('div.list__item', [
                h('span.t-xs.num.muted', { style: { width: '48px' } }, q.time),
                h('div.grow', [
                  h('div.t-s', q.title),
                  q.body ? h('div.t-xs.faint.truncate', q.body) : null
                ]),
                q.done ? h('span.chip', 'envoyé') : null
              ]);
            }))
          : h('p.t-s.muted', 'Aucun rappel prévu — ajoute une heure à une tâche, un rendez-vous ou une habitude.')
      ])
    ]);
  }

  /* ---------------- assistant ---------------- */
  function ai() {
    var a = L.store.state.settings.ai;
    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Mode de fonctionnement')]),
        setting('Moteur', 'Le mode local répond hors ligne, sans clé ni compte. Le mode étendu ajoute les questions libres.',
          L.dom.segmented([
            { id: 'local', label: 'Local' },
            { id: 'anthropic', label: 'Claude (API)' }
          ], a.provider, function (id) { L.store.setSetting('ai.provider', id); })),
        a.provider === 'anthropic' ? h('div.col', { style: { gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' } }, [
          L.dom.field('Clé d\'API', h('input.input', {
            type: 'password', value: a.apiKey, placeholder: 'sk-ant-…',
            onchange: function (e) { L.store.setSetting('ai.apiKey', e.target.value.trim()); L.toast.show('Clé enregistrée sur cet appareil'); }
          }), 'Stockée uniquement sur cet appareil, dans ton profil. Elle n\'est envoyée qu\'à l\'API d\'Anthropic.'),
          L.dom.field('Modèle', L.forms.select([
            { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 — équilibré' },
            { value: 'claude-opus-5', label: 'Claude Opus 5 — le plus capable' },
            { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — rapide' }
          ], a.model, function (v) { L.store.setSetting('ai.model', v); })),
          h('p.t-xs.faint', 'Les questions comprises localement (planning, priorités, chiffres, ajouts) restent traitées sur l\'appareil, même en mode étendu.')
        ]) : null
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Permissions')]),
        setting('Autoriser les actions', 'L\'assistant peut créer, modifier et reporter à ta place.',
          L.dom.toggle(a.allowActions, function (v) { L.store.setSetting('ai.allowActions', v); }, 'Actions')),
        setting('Partager les finances', 'En mode étendu, inclure les montants dans le contexte envoyé.',
          L.dom.toggle(a.shareFinance, function (v) { L.store.setSetting('ai.shareFinance', v); }, 'Finances'))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Ce que l\'assistant sait faire sans connexion')]),
        h('ul.col', { style: { gap: '6px' } }, [
          'Organiser une journée, une soirée ou une semaine',
          'Donner les priorités et les retards',
          'Répondre sur les dépenses, l\'épargne et le rythme à tenir',
          'Ajouter une tâche, une dépense, un objectif, un projet, une note',
          'Reporter ou terminer une tâche nommée'
        ].map(function (t) { return h('li.t-s.muted', '• ' + t); }))
      ])
    ]);
  }

  /* ---------------- compte & sécurité ---------------- */
  function account() {
    var profile = L.app.profile();
    var auth = L.store.state.settings.auth;
    var adapter = L.app.adapter();
    var encrypted = h('span.chip', 'vérification…');
    if (adapter) {
      adapter.isEncrypted().then(function (on) {
        L.dom.mount(encrypted, on ? 'Chiffrées' : 'Non chiffrées');
        encrypted.className = 'chip' + (on ? ' chip--positive' : '');
      });
    }

    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Profil actuel')]),
        h('div.row', [
          h('div.avatar', { style: { width: '44px', height: '44px' } },
            profile && profile.picture ? h('img', { src: profile.picture, alt: '' }) : L.util.initials(profile ? profile.name : '?')),
          h('div.grow', [
            h('div.t-m.w-600', profile ? profile.name : 'Invité'),
            h('div.t-xs.faint', L.auth.providerLabel(profile) + (profile && profile.email ? ' · ' + profile.email : ''))
          ]),
          h('button.btn.btn--s', {
            onclick: function () {
              L.modal.prompt({ title: 'Renommer', value: profile ? profile.name : '' }).then(function (v) {
                if (v && profile) { L.auth.rename(profile.id, v); L.app.render(); }
              });
            }
          }, 'Renommer')
        ]),
        h('div.card__foot.row.wrap', { style: { gap: '8px' } }, [
          h('button.btn.btn--s', { onclick: function () { L.app.addProfile(); } }, [L.icon('plus'), 'Nouveau profil']),
          h('button.btn.btn--s', { onclick: function () { L.app.signOut(); } }, 'Se déconnecter')
        ])
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Profils sur cet appareil')]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Chaque profil possède son propre espace de données. Aucun profil ne peut lire celui d\'un autre.'),
        h('div.list', L.auth.list().map(function (p) {
          var isCurrent = profile && p.id === profile.id;
          return h('div.list__item', [
            h('div.avatar', p.picture ? h('img', { src: p.picture, alt: '' }) : L.util.initials(p.name)),
            h('div.grow', [
              h('div.t-s.w-500', p.name),
              h('div.t-xs.faint', L.auth.providerLabel(p) + (isCurrent ? ' · en cours' : ''))
            ]),
            isCurrent ? h('span.chip.chip--accent', 'actif')
              : h('button.btn.btn--s', { onclick: function () { L.app.switchProfile(p.id); } }, 'Ouvrir'),
            isCurrent ? null : h('button.iconbtn', {
              'aria-label': 'Supprimer le profil',
              onclick: function () {
                L.modal.confirm({
                  title: 'Supprimer « ' + p.name + ' »',
                  text: 'Toutes les données de ce profil seront effacées de cet appareil. Cette action est définitive.',
                  danger: true, confirm: 'Supprimer définitivement'
                }).then(function (ok) {
                  if (!ok) return;
                  L.auth.remove(p.id).then(function () { L.toast.show('Profil supprimé'); L.app.render(); });
                });
              }
            }, L.icon('trash'))
          ]);
        }))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Connexion Google et Apple')]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Ces deux services fournissent une identité vérifiée depuis le navigateur. Renseigne les identifiants de ton application pour activer les boutons de connexion.'),
        L.dom.field('Identifiant client Google', h('input.input', {
          value: auth.googleClientId, placeholder: '…apps.googleusercontent.com',
          onchange: function (e) { L.store.setSetting('auth.googleClientId', e.target.value.trim()); }
        }), 'Console Google Cloud → Identifiants → ID client OAuth (application Web).'),
        L.dom.field('Identifiant de service Apple', h('input.input', {
          value: auth.appleClientId, placeholder: 'com.exemple.lifeos',
          onchange: function (e) { L.store.setSetting('auth.appleClientId', e.target.value.trim()); }
        }), 'Compte développeur Apple → Identifiers → Services ID.'),
        L.dom.field('URL de retour Apple', h('input.input', {
          value: auth.appleRedirect, placeholder: location.origin + location.pathname,
          onchange: function (e) { L.store.setSetting('auth.appleRedirect', e.target.value.trim()); }
        }), 'Doit correspondre exactement à l\'URL déclarée chez Apple.')
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Sécurité des données')]),
        setting('État du chiffrement', 'Le chiffrement AES-GCM protège tout le contenu de ce profil sur le disque.', encrypted),
        h('div.row.wrap', { style: { gap: '8px', marginTop: 'var(--sp-3)' } }, [
          h('button.btn.btn--s', {
            onclick: function () {
              if (!L.storage.canEncrypt()) { L.toast.error('Chiffrement indisponible sur ce navigateur.'); return; }
              L.modal.prompt({
                title: 'Protéger ce profil',
                label: 'Phrase secrète',
                hint: 'Elle sera demandée à chaque ouverture. Elle n\'est stockée nulle part : si tu l\'oublies, les données sont irrécupérables.'
              }).then(function (pass) {
                if (!pass) return;
                adapter.setPassphrase(pass);
                L.store.flush().then(function () {
                  L.toast.show('Profil chiffré');
                  L.app.render();
                });
              });
            }
          }, [L.icon('lock'), 'Définir une phrase secrète']),
          h('button.btn.btn--s.btn--ghost', {
            onclick: function () {
              L.modal.confirm({
                title: 'Retirer le chiffrement',
                text: 'Les données seront réécrites en clair sur cet appareil.',
                danger: true, confirm: 'Retirer'
              }).then(function (ok) {
                if (!ok) return;
                adapter.setPassphrase(null);
                L.store.flush().then(function () { L.toast.show('Chiffrement retiré'); L.app.render(); });
              });
            }
          }, 'Retirer')
        ]),
        h('p.t-xs.faint', { style: { marginTop: 'var(--sp-4)' } },
          'Les données restent sur cet appareil : rien n\'est envoyé sur un serveur, sauf si tu actives le mode étendu de l\'assistant.')
      ])
    ]);
  }

  /* ---------------- données ---------------- */
  function data() {
    var state = L.store.state;
    var counts = [
      ['Tâches', state.tasks.length],
      ['Projets', state.projects.length],
      ['Objectifs', state.goals.length],
      ['Transactions', state.transactions.length],
      ['Habitudes', state.habits.length],
      ['Événements', state.events.length],
      ['Notes', state.notes.length]
    ];
    var usage = h('span.t-xs.faint', 'calcul…');
    if (L.app.adapter()) {
      L.app.adapter().estimate().then(function (est) {
        if (est && est.usage) {
          usage.textContent = L.format.fileSize(est.usage) + ' utilisés' +
            (est.quota ? ' sur ' + L.format.fileSize(est.quota) + ' disponibles' : '');
        } else usage.textContent = 'Espace disponible non communiqué par le navigateur.';
      });
    }

    return h('div.col', [
      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Contenu')]),
        h('div.grid.grid--4.grid--keep2', counts.map(function (c) {
          return h('div', [h('div.stat__label', c[0]), h('div.t-l.w-600.num', String(c[1]))]);
        })),
        h('div.card__foot', [usage])
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Sauvegarde')]),
        h('p.t-xs.faint', { style: { marginBottom: 'var(--sp-4)' } },
          'Un fichier JSON contient tout : réglages, tâches, projets, objectifs, finances, habitudes, notes et historique.'),
        h('div.row.wrap', { style: { gap: '8px' } }, [
          h('button.btn', {
            onclick: function () {
              L.util.download('lifeos-' + D.today() + '.json', L.store.exportJSON(), 'application/json');
              L.toast.show('Sauvegarde téléchargée');
            }
          }, [L.icon('download'), 'Exporter tout']),
          h('button.btn', {
            onclick: function () {
              L.util.pickFile('.json,application/json').then(function (file) {
                if (!file) return;
                return L.util.readFile(file).then(function (text) {
                  L.modal.confirm({
                    title: 'Remplacer les données',
                    text: 'Le contenu actuel de ce profil sera remplacé par le fichier. Tu pourras annuler juste après.',
                    danger: true, confirm: 'Importer'
                  }).then(function (ok) {
                    if (!ok) return;
                    try {
                      L.store.importJSON(text);
                      L.toast.undo('Données importées');
                    } catch (e) { L.toast.error('Fichier illisible : ' + e.message); }
                  });
                });
              });
            }
          }, [L.icon('upload'), 'Importer']),
          h('button.btn', { onclick: function () { L.ics.download(); L.toast.show('Calendrier exporté'); } },
            [L.icon('calendar'), 'Exporter le calendrier']),
          h('button.btn', {
            onclick: function () {
              L.ics.importFile().then(function (res) {
                if (!res) return;
                L.toast.show(res.added + ' événements importés' + (res.skipped ? ', ' + res.skipped + ' ignorés' : ''));
              }, function (err) { L.toast.error('Import impossible : ' + err.message); });
            }
          }, [L.icon('upload'), 'Importer un .ics']),
          h('button.btn', {
            onclick: function () { L.forms.importStatement(); }
          }, [L.icon('wallet'), 'Importer un relevé (.csv)'])
        ])
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Exemple et remise à zéro')]),
        h('div.row.wrap', { style: { gap: '8px' } }, [
          h('button.btn', {
            onclick: function () {
              L.modal.confirm({
                title: 'Charger le jeu d\'exemple',
                text: 'Des tâches, projets, objectifs, transactions et habitudes de démonstration seront ajoutés à ce profil.',
                confirm: 'Charger'
              }).then(function (ok) {
                if (!ok) return;
                L.store.update(function (s) { L.seed.demo(s); }, 'Exemple chargé');
                L.toast.undo('Exemple chargé');
              });
            }
          }, 'Charger un exemple'),
          h('button.btn.btn--danger', {
            onclick: function () {
              L.modal.confirm({
                title: 'Tout effacer',
                text: 'Toutes les données de ce profil seront supprimées et la structure de départ rétablie. Pense à exporter avant.',
                danger: true, confirm: 'Tout effacer'
              }).then(function (ok) {
                if (!ok) return;
                var fresh = L.schema.emptyState();
                L.seed.structure(fresh);
                L.store.replace(fresh, 'reset');
                L.toast.show('Profil remis à zéro');
                L.router.go('home');
              });
            }
          }, [L.icon('trash'), 'Tout effacer'])
        ])
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'Raccourcis clavier')]),
        h('div.list', L.shortcuts.LIST.map(function (s) {
          return h('div.list__item', [h('span.grow.t-s', s.label), h('kbd', s.keys)]);
        }))
      ]),

      h('div.card', [
        h('div.card__head', [h('div.card__title', 'À propos')]),
        h('p.t-s.muted', 'LifeOS — logiciel personnel d\'organisation. Fonctionne hors ligne, s\'installe sur l\'écran d\'accueil, et garde les données sur l\'appareil.'),
        h('p.t-xs.faint', { style: { marginTop: '8px' } }, 'Version des données : ' + L.schema.VERSION +
          ' · dernière modification ' + D.format(D.iso(new Date(L.store.state.meta.updatedAt)), 'full'))
      ])
    ]);
  }

  var TABS = [
    { id: 'appearance', label: 'Apparence', build: appearance },
    { id: 'navigation', label: 'Navigation', build: navigation },
    { id: 'domains', label: 'Domaines', build: domains },
    { id: 'day', label: 'Journée', build: dayRhythm },
    { id: 'notifications', label: 'Notifications', build: notifications },
    { id: 'ai', label: 'Assistant', build: ai },
    { id: 'account', label: 'Compte', build: account },
    { id: 'data', label: 'Données', build: data }
  ];

  L.views.settings = function (params) {
    var tab = params.tab || 'appearance';
    var def = TABS.filter(function (t) { return t.id === tab; })[0] || TABS[0];

    return h('div.view', [
      h('div.view__head', [
        h('h1.view__title', 'Paramètres'),
        h('p.view__lead', 'L\'application s\'adapte à toi, pas l\'inverse.'),
        h('div.toolbar.toolbar--scroll', { style: { marginTop: 'var(--sp-5)' } }, TABS.map(function (t) {
          return h('button.chip.chip--tap' + (tab === t.id ? '.chip--accent' : ''), {
            onclick: function () { L.router.setParams({ tab: t.id }); }
          }, t.label);
        }))
      ]),
      h('div.col', { style: { gap: 'var(--sp-4)' } }, [def.build()])
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
