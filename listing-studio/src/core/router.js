/* Routeur à fragment (#/chemin) — aucune configuration serveur nécessaire,
   l'app se déploie sur n'importe quel hébergement statique. */

import { emit } from './events.js';

const routes = [];
let notFound = null;
let current = { path: '/', params: {}, query: {} };
let started = false;

/** `/project/:id/step/:step` -> expression + noms de paramètres. */
function compile(pattern){
  const names = [];
  const rx = pattern
    .replace(/\/+$/, '')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, (_, n) => { names.push(n); return '([^/]+)'; });
  return { rx: new RegExp('^' + (rx || '') + '/?$'), names };
}

export function route(pattern, handler, meta = {}){
  routes.push({ pattern, ...compile(pattern), handler, meta });
}
export function fallback(handler){ notFound = handler; }

export function parse(hash){
  const raw = (hash || location.hash || '#/').replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = {};
  new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
  return { path: path.replace(/\/+$/, '') || '/', query };
}

export function go(path, { replace = false } = {}){
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target){ resolve(); return; }
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
  if (replace) resolve();
}

export const currentRoute = () => current;

export function resolve(){
  const { path, query } = parse();
  for (const r of routes){
    const m = r.rx.exec(path);
    if (!m) continue;
    const params = {};
    r.names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
    current = { path, params, query, pattern: r.pattern, meta: r.meta };
    emit('route:before', current);
    try{
      r.handler(params, query, current);
    }catch(err){
      console.error('[router] échec du rendu', err);
      emit('route:error', { err, route: current });
    }
    emit('route:after', current);
    return;
  }
  current = { path, params: {}, query };
  notFound?.(path);
}

export function start(){
  if (started) return;
  started = true;
  window.addEventListener('hashchange', () => { resolve(); window.scrollTo({ top: 0 }); });
  if (!location.hash) history.replaceState(null, '', '#/');
  resolve();
}
