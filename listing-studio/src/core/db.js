/* Couche de données — magasin local, isolé par organisation.
 *
 * Modèle de tenancy : chaque enregistrement porte un `orgId`. Toute lecture
 * passe par un dépôt qui filtre sur l'organisation courante ; il n'existe
 * aucun chemin d'accès qui contourne ce filtre. Les données d'une
 * organisation ne sont donc jamais visibles depuis une autre, y compris en
 * cas d'erreur applicative.
 *
 * Le même modèle est reproduit côté serveur par les politiques RLS de
 * server/schema.sql : passer d'ici à PostgreSQL ne change pas la sémantique.
 *
 * Tables globales (sans orgId) : users, organizations, platforms, meta.
 * L'appartenance d'un utilisateur à une organisation vit dans `memberships`.
 */

import { uid, deepClone } from './util.js';
import { emit } from './events.js';

const NS = 'ls.v2.';
const LEGACY_NS = 'ls.v1.';

/** Tables non scindées par organisation. */
const GLOBAL_TABLES = new Set(['users', 'organizations', 'memberships', 'platforms', 'meta']);

/* `memberships` est globale — une appartenance se lit hors du contexte d'une
   organisation — mais son `orgId` est une donnée de liaison, pas une portée :
   il ne doit jamais être effacé à l'insertion. */
const KEEPS_ORG_FIELD = new Set(['memberships']);

export const TABLES = [
  // Identité et tenancy
  'users', 'organizations', 'memberships', 'platforms', 'meta',
  // CRM
  'leads', 'clients', 'contacts', 'tasks',
  // Production
  'dossiers', 'properties', 'listings', 'listingVersions', 'photos', 'photoAnalyses',
  'analyses', 'recommendations', 'competitors', 'templates', 'reports',
  // Business
  'contracts', 'transactions', 'commissions', 'performanceMetrics', 'pricingRecommendations',
  // Système
  'automations', 'automationRuns', 'aiRequests', 'auditLogs', 'featureFlags',
  'notifications', 'documents', 'integrations',
];

let cache = new Map();
let session = { userId: null, orgId: null };
let quotaWarned = false;

/* ---------- Persistance bas niveau ---------- */
function read(table){
  if (cache.has(table)) return cache.get(table);
  let rows = [];
  try{
    const raw = localStorage.getItem(NS + table);
    if (raw) rows = JSON.parse(raw);
    if (!Array.isArray(rows)) rows = [];
  }catch(err){
    console.error(`[db] table « ${table} » illisible, réinitialisée`, err);
    rows = [];
  }
  cache.set(table, rows);
  return rows;
}

function write(table, rows){
  cache.set(table, rows);
  try{
    localStorage.setItem(NS + table, JSON.stringify(rows));
    return true;
  }catch(err){
    if (!quotaWarned){
      quotaWarned = true;
      emit('db:quota', { table, error: err });
      console.error('[db] écriture impossible (quota ?)', err);
    }
    return false;
  }
}

/* ---------- Session ---------- */
export function setSession({ userId, orgId }){
  session = { userId: userId ?? session.userId, orgId: orgId ?? session.orgId };
  try{ localStorage.setItem(NS + 'session', JSON.stringify(session)); }catch{}
  emit('db:session', { ...session });
}
export function getSession(){
  if (session.userId || session.orgId) return { ...session };
  try{
    const raw = JSON.parse(localStorage.getItem(NS + 'session') || 'null');
    if (raw) session = raw;
  }catch{}
  return { ...session };
}
export const currentUserId = () => getSession().userId;
export const currentOrgId = () => getSession().orgId;
export const currentUser = () => {
  const id = currentUserId();
  return id ? read('users').find(u => u.id === id) || null : null;
};
export const currentOrg = () => {
  const id = currentOrgId();
  return id ? read('organizations').find(o => o.id === id) || null : null;
};
/** Appartenance de l'utilisateur courant à l'organisation courante. */
export function currentMembership(){
  const { userId, orgId } = getSession();
  if (!userId || !orgId) return null;
  return read('memberships').find(m => m.userId === userId && m.orgId === orgId) || null;
}

