/* Moteur de workflow générique.
 *
 * Un workflow décrit des étapes, des transitions autorisées et les conditions
 * d'entrée dans chaque étape. Faire évoluer le produit revient à modifier une
 * définition, jamais à réécrire la logique métier dispersée dans les vues.
 *
 * Toute transition produit une entrée d'historique : qui, quand, depuis où,
 * vers où, et pourquoi elle a été refusée le cas échéant.
 */

export class TransitionError extends Error {
  constructor(message, { from, to, reasons = [] } = {}){
    super(message);
    this.name = 'TransitionError';
    this.from = from; this.to = to; this.reasons = reasons;
  }
}

/**
 * @param {{id:string, stages:Array<{id,label,description?,requires?:Function,auto?:boolean}>,
 *          transitions:Object<string,string[]>}} definition
 */
export function defineWorkflow(definition){
  const stages = definition.stages;
  const byId = new Map(stages.map(s => [s.id, s]));

  return {
    id: definition.id,
    stages,
    stage: (id) => byId.get(id) || null,
    first: () => stages[0].id,
    indexOf: (id) => stages.findIndex(s => s.id === id),
    isTerminal: (id) => (definition.transitions[id] || []).length === 0,

    /** Étapes atteignables depuis l'étape courante. */
    nextStages: (from) => (definition.transitions[from] || []).map(id => byId.get(id)).filter(Boolean),

    /** Une transition est-elle permise, et l'entité satisfait-elle les conditions ? */
    check(from, to, entity, context = {}){
      const reasons = [];
      if (!byId.has(to)) reasons.push(`Étape inconnue : ${to}`);
      else if (from !== to && !(definition.transitions[from] || []).includes(to))
        reasons.push(`Passage direct de « ${byId.get(from)?.label || from} » à « ${byId.get(to).label} » non prévu.`);
      const target = byId.get(to);
      if (target?.requires){
        const missing = target.requires(entity, context) || [];
        missing.forEach(m => reasons.push(m));
      }
      return { allowed: reasons.length === 0, reasons };
    },

    /** Applique la transition ou lève une erreur explicite. */
    transition(entity, to, { actor = null, note = '', context = {} } = {}){
      const from = entity.stage || this.first();
      const { allowed, reasons } = this.check(from, to, entity, context);
      if (!allowed) throw new TransitionError(reasons[0], { from, to, reasons });
      const entry = { from, to, at: Date.now(), actor, note };
      return {
        ...entity,
        stage: to,
        stageEnteredAt: entry.at,
        stageHistory: [...(entity.stageHistory || []), entry],
      };
    },

    /** Avancement en pourcentage, pour les barres de progression. */
    progress(stageId){
      const i = this.indexOf(stageId);
      return i < 0 ? 0 : Math.round((i / (stages.length - 1)) * 100);
    },
  };
}
