/* Registre des plateformes.
   Pour en ajouter une : créer l'adaptateur, l'importer, l'ajouter au tableau. */

import airbnb from './airbnb.js';
import booking from './booking.js';
import vrbo from './vrbo.js';
import abritel from './abritel.js';
import expedia from './expedia.js';
import leboncoin from './leboncoin.js';
import pap from './pap.js';
import facebook from './facebook.js';
import generic from './generic.js';

export const ADAPTERS = [airbnb, booking, vrbo, abritel, expedia, leboncoin, pap, facebook, generic];

export const ALL = 'all';

export function adapter(id){
  return ADAPTERS.find(a => a.id === id) || generic;
}
export function list({ includeGeneric = true } = {}){
  return ADAPTERS.filter(a => includeGeneric || a.id !== 'generic');
}
export function groups(){
  const out = new Map();
  ADAPTERS.forEach(a => {
    if (!out.has(a.group)) out.set(a.group, []);
    out.get(a.group).push(a);
  });
  return Array.from(out, ([label, items]) => ({ label, items }));
}

/** Résout une sélection utilisateur (liste d'ids ou « all ») en adaptateurs. */
export function resolve(selection){
  if (!selection || selection === ALL || (Array.isArray(selection) && selection.includes(ALL)))
    return ADAPTERS.filter(a => a.id !== 'generic');
  const ids = Array.isArray(selection) ? selection : [selection];
  const found = ids.map(id => ADAPTERS.find(a => a.id === id)).filter(Boolean);
  return found.length ? found : [generic];
}

/** Composition du contenu pour chaque plateforme sélectionnée. */
export function composeAll(content, selection, ctx = {}){
  return resolve(selection).map(a => a.compose(content, ctx));
}

export const labelOf = (id) => (id === ALL ? 'Toutes les plateformes' : adapter(id).label);
