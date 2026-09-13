/* Stockage des fichiers photo (binaire) dans IndexedDB.
   Les métadonnées, elles, vivent dans les tables (core/db.js) : c'est la
   séparation « base de données » / « stockage des fichiers » de l'architecture.
   Un repli mémoire garde l'app utilisable si IndexedDB est indisponible
   (navigation privée, quota, contexte restreint). */

const DB_NAME = 'listing-studio';
const DB_VERSION = 1;
const STORE = 'blobs';

let dbp = null;
const memory = new Map();
let degraded = false;

function open(){
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!('indexedDB' in window)) { degraded = true; return rej(new Error('IndexedDB indisponible')); }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (e) { degraded = true; return rej(e); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => { degraded = true; rej(req.error); };
  }).catch(err => { degraded = true; console.warn('[idb] repli mémoire :', err?.message); return null; });
  return dbp;
}

function tx(mode){
  return open().then(db => {
    if (!db) return null;
    return db.transaction(STORE, mode).objectStore(STORE);
  });
}

export const isDegraded = () => degraded;

export async function put(key, blob){
  const store = await tx('readwrite');
  if (!store) { memory.set(key, blob); return key; }
  return new Promise((res, rej) => {
    const r = store.put(blob, key);
    r.onsuccess = () => res(key);
    r.onerror = () => { memory.set(key, blob); degraded = true; res(key); };
  });
}

export async function get(key){
  if (memory.has(key)) return memory.get(key);
  const store = await tx('readonly');
  if (!store) return null;
  return new Promise((res) => {
    const r = store.get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });
}

export async function del(key){
  memory.delete(key);
  const store = await tx('readwrite');
  if (!store) return;
  return new Promise((res) => {
    const r = store.delete(key);
    r.onsuccess = () => res();
    r.onerror = () => res();
  });
}

/* Cache d'URL d'objets : une seule URL par clé, révoquée à la suppression. */
const urls = new Map();

export async function url(key){
  if (urls.has(key)) return urls.get(key);
  const blob = await get(key);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(key, u);
  return u;
}

export function forget(key){
  const u = urls.get(key);
  if (u) { URL.revokeObjectURL(u); urls.delete(key); }
}

export async function clearAll(){
  urls.forEach(u => URL.revokeObjectURL(u));
  urls.clear(); memory.clear();
  const store = await tx('readwrite');
  if (!store) return;
  return new Promise(res => { const r = store.clear(); r.onsuccess = () => res(); r.onerror = () => res(); });
}
