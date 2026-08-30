'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { products } from '@/content/products';
import { CONDITION_LABEL } from '@/lib/types';
import { price } from '@/lib/format';
import { IconClose } from '@/components/ui/Icon';

/* Recherche produit, côté client : le catalogue tient en mémoire, aucune
   requête réseau n'est nécessaire. Quand le catalogue viendra d'une API,
   remplacer `results` par un appel débounçé — le reste ne bouge pas. */

function score(haystack: string, needle: string): boolean {
  return haystack
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .includes(needle);
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    // Le focus part sur le champ dès l'ouverture.
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    if (q.length < 2) return [];
    return products
      .filter((p) => score(`${p.brand} ${p.model} ${p.colorway}`, q))
      .slice(0, 6);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-ink/25"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Rechercher une paire"
        className="mx-auto max-w-2xl bg-paper px-5 pb-6 pt-5 shadow-[0_18px_40px_-24px_rgba(14,15,17,0.35)] sm:mt-24 sm:px-7"
      >
        <div className="flex items-center gap-4 border-b border-ink pb-3">
          <label htmlFor="recherche" className="sr-only">
            Rechercher une paire
          </label>
          <input
            ref={inputRef}
            id="recherche"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Marque, modèle, coloris"
            autoComplete="off"
            className="min-h-11 w-full bg-transparent text-lead placeholder:text-mineral/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="press grid size-11 shrink-0 place-items-center text-mineral hover:text-ink"
            aria-label="Fermer la recherche"
          >
            <IconClose className="size-5" />
          </button>
        </div>

        <div aria-live="polite" className="pt-4">
          {query.trim().length < 2 ? (
            <p className="text-small text-mineral">
              Tape au moins deux caractères. La recherche porte sur la marque, le modèle et le coloris.
            </p>
          ) : results.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-small text-mineral">
                Aucune paire ne correspond à « {query.trim()} ».
              </p>
              <Link
                href="/shop"
                onClick={onClose}
                className="text-small underline decoration-mineral-line underline-offset-4 hover:decoration-ink"
              >
                Voir tout le catalogue
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col">
              {results.map((p) => (
                <li key={p.slug} className="border-b border-mineral-line last:border-0">
                  <Link
                    href={`/shop/${p.slug}`}
                    onClick={onClose}
                    className="flex items-baseline justify-between gap-4 py-3 transition-colors duration-[180ms] hover:text-verdigris"
                  >
                    <span>
                      <span className="text-body font-medium">
                        {p.brand} {p.model}
                      </span>
                      <span className="block text-small text-mineral">
                        {p.colorway} · {CONDITION_LABEL[p.condition]}
                      </span>
                    </span>
                    <span className="shrink-0 text-small tabular-nums">{price(p.priceCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
