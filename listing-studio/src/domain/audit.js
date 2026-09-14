/* Journal d'audit — qui a fait quoi, quand, sur quoi.
   Les actions financières et les validations y sont obligatoirement tracées. */
import * as db from '../core/db.js';

export const ACTIONS = {
  'auth.login':'Connexion', 'entity.create':'Création', 'entity.update':'Modification',
  'entity.delete':'Suppression', 'dossier.stage':'Changement d’étape',
  'dossier.validate':'Validation', 'dossier.publish':'Publication',
  'commission.compute':'Calcul de commission', 'commission.status':'Changement de statut de commission',
  'contract.update':'Modification de contrat', 'permission.change':'Modification de permissions',
  'ai.run':'Exécution IA', 'automation.run':'Automatisation', 'error':'Erreur',
};

export function log(action, { entity = null, entityId = null, before = null, after = null, note = '' } = {}){
  try{
    return db.auditLogs.insert({
      action, actionLabel: ACTIONS[action] || action,
      entity, entityId, note,
      before: before ? JSON.stringify(before).slice(0, 500) : null,
      after: after ? JSON.stringify(after).slice(0, 500) : null,
      actorId: db.currentUserId(), at: Date.now(),
    });
  }catch(err){ console.warn('[audit] non journalisé', err?.message); return null; }
}

export const trail = (entityId, limit = 50) =>
  db.auditLogs.where(l => l.entityId === entityId).sort((a, b) => b.at - a.at).slice(0, limit);
export const recent = (limit = 100) => db.auditLogs.recent('at', limit);
