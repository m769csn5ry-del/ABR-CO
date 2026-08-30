import Link from 'next/link';
import { Visual } from '@/components/media/Visual';
import { price } from '@/lib/format';
import { CONDITION_LABEL, type Product } from '@/lib/types';
import { inStock, lowStock } from '@/content/products';

/* Carte produit. Pas de caisson : le visuel, un filet, et l'information.
   Le survol n'agrandit pas l'image (effet générique) — il déplace le filet
   sous le titre et fait apparaître l'appel à l'action. */

export function ProductCard({
  product,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const available = inStock(product);
  const scarce = lowStock(product);
  const sizesLeft = product.sizes.filter((s) => s.stock > 0);

  return (
    <article className="group relative flex flex-col">
      <Visual
        src={product.images[0]}
        seed={product.slug}
        alt={`${product.brand} ${product.model}, ${product.colorway}`}
        caption={product.brand}
        sizes={sizes}
        priority={priority}
        className="aspect-[4/5] w-full"
      />

      <div className="flex flex-1 flex-col gap-1 pt-4">
        {/* Sous 640px la colonne fait ~130px : le prix ne tient pas à côté
            du titre, il passe donc dessous plutôt que de déborder. */}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className="text-body font-medium">
            {/* Le lien couvre toute la carte, mais reste un seul lien pour
                les lecteurs d'écran et la navigation clavier. */}
            <Link href={`/shop/${product.slug}`} className="before:absolute before:inset-0">
              <span className="text-mineral">{product.brand}</span> {product.model}
            </Link>
          </h3>
          <p className="text-body tabular-nums sm:shrink-0">
            {product.compareAtCents ? (
              <>
                <span className="sr-only">Prix réduit : </span>
                <span className="mr-2 text-small text-mineral line-through">
                  {price(product.compareAtCents)}
                </span>
              </>
            ) : null}
            {price(product.priceCents)}
          </p>
        </div>

        <p className="text-small text-mineral">{product.colorway}</p>

        <hr className="rule-cut my-3" />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-small">
          <span className="text-mineral">{CONDITION_LABEL[product.condition]}</span>
          {!available ? (
            <span className="text-oxide">Épuisé</span>
          ) : scarce ? (
            <span className="text-oxide">
              {sizesLeft.length === 1
                ? `Dernière taille : ${sizesLeft[0].eu}`
                : `${sizesLeft.length} tailles restantes`}
            </span>
          ) : (
            <span className="text-mineral">
              {sizesLeft.length} tailles · {sizesLeft[0].eu}–{sizesLeft[sizesLeft.length - 1].eu}
            </span>
          )}
        </div>

        <span
          aria-hidden="true"
          className="mt-3 inline-flex items-center gap-2 text-small font-medium text-ink
                     opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100
                     group-focus-within:opacity-100"
        >
          Voir la paire
          <span className="block h-px w-6 bg-ink" />
        </span>
      </div>
    </article>
  );
}
