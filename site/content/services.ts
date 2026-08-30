/* Prestations de l'atelier. Noms, prix, durées et contenus se modifient ici :
   le parcours de commande, la page /nettoyage et le récapitulatif s'y adaptent. */
import type { CareService } from '@/lib/types';

export const services: CareService[] = [
  {
    slug: 'essential-clean',
    name: 'Essential Clean',
    summary: "Le nettoyage extérieur, pour une paire portée régulièrement et sans dommage.",
    fromCents: 2500,
    durationDays: [3, 5],
    includes: [
      'Dépoussiérage et brossage à sec',
      'Nettoyage de la tige selon la matière',
      'Nettoyage de la semelle extérieure',
      'Lacets lavés ou remplacés par des neufs',
      'Séchage contrôlé à température ambiante',
    ],
    accepts: ['Cuir', 'Cuir synthétique', 'Toile', 'Mesh', 'Textile technique'],
    billing: 'direct',
  },
  {
    slug: 'deep-clean',
    name: 'Deep Clean',
    summary: "Le nettoyage approfondi : intérieur, intercalaire et semelle, traités séparément.",
    fromCents: 4500,
    durationDays: [5, 8],
    includes: [
      "Tout le contenu de l'Essential Clean",
      'Démontage des lacets et traitement des œillets',
      "Nettoyage de l'intérieur et traitement anti-odeur",
      'Dégrisage de la semelle intercalaire',
      'Détachage ciblé selon la nature de la tache',
      'Imperméabilisation adaptée à la matière',
    ],
    accepts: ['Cuir', 'Suède', 'Nubuck', 'Toile', 'Mesh', 'Textile technique'],
    billing: 'direct',
  },
  {
    slug: 'restore',
    name: 'Restore',
    summary:
      "La remise en état lourde : jaunissement, teinture, reprise de matière. Chiffrée après diagnostic.",
    fromCents: null,
    durationDays: [10, 21],
    includes: [
      'Tout le contenu du Deep Clean',
      'Traitement du jaunissement de la semelle',
      'Reprise de teinture et raccords de couleur',
      'Recoloration ou réencrage des tranches',
      'Petits recollages de semelle',
      'Photographies du diagnostic avant intervention',
    ],
    accepts: ['Cuir', 'Suède', 'Nubuck', 'Toile', 'Mesh'],
    billing: 'devis',
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);

/** Problèmes proposés à l'étape 4 du parcours. */
export const CARE_ISSUES = [
  { id: 'taches', label: 'Taches' },
  { id: 'semelle-sale', label: 'Semelle sale' },
  { id: 'jaunissement', label: 'Jaunissement' },
  { id: 'odeur', label: 'Odeur' },
  { id: 'lacets', label: 'Lacets à remplacer' },
  { id: 'eraflures', label: 'Éraflures' },
  { id: 'autre', label: 'Autre' },
] as const;

/** Matières proposées à l'étape 3. « Je ne sais pas » est une réponse valide. */
export const CARE_MATERIALS = [
  'Cuir',
  'Cuir synthétique',
  'Suède',
  'Nubuck',
  'Toile',
  'Mesh',
  'Textile technique',
  'Je ne sais pas',
] as const;
