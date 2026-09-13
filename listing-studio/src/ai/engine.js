/* Façade IA — point d'entrée unique pour toute l'application.
 *
 * Deux moteurs interchangeables :
 *   - « local »  : rédaction et analyse déterministes, hors ligne, toujours
 *                  disponibles (c'est le mode démo fonctionnel).
 *   - « serveur » : appelle /api/ai/* quand un fournisseur est configuré côté
 *                  serveur. Les clés restent sur le serveur.
 *
 * Les vues n'appellent jamais un moteur directement : elles passent par ici.
 */

import * as local from './local/generator.js';
import * as server from './server.js';
import { analyzeImage, adjustForCategory } from '../photos/analyzer.js';
import { classify } from '../photos/classify.js';
import { emit } from '../core/events.js';
import { sleep } from '../core/util.js';

let mode = 'local';
let lastError = null;

export async function init({ force = false } = {}){
  const h = await server.probe({ force });
  mode = server.isConfigured() ? 'server' : 'local';
  emit('ai:mode', { mode, health: h });
  return { mode, health: h };
}

export const currentMode = () => mode;
export const health = () => server.status();
export const lastFailure = () => lastError;

export function describeMode(){
  return mode === 'server'
    ? { id:'server', label:'IA connectée', detail:'Les requêtes passent par votre serveur ; la clé d’API y reste stockée.' }
    : { id:'local',  label:'Moteur local', detail:'Rédaction et analyse exécutées dans le navigateur, sans service externe.' };
}

/** Bascule serveur -> local en cas d'échec, sans bloquer l'utilisateur. */
async function withFallback(fn, fallback, label){
  if (mode !== 'server') return fallback();
  try{
    return await fn();
  }catch(err){
    lastError = { at: Date.now(), label, message: err?.message || String(err) };
    emit('ai:fallback', lastError);
    return fallback();
  }
}

/* ---------- Rédaction ---------- */
export async function generateListing(project, opts = {}){
  const min = opts.minDuration ?? 380;   // laisse le temps à l'état de chargement d'exister
  const [content] = await Promise.all([
    withFallback(
      async () => {
        const r = await server.generate({ project, options: opts });
        return { ...r.content, meta: { ...(r.content.meta || {}), engine:'server', model: r.model } };
      },
      () => local.generate(project, opts),
      'generateListing',
    ),
    sleep(min),
  ]);
  return content;
}

export async function regenerate(project, opts = {}){
  const seed = (project.content?.meta?.seed || 0) + 1;
  return generateListing(project, { ...opts, seed });
}

export async function titleVariants(project, count = 6, opts = {}){
  const content = await generateListing(project, { ...opts, seed: (opts.seed || 0) + 7 });
  return content.titles.slice(0, count);
}

/**
 * Réécriture ciblée d'une section. Le moteur local applique des
 * transformations explicites (longueur, ton, cible) plutôt qu'une
 * reformulation libre : le résultat reste vérifiable.
 */
export async function rewriteSection(project, section, instruction, opts = {}){
  return withFallback(
    async () => {
      const r = await server.rewrite({ project, section, instruction, options: opts });
      return r.text;
    },
    () => {
      const content = local.generate(project, { ...opts, seed: (project.content?.meta?.seed || 0) + 3 });
      return content[section] ?? '';
    },
    'rewriteSection',
  );
}

/* ---------- Vision ---------- */
export async function analyzePhoto(img, { filename = '' } = {}){
  const raw = await analyzeImage(img, { filename });
  const detected = classify(raw, filename);
  const analysis = adjustForCategory(raw, detected.category);
  return { ...analysis, category: detected.category, categoryConfidence: detected.confidence, categorySource: detected.source };
}

/* ---------- Détection d'informations manquantes ---------- */
export const missingInfo = (project) => local.detectMissing(project);

export { local };
