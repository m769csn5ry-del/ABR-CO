/* ==========================================================================
   LifeOS — comptes et séparation des données
   Chaque compte possède son propre espace de stockage, nommé à partir de
   son identifiant. Changer de compte change d'espace : aucune donnée n'est
   partagée, aucune requête ne peut lire l'espace d'un autre.

   Connexion Google et Apple : ces deux services fournissent une identité
   vérifiée côté navigateur (un jeton signé). L'app s'en sert pour nommer
   l'espace de données et afficher le bon profil. Il faut renseigner ses
   identifiants d'application dans Paramètres → Compte ; sans cela, les
   profils locaux prennent le relais et l'app reste pleinement utilisable.
   ========================================================================== */
(function (L) {
  'use strict';

  var CURRENT = 'current';
  var PROFILES = 'profiles';

  function read() { return L.storage.readGlobal(PROFILES, []) || []; }
  function write(list) { L.storage.writeGlobal(PROFILES, list); }

  function decodeJWT(token) {
    try {
      var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(atob(part).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('script indisponible : ' + src)); };
      document.head.appendChild(s);
    });
  }

  var A = {
    decodeJWT: decodeJWT,

    list: function () { return read(); },

    current: function () {
      var id = L.storage.readGlobal(CURRENT, null);
      var found = read().filter(function (p) { return p.id === id; })[0];
      return found || null;
    },

    /* L'espace de stockage d'un compte : deux comptes ne peuvent pas se
       retrouver au même endroit, même avec le même prénom. */
    namespace: function (profile) {
      if (!profile) return 'invite';
      if (profile.provider === 'local') return 'u-' + profile.id;
      return profile.provider + '-' + L.util.hash(profile.provider + ':' + (profile.sub || profile.email || profile.id));
    },

    upsert: function (profile) {
      var list = read();
      var i = -1;
      list.forEach(function (p, idx) {
        if (p.id === profile.id || (profile.sub && p.sub === profile.sub && p.provider === profile.provider)) i = idx;
      });
      profile.lastUsed = Date.now();
      if (i > -1) list[i] = Object.assign(list[i], profile);
      else list.push(profile);
      write(list);
      L.storage.writeGlobal(CURRENT, profile.id);
      return profile;
    },

    createLocal: function (name) {
      return A.upsert({
        id: L.util.uid('usr'), provider: 'local',
        name: (name || '').trim() || 'Moi', email: '', picture: '',
        createdAt: Date.now()
      });
    },

    switchTo: function (id) {
      var p = read().filter(function (x) { return x.id === id; })[0];
      if (!p) return null;
      p.lastUsed = Date.now();
      write(read().map(function (x) { return x.id === id ? p : x; }));
      L.storage.writeGlobal(CURRENT, id);
      return p;
    },

    signOut: function () { L.storage.removeGlobal(CURRENT); },

    rename: function (id, name) {
      write(read().map(function (p) { return p.id === id ? Object.assign(p, { name: name }) : p; }));
    },

    /* Supprimer un compte efface aussi ses données : c'est le seul moyen
       d'être certain qu'il n'en reste rien sur l'appareil. */
    remove: function (id) {
      var p = read().filter(function (x) { return x.id === id; })[0];
      if (!p) return Promise.resolve(false);
      var adapter = L.storage.open(A.namespace(p));
      write(read().filter(function (x) { return x.id !== id; }));
      if (L.storage.readGlobal(CURRENT, null) === id) L.storage.removeGlobal(CURRENT);
      return adapter.clear().then(function () { return true; });
    },

    /* --- connexion Google ---
       Identity Services renvoie un jeton signé contenant le nom, l'adresse
       et l'identifiant stable du compte. */
    google: function (clientId) {
      var id = clientId || L.store.state.settings.auth.googleClientId;
      if (!id) return Promise.reject(new Error('Identifiant client Google absent — Paramètres → Compte.'));
      return loadScript('https://accounts.google.com/gsi/client').then(function () {
        return new Promise(function (resolve, reject) {
          if (!window.google || !window.google.accounts) return reject(new Error('Google indisponible'));
          window.google.accounts.id.initialize({
            client_id: id,
            callback: function (res) {
              var payload = decodeJWT(res.credential);
              if (!payload) return reject(new Error('jeton illisible'));
              resolve(A.upsert({
                id: 'google_' + L.util.hash(payload.sub),
                provider: 'google', sub: payload.sub,
                name: payload.name || payload.email, email: payload.email || '',
                picture: payload.picture || '', createdAt: Date.now()
              }));
            }
          });
          window.google.accounts.id.prompt(function (n) {
            if (n && (n.isNotDisplayed && n.isNotDisplayed() || n.isSkippedMoment && n.isSkippedMoment())) {
              reject(new Error('fenêtre Google fermée'));
            }
          });
        });
      });
    },

    /* --- connexion Apple ---
       « Sign in with Apple JS » ouvre une fenêtre et renvoie un jeton
       d'identité. L'identifiant de service et l'URL de retour se déclarent
       dans le compte développeur Apple. */
    apple: function () {
      var cfg = L.store.state.settings.auth;
      if (!cfg.appleClientId) return Promise.reject(new Error('Identifiant de service Apple absent — Paramètres → Compte.'));
      return loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js').then(function () {
        window.AppleID.auth.init({
          clientId: cfg.appleClientId,
          scope: 'name email',
          redirectURI: cfg.appleRedirect || window.location.origin + window.location.pathname,
          usePopup: true
        });
        return window.AppleID.auth.signIn();
      }).then(function (res) {
        var payload = decodeJWT(res.authorization.id_token);
        if (!payload) throw new Error('jeton illisible');
        var name = res.user && res.user.name
          ? [res.user.name.firstName, res.user.name.lastName].filter(Boolean).join(' ')
          : (payload.email || 'Compte Apple');
        return A.upsert({
          id: 'apple_' + L.util.hash(payload.sub),
          provider: 'apple', sub: payload.sub,
          name: name, email: payload.email || '', picture: '', createdAt: Date.now()
        });
      });
    },

    providerLabel: function (p) {
      if (!p) return '';
      return p.provider === 'google' ? 'Compte Google'
        : p.provider === 'apple' ? 'Compte Apple' : 'Profil sur cet appareil';
    }
  };

  L.auth = A;
})(window.LifeOS = window.LifeOS || {});
