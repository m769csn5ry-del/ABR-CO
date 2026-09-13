/* Couche « base de données » côté client.
 *
 * Les tables reprennent le schéma serveur (server/schema.sql) : Users, Clients,
 * Properties, Listings, ListingVersions, Photos, PhotoAnalyses, Platforms,
 * Templates, Reports, Projects, PricingRecommendations.
 *
 * Isolation : chaque enregistrement porte un `userId`. Toute lecture passe par
 * le dépôt, qui filtre sur l'utilisateur courant — un utilisateur ne voit
 * jamais les données d'un autre espace de travail. Côté serveur, la même règle
 * est appliquée par les politiques RLS du schéma.
 */

import { uid, deepClone } from './util.js';
import { emit } from './events.js';

const NS = 'ls.v1.';
const GLOBAL_TABLES = new Set(['users', 'platforms', 'meta']);

export const TABLES = [
  'users', 'clients', 'properties', 'listings', 'listingVersions',
  'photos', 'photoAnalyses', 'platforms', 'templates', 'reports',
  'projects', 'pricingRecommendations', 'meta',
];

let cache = new Map();
let currentUserId = null;
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
export function setCurrentUser(id){
  currentUserId = id;
  try{ localStorage.setItem(NS + 'session', id || ''); }catch{}
  emit('db:user', id);
}
export function getCurrentUserId(){
  if (currentUserId) return currentUserId;
  try{ currentUserId = localStorage.getItem(NS + 'session') || null; }catch{}
  return currentUserId;
}
export function currentUser(){
  const id = getCurrentUserId();
  return id ? read('users').find(u => u.id === id) || null : null;
}

/* ---------- Dépôt générique ---------- */
class Repo {
  constructor(name){
    this.name = name;
    this.global = GLOBAL_TABLES.has(name);
  }

  /** Enregistrements visibles par l'utilisateur courant. */
  all(){
    const rows = read(this.name);
    if (this.global) return rows.map(deepClone);
    const uidCur = getCurrentUserId();
    return rows.filter(r => r.userId === uidCur || r.shared === true).map(deepClone);
  }

  find(id){
    if (!id) return null;
    const row = read(this.name).find(r => r.id === id);
    if (!row) return null;
    if (!this.global && row.userId && row.userId !== getCurrentUserId() && row.shared !== true) return null;
    return deepClone(row);
  }

  where(fn){ return this.all().filter(fn); }
  first(fn){ return this.all().find(fn) || null; }
  count(fn){ return fn ? this.where(fn).length : this.all().length; }

  insert(data){
    const rows = read(this.name);
    const now = Date.now();
    const row = {
      id: data.id || uid(this.name.slice(0, 4)),
      userId: this.global ? undefined : (data.userId || getCurrentUserId()),
      createdAt: data.createdAt || now,
      updatedAt: now,
      ...data,
    };
    if (this.global) delete row.userId;
    rows.push(row);
    write(this.name, rows);
    emit('db:change', { table: this.name, op: 'insert', id: row.id });
    return deepClone(row);
  }

  update(id, patch){
    const rows = read(this.name);
    const i = rows.findIndex(r => r.id === id);
    if (i < 0) return null;
    if (!this.global && rows[i].userId && rows[i].userId !== getCurrentUserId()) return null;
    const next = { ...rows[i], ...patch, id, updatedAt: Date.now() };
    if (!this.global) next.userId = rows[i].userId;
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
    if (!this.global && rows[i].userId && rows[i].userId !== getCurrentUserId()) return false;
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

/* Accès nommés, plus lisibles à l'usage. */
export const users = repos.users;
export const clients = repos.clients;
export const properties = repos.properties;
export const listings = repos.listings;
export const listingVersions = repos.listingVersions;
export const photos = repos.photos;
export const photoAnalyses = repos.photoAnalyses;
export const platforms = repos.platforms;
export const templates = repos.templates;
export const reports = repos.reports;
export const projects = repos.projects;
export const pricingRecommendations = repos.pricingRecommendations;
export const meta = repos.meta;

/* ---------- Maintenance ---------- */
export function stats(){
  const out = {};
  TABLES.forEach(t => { out[t] = read(t).length; });
  return out;
}

export function exportAll(){
  const dump = { version: 1, exportedAt: new Date().toISOString(), tables: {} };
  TABLES.forEach(t => { dump.tables[t] = read(t); });
  return dump;
}

export function importAll(dump){
  if (!dump || !dump.tables) throw new Error('Sauvegarde illisible');
  TABLES.forEach(t => { if (dump.tables[t]) write(t, dump.tables[t]); });
  emit('db:change', { table: '*', op: 'import' });
}

/** Efface l'espace de travail de l'utilisateur courant (pas les autres). */
export function wipeCurrentUser(){
  const id = getCurrentUserId();
  TABLES.forEach(t => {
    if (GLOBAL_TABLES.has(t)) return;
    write(t, read(t).filter(r => r.userId !== id));
  });
  emit('db:change', { table: '*', op: 'wipe' });
}

export function reset(){
  TABLES.forEach(t => { try{ localStorage.removeItem(NS + t); }catch{} });
  try{ localStorage.removeItem(NS + 'session'); }catch{}
  cache = new Map();
  currentUserId = null;
  emit('db:change', { table: '*', op: 'reset' });
}
