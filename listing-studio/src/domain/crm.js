/* CRM — pipeline commercial et détection des actions à mener.
 *
 * Le pipeline n'est pas décoratif : il pilote les relances. Le système sait
 * quels dossiers dorment, lesquels attendent une validation, quelles
 * commissions traînent — et les transforme en tâches datées.
 */

export const LEAD_STATUSES = [
  { id:'new',        label:'Nouveau',        tone:'neutral', staleAfterDays:2 },
  { id:'contacted',  label:'Contacté',       tone:'info',    staleAfterDays:5 },
  { id:'replied',    label:'Réponse reçue',  tone:'info',    staleAfterDays:2 },
  { id:'audit_sent', label:'Audit envoyé',   tone:'brand',   staleAfterDays:4 },
  { id:'discussion', label:'En discussion',  tone:'brand',   staleAfterDays:5 },
  { id:'client',     label:'Client',         tone:'ok',      staleAfterDays:30 },
  { id:'running',    label:'En cours',       tone:'ok',      staleAfterDays:14 },
  { id:'done',       label:'Terminé',        tone:'ok',      staleAfterDays:null },
  { id:'lost',       label:'Perdu',          tone:'muted',   staleAfterDays:null },
];
export const leadStatus = (id) => LEAD_STATUSES.find(s => s.id === id) || LEAD_STATUSES[0];
export const ACTIVE_STATUSES = ['new','contacted','replied','audit_sent','discussion'];

export const TASK_TYPES = {
  follow_up:{ label:'Relance', icon:'clock' },
  validate:{ label:'Validation attendue', icon:'checkCircle' },
  performance:{ label:'Performance à saisir', icon:'chart' },
  commission:{ label:'Commission à traiter', icon:'euro' },
  contract:{ label:'Contrat à renouveler', icon:'reports' },
  manual:{ label:'Tâche', icon:'edit' },
};
export const PRIORITIES = ['low','normal','high','urgent'];

const days = (ms) => Math.floor(ms / 86400000);

/**
 * Dérive les tâches que le système sait devoir exister, à partir de l'état
 * réel des données. Aucune tâche n'est inventée : chacune pointe une entité.
 * @returns {Array<{key,type,priority,title,detail,entity,dueAt}>}
 */
export function deriveTasks({ leads = [], dossiers = [], commissions = [], contracts = [], now = Date.now() } = {}){
  const out = [];

  leads.forEach(l => {
    const st = leadStatus(l.status);
    if (!st.staleAfterDays) return;
    const last = l.lastContactAt || l.updatedAt || l.createdAt;
    const idle = days(now - last);
    if (idle >= st.staleAfterDays){
      out.push({
        key:`lead:${l.id}:stale`, type:'follow_up',
        priority: idle >= st.staleAfterDays * 3 ? 'high' : 'normal',
        title:`Relancer ${l.name}`,
        detail:`${st.label} depuis ${idle} jour(s), sans nouveau contact.`,
        entity:{ kind:'lead', id:l.id }, dueAt:last + st.staleAfterDays * 86400000,
      });
    }
    if (l.nextFollowUpAt && l.nextFollowUpAt <= now){
      out.push({
        key:`lead:${l.id}:planned`, type:'follow_up', priority:'high',
        title:`Relance planifiée : ${l.name}`,
        detail:l.followUpNote || 'Relance programmée arrivée à échéance.',
        entity:{ kind:'lead', id:l.id }, dueAt:l.nextFollowUpAt,
      });
    }
  });

  dossiers.forEach(d => {
    if (d.stage === 'optimized'){
      out.push({
        key:`dossier:${d.id}:validate`, type:'validate', priority:'high',
        title:`Valider l’optimisation — ${d.name}`,
        detail:'Une version optimisée attend une validation humaine avant publication.',
        entity:{ kind:'dossier', id:d.id }, dueAt:d.updatedAt,
      });
    }
    if (d.stage === 'published'){
      const since = days(now - (d.publishedAt || d.updatedAt));
      if (since >= 14){
        out.push({
          key:`dossier:${d.id}:perf`, type:'performance',
          priority: since >= 30 ? 'high' : 'normal',
          title:`Relever les performances — ${d.name}`,
          detail:`Publiée depuis ${since} jours, aucune mesure après optimisation.`,
          entity:{ kind:'dossier', id:d.id }, dueAt:(d.publishedAt || d.updatedAt) + 14 * 86400000,
        });
      }
    }
  });

  commissions.forEach(c => {
    if (c.status === 'due' && c.dueAt && c.dueAt < now){
      out.push({
        key:`commission:${c.id}:overdue`, type:'commission', priority:'urgent',
        title:`Commission en retard — ${c.clientName || 'client'}`,
        detail:`Exigible depuis ${days(now - c.dueAt)} jour(s).`,
        entity:{ kind:'commission', id:c.id }, dueAt:c.dueAt,
      });
    }
    if (c.status === 'estimated' && c.transactionId){
      out.push({
        key:`commission:${c.id}:confirm`, type:'commission', priority:'normal',
        title:`Confirmer la commission — ${c.clientName || 'client'}`,
        detail:'Transaction enregistrée : la commission estimée doit être rendue exigible.',
        entity:{ kind:'commission', id:c.id }, dueAt:c.updatedAt,
      });
    }
  });

  contracts.forEach(ct => {
    if (!ct.endsAt) return;
    const left = days(ct.endsAt - now);
    if (left <= 30 && left >= 0){
      out.push({
        key:`contract:${ct.id}:renew`, type:'contract', priority: left <= 7 ? 'high' : 'normal',
        title:`Contrat à renouveler — ${ct.clientName || 'client'}`,
        detail:`Échéance dans ${left} jour(s).`,
        entity:{ kind:'contract', id:ct.id }, dueAt:ct.endsAt,
      });
    }
  });

  const rank = { urgent:0, high:1, normal:2, low:3 };
  return out.sort((a, b) => (rank[a.priority] - rank[b.priority]) || (a.dueAt - b.dueAt));
}
