/* Service des dossiers d'optimisation — l'orchestration du produit.
 *
 * Chaque opération : vérifie la permission, agit, journalise, fait avancer le
 * workflow quand c'est justifié. Aucune vue ne manipule directement la base.
 */

import * as db from '../core/db.js';
import { DOSSIER_WORKFLOW, blockers, nextAction } from '../workflow/dossier.js';
import { analyze } from '../analysis/index.js';
import { generate as generateListing } from '../analysis/rewrite.js';
import { parseListingText, referenceUrl } from './listingImport.js';
import * as commission from './commission.js';
import * as M from './money.js';
import { compare as comparePerformance, attributionChain, createReading } from './performance.js';
import { log } from './audit.js';
import { require_, currency as orgCurrency, org } from './workspace.js';
import { traced } from '../ai/ledger.js';
import { emit } from '../core/events.js';

/* ---------- Cycle de vie ---------- */
export function create({ name, clientId = null, market = 'sale', property = {} }){
  require_('dossier:write');
  const d = db.dossiers.insert({
    name: name || 'Nouveau dossier',
    clientId, market, stage:'intake', stageEnteredAt:Date.now(), stageHistory:[],
    property:{ propertyType:'apartment', ...property },
    listing:null, analysis:null, optimization:null,
    publishedAt:null, currency: orgCurrency(),
  });
  log('entity.create', { entity:'dossier', entityId:d.id, note:d.name });
  emit('dossier:change', { id:d.id });
  return d;
}

export const get = (id) => db.dossiers.find(id);
export const list = (filter = () => true) => db.dossiers.all().filter(filter).sort((a, b) => b.updatedAt - a.updatedAt);
export const byStage = () => {
  const out = {};
  DOSSIER_WORKFLOW.stages.forEach(s => { out[s.id] = []; });
  list().forEach(d => { (out[d.stage] = out[d.stage] || []).push(d); });
  return out;
};

export function update(id, patch, note = ''){
  require_('dossier:write');
  const before = db.dossiers.find(id);
  const after = db.dossiers.update(id, patch);
  log('entity.update', { entity:'dossier', entityId:id, before:{ stage:before?.stage }, after:{ stage:after?.stage }, note });
  emit('dossier:change', { id });
  return after;
}

export function remove(id){
  require_('dossier:delete');
  db.listingVersions.removeWhere(v => v.dossierId === id);
  db.performanceMetrics.removeWhere(m => m.dossierId === id);
  db.photos.removeWhere(p => p.dossierId === id);
  const ok = db.dossiers.remove(id);
  log('entity.delete', { entity:'dossier', entityId:id });
  emit('dossier:change', { id });
  return ok;
}

/** Avance le dossier, en refusant explicitement un saut d'étape. */
export function moveTo(id, stage, note = ''){
  require_('dossier:write');
  const d = db.dossiers.find(id);
  const next = DOSSIER_WORKFLOW.transition(d, stage, { actor: db.currentUserId(), note });
  const saved = db.dossiers.update(id, {
    stage: next.stage, stageEnteredAt: next.stageEnteredAt, stageHistory: next.stageHistory,
  });
  log('dossier.stage', { entity:'dossier', entityId:id, note:`${d.stage} → ${stage}` });
  emit('dossier:change', { id });
  return saved;
}

/* Avancement automatique après une action. Si les conditions ne sont pas
   réunies, on n'échoue pas — mais on inscrit la raison sur le dossier, pour
   que l'opérateur la lise au lieu de se demander pourquoi rien n'a bougé. */
function tryAdvance(id, stage, note){
  try{
    moveTo(id, stage, note);
    db.dossiers.update(id, { stageBlockers: [] });
    return true;
  }catch(err){
    const reasons = err.reasons || [err.message];
    db.dossiers.update(id, { stageBlockers: reasons });
    emit('dossier:blocked', { id, stage, reasons });
    return false;
  }
}

