import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { IconCheck } from '@/components/ui/Icon';
import { site } from '@/content/site';
import { delay } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

/* Page d'aboutissement. Elle n'est atteinte qu'après un paiement réel :
   c'est le webhook Stripe qui crée la commande et redirige ici avec sa
   référence. Sans référence, on ne prétend pas qu'une commande existe. */

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20">
      {ref ? (
        <>
          <p className="flex items-center gap-3 text-small font-medium text-verdigris">
            <IconCheck className="size-5" />
            Commande enregistrée
          </p>
          <h1 className="mt-5 text-h2 font-semibold tracking-[-0.025em]">
            Merci, c&apos;est noté
          </h1>
          <p className="measure mt-5 text-lead text-mineral">
            Ta commande <span className="font-medium text-ink">{ref}</span> est enregistrée.
            Tu reçois le récapitulatif par e-mail, puis le numéro de suivi dès l&apos;expédition.
            Livraison estimée en {delay(site.shipping.deliveryDays)}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/compte/commandes">Suivre ma commande</ButtonLink>
            <ButtonLink href="/shop" variant="quiet">
              Continuer mes achats
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-h2 font-semibold tracking-[-0.025em]">Aucune commande à afficher</h1>
          <p className="measure mt-5 text-lead text-mineral">
            Cette page présente le récapitulatif d&apos;une commande une fois le paiement abouti.
            Le prestataire de paiement n&apos;étant pas encore raccordé, aucune commande ne peut
            exister à ce stade.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/shop">Voir le catalogue</ButtonLink>
            <Link
              href="/panier"
              className="press inline-flex min-h-11 items-center rounded-xs border border-ink/25 px-5 text-small font-medium transition-colors duration-[180ms] hover:border-ink"
            >
              Retour au panier
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
