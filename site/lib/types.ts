/* Contrats de données. Tout ce qui est commercial vit dans `content/`
   et respecte ces formes — le reste du site n'en connaît pas d'autres. */

export type Condition = 'neuf' | 'neuf-sans-boite' | 'tres-bon-etat';

export const CONDITION_LABEL: Record<Condition, string> = {
  neuf: 'Neuf, en boîte',
  'neuf-sans-boite': 'Neuf, sans boîte',
  'tres-bon-etat': 'Très bon état',
};

/** Une taille et son stock réel. `stock: 0` ⇒ affichée mais non commandable. */
export interface SizeStock {
  /** Pointure EU. */
  eu: number;
  stock: number;
}

export interface Product {
  slug: string;
  brand: string;
  model: string;
  /** Nom du coloris tel qu'il figure sur la boîte. */
  colorway: string;
  condition: Condition;
  /** Prix en centimes — jamais de flottant sur de la monnaie. */
  priceCents: number;
  /** Prix barré éventuel, en centimes. */
  compareAtCents?: number;
  sizes: SizeStock[];
  /** Chemins d'images réelles. Vide ⇒ visuel de substitution généré. */
  images: string[];
  /** Deux à quatre phrases, factuelles, écrites à la main. */
  description: string;
  /** Points de contrôle constatés sur cette paire précise. */
  inspection: string[];
  releaseYear?: number;
  featured?: boolean;
}

export interface CareService {
  slug: string;
  name: string;
  /** Une ligne, ce que le client obtient. */
  summary: string;
  /** Prix plancher en centimes. `null` ⇒ sur devis uniquement. */
  fromCents: number | null;
  /** Fourchette indicative, en jours ouvrés. */
  durationDays: [number, number];
  includes: string[];
  accepts: string[];
  /** `devis` ⇒ pas de paiement en ligne, l'atelier chiffre après diagnostic. */
  billing: 'direct' | 'devis';
}

export interface FaqItem {
  question: string;
  answer: string;
  /** Regroupement affiché sur /faq. */
  topic: 'atelier' | 'boutique' | 'commande';
}

export type BeforeAfterTag = 'cuir' | 'suede' | 'mesh' | 'semelles' | 'restauration';

export const BEFORE_AFTER_TAG_LABEL: Record<BeforeAfterTag, string> = {
  cuir: 'Cuir',
  suede: 'Suède',
  mesh: 'Mesh',
  semelles: 'Semelles',
  restauration: 'Restauration',
};

export interface BeforeAfterCase {
  id: string;
  /** Ce qui a été fait, factuellement. Aucun témoignage client inventé. */
  intervention: string;
  tags: BeforeAfterTag[];
  service: string;
  /** Images réelles. Vide ⇒ substitution générée et marquée comme telle. */
  before?: string;
  after?: string;
}

/** Étapes de suivi d'une prestation d'atelier, dans l'ordre. */
export const CARE_STATUSES = [
  'Commande reçue',
  'Paire attendue',
  'Paire reçue',
  'Diagnostic',
  'Nettoyage en cours',
  'Contrôle',
  'Prête',
  'Expédiée / récupérable',
  'Terminée',
] as const;

export type CareStatus = (typeof CARE_STATUSES)[number];

export interface CartLine {
  slug: string;
  eu: number;
  qty: number;
}
