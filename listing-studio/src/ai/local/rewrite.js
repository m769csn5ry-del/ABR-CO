/* Transformations de texte appliquées par l'assistant.
   Elles ne créent aucun fait nouveau : elles retirent, réordonnent ou
   réintègrent des éléments déjà présents dans le contenu généré. */

import { words, trimTo } from '../../core/util.js';
import { sentence } from './grammar.js';

const splitSentences = (p) => p.match(/[^.!?…]+[.!?…]*/g)?.map(s => s.trim()).filter(Boolean) || [p];

/** Raccourcit un texte en supprimant les phrases les moins porteuses. */
export function shorten(text, factor = 0.6){
  const target = Math.max(160, Math.round(text.length * factor));
  let paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  // On retire d'abord la conclusion, puis les dernières phrases des paragraphes
  // les plus longs, jamais la première phrase (elle porte le positionnement).
  while (paragraphs.join('\n\n').length > target && paragraphs.length > 2){
    const sizes = paragraphs.map(p => p.length);
    const idx = sizes.lastIndexOf(Math.max(...sizes.slice(1)));
    const s = splitSentences(paragraphs[idx]);
    if (s.length <= 1){ paragraphs.splice(idx, 1); continue; }
    s.pop();
    paragraphs[idx] = s.join(' ');
  }
  return paragraphs.join('\n\n');
}

/** Rallonge en réintégrant des éléments factuels déjà connus du contenu. */
export function lengthen(content, target = 1.5){
  const base = content.longDescription || '';
  const goal = Math.round(base.length * target);
  const extras = [];

  const rooms = (content.rooms || []).map(r => r.line || `${r.name} : ${r.text}`).join(' ');
  if (rooms && !base.includes(rooms.slice(0, 40))) extras.push(rooms);

  const prac = (content.practical || []).map(p => `${p.k} : ${p.v}`).join(' · ');
  if (prac) extras.push(`Informations pratiques — ${prac}.`);

  const attractions = (content.attractions || []).map(a => `${a.name} (${a.note})`).join(', ');
  if (attractions) extras.push(`À proximité : ${attractions}.`);

  const services = (content.services || []).join(', ');
  if (services) extras.push(`Services inclus : ${services}.`);

  const tips = (content.tips || []).join(' ');
  if (tips) extras.push(tips);

  let out = base;
  for (const e of extras){
    if (out.length >= goal) break;
    out += '\n\n' + sentence(e);
  }
  return out;
}

/** Résumé court reconstruit depuis les phrases d'ouverture. */
export function summarize(text, max = 320){
  const first = text.split(/\n\n+/)[0] || text;
  const s = splitSentences(first);
  let out = '';
  for (const x of s){
    if ((out + ' ' + x).trim().length > max) break;
    out = (out + ' ' + x).trim();
  }
  return out || trimTo(text, max);
}

export const wordCount = words;