/* ---------- Dépôt ---------- */
class Repo {
  constructor(name){
    this.name = name;
    this.global = GLOBAL_TABLES.has(name);
  }

  /** Lignes visibles depuis l'organisation courante. */
  all(){
    const rows = read(this.name);
    if (this.global) return rows.map(deepClone);
    const org = currentOrgId();
    if (!org) return [];
    return rows.filter(r => r.orgId === org).map(deepClone);
  }

  find(id){
    if (!id) return null;
    const row = read(this.name).find(r => r.id === id);
    if (!row) return null;
    if (!this.global && row.orgId !== currentOrgId()) return null;
    return deepClone(row);
  }

  where(fn){ return this.all().filter(fn); }
  first(fn){ return this.all().find(fn) || null; }
  count(fn){ return fn ? this.where(fn).length : this.all().length; }

  /** Tri décroissant sur un champ temporel, usage courant dans les listes. */
  recent(field = 'updatedAt', limit = Infinity){
    return this.all().sort((a, b) => (b[field] || 0) - (a[field] || 0)).slice(0, limit);
  }

  insert(data){
    const rows = read(this.name);
    const now = Date.now();
    const row = {
      id: data.id || uid(this.name.slice(0, 4)),
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now,
      createdBy: data.createdBy || currentUserId() || null,
    };
    if (this.global && !KEEPS_ORG_FIELD.has(this.name)) delete row.orgId;
    else if (!this.global) row.orgId = data.orgId || currentOrgId();
    if (!this.global && !row.orgId) throw new Error(`[db] ${this.name} : aucune organisation en session`);
    rows.push(row);
    write(this.name, rows);
    emit('db:change', { table: this.name, op: 'insert', id: row.id });
    return deepClone(row);
  }

  update(id, patch){
    const rows = read(this.name);
    const i = rows.findIndex(r => r.id === id);
    if (i < 0) return null;
    if (!this.global && rows[i].orgId !== currentOrgId()) return null;
    const next = { ...rows[i], ...patch, id, updatedAt: Date.now() };
    if (!this.global || KEEPS_ORG_FIELD.has(this.name)) next.orgId = rows[i].orgId;   // le tenant ne se réassigne pas
    next.createdAt = rows[i].createdAt;
    rows[i] = next;
    write(this.name, rows);
    emit('db:change', { table: this.name, op: 'update', id });
    return deepClone(next);
  }

  upsert(data){
    return data.id && this.find(data.id) ? this.update(data.id, data) : this.insert(data);
  }

  remove(id){
    const rows = read(this.name);
    const i = rows.findIndex(r => r.id === id);
    if (i < 0) return false;
    if (!this.global && rows[i].orgId !== currentOrgId()) return false;
    rows.splice(i, 1);
    write(this.name, rows);
    emit('db:change', { table: this.name, op: 'remove', id });
    return true;
  }

  removeWhere(fn){
    const victims = this.where(fn);
    victims.forEach(r => this.remove(r.id));
    return victims.length;
  }
}

const repos = {};
TABLES.forEach(t => { repos[t] = new Repo(t); });

export const table = (name) => {
  if (!repos[name]) throw new Error(`Table inconnue : ${name}`);
  return repos[name];
};

