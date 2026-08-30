import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Confidentialité',
  alternates: { canonical: '/confidentialite' },
};

export default function Page() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="Traitement des données personnelles au sens du RGPD."
      sections={[
        { heading: 'Responsable de traitement', required: "Identité et coordonnées du responsable, et du DPO s'il en existe un." },
        { heading: 'Données collectées', required: "Lister par finalité : compte client, commande boutique, demande d'atelier (dont les photos envoyées), lettre d'information, formulaire de contact." },
        { heading: 'Finalités et bases légales', required: "Exécution du contrat, obligation légale, intérêt légitime ou consentement — à préciser pour chaque traitement." },
        { heading: 'Durées de conservation', required: "Durée par catégorie de données, y compris les photos de diagnostic transmises par les clients." },
        { heading: 'Destinataires et sous-traitants', required: "Prestataire de paiement, hébergeur, transporteur, service d'e-mailing, stockage des photos — avec les transferts hors UE éventuels." },
        { heading: 'Droits des personnes', required: "Accès, rectification, effacement, opposition, portabilité, limitation, et modalités d'exercice." },
        { heading: 'Cookies et traceurs', required: "Inventaire des cookies, finalités, durées, et mécanisme de recueil du consentement s'il y a des traceurs non essentiels." },
        { heading: 'Réclamation', required: "Droit d'introduire une réclamation auprès de la CNIL." },
      ]}
    >
      <p className="measure mt-6 text-small text-mineral">
        En l&apos;état actuel, ce site ne dépose aucun cookie de mesure d&apos;audience ni de
        publicité. Le panier est conservé dans le stockage local du navigateur, sur l&apos;appareil
        du visiteur uniquement, et n&apos;est transmis à aucun serveur.
      </p>
    </LegalPage>
  );
}
