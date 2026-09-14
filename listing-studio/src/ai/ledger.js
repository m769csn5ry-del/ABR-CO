/* Journal des appels IA — traçabilité et coût.
 *
 * Chaque appel est enregistré : tâche, modèle, durée, statut, usage de
 * jetons et coût estimé lorsqu'il est connu. C'est ce qui permet de savoir ce
 * que coûte un dossier, et de repérer un prompt qui dérive.
 *
 * Les entrées et sorties ne sont conservées que tronquées, et seulement si le
 * réglage de diagnostic est actif : un journal ne doit pas devenir un
 * entrepôt de données clients.
 */

import * as db from '../core/db.js';

/** Tarifs indicatifs par million de jetons. À vérifier auprès du fournisseur. */
export const PRICING = {
  'claude-opus-5':{ input:5, output:25 },
  'claude-sonnet-5':{ input:2, output:10 },
  'claude-haiku-4-5':{ input:1, output:5 },
};

export function estimateCost(model, usage){
  const p = PRICING[model];
  if (!p || !usage) return null;
  const inTok = usage.input_tokens ?? usage.inputTokens ?? 0;
  const outTok = usage.output_tokens ?? usage.outputTokens ?? 0;
  if (!inTok && !outTok) return null;
  const cents = ((inTok / 1e6) * p.input + (outTok / 1e6) * p.output) * 100;
  return Math.round(cents * 100) / 100;   // centimes, deux décimales
}

let keepPayloads = false;
export const setDiagnostics = (on) => { keepPayloads = Boolean(on); };
const truncate = (v, n = 600) => {
  if (v === undefined || v === null) return null;
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + `… (${s.length} car.)` : s;
};

/** Enveloppe un appel IA : mesure, journalise, ne masque jamais l'erreur. */
export async function traced({ task, promptId, promptVersion, model, engine, dossierId = null, input = null }, fn){
  const startedAt = Date.now();
  let entry = {
    task, promptId: promptId || null, promptVersion: promptVersion || null,
    model: model || null, engine: engine || 'local', dossierId,
    status:'running', startedAt,
    input: keepPayloads ? truncate(input) : null,
  };
  try{
    const result = await fn();
    const duration = Date.now() - startedAt;
    const usage = result?.usage || null;
    entry = {
      ...entry, status:'ok', duration, finishedAt: Date.now(),
      usage: usage ? { input: usage.input_tokens ?? null, output: usage.output_tokens ?? null } : null,
      costCents: estimateCost(model, usage),
      output: keepPayloads ? truncate(result?.value ?? result) : null,
    };
    safeRecord(entry);
    return result;
  }catch(err){
    entry = { ...entry, status:'error', duration: Date.now() - startedAt, finishedAt: Date.now(),
              error: String(err?.message || err).slice(0, 300) };
    safeRecord(entry);
    throw err;
  }
}

function safeRecord(entry){
  try{ db.aiRequests.insert(entry); }
  catch(err){ console.warn('[ledger] appel non journalisé', err?.message); }
}

/** Agrégats : coût par période, par dossier, par tâche. */
export function summary({ from = 0, to = Date.now(), dossierId = null } = {}){
  const rows = db.aiRequests.where(r =>
    r.startedAt >= from && r.startedAt <= to && (!dossierId || r.dossierId === dossierId));
  const byTask = {}, byModel = {};
  let costCents = 0, errors = 0, totalDuration = 0;
  rows.forEach(r => {
    byTask[r.task] = (byTask[r.task] || 0) + 1;
    if (r.model) byModel[r.model] = (byModel[r.model] || 0) + 1;
    costCents += r.costCents || 0;
    totalDuration += r.duration || 0;
    if (r.status === 'error') errors++;
  });
  return {
    calls: rows.length, errors,
    errorRate: rows.length ? Math.round((errors / rows.length) * 100) : 0,
    costCents: Math.round(costCents * 100) / 100,
    avgDuration: rows.length ? Math.round(totalDuration / rows.length) : 0,
    byTask, byModel,
    costKnown: rows.some(r => r.costCents !== null && r.costCents !== undefined),
  };
}

export const recent = (limit = 50) => db.aiRequests.recent('startedAt', limit);
