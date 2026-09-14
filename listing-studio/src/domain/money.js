/* Monnaie — arithmétique financière déterministe.
 *
 * Règle absolue : aucun montant n'est jamais stocké en flottant. Tout vit en
 * unités mineures entières (centimes), avec sa devise. Les calculs de
 * commission sont des opérations sur entiers, reproductibles au centime près,
 * et chaque opération peut produire une trace vérifiable.
 */

export const CURRENCIES = {
  EUR:{ code:'EUR', symbol:'€', minor:2, locale:'fr-FR' },
  USD:{ code:'USD', symbol:'$', minor:2, locale:'en-US' },
  GBP:{ code:'GBP', symbol:'£', minor:2, locale:'en-GB' },
  CHF:{ code:'CHF', symbol:'CHF', minor:2, locale:'de-CH' },
  SGD:{ code:'SGD', symbol:'S$', minor:2, locale:'en-SG' },
  IDR:{ code:'IDR', symbol:'Rp', minor:0, locale:'id-ID' },
};
export const currency = (code) => CURRENCIES[code] || CURRENCIES.EUR;
export const currencyCodes = () => Object.keys(CURRENCIES);

/** Un montant : { amount: entier en unités mineures, currency: 'EUR' }. */
export const money = (amount, code = 'EUR') => ({ amount: Math.round(Number(amount) || 0), currency: code });
export const zero = (code = 'EUR') => money(0, code);

/** Convertit une saisie utilisateur (« 1 250,50 ») en unités mineures. */
export function parseAmount(input, code = 'EUR'){
  if (input === null || input === undefined || input === '') return null;
  const c = currency(code);
  const normalized = String(input).replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  const value = Number(normalized);
  if (!isFinite(value)) return null;
  return money(Math.round(value * 10 ** c.minor), code);
}

const sameCurrency = (a, b) => {
  if (a.currency !== b.currency)
    throw new Error(`Devises incompatibles : ${a.currency} et ${b.currency}`);
};

export const add = (a, b) => { sameCurrency(a, b); return money(a.amount + b.amount, a.currency); };
export const sub = (a, b) => { sameCurrency(a, b); return money(a.amount - b.amount, a.currency); };
export const negate = (a) => money(-a.amount, a.currency);
export const isZero = (a) => a.amount === 0;
export const cmp = (a, b) => { sameCurrency(a, b); return a.amount - b.amount; };
export const max = (a, b) => (cmp(a, b) >= 0 ? a : b);
export const min = (a, b) => (cmp(a, b) <= 0 ? a : b);

/** Arrondi au demi-pair (banker's rounding) : sans biais systématique. */
export function roundHalfEven(value){
  const floor = Math.floor(value);
  const diff = value - floor;
  if (Math.abs(diff - 0.5) > Number.EPSILON) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Multiplication par un facteur décimal, arrondi demi-pair. */
export const multiply = (a, factor) => money(roundHalfEven(a.amount * Number(factor)), a.currency);

/** Pourcentage : percent exprimé en points (5 = 5 %). */
export const percentOf = (a, percent) => multiply(a, Number(percent) / 100);

/** Répartition sans perte de centime (la somme des parts égale le total). */
export function allocate(a, weights){
  const total = weights.reduce((s, w) => s + w, 0);
  if (!total) return weights.map(() => zero(a.currency));
  let remainder = a.amount;
  const parts = weights.map(w => {
    const share = Math.floor(a.amount * w / total);
    remainder -= share;
    return share;
  });
  for (let i = 0; remainder > 0; i = (i + 1) % parts.length, remainder--) parts[i] += 1;
  return parts.map(p => money(p, a.currency));
}

export const toDecimal = (a) => a.amount / 10 ** currency(a.currency).minor;

export function format(a, locale = null){
  if (!a) return '—';
  const c = currency(a.currency);
  return new Intl.NumberFormat(locale || c.locale, {
    style:'currency', currency:c.code, minimumFractionDigits:c.minor, maximumFractionDigits:c.minor,
  }).format(toDecimal(a));
}

/** Version courte pour les tableaux denses : 12 500 € au lieu de 12 500,00 €. */
export function formatShort(a, locale = null){
  if (!a) return '—';
  const c = currency(a.currency);
  return new Intl.NumberFormat(locale || c.locale, {
    style:'currency', currency:c.code, maximumFractionDigits:0,
  }).format(toDecimal(a));
}

export const serialize = (a) => (a ? { amount:a.amount, currency:a.currency } : null);
export const deserialize = (o) => (o && typeof o.amount === 'number' ? money(o.amount, o.currency) : null);
