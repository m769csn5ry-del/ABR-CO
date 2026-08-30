import { site } from '@/content/site';

/** Monnaie. Les montants circulent en centimes : jamais de flottant. */
export function price(cents: number): string {
  return new Intl.NumberFormat(site.locale, {
    style: 'currency',
    currency: site.currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** « 3 à 5 jours ouvrés », ou « 5 jours ouvrés » si la fourchette est plate. */
export function delay([min, max]: [number, number]): string {
  return min === max ? `${min} jours ouvrés` : `${min} à ${max} jours ouvrés`;
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Identifiant lisible pour une commande d'atelier. Purement local :
    le vrai numéro sera émis par le back-office. */
export function careReference(seed = Date.now()): string {
  return `NF-${seed.toString(36).toUpperCase().slice(-6)}`;
}
