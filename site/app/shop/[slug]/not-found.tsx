import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';

export default function ProductNotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20">
      <h1 className="text-h2 font-semibold tracking-[-0.025em]">Cette paire n&apos;est plus là</h1>
      <p className="measure mt-5 text-lead text-mineral">
        Le lien est peut-être ancien, ou la paire a été vendue. Le catalogue est mis à jour
        à chaque arrivage.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Voir le catalogue</ButtonLink>
        <Link
          href="/contact"
          className="press inline-flex min-h-11 items-center rounded-xs border border-ink/25 px-5 text-small font-medium transition-colors duration-[180ms] hover:border-ink"
        >
          Chercher un modèle précis
        </Link>
      </div>
    </div>
  );
}
