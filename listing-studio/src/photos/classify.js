/* Reconnaissance de la pièce représentée.
 *
 * Deux signaux : le nom du fichier (le plus fiable quand il est parlant) et
 * la signature colorimétrique de l'image. La détection est toujours affichée
 * avec son niveau de confiance et reste corrigeable par l'utilisateur :
 * une annonce ne doit jamais reposer sur une catégorisation silencieuse.
 */

import { PHOTO_CATEGORIES } from '../data/options.js';
import { clamp } from '../core/util.js';

const KEYWORDS = {
  salon:['salon','living','sejour','séjour','lounge','piece de vie','pièce de vie','canape','canapé'],
  cuisine:['cuisine','kitchen','cocina','office'],
  chambre:['chambre','bedroom','bed','dormitorio','suite','lit'],
  sdb:['sdb','salle de bain','salle-de-bain','bain','bathroom','douche','shower','wc','toilette','baño'],
  exterieur:['exterieur','extérieur','facade','façade','outside','jardin','garden','entree ext','patio'],
  vue:['vue','view','panorama','paysage','mer','sea','montagne','sunset','coucher'],
  terrasse:['terrasse','terrace','balcon','balcony','rooftop','veranda','véranda'],
  piscine:['piscine','pool','swimming','bassin'],
  jacuzzi:['jacuzzi','spa','hot tub','hottub','sauna'],
  salle_manger:['salle a manger','salle à manger','dining','manger','table'],
  entree:['entree','entrée','hall','couloir','entrance','corridor'],
  bureau:['bureau','office','desk','workspace','travail'],
  parking:['parking','garage','carport','voiture','stationnement'],
  equipements:['equipement','équipement','amenity','machine','lave','four','wifi','detail equip'],
  quartier:['quartier','rue','street','ville','city','village','plage','beach','centre'],
  detail:['detail','détail','deco','déco','decoration','décoration','close'],
};

export function fromFilename(name){
  const n = String(name || '').toLowerCase().replace(/[_\-]+/g, ' ');
  for (const [cat, words] of Object.entries(KEYWORDS)){
    if (words.some(w => n.includes(w))) return cat;
  }
  return null;
}

/** Signature colorimétrique -> catégorie probable (heuristique assumée). */
export function fromMetrics(m){
  const votes = {};
  const add = (cat, v) => { votes[cat] = (votes[cat] || 0) + v; };

  if (m.blueTop > 0.20 && m.green > 0.06) add('exterieur', 2.2);
  if (m.blueTop > 0.30) add('vue', 2.0);
  if (m.green > 0.16) add('exterieur', 1.4);
  if (m.green > 0.10 && m.mean > 120) add('terrasse', 0.8);
  if (m.bm > m.rm + 14 && m.saturation > 0.24 && m.mean > 110) add('piscine', 1.8);
  if (m.lowSatBright > 0.34 && m.mean > 150 && m.saturation < 0.16) add('sdb', 2.1);
  if (m.warm > 0.42 && m.edgeRatio < 0.09 && m.mean > 90) add('salon', 1.3);
  if (m.edgeRatio > 0.10 && m.saturation < 0.30 && m.mean > 110) add('cuisine', 1.2);
  if (m.mean < 105 && m.warm > 0.30 && m.edgeRatio < 0.075) add('chambre', 1.1);
  if (m.entropy < 6.6 && m.edgeRatio < 0.05) add('detail', 0.7);
  if (m.vertRatio > 0.42 && m.mean > 120 && m.green < 0.05) add('salon', 0.5);

  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { category:'detail', confidence:0.2 };
  const [cat, v] = ranked[0];
  const second = ranked[1]?.[1] || 0;
  return { category: cat, confidence: clamp((v - second) / 2.4 + 0.32, 0.2, 0.92) };
}

export function classify(analysis, filename){
  const byName = fromFilename(filename);
  if (byName) return { category: byName, confidence: 0.95, source: 'nom du fichier' };
  const byPixels = fromMetrics(analysis.metrics);
  return { ...byPixels, source: 'analyse de l’image' };
}

export const categoryLabel = (id) =>
  PHOTO_CATEGORIES.find(c => c.id === id)?.label || 'Autre';
