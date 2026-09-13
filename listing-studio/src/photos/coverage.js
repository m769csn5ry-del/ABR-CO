/* Photos manquantes : compare les catégories détectées aux catégories
   attendues pour CE logement (déduites des équipements et de la configuration).
   Rien n'est inventé : une recommandation n'apparaît que si le logement
   déclare l'élément correspondant. */

import { PHOTO_CATEGORIES, photoCategory, AMENITIES } from '../data/options.js';

export function expectedCategories(property = {}){
  const has = (id) => (property.amenities || []).includes(id);
  const exp = new Map();
  const add = (id, why, essential = false) => { if (!exp.has(id)) exp.set(id, { id, why, essential }); };

  add('salon', 'Toute annonce doit montrer sa pièce de vie.', true);
  if (property.type !== 'chambre') add('cuisine', 'La cuisine est attendue par les voyageurs.', has('cuisine'));
  add('chambre', 'Le couchage doit être visible.', true);
  add('sdb', 'La salle de bain rassure sur l’entretien.', true);

  AMENITIES.filter(a => a.photo && has(a.id)).forEach(a => {
    add(a.photo, `L’équipement « ${a.label} » est annoncé : il doit être montré.`, true);
  });

  if (property.type === 'maison' || property.type === 'villa' || property.type === 'chalet' || property.type === 'gite')
    add('exterieur', 'Une vue extérieure du bien est attendue pour ce type de logement.', true);
  if (Number(property.bedrooms) > 1) add('chambre', 'Chaque chambre mérite sa photo.', true);
  add('entree', 'L’entrée aide le voyageur à se projeter dans son arrivée.');
  add('quartier', 'Une photo du quartier situe le logement.');

  return Array.from(exp.values());
}

export function coverage(photos, property){
  const present = new Set(photos.map(p => p.category).filter(Boolean));
  const expected = expectedCategories(property);
  const missing = expected.filter(e => !present.has(e.id))
    .map(e => ({ ...e, label: photoCategory(e.id).label }))
    .sort((a, b) => (b.essential - a.essential) || (photoCategory(a.id).priority - photoCategory(b.id).priority));

  const detected = Array.from(present).map(id => ({
    id, label: photoCategory(id).label,
    count: photos.filter(p => p.category === id).length,
  })).sort((a, b) => photoCategory(a.id).priority - photoCategory(b.id).priority);

  const essentialTotal = expected.filter(e => e.essential).length || 1;
  const essentialDone = expected.filter(e => e.essential && present.has(e.id)).length;

  return {
    detected, missing, expected,
    completeness: Math.round((essentialDone / essentialTotal) * 100),
    perBedroom: {
      bedrooms: Number(property.bedrooms) || 0,
      photos: photos.filter(p => p.category === 'chambre').length,
    },
  };
}

export const ALL_CATEGORIES = PHOTO_CATEGORIES;
