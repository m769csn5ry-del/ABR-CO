import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { mainNav } from '@/components/layout/nav';

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-20">
      <p className="font-serif text-h3 text-verdigris">404</p>
      <h1 className="mt-4 text-h2 font-semibold tracking-[-0.025em]">Cette page n&apos;existe pas</h1>
      <p className="measure mt-5 text-lead text-mineral">
        Le lien est peut-être ancien, ou l&apos;adresse comporte une faute.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Voir le catalogue</ButtonLink>
        <ButtonLink href="/nettoyage" variant="care">
          Nettoyer ma paire
        </ButtonLink>
      </div>

      <nav aria-label="Pages principales" className="mt-14 border-t border-mineral-line pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-small text-mineral transition-colors duration-[180ms] hover:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
