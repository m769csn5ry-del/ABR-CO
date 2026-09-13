/* Socle des « Platform Adapters ».
 *
 * Chaque plateforme possède ses propres règles de mise en forme (longueurs,
 * sections attendues, contenus interdits). Un adaptateur ne fait que
 * RE-FORMATER le contenu déjà généré : il n'invente jamais d'information.
 *
 * Ajouter une plateforme = créer un fichier exportant `defineAdapter({...})`
 * et l'enregistrer dans platforms/index.js. Rien d'autre à modifier.
 */

import { trimTo, words } from '../core/util.js';

export const DEFAULT_LIMITS = {
  title: 80,
  short: 400,
  long: 6000,
  bulletCount: 12,
};

/** Coupe proprement et signale le dépassement au lieu de tronquer en silence. */
export function fit(text, limit){
  const t = String(text || '').trim();
  if (!limit || t.length <= limit) return { text: t, cut: false, len: t.length };
  return { text: trimTo(t, limit), cut: true, len: t.length };
}

export const bullets = (arr, mark = '- ') =>
  (arr || []).filter(Boolean).map(s => mark + String(s).replace(/\s+/g, ' ').trim()).join('\n');

export const paragraphs = (arr) => (arr || []).filter(Boolean).join('\n\n');

/** Certaines plateformes refusent coordonnées et liens dans le texte libre. */
export function stripContacts(text){
  return String(text || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, '')
    .replace(/(\+\d{1,3}[ .-]?)?(\d[ .-]?){9,}\d/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function defineAdapter(def){
  const limits = { ...DEFAULT_LIMITS, ...(def.limits || {}) };
  return {
    group: 'Autres',
    rules: [],
    tonePreference: null,
    ...def,
    limits,

    /** Contrôles de conformité affichés à l'utilisateur. */
    check(content){
      const out = [];
      const title = content.title || '';
      if (!title) out.push({ level:'bad', msg:'Titre manquant.' });
      else if (title.length > limits.title)
        out.push({ level:'warn', msg:`Titre de ${title.length} caractères — ${this.label} en accepte ${limits.title}. Le texte sera coupé à l'export.` });
      const long = content.longDescription || '';
      if (long.length > limits.long)
        out.push({ level:'warn', msg:`Description longue de ${long.length} caractères pour une limite de ${limits.long}.` });
      if (words(long) < 60)
        out.push({ level:'warn', msg:'Description longue très courte : moins de 60 mots.' });
      (def.extraChecks || []).forEach(fn => { const r = fn(content); if (r) out.push(r); });
      return out;
    },

    /** Rend le contenu au format de la plateforme. */
    compose(content, ctx = {}){
      const blocks = def.build(content, { ...ctx, fit, bullets, paragraphs, stripContacts, limits });
      const warnings = this.check(content);
      const flat = blocks
        .filter(b => b.text && String(b.text).trim())
        .map(b => (b.label ? `${b.label.toUpperCase()}\n${b.text}` : b.text))
        .join('\n\n');
      return { platform: this.id, label: this.label, blocks, warnings, text: flat };
    },
  };
}
