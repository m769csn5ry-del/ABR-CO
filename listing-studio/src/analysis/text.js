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
export const TRUST_MARKERS = [/\b\d+\s?m²/i, /\b\d+\s?(minute|min)\b/i, /\bDPE\b/i, /\bclasse\s+[A-G]\b/i, /\bétage\b/i, /\bcopropriété\b/i, /\bcharges\b/i, /\bhonoraires\b/i, /\btaxe foncière\b/i, /\bdisponible\b/i, /\bconstruit en \d{4}\b/i, /\b\d{4}\b/];

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
  return {
    surface: /\b\d+([.,]\d+)?\s?m²/i.test(t),
    rooms: /\b\d+\s?(pièces?|p\b|T\d|F\d)/i.test(t),
    bedrooms: /\bchambres?\b/i.test(t),
    floor: /\bétage\b|\brez-de-chaussée\b|\brdc\b/i.test(t),
    price: /\d[\d\s]{2,}\s?(€|euros)/i.test(t),
    charges: /\bcharges?\b/i.test(t),
    dpe: /\bDPE\b|\bclasse\s+[A-G]\b|\bénergie\b|\bGES\b/i.test(t),
    fees: /\bhonoraires?\b|\bfrais d['’]agence\b/i.test(t),
    availability: /\bdisponible\b|\blibre\b|\bà partir du\b/i.test(t),
    transport: /\btram\b|\bmétro\b|\bbus\b|\bgare\b|\bminutes? (à pied|en voiture)\b/i.test(t),
    year: /\b(19|20)\d{2}\b/.test(t),
    exterior: /\bbalcon\b|\bterrasse\b|\bjardin\b|\bcour\b|\bloggia\b/i.test(t),
    parking: /\bparking\b|\bgarage\b|\bstationnement\b/i.test(t),
    condo: /\bcopropriété\b|\blots?\b|\bsyndic\b/i.test(t),
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
