import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';
import { site } from '@/content/site';
import { price, delay } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Livraison et retours',
  alternates: { canonical: '/livraison-retours' },
};

export default function Page() {
  return (
    <LegalPage
      title="Livraison et retours"
      intro="Conditions d'expédition des commandes boutique et de retour des paires confiées à l'atelier."
      sections={[
        { heading: 'Transporteurs et zones', required: "Transporteurs retenus, zones desservies, options de livraison (domicile, point relais), et conditions hors France métropolitaine." },
        { heading: 'Délais garantis', required: "Distinguer le délai de préparation du délai de transport, et préciser ce qui est garanti contractuellement." },
        { heading: 'Suivi et colis perdu', required: "Modalités de suivi, délai avant déclaration de perte, procédure de réclamation." },
        { heading: 'Retour d\'un achat', required: "Adresse de retour, formulaire, état exigé de la paire, délai de remboursement, prise en charge des frais." },
        { heading: 'Envoi d\'une paire à l\'atelier', required: "Adresse de réception, emballage recommandé, assurance conseillée, mention de la référence dans le colis." },
      ]}
    >
      <div className="mt-8 max-w-3xl border-t border-mineral-line pt-6">
        <h2 className="text-h4 font-medium tracking-[-0.015em]">Ce qui est déjà paramétré</h2>
        <dl className="mt-5 flex flex-col gap-3 text-small">
          <div className="flex justify-between gap-6 border-b border-mineral-line pb-3">
            <dt className="text-mineral">Frais de port boutique</dt>
            <dd className="tabular-nums">{price(site.shipping.flatCents)}</dd>
          </div>
          {site.shipping.freeAboveCents !== null ? (
            <div className="flex justify-between gap-6 border-b border-mineral-line pb-3">
              <dt className="text-mineral">Port offert à partir de</dt>
              <dd className="tabular-nums">{price(site.shipping.freeAboveCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 border-b border-mineral-line pb-3">
            <dt className="text-mineral">Délai de livraison</dt>
            <dd>{delay(site.shipping.deliveryDays)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-mineral-line pb-3">
            <dt className="text-mineral">Retour de la paire après atelier</dt>
            <dd className="tabular-nums">{price(site.shipping.careReturnCents)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-mineral">Délai de rétractation</dt>
            <dd>{site.returns.days} jours</dd>
          </div>
        </dl>
        <p className="mt-5 text-small text-mineral">
          Ces valeurs viennent de <code className="text-ink">content/site.ts</code> et se
          modifient à un seul endroit.
        </p>
      </div>
    </LegalPage>
  );
}
