/* Accords et articles — la langue générée doit être irréprochable :
   un texte mal accordé décrédibilise immédiatement une annonce. */

const FEM_EXCEPTIONS = {
  'beau':'belle', 'nouveau':'nouvelle', 'vieux':'vieille', 'frais':'fraîche',
  'blanc':'blanche', 'doux':'douce', 'sec':'sèche', 'net':'nette', 'gros':'grosse',
  'bas':'basse', 'épais':'épaisse', 'favori':'favorite', 'long':'longue',
};
const INVARIABLE = new Set([
  'premium','chic','snob','standard','design','cosy','sympa','super','extra','bohème',
]);

/** Accorde un adjectif au féminin (et au pluriel si demandé). */
export function agree(adj, gender = 'm', plural = false){
  if (!adj) return '';
  const parts = String(adj).split(' ');
  // « bien agencé », « idéal pour visiter », « baigné de lumière »
  let idx = 0;
  if (parts.length > 1 && ['bien','très','tout','plutôt'].includes(parts[0].toLowerCase())) idx = 1;
  let w = parts[idx];
  if (gender === 'f') w = femOf(w);
  if (plural) w = plOf(w);
  parts[idx] = w;
  return parts.join(' ');
}

function femOf(w){
  const low = w.toLowerCase();
  if (INVARIABLE.has(low)) return w;
  if (FEM_EXCEPTIONS[low]) return match(w, FEM_EXCEPTIONS[low]);
  if (/e$/.test(low) && !/é$/.test(low)) return w;              // moderne, sobre, calme
  if (/eux$/.test(low)) return match(w, low.replace(/eux$/, 'euse'));
  if (/eur$/.test(low)) return match(w, low.replace(/eur$/, 'euse'));
  if (/if$/.test(low)) return match(w, low.replace(/if$/, 'ive'));
  if (/(el|ul|eil)$/.test(low)) return match(w, low + 'le');
  if (/(en|on)$/.test(low)) return match(w, low + 'ne');
  if (/et$/.test(low)) return match(w, low + 'te');
  if (/er$/.test(low)) return match(w, low.replace(/er$/, 'ère'));
  return match(w, low + 'e');
}
function plOf(w){
  const low = w.toLowerCase();
  if (/(s|x)$/.test(low)) return w;
  if (/(al)$/.test(low)) return match(w, low.replace(/al$/, 'aux'));
  if (/(eau)$/.test(low)) return match(w, low + 'x');
  return match(w, low + 's');
}
/** Conserve la casse initiale du mot source. */
function match(src, out){
  return /^[A-ZÀ-Ý]/.test(src) ? out.charAt(0).toUpperCase() + out.slice(1) : out;
}

const VOWEL = /^[aeiouyàâäéèêëîïôöûüh]/i;

/** Articles accordés au type de bien. */
export function articles(type){
  const f = type.g === 'f';
  const vowel = type.vowel || VOWEL.test(type.noun);
  return {
    un:  f ? 'une' : 'un',
    Un:  f ? 'Une' : 'Un',
    ce:  f ? 'cette' : (vowel ? 'cet' : 'ce'),
    Ce:  f ? 'Cette' : (vowel ? 'Cet' : 'Ce'),
    le:  vowel ? "l'" : (f ? 'la ' : 'le '),
    Le:  vowel ? "L'" : (f ? 'La ' : 'Le '),
    du:  vowel ? "de l'" : (f ? 'de la ' : 'du '),
    au:  vowel ? "à l'" : (f ? 'à la ' : 'au '),
    g:   f ? 'f' : 'm',
  };
}

/** Minuscule d'un libellé, sauf noms propres et sigles (TV, Wi-Fi, Netflix). */
export function soft(label, keepCase = false){
  const s = String(label || '');
  if (keepCase) return s;
  if (/[A-Z]{2,}/.test(s)) return s;                 // sigle
  if (/\b[A-Z][a-z]+\b.*\b[A-Z]/.test(s)) return s;  // plusieurs capitales : nom propre
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Termine proprement une phrase (ponctuation unique, espace insécable FR). */
export function sentence(text){
  let t = String(text || '').trim().replace(/\s{2,}/g, ' ');
  if (!t) return '';
  t = t.replace(/\s+([,.;])/g, '$1');
  // Espace insécable avant : ; ! ? (typographie française) — jamais dans une
  // heure (16:00) ni un ratio (18/20).
  t = t.replace(/([^\d\s])[ \u00a0]*([:;!?])(?=\s|$)/g, '$1\u00a0$2');
  t = t.replace(/[ \u00a0]*·[ \u00a0]*/g, ' · ');
  if (!/[.!?…»]$/.test(t)) t += '.';
  return t;
}

/** Assemble une suite de phrases en un paragraphe propre. */
export const para = (arr) => arr.filter(Boolean).map(sentence).join(' ');

/** Élide « de » devant une voyelle : de + Espagne -> d'Espagne. */
export const de = (word) => (VOWEL.test(String(word || '')) ? `d’${word}` : `de ${word}`);
