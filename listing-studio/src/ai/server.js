/* Client du service IA hébergé.
 *
 * Aucune clé d'API ne transite ni ne réside dans le frontend : le navigateur
 * n'appelle que /api/*, et c'est le serveur (server/server.js) qui détient la
 * clé du fournisseur. Si le service n'est pas configuré, l'application bascule
 * sur le moteur local sans interrompre l'utilisateur.
 */

/* Chemin relatif au document : l'application fonctionne aussi bien à la racine
   d'un domaine que dans un sous-dossier (hébergement statique, GitHub Pages).
   Sans serveur en face, la sonde échoue proprement et le moteur local prend
   le relais. */
const BASE = new URL('api', document.baseURI).href.replace(/\/$/, '');
let health = null;
let probing = null;

async function jsonFetch(path, body, { timeout = 30000 } = {}){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try{
    const res = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type':'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/* Le résultat de la sonde est retenu 24 h : sur un hébergement statique,
   inutile de rejouer un appel voué à l'échec à chaque chargement de page. */
const CACHE_KEY = 'ls.v1.apiProbe';
const CACHE_TTL = 24 * 3600 * 1000;

const readCache = () => {
  try{
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return raw && Date.now() - raw.at < CACHE_TTL ? raw.value : null;
  }catch{ return null; }
};
const writeCache = (value) => {
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), value })); }catch{}
};

const OFFLINE = { reachable:false, ai:{ configured:false }, storage:{ configured:false } };

/** Sonde du service : une seule fois par session, et au plus une par jour. */
export function probe({ force = false } = {}){
  if (health && !force) return Promise.resolve(health);
  if (probing && !force) return probing;
  if (!force){
    const cached = readCache();
    if (cached){ health = cached; return Promise.resolve(health); }
  }
  probing = jsonFetch('/health')
    .then(h => { health = { reachable:true, ...h }; writeCache(health); return health; })
    .catch(() => { health = { ...OFFLINE }; writeCache(health); return health; })
    .finally(() => { probing = null; });
  return probing;
}

export const status = () => health;
export const isConfigured = () => Boolean(health?.reachable && health?.ai?.configured);

export const generate = (payload) => jsonFetch('/ai/generate', payload, { timeout: 60000 });
export const rewrite  = (payload) => jsonFetch('/ai/rewrite', payload, { timeout: 60000 });
export const chat     = (payload) => jsonFetch('/ai/chat', payload, { timeout: 60000 });
export const vision   = (payload) => jsonFetch('/ai/vision', payload, { timeout: 60000 });
export const market   = (payload) => jsonFetch('/market/pricing', payload, { timeout: 20000 });
