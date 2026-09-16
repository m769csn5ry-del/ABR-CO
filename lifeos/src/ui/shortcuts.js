/* ==========================================================================
   LifeOS — raccourcis clavier
   Pensés pour le Mac (⌘) mais valables partout. Une frappe ne déclenche
   jamais rien si le curseur est dans un champ de saisie.
   ========================================================================== */
(function (L) {
  'use strict';

  var pendingGo = false, pendingTimer = null;

  function editing(e) {
    var el = e.target;
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  var SHORTCUTS = [
    { keys: '⌘ K', label: 'Barre de commandes' },
    { keys: '/', label: 'Rechercher' },
    { keys: 'T', label: 'Nouvelle tâche' },
    { keys: 'N', label: 'Nouvelle note' },
    { keys: 'E', label: 'Nouvelle dépense' },
    { keys: 'P', label: 'Nouveau projet' },
    { keys: 'O', label: 'Nouvel objectif' },
    { keys: 'H', label: 'Nouvelle habitude' },
    { keys: 'L', label: 'Je suis perdu' },
    { keys: 'G puis A/J/C/T/P/O/F/H/S/N', label: 'Aller à un écran' },
    { keys: '⌘ Z', label: 'Annuler' },
    { keys: '⌘ ⇧ Z', label: 'Rétablir' },
    { keys: '?', label: 'Cette aide' },
    { keys: 'Échap', label: 'Fermer' }
  ];

  var GO = {
    a: 'home', j: 'today', c: 'calendar', t: 'tasks', p: 'projects',
    o: 'goals', f: 'finance', h: 'habits', s: 'stats', n: 'notes',
    i: 'assistant', r: 'settings', l: 'planning'
  };

  var Shortcuts = {
    LIST: SHORTCUTS,

    help: function () {
      L.modal.open({
        title: 'Raccourcis clavier',
        size: 'narrow',
        body: L.h('div.list', SHORTCUTS.map(function (s) {
          return L.h('div.list__item', [
            L.h('span.grow.t-s', s.label),
            L.h('kbd', s.keys)
          ]);
        }))
      });
    },

    init: function () {
      document.addEventListener('keydown', function (e) {
        var mod = e.metaKey || e.ctrlKey;

        /* ⌘K fonctionne même depuis un champ : c'est la sortie de secours. */
        if (mod && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          L.palette.open();
          return;
        }
        if (mod && (e.key === 'z' || e.key === 'Z')) {
          if (editing(e)) return;
          e.preventDefault();
          if (e.shiftKey) { L.store.redo() && L.toast.show('Action rétablie'); }
          else { L.store.undo() ? L.toast.show('Action annulée') : L.toast.show('Rien à annuler'); }
          return;
        }
        if (mod) return;
        if (editing(e)) return;
        if (L.modal.depth()) return;

        /* Enchaînement « g » puis une lettre pour naviguer. */
        if (pendingGo) {
          pendingGo = false;
          clearTimeout(pendingTimer);
          var view = GO[e.key.toLowerCase()];
          if (view) { e.preventDefault(); L.router.go(view); }
          return;
        }

        switch (e.key) {
          case 'g': case 'G':
            pendingGo = true;
            pendingTimer = setTimeout(function () { pendingGo = false; }, 1200);
            break;
          case '/':
            e.preventDefault(); L.palette.open(); break;
          case 't': case 'T':
            e.preventDefault(); L.forms.quickTask(); break;
          case 'n': case 'N':
            e.preventDefault(); L.forms.note(); break;
          case 'e': case 'E':
            e.preventDefault(); L.forms.transaction(null, { type: 'expense' }); break;
          case 'p': case 'P':
            e.preventDefault(); L.forms.project(); break;
          case 'o': case 'O':
            e.preventDefault(); L.forms.goal(); break;
          case 'h': case 'H':
            e.preventDefault(); L.forms.habit(); break;
          case 'l': case 'L':
            e.preventDefault(); L.views.lost(); break;
          case '?':
            e.preventDefault(); Shortcuts.help(); break;
        }
      });
    }
  };

  L.shortcuts = Shortcuts;
})(window.LifeOS = window.LifeOS || {});
