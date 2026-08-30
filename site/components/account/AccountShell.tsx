import Link from 'next/link';
import type { ReactNode } from 'react';

/* Cadre commun de l'espace client. La navigation reste identique d'une
   sous-page à l'autre pour que le repère spatial ne bouge pas. */

const links = [
  { href: '/compte', label: "Vue d'ensemble" },
  { href: '/compte/commandes', label: 'Commandes boutique' },
  { href: '/compte/entretiens', label: 'Prestations atelier' },
  { href: '/compte/adresses', label: 'Adresses' },
];

export function AccountShell({
  title,
  intro,
  current,
  children,
}: {
  title: string;
  intro?: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">{title}</h1>
      {intro ? <p className="measure mt-5 text-lead text-mineral">{intro}</p> : null}

      <div className="mt-12 grid gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <nav aria-label="Espace client" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-mineral-line pt-5 lg:flex-col lg:gap-2.5">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.href === current ? 'page' : undefined}
                  className={
                    l.href === current
                      ? 'text-small font-medium text-ink'
                      : 'text-small text-mineral transition-colors duration-[180ms] hover:text-ink'
                  }
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}

/* Message d'état honnête, réutilisé partout où l'authentification manque. */
export function NotConnected({ what }: { what: string }) {
  return (
    <div className="rounded-xs border border-mineral-line bg-paper-raised px-5 py-6">
      <h2 className="text-h4 font-medium tracking-[-0.015em]">{what}</h2>
      <p className="measure mt-3 text-small text-mineral">
        L&apos;authentification n&apos;est pas encore raccordée à cette version du site : il
        n&apos;existe aucun compte, donc rien à afficher ici. L&apos;écran est en place et
        n&apos;attend que la source de données.
      </p>
      <p className="mt-4 text-small text-mineral">
        À connecter : un fournisseur d&apos;identité (Auth.js, Clerk, Supabase Auth…) puis la
        lecture des commandes depuis la base. Voir le README.
      </p>
    </div>
  );
}
