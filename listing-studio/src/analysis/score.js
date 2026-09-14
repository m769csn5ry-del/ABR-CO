/* Score d'annonce — dix axes, méthode documentée et reproductible.
 *
 * Chaque axe part de son maximum et perd des points selon des seuils écrits
 * ici, jamais selon une appréciation. Le score est donc explicable ligne à
 * ligne : « vous perdez 6 points sur Informations parce que la surface est
 * absente » est une phrase que l'opérateur peut prononcer sans hésiter.
 *
 * Le score potentiel est le score obtenu si tous les problèmes détectés sont
 * corrigés — il n'est pas une promesse de performance commerciale.
 */

export const SCORE_VERSION = '1.0.0';

export const AXES = [
  { id:'title',          label:'Titre',            max:12, help:'Longueur, atout, localisation, absence de bruit.' },
  { id:'description',    label:'Description',      max:16, help:'Volume, densité factuelle, absence de remplissage.' },
  { id:'photos',         label:'Photos',           max:16, help:'Nombre, qualité mesurée, couverture des pièces.' },
  { id:'information',    label:'Informations',     max:12, help:'Surface, pièces, étage, disponibilité, transports.' },
  { id:'positioning',    label:'Positionnement',   max:8,  help:'Cible identifiable et argument dominant.' },
  { id:'conversion',     label:'Conversion',       max:10, help:'Appel à l’action, réponse aux objections.' },
  { id:'seo',            label:'Référencement',    max:8,  help:'Mots-clés de recherche présents et naturels.' },
  { id:'trust',          label:'Confiance',        max:10, help:'Éléments vérifiables, cohérence, transparence.' },
  { id:'differentiation',label:'Différenciation',  max:5,  help:'Ce qui distingue ce bien des annonces voisines.' },
  { id:'legal',          label:'Mentions',         max:3,  help:'Présence des mentions attendues sur le marché visé.' },
];
export const MAX_TOTAL = AXES.reduce((s, a) => s + a.max, 0);   // 100

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @param {object} m       mesures (analysis/text.js)
 * @param {Array}  problems problèmes détectés (analysis/rules.js)
 * @param {object} ctx     { photoCount, photoAverage, photoCoverage, hasTarget, competitorCount }
 */
