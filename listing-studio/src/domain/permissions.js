/* Rôles et permissions.
 *
 * Une permission est une chaîne `ressource:action`. Les rôles sont des
 * ensembles de permissions, configurables par organisation : la matrice par
 * défaut ci-dessous est un point de départ, pas une contrainte figée.
 *
 * Toute vérification passe par `can()`. Aucune vue ne décide seule de ce qui
 * est autorisé : elle demande.
 */

export const ROLES = ['owner', 'admin', 'manager', 'operator', 'client'];

export const ROLE_LABELS = {
  owner:'Propriétaire', admin:'Administrateur', manager:'Responsable',
  operator:'Opérateur', client:'Client',
};

/** Toutes les permissions du produit, groupées par domaine. */
export const PERMISSIONS = {
  'org:read':'Voir l’organisation',
  'org:update':'Modifier l’organisation',
  'org:members':'Gérer les membres',
  'org:billing':'Gérer la facturation',
  'lead:read':'Voir les prospects',
  'lead:write':'Créer et modifier des prospects',
  'lead:delete':'Supprimer un prospect',
  'client:read':'Voir les clients',
  'client:write':'Créer et modifier des clients',
  'client:delete':'Supprimer un client',
  'dossier:read':'Voir les dossiers',
  'dossier:write':'Créer et modifier des dossiers',
  'dossier:delete':'Supprimer un dossier',
  'dossier:validate':'Valider une optimisation',
  'dossier:publish':'Marquer une annonce publiée',
  'listing:read':'Voir les annonces',
  'listing:write':'Modifier les annonces',
  'analysis:run':'Lancer une analyse',
  'ai:use':'Utiliser les moteurs IA',
  'ai:admin':'Administrer prompts et modèles',
  'report:read':'Voir les rapports',
  'report:generate':'Générer un rapport',
  'performance:read':'Voir les performances',
  'performance:write':'Saisir des performances',
  'transaction:read':'Voir les transactions',
  'transaction:write':'Enregistrer une transaction',
  'commission:read':'Voir les commissions',
  'commission:write':'Modifier une commission',
  'commission:settle':'Marquer une commission payée',
  'contract:read':'Voir les contrats',
  'contract:write':'Créer et modifier un contrat',
  'task:read':'Voir les tâches',
  'task:write':'Créer et modifier des tâches',
  'automation:read':'Voir les automatisations',
  'automation:admin':'Activer ou désactiver une automatisation',
  'audit:read':'Consulter le journal d’audit',
  'admin:access':'Accéder à l’administration',
  'flag:admin':'Gérer les indicateurs de fonctionnalité',
};
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS);

const OPERATOR = [
  'org:read','lead:read','lead:write','client:read','client:write',
  'dossier:read','dossier:write','listing:read','listing:write',
  'analysis:run','ai:use','report:read','report:generate',
  'performance:read','performance:write','task:read','task:write',
  'commission:read','contract:read','automation:read',
];
const MANAGER = [
  ...OPERATOR, 'lead:delete','client:delete','dossier:delete','dossier:validate','dossier:publish',
  'transaction:read','transaction:write','commission:write','contract:write','audit:read',
];
const ADMIN = [...MANAGER, 'org:update','org:members','commission:settle','automation:admin','admin:access','ai:admin','flag:admin'];

/** Le client ne voit que ce qui le concerne, et rien de l'interne. */
const CLIENT = ['dossier:read','listing:read','report:read','performance:read','contract:read'];

export const DEFAULT_MATRIX = {
  owner: ALL_PERMISSIONS,
  admin: ADMIN,
  manager: MANAGER,
  operator: OPERATOR,
  client: CLIENT,
};

/** Permissions effectives d'un membre : matrice du rôle plus surcharges. */
export function permissionsFor(role, overrides = {}){
  const base = new Set(DEFAULT_MATRIX[role] || []);
  (overrides.granted || []).forEach(p => base.add(p));
  (overrides.revoked || []).forEach(p => base.delete(p));
  return base;
}

/**
 * @param {{role:string, overrides?:object}|null} membership
 * @param {string} permission
 */
export function can(membership, permission){
  if (!membership || !membership.role) return false;
  return permissionsFor(membership.role, membership.overrides).has(permission);
}

export function canAll(membership, permissions){
  return permissions.every(p => can(membership, permission_(p)));
}
const permission_ = (p) => p;

/** Erreur typée : les vues l'affichent, l'API la traduit en 403. */
export class PermissionError extends Error {
  constructor(permission){
    super(`Permission requise : ${permission}`);
    this.name = 'PermissionError';
    this.permission = permission;
    this.status = 403;
  }
}

export function assertCan(membership, permission){
  if (!can(membership, permission)) throw new PermissionError(permission);
  return true;
}

/** Le client est un rôle « externe » : il ne voit jamais l'interface interne. */
export const isInternal = (role) => role !== 'client';
