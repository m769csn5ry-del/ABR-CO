/* Le dossier d'optimisation — l'objet central du produit.
 *
 * Il relie un client, un bien, une annonce, une analyse, une version
 * optimisée, des performances, une transaction et une commission. Ses étapes
 * sont explicites : à tout moment, l'opérateur sait où en est chaque dossier
 * et ce qui bloque le passage à la suivante.
 */

import { defineWorkflow } from './engine.js';

const has = (v) => v !== null && v !== undefined && v !== '' &&
  !(Array.isArray(v) && v.length === 0);

export const DOSSIER_WORKFLOW = defineWorkflow({
  id:'dossier',
  stages:[
    { id:'intake', label:'Ouverture',
      description:'Client et bien identifiés.' },
    { id:'imported', label:'Annonce importée',
      description:'Texte de l’annonce et informations du bien présents.',
      requires:(d) => {
        const m = [];
        if (!has(d.listing?.title) && !has(d.listing?.description))
          m.push('Aucun contenu d’annonce importé : collez le texte ou saisissez le titre et la description.');
        if (!has(d.property?.city)) m.push('Ville du bien manquante.');
        return m;
      } },
    { id:'analyzed', label:'Analysée',
      description:'Score calculé et problèmes identifiés.',
      requires:(d) => (d.analysis?.score ? [] : ['L’analyse n’a pas encore été exécutée.']) },
    { id:'optimized', label:'Optimisée',
      description:'Version optimisée générée, en attente de validation.',
      requires:(d) => (d.optimization?.version ? [] : ['Aucune version optimisée générée.']) },
    { id:'validated', label:'Validée',
      description:'Optimisation approuvée par un humain.',
      requires:(d) => (d.optimization?.version ? [] : ['Rien à valider.']) },
    { id:'published', label:'Publiée',
      description:'Annonce mise en ligne par le client ou par l’agence.' },
    { id:'tracking', label:'Suivi',
      description:'Performances collectées après publication.' },
    { id:'closed', label:'Clôturée',
      description:'Transaction et commission traitées.' },
  ],
  transitions:{
    intake:['imported'],
    imported:['analyzed','intake'],
    analyzed:['optimized','imported'],
    optimized:['validated','analyzed'],
    validated:['published','optimized'],
    published:['tracking','validated'],
    tracking:['closed','published'],
    closed:[],
  },
});

export const STAGES = DOSSIER_WORKFLOW.stages;
export const stageLabel = (id) => DOSSIER_WORKFLOW.stage(id)?.label || id;

/* Statuts d'un élément soumis à validation (texte, photo, prix). */
export const ITEM_STATUSES = ['to_analyze','analyzing','recommended','to_validate','validated','rejected','published','archived'];
export const ITEM_STATUS_LABELS = {
  to_analyze:'À analyser', analyzing:'En analyse', recommended:'Recommandé',
  to_validate:'À valider', validated:'Validé', rejected:'Refusé',
  published:'Publié', archived:'Archivé',
};

/** Ce qui empêche le dossier d'avancer : affiché tel quel à l'opérateur. */
export function blockers(dossier){
  const next = DOSSIER_WORKFLOW.nextStages(dossier.stage)[0];
  if (!next) return [];
  return DOSSIER_WORKFLOW.check(dossier.stage, next.id, dossier).reasons;
}

/** Prochaine action concrète attendue, en une phrase. */
export function nextAction(dossier){
  const map = {
    intake:'Importer l’annonce et les photos',
    imported:'Lancer l’analyse',
    analyzed:'Générer la version optimisée',
    optimized:'Valider l’optimisation',
    validated:'Marquer l’annonce comme publiée',
    published:'Saisir les premières performances',
    tracking:'Enregistrer la transaction et la commission',
    closed:'Dossier terminé',
  };
  return map[dossier.stage] || '—';
}
