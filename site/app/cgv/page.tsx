import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  alternates: { canonical: '/cgv' },
};

export default function Page() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      intro="Les CGV couvrent deux régimes distincts : la vente de biens (boutique) et la prestation de service sur un bien du client (atelier)."
      sections={[
        { heading: 'Objet et champ d\'application', required: "Distinguer explicitement la vente de sneakers et les prestations d'entretien : les règles de rétractation ne sont pas les mêmes." },
        { heading: 'Prix et taxes', required: "Prix TTC, devise, taxes applicables, conditions de modification des tarifs." },
        { heading: 'Commande et acceptation', required: "Étapes de la commande, moment de formation du contrat, accusé de réception." },
        { heading: 'Paiement', required: "Moyens acceptés, prestataire de paiement, moment du débit, gestion des impayés." },
        { heading: 'Livraison', required: "Zones desservies, délais, transfert des risques, procédure en cas de colis endommagé ou perdu." },
        { heading: 'Droit de rétractation — boutique', required: "Délai de 14 jours, conditions de retour, formulaire type de rétractation, prise en charge des frais de retour." },
        { heading: 'Prestations d\'atelier', required: "Renonciation au droit de rétractation une fois l'intervention commencée avec accord exprès du client (art. L221-25 du Code de la consommation), procédure de devis, cas de refus de prise en charge." },
        { heading: 'Responsabilité sur les biens confiés', required: "Régime de responsabilité pendant la détention de la paire, assurance, plafond d'indemnisation, procédure en cas de dommage." },
        { heading: 'Garanties légales', required: "Garantie légale de conformité et garantie des vices cachés, avec les mentions et délais imposés." },
        { heading: 'Réclamations et litiges', required: "Procédure de réclamation, médiation de la consommation, plateforme européenne RLL, droit applicable." },
      ]}
    />
  );
}
