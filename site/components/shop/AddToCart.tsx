'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconCheck } from '@/components/ui/Icon';
import { useCart } from '@/lib/cart';
import { classNames, price } from '@/lib/format';
import type { Product } from '@/lib/types';

/* Sélection de taille + ajout au panier.
 *
 * Règles de conversion : la taille est obligatoire et l'erreur est
 * annoncée à côté du sélecteur, pas en haut de page ; les tailles
 * épuisées restent visibles mais désactivées (l'information « ce
 * modèle existe en 43 » compte, même en rupture) ; la confirmation
 * s'affiche sous le bouton sans quitter la fiche. */

export function AddToCart({ product }: { product: Product }) {
  const { add, ready } = useCart();
  const [size, setSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const anyStock = product.sizes.some((s) => s.stock > 0);

  function onAdd() {
    if (size === null) {
      setError('Choisis une taille pour continuer.');
      return;
    }
    setError(null);
    add(product.slug, size, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 4000);
  }

  if (!anyStock) {
    return (
      <div className="border-t border-mineral-line pt-6">
        <p className="text-body font-medium text-oxide">Épuisé</p>
        <p className="measure mt-2 text-small text-mineral">
          Toutes les tailles de cette paire sont parties. Le catalogue est réapprovisionné
          au fil des arrivages — la lettre annonce les retours en stock.
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-block text-small underline decoration-mineral-line underline-offset-4 hover:decoration-ink"
        >
          Voir les paires disponibles
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t border-mineral-line pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p id="taille-label" className="text-small font-medium">
          Taille (EU)
        </p>
        <p className="text-small text-mineral">
          {product.sizes.filter((s) => s.stock > 0).length} disponibles
        </p>
      </div>

      <div role="radiogroup" aria-labelledby="taille-label" className="mt-4 flex flex-wrap gap-2">
        {product.sizes.map((s) => {
          const out = s.stock === 0;
          const on = size === s.eu;
          return (
            <button
              key={s.eu}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={out}
              onClick={() => {
                setSize(s.eu);
                setError(null);
              }}
              className={classNames(
                'press relative grid h-12 min-w-12 place-items-center rounded-xs border px-3 text-small tabular-nums',
                'transition-[border-color,background-color] duration-[180ms]',
                out
                  ? 'cursor-not-allowed border-mineral-faint text-mineral/45'
                  : on
                    ? 'border-ink bg-ink text-paper'
                    : 'border-mineral-line bg-paper-raised hover:border-ink',
              )}
            >
              {s.eu}
              {out ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1.5 top-1/2 h-px -rotate-[24deg] bg-mineral/40"
                />
              ) : null}
              {out ? <span className="sr-only"> — épuisée</span> : null}
              {!out && s.stock === 1 ? <span className="sr-only"> — dernière pièce</span> : null}
            </button>
          );
        })}
      </div>

      {size !== null && product.sizes.find((s) => s.eu === size)?.stock === 1 ? (
        <p className="mt-3 text-small text-oxide">Dernière pièce dans cette taille.</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-small text-oxide">
          {error}
        </p>
      ) : null}

      <Button size="lg" className="mt-6 w-full" onClick={onAdd} disabled={!ready}>
        Ajouter au panier — {price(product.priceCents)}
      </Button>

      {/* Confirmation en place : pas de redirection forcée vers le panier. */}
      <p
        aria-live="polite"
        className={classNames(
          'mt-3 flex items-center justify-center gap-2 text-small text-verdigris',
          'transition-opacity duration-[180ms]',
          added ? 'opacity-100' : 'opacity-0',
        )}
      >
        {added ? (
          <>
            <IconCheck className="size-4" />
            Ajouté au panier.
            <Link href="/panier" className="underline underline-offset-4">
              Voir le panier
            </Link>
          </>
        ) : (
          <span className="select-none">&nbsp;</span>
        )}
      </p>
    </div>
  );
}
