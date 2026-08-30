/* ------------------------------------------------------------------ *
 * Avant / après.
 * Aucune photo réelle et aucun résultat client réel : les entrées
 * ci-dessous décrivent des interventions TYPES que l'atelier réalise,
 * et servent de gabarit. Le composant affiche un visuel de substitution
 * marqué tant que `before` et `after` sont vides.
 *
 * Pour publier un cas réel : ajoute les deux chemins d'image et
 * remplace `intervention` par ce qui a effectivement été fait.
 * ------------------------------------------------------------------ */
import type { BeforeAfterCase } from '@/lib/types';

export const beforeAfterCases: BeforeAfterCase[] = [
  {
    id: 'cuir-blanc-plis',
    intervention:
      "Cuir lisse blanc encrassé sur la pointe et le mudguard. Nettoyage en deux passes, traitement des plis, nourrissage du cuir.",
    tags: ['cuir'],
    service: 'Deep Clean',
  },
  {
    id: 'semelle-jaunie',
    intervention:
      "Semelle intercalaire oxydée par le stockage. Dégrisage progressif sous lampe, sans immersion de la tige.",
    tags: ['semelles', 'restauration'],
    service: 'Restore',
  },
  {
    id: 'suede-aureole',
    intervention:
      "Suède marqué par une auréole d'eau. Brossage à sec, égalisation de la teinte, relevage du poil à la vapeur.",
    tags: ['suede'],
    service: 'Deep Clean',
  },
  {
    id: 'mesh-running',
    intervention:
      "Mesh technique chargé de poussière et de boue sèche. Extraction à basse pression, séchage à plat contrôlé.",
    tags: ['mesh'],
    service: 'Essential Clean',
  },
  {
    id: 'teinture-tranche',
    intervention:
      "Tranche de semelle éraflée et décolorée. Ponçage léger, réencrage et reprise de teinture au raccord.",
    tags: ['restauration', 'semelles'],
    service: 'Restore',
  },
  {
    id: 'toile-grisee',
    intervention:
      "Toile blanche grisée par les lavages successifs. Détachage ciblé et remise à blanc sans agent chloré.",
    tags: ['mesh', 'cuir'],
    service: 'Deep Clean',
  },
  {
    id: 'nubuck-eraflures',
    intervention:
      "Nubuck rayé sur le flanc extérieur. Reprise de la fibre, uniformisation de la couleur, imperméabilisation.",
    tags: ['suede', 'restauration'],
    service: 'Restore',
  },
  {
    id: 'gomme-oxydee',
    intervention:
      "Semelle gomme oxydée et translucide. Nettoyage abrasif doux et retour à la teinte d'origine.",
    tags: ['semelles'],
    service: 'Deep Clean',
  },
];
