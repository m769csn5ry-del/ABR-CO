/* Moteur d'automatisations.
 *
 * Une règle ne s'exécute que si son état de départ est vrai : elle est donc
 * rejouable sans effet de bord. Chaque exécution laisse une trace datée avec
 * ce qu'elle a fait, et sur quoi.
 *
 * Ce que le moteur ne fera jamais, quelle que soit la configuration :
 * valider une optimisation, publier une annonce, rendre une commission
 * exigible ou la marquer payée. Ces quatre actions engagent l'entreprise
 * devant un client : elles appartiennent à un humain.
 */

import * as db from '../core/db.js';
import * as dossiers from './dossiers.js';
import * as commission from './commission.js';
import { allows } from './workspace.js';
import { leadStatus } from './crm.js';
import { isEnabled } from './flags.js';
import { log } from './audit.js';
import { emit } from '../core/events.js';
import { followUpDraft } from './outreach.js';

const DAY = 86400000;

/** Les quatre décisions qui restent humaines, affichées telles quelles. */
export const NEVER_AUTOMATED = [
  'Valider une version optimisée avant publication.',
  'Déclarer une annonce publiée.',
  'Rendre une commission exigible.',
  'Marquer une commission encaissée.',
];

export const RULES = [
  {
    id:'analyze_on_import',
    label:'Analyser dès qu’une annonce est importée',
    help:'Le score et les problèmes sont calculés sans attendre. Aucune décision n’en découle automatiquement.',
    permission:'analysis:run',
    targets:() => dossiers.list(d => d.listing?.title && !d.analysis),
    describe:(d) => `Analyse de « ${d.name} »`,
    run: async (d) => {
      const a = await dossiers.runAnalysis(d.id);
      return `${d.name} : ${a.score.total} / 100, ${a.problems.length} problème(s)`;
    },
  },
  {
    id:'draft_on_analysis',
    label:'Préparer la version optimisée après l’analyse',
    help:'Produit un brouillon à partir de la fiche du bien. Il reste en attente de validation humaine : rien n’est publié.',
    permission:'dossier:write',
    targets:() => dossiers.list(d => d.analysis && !d.optimization),
    describe:(d) => `Brouillon d’optimisation pour « ${d.name} »`,
    run: async (d) => {
      const r = await dossiers.optimize(d.id);
      const gain = r.score.total - (d.analysis?.score?.total ?? 0);
      const missing = r.content?.missing?.length || 0;
      /* Un faible gain n'est pas un défaut du moteur : sans fiche renseignée,
         il n'y a rien à écrire de plus. Le dire évite de chercher un bogue. */
      return `${d.name} : version ${r.version.number}, ${r.score.total} / 100 (${gain >= 0 ? '+' : ''}${gain})`
        + (missing ? ` — ${missing} information(s) manquante(s) limitent le gain` : '');
    },
  },
  {
    id:'commission_on_transaction',
    label:'Calculer la commission dès qu’une transaction est saisie',
    help:'Applique le contrat actif du client et enregistre la trace. La commission reste au statut « estimée » : la rendre exigible est une décision humaine.',
    permission:'commission:read',
    targets:() => db.transactions.where(t => !db.commissions.first(c => c.transactionId === t.id)),
    describe:(t) => `Commission de la transaction ${t.reference || t.id}`,
    run: async (t) => {
      const r = dossiers.computeCommission(t.dossierId, t.id);
      if (!r.ok) throw new Error(r.problems[0]?.message || 'Calcul impossible.');
      return `${db.dossiers.find(t.dossierId)?.name || 'dossier'} : ${r.description}`;
    },
  },
  {
    id:'commission_overdue',
    label:'Signaler les commissions dépassant leur échéance',
    help:'Fait passer en retard une commission exigible dont la date est franchie. Aucun montant n’est modifié.',
    permission:'commission:write',
    targets:() => db.commissions.where(c => c.status === 'due' && c.dueAt && c.dueAt < Date.now()),
    describe:(c) => `Commission échue depuis le ${new Date(c.dueAt).toLocaleDateString('fr-FR')}`,
    run: async (c) => {
      dossiers.setCommissionStatus(c.id, 'overdue', { note:'Échéance dépassée (automatique)' });
      const days = Math.floor((Date.now() - c.dueAt) / DAY);
      return `Retard de ${days} jour(s) sur ${db.clients.find(c.clientId)?.name || 'un client'}`;
    },
  },
  {
    id:'close_settled',
    label:'Clôturer les dossiers réglés',
    help:'Un dossier en suivi dont la commission est encaissée n’a plus d’action en attente.',
    permission:'dossier:write',
    targets:() => dossiers.list(d => d.stage === 'tracking'
      && db.commissions.where(c => c.dossierId === d.id).some(c => c.status === 'paid')),
    describe:(d) => `Clôture de « ${d.name} »`,
    run: async (d) => {
      dossiers.moveTo(d.id, 'closed', 'Commission encaissée (automatique)');
      return `${d.name} : dossier clôturé`;
    },
  },
  {
    id:'followup_drafts',
    label:'Préparer les messages de relance',
    help:'Rédige le message des prospects sans nouvelle depuis le délai de leur statut. Le message est enregistré comme brouillon : aucun envoi n’est effectué, aucun service de messagerie n’est connecté.',
    permission:'lead:write',
    targets:() => db.leads.where(l => {
      const st = leadStatus(l.status);
      if (!st.staleAfterDays) return false;
      const last = l.lastContactAt || l.updatedAt || l.createdAt;
      if (Date.now() - last < st.staleAfterDays * DAY) return false;
      return !l.draft || l.draftAt < last;   // pas de brouillon, ou brouillon périmé
    }),
    describe:(l) => `Brouillon de relance pour ${l.name}`,
    run: async (l) => {
      const draft = followUpDraft(l);
      db.leads.update(l.id, { draft: draft.body, draftSubject: draft.subject, draftAt: Date.now() });
      return `${l.name} : relance n° ${draft.attempt} rédigée`;
    },
  },
];

