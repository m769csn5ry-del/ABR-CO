/* Client du service IA hébergé.
 *
 * Aucune clé d'API ne transite ni ne réside dans le frontend : le navigateur
 * n'appelle que /api/*, et c'est le serveur (server/server.js) qui détient la
 * clé du fournisseur. Si le service n'est pas configuré, l'application bascule
 * sur le moteur local sans interrompre l'utilisateur.
 */

const BASE = '/api';
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

/** Sonde unique au démarrage : le résultat est mis en cache. */
export function probe({ force = false } = {}){
  if (health && !force) return Promise.resolve(health);
  if (probing && !force) return probing;
  probing = jsonFetch('/health')
    .then(h => { health = { reachable:true, ...h }; return health; })
    .catch(() => { health = { reachable:false, ai:{ configured:false }, storage:{ configured:false } }; return health; })
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
