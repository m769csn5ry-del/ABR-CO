/* Listing Score — note sur 100 répartie en six familles.
 *
 * Le calcul est entièrement explicable : chaque point perdu correspond à une
 * amélioration concrète, affichée à l'utilisateur et reprise dans le rapport
 * client. Aucune note n'est aléatoire.
 */

import { amenity } from '../data/options.js';
import { words, clamp, round, avg } from '../core/util.js';
import { MISSING_MARK } from '../ai/local/generator.js';
import { coverage } from '../photos/coverage.js';

const LEVELS = [
  { id:'faible',    label:'Faible',    min:0,  tone:'bad'  },
  { id:'bon',       label:'Bon',       min:55, tone:'warn' },
  { id:'excellent', label:'Excellent', min:80, tone:'ok'   },
];
export const levelOf = (score) =>
  LEVELS.slice().reverse().find(l => score >= l.min) || LEVELS[0];

const pts = (ratio, max) => round(clamp(ratio, 0, 1) * max, 1);

/* ---------- Familles ---------- */
function scoreTitle(content, f){
  const t = content?.title || '';
  const len = t.length;
  const improvements = [];
  let r = 0;

  if (!t){ improvements.push({ text:'Générer un titre.', gain:20, priority:1 }); return { value:0, max:20, improvements, details:['Aucun titre'] }; }

  const lengthScore = len >= 28 && len <= 65 ? 1 : len >= 20 && len <= 78 ? 0.7 : 0.35;
  if (lengthScore < 1) improvements.push({
    text: len < 28 ? 'Allonger le titre : viser 30 à 60 caractères.' : 'Raccourcir le titre : au-delà de 65 caractères, la fin est coupée.',
    gain: round((1 - lengthScore) * 7, 1), priority: 2,
  });

  const hasPlace = Boolean(f.place) && t.toLowerCase().includes((f.city || '').toLowerCase()) && f.city;
  if (!hasPlace) improvements.push({ text:'Ajouter la ville ou le quartier dans le titre.', gain:4, priority:2 });

  const assets = ['piscine','vue','terrasse','jardin','parking','centre','plage','jacuzzi','design','calme','lumineux','spacieux'];
  const hasAsset = assets.some(a => t.toLowerCase().includes(a));
  if (!hasAsset) improvements.push({ text:'Faire figurer l’atout principal dans le titre.', gain:4, priority:1 });

  const clean = !t.includes(MISSING_MARK);
  if (!clean) improvements.push({ text:'Compléter les informations manquantes du titre.', gain:3, priority:1 });

  const variants = (content.titles || []).length >= 3;
  if (!variants) improvements.push({ text:'Générer plusieurs variantes de titre pour tester.', gain:2, priority:3 });

  r = 0.35 * lengthScore + 0.2 * (hasPlace ? 1 : 0) + 0.2 * (hasAsset ? 1 : 0)
    + 0.15 * (clean ? 1 : 0) + 0.1 * (variants ? 1 : 0);
  return { value: pts(r, 20), max:20, improvements, details:[`${len} caractères`, hasPlace ? 'Localisation présente' : 'Sans localisation'] };
}

function scorePhotos(photos, property){
  const improvements = [];
  const n = photos.length;
  if (!n) return {
    value:0, max:20, details:['Aucune photo'],
    improvements:[{ text:'Ajouter au moins 8 photos : c’est le premier facteur de clic.', gain:20, priority:1 }],
  };

  const countScore = n >= 12 ? 1 : n >= 8 ? 0.85 : n >= 5 ? 0.6 : 0.35;
  if (countScore < 1) improvements.push({
    text:`Ajouter des photos : ${n} aujourd’hui, 12 à 20 recommandées.`,
    gain: round((1 - countScore) * 6, 1), priority: n < 5 ? 1 : 2,
  });

  const scores = photos.map(p => p.analysis?.scores?.score || 0);
  const quality = avg(scores) / 100;
  const weak = photos.filter(p => (p.analysis?.scores?.score || 0) < 55);
  if (weak.length) improvements.push({
    text:`Refaire ${weak.length} photo(s) sous la barre des 55/100.`,
    gain: round(Math.min(weak.length * 1.6, 6), 1), priority:1,
  });

  const cover = photos[0]?.analysis?.scores?.score || 0;
  if (cover < 80) improvements.push({
    text:'Choisir une photo de couverture plus forte : elle décide du clic.',
    gain: round((80 - cover) / 14, 1), priority:1,
  });

  const cov = coverage(photos, property);
  if (cov.missing.some(m => m.essential)) improvements.push({
    text:`Compléter les catégories manquantes : ${cov.missing.filter(m => m.essential).slice(0, 4).map(m => m.label).join(', ')}.`,
    gain:3, priority:2,
  });

  const r = 0.3 * countScore + 0.34 * quality + 0.18 * (cover / 100) + 0.18 * (cov.completeness / 100);
  return {
    value: pts(r, 20), max:20, improvements,
    details:[`${n} photo(s)`, `qualité moyenne ${Math.round(avg(scores))}/100`, `couverture ${cov.completeness}%`],
  };
}

