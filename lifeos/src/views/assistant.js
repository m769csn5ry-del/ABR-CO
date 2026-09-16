/* ==========================================================================
   LifeOS — Assistant
   Il répond avec les chiffres de l'application, et peut agir : ajouter une
   tâche, reporter, enregistrer une dépense, proposer un planning à accepter
   d'un geste. Hors ligne par défaut ; une clé d'API Claude débloque les
   questions libres.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;
  var pending = false;

  function runAction(action, reply) {
    switch (action.type) {
      case 'open':
        L.router.go(action.payload.view, action.payload);
        break;
      case 'open-entity':
        L.views.openEntity(action.payload.kind, action.payload.id);
        break;
      case 'accept-plan':
        L.planner.accept(action.payload.plan);
        L.toast.show('Planning accepté');
        L.router.go('today', { date: action.payload.plan.date });
        break;
      case 'accept-week':
        L.weekly.accept(action.payload.plan);
        L.toast.show('Semaine validée');
        L.router.go('planning', { tab: 'week' });
        break;
      case 'ask':
        send(action.payload.text);
        break;
      case 'undo':
        L.store.undo() ? L.toast.show('Action annulée') : L.toast.show('Rien à annuler');
        break;
      case 'bulk-today':
        L.store.update(function (s) {
          s.tasks.forEach(function (t) {
            if (action.payload.ids.indexOf(t.id) > -1) { t.date = D.today(); t.status = 'todo'; }
          });
        }, 'Tâches replacées');
        L.toast.undo(action.payload.ids.length + ' tâches replacées aujourd\'hui');
        break;
    }
  }

  function send(text) {
    var question = String(text || '').trim();
    if (!question || pending) return;
    L.assistant.remember('user', question);
    pending = true;
    L.app.render();

    L.assistant.ask(question).then(function (reply) {
      pending = false;
      L.assistant.remember('assistant', reply.text, {
        intent: reply.intent,
        list: reply.list || null,
        plan: reply.plan || null,
        actions: (reply.actions || []).map(function (a) { return { label: a.label, type: a.type, payload: a.payload }; })
      });
      L.app.render();
      /* On descend sur la dernière réponse sans casser la lecture. */
      setTimeout(function () {
        var chat = document.querySelector('.chat');
        if (chat) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 60);
    }, function (err) {
      pending = false;
      L.assistant.remember('assistant', 'Une erreur est survenue : ' + err.message);
      L.app.render();
    });
  }

  function message(msg) {
    var meta = msg.meta || {};
    var mine = msg.role === 'user';
    var bubble = h('div.msg__bubble', msg.text);

    var extras = [];
    if (meta.list && meta.list.length) {
      extras.push(h('div.list.list--framed.msg__extra', { style: { marginTop: 'var(--sp-3)' } }, meta.list.map(function (item) {
        return h('button.list__item', {
          onclick: function () { L.views.openEntity(item.kind === 'due' ? 'task' : item.kind, item.id); }
        }, [
          L.icon(item.kind === 'task' ? 'check' : item.kind === 'goal' ? 'target' : item.kind === 'project' ? 'folder' :
            item.kind === 'habit' ? 'repeat' : item.kind === 'event' ? 'calendar' : 'circle', 15),
          h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
            h('div.t-s.truncate', item.title),
            item.meta ? h('div.t-xs.faint.truncate', item.meta) : null
          ])
        ]);
      })));
    }
    if (meta.plan && meta.plan.blocks) {
      extras.push(h('div.card.msg__extra', { style: { marginTop: 'var(--sp-3)' } }, [
        L.views.planTimeline(meta.plan, { actions: false })
      ]));
    }
    if (meta.actions && meta.actions.length) {
      extras.push(h('div.msg__tools', meta.actions.map(function (a) {
        return h('button.btn.btn--s' + (a.type === 'accept-plan' || a.type === 'accept-week' ? '.btn--primary' : ''), {
          onclick: function () { runAction(a); }
        }, a.label);
      })));
    }

    return h('div.msg' + (mine ? '.msg--me' : ''), [
      h('div', { style: { maxWidth: '100%', minWidth: 0 } }, [bubble].concat(extras))
    ]);
  }

  L.views.assistant = function () {
    var history = L.assistant.history();
    var settings = L.store.state.settings.ai;
    var composer = h('textarea.composer__input', {
      placeholder: 'Pose ta question, ou demande une action…',
      rows: '1',
      oninput: function (e) {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(160, e.target.scrollHeight) + 'px';
      },
      onkeydown: function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          var value = e.target.value;
          e.target.value = '';
          e.target.style.height = 'auto';
          send(value);
        }
      }
    });

    return h('div.view.view--chat', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Assistant'),
            h('p.view__lead', settings.provider === 'anthropic' && settings.apiKey
              ? 'Mode étendu — questions libres via Claude, actions autorisées ' + (settings.allowActions ? 'oui' : 'non')
              : 'Mode local — tout est calculé sur cet appareil, sans compte ni connexion.')
          ]),
          h('div.row', [
            history.length ? h('button.btn.btn--s.btn--ghost', {
              onclick: function () {
                L.modal.confirm({ title: 'Effacer la conversation', text: 'L\'historique sera supprimé.', danger: true, confirm: 'Effacer' })
                  .then(function (ok) { if (ok) L.assistant.clearHistory(); });
              }
            }, 'Effacer') : null,
            h('button.btn.btn--s', { onclick: function () { L.router.go('settings', { tab: 'ai' }); } }, [L.icon('settings'), 'Réglages'])
          ])
        ])
      ]),

      history.length
        ? h('div.chat', history.map(message).concat(pending ? [
            h('div.msg', [h('div.msg__bubble.row', [h('span.spinner'), h('span.muted', 'Je regarde tes données…')])])
          ] : []))
        : h('div.col.chat-empty', { style: { gap: 'var(--sp-5)', paddingTop: 'var(--sp-5)' } }, [
            h('div.card.card--ink', [
              h('div.t-l.w-600', { style: { marginBottom: '8px' } }, 'Demande-moi ce que tu veux savoir'),
              h('p.t-s', 'Je lis tes tâches, ton calendrier, tes objectifs, tes habitudes et tes finances pour répondre avec tes vrais chiffres — et je peux agir à ta place quand tu le demandes.')
            ]),
            h('div.grid.grid--2', [
              h('div.card', [
                h('div.card__title', { style: { marginBottom: '10px' } }, 'Comprendre'),
                h('ul.col', { style: { gap: '6px' } }, [
                  'Qu\'est-ce que je dois faire aujourd\'hui ?',
                  'Quelles sont mes priorités ?',
                  'Quels objectifs sont en retard ?',
                  'Combien ai-je dépensé ce mois-ci ?',
                  'Combien dois-je économiser par mois ?'
                ].map(function (t) { return h('li.t-s.muted', '• ' + t); }))
              ]),
              h('div.card', [
                h('div.card__title', { style: { marginBottom: '10px' } }, 'Agir'),
                h('ul.col', { style: { gap: '6px' } }, [
                  'Organise ma soirée',
                  'Organise ma semaine',
                  'Ajoute réviser les stats demain 14h, 1 h',
                  'Reporte les courses à samedi',
                  'Ajoute une dépense de 24,50 € en courses'
                ].map(function (t) { return h('li.t-s.muted', '• ' + t); }))
              ])
            ])
          ]),

      h('div.composer', [
        composer,
        h('button.btn.btn--primary.btn--icon', {
          style: { height: '42px', width: '42px', borderRadius: 'var(--r-full)' },
          'aria-label': 'Envoyer',
          onclick: function () {
            var value = composer.value;
            composer.value = '';
            composer.style.height = 'auto';
            send(value);
          }
        }, L.icon('send'))
      ]),

      h('div.suggest', L.assistant.suggestions().map(function (s) {
        return h('button.suggest__item', { onclick: function () { send(s); } }, s);
      }))
    ]);
  };

  L.views.assistantSend = send;
})(window.LifeOS = window.LifeOS || {});