export function score(m, problems = [], ctx = {}){
  const {
    photoCount = null, photoAverage = null, photoCoverage = null,
    hasTarget = false, hasAngle = false,
  } = ctx;

  const detail = {};
  const note = (axis, points, reasons) => { detail[axis] = { points: Math.round(points * 10) / 10, reasons }; };

  /* Titre — 12 */
  {
    let p = 12; const r = [];
    const len = m.title.length;
    if (!len){ p = 0; r.push('Aucun titre.'); }
    else {
      if (len < 25){ p -= 4; r.push('Titre trop court.'); }
      else if (len > 80){ p -= 2; r.push('Titre tronqué sur les portails.'); }
      if (m.title.empty.length){ p -= 3; r.push('Adjectifs invérifiables.'); }
      if (m.title.allCaps >= 2 || m.title.exclamations){ p -= 3; r.push('Majuscules ou exclamations.'); }
      if (!m.title.hasNumber){ p -= 1; r.push('Aucun chiffre (surface, pièces).'); }
    }
    note('title', clamp(p, 0, 12), r);
  }

  /* Description — 16 */
  {
    let p = 16; const r = [];
    const w = m.description.words;
    if (w < 20){ p = 1; r.push('Description quasi absente.'); }
    else {
      if (w < 120){ p -= 7; r.push(`Seulement ${w} mots.`); }
      else if (w < 180){ p -= 3; r.push('Volume juste en dessous de la cible.'); }
      else if (w > 600){ p -= 2; r.push('Texte trop long, dilution du message.'); }
      if (m.description.empty.length >= 3){ p -= 3; r.push('Remplissage adjectival.'); }
      if (m.description.repetitions.length){ p -= 1; r.push('Répétitions.'); }
      if (m.description.readability.avgSentence > 28){ p -= 2; r.push('Phrases trop longues.'); }
      const s = m.description.structure;
      if (s.paragraphs <= 1 && w > 90){ p -= 3; r.push('Un seul bloc de texte.'); }
      if (s.longestParagraphWords > 120){ p -= 1; r.push('Paragraphe trop dense.'); }
    }
    note('description', clamp(p, 0, 16), r);
  }

  /* Photos — 16 : mesuré si l'analyse d'image a tourné, sinon non noté. */
  {
    const r = [];
    if (photoCount === null){
      note('photos', 0, ['Aucune photo fournie à l’analyse.']);
    } else {
      let p = 16;
      if (photoCount < 4){ p -= 9; r.push(`${photoCount} photo(s) seulement.`); }
      else if (photoCount < 8){ p -= 5; r.push(`${photoCount} photos : sous le seuil attendu.`); }
      else if (photoCount < 12){ p -= 2; r.push('Galerie incomplète.'); }
      if (photoAverage !== null){
        if (photoAverage < 55){ p -= 5; r.push(`Qualité moyenne ${photoAverage}/100.`); }
        else if (photoAverage < 70){ p -= 3; r.push(`Qualité moyenne ${photoAverage}/100.`); }
        else if (photoAverage < 80){ p -= 1; r.push('Qualité correcte sans plus.'); }
      }
      if (photoCoverage !== null && photoCoverage < 80){ p -= 2; r.push(`Couverture des pièces : ${photoCoverage} %.`); }
      note('photos', clamp(p, 0, 16), r);
    }
  }

  /* Informations — 12 */
  {
    const weights = { surface:4, rooms:3, floor:2, transport:1.5, availability:1.5 };
    let p = 12; const r = [];
    Object.entries(weights).forEach(([k, w]) => {
      if (!m.facts[k]){ p -= w; r.push(`${k} absent.`); }
    });
    note('information', clamp(p, 0, 12), r);
  }

  /* Positionnement — 8 */
  {
    let p = 8; const r = [];
    if (!hasTarget){ p -= 4; r.push('Aucune cible déclarée.'); }
    if (!hasAngle){ p -= 3; r.push('Aucun argument dominant identifié.'); }
    note('positioning', clamp(p, 0, 8), r);
  }

  /* Conversion — 10 */
  {
    let p = 10; const r = [];
    if (!m.cta){ p -= 5; r.push('Pas d’appel à l’action.'); }
    if (m.description.words < 120){ p -= 2; r.push('Trop peu d’arguments pour convaincre.'); }
    if (!m.facts.price){ p -= 2; r.push('Aucun repère de prix dans le texte.'); }
    note('conversion', clamp(p, 0, 10), r);
  }

  /* Référencement — 8 */
  {
    let p = 8; const r = [];
    const strong = m.keywords.filter(k => k.count >= 2).length;
    if (strong === 0){ p -= 4; r.push('Aucun mot-clé récurrent.'); }
    else if (strong < 3){ p -= 2; r.push('Champ lexical trop mince.'); }
    if (!m.facts.rooms && !m.facts.surface){ p -= 2; r.push('Ni typologie ni surface : filtres manqués.'); }
    note('seo', clamp(p, 0, 8), r);
  }

  /* Confiance — 10 */
  {
    let p = 10; const r = [];
    const t = m.trustMarkers;
    if (t <= 2){ p -= 5; r.push(`${t} élément vérifiable.`); }
    else if (t <= 4){ p -= 2; r.push('Peu d’éléments vérifiables.'); }
    if (m.description.structure.exclamations > 1){ p -= 2; r.push('Ton survendu.'); }
    if (m.title.empty.length + m.description.empty.length >= 5){ p -= 2; r.push('Promesses non étayées.'); }
    note('trust', clamp(p, 0, 10), r);
  }

  /* Différenciation — 5 */
  {
    let p = 5; const r = [];
    const distinctive = ['vue','terrasse','jardin','balcon','parking','garage','cave','atypique','duplex','loft','rénové','calme','lumineux'];
    const found = distinctive.filter(d => m.keywords.some(k => k.word.includes(d)));
    if (!found.length){ p -= 3; r.push('Aucun élément distinctif nommé.'); }
    else if (found.length === 1){ p -= 1; r.push('Un seul élément distinctif.'); }
    note('differentiation', clamp(p, 0, 5), r);
  }

  /* Mentions — 3 */
  {
    let p = 3; const r = [];
    const legalProblems = problems.filter(x => x.category === 'legal').length;
    p -= legalProblems * 1.5;
    if (legalProblems) r.push(`${legalProblems} mention(s) attendue(s) absente(s).`);
    note('legal', clamp(p, 0, 3), r);
  }

  const total = Math.round(Object.values(detail).reduce((s, d) => s + d.points, 0));

  /* Le gain récupérable est plafonné axe par axe : corriger un problème de
     titre ne peut pas rapporter plus que les points perdus sur le titre.
     Sans ce plafond, la somme brute des impacts afficherait un potentiel
     de 100 sur n'importe quelle annonce — un chiffre flatteur et faux. */
  const AXIS_OF = {
    title:'title', description:'description', structure:'description',
    information:'information', legal:'legal', conversion:'conversion',
    pricing:'conversion', trust:'trust', differentiation:'differentiation',
    seo:'seo', photos:'photos',
  };
  const lostByAxis = {};
  AXES.forEach(a => { lostByAxis[a.id] = a.max - (detail[a.id]?.points ?? 0); });
  const claimedByAxis = {};
  problems.forEach(p => {
    const axis = AXIS_OF[p.category] || 'description';
    claimedByAxis[axis] = (claimedByAxis[axis] || 0) + (p.impact || 0);
  });
  const recoverable = Object.entries(claimedByAxis)
    .reduce((s, [axis, claimed]) => s + Math.min(claimed, lostByAxis[axis] ?? 0), 0);
  const potential = Math.min(100, Math.round(total + recoverable));

  return {
    version: SCORE_VERSION,
    total,
    potential,
    gain: potential - total,
    level: total >= 80 ? 'excellent' : total >= 60 ? 'bon' : total >= 40 ? 'faible' : 'critique',
    axes: AXES.map(a => ({
      id:a.id, label:a.label, max:a.max, help:a.help,
      points: detail[a.id]?.points ?? 0,
      ratio: Math.round(((detail[a.id]?.points ?? 0) / a.max) * 100),
      reasons: detail[a.id]?.reasons || [],
    })),
    computedAt: Date.now(),
  };
}

export const LEVEL_LABELS = { critique:'Critique', faible:'Faible', bon:'Bon', excellent:'Excellent' };