function scoreDescription(content){
  const improvements = [];
  const long = content?.longDescription || '';
  const short = content?.shortDescription || '';
  const w = words(long);

  const lenScore = w >= 220 ? 1 : w >= 140 ? 0.8 : w >= 80 ? 0.55 : 0.25;
  if (lenScore < 1) improvements.push({
    text:`Développer la description longue : ${w} mots, viser 220 à 400.`,
    gain: round((1 - lenScore) * 6, 1), priority:2,
  });

  const paras = long.split(/\n\n+/).filter(Boolean).length;
  const structure = paras >= 4 ? 1 : paras >= 2 ? 0.6 : 0.25;
  if (structure < 1) improvements.push({ text:'Structurer la description en paragraphes thématiques.', gain:3, priority:2 });

  const missingMarks = (long.match(new RegExp(MISSING_MARK, 'g')) || []).length
                     + (short.match(new RegExp(MISSING_MARK, 'g')) || []).length;
  if (missingMarks) improvements.push({
    text:`Compléter ${missingMarks} information(s) manquante(s) citée(s) dans la description.`,
    gain: round(Math.min(missingMarks * 2, 5), 1), priority:1,
  });

  const hasShort = short.length >= 120;
  if (!hasShort) improvements.push({ text:'Rédiger une description courte d’au moins 120 caractères.', gain:2, priority:3 });

  const rooms = (content?.rooms || []).length >= 3;
  if (!rooms) improvements.push({ text:'Décrire les pièces une par une.', gain:2, priority:3 });

  const r = 0.34 * lenScore + 0.2 * structure + 0.2 * (missingMarks ? 0 : 1)
          + 0.13 * (hasShort ? 1 : 0) + 0.13 * (rooms ? 1 : 0);
  return { value: pts(r, 20), max:20, improvements, details:[`${w} mots`, `${paras} paragraphe(s)`] };
}

function scoreAmenities(property){
  const improvements = [];
  const ids = property?.amenities || [];
  const customs = (property?.customAmenities || []).length;
  const total = ids.length + customs;

  const countScore = total >= 22 ? 1 : total >= 14 ? 0.82 : total >= 8 ? 0.6 : total >= 4 ? 0.35 : 0.1;
  if (countScore < 1) improvements.push({
    text:`Cocher davantage d’équipements : ${total} renseignés, 15 à 25 attendus.`,
    gain: round((1 - countScore) * 6, 1), priority:2,
  });

  const essentials = ['wifi','chauffage','cuisine','draps','serviettes'];
  const missingEss = essentials.filter(e => !ids.includes(e));
  if (missingEss.length) improvements.push({
    text:`Préciser les essentiels non cochés : ${missingEss.map(e => amenity(e)?.label).join(', ')}.`,
    gain: round(Math.min(missingEss.length * 0.8, 3), 1), priority:2,
  });

  const weight = ids.reduce((a, id) => a + (amenity(id)?.weight || 1), 0);
  const maxWeight = 46;
  const differentiators = ids.filter(id => (amenity(id)?.weight || 0) >= 4).length;
  if (!differentiators) improvements.push({
    text:'Aucun équipement différenciant (piscine, vue, terrasse, parking) : le mettre en avant s’il existe.',
    gain:2, priority:3,
  });

  const r = 0.45 * countScore + 0.35 * clamp(weight / maxWeight, 0, 1)
          + 0.2 * clamp(differentiators / 3, 0, 1);
  return { value: pts(r, 15), max:15, improvements, details:[`${total} équipement(s)`, `${differentiators} différenciant(s)`] };
}

