/* ==========================================================================
   LifeOS — barre de commandes
   Une seule touche (⌘K) pour tout : chercher dans ses données, changer
   d'écran, lancer une action. Les résultats mélangent commandes et contenu,
   classés par pertinence — jamais deux listes séparées à comparer.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h;
  var RECENT_KEY = 'palette-recent';

  function recents() { return L.storage.readGlobal(RECENT_KEY, []) || []; }
  function remember(id) {
    var list = recents().filter(function (x) { return x !== id; });
    list.unshift(id);
    L.storage.writeGlobal(RECENT_KEY, list.slice(0, 8));
  }

  /* Toutes les commandes disponibles. Une commande = un identifiant stable,
     un libellé, une icône, un raccourci affiché et une action. */
  function commands() {
    var out = [];
    var settings = L.store.state.settings;

    L.schema.SECTIONS.forEach(function (s) {
      var hidden = (settings.sections || []).filter(function (x) { return x.id === s.id; })[0];
      if (hidden && hidden.hidden && s.hideable) return;
      out.push({
        id: 'go:' + s.id, group: 'Aller à', label: s.label, icon: s.icon,
        hint: 'g ' + s.label.charAt(0).toLowerCase(),
        run: function () { L.router.go(s.id); }
      });
    });

    if (L.timer.current()) {
      out.push({
        id: 'act:timer-stop', group: 'Faire', icon: 'pause',
        label: 'Arrêter le minuteur (' + L.timer.label() + ')',
        run: function () { L.timer.stop(); }
      });
    }

    out.push(
      { id: 'new:task', group: 'Créer', label: 'Nouvelle tâche', icon: 'check', hint: 'T', run: function () { L.forms.quickTask(); } },
      { id: 'new:task-full', group: 'Créer', label: 'Nouvelle tâche détaillée', icon: 'check', run: function () { L.forms.task(); } },
      { id: 'new:note', group: 'Créer', label: 'Nouvelle note', icon: 'note', hint: 'N', run: function () { L.forms.note(); } },
      { id: 'new:expense', group: 'Créer', label: 'Nouvelle dépense', icon: 'wallet', hint: 'E', run: function () { L.forms.transaction(null, { type: 'expense' }); } },
      { id: 'new:income', group: 'Créer', label: 'Nouveau revenu', icon: 'wallet', run: function () { L.forms.transaction(null, { type: 'income' }); } },
      { id: 'new:project', group: 'Créer', label: 'Nouveau projet', icon: 'folder', hint: 'P', run: function () { L.forms.project(); } },
      { id: 'new:goal', group: 'Créer', label: 'Nouvel objectif', icon: 'target', hint: 'O', run: function () { L.forms.goal(); } },
      { id: 'new:habit', group: 'Créer', label: 'Nouvelle habitude', icon: 'repeat', hint: 'H', run: function () { L.forms.habit(); } },
      { id: 'new:event', group: 'Créer', label: 'Nouvel événement', icon: 'calendar', run: function () { L.forms.event(); } },

      { id: 'act:lost', group: 'Faire', label: 'Je suis perdu — que faire maintenant ?', icon: 'compass', hint: 'L', run: function () { L.views.lost(); } },
      { id: 'act:plan-day', group: 'Faire', label: 'Organiser ma journée', icon: 'sparkle', run: function () { L.router.go('planning', { generate: 'day' }); } },
      { id: 'act:plan-week', group: 'Faire', label: 'Préparer ma semaine', icon: 'layout', run: function () { L.router.go('planning', { tab: 'week', generate: 'week' }); } },
      { id: 'act:ask', group: 'Faire', label: "Parler à l'assistant", icon: 'sparkle', run: function () { L.router.go('assistant'); } },

      {
        id: 'set:theme', group: 'Réglages', label: 'Basculer clair / sombre', icon: 'moon',
        run: function () {
          var cur = L.store.state.settings.theme;
          var next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
          L.store.setSetting('theme', next);
          L.app.applyTheme();
          L.toast.show('Thème : ' + (next === 'auto' ? 'automatique' : next === 'dark' ? 'sombre' : 'clair'));
        }
      },
      { id: 'set:settings', group: 'Réglages', label: 'Ouvrir les paramètres', icon: 'settings', run: function () { L.router.go('settings'); } },
      { id: 'set:export', group: 'Réglages', label: 'Exporter mes données', icon: 'download', run: function () {
        L.util.download('lifeos-' + L.date.today() + '.json', L.store.exportJSON(), 'application/json');
        L.toast.show('Sauvegarde téléchargée');
      } },
      { id: 'set:ics', group: 'Réglages', label: 'Exporter le calendrier (.ics)', icon: 'calendar', run: function () { L.ics.download(); L.toast.show('Calendrier exporté'); } },
      { id: 'set:undo', group: 'Réglages', label: 'Annuler la dernière action', icon: 'undo', hint: L.util.modKey() + ' Z', run: function () {
        L.store.undo() ? L.toast.show('Action annulée') : L.toast.show('Rien à annuler');
      } }
    );
    return out;
  }

  var Palette = {
    open: function (initial) {
      var cmds = commands();
      var listNode = h('div.palette__list');
      var index = 0, items = [];

      var field = h('input.palette__input', {
        placeholder: 'Rechercher ou lancer une action…',
        value: initial || '',
        'aria-label': 'Barre de commandes',
        oninput: function () { draw(field.value); },
        onkeydown: function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
          else if (e.key === 'Enter') { e.preventDefault(); run(items[index]); }
        }
      });

      var api = L.modal.raw(function () {
        return h('div.palette', { role: 'dialog', 'aria-label': 'Commandes' }, [field, listNode]);
      }, { scrimClass: 'palette-scrim' });

      function move(delta) {
        if (!items.length) return;
        index = (index + delta + items.length) % items.length;
        paint();
        var active = listNode.querySelector('[data-active="true"]');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
      }

      function paint() {
        Array.prototype.forEach.call(listNode.querySelectorAll('.palette__item'), function (node, i) {
          node.dataset.active = i === index ? 'true' : 'false';
        });
      }

      function run(item) {
        if (!item) return;
        api.close();
        remember(item.id);
        setTimeout(item.run, 60);
      }

      function draw(query) {
        var q = (query || '').trim();
        items = [];

        if (!q) {
          var rec = recents();
          var byId = {};
          cmds.forEach(function (c) { byId[c.id] = c; });
          var recentItems = rec.map(function (id) { return byId[id]; }).filter(Boolean);
          items = recentItems.slice(0, 4).map(function (c) { return Object.assign({}, c, { group: 'Récemment' }); })
            .concat(cmds.filter(function (c) { return recentItems.indexOf(c) === -1; }));
        } else {
          var scored = [];
          cmds.forEach(function (c) {
            var s = L.util.fuzzy(c.label, q);
            if (s) scored.push({ cmd: c, score: s + 200 });
          });
          L.search.run(q, { limit: 24 }).forEach(function (r) {
            scored.push({
              score: r.score,
              cmd: {
                id: r.kind + ':' + r.id, group: r.meta.label, label: r.title, icon: r.meta.icon,
                hint: r.subtitle,
                run: function () { L.views.openEntity(r.kind, r.id); }
              }
            });
          });
          items = scored.sort(function (a, b) { return b.score - a.score; }).slice(0, 26)
            .map(function (x) { return x.cmd; });
        }

        index = 0;
        var nodes = [];
        var lastGroup = null;
        items.forEach(function (item, i) {
          if (item.group !== lastGroup) {
            lastGroup = item.group;
            nodes.push(h('div.palette__group.eyebrow', item.group));
          }
          nodes.push(h('button.palette__item', {
            'data-active': i === 0 ? 'true' : 'false',
            onmousemove: function () { if (index !== i) { index = i; paint(); } },
            onclick: function () { run(item); }
          }, [
            L.icon(item.icon || 'circle'),
            h('span.grow.truncate', item.label),
            item.hint ? h('span.palette__meta.truncate', item.hint) : null
          ]));
        });
        if (!items.length) {
          nodes.push(h('div.empty', { style: { padding: '32px 16px' } }, [
            L.icon('search'),
            h('div.empty__title', 'Aucun résultat'),
            h('p.empty__text', 'Essaie un autre mot, ou crée directement : « Nouvelle tâche ».')
          ]));
        }
        L.dom.mount(listNode, nodes);
      }

      draw(initial || '');
      setTimeout(function () { field.focus(); field.select(); }, 50);
      return api;
    }
  };

  L.palette = Palette;
})(window.LifeOS = window.LifeOS || {});
