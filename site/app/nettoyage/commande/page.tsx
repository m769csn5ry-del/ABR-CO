import type { Metadata } from 'next';
import Link from 'next/link';
import { CareWizard } from '@/components/care/CareWizard';
import { serviceBySlug } from '@/content/services';

export const metadata: Metadata = {
  title: 'Commander un nettoyage',
  description:
    "Décris ta paire en neuf étapes : prestation, modèle, matière, points à traiter, photos, dépôt ou envoi.",
  alternates: { canonical: '/nettoyage/commande' },
  robots: { index: true, follow: true },
};

export default async function CareOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ prestation?: string }>;
}) {
  const { prestation } = await searchParams;
  const initial = prestation && serviceBySlug(prestation) ? prestation : '';

  return (
    <div className="shell py-12 lg:py-16">
      <nav aria-label="Fil d'Ariane" className="mb-8 text-small text-mineral">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/nettoyage" className="transition-colors duration-[180ms] hover:text-ink">
              Nettoyage
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink">Commander</li>
        </ol>
      </nav>

      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Commander un nettoyage</h1>
      <p className="measure mt-5 text-lead text-mineral">
        Neuf étapes, une question à la fois. Tu peux revenir en arrière sans rien perdre.
      </p>

      <div className="mt-14">
        <CareWizard initialService={initial} />
      </div>
    </div>
  );
}