export const status = (id) => {
  const d = db.dossiers.find(id);
  if (!d) return null;
  return {
    stage:d.stage, label: DOSSIER_WORKFLOW.stage(d.stage)?.label,
    progress: DOSSIER_WORKFLOW.progress(d.stage),
    blockers: blockers(d), recordedBlockers: d.stageBlockers || [], nextAction: nextAction(d),
    nextStages: DOSSIER_WORKFLOW.nextStages(d.stage),
  };
};

/* ---------- Import ---------- */
export function importListing(id, { raw = '', url = '', manual = null }){
  require_('listing:write');
  const d = db.dossiers.find(id);
  if (!d) throw new Error('Dossier introuvable.');

  const parsed = raw ? parseListingText(raw) : null;
  const listing = {
    title: manual?.title ?? parsed?.title ?? d.listing?.title ?? '',
    description: manual?.description ?? parsed?.description ?? d.listing?.description ?? '',
    raw: raw || d.listing?.raw || '',
    reference: url ? referenceUrl(url) : d.listing?.reference || null,
    importedAt: Date.now(),
    detection: parsed ? { detected:parsed.detected, missing:parsed.missing, confidence:parsed.confidence } : null,
  };
  const property = { ...d.property, ...(parsed?.facts || {}), ...(manual?.property || {}) };

  const saved = db.dossiers.update(id, { listing, property, original: d.original || { listing, capturedAt: Date.now() } });
  log('entity.update', { entity:'dossier', entityId:id, note:'Annonce importée' });
  if (saved.stage === 'intake') tryAdvance(id, 'imported', 'Import de l’annonce');
  emit('dossier:change', { id });
  return db.dossiers.find(id);
}

/* ---------- Analyse ---------- */
export async function runAnalysis(id){
  require_('analysis:run');
  const d = db.dossiers.find(id);
  if (!d) throw new Error('Dossier introuvable.');

  const photos = db.photos.where(p => p.dossierId === id);
  const analyses = db.photoAnalyses.where(a => a.dossierId === id);
  const scores = analyses.map(a => a.scores?.score).filter(n => typeof n === 'number');
  const context = {
    market: d.market,
    professional: org()?.kind !== 'owner',
    photoCount: photos.length || null,
    photoAverage: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
    photoCoverage: null,
    weakPhotos: scores.filter(s => s < 55).length,
    hasTarget: Boolean(d.positioning?.target),
    hasAngle: Boolean(d.positioning?.angle),
  };

  const result = await traced(
    { task:'listing_analysis', engine:'local-rules', dossierId:id },
    async () => ({ value: analyze(d.listing || {}, context) }),
  );
  const analysis = result.value;

  db.analyses.insert({ dossierId:id, score:analysis.score, problems:analysis.problems, context });
  const saved = db.dossiers.update(id, { analysis, analyzedAt: Date.now() });
  log('entity.update', { entity:'dossier', entityId:id, note:`Analyse : ${analysis.score.total}/100` });
  if (saved.stage === 'imported') tryAdvance(id, 'analyzed', 'Analyse exécutée');
  emit('dossier:change', { id });
  return analysis;
}

/* ---------- Optimisation ---------- */
export async function optimize(id, { angle = null } = {}){
  require_('dossier:write');
  const d = db.dossiers.find(id);
  if (!d?.analysis) throw new Error('Lancez l’analyse avant d’optimiser.');

  const produced = await traced(
    { task:'listing_rewrite', promptId:'listing_rewrite', engine:'local-rules', dossierId:id },
    async () => ({ value: generateListing(d.property, { market:d.market, angle }) }),
  );
  const optimized = produced.value;

  /* Le texte publié comprend l'invitation à contacter : l'analyser sans elle
     sous-estimerait la version optimisée sur l'axe Conversion. */
  const after = analyze({ title:optimized.title, description:`${optimized.description}\n\n${optimized.cta}` }, {
    market:d.market, professional:true,
    photoCount:d.analysis.score.axes.find(a => a.id === 'photos')?.points ? null : null,
    hasTarget:Boolean(d.positioning?.target), hasAngle:Boolean(angle || d.positioning?.angle),
  });

  const versionNumber = db.listingVersions.where(v => v.dossierId === id).length + 1;
  const version = db.listingVersions.insert({
    dossierId:id, number:versionNumber, status:'to_validate',
    content:optimized, score:after.score,
    changeSummary: summarizeChanges(d.analysis, after),
    engine:optimized.engine,
  });

  const saved = db.dossiers.update(id, {
    optimization:{ version:version.id, number:versionNumber, content:optimized, score:after.score },
  });
  log('entity.update', { entity:'dossier', entityId:id, note:`Version ${versionNumber} générée (${after.score.total}/100)` });
  if (saved.stage === 'analyzed') tryAdvance(id, 'optimized', 'Version optimisée générée');
  emit('dossier:change', { id });
  return { version, score:after.score, content:optimized };
}

