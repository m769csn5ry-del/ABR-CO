/* Ordre de présentation des photos.
 *
 * Objectif : maximiser l'intérêt dès les trois premières vignettes, puis
 * dérouler une visite logique. Chaque position est justifiée par une phrase
 * affichée à l'utilisateur, qui reste libre de réordonner manuellement.
 */

import { PHOTO_CATEGORIES, photoCategory } from '../data/options.js';

/* Ordre de visite « naturel » d'une annonce performante. */
const FLOW = ['salon','vue','piscine','chambre','cuisine','terrasse','salle_manger','sdb',
              'exterieur','jacuzzi','bureau','equipements','entree','parking','quartier','detail'];

const REASONS = {
  cover:'Photo de couverture : meilleur score et sujet le plus vendeur.',
  salon:'La pièce de vie rassure immédiatement sur le volume et le style.',
  vue:'La vue est un argument de réservation : elle doit apparaître tôt.',
  piscine:'La piscine est un critère de recherche fort, placée en début de galerie.',
  chambre:'Le voyageur vérifie le couchage juste après l’ambiance générale.',
  cuisine:'La cuisine confirme l’autonomie du séjour.',
  terrasse:'L’extérieur prolonge la promesse des pièces de vie.',
  salle_manger:'L’espace repas complète la vie commune.',
  sdb:'La salle de bain rassure sur la propreté et l’entretien.',
  exterieur:'La vue extérieure situe le logement dans son environnement.',
  jacuzzi:'Un équipement différenciant, mis en valeur après les espaces principaux.',
  bureau:'L’espace de travail parle aux séjours professionnels et longue durée.',
  equipements:'Les équipements détaillés répondent aux questions restantes.',
  entree:'L’entrée aide à se projeter dans l’arrivée.',
  parking:'Le stationnement est une information pratique, en fin de galerie.',
  quartier:'Le quartier élargit le contexte une fois le logement présenté.',
  detail:'Les détails de décoration referment la visite sur une note soignée.',
};

/** Photo la plus « vendeuse » : score fort et catégorie à impact. */
function coverPick(photos){
  const bonus = { vue:14, piscine:12, salon:10, terrasse:8, exterieur:6, jacuzzi:6 };
  return photos
    .map(p => ({ p, v: (p.analysis?.scores?.score || 0) + (bonus[p.category] || 0) }))
    .sort((a, b) => b.v - a.v)[0]?.p || photos[0];
}

export function optimalOrder(photos){
  if (!photos.length) return [];
  const rest = photos.slice();
  const cover = coverPick(rest);
  const ordered = [cover];
  rest.splice(rest.indexOf(cover), 1);

  // Regroupement par catégorie, chaque groupe trié par score décroissant.
  const byCat = new Map();
  rest.forEach(p => {
    const c = p.category || 'detail';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(p);
  });
  byCat.forEach(list => list.sort((a, b) => (b.analysis?.scores?.score || 0) - (a.analysis?.scores?.score || 0)));

  // Première passe : une photo par catégorie dans l'ordre de visite.
  FLOW.forEach(cat => {
    const list = byCat.get(cat);
    if (list?.length) ordered.push(list.shift());
  });
  // Seconde passe : le reste, toujours dans l'ordre de visite.
  FLOW.forEach(cat => {
    const list = byCat.get(cat);
    while (list?.length) ordered.push(list.shift());
  });
  // Catégories inconnues éventuelles.
  byCat.forEach(list => { while (list.length) ordered.push(list.shift()); });

  return ordered.map((p, i) => ({
    ...p,
    position: i + 1,
    reason: i === 0 ? REASONS.cover : (REASONS[p.category] || 'Complète la visite du logement.'),
  }));
}

export function reasonFor(photo, index){
  return index === 0 ? REASONS.cover : (REASONS[photo.category] || 'Complète la visite du logement.');
}

export const flowOrder = FLOW.slice();
export const categoryPriority = (id) => photoCategory(id).priority;
export const allCategories = PHOTO_CATEGORIES;
