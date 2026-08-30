'use client';

import Link from 'next/link';
import { Visual } from '@/components/media/Visual';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useCart } from '@/lib/cart';
import { productBySlug } from '@/content/products';
import { site } from '@/content/site';
import { price } from '@/lib/format';
import { useState } from 'react';

export default function CartPage() {
  const cart = useCart();
  const [code, setCode] = useState('');

  // Tant que localStorage n'a pas été relu, on n'affiche ni panier plein
  // ni panier vide : afficher « vide » puis basculer serait un faux message.
  if (!cart.ready) {
    return (
      <div className="shell py-14 lg:py-20" aria-busy="true">
        <div className="h-12 w-48 animate-pulse bg-paper-sunk" />
        <div className="mt-10 h-40 w-full animate-pulse bg-paper-sunk" />
      </div>
    );
  }

  if (cart.detailed.length === 0) {
    return (
      <div className="shell flex min-h-[55vh] flex-col justify-center py-16">
        <h1 className="text-h2 font-semibold tracking-[-0.025em]">Ton panier est vide</h1>
        <p className="measure mt-5 text-lead text-mineral">
          Rien pour l&apos;instant. Le catalogue compte des paires neuves contrôlées à la main —
          et si c&apos;est ta paire qui a besoin d&apos;attention, l&apos;atelier s&apos;en charge.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/shop">Voir le catalogue</ButtonLink>
          <ButtonLink href="/nettoyage" variant="care">
            Nettoyer ma paire
          </ButtonLink>
        </div>
      </div>
    );
  }

  const freeShippingGap =
    site.shipping.freeAboveCents !== null
      ? site.shipping.freeAboveCents - (cart.subtotalCents - cart.discountCents)
      : -1;

  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">Panier</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div>
          <ul className="border-t border-mineral-line">
            {cart.detailed.map((line) => {
              const product = productBySlug(line.slug);
              return (
                <li
                  key={`${line.slug}-${line.eu}`}
                  className="flex gap-5 border-b border-mineral-line py-6"
                >
                  <Link href={`/shop/${line.slug}`} className="shrink-0">
                    <Visual
                      src={product?.images[0]}
                      seed={line.slug}
                      alt={`${line.brand} ${line.model}`}
                      caption={line.brand}
                      sizes="96px"
                      className="aspect-[4/5] w-20 sm:w-24"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className="text-body font-medium">
                        <Link href={`/shop/${line.slug}`} className="hover:text-verdigris">
                          <span className="text-mineral">{line.brand}</span> {line.model}
                        </Link>
                      </h2>
                      <p className="text-body tabular-nums">{price(line.lineTotalCents)}</p>
                    </div>
                    <p className="text-small text-mineral">
                      {line.colorway} · Taille {line.eu}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                      <div className="flex items-center border border-mineral-line">
                        <button
                          type="button"
                          onClick={() => cart.setQty(line.slug, line.eu, line.qty - 1)}
                          className="press grid size-11 place-items-center text-mineral hover:text-ink"
                          aria-label={`Retirer une unité de ${line.model} taille ${line.eu}`}
                        >
                          <span aria-hidden="true" className="block h-px w-3 bg-current" />
                        </button>
                        <span
                          className="min-w-8 text-center text-small tabular-nums"
                          aria-label={`Quantité : ${line.qty}`}
                        >
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          disabled={line.qty >= line.maxQty}
                          onClick={() => cart.setQty(line.slug, line.eu, line.qty + 1)}
                          className="press grid size-11 place-items-center text-mineral hover:text-ink disabled:opacity-35"
                          aria-label={`Ajouter une unité de ${line.model} taille ${line.eu}`}
                        >
                          <span aria-hidden="true" className="relative block size-3">
                            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => cart.remove(line.slug, line.eu)}
                        className="text-small text-mineral underline decoration-mineral-line underline-offset-4 transition-colors duration-[180ms] hover:text-oxide"
                      >
                        Retirer
                      </button>
                    </div>

                    {line.qty >= line.maxQty ? (
                      <p className="text-small text-oxide">
                        {line.maxQty === 1
                          ? 'Dernière pièce dans cette taille.'
                          : `Stock limité à ${line.maxQty} dans cette taille.`}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/shop"
            className="mt-6 inline-block text-small underline decoration-mineral-line underline-offset-4 hover:decoration-ink"
          >
            Continuer mes achats
          </Link>
        </div>

        {/* -------- Récapitulatif -------- */}
        <aside aria-labelledby="recap" className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="recap" className="text-h4 font-medium tracking-[-0.015em]">
            Récapitulatif
          </h2>

          <dl className="mt-6 flex flex-col gap-3 border-t border-mineral-line pt-5 text-small">
            <div className="flex justify-between gap-4">
              <dt className="text-mineral">Sous-total</dt>
              <dd className="tabular-nums">{price(cart.subtotalCents)}</dd>
            </div>
            {cart.discountCents > 0 ? (
              <div className="flex justify-between gap-4 text-verdigris">
                <dt>Code {cart.promo}</dt>
                <dd className="tabular-nums">−{price(cart.discountCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-mineral">Livraison</dt>
              <dd className="tabular-nums">
                {cart.shippingCents === 0 ? 'Offerte' : price(cart.shippingCents)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-mineral-line pt-4 text-body font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{price(cart.totalCents)}</dd>
            </div>
          </dl>

          {freeShippingGap > 0 ? (
            <p className="mt-4 text-small text-mineral">
              Plus que {price(freeShippingGap)} pour le port offert.
            </p>
          ) : null}

          {/* Code promotionnel */}
          <form
            className="mt-6 border-t border-mineral-line pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (cart.applyPromo(code)) setCode('');
            }}
          >
            <label htmlFor="promo" className="text-small text-mineral">
              Code promotionnel
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="promo"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="NEUF10"
                className="min-h-11 w-full rounded-xs border border-mineral-line bg-paper-raised px-3 text-small uppercase placeholder:normal-case placeholder:text-mineral/60 focus:border-ink focus:outline-none"
              />
              <Button type="submit" variant="quiet" className="shrink-0">
                Appliquer
              </Button>
            </div>
            {cart.promoError ? (
              <p role="alert" className="mt-2 text-small text-oxide">
                {cart.promoError}
              </p>
            ) : null}
            {cart.promo ? (
              <button
                type="button"
                onClick={cart.clearPromo}
                className="mt-2 text-small text-mineral underline underline-offset-4 hover:text-ink"
              >
                Retirer le code {cart.promo}
              </button>
            ) : null}
          </form>

          <ButtonLink href="/commande" size="lg" className="mt-7 w-full">
            Passer commande
          </ButtonLink>

          <p className="mt-4 text-small text-mineral">
            Paiement non actif sur cette version : le prestataire n&apos;est pas encore raccordé.
          </p>
        </aside>
      </div>
    </div>
  );
}
