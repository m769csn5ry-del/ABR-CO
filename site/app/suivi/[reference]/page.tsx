import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusTimeline } from '@/components/care/StatusTimeline';
import { ButtonLink } from '@/components/ui/Button';
import { CARE_STATUSES } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Suivi de prestation',
  robots: { index: false, follow: false },
};

/* Écran de suivi.
 *
 * À CONNECTER : remplacer le bloc ci-dessous par la lecture de la
 * commande en base à partir de la référence, puis passer le statut réel
 * à <StatusTimeline current={...} />. La frise est déjà complète : seule
 * la source du statut change. */

export default async function TrackingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference).toUpperCase();

  // Aucune base n'est raccordée : on ne fabrique pas un faux dossier.
  const order = null as { status: (typeof CARE_STATUSES)[number] } | null;

  if (!order) {
    return (
      <div className="shell py-14 lg:py-20">
        <nav aria-label="Fil d'Ariane" className="mb-8 text-small text-mineral">
          <Link href="/suivi" className="transition-colors duration-[180ms] hover:text-ink">
            Suivi
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">{ref}</span>
        </nav>

        <h1 className="text-h2 font-semibold tracking-[-0.025em]">
          Aucun dossier pour {ref}
        </h1>
        <p className="measure mt-5 text-lead text-mineral">
          La base des prestations n&apos;est pas encore raccordée à cette version du site :
          aucune référence ne peut être retrouvée. Une fois connectée, cette page affichera
          l&apos;étape en cours parmi les neuf ci-dessous.
        </p>

        <section aria-labelledby="etapes" className="mt-14">
          <h2 id="etapes" className="text-h4 font-medium tracking-[-0.015em]">
            Les neuf étapes du suivi
          </h2>
          <div className="mt-6 max-w-2xl">
            <StatusTimeline current="Diagnostic" />
          </div>
          <p className="measure mt-6 text-small text-mineral">
            Aperçu de la frise, positionnée sur « Diagnostic » à titre d&apos;illustration.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/suivi" variant="quiet">
            Essayer une autre référence
          </ButtonLink>
          <ButtonLink href="/contact" variant="care">
            Nous écrire
          </ButtonLink>
        </div>
      </div>
    );
  }

  return null;
}
