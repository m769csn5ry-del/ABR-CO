/* Espace de travail : amorçage, session, permissions, organisations.
   Tout accès au produit part d'ici. */

import * as db from '../core/db.js';
import { can, assertCan, ROLES, DEFAULT_MATRIX } from './permissions.js';
import { DEFINITIONS as FLAG_DEFS } from './flags.js';
import { log } from './audit.js';
import { emit } from '../core/events.js';

export function bootstrap(){
  let user = db.currentUser();
  if (!user){
    user = db.users.all()[0] || db.users.insert({
      name:'Opérateur', email:'', locale:'fr', createdAt:Date.now(),
    });
  }
  let org = db.currentOrg();
  if (!org){
    const owned = db.memberships.all().filter(m => m.userId === user.id);
    org = owned.length ? db.organizations.all().find(o => o.id === owned[0].orgId) : null;
  }
  if (!org){
    org = db.organizations.insert({
      name:'Mon activité', kind:'agency', currency:'EUR', locale:'fr',
      settings:{ brandName:'Listing Studio', paymentTermDays:30, market:'sale' },
    });
    db.memberships.insert({ userId:user.id, orgId:org.id, role:'owner' });
  }
  db.setSession({ userId:user.id, orgId:org.id });
  db.migrateFromV1(org.id);
  seedFlags();
  log('auth.login', { entity:'user', entityId:user.id, note:'Session ouverte' });
  emit('workspace:ready', { user, org });
  return { user, org, membership: db.currentMembership() };
}

function seedFlags(){
  const existing = db.featureFlags.all();
  FLAG_DEFS.forEach(d => {
    if (!existing.some(f => f.key === d.key)) db.featureFlags.insert({ key:d.key, enabled:d.default });
  });
}

export const me = () => db.currentUser();
export const org = () => db.currentOrg();
export const membership = () => db.currentMembership();
export const currency = () => db.currentOrg()?.currency || 'EUR';
export const locale = () => db.currentOrg()?.locale || 'fr';

export const allows = (permission) => can(membership(), permission);
export const require_ = (permission) => assertCan(membership(), permission);

export function organizations(){
  const userId = db.currentUserId();
  const mine = db.memberships.all().filter(m => m.userId === userId);
  return mine.map(m => ({
    ...db.organizations.all().find(o => o.id === m.orgId),
    role:m.role, membershipId:m.id,
  })).filter(o => o.id);
}

export function switchOrg(orgId){
  const m = db.memberships.all().find(x => x.userId === db.currentUserId() && x.orgId === orgId);
  if (!m) throw new Error('Vous n’appartenez pas à cette organisation.');
  db.setSession({ orgId });
  emit('workspace:switch', { orgId });
  return db.currentOrg();
}

export function createOrganization({ name, kind = 'agency', currency = 'EUR', locale = 'fr' }){
  require_('org:update');
  const o = db.organizations.insert({ name, kind, currency, locale, settings:{ paymentTermDays:30 } });
  db.memberships.insert({ userId:db.currentUserId(), orgId:o.id, role:'owner' });
  log('entity.create', { entity:'organization', entityId:o.id, note:name });
  return o;
}

export function updateOrg(patch){
  require_('org:update');
  const o = db.currentOrg();
  const next = db.organizations.update(o.id, patch);
  log('entity.update', { entity:'organization', entityId:o.id, before:o, after:next });
  return next;
}

export function inviteMember({ email, name, role = 'operator' }){
  require_('org:members');
  if (!ROLES.includes(role)) throw new Error('Rôle inconnu.');
  const user = db.users.all().find(u => u.email === email)
    || db.users.insert({ name:name || email, email, locale:locale() });
  const existing = db.memberships.all().find(m => m.userId === user.id && m.orgId === db.currentOrgId());
  if (existing) return db.memberships.update(existing.id, { role });
  const m = db.memberships.insert({ userId:user.id, orgId:db.currentOrgId(), role, invitedAt:Date.now() });
  log('permission.change', { entity:'membership', entityId:m.id, note:`${email} → ${role}` });
  return m;
}

export function members(){
  const orgId = db.currentOrgId();
  return db.memberships.all().filter(m => m.orgId === orgId).map(m => ({
    ...m, user: db.users.all().find(u => u.id === m.userId) || null,
    permissions: DEFAULT_MATRIX[m.role]?.length || 0,
  }));
}

export function setMemberRole(membershipId, role){
  require_('org:members');
  const before = db.memberships.all().find(m => m.id === membershipId);
  const after = db.memberships.update(membershipId, { role });
  log('permission.change', { entity:'membership', entityId:membershipId, before, after });
  return after;
}
