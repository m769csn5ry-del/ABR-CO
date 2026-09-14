/* Indicateurs de fonctionnalité — activer une capacité sans redéployer. */
import * as db from '../core/db.js';

export const DEFINITIONS = [
  { key:'competitive_analysis', label:'Analyse concurrentielle', default:true,
    help:'Saisie et synthèse d’un échantillon de concurrents fourni par l’utilisateur.' },
  { key:'photo_vision', label:'Analyse d’images', default:true,
    help:'Mesure de netteté, exposition, composition sur chaque photo.' },
  { key:'ai_server', label:'Moteur IA connecté', default:false,
    help:'Bascule vers le fournisseur configuré côté serveur. Sans clé, le moteur local prend le relais.' },
  { key:'client_portal', label:'Espace client', default:true,
    help:'Accès en lecture pour le client sur ses dossiers et rapports.' },
  { key:'commissions', label:'Commissions', default:true,
    help:'Contrats, transactions, calcul et suivi des commissions.' },
  { key:'automations', label:'Automatisations', default:true,
    help:'Tâches dérivées et exécutions planifiées.' },
  { key:'billing', label:'Facturation SaaS (Stripe)', default:false,
    help:'Non connecté : l’architecture est prête, aucun paiement n’est traité.' },
];

export function all(){
  const stored = db.featureFlags.all();
  return DEFINITIONS.map(d => {
    const row = stored.find(f => f.key === d.key);
    return { ...d, enabled: row ? row.enabled : d.default, id: row?.id || null, updatedAt: row?.updatedAt || null };
  });
}
export const isEnabled = (key) => all().find(f => f.key === key)?.enabled ?? false;

export function set(key, enabled){
  const existing = db.featureFlags.first(f => f.key === key);
  return existing ? db.featureFlags.update(existing.id, { enabled })
                  : db.featureFlags.insert({ key, enabled });
}
