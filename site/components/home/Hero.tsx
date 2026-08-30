'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Visual } from '@/components/media/Visual';
import { IconArrow } from '@/components/ui/Icon';
import { classNames } from '@/lib/format';

/* ------------------------------------------------------------------ *
 * Hero — diptyque.
 *
 * Les deux métiers ne sont pas annoncés par un paragraphe : ils sont
 * la structure même du bloc. Deux panneaux, séparés par la « coupe ».
 * Survoler ou tabuler l'un atténue l'autre — le choix se voit avant
 * d'être cliqué. Aucune animation de mise en page : seules l'opacité,
 * la couleur et la transformation du filet bougent.
 * ------------------------------------------------------------------ */

type Branch = 'shop' | 'care' | null;

export function Hero() {
  const [active, setActive] = useState<Branch>(null);

  return (
    <section className="border-b border-mineral-line">
      <div className="shell pb-14 pt-14 lg:pb-20 lg:pt-24">
        <h1 className="measure text-display font-semibold tracking-[-0.03em] text-balance">
          Neuve, ou comme neuve.
        </h1>
        <p className="measure mt-7 text-lead text-mineral">
          NEUF vend des sneakers neuves contrôlées à la main, et remet en état celles que
          tu as déjà. Deux métiers, un même atelier.
        </p>
      </div>

      <div
        className="grid border-t border-mineral-line lg:grid-cols-2"
        onMouseLeave={() => setActive(null)}
      >
        <Panel
          href="/shop"
          branch="shop"
          active={active}
          setActive={setActive}
          title="Shopper les sneakers"
          body="Paires neuves, contrôlées en huit points, expédiées sous 48 h."
          seed="hero-shop"
          caption="Boutique"
        />
        <Panel
          href="/nettoyage"
          branch="care"
          active={active}
          setActive={setActive}
          title="Nettoyer ma paire"
          body="Nettoyage, entretien ou restauration, selon l'état constaté au diagnostic."
          seed="hero-care"
          caption="Atelier"
        />
      </div>
    </section>
  );
}

function Panel({
  href,
  branch,
  active,
  setActive,
  title,
  body,
  seed,
  caption,
}: {
  href: string;
  branch: Exclude<Branch, null>;
  active: Branch;
  setActive: (b: Branch) => void;
  title: string;
  body: string;
  seed: string;
  caption: string;
}) {
  const isCare = branch === 'care';
  const dimmed = active !== null && active !== branch;

  return (
    <Link
      href={href}
      onMouseEnter={() => setActive(branch)}
      onFocus={() => setActive(branch)}
      onBlur={() => setActive(null)}
      className={classNames(
        'group relative flex min-h-[19rem] flex-col justify-between gap-8 p-7 lg:min-h-[24rem] lg:p-10',
        // La coupe : filet vertical entre les deux panneaux sur grand écran.
        'border-b border-mineral-line lg:border-b-0 lg:[&+a]:border-l lg:[&+a]:border-mineral-line',
        'transition-[opacity,background-color] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        isCare ? 'bg-verdigris text-paper' : 'bg-paper text-ink',
        dimmed && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="measure-tight">
          <h2 className="text-h3 font-medium tracking-[-0.02em]">{title}</h2>
          <p className={classNames('mt-3 text-body', isCare ? 'text-paper/75' : 'text-mineral')}>
            {body}
          </p>
        </div>
        <Visual
          seed={seed}
          alt={caption}
          caption={caption}
          sizes="120px"
          className="hidden h-36 w-24 shrink-0 sm:block"
        />
      </div>

      <span className="inline-flex items-center gap-3 text-small font-medium">
        <span className="relative">
          {isCare ? 'Voir les prestations' : 'Voir le catalogue'}
          <span
            aria-hidden="true"
            className={classNames(
              'absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform',
              'duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100',
              isCare ? 'bg-paper' : 'bg-ink',
            )}
          />
        </span>
        <IconArrow className="size-4" />
      </span>
    </Link>
  );
}