export const rule = (id) => RULES.find(r => r.id === id) || null;

/* ---------- État ---------- */
/** L'état d'activation vit en base : il survit au rechargement et se journalise. */
export function all(){
  const stored = db.automations.all();
  return RULES.map(r => {
    const row = stored.find(a => a.key === r.id);
    return {
      ...r,
      rowId: row?.id || null,
      enabled: row ? row.enabled : true,
      lastRunAt: row?.lastRunAt || null,
      runCount: row?.runCount || 0,
    };
  });
}

export const isOn = (id) => all().find(a => a.id === id)?.enabled ?? true;

export function setEnabled(id, enabled){
  const row = db.automations.first(a => a.key === id);
  const saved = row ? db.automations.update(row.id, { enabled })
                    : db.automations.insert({ key:id, enabled });
  log('entity.update', { entity:'automation', entityId:saved.id,
    note:`${rule(id)?.label || id} : ${enabled ? 'activée' : 'désactivée'}` });
  emit('automation:change', { id, enabled });
  return saved;
}

function touch(id, count){
  const row = db.automations.first(a => a.key === id);
  const patch = { lastRunAt: Date.now(), runCount: (row?.runCount || 0) + count };
  return row ? db.automations.update(row.id, patch)
             : db.automations.insert({ key:id, enabled:true, ...patch });
}

/* ---------- Exécution ---------- */
/* Une seule exécution à la fois, manuelle ou déclenchée. Deux passages
   simultanés liraient les mêmes cibles avant que l'un n'écrive : le dossier
   recevrait deux versions optimisées identiques. */
let chain = Promise.resolve();
const serial = (fn) => {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
};

/**
 * Exécute une règle sur toutes ses cibles.
 * @param {string} id
 * @param {{ manual?:boolean, limit?:number }} opts
 * @returns {Promise<{id,label,done,skipped,failed,details,reason?}>}
 */
export function runRule(id, opts = {}){
  return serial(() => runRuleNow(id, opts));
}

async function runRuleNow(id, { manual = false, limit = 25 } = {}){
  const r = rule(id);
  if (!r) throw new Error(`Automatisation inconnue : ${id}`);

  const base = { id, label:r.label, done:0, skipped:0, failed:0, details:[] };

  if (!isEnabled('automations'))
    return { ...base, reason:'Les automatisations sont désactivées dans les options de l’organisation.' };
  if (!manual && !isOn(id))
    return { ...base, reason:'Règle désactivée.' };
  if (!allows(r.permission))
    return { ...base, reason:`Votre rôle ne porte pas l’autorisation « ${r.permission} ».` };

  let targets = [];
  try{ targets = r.targets() || []; }
  catch(err){ return { ...base, reason:`Cibles illisibles : ${err.message}` }; }

  if (!targets.length) return { ...base, reason:'Rien à faire.' };

  for (const t of targets.slice(0, limit)){
    try{
      const detail = await r.run(t);
      base.done++;
      base.details.push({ ok:true, text: detail });
    }catch(err){
      base.failed++;
      base.details.push({ ok:false, text:`${r.describe(t)} : ${err.message}` });
    }
  }
  base.skipped = Math.max(0, targets.length - limit);

  if (base.done || base.failed){
    db.automationRuns.insert({
      key:id, label:r.label, trigger: manual ? 'manuel' : 'automatique',
      done:base.done, failed:base.failed, skipped:base.skipped,
      details:base.details.slice(0, 20), at: Date.now(),
    });
    touch(id, base.done);
    emit('automation:run', { id, ...base });
  }
  return base;
}

/** Exécute toutes les règles actives, dans l'ordre déclaré. */
export function runAll({ manual = false } = {}){
  return serial(async () => {
    const out = [];
    for (const r of RULES){
      if (!manual && !isOn(r.id)) continue;
      out.push(await runRuleNow(r.id, { manual }));
    }
    return out;
  });
}

export const runs = (limit = 50) => db.automationRuns.recent('at', limit);

/** Aperçu sans exécution : ce que le moteur ferait maintenant. */
export function preview(){
  return all().map(a => {
    let count = 0, reason = null;
    if (!allows(a.permission)) reason = 'autorisation manquante';
    else { try{ count = (a.targets() || []).length; }catch(err){ reason = err.message; } }
    return { id:a.id, label:a.label, enabled:a.enabled, count, reason };
  });
}

/* ---------- Déclenchement ---------- */
let pending = null;

/** Déclenchement groupé : une rafale de modifications ne lance qu'un passage. */
export function schedule({ delay = 400 } = {}){
  if (!isEnabled('automations')) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    runAll({ manual:false })
      .catch(err => console.warn('[automatisations] passage interrompu', err?.message));
  }, delay);
}
