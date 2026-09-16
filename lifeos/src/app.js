/* ==========================================================================
   LifeOS — assemblage
   Ce fichier ne contient aucune règle métier : il branche le stockage sur
   l'état, l'état sur les écrans, et les écrans sur la navigation.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;
  var root = null, adapter = null, profile = null;
  var scrollMemory = {};
  var renderQueued = false;
  var clockTimer = null;

  function sections() {
    var order = L.store.state.settings.sections || [];
    var byId = {};
    L.schema.SECTIONS.forEach(function (s) { byId[s.id] = s; });
    return order.map(function (entry) {
      var def = byId[entry.id];
      return def ? Object.assign({}, def, { hidden: !!entry.hidden }) : null;
    }).filter(Boolean);
  }

  function visibleSections() {
    return sections().filter(function (s) { return !s.hidden || !s.hideable; });
  }

  function badge(id) {
    switch (id) {
      case 'today': {
        var n = L.tasks.forDate(D.today(), { includeOverdue: true })
          .filter(function (t) { return L.tasks.OPEN_STATUS[t.status]; }).length;
        return n || null;
      }
      case 'tasks': {
        var late = L.tasks.overdue().length;
        return late || null;
      }
      case 'goals': {
        var behind = L.goals.behind().length;
        return behind || null;
      }
      case 'finance': {
        var b = L.finance.budget();
        return b.alerts || null;
      }
      case 'habits': {
        var c = L.habits.dayCompletion();
        return c.total ? (c.total - c.done) || null : null;
      }
      default: return null;
    }
  }

  /* ---------------- coquille ---------------- */
  function sidebar() {
    var currentView = L.router.current().view;
    var list = visibleSections();
    var main = list.filter(function (s) { return s.id !== 'settings' && s.id !== 'assistant'; });
    var foot = list.filter(function (s) { return s.id === 'assistant' || s.id === 'settings'; });

    function item(s) {
      var count = badge(s.id);
      return h('a.navitem', {
        href: '#/' + s.id,
        'aria-current': currentView === s.id ? 'page' : null
      }, [
        L.icon(s.icon),
        h('span.grow.truncate', s.label),
        count ? h('span.navitem__count', String(count)) : null
      ]);
    }

    return h('aside.sidebar', [
      h('div.sidebar__head', [
        h('div.brand', [h('div.brand__mark', 'L'), 'LifeOS'])
      ]),
      h('nav.sidebar__nav.hide-scrollbar', [
        h('div.col', { style: { gap: '1px' } }, main.map(item)),
        h('div.sidebar__group', 'Outils'),
        h('div.col', { style: { gap: '1px' } }, foot.map(item))
      ]),
      h('div.sidebar__foot', [
        h('button.profile', {
          onclick: function (e) { profileMenu(e.currentTarget); }
        }, [
          h('div.avatar', profile && profile.picture
            ? h('img', { src: profile.picture, alt: '' })
            : L.util.initials(profile ? profile.name : '?')),
          h('div.grow', { style: { minWidth: 0, textAlign: 'left' } }, [
            h('div.t-s.w-600.truncate', profile ? profile.name : 'Invité'),
            h('div.t-xs.faint.truncate', L.auth.providerLabel(profile))
          ]),
          L.icon('chevron-down')
        ])
      ])
    ]);
  }

  function profileMenu(anchor) {
    var others = L.auth.list().filter(function (p) { return !profile || p.id !== profile.id; });
    var items = [];
    if (others.length) {
      items.push({ label: 'Changer de compte', header: true });
      others.forEach(function (p) {
        items.push({
          icon: 'user', label: p.name,
          run: function () { L.app.switchProfile(p.id); }
        });
      });
      items.push('-');
    }
    items.push(
      { icon: 'settings', label: 'Paramètres', run: function () { L.router.go('settings'); } },
      { icon: 'download', label: 'Exporter mes données', run: function () {
        L.util.download('lifeos-' + D.today() + '.json', L.store.exportJSON(), 'application/json');
        L.toast.show('Sauvegarde téléchargée');
      } },
      { icon: 'plus', label: 'Ajouter un profil', run: function () { L.app.addProfile(); } },
      '-',
      { icon: 'lock', label: 'Se déconnecter', danger: true, run: function () { L.app.signOut(); } }
    );
    L.menu(anchor, items);
  }

  function topbar() {
    var view = L.router.current().view;
    var def = L.schema.SECTIONS.filter(function (s) { return s.id === view; })[0];
    var subtitle = view === 'home' || view === 'today'
      ? D.format(D.today(), 'long').replace(/^./, function (c) { return c.toUpperCase(); })
      : null;

    return h('header.topbar', [
      h('div.mobile-only', [h('div.brand__mark', 'L')]),
      h('div.topbar__title.truncate', [
        h('span.truncate', def ? def.label : 'LifeOS'),
        subtitle ? h('span.topbar__sub.desktop-only', subtitle) : null
      ]),
      h('div.topbar__actions', [
        h('button.searchbtn', {
          onclick: function () { L.palette.open(); },
          'aria-label': 'Rechercher'
        }, [
          L.icon('search'),
          h('span', 'Rechercher'),
          h('kbd', L.util.modKey() + ' K')
        ]),
        h('button.iconbtn.desktop-only', {
          onclick: function () { L.views.lost(); },
          title: 'Je suis perdu', 'aria-label': 'Je suis perdu'
        }, L.icon('compass')),
        h('button.btn.btn--primary.btn--icon', {
          onclick: function (e) { createMenu(e.currentTarget); },
          'aria-label': 'Créer'
        }, L.icon('plus'))
      ])
    ]);
  }

  function createMenu(anchor) {
    L.menu(anchor, [
      { icon: 'check', label: 'Tâche', hint: 'T', run: function () { L.forms.quickTask(); } },
      { icon: 'note', label: 'Note', hint: 'N', run: function () { L.forms.note(); } },
      { icon: 'wallet', label: 'Dépense', hint: 'E', run: function () { L.forms.transaction(null, { type: 'expense' }); } },
      { icon: 'calendar', label: 'Événement', run: function () { L.forms.event(null, { date: D.today() }); } },
      '-',
      { icon: 'folder', label: 'Projet', hint: 'P', run: function () { L.forms.project(); } },
      { icon: 'target', label: 'Objectif', hint: 'O', run: function () { L.forms.goal(); } },
      { icon: 'repeat', label: 'Habitude', hint: 'H', run: function () { L.forms.habit(); } }
    ], { align: 'right' });
  }

  function tabbar() {
    var currentView = L.router.current().view;
    var list = visibleSections().filter(function (s) { return s.mobile; }).slice(0, 4);
    var nodes = list.map(function (s) {
      return h('a.tabbar__item', {
        href: '#/' + s.id,
        'aria-current': currentView === s.id ? 'page' : null
      }, [L.icon(s.icon), h('span', s.label)]);
    });
    nodes.push(h('button.tabbar__item', {
      onclick: function (e) { moreMenu(e.currentTarget); },
      'aria-current': list.every(function (s) { return s.id !== currentView; }) ? 'page' : null
    }, [L.icon('more'), h('span', 'Plus')]));
    return h('nav.tabbar', nodes);
  }

  function moreMenu(anchor) {
    var shown = visibleSections().filter(function (s) { return s.mobile; }).slice(0, 4).map(function (s) { return s.id; });
    var rest = visibleSections().filter(function (s) { return shown.indexOf(s.id) === -1; });
    L.menu(anchor, rest.map(function (s) {
      return { icon: s.icon, label: s.label, run: function () { L.router.go(s.id); } };
    }).concat([
      '-',
      { icon: 'compass', label: 'Je suis perdu', run: function () { L.views.lost(); } },
      { icon: 'search', label: 'Rechercher', run: function () { L.palette.open(); } }
    ]), { align: 'right' });
  }

  /* ---------------- rendu ---------------- */
  function renderView() {
    var route = L.router.current();
    var builder = L.views[route.view] || L.views.home;
    var node;
    try {
      node = builder(route.params || {});
    } catch (err) {
      console.error('[LifeOS] écran', route.view, err);
      node = h('div.view', [
        h('div.card', [
          h('h3', 'Cet écran n\'a pas pu s\'afficher'),
          h('p.t-s.muted', { style: { marginTop: '8px' } }, String(err && err.message || err)),
          h('button.btn', { style: { marginTop: '12px' }, onclick: function () { L.router.go('home'); } }, "Revenir à l'accueil")
        ])
      ]);
    }
    return node;
  }

  function render() {
    if (!root) return;
    var route = L.router.current();
    var main = root.querySelector('.main');
    if (main) {
      var previous = main.querySelector('.view');
      if (previous) scrollMemory[previous.dataset.view] = window.scrollY;
    }

    var view = renderView();
    view.dataset.view = route.view;

    L.dom.mount(root, [
      h('div.shell', [
        sidebar(),
        h('main.main', [topbar(), view])
      ]),
      tabbar()
    ]);

    document.title = (L.schema.SECTIONS.filter(function (s) { return s.id === route.view; })[0] || { label: 'LifeOS' }).label + ' — LifeOS';

    var y = scrollMemory[route.view];
    window.scrollTo(0, route.params && route.params.scroll === 'top' ? 0 : (y || 0));
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  /* ---------------- écran de connexion ---------------- */
  function authScreen() {
    var nameField = h('input.input', { placeholder: 'Ton prénom', value: '' });

    function localSignIn() {
      var p = L.auth.createLocal(nameField.value);
      L.app.start(p);
    }

    L.dom.mount(root, h('div.auth', [
      h('div.auth__panel', [
        h('div.auth__mark', 'L'),
        h('div', [
          h('h1', { style: { fontSize: 'var(--fs-2xl)' } }, 'LifeOS'),
          h('p.muted.t-m', { style: { marginTop: '8px' } },
            'Ton temps, tes tâches, tes objectifs, tes finances et tes habitudes — au même endroit.')
        ]),
        h('div.col', { style: { gap: '10px' } }, [
          h('button.auth__provider', {
            onclick: function () {
              L.auth.google().then(function (p) { L.app.start(p); },
                function (err) { L.toast.error(err.message); });
            }
          }, [L.icon('google'), 'Continuer avec Google']),
          h('button.auth__provider', {
            onclick: function () {
              L.auth.apple().then(function (p) { L.app.start(p); },
                function (err) { L.toast.error(err.message); });
            }
          }, [L.icon('apple'), 'Continuer avec Apple'])
        ]),
        h('div.row', [h('div.sep.grow'), h('span.t-xs.faint', 'ou'), h('div.sep.grow')]),
        h('div.col', { style: { gap: '10px' } }, [
          nameField,
          h('button.btn.btn--primary.btn--l.btn--full', { onclick: localSignIn }, 'Utiliser sur cet appareil')
        ]),
        L.auth.list().length ? h('div.col', { style: { gap: '6px' } }, [
          h('div.eyebrow', { style: { marginTop: '8px' } }, 'Profils existants'),
          h('div.list.list--framed', L.auth.list().map(function (p) {
            return h('button.list__item', { onclick: function () { L.app.switchProfile(p.id); } }, [
              h('div.avatar', p.picture ? h('img', { src: p.picture, alt: '' }) : L.util.initials(p.name)),
              h('div.grow', { style: { textAlign: 'left' } }, [
                h('div.t-s.w-500', p.name),
                h('div.t-xs.faint', L.auth.providerLabel(p))
              ]),
              L.icon('chevron-right')
            ]);
          }))
        ]) : null,
        h('p.t-xs.faint', { style: { textAlign: 'center' } },
          'Tes données restent sur cet appareil, séparées par profil. Connexion Google ou Apple : ' +
          'renseigne tes identifiants d\'application dans Paramètres → Compte.')
      ])
    ]));
  }

  /* ---------------- déverrouillage ---------------- */
  function lockScreen(onUnlocked, wrong) {
    var field = h('input.input', { type: 'password', placeholder: 'Phrase secrète', autofocus: true });
    function tryUnlock() {
      adapter.setPassphrase(field.value);
      L.store.attach(adapter).then(function (info) { onUnlocked(info); }, function (err) {
        if (err && err.code === 'BAD_PASSPHRASE') lockScreen(onUnlocked, true);
        else L.toast.error('Lecture impossible : ' + err.message);
      });
    }
    field.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });

    L.dom.mount(root, h('div.auth', [
      h('div.auth__panel', [
        h('div.auth__mark', [L.icon('lock')]),
        h('div', [
          h('h1', { style: { fontSize: 'var(--fs-xl)' } }, 'Données verrouillées'),
          h('p.muted.t-s', { style: { marginTop: '6px' } },
            wrong ? 'Phrase secrète incorrecte.' : 'Saisis ta phrase secrète pour ouvrir ce profil.')
        ]),
        field,
        h('button.btn.btn--primary.btn--l.btn--full', { onclick: tryUnlock }, 'Déverrouiller'),
        h('button.btn.btn--ghost.btn--full', { onclick: function () { L.app.signOut(); } }, 'Changer de compte')
      ])
    ]));
  }

  /* ---------------- premier lancement ---------------- */
  function welcome() {
    L.modal.open({
      title: 'Bienvenue',
      size: 'narrow',
      dismissible: false,
      body: h('div.col', [
        h('p.t-s', 'LifeOS est prêt. Huit domaines, des catégories de dépenses et neuf habitudes sont déjà en place — tout est modifiable.'),
        h('p.t-s.muted', 'Veux-tu partir d\'une base vide, ou explorer avec un jeu d\'exemple (tâches, projets, objectifs, finances et historique) ?')
      ]),
      footer: function (api) {
        return [
          h('button.btn', {
            onclick: function () { api.close(); L.toast.show('À toi de jouer — appuie sur T pour ta première tâche.'); }
          }, 'Commencer vide'),
          h('button.btn.btn--primary', {
            onclick: function () {
              L.store.update(function (s) { L.seed.demo(s); }, 'Exemple chargé');
              api.close();
              L.toast.show('Jeu d\'exemple chargé — tu peux tout effacer depuis les Paramètres.');
            }
          }, 'Charger l\'exemple')
        ];
      }
    });
  }

  /* ---------------- application ---------------- */
  var App = {
    adapter: function () { return adapter; },
    profile: function () { return profile; },
    sections: sections,
    visibleSections: visibleSections,
    render: queueRender,
    renderNow: render,

    applyTheme: function () {
      var settings = L.store.state.settings;
      var theme = settings.theme || 'auto';
      var el = document.documentElement;
      if (theme === 'auto') el.removeAttribute('data-theme');
      else el.setAttribute('data-theme', theme);
      el.setAttribute('data-accent', settings.accent || 'encre');
      el.setAttribute('data-density', settings.density === 'compact' ? 'compact' : 'confort');
      L.storage.writeGlobal('theme', { theme: theme, accent: settings.accent, density: settings.density });

      var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0B0B0D' : '#FFFFFF');
      document.dispatchEvent(new CustomEvent('lifeos:theme'));
    },

    /* Thème appliqué avant même le chargement des données : pas de flash
       blanc au lancement sur un appareil en mode sombre. */
    applyCachedTheme: function () {
      var cached = L.storage.readGlobal('theme', null);
      if (!cached) return;
      var el = document.documentElement;
      if (cached.theme && cached.theme !== 'auto') el.setAttribute('data-theme', cached.theme);
      if (cached.accent) el.setAttribute('data-accent', cached.accent);
      if (cached.density) el.setAttribute('data-density', cached.density === 'compact' ? 'compact' : 'confort');
    },

    start: function (nextProfile) {
      profile = nextProfile;
      adapter = L.storage.open(L.auth.namespace(profile));

      function boot(info) {
        App.applyTheme();
        L.router.init();
        L.notify.init();
        queueRender();

        if (info && info.fresh) setTimeout(welcome, 400);

        var missed = L.notify.catchUp();
        if (missed) setTimeout(function () {
          L.toast.show(missed.title + ' — ' + missed.body, { duration: 7000 });
        }, 1200);

        if (clockTimer) clearInterval(clockTimer);
        clockTimer = setInterval(function () {
          var view = L.router.current().view;
          if (view === 'home' || view === 'today' || view === 'planning') queueRender();
        }, 60000);
      }

      adapter.isEncrypted().then(function (locked) {
        if (locked) { lockScreen(boot); return; }
        L.store.attach(adapter).then(boot, function (err) {
          if (err && err.code === 'LOCKED') lockScreen(boot);
          else {
            console.error(err);
            L.toast.error('Chargement impossible : ' + err.message);
          }
        });
      });
    },

    switchProfile: function (id) {
      var p = L.auth.switchTo(id);
      if (!p) return;
      L.store.flush().then(function () {
        L.store.detach();
        App.start(p);
        L.toast.show('Profil : ' + p.name);
      });
    },

    addProfile: function () {
      L.modal.prompt({ title: 'Nouveau profil', label: 'Prénom', placeholder: 'Ex. : Alex' }).then(function (name) {
        if (!name) return;
        var p = L.auth.createLocal(name);
        L.store.flush().then(function () {
          L.store.detach();
          App.start(p);
        });
      });
    },

    signOut: function () {
      L.store.flush().then(function () {
        L.auth.signOut();
        L.store.detach();
        profile = null;
        adapter = null;
        authScreen();
      });
    },

    boot: function () {
      root = document.getElementById('app');
      App.applyCachedTheme();
      L.shortcuts.init();

      L.router.on('change', function () { queueRender(); });
      L.store.on('change', function () { queueRender(); });
      L.store.on('error', function (err) {
        L.toast.error('Sauvegarde impossible : ' + (err && err.message || 'espace insuffisant'));
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if ((L.store.state.settings.theme || 'auto') === 'auto') App.applyTheme();
      });

      /* Le passage au jour suivant doit rafraîchir les écrans du jour. */
      var lastDay = D.today();
      setInterval(function () {
        if (D.today() !== lastDay) { lastDay = D.today(); queueRender(); }
      }, 30000);

      window.addEventListener('pagehide', function () { L.store.flush(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) L.store.flush();
        else queueRender();
      });

      var current = L.auth.current();
      if (current) App.start(current);
      else authScreen();

      if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('./sw.js').catch(function () { /* hors ligne : sans conséquence */ });
        });
      }
    }
  };

  L.app = App;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.boot);
  else App.boot();
})(window.LifeOS = window.LifeOS || {});
