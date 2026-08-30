import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Mentions légales',
  alternates: { canonical: '/mentions-legales' },
};

export default function Page() {
  return (
    <LegalPage
      title="Mentions légales"
      intro="Identification de l'éditeur, de l'hébergeur et du directeur de publication."
      sections={[
        { heading: "Éditeur du site", required: "Dénomination sociale, forme juridique, capital social, adresse du siège, numéro RCS et ville d'immatriculation, numéro de TVA intracommunautaire." },
        { heading: 'Directeur de la publication', required: "Nom et prénom de la personne physique responsable de la publication." },
        { heading: 'Contact', required: "Adresse e-mail et numéro de téléphone permettant de joindre l'éditeur directement." },
        { heading: 'Hébergeur', required: "Nom, dénomination sociale, adresse et numéro de téléphone de l'hébergeur du site." },
        { heading: 'Propriété intellectuelle', required: "Régime applicable aux contenus, marques et visuels publiés, et conditions de reprise." },
        { heading: 'Médiation de la consommation', required: "Nom et coordonnées du médiateur de la consommation auquel l'entreprise adhère — obligatoire pour un vendeur en ligne aux particuliers." },
      ]}
    />
  );
}
