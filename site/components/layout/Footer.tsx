import Link from 'next/link';
import { legalNav } from './nav';
import { Newsletter } from './Newsletter';
import { site } from '@/content/site';

/* Pied de page. Trois colonnes de liens réels + la lettre.
   Les réseaux sociaux s'affichent en lien dès que l'URL est renseignée
   dans content/site.ts ; sans URL, le libellé reste visible mais inerte —
   on n'invente pas de compte et on ne publie pas de lien mort. */

const shopLinks = [
  { href: '/shop', label: 'Toutes les paires' },
  { href: '/shop?dispo=en-stock', label: 'En stock' },
  { href: '/panier', label: 'Panier' },
  { href: '/compte/commandes', label: 'Mes commandes' },
];

const careLinks = [
  { href: '/nettoyage', label: 'Les prestations' },
  { href: '/nettoyage/commande', label: 'Commander un nettoyage' },
  { href: '/avant-apres', label: 'Avant / Après' },
  { href: '/suivi', label: 'Suivre ma paire' },
];

const houseLinks = [
  { href: '/a-propos', label: 'À propos' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

function Social({ label, href }: { label: string; href: string | null }) {
  if (href) {
    return (
      <li>
        <a
          href={href}
          rel="me noreferrer"
          target="_blank"
          className="inline-flex min-h-11 items-center text-small text-mineral transition-colors duration-[180ms] hover:text-ink lg:min-h-0 lg:py-0.5"
        >
          {label}
        </a>
      </li>
    );
  }
  return (
    <li>
      <span className="inline-flex min-h-11 items-center text-small text-mineral/60 lg:min-h-0 lg:py-0.5" title="Compte à renseigner dans content/site.ts">
        {label}
      </span>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-mineral-line bg-paper-raised lg:mt-40">
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.2fr_repeat(3,minmax(0,0.8fr))] lg:gap-10 lg:py-20">
        <div className="flex flex-col gap-5">
          <p className="text-[1.0625rem] font-semibold uppercase tracking-[0.08em]">NEUF</p>
          <p className="measure-tight text-small text-mineral">{site.tagline}</p>
          <Newsletter />
        </div>

        <nav aria-labelledby="pied-boutique" className="flex flex-col gap-4">
          <h2 id="pied-boutique" className="text-small font-medium">
            Boutique
          </h2>
          <ul className="flex flex-col gap-0.5 lg:gap-2.5">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center text-small text-mineral transition-colors duration-[180ms] hover:text-ink lg:min-h-0 lg:py-0.5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="pied-atelier" className="flex flex-col gap-4">
          <h2 id="pied-atelier" className="text-small font-medium">
            Atelier
          </h2>
          <ul className="flex flex-col gap-0.5 lg:gap-2.5">
            {careLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center text-small text-mineral transition-colors duration-[180ms] hover:text-ink lg:min-h-0 lg:py-0.5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="pied-maison" className="flex flex-col gap-4">
          <h2 id="pied-maison" className="text-small font-medium">
            La maison
          </h2>
          <ul className="flex flex-col gap-0.5 lg:gap-2.5">
            {houseLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center text-small text-mineral transition-colors duration-[180ms] hover:text-ink lg:min-h-0 lg:py-0.5"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <Social label="Instagram" href={site.socials.instagram} />
            <Social label="TikTok" href={site.socials.tiktok} />
          </ul>
        </nav>
      </div>

      <div className="border-t border-mineral-line">
        <div className="shell flex flex-col gap-4 py-6 text-small text-mineral sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center transition-colors duration-[180ms] hover:text-ink lg:min-h-0">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p>© {new Date().getFullYear()} NEUF</p>
        </div>
      </div>
    </footer>
  );
}
