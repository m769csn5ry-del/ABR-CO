/* ==========================================================================
   LifeOS — stockage
   Les données vivent sur l'appareil, dans un espace nommé par compte :
   deux profils ne se voient jamais, même sur le même navigateur.

   IndexedDB d'abord (quota confortable, écriture asynchrone), repli sur
   localStorage si la base est indisponible (navigation privée, réglages
   restrictifs). Une phrase secrète facultative chiffre l'ensemble en
   AES-GCM avant écriture : le disque ne contient alors plus rien de lisible.

   L'interface est volontairement réduite à load/save/clear pour qu'un
   adaptateur distant (serveur, base hébergée) puisse la remplacer sans
   toucher au reste de l'application.
   ========================================================================== */
(function (L) {
  'use strict';

  var DB_NAME = 'lifeos';
  var DB_VERSION = 1;
  var STORE = 'states';
  var FILES = 'files';
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('indexedDB indisponible'));
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('base bloquée')); };
    }).catch(function (e) { dbPromise = null; throw e; });
    return dbPromise;
  }

  function idb(store, mode, run) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var req = run(tx.objectStore(store));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  /* --- chiffrement facultatif --- */
  var subtle = (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;

  function deriveKey(passphrase, salt) {
    var enc = new TextEncoder();
    return subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 180000, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  function encrypt(passphrase, plain) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(passphrase, salt).then(function (key) {
      return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plain));
    }).then(function (buf) {
      return {
        enc: 1,
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(buf))
      };
    });
  }

  function decrypt(passphrase, payload) {
    var salt = new Uint8Array(payload.salt);
    var iv = new Uint8Array(payload.iv);
    var data = new Uint8Array(payload.data);
    return deriveKey(passphrase, salt).then(function (key) {
      return subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    }).then(function (buf) { return new TextDecoder().decode(buf); });
  }

  /* --- adaptateur local --- */
  function localAdapter(namespace) {
    var key = 'lifeos:' + namespace;
    var passphrase = null;
    var useIDB = true;

    function readRaw() {
      if (!useIDB) return Promise.resolve(lsRead());
      return idb(STORE, 'readonly', function (s) { return s.get(key); })
        .catch(function () { useIDB = false; return lsRead(); });
    }
    function writeRaw(value) {
      if (!useIDB) return Promise.resolve(lsWrite(value));
      return idb(STORE, 'readwrite', function (s) { return s.put(value, key); })
        .catch(function () { useIDB = false; return lsWrite(value); });
    }
    function lsRead() {
      try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : undefined; }
      catch (e) { return undefined; }
    }
    function lsWrite(value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { throw new Error('espace de stockage plein'); }
    }

    return {
      namespace: namespace,
      kind: 'local',

      isEncrypted: function () {
        return readRaw().then(function (raw) { return !!(raw && raw.enc); });
      },
      setPassphrase: function (p) { passphrase = p || null; },
      hasPassphrase: function () { return !!passphrase; },

      load: function () {
        return readRaw().then(function (raw) {
          if (raw === undefined || raw === null) return null;
          if (raw && raw.enc) {
            if (!passphrase) { var e = new Error('verrouillé'); e.code = 'LOCKED'; throw e; }
            return decrypt(passphrase, raw).then(function (json) { return JSON.parse(json); },
              function () { var er = new Error('phrase secrète incorrecte'); er.code = 'BAD_PASSPHRASE'; throw er; });
          }
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        });
      },

      save: function (state) {
        var json = JSON.stringify(state);
        if (passphrase && subtle) {
          return encrypt(passphrase, json).then(writeRaw);
        }
        return writeRaw(JSON.parse(json));
      },

      clear: function () {
        try { localStorage.removeItem(key); } catch (e) { /* ignoré */ }
        return idb(STORE, 'readwrite', function (s) { return s.delete(key); }).catch(function () {});
      },

      /* Pièces jointes : rangées à part, elles ne gonflent pas l'état. */
      putFile: function (id, blob) {
        return idb(FILES, 'readwrite', function (s) { return s.put(blob, namespace + ':' + id); })
          .catch(function () { throw new Error('pièces jointes indisponibles'); });
      },
      getFile: function (id) {
        return idb(FILES, 'readonly', function (s) { return s.get(namespace + ':' + id); })
          .catch(function () { return null; });
      },
      deleteFile: function (id) {
        return idb(FILES, 'readwrite', function (s) { return s.delete(namespace + ':' + id); }).catch(function () {});
      },

      estimate: function () {
        if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
        return Promise.resolve({ usage: null, quota: null });
      }
    };
  }

  L.storage = {
    open: function (namespace) { return localAdapter(namespace || 'local'); },
    canEncrypt: function () { return !!subtle; },
    /* Espace partagé par tous les profils : la liste des comptes elle-même. */
    readGlobal: function (key, fallback) {
      try { var s = localStorage.getItem('lifeos:@' + key); return s ? JSON.parse(s) : fallback; }
      catch (e) { return fallback; }
    },
    writeGlobal: function (key, value) {
      try { localStorage.setItem('lifeos:@' + key, JSON.stringify(value)); } catch (e) { /* ignoré */ }
    },
    removeGlobal: function (key) {
      try { localStorage.removeItem('lifeos:@' + key); } catch (e) { /* ignoré */ }
    }
  };
})(window.LifeOS = window.LifeOS || {});