function scoreInfos(project, content){
  const improvements = [];
  const p = project.property || {};
  const pos = project.positioning || {};
  const required = [
    ['Nombre de voyageurs', p.guests],
    ['Nombre de lits', p.beds],
    ['Salles de bain', p.bathrooms],
    ['Surface', p.surface],
    ['Ville', p.city],
    ['Heure d’arrivée', pos.checkinTime],
    ['Heure de départ', pos.checkoutTime],
    ['Règles du logement', (pos.rules || []).length || (pos.customRules || []).length],
  ];
  const filled = required.filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 0 && v !== false);
  const holes = required.filter(r => !filled.includes(r));
  if (holes.length) improvements.push({
    text:`Renseigner : ${holes.map(h => h[0]).join(', ')}.`,
    gain: round(Math.min(holes.length * 1.3, 8), 1), priority: holes.length > 3 ? 1 : 2,
  });
  const missingCount = (content?.missing || []).filter(m => m.severity === 'required').length;
  if (missingCount) improvements.push({
    text:`${missingCount} information obligatoire encore manquante.`, gain:2, priority:1,
  });

  const r = filled.length / required.length;
  return { value: pts(r, 10), max:10, improvements, details:[`${filled.length}/${required.length} champs clés`] };
}

function scorePositioning(project, content){
  const improvements = [];
  const pos = project.positioning || {};
  const has = {
    audiences: (pos.audiences || []).length > 0,
    style: Boolean(pos.style),
    highlights: (pos.highlights || []).length >= 2,
    tone: Boolean(pos.tone),
    platforms: Boolean(project.platforms && (project.platforms === 'all' || project.platforms.length)),
    attractions: (pos.attractions || []).length > 0,
  };
  if (!has.audiences) improvements.push({ text:'Choisir au moins un public cible.', gain:4, priority:1 });
  if (!has.highlights) improvements.push({ text:'Sélectionner au moins deux points forts.', gain:3, priority:1 });
  if (!has.style) improvements.push({ text:'Préciser le style du logement.', gain:2, priority:3 });
  if (!has.platforms) improvements.push({ text:'Choisir la ou les plateformes de diffusion.', gain:2, priority:2 });
  if (!has.attractions) improvements.push({ text:'Ajouter des points d’intérêt à proximité (aucun n’est inventé).', gain:2, priority:2 });

  const hl = (content?.highlights || []).length >= 4;
  if (!hl) improvements.push({ text:'Développer la liste des points forts de l’annonce.', gain:1.5, priority:3 });

  const r = (Object.values(has).filter(Boolean).length + (hl ? 1 : 0)) / (Object.keys(has).length + 1);
  return { value: pts(r, 15), max:15, improvements, details:[`${Object.values(has).filter(Boolean).length}/6 axes définis`] };
}

/* ---------- Agrégation ---------- */
export function computeScore(project, { photos = [], content = null } = {}){
  const c = content || project.content || null;
  const f = {
    place: [project.property?.district, project.property?.city].filter(Boolean).join(', '),
    city: project.property?.city || '',
  };

  const parts = {
    titre: scoreTitle(c, f),
    photos: scorePhotos(photos, project.property || {}),
    description: scoreDescription(c),
    equipements: scoreAmenities(project.property || {}),
    informations: scoreInfos(project, c),
    positionnement: scorePositioning(project, c),
  };

  const total = round(Object.values(parts).reduce((a, p) => a + p.value, 0));
  const level = levelOf(total);
  const improvements = Object.entries(parts)
    .flatMap(([k, p]) => p.improvements.map(i => ({ ...i, part: k })))
    .sort((a, b) => (a.priority - b.priority) || (b.gain - a.gain));

  return {
    total, level: level.id, levelLabel: level.label, tone: level.tone,
    parts, improvements,
    potential: round(clamp(total + improvements.reduce((a, i) => a + i.gain, 0), 0, 100)),
    computedAt: Date.now(),
  };
}

export const PART_LABELS = {
  titre:'Titre', photos:'Photos', description:'Description',
  equipements:'Équipements', informations:'Informations', positionnement:'Positionnement',
};
export { LEVELS };
