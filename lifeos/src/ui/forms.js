/* ==========================================================================
   LifeOS — formulaires
   Un éditeur par objet, ouvert en fenêtre (ordinateur) ou en feuille
   (téléphone). Les champs sont les mêmes à la création et à la modification :
   on n'apprend qu'une seule fois où se trouve quoi.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function input(attrs) { return h('input.input', attrs || {}); }
  function textarea(attrs) { return h('textarea.textarea', attrs || {}); }

  function select(options, value, onChange, attrs) {
    var node = h('select.select', Object.assign({
      onchange: function () { onChange(node.value); }
    }, attrs || {}), options.map(function (o) {
      return h('option', { value: String(o.value), selected: String(o.value) === String(value) }, o.label);
    }));
    return node;
  }

  function optionsFrom(list, blank) {
    var out = blank ? [{ value: '', label: blank }] : [];
    return out.concat(list.map(function (x) {
      return { value: x.id, label: x.name || x.label || x.title };
    }));
  }

  function row(children, cls) { return h('div.grid.grid--2' + (cls ? '.' + cls : ''), children); }

  /* ---------- étiquettes ---------- */
  function tagEditor(tags, onChange) {
    var wrap = h('div.row.wrap', { style: { gap: '6px' } });
    var known = L.util.unique(L.tasks.tags().concat(L.notes.tags()));
    function draw() {
      L.dom.mount(wrap, (tags || []).map(function (tag) {
        return h('span.chip', [tag, h('button.iconbtn', {
          type: 'button',
          style: { width: '16px', height: '16px' },
          'aria-label': 'Retirer ' + tag,
          onclick: function () { tags = tags.filter(function (t) { return t !== tag; }); onChange(tags); draw(); }
        }, L.icon('x'))]);
      }).concat([
        h('input.input', {
          placeholder: '+ étiquette', list: 'lifeos-tags',
          style: { width: '130px', height: '26px', fontSize: 'var(--fs-xs)' },
          onkeydown: function (e) {
            if (e.key !== 'Enter' || !e.target.value.trim()) return;
            e.preventDefault();
            tags = L.util.unique((tags || []).concat([e.target.value.trim()]));
            e.target.value = '';
            onChange(tags); draw();
          }
        }),
        h('datalist#lifeos-tags', known.map(function (t) { return h('option', { value: t }); }))
      ]));
    }
    draw();
    return wrap;
  }

  /* ---------- pièces jointes ----------
     Les liens sont gardés tels quels ; les fichiers sont rangés dans la
     base locale, pas dans l'état, pour ne pas alourdir chaque sauvegarde. */
  function attachmentEditor(list, onChange) {
    var wrap = h('div.col', { style: { gap: '6px' } });
    function draw() {
      L.dom.mount(wrap, (list || []).map(function (att, i) {
        return h('div.row', [
          L.icon(att.kind === 'link' ? 'link' : 'paperclip'),
          att.kind === 'link'
            ? h('a.grow.truncate.t-s.accent', { href: att.url, target: '_blank', rel: 'noopener' }, att.name || att.url)
            : h('button.grow.truncate.t-s', {
                style: { textAlign: 'left' },
                onclick: function () {
                  L.app.adapter().getFile(att.id).then(function (blob) {
                    if (!blob) { L.toast.error('Fichier introuvable sur cet appareil.'); return; }
                    var url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
                  });
                }
              }, att.name),
          h('span.faint.t-xs.nowrap', att.size ? L.format.fileSize(att.size) : ''),
          h('button.iconbtn', {
            type: 'button', 'aria-label': 'Retirer',
            onclick: function () {
              if (att.kind === 'file') L.app.adapter().deleteFile(att.id);
              list.splice(i, 1); onChange(list); draw();
            }
          }, L.icon('x'))
        ]);
      }).concat([
        h('div.row', [
          h('button.btn.btn--s.btn--ghost', {
            type: 'button',
            onclick: function () {
              L.modal.prompt({ title: 'Ajouter un lien', label: 'Adresse', placeholder: 'https://…' }).then(function (url) {
                if (!url) return;
                list.push({ id: L.util.uid('att'), kind: 'link', url: url, name: url.replace(/^https?:\/\//, '').slice(0, 60) });
                onChange(list); draw();
              });
            }
          }, [L.icon('link'), 'Lien']),
          h('button.btn.btn--s.btn--ghost', {
            type: 'button',
            onclick: function () {
              L.util.pickFile().then(function (file) {
                if (!file) return;
                if (file.size > 8 * 1024 * 1024) { L.toast.error('Fichier trop lourd (8 Mo maximum).'); return; }
                var id = L.util.uid('att');
                L.app.adapter().putFile(id, file).then(function () {
                  list.push({ id: id, kind: 'file', name: file.name, type: file.type, size: file.size });
                  onChange(list); draw();
                }, function () { L.toast.error('Impossible d\'enregistrer le fichier.'); });
              });
            }
          }, [L.icon('paperclip'), 'Fichier'])
        ])
      ]));
    }
    draw();
    return wrap;
  }

  /* ---------- récurrence ---------- */
  function recurrenceEditor(rec, onChange) {
    var state = rec ? L.util.clone(rec) : null;
    var wrap = h('div.col');
    function draw() {
      var freqSel = select([
        { value: '', label: 'Jamais' },
        { value: 'daily', label: 'Chaque jour' },
        { value: 'weekly', label: 'Chaque semaine' },
        { value: 'monthly', label: 'Chaque mois' },
        { value: 'yearly', label: 'Chaque année' }
      ], state ? state.freq : '', function (v) {
        state = v ? Object.assign({ interval: 1, start: D.today() }, state || {}, { freq: v }) : null;
        onChange(state); draw();
      });
      var kids = [L.dom.field('Répétition', freqSel)];
      if (state) {
        kids.push(L.dom.field('Tous les', h('div.row', [
          input({
            type: 'number', min: '1', max: '52', value: String(state.interval || 1),
            style: { width: '76px' },
            oninput: function (e) { state.interval = Math.max(1, +e.target.value || 1); onChange(state); }
          }),
          h('span.t-xs.muted', state.freq === 'daily' ? 'jour(s)' : state.freq === 'weekly' ? 'semaine(s)' : state.freq === 'monthly' ? 'mois' : 'an(s)')
        ])));
        if (state.freq === 'weekly') {
          kids.push(L.dom.field('Jours', h('div.row.wrap', { style: { gap: '4px' } },
            [1, 2, 3, 4, 5, 6, 0].map(function (d) {
              var on = (state.days || []).indexOf(d) > -1;
              var btn = h('button.chip.chip--tap' + (on ? '.chip--accent' : ''), {
                type: 'button',
                onclick: function () {
                  var days = (state.days || []).slice();
                  var i = days.indexOf(d);
                  if (i > -1) days.splice(i, 1); else days.push(d);
                  state.days = days; onChange(state);
                  btn.classList.toggle('chip--accent');
                }
              }, D.DAYS_SHORT[d]);
              return btn;
            }))));
        }
        kids.push(L.dom.field("Jusqu'au (facultatif)", input({
          type: 'date', value: state.until || '',
          oninput: function (e) { state.until = e.target.value || null; onChange(state); }
        })));
      }
      L.dom.mount(wrap, kids);
    }
    draw();
    return wrap;
  }

  /* ---------- rappels ---------- */
  function reminderEditor(list, onChange, hasTime) {
    var wrap = h('div.col', { style: { gap: '6px' } });
    var PRESETS = [
      { value: 0, label: "À l'heure" },
      { value: 5, label: '5 min avant' },
      { value: 15, label: '15 min avant' },
      { value: 30, label: '30 min avant' },
      { value: 60, label: '1 h avant' },
      { value: 120, label: '2 h avant' },
      { value: 1440, label: 'La veille' }
    ];
    function draw() {
      L.dom.mount(wrap, (list || []).map(function (rem, i) {
        return h('div.row', [
          L.icon('bell'),
          select(PRESETS.map(function (p) { return { value: p.value, label: p.label }; }), rem.offset, function (v) {
            rem.offset = +v; onChange(list);
          }),
          h('button.iconbtn', {
            type: 'button', 'aria-label': 'Retirer le rappel',
            onclick: function () { list.splice(i, 1); onChange(list); draw(); }
          }, L.icon('x'))
        ]);
      }).concat([
        h('button.btn.btn--s.btn--ghost', {
          type: 'button',
          onclick: function () { list.push({ id: L.util.uid('rem'), offset: 15 }); onChange(list); draw(); }
        }, [L.icon('plus'), 'Ajouter un rappel']),
        hasTime ? null : h('p.t-xs.faint', 'Un rappel a besoin d\'une heure de début.')
      ]));
    }
    draw();
    return wrap;
  }

  var Forms = {
    select: select,
    optionsFrom: optionsFrom,
    tagEditor: tagEditor,

    /* ================= tâche ================= */
    task: function (existing, defaults, onDone) {
      var t = existing
        ? L.util.clone(existing)
        : L.schema.make.task(Object.assign({ estimate: 30, priority: 2 }, defaults || {}));
      var subtasks = (t.subtasks || []).slice();
      var tags = (t.tags || []).slice();
      var attachments = (t.attachments || []).slice();
      var reminders = (t.reminders || []).slice();

      L.modal.open({
        title: existing ? 'Modifier la tâche' : 'Nouvelle tâche',
        size: 'wide',
        body: function () {
          var subWrap = h('div.col', { style: { gap: '6px' } });
          function drawSubs() {
            var done = subtasks.filter(function (s) { return s.done; }).length;
            L.dom.mount(subWrap, [
              subtasks.length ? h('div.between.t-xs.muted', [
                h('span', done + ' / ' + subtasks.length + ' terminées'),
                L.dom.bar(subtasks.length ? done / subtasks.length : 0, null, { thin: true })
              ]) : null
            ].concat(subtasks.map(function (s, i) {
              return h('div.row', [
                L.dom.checkbox(s.done, function (v) { s.done = v; drawSubs(); }),
                input({
                  value: s.title, placeholder: 'Sous-tâche',
                  oninput: function (e) { s.title = e.target.value; },
                  onkeydown: function (e) {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      subtasks.splice(i + 1, 0, L.schema.make.subtask(''));
                      drawSubs();
                      var inputs = subWrap.querySelectorAll('input.input');
                      if (inputs[i + 1]) inputs[i + 1].focus();
                    }
                  }
                }),
                h('button.iconbtn', {
                  type: 'button', 'aria-label': 'Supprimer',
                  onclick: function () { subtasks.splice(i, 1); drawSubs(); }
                }, L.icon('trash'))
              ]);
            })).concat([
              h('button.btn.btn--s.btn--ghost', {
                type: 'button',
                onclick: function () { subtasks.push(L.schema.make.subtask('')); drawSubs(); }
              }, [L.icon('plus'), 'Ajouter une sous-tâche'])
            ]));
          }
          drawSubs();

          return [
            L.dom.field('Intitulé', input({
              value: t.title, placeholder: 'Que faut-il faire ?',
              oninput: function (e) { t.title = e.target.value; }
            })),
            L.dom.field('Description', textarea({
              value: t.notes, placeholder: 'Détails, contexte, méthode…', style: { minHeight: '64px' },
              oninput: function (e) { t.notes = e.target.value; }
            })),
            row([
              L.dom.field('Domaine', select(optionsFrom(L.domains.all(), 'Aucun'), t.domainId || '', function (v) { t.domainId = v || null; })),
              L.dom.field('Projet', select(optionsFrom(L.projects.all(), 'Aucun'), t.projectId || '', function (v) {
                t.projectId = v || null;
                var p = v ? L.projects.get(v) : null;
                if (p && p.domainId && !t.domainId) t.domainId = p.domainId;
              }))
            ]),
            row([
              L.dom.field('Priorité', select(L.schema.PRIORITIES.map(function (p) {
                return { value: p.id, label: p.short + ' · ' + p.label };
              }), t.priority, function (v) { t.priority = +v; })),
              L.dom.field('Statut', select(L.schema.TASK_STATUS.map(function (s) {
                return { value: s.id, label: s.label };
              }), t.status, function (v) { t.status = v; }))
            ]),
            row([
              L.dom.field('Date prévue', input({ type: 'date', value: t.date || '', oninput: function (e) { t.date = e.target.value || null; } })),
              L.dom.field('Heure', input({ type: 'time', value: t.time || '', oninput: function (e) { t.time = e.target.value || null; } }))
            ]),
            row([
              L.dom.field('Date limite', input({ type: 'date', value: t.due || '', oninput: function (e) { t.due = e.target.value || null; } })),
              L.dom.field('Durée estimée', h('div.row', [
                input({
                  type: 'number', min: '5', step: '5', value: String(t.estimate || 30),
                  oninput: function (e) { t.estimate = Math.max(5, +e.target.value || 30); }
                }),
                h('span.t-xs.muted.nowrap', 'min')
              ]))
            ]),
            row([
              L.dom.field('Énergie demandée', select(L.schema.ENERGY.map(function (e) {
                return { value: e.id, label: e.label };
              }), t.energy, function (v) { t.energy = v; }), 'Sert au placement dans la journée'),
              L.dom.field('Objectif lié', select(optionsFrom(L.goals.all(), 'Aucun'), t.goalId || '', function (v) { t.goalId = v || null; }))
            ]),
            existing ? L.dom.field('Temps réellement passé', h('div.row', [
              input({
                type: 'number', min: '0', step: '5', value: String(t.actual || 0),
                oninput: function (e) { t.actual = Math.max(0, +e.target.value || 0); }
              }),
              h('span.t-xs.muted.nowrap', 'min')
            ]), 'Alimente les statistiques de temps par domaine') : null,
            h('div.sep', { style: { margin: '4px 0' } }),
            L.dom.field('Sous-tâches', subWrap),
            recurrenceEditor(t.recurrence, function (rec) { t.recurrence = rec; }),
            L.dom.field('Rappels', reminderEditor(reminders, function (next) { reminders = next; }, !!t.time)),
            L.dom.field('Étiquettes', tagEditor(tags, function (next) { tags = next; })),
            L.dom.field('Pièces jointes', attachmentEditor(attachments, function (next) { attachments = next; }))
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          function commit() {
            if (!t.title.trim()) { L.toast.error('Il faut un intitulé.'); return; }
            t.subtasks = subtasks.filter(function (s) { return s.title.trim(); });
            t.tags = tags;
            t.attachments = attachments;
            t.reminders = reminders;
            var saved = existing ? L.tasks.save(t.id, t) : L.tasks.create(t);
            api.close();
            L.toast.show(existing ? 'Tâche modifiée' : 'Tâche ajoutée');
            if (onDone) onDone(saved);
          }
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () {
              L.modal.confirm({ title: 'Supprimer', text: 'Supprimer « ' + t.title + ' » ?', danger: true, confirm: 'Supprimer' })
                .then(function (ok) {
                  if (!ok) return;
                  L.tasks.remove(t.id); api.close();
                  L.toast.undo('Tâche supprimée');
                  if (onDone) onDone(null);
                });
            }
          }, 'Supprimer') : null;
          var right = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', { onclick: commit }, existing ? 'Enregistrer' : 'Ajouter')
          ]);
          return existing ? [del, right] : [right];
        }
      });
    },

    /* Ajout éclair : une seule ligne, comprise comme une phrase.
       « réviser les stats demain 14h 1h30 urgent » */
    quickTask: function (onDone, initial) {
      var field = input({ placeholder: 'Ex. : réviser les stats demain 14h 1h30 urgent', value: initial || '' });
      var preview = h('div.t-xs.muted', { style: { minHeight: '18px' } });

      function parse() {
        var text = field.value;
        if (!text.trim()) { preview.textContent = ''; return null; }
        var p = L.nlp.phrase(text);
        var bits = [];
        if (p.date) bits.push(D.relative(p.date.date, { caps: false }));
        if (p.time) bits.push(p.time.time);
        bits.push(D.duration(p.duration ? p.duration.minutes : 30));
        if (p.priority) bits.push(L.schema.priority(p.priority.priority).label.toLowerCase());
        if (p.project) bits.push('projet ' + p.project.name);
        else if (p.domain) bits.push(p.domain.name);
        if (p.recurrence) bits.push(D.recurrenceLabel(p.recurrence.rec).toLowerCase());
        preview.textContent = (p.title || '…') + '  —  ' + bits.join(' · ');
        return {
          title: p.title,
          date: p.date ? p.date.date : null,
          time: p.time ? p.time.time : null,
          estimate: p.duration ? p.duration.minutes : 30,
          priority: p.priority ? p.priority.priority : 2,
          projectId: p.project ? p.project.id : null,
          domainId: p.domain ? p.domain.id : (p.project ? p.project.domainId : null),
          recurrence: p.recurrence ? Object.assign({ start: p.date ? p.date.date : D.today() }, p.recurrence.rec) : null
        };
      }
            field.addEventListener('input', parse);

      L.modal.open({
        title: 'Ajout rapide',
        size: 'narrow',
        body: h('div.col', [
          field, preview,
          h('p.t-xs.faint', 'La date, l\'heure, la durée, la priorité et le projet sont reconnus dans la phrase.')
        ]),
        footer: function (api) {
          function submit() {
            var patch = parse();
            if (!patch || !patch.title) { L.toast.error('Écris au moins un intitulé.'); return; }
            var task = L.tasks.create(patch);
            api.close();
            L.toast.undo('« ' + task.title + ' » ajoutée');
            if (onDone) onDone(task);
          }
          field.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
          setTimeout(function () { field.focus(); parse(); }, 80);
          return [
            h('button.btn', { onclick: function () { api.close(); Forms.task(null, { title: field.value.trim() }, onDone); } }, 'Tout détailler'),
            h('button.btn.btn--primary', { onclick: submit }, 'Ajouter')
          ];
        }
      });
    },

    /* ================= projet ================= */
    project: function (existing, defaults, onDone) {
      var p = existing ? L.util.clone(existing) : L.schema.make.project(defaults || {});
      var milestones = (p.milestones || []).slice();
      var attachments = (p.attachments || []).slice();

      L.modal.open({
        title: existing ? 'Modifier le projet' : 'Nouveau projet',
        size: 'wide',
        body: function () {
          var msWrap = h('div.col', { style: { gap: '6px' } });
          function drawMs() {
            L.dom.mount(msWrap, milestones.map(function (m, i) {
              return h('div.row', [
                L.dom.checkbox(m.done, function (v) { m.done = v; drawMs(); }),
                input({ value: m.title, placeholder: 'Étape', oninput: function (e) { m.title = e.target.value; } }),
                input({ type: 'date', value: m.due || '', style: { width: '152px' }, oninput: function (e) { m.due = e.target.value || null; } }),
                h('button.iconbtn', {
                  type: 'button', 'aria-label': 'Supprimer',
                  onclick: function () { milestones.splice(i, 1); drawMs(); }
                }, L.icon('trash'))
              ]);
            }).concat([
              h('button.btn.btn--s.btn--ghost', {
                type: 'button',
                onclick: function () { milestones.push({ id: L.util.uid('ms'), title: '', due: null, done: false }); drawMs(); }
              }, [L.icon('plus'), 'Ajouter une étape'])
            ]));
          }
          drawMs();

          return [
            L.dom.field('Nom', input({ value: p.name, oninput: function (e) { p.name = e.target.value; } })),
            L.dom.field('Description', textarea({ value: p.description, oninput: function (e) { p.description = e.target.value; } })),
            L.dom.field('Objectif du projet', input({
              value: p.objective, placeholder: 'À quoi saura-t-on que c\'est réussi ?',
              oninput: function (e) { p.objective = e.target.value; }
            })),
            row([
              L.dom.field('Domaine', select(optionsFrom(L.domains.all(), 'Aucun'), p.domainId || '', function (v) { p.domainId = v || null; })),
              L.dom.field('Statut', select(L.schema.PROJECT_STATUS.map(function (s) { return { value: s.id, label: s.label }; }), p.status, function (v) { p.status = v; }))
            ]),
            row([
              L.dom.field('Début', input({ type: 'date', value: p.start || '', oninput: function (e) { p.start = e.target.value || null; } })),
              L.dom.field('Échéance', input({ type: 'date', value: p.due || '', oninput: function (e) { p.due = e.target.value || null; } }))
            ]),
            row([
              L.dom.field('Budget', input({
                type: 'number', min: '0', step: '10', value: p.budget === null || p.budget === undefined ? '' : String(p.budget),
                placeholder: 'Facultatif',
                oninput: function (e) { p.budget = e.target.value === '' ? null : +e.target.value; }
              }), 'Les dépenses liées au projet s\'y imputent'),
              L.dom.field('Objectif lié', select(optionsFrom(L.goals.all(), 'Aucun'), p.goalId || '', function (v) { p.goalId = v || null; }))
            ]),
            L.dom.field('Étapes', msWrap),
            L.dom.field('Notes', textarea({ value: p.notes, oninput: function (e) { p.notes = e.target.value; } })),
            L.dom.field('Fichiers et liens', attachmentEditor(attachments, function (next) { attachments = next; }))
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () {
              L.modal.confirm({
                title: 'Supprimer le projet',
                text: 'Les tâches du projet seront conservées mais détachées.',
                danger: true, confirm: 'Supprimer'
              }).then(function (ok) {
                if (!ok) return;
                L.projects.remove(p.id); api.close();
                L.toast.undo('Projet supprimé');
                if (onDone) onDone(null);
              });
            }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!p.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                p.milestones = milestones.filter(function (m) { return m.title.trim(); });
                p.attachments = attachments;
                var saved = existing ? L.projects.save(p.id, p) : L.projects.create(p);
                api.close();
                L.toast.show(existing ? 'Projet modifié' : 'Projet créé');
                if (onDone) onDone(saved);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    },

    /* ================= objectif ================= */
    goal: function (existing, defaults, onDone) {
      var g = existing ? L.util.clone(existing) : L.schema.make.goal(defaults || {});
      var source = Object.assign({ type: 'manual' }, g.source || {});

      L.modal.open({
        title: existing ? "Modifier l'objectif" : 'Nouvel objectif',
        size: 'wide',
        body: function () {
          var sourceExtra = h('div.col');
          var manualWrap = h('div');
          function drawManual() {
            L.dom.mount(manualWrap, source.type === 'manual' ? L.dom.field('Valeur actuelle', input({
              type: 'number', step: 'any', value: String(g.current || 0),
              oninput: function (e) { g.current = +e.target.value || 0; }
            }), 'Chaque modification est datée : la courbe de progression s\'en souvient.') : null);
          }
          function drawSource() {
            var kids = [];
            if (source.type === 'savings') {
              kids.push(L.dom.field('Compte d\'épargne suivi',
                select(optionsFrom(L.finance.accounts(), 'Aucun — compter les virements liés'), source.accountId || '', function (v) { source.accountId = v || null; }),
                'Toute transaction d\'épargne liée à cet objectif s\'ajoute automatiquement.'));
            } else if (source.type === 'habit') {
              kids.push(L.dom.field('Habitude suivie',
                select(optionsFrom(L.habits.all(), 'Choisir…'), source.habitId || '', function (v) { source.habitId = v || null; })));
              kids.push(L.dom.field('Compter', select([
                { value: 'sum', label: 'La somme des valeurs relevées' },
                { value: 'count', label: 'Le nombre de jours tenus' }
              ], source.mode || 'sum', function (v) { source.mode = v; })));
            } else if (source.type === 'project') {
              kids.push(L.dom.field('Projet suivi',
                select(optionsFrom(L.projects.all(), 'Choisir…'), source.projectId || '', function (v) { source.projectId = v || null; })));
            } else if (source.type === 'tasks') {
              kids.push(h('p.t-xs.faint', 'La valeur suit les tâches liées à cet objectif, directement ou via ses projets.'));
            }
            L.dom.mount(sourceExtra, kids);
            drawManual();
          }
          drawSource();

          return [
            L.dom.field('Nom', input({ value: g.name, oninput: function (e) { g.name = e.target.value; } })),
            L.dom.field('Description', textarea({ value: g.description, style: { minHeight: '56px' }, oninput: function (e) { g.description = e.target.value; } })),
            row([
              L.dom.field('Catégorie', input({ value: g.category, oninput: function (e) { g.category = e.target.value; } })),
              L.dom.field('Domaine', select(optionsFrom(L.domains.all(), 'Aucun'), g.domainId || '', function (v) { g.domainId = v || null; }))
            ]),
            row([
              L.dom.field('Valeur de départ', input({
                type: 'number', step: 'any', value: String(g.start || 0),
                oninput: function (e) { g.start = +e.target.value || 0; }
              })),
              L.dom.field('Valeur cible', input({
                type: 'number', step: 'any', value: String(g.target || 0),
                oninput: function (e) { g.target = +e.target.value || 0; }
              }))
            ]),
            row([
              L.dom.field('Unité', input({ value: g.unit, placeholder: '€, km, livres…', oninput: function (e) { g.unit = e.target.value; } })),
              L.dom.field('Date cible', input({ type: 'date', value: g.targetDate || '', oninput: function (e) { g.targetDate = e.target.value || null; } }))
            ]),
            L.dom.field('Source de la valeur', select([
              { value: 'manual', label: 'Je saisis la valeur moi-même' },
              { value: 'savings', label: 'Épargne enregistrée dans les finances' },
              { value: 'tasks', label: 'Tâches liées terminées' },
              { value: 'habit', label: 'Cumul d\'une habitude' },
              { value: 'project', label: 'Avancement d\'un projet' }
            ], source.type, function (v) { source.type = v; drawSource(); })),
            sourceExtra,
            manualWrap,
            row([
              L.dom.field('Début du suivi', input({ type: 'date', value: g.startDate || D.today(), oninput: function (e) { g.startDate = e.target.value || D.today(); } })),
              L.dom.field('Statut', select(L.schema.GOAL_STATUS.map(function (s) { return { value: s.id, label: s.label }; }), g.status, function (v) { g.status = v; }))
            ])
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () {
              L.modal.confirm({ title: 'Supprimer', text: 'Supprimer « ' + g.name + ' » ?', danger: true, confirm: 'Supprimer' })
                .then(function (ok) { if (!ok) return; L.goals.remove(g.id); api.close(); L.toast.undo('Objectif supprimé'); if (onDone) onDone(null); });
            }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!g.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                g.source = source;
                var saved = existing ? L.goals.save(g.id, g) : L.goals.create(g);
                api.close();
                L.toast.show(existing ? 'Objectif modifié' : 'Objectif créé');
                if (onDone) onDone(saved);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    },

    /* ================= transaction ================= */
    transaction: function (existing, defaults, onDone) {
      var t = existing ? L.util.clone(existing) : L.schema.make.transaction(Object.assign({ type: 'expense' }, defaults || {}));
      var catWrap = h('div');
      var toWrap = h('div');

      L.modal.open({
        title: existing ? 'Modifier la transaction' : 'Nouvelle transaction',
        size: 'narrow',
        body: function () {
          function catType() {
            return t.type === 'income' ? 'income' : (t.type === 'saving' || t.type === 'invest') ? 'saving' : 'expense';
          }
          function drawCats() {
            L.dom.mount(catWrap, L.dom.field('Catégorie',
              select(optionsFrom(L.finance.categories(catType()), 'Aucune'), t.categoryId || '', function (v) { t.categoryId = v || null; })));
            L.dom.mount(toWrap, (t.type === 'saving' || t.type === 'invest' || t.type === 'transfer')
              ? L.dom.field('Vers le compte', select(optionsFrom(L.finance.accounts(), 'Aucun'), t.toAccountId || '', function (v) { t.toAccountId = v || null; }))
              : null);
          }
          drawCats();

          return [
            L.dom.field('Type', L.dom.segmented(L.schema.TX_TYPES.map(function (x) {
              return { id: x.id, label: x.label };
            }), t.type, function (v) {
              t.type = v; t.categoryId = null; drawCats();
            })),
            L.dom.field('Montant', input({
              type: 'number', step: '0.01', min: '0', value: t.amount ? String(t.amount) : '',
              placeholder: '0,00',
              oninput: function (e) { t.amount = Math.abs(+e.target.value || 0); }
            })),
            L.dom.field('Description', input({
              value: t.description, placeholder: 'Courses, loyer, salaire…',
              oninput: function (e) { t.description = e.target.value; }
            })),
            catWrap,
            row([
              L.dom.field('Date', input({ type: 'date', value: t.date, oninput: function (e) { t.date = e.target.value || D.today(); } })),
              L.dom.field('Compte', select(optionsFrom(L.finance.accounts(), 'Aucun'), t.accountId || '', function (v) { t.accountId = v || null; }))
            ]),
            toWrap,
            row([
              L.dom.field('Projet lié', select(optionsFrom(L.projects.all(), 'Aucun'), t.projectId || '', function (v) { t.projectId = v || null; })),
              L.dom.field('Objectif lié', select(optionsFrom(L.goals.all(), 'Aucun'), t.goalId || '', function (v) { t.goalId = v || null; }))
            ]),
            h('label.row', { style: { gap: '10px', cursor: 'pointer' } }, [
              L.dom.toggle(t.fixed, function (v) { t.fixed = v; }, 'Montant fixe'),
              h('span.t-s', 'Montant fixe (loyer, abonnement, salaire)')
            ]),
            recurrenceEditor(t.recurrence, function (rec) {
              t.recurrence = rec;
              if (rec) { t.fixed = true; rec.start = rec.start || t.date; }
            }),
            h('p.t-xs.faint', 'Un mouvement récurrent se réenregistre tout seul à chaque échéance, et alimente la projection de fin de mois.')
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () {
              L.finance.remove(t.id); api.close(); L.toast.undo('Transaction supprimée'); if (onDone) onDone(null);
            }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!t.amount) { L.toast.error('Indique un montant.'); return; }
                var saved = existing ? L.finance.save(t.id, t) : L.finance.create(t);
                api.close();
                var budget = L.finance.budget();
                if (!existing && budget.global && budget.global.state !== 'ok') {
                  L.toast.show(budget.global.state === 'over'
                    ? 'Budget du mois dépassé de ' + L.format.money(-budget.global.left)
                    : 'Il reste ' + L.format.money(budget.global.left) + ' sur le budget du mois', { icon: 'alert', duration: 5200 });
                } else {
                  L.toast.show(existing ? 'Transaction modifiée' : 'Transaction ajoutée');
                }
                if (onDone) onDone(saved);
              }
            }, existing ? 'Enregistrer' : 'Ajouter')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    },

    /* ================= habitude ================= */
    habit: function (existing, defaults, onDone) {
      var hb = existing ? L.util.clone(existing) : L.schema.make.habit(defaults || {});
      var targetWrap = h('div.col');

      L.modal.open({
        title: existing ? "Modifier l'habitude" : 'Nouvelle habitude',
        size: 'wide',
        body: function () {
          function drawTarget() {
            var field;
            if (hb.kind === 'check') field = h('p.t-xs.faint', 'Une case à cocher : fait ou pas fait.');
            else if (hb.kind === 'time') field = L.dom.field('Heure visée', input({
              type: 'time', value: typeof hb.target === 'string' ? hb.target : '07:00',
              oninput: function (e) { hb.target = e.target.value; }
            }));
            else field = row([
              L.dom.field(hb.kind === 'duration' ? 'Objectif (minutes)' : 'Objectif', input({
                type: 'number', step: 'any', min: '0', value: String(hb.target || 0),
                oninput: function (e) { hb.target = +e.target.value || 0; }
              })),
              hb.kind === 'quantity' ? L.dom.field('Unité', input({
                value: hb.unit, placeholder: 'pages, verres, km…',
                oninput: function (e) { hb.unit = e.target.value; }
              })) : null
            ]);
            L.dom.mount(targetWrap, [
              field,
              hb.kind === 'check' ? null : L.dom.field('Sens', select([
                { value: 'at_least', label: 'Au moins' },
                { value: 'at_most', label: 'Au plus (ne pas dépasser)' }
              ], hb.direction, function (v) { hb.direction = v; }))
            ]);
          }
          drawTarget();

          return [
            L.dom.field('Nom', input({ value: hb.name, oninput: function (e) { hb.name = e.target.value; } })),
            row([
              L.dom.field('Type de suivi', select(L.schema.HABIT_KINDS.map(function (k) { return { value: k.id, label: k.label }; }), hb.kind, function (v) {
                hb.kind = v;
                hb.target = v === 'time' ? '07:00' : v === 'duration' ? 30 : 1;
                if (v === 'duration') hb.unit = 'min';
                drawTarget();
              })),
              L.dom.field('Domaine', select(optionsFrom(L.domains.all(), 'Aucun'), hb.domainId || '', function (v) { hb.domainId = v || null; }))
            ]),
            targetWrap,
            L.dom.field('Jours concernés', h('div.row.wrap', { style: { gap: '4px' } }, [1, 2, 3, 4, 5, 6, 0].map(function (d) {
              var on = (hb.days || []).indexOf(d) > -1;
              var btn = h('button.chip.chip--tap' + (on ? '.chip--accent' : ''), {
                type: 'button',
                onclick: function () {
                  var days = (hb.days || []).slice();
                  var i = days.indexOf(d);
                  if (i > -1) days.splice(i, 1); else days.push(d);
                  hb.days = days;
                  btn.classList.toggle('chip--accent');
                }
              }, D.DAYS_SHORT[d]);
              return btn;
            }))),
            row([
              L.dom.field('Rappel', input({ type: 'time', value: hb.reminder || '', oninput: function (e) { hb.reminder = e.target.value || null; } })),
              L.dom.field('Durée à réserver', h('div.row', [
                input({
                  type: 'number', min: '0', step: '5', value: String(hb.duration || 0),
                  oninput: function (e) { hb.duration = +e.target.value || 0; }
                }),
                h('span.t-xs.muted.nowrap', 'min')
              ]), 'Pour que le planning lui garde une place')
            ]),
            row([
              L.dom.field('Moment de la journée', select([
                { value: '', label: 'Peu importe' },
                { value: 'morning', label: 'Matin' },
                { value: 'afternoon', label: 'Après-midi' },
                { value: 'evening', label: 'Soir' }
              ], hb.slot || '', function (v) { hb.slot = v || null; })),
              L.dom.field('Objectif lié', select(optionsFrom(L.goals.all(), 'Aucun'), hb.goalId || '', function (v) { hb.goalId = v || null; }))
            ])
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () {
              L.modal.confirm({ title: 'Supprimer', text: 'L\'historique de suivi sera effacé.', danger: true, confirm: 'Supprimer' })
                .then(function (ok) { if (!ok) return; L.habits.remove(hb.id); api.close(); L.toast.show('Habitude supprimée'); if (onDone) onDone(null); });
            }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!hb.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                var saved = existing ? L.habits.save(hb.id, hb) : L.habits.create(hb);
                api.close();
                L.toast.show(existing ? 'Habitude modifiée' : 'Habitude créée');
                if (onDone) onDone(saved);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    },

    /* ================= événement ================= */
    event: function (existing, defaults, onDone) {
      var e = existing ? L.util.clone(existing) : L.schema.make.event(defaults || {});
      var timeWrap = h('div');
      var reminders = (e.reminders || []).slice();

      L.modal.open({
        title: existing ? "Modifier l'événement" : 'Nouvel événement',
        size: 'wide',
        body: function () {
          function drawTimes() {
            L.dom.mount(timeWrap, e.allDay ? null : row([
              L.dom.field('Début', input({ type: 'time', value: e.start, oninput: function (ev) { e.start = ev.target.value; } })),
              L.dom.field('Fin', input({ type: 'time', value: e.end, oninput: function (ev) { e.end = ev.target.value; } }))
            ]));
          }
          drawTimes();
          return [
            L.dom.field('Titre', input({ value: e.title, oninput: function (ev) { e.title = ev.target.value; } })),
            row([
              L.dom.field('Date', input({ type: 'date', value: e.date, oninput: function (ev) { e.date = ev.target.value || D.today(); } })),
              L.dom.field('Lieu', input({ value: e.location, placeholder: 'Facultatif', oninput: function (ev) { e.location = ev.target.value; } }))
            ]),
            h('label.row', { style: { gap: '10px', cursor: 'pointer' } }, [
              L.dom.toggle(e.allDay, function (v) { e.allDay = v; drawTimes(); }, 'Toute la journée'),
              h('span.t-s', 'Toute la journée')
            ]),
            timeWrap,
            row([
              L.dom.field('Domaine', select(optionsFrom(L.domains.all(), 'Aucun'), e.domainId || '', function (v) { e.domainId = v || null; })),
              L.dom.field('Projet', select(optionsFrom(L.projects.all(), 'Aucun'), e.projectId || '', function (v) { e.projectId = v || null; }))
            ]),
            recurrenceEditor(e.recurrence, function (rec) { e.recurrence = rec; }),
            L.dom.field('Rappels', reminderEditor(reminders, function (next) { reminders = next; }, !e.allDay)),
            L.dom.field('Notes', textarea({ value: e.notes, oninput: function (ev) { e.notes = ev.target.value; } }))
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () { L.calendar.remove(e.id); api.close(); L.toast.undo('Événement supprimé'); if (onDone) onDone(null); }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!e.title.trim()) { L.toast.error('Il faut un titre.'); return; }
                e.reminders = reminders;
                var saved = existing ? L.calendar.save(e.id, e) : L.calendar.create(e);
                api.close();
                L.toast.show(existing ? 'Événement modifié' : 'Événement ajouté');
                if (onDone) onDone(saved);
              }
            }, existing ? 'Enregistrer' : 'Ajouter')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    },

    /* ================= domaine ================= */
    domain: function (existing, onDone) {
      var d = existing ? L.util.clone(existing) : L.schema.make.domain({});
      L.modal.open({
        title: existing ? 'Modifier le domaine' : 'Nouveau domaine',
        size: 'narrow',
        body: function () {
          var preview = h('div.row', [
            h('span.swatch', { style: { background: d.color } }),
            h('span.t-s.w-600', d.name || 'Domaine')
          ]);
          return [
            L.dom.field('Nom', input({
              value: d.name, oninput: function (e) {
                d.name = e.target.value;
                preview.lastChild.textContent = d.name || 'Domaine';
              }
            })),
            L.dom.field('Icône', h('div.row.wrap', { style: { gap: '5px' } }, L.domains.ICONS.map(function (name) {
              var btn = h('button.iconbtn' + (name === d.icon ? '.iconbtn--active' : ''), {
                type: 'button', 'aria-label': name,
                onclick: function () {
                  d.icon = name;
                  Array.prototype.forEach.call(btn.parentNode.querySelectorAll('.iconbtn'), function (n) { n.classList.remove('iconbtn--active'); });
                  btn.classList.add('iconbtn--active');
                }
              }, L.icon(name));
              return btn;
            }))),
            L.dom.field('Couleur', h('div.row.wrap', { style: { gap: '6px' } }, L.domains.COLORS.map(function (color) {
              var btn = h('button', {
                type: 'button', 'aria-label': color,
                style: {
                  width: '26px', height: '26px', borderRadius: '9px', background: color,
                  border: color === d.color ? '2px solid var(--ink)' : '2px solid transparent'
                },
                onclick: function () {
                  d.color = color;
                  Array.prototype.forEach.call(btn.parentNode.querySelectorAll('button'), function (n) { n.style.border = '2px solid transparent'; });
                  btn.style.border = '2px solid var(--ink)';
                  preview.firstChild.style.background = color;
                }
              });
              return btn;
            }))),
            preview
          ];
        },
        footer: function (api) {
          return [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!d.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                if (existing) L.domains.save(d.id, d); else L.domains.create(d);
                api.close();
                if (onDone) onDone(d);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ];
        }
      });
    },

    /* ================= catégorie & compte ================= */
    category: function (existing, onDone) {
      var c = existing ? L.util.clone(existing) : L.schema.make.category({});
      L.modal.open({
        title: existing ? 'Modifier la catégorie' : 'Nouvelle catégorie',
        size: 'narrow',
        body: function () {
          return [
            L.dom.field('Nom', input({ value: c.name, oninput: function (e) { c.name = e.target.value; } })),
            L.dom.field('Type', select([
              { value: 'expense', label: 'Dépense' },
              { value: 'income', label: 'Revenu' },
              { value: 'saving', label: 'Épargne' }
            ], c.type, function (v) { c.type = v; })),
            row([
              L.dom.field('Symbole', input({ value: c.icon, maxlength: '2', oninput: function (e) { c.icon = e.target.value; } })),
              L.dom.field('Couleur', input({ type: 'color', value: c.color, oninput: function (e) { c.color = e.target.value; } }))
            ]),
            L.dom.field('Budget mensuel', input({
              type: 'number', min: '0', step: '10', value: c.budget === null || c.budget === undefined ? '' : String(c.budget),
              placeholder: 'Aucun',
              oninput: function (e) { c.budget = e.target.value === '' ? null : +e.target.value; }
            }), 'Une alerte apparaît à l\'approche de la limite.')
          ];
        },
        footer: function (api) {
          return [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!c.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                if (existing) L.finance.saveCategory(c.id, c); else L.finance.createCategory(c);
                api.close(); if (onDone) onDone(c);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ];
        }
      });
    },

    account: function (existing, onDone) {
      var a = existing ? L.util.clone(existing) : L.schema.make.account({});
      L.modal.open({
        title: existing ? 'Modifier le compte' : 'Nouveau compte',
        size: 'narrow',
        body: function () {
          return [
            L.dom.field('Nom', input({ value: a.name, oninput: function (e) { a.name = e.target.value; } })),
            L.dom.field('Type', select([
              { value: 'courant', label: 'Compte courant' },
              { value: 'épargne', label: 'Épargne' },
              { value: 'espèces', label: 'Espèces' },
              { value: 'investissement', label: 'Investissement' }
            ], a.kind, function (v) { a.kind = v; })),
            L.dom.field('Solde de départ', input({
              type: 'number', step: '0.01', value: String(a.opening || 0),
              oninput: function (e) { a.opening = +e.target.value || 0; }
            }), 'Le solde affiché ajoute les transactions à ce montant.')
          ];
        },
        footer: function (api) {
          return [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                if (!a.name.trim()) { L.toast.error('Il faut un nom.'); return; }
                if (existing) L.finance.saveAccount(a.id, a); else L.finance.createAccount(a);
                api.close(); if (onDone) onDone(a);
              }
            }, existing ? 'Enregistrer' : 'Créer')
          ];
        }
      });
    },

    /* ================= import d'un relevé bancaire ================= */
    importStatement: function (onDone) {
      L.util.pickFile('.csv,text/csv,text/plain').then(function (file) {
        if (!file) return;
        return L.util.readFile(file).then(function (text) {
          var parsed = L.csv.parse(text);
          if (!parsed || !parsed.rows.length) { L.toast.error('Fichier illisible ou vide.'); return; }

          var mapping = Object.assign({}, parsed.mapping);
          var options = { reverse: false, accountId: (L.finance.accounts()[0] || {}).id || null, categoryId: null };
          var preview = h('div');

          function columns() {
            return parsed.header.map(function (name, i) {
              return { value: i, label: (name || 'Colonne ' + (i + 1)).slice(0, 28) };
            });
          }

          function drawPreview() {
            var entries = L.csv.preview(parsed, mapping, options);
            var expenses = entries.filter(function (e) { return e.type === 'expense'; });
            L.dom.mount(preview, [
              h('div.row.wrap.t-xs.muted', { style: { gap: '12px', marginBottom: 'var(--sp-3)' } }, [
                h('span', entries.length + ' ' + L.util.plural(entries.length, 'ligne') + ' ' + L.util.plural(entries.length, 'lisible') + ' sur ' + parsed.rows.length),
                h('span', expenses.length + ' dépenses'),
                h('span', (entries.length - expenses.length) + ' revenus')
              ]),
              entries.length
                ? h('div.list.list--framed', entries.slice(0, 5).map(function (e) {
                    return h('div.list__item', [
                      h('span.t-xs.muted.num', { style: { width: '74px', flex: 'none' } }, D.format(e.date, 'short')),
                      h('span.grow.truncate.t-s', e.description),
                      h('span.t-s.num.w-600' + (e.type === 'income' ? '.positive' : ''),
                        (e.type === 'income' ? '+' : '−') + L.format.money(e.amount))
                    ]);
                  }))
                : h('p.t-s.negative', 'Aucune ligne exploitable — vérifie les colonnes choisies.')
            ]);
            return entries;
          }

          L.modal.open({
            title: 'Importer un relevé',
            size: 'wide',
            body: function () {
              var node = h('div.col', [
                h('p.t-xs.faint', file.name + ' · séparateur « ' + (parsed.separator === '\t' ? 'tabulation' : parsed.separator) + ' »'),
                h('div.grid.grid--3', [
                  L.dom.field('Colonne date', select(columns(), mapping.date, function (v) { mapping.date = +v; drawPreview(); })),
                  L.dom.field('Colonne montant', select(columns(), mapping.amount, function (v) { mapping.amount = +v; drawPreview(); })),
                  L.dom.field('Colonne libellé', select(columns(), mapping.description, function (v) { mapping.description = +v; drawPreview(); }))
                ]),
                h('div.grid.grid--2', [
                  L.dom.field('Compte', select(optionsFrom(L.finance.accounts(), 'Aucun'), options.accountId || '', function (v) { options.accountId = v || null; })),
                  L.dom.field('Catégorie par défaut', select(optionsFrom(L.finance.categories('expense'), 'Aucune'), options.categoryId || '', function (v) { options.categoryId = v || null; }))
                ]),
                h('label.row', { style: { gap: '10px', cursor: 'pointer' } }, [
                  L.dom.toggle(options.reverse, function (v) { options.reverse = v; drawPreview(); }, 'Montants positifs'),
                  h('span.t-s', 'Les montants positifs sont des dépenses (relevés qui ne notent pas le signe)')
                ]),
                h('div.sep'),
                preview
              ]);
              drawPreview();
              return node;
            },
            footer: function (api) {
              return [
                h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
                h('button.btn.btn--primary', {
                  onclick: function () {
                    var entries = L.csv.preview(parsed, mapping, options);
                    if (!entries.length) { L.toast.error('Rien à importer.'); return; }
                    var res = L.csv.apply(entries, options);
                    api.close();
                    L.toast.undo(res.added + ' ' + L.util.plural(res.added, 'mouvement') + ' ' + L.util.plural(res.added, 'importé') +
                      (res.skipped ? ' · ' + res.skipped + ' déjà présents' : ''));
                    if (onDone) onDone(res);
                  }
                }, 'Importer')
              ];
            }
          });
        });
      });
    },

    /* ================= note ================= */
    note: function (existing, defaults, onDone) {
      var n = existing ? L.util.clone(existing) : L.schema.make.note(defaults || {});
      var tags = (n.tags || []).slice();
      var checklist = (n.checklist || []).slice();
      var attachments = (n.attachments || []).slice();
      n.links = n.links || { taskIds: [], projectIds: [], goalIds: [] };

      L.modal.open({
        title: existing ? 'Note' : 'Nouvelle note',
        size: 'wide',
        body: function () {
          var checkWrap = h('div.col', { style: { gap: '5px' } });
          function drawChecks() {
            L.dom.mount(checkWrap, checklist.map(function (c, i) {
              return h('div.row', [
                L.dom.checkbox(c.done, function (v) { c.done = v; drawChecks(); }),
                input({
                  value: c.title, oninput: function (e) { c.title = e.target.value; },
                  onkeydown: function (e) {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      checklist.splice(i + 1, 0, { id: L.util.uid('ck'), title: '', done: false });
                      drawChecks();
                      var inputs = checkWrap.querySelectorAll('input.input');
                      if (inputs[i + 1]) inputs[i + 1].focus();
                    }
                  }
                }),
                h('button.iconbtn', {
                  type: 'button', 'aria-label': 'Supprimer',
                  onclick: function () { checklist.splice(i, 1); drawChecks(); }
                }, L.icon('trash'))
              ]);
            }).concat([
              h('button.btn.btn--s.btn--ghost', {
                type: 'button',
                onclick: function () { checklist.push({ id: L.util.uid('ck'), title: '', done: false }); drawChecks(); }
              }, [L.icon('plus'), 'Ajouter une ligne'])
            ]));
          }
          drawChecks();

          return [
            L.dom.field('Titre', input({ value: n.title, placeholder: 'Sans titre', oninput: function (e) { n.title = e.target.value; } })),
            L.dom.field('Contenu', textarea({
              value: n.body, style: { minHeight: '190px' },
              oninput: function (e) { n.body = e.target.value; }
            })),
            row([
              L.dom.field('Dossier', select(optionsFrom(L.notes.folders(), 'Aucun'), n.folderId || '', function (v) { n.folderId = v || null; })),
              L.dom.field('Épinglée', h('div.row', [L.dom.toggle(n.pinned, function (v) { n.pinned = v; }, 'Épingler')]))
            ]),
            L.dom.field('Liste à cocher', checkWrap),
            L.dom.field('Étiquettes', tagEditor(tags, function (next) { tags = next; })),
            row([
              L.dom.field('Lier à un projet', select(optionsFrom(L.projects.all(), 'Aucun'), n.links.projectIds[0] || '', function (v) {
                n.links.projectIds = v ? [v] : [];
              })),
              L.dom.field('Lier à un objectif', select(optionsFrom(L.goals.all(), 'Aucun'), n.links.goalIds[0] || '', function (v) {
                n.links.goalIds = v ? [v] : [];
              }))
            ]),
            L.dom.field('Lier à une tâche', select(optionsFrom(L.tasks.filter({ status: 'open' }), 'Aucune'), n.links.taskIds[0] || '', function (v) {
              n.links.taskIds = v ? [v] : [];
            })),
            L.dom.field('Pièces jointes', attachmentEditor(attachments, function (next) { attachments = next; }))
          ];
        },
        footerSplit: !!existing,
        footer: function (api) {
          var del = existing ? h('button.btn.btn--danger', {
            onclick: function () { L.notes.remove(n.id); api.close(); L.toast.undo('Note supprimée'); if (onDone) onDone(null); }
          }, 'Supprimer') : null;
          var save = h('div.row', [
            h('button.btn', { onclick: function () { api.close(); } }, 'Annuler'),
            h('button.btn.btn--primary', {
              onclick: function () {
                n.tags = tags;
                n.attachments = attachments;
                n.checklist = checklist.filter(function (c) { return c.title.trim(); });
                if (!n.title.trim()) n.title = (n.body || 'Note').split('\n')[0].slice(0, 50) || 'Note';
                var saved = existing ? L.notes.save(n.id, n) : L.notes.create(n);
                api.close();
                L.toast.show(existing ? 'Note enregistrée' : 'Note créée');
                if (onDone) onDone(saved);
              }
            }, 'Enregistrer')
          ]);
          return existing ? [del, save] : [save];
        }
      });
    }
  };

  L.forms = Forms;
})(window.LifeOS = window.LifeOS || {});