function summarizeChanges(before, after){
  const out = [];
  const b = before.score, a = after.score;
  a.axes.forEach(axis => {
    const prev = b.axes.find(x => x.id === axis.id);
    if (prev && axis.points > prev.points)
      out.push(`${axis.label} : ${prev.points} → ${axis.points} points`);
  });
  const solved = before.problems.filter(p => !after.problems.some(q => q.id === p.id));
  solved.slice(0, 6).forEach(p => out.push(`Corrigé : ${p.explanation}`));
  return out;
}

export const versions = (id) => db.listingVersions.where(v => v.dossierId === id).sort((a, b) => b.number - a.number);

/** Validation humaine — obligatoire avant publication. */
export function validateVersion(dossierId, versionId, { approved = true, note = '' } = {}){
  require_('dossier:validate');
  const v = db.listingVersions.find(versionId);
  if (!v || v.dossierId !== dossierId) throw new Error('Version introuvable.');
  const updated = db.listingVersions.update(versionId, {
    status: approved ? 'validated' : 'rejected',
    validatedBy: db.currentUserId(), validatedAt: Date.now(), validationNote: note,
  });
  log('dossier.validate', { entity:'dossier', entityId:dossierId, note:`Version ${v.number} ${approved ? 'validée' : 'refusée'}. ${note}` });
  if (approved) tryAdvance(dossierId, 'validated', 'Optimisation validée');
  emit('dossier:change', { id:dossierId });
  return updated;
}

export function markPublished(dossierId, { platform = '', at = Date.now() } = {}){
  require_('dossier:publish');
  const v = versions(dossierId).find(x => x.status === 'validated');
  if (!v) throw new Error('Aucune version validée : la publication exige une validation humaine.');
  db.listingVersions.update(v.id, { status:'published', publishedAt:at, platform });
  db.dossiers.update(dossierId, { publishedAt:at, publishedPlatform:platform });
  log('dossier.publish', { entity:'dossier', entityId:dossierId, note:`Publiée sur ${platform || 'plateforme non précisée'}` });
  tryAdvance(dossierId, 'published', 'Annonce publiée');
  emit('dossier:change', { id:dossierId });
  return db.dossiers.find(dossierId);
}

/* ---------- Performances ---------- */
export function addReading(dossierId, { phase, from, to, values, source = 'manual' }){
  require_('performance:write');
  const reading = db.performanceMetrics.insert(createReading({ dossierId, phase, from, to, values, source }));
  log('entity.create', { entity:'performance', entityId:reading.id, note:`${phase} sur ${new Date(from).toLocaleDateString('fr-FR')}` });
  const d = db.dossiers.find(dossierId);
  if (d?.stage === 'published' && phase === 'after') tryAdvance(dossierId, 'tracking', 'Premières performances saisies');
  emit('dossier:change', { id:dossierId });
  return reading;
}
export const readings = (dossierId) => db.performanceMetrics.where(m => m.dossierId === dossierId);
export const performance = (dossierId) => comparePerformance(readings(dossierId));

