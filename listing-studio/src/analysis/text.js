/* Mesures de texte — déterministes, reproductibles, sans IA.
 *
 * Ces mesures sont la base factuelle de l'analyse : deux exécutions sur le
 * même texte donnent exactement le même résultat, ce qui rend le score
 * défendable devant un client.
 */

const STOP = new Set(['le','la','les','un','une','des','de','du','au','aux','et','ou','en','à','dans','pour','par','sur','avec','sans','ce','cet','cette','ces','son','sa','ses','est','sont','vous','nous','il','elle','plus','très','tout','toute']);

/** Superlatifs et adjectifs invérifiables : ils occupent la place d'un fait. */
export const EMPTY_WORDS = ['superbe','magnifique','sublime','exceptionnel','idéal','idéale','rare','unique','coup de cœur','incontournable','splendide','somptueux','charmant','joli','belle','beau','agréable','sympathique','parfait','parfaite','excellent','formidable','extraordinaire','fantastique','merveilleux','à ne pas manquer','à saisir','immanquable'];

/** Marqueurs de confiance : des faits vérifiables plutôt que des promesses. */
/* `\b` de JavaScript s'appuie sur [A-Za-z0-9_] : devant « étage » ou derrière
   « copropriété », la lettre accentuée n'est pas un caractère de mot et la
   limite ne se produit jamais. Un mot accentué encadré de `\b` ne se trouve
   donc jamais. On construit les limites sur les lettres Unicode. */
export const word = (source) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');

export const TRUST_MARKERS = [
  /\d+\s?m²/i, word(String.raw`\d+\s?(?:minutes?|min)`), word('DPE'),
  word(String.raw`classe\s+[A-G]`), word('étages?'), word('copropriété'),
  word('charges?'), word('honoraires'), word('taxe foncière'),
  word('disponible'), word(String.raw`construit en \d{4}`), word(String.raw`\d{4}`),
];

const CTA = [/contact/i, /appel/i, /téléphon/i, /visite/i, /rendez-vous/i, /réserv/i, /disponib/i, /écrivez/i, /message/i, /informations? complémentaires?/i];

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const lower = (s) => norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function sentences(text){
  return String(text || '').split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 1);
}
export function words(text){
  return lower(text).split(/[^a-z0-9²€'-]+/).filter(w => w.length > 1);
}

/** Indice de lisibilité simplifié, calibré pour le français.
 *  Plus la valeur est haute, plus le texte est facile. */
export function readability(text){
  const s = sentences(text), w = words(text);
  if (!s.length || !w.length) return { score:0, avgSentence:0, avgWord:0 };
  const avgSentence = w.length / s.length;
  const avgWord = w.reduce((a, x) => a + x.length, 0) / w.length;
  const raw = 207 - 1.015 * avgSentence - 73.6 * (avgWord / 5.5);
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    avgSentence: Math.round(avgSentence * 10) / 10,
    avgWord: Math.round(avgWord * 10) / 10,
  };
}

/** Répétitions : mots pleins employés plus de 3 fois. */
export function repetitions(text){
  const counts = new Map();
  words(text).filter(w => !STOP.has(w) && w.length > 3).forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
  return Array.from(counts).filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word, n]) => ({ word, count:n }));
}

export function emptyWords(text){
  const t = lower(text);
  return EMPTY_WORDS.filter(w => t.includes(lower(w))).map(w => w);
}

export function structure(text){
  const raw = String(text || '');
  const paragraphs = raw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const bullets = (raw.match(/^\s*[-•*—]\s+/gm) || []).length;
  const upperRatio = raw.length ? (raw.match(/[A-ZÀ-Ý]/g) || []).length / raw.length : 0;
  const exclamations = (raw.match(/!/g) || []).length;
  return {
    paragraphs: paragraphs.length,
    longestParagraphWords: Math.max(0, ...paragraphs.map(p => words(p).length)),
    bullets, upperRatio: Math.round(upperRatio * 1000) / 1000, exclamations,
    allCapsWords: (raw.match(/\b[A-ZÀ-Ý]{4,}\b/g) || []).length,
  };
}

export const hasCTA = (text) => CTA.some(rx => rx.test(String(text || '')));
export const trustScore = (text) => TRUST_MARKERS.filter(rx => rx.test(String(text || ''))).length;

/** Données chiffrées effectivement présentes dans le texte. */
export function facts(text){
  const t = String(text || '');
  const has = (src) => word(src).test(t);
  return {
    surface: /\d+([.,]\d+)?\s?m²/i.test(t),
    rooms: has(String.raw`\d+\s?(?:pièces?|p|T\d|F\d)`),
    bedrooms: has('chambres?'),
    floor: has('étages?') || has('rez-de-chaussée') || has('rdc'),
    price: /\d[\d\s]{2,}\s?(€|euros)/i.test(t),
    charges: has('charges?'),
    dpe: has('DPE') || has(String.raw`classe\s+[A-G]`) || has('énergie') || has('GES'),
    fees: has('honoraires?') || has(String.raw`frais d['’]agence`),
    availability: has('disponible') || has('libre') || has('à partir du'),
    transport: has('tram') || has('métro') || has('bus') || has('gare')
      || has(String.raw`\d+\s?minutes?\s+(?:à pied|en voiture)`),
    year: /\b(19|20)\d{2}\b/.test(t),
    exterior: has('balcon') || has('terrasse') || has('jardin') || has('cour') || has('loggia'),
    parking: has('parking') || has('garage') || has('stationnement'),
    condo: has('copropriété') || has('lots?') || has('syndic'),
  };
}

/** Mots-clés porteurs, hors mots vides et hors superlatifs. */
export function keywords(text, limit = 12){
  const counts = new Map();
  const empties = new Set(EMPTY_WORDS.map(lower));
  words(text).filter(w => !STOP.has(w) && w.length > 3 && !empties.has(w))
    .forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
  return Array.from(counts).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export function measure({ title = '', description = '' }){
  const full = `${title}\n\n${description}`;
  return {
    title:{
      text: norm(title), length: norm(title).length, words: words(title).length,
      empty: emptyWords(title), allCaps: (title.match(/\b[A-ZÀ-Ý]{4,}\b/g) || []).length,
      exclamations: (title.match(/!/g) || []).length,
      hasNumber: /\d/.test(title),
    },
    description:{
      length: norm(description).length, words: words(description).length,
      sentences: sentences(description).length,
      readability: readability(description),
      structure: structure(description),
      repetitions: repetitions(description),
      empty: emptyWords(description),
    },
    facts: facts(full),
    keywords: keywords(full),
    cta: hasCTA(full),
    trustMarkers: trustScore(full),
  };
}
