import type { Metadata } from 'next';
import { BeforeAfterGallery } from '@/components/care/BeforeAfterGallery';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Avant / Après',
  description:
    "Les types d'interventions réalisées à l'atelier, par matière : cuir, suède, mesh, semelles, restauration.",
  alternates: { canonical: '/avant-apres' },
};

export default function BeforeAfterPage() {
  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-12">
        <h1 className="text-h1 font-semibold tracking-[-0.03em]">Avant / Après</h1>
        <p className="measure mt-5 text-lead text-mineral">
          Déplace la séparation vers le haut ou vers le bas pour comparer. Au clavier :
          flèches haut et bas.
        </p>
        <p className="measure mt-4 rounded-xs border border-mineral-line bg-paper-raised px-4 py-3 text-small text-mineral">
          Ces fiches décrivent des <strong className="font-medium text-ink">interventions types</strong>,
          pas des résultats clients. Les visuels sont des substituts marqués : aucun cas réel
          n&apos;est publié tant que la paire n&apos;a pas été photographiée à l&apos;atelier,
          avant et après.
        </p>
      </header>

      <BeforeAfterGallery />

      <div className="mt-20 border-t border-mineral-line pt-10">
        <h2 className="text-h3 font-semibold tracking-[-0.025em]">Ta paire mérite le même soin</h2>
        <p className="measure mt-4 text-body text-mineral">
          Décris son état en neuf étapes. Le diagnostic photographié arrive avant toute
          intervention.
        </p>
        <ButtonLink href="/nettoyage/commande" variant="care" size="lg" className="mt-7">
          Commander un nettoyage
        </ButtonLink>
      </div>
    </div>
  );
}