/* ---------- Transaction et commission ---------- */
export function recordTransaction(dossierId, { amount, agencyCommission = null, type = 'sale', closedAt = Date.now(), reference = '' }){
  require_('transaction:write');
  const d = db.dossiers.find(dossierId);
  const cur = d?.currency || orgCurrency();
  const tx = db.transactions.insert({
    dossierId, clientId:d?.clientId || null, type, reference,
    amount: M.serialize(M.money(amount, cur)),
    agencyCommission: agencyCommission === null ? null : M.serialize(M.money(agencyCommission, cur)),
    closedAt, currency:cur,
  });
  log('entity.create', { entity:'transaction', entityId:tx.id, note:`${M.format(M.deserialize(tx.amount))}` });
  emit('dossier:change', { id:dossierId });
  return tx;
}

/** Calcule la commission due selon le contrat du client. Jamais par l'IA. */
export function computeCommission(dossierId, transactionId){
  require_('commission:read');
  const d = db.dossiers.find(dossierId);
  const tx = db.transactions.find(transactionId);
  if (!tx) throw new Error('Transaction introuvable.');
  const contract = d?.clientId ? db.contracts.first(c => c.clientId === d.clientId && c.status === 'active') : null;
  if (!contract) return { ok:false, problems:[{ field:'contract', message:'Aucun contrat actif pour ce client : la commission ne peut pas être calculée.' }] };

  const result = commission.compute(contract.terms, {
    amount: M.deserialize(tx.amount),
    agencyCommission: M.deserialize(tx.agencyCommission),
    currency: tx.currency,
  });
  if (!result.ok) return result;

  const existing = db.commissions.first(c => c.transactionId === transactionId);
  const payload = {
    dossierId, transactionId, clientId:d?.clientId || null, contractId:contract.id,
    amount: M.serialize(result.amount), vat: M.serialize(result.vat), gross: M.serialize(result.gross),
    currency: result.currency, model: result.model, modelLabel: result.modelLabel,
    trace: result.trace, inputs: result.inputs, engineVersion: result.engineVersion,
    status: existing?.status && existing.status !== 'pending' ? existing.status : 'estimated',
    dueAt: commission.dueDate(tx.closedAt, contract.paymentTermDays ?? org()?.settings?.paymentTermDays ?? 30),
    computedAt: Date.now(),
  };
  const saved = existing ? db.commissions.update(existing.id, payload) : db.commissions.insert(payload);
  log('commission.compute', { entity:'commission', entityId:saved.id,
    note:`${M.format(result.amount)} — ${result.modelLabel}` });
  emit('dossier:change', { id:dossierId });
  return { ...result, commission:saved };
}

export function setCommissionStatus(commissionId, status, { note = '', paidAt = null } = {}){
  require_(status === 'paid' ? 'commission:settle' : 'commission:write');
  const c = db.commissions.find(commissionId);
  if (!c) throw new Error('Commission introuvable.');
  if (!commission.canTransition(c.status, status))
    throw new Error(`Passage de « ${commission.STATUS_LABELS[c.status]} » à « ${commission.STATUS_LABELS[status]} » non autorisé.`);
  const saved = db.commissions.update(commissionId, {
    status, statusNote:note, paidAt: status === 'paid' ? (paidAt || Date.now()) : c.paidAt || null,
  });
  log('commission.status', { entity:'commission', entityId:commissionId, note:`${c.status} → ${status}. ${note}` });
  emit('dossier:change', { id:c.dossierId });
  return saved;
}

export const commissionsOf = (dossierId) => db.commissions.where(c => c.dossierId === dossierId);

/** Chaîne d'attribution complète : ce qui relie l'optimisation au résultat. */
export function attribution(dossierId){
  const d = db.dossiers.find(dossierId);
  const tx = db.transactions.where(t => t.dossierId === dossierId)[0] || null;
  const com = db.commissions.where(c => c.dossierId === dossierId)[0] || null;
  return attributionChain({ dossier:d, versions:versions(dossierId), readings:readings(dossierId), transaction:tx, commission:com });
}