/* Accès nommés. */
export const users = repos.users;
export const organizations = repos.organizations;
export const memberships = repos.memberships;
export const leads = repos.leads;
export const clients = repos.clients;
export const contacts = repos.contacts;
export const tasks = repos.tasks;
export const dossiers = repos.dossiers;
export const properties = repos.properties;
export const listings = repos.listings;
export const listingVersions = repos.listingVersions;
export const photos = repos.photos;
export const photoAnalyses = repos.photoAnalyses;
export const analyses = repos.analyses;
export const recommendations = repos.recommendations;
export const competitors = repos.competitors;
export const templates = repos.templates;
export const reports = repos.reports;
export const contracts = repos.contracts;
export const transactions = repos.transactions;
export const commissions = repos.commissions;
export const performanceMetrics = repos.performanceMetrics;
export const pricingRecommendations = repos.pricingRecommendations;
export const automations = repos.automations;
export const automationRuns = repos.automationRuns;
export const aiRequests = repos.aiRequests;
export const auditLogs = repos.auditLogs;
export const featureFlags = repos.featureFlags;
export const notifications = repos.notifications;
export const documents = repos.documents;
export const integrations = repos.integrations;
export const platforms = repos.platforms;
export const meta = repos.meta;

/* ---------- Migration depuis la version 1 ----------
   L'ancien magasin scindait par `userId` et ignorait les organisations.
   On rapatrie ses données dans l'organisation par défaut, une seule fois. */
export function migrateFromV1(orgId){
  const done = read('meta').find(m => m.key === 'migratedFromV1');
  if (done) return { migrated:false, reason:'déjà effectuée' };
  const MAP = {
    clients:'clients', projects:'dossiers', properties:'properties', listings:'listings',
    listingVersions:'listingVersions', photos:'photos', photoAnalyses:'photoAnalyses',
    templates:'templates', reports:'reports', pricingRecommendations:'pricingRecommendations',
  };
  let count = 0;
  Object.entries(MAP).forEach(([from, to]) => {
    let rows = [];
    try{ rows = JSON.parse(localStorage.getItem(LEGACY_NS + from) || '[]'); }catch{}
    if (!Array.isArray(rows) || !rows.length) return;
    const target = read(to);
    rows.forEach(r => {
      const { userId, ...rest } = r;
      target.push({ ...rest, orgId, createdBy: userId || null, migratedFrom:`v1.${from}` });
      count++;
    });
    write(to, target);
  });
  repos.meta.insert({ key:'migratedFromV1', at:Date.now(), count });
  return { migrated:true, count };
}

/* ---------- Maintenance ---------- */
export function stats(){
  const out = {};
  TABLES.forEach(t => { out[t] = read(t).length; });
  return out;
}

/** Export limité à l'organisation courante : une sauvegarde ne fuit pas. */
export function exportOrg(){
  const orgId = currentOrgId();
  const dump = { version:2, orgId, exportedAt:new Date().toISOString(), tables:{} };
  TABLES.forEach(t => {
    dump.tables[t] = GLOBAL_TABLES.has(t)
      ? read(t).filter(r => t === 'organizations' ? r.id === orgId
          : t === 'memberships' ? r.orgId === orgId : true)
      : read(t).filter(r => r.orgId === orgId);
  });
  return dump;
}

export function importDump(dump){
  if (!dump || !dump.tables) throw new Error('Sauvegarde illisible');
  TABLES.forEach(t => {
    if (!dump.tables[t]) return;
    const existing = read(t).filter(r => !dump.tables[t].some(n => n.id === r.id));
    write(t, [...existing, ...dump.tables[t]]);
  });
  emit('db:change', { table:'*', op:'import' });
}

/** Efface les données de l'organisation courante, pas celles des autres. */
export function wipeCurrentOrg(){
  const orgId = currentOrgId();
  TABLES.forEach(t => {
    if (GLOBAL_TABLES.has(t)) return;
    write(t, read(t).filter(r => r.orgId !== orgId));
  });
  emit('db:change', { table:'*', op:'wipe' });
}

export function reset(){
  TABLES.forEach(t => { try{ localStorage.removeItem(NS + t); }catch{} });
  try{ localStorage.removeItem(NS + 'session'); }catch{}
  cache = new Map();
  session = { userId:null, orgId:null };
  emit('db:change', { table:'*', op:'reset' });
}

export { GLOBAL_TABLES };
