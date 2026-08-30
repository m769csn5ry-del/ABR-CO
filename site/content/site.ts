/* ------------------------------------------------------------------ *
 * Informations commerciales. C'est le SEUL fichier à remplir avant
 * une mise en ligne. Tout ce qui vaut `null` est volontairement vide :
 * aucune coordonnée, adresse ou mention légale n'a été inventée.
 * Les composants qui les consomment masquent proprement les champs vides.
 * ------------------------------------------------------------------ */

export const site = {
  name: 'NEUF',
  tagline: 'Sneakers neuves. Paires remises à neuf.',
  description:
    "Boutique de sneakers neuves authentifiées et atelier de nettoyage et de restauration. Deux métiers, une maison.",

  /** Sans slash final. Sert au sitemap, aux URLs canoniques et à l'Open Graph. */
  url: 'https://example.com',

  /** — À RENSEIGNER ——————————————————————————————— */
  email: null as string | null,
  phone: null as string | null,
  /** Adresse de l'atelier, pour le dépôt en main propre. */
  address: null as {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  } | null,
  /** Horaires d'ouverture au dépôt, une ligne par jour ou plage. */
  openingHours: [] as string[],

  socials: {
    instagram: null as string | null,
    tiktok: null as string | null,
  },

  /** — Conditions commerciales —————————————————————— */
  shipping: {
    /** Franco de port à partir de ce montant, en centimes. `null` ⇒ jamais offert. */
    freeAboveCents: 20000,
    /** Frais forfaitaires en centimes. */
    flatCents: 690,
    /** Frais de retour de la paire après prestation d'atelier. */
    careReturnCents: 890,
    /** Délai indicatif, en jours ouvrés. */
    deliveryDays: [2, 4] as [number, number],
  },
  returns: {
    /** Délai légal de rétractation en France : 14 jours. */
    days: 14,
  },
  currency: 'EUR',
  locale: 'fr-FR',
} as const;

/** Codes promotionnels de démonstration. À remplacer par la table du back-office. */
export const promoCodes: Record<string, { label: string; percentOff: number }> = {
  NEUF10: { label: 'Première commande', percentOff: 10 },
};
