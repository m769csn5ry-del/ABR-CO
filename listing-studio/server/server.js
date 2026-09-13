/* Serveur Listing Studio — sans dépendance obligatoire.
 *
 *   node server/server.js            (depuis le dossier listing-studio)
 *   PORT=4173 node server/server.js
 *
 * Rôles :
 *   1. servir l'application statique ;
 *   2. exposer /api/* — la seule surface que le navigateur appelle ;
 *   3. détenir les secrets (clés d'API) et ne jamais les exposer.
 *
 * Sans ANTHROPIC_API_KEY, /api/health annonce « non configuré » et
 * l'application bascule d'elle-même sur son moteur local.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ai from './ai-provider.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = 2 * 1024 * 1024;   // 2 Mo

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',   '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.ico':'image/x-icon', '.woff2':'font/woff2', '.map':'application/json',
  '.txt':'text/plain; charset=utf-8', '.sql':'text/plain; charset=utf-8',
};

/* ---------- Limitation de débit simple, par adresse ---------- */
const hits = new Map();
function rateLimited(ip, limit = 60, windowMs = 60000){
  const now = Date.now();
  const entry = hits.get(ip) || { count:0, reset: now + windowMs };
  if (now > entry.reset){ entry.count = 0; entry.reset = now + windowMs; }
  entry.count += 1;
  hits.set(ip, entry);
  if (hits.size > 5000) hits.clear();
  return entry.count > limit;
}

const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
  });
  res.end(payload);
};

function readBody(req){
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY){ reject(new Error('Corps de requête trop volumineux')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try{ resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch{ reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

/* ---------- API ---------- */
async function api(req, res, pathname){
  const ip = req.socket.remoteAddress || 'inconnu';
  if (rateLimited(ip)) return json(res, 429, { error:'rate_limited', detail:'Trop de requêtes, réessayez dans une minute.' });

  if (req.method === 'GET' && pathname === '/api/health'){
    return json(res, 200, {
      ok: true,
      service: 'listing-studio',
      version: 1,
      ai: await ai.status(),
      storage: { configured:false, detail:'Les photos restent dans le navigateur (IndexedDB).' },
      market: { configured:false, detail:'Aucun fournisseur de données de marché branché : les estimations tarifaires sont internes.' },
    });
  }

  if (req.method !== 'POST') return json(res, 405, { error:'method_not_allowed' });

  let body;
  try{ body = await readBody(req); }
  catch(err){ return json(res, 400, { error:'bad_request', detail: err.message }); }

  const handlers = {
    '/api/ai/generate': () => ai.generate(body),
    '/api/ai/rewrite':  () => ai.rewrite(body),
    '/api/ai/chat':     () => ai.chat(body),
    '/api/ai/vision':   () => ai.vision(body),
    '/api/market/pricing': async () => ({
      error:'not_configured',
      detail:'Aucune source de données de marché n’est configurée. Les recommandations restent des estimations internes.',
    }),
  };

  const handler = handlers[pathname];
  if (!handler) return json(res, 404, { error:'not_found' });

  try{
    const out = await handler();
    if (out?.error === 'not_configured') return json(res, 503, out);
    return json(res, 200, out);
  }catch(err){
    // Le message du fournisseur peut contenir des détails : on ne le renvoie
    // au client que sous forme générique, et on journalise côté serveur.
    console.error(`[api] ${pathname} :`, err?.message || err);
    return json(res, 502, { error:'provider_error', detail:'Le service IA n’a pas répondu correctement.' });
  }
}

/* ---------- Fichiers statiques ---------- */
function serveStatic(req, res, pathname){
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.join(ROOT, rel);

  // Empêche toute sortie de l'arborescence servie.
  if (!full.startsWith(ROOT + path.sep) && full !== path.join(ROOT, 'index.html')){
    res.writeHead(403); return res.end('Accès refusé');
  }
  if (rel.startsWith('/server/') && !rel.endsWith('.sql')){
    res.writeHead(403); return res.end('Accès refusé');
  }

  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()){
      // Application à route unique : on retombe sur index.html.
      if (!path.extname(rel)) return serveStatic(req, res, '/index.html');
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
      return res.end('Introuvable');
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options':'nosniff',
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (pathname.startsWith('/api/')) return api(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD'){
    res.writeHead(405); return res.end('Méthode non autorisée');
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, async () => {
  const s = await ai.status();
  console.log(`Listing Studio — http://${HOST}:${PORT}`);
  console.log(`IA : ${s.configured ? `connectée (${s.model})` : 'non configurée — moteur local dans le navigateur'}`);
});

export { server };
