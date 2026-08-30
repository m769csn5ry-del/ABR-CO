'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from './ProductCard';
import { Choice, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { brands, allSizes, inStock, products } from '@/content/products';
import { CONDITION_LABEL, type Condition, type Product } from '@/lib/types';
import { classNames, price } from '@/lib/format';

/* ------------------------------------------------------------------ *
 * Catalogue : filtres, tri, résultats.
 *
 * L'état vit dans le composant (le catalogue tient en mémoire). Quand
 * il viendra d'une API, ces mêmes valeurs deviennent des paramètres de
 * requête : la forme des filtres ne change pas.
 *
 * Sur mobile, le panneau de filtres est replié derrière un bouton qui
 * annonce le nombre de filtres actifs — il ne mange pas l'écran.
 * ------------------------------------------------------------------ */

type Sort = 'recent' | 'prix-croissant' | 'prix-decroissant';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Arrivées récentes' },
  { value: 'prix-croissant', label: 'Prix croissant' },
  { value: 'prix-decroissant', label: 'Prix décroissant' },
];

const CONDITIONS: Condition[] = ['neuf', 'neuf-sans-boite', 'tres-bon-etat'];

const PRICE_MAX = Math.max(...products.map((p) => p.priceCents));
const PRICE_MIN = Math.min(...products.map((p) => p.priceCents));

export function ShopBrowser() {
  const [selectedBrands, setBrands] = useState<string[]>([]);
  const [selectedSizes, setSizes] = useState<number[]>([]);
  const [selectedConditions, setConditions] = useState<Condition[]>([]);
  const [onlyInStock, setOnlyInStock] = useState(false);

  /* Le lien « En stock » du pied de page arrive avec ?dispo=en-stock.
     On le lit APRÈS montage : `useSearchParams` ferait sortir toute la grille
     du prérendu, et le catalogue ne serait plus dans le HTML servi — donc
     plus indexable. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('dispo') === 'en-stock') {
      setOnlyInStock(true);
    }
  }, []);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [sort, setSort] = useState<Sort>('recent');
  const [panelOpen, setPanelOpen] = useState(false);

  const activeCount =
    selectedBrands.length +
    selectedSizes.length +
    selectedConditions.length +
    (onlyInStock ? 1 : 0) +
    (maxPrice < PRICE_MAX ? 1 : 0);

  const results = useMemo(() => {
    const filtered = products.filter((p) => {
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (selectedConditions.length && !selectedConditions.includes(p.condition)) return false;
      if (onlyInStock && !inStock(p)) return false;
      if (p.priceCents > maxPrice) return false;
      if (selectedSizes.length) {
        // Une taille cochée ne compte que si elle est réellement disponible.
        const has = p.sizes.some((s) => selectedSizes.includes(s.eu) && s.stock > 0);
        if (!has) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === 'prix-croissant') sorted.sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === 'prix-decroissant') sorted.sort((a, b) => b.priceCents - a.priceCents);
    else sorted.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));

    // Les paires épuisées passent toujours en fin de liste.
    return sorted.sort((a, b) => Number(inStock(b)) - Number(inStock(a)));
  }, [selectedBrands, selectedSizes, selectedConditions, onlyInStock, maxPrice, sort]);

  function toggle<T>(list: T[], value: T, set: (v: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function reset() {
    setBrands([]);
    setSizes([]);
    setConditions([]);
    setOnlyInStock(false);
    setMaxPrice(PRICE_MAX);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
      {/* -------- Filtres -------- */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <Button
            variant="quiet"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-controls="filtres"
          >
            Filtrer{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          <SortControl sort={sort} setSort={setSort} id="tri-mobile" />
        </div>

        <div
          id="filtres"
          className={classNames(
            'mt-6 flex-col gap-8 lg:mt-0 lg:flex',
            panelOpen ? 'flex' : 'hidden',
          )}
        >
          <FilterGroup title="Marque">
            <div className="flex flex-col gap-2">
              {brands.map((b) => (
                <Choice
                  key={b}
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => toggle(selectedBrands, b, setBrands)}
                >
                  {b}
                </Choice>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Taille (EU)">
            <div className="flex flex-wrap gap-2">
              {allSizes.map((s) => {
                const on = selectedSizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(selectedSizes, s, setSizes)}
                    aria-pressed={on}
                    className={classNames(
                      'press grid h-11 min-w-11 place-items-center rounded-xs border px-2 text-small tabular-nums',
                      'transition-[border-color,background-color] duration-[180ms]',
                      on
                        ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
                        : 'border-mineral-line bg-paper-raised hover:border-mineral',
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup title="État">
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <Choice
                  key={c}
                  type="checkbox"
                  checked={selectedConditions.includes(c)}
                  onChange={() => toggle(selectedConditions, c, setConditions)}
                >
                  {CONDITION_LABEL[c]}
                </Choice>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Prix maximum">
            <label htmlFor="prix-max" className="sr-only">
              Prix maximum
            </label>
            <input
              id="prix-max"
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="h-11 w-full accent-[#1C5750]"
            />
            <p className="text-small tabular-nums text-mineral">
              Jusqu&apos;à {price(maxPrice)}
            </p>
          </FilterGroup>

          <FilterGroup title="Disponibilité">
            <Choice
              type="checkbox"
              checked={onlyInStock}
              onChange={() => setOnlyInStock((v) => !v)}
            >
              En stock uniquement
            </Choice>
          </FilterGroup>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="self-start text-small text-mineral underline decoration-mineral-line underline-offset-4 transition-colors duration-[180ms] hover:text-ink"
            >
              Effacer les filtres ({activeCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* -------- Résultats -------- */}
      <div>
        <h2 className="sr-only">Résultats</h2>
        <div className="mb-8 hidden items-center justify-between gap-6 border-b border-mineral-line pb-5 lg:flex">
          <p aria-live="polite" className="text-small text-mineral">
            {results.length} paire{results.length > 1 ? 's' : ''}
          </p>
          <SortControl sort={sort} setSort={setSort} id="tri-bureau" />
        </div>

        <p aria-live="polite" className="mb-6 text-small text-mineral lg:hidden">
          {results.length} paire{results.length > 1 ? 's' : ''}
        </p>

        {results.length === 0 ? (
          <div className="border-t border-mineral-line py-16">
            <h2 className="text-h4 font-medium">Aucune paire ne correspond</h2>
            <p className="measure mt-3 text-small text-mineral">
              Les filtres sont peut-être trop serrés. Retire une taille ou élargis le prix
              maximum pour voir le reste du catalogue.
            </p>
            <Button variant="quiet" className="mt-6" onClick={reset}>
              Effacer les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-3 lg:gap-x-7">
            {results.map((p: Product, i) => (
              <ProductCard
                key={p.slug}
                product={p}
                priority={i < 3}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-mineral-line pt-5">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden="true" className="text-small font-medium">
        {title}
      </p>
      {children}
    </fieldset>
  );
}

function SortControl({
  sort,
  setSort,
  id,
}: {
  sort: Sort;
  setSort: (s: Sort) => void;
  /* Le contrôle est rendu deux fois (barre mobile / en-tête bureau) :
     chaque instance a son propre identifiant, sinon le label pointe
     vers le mauvais champ et l'un des deux devient inatteignable. */
  id: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="shrink-0 text-small text-mineral">
        Trier
      </label>
      <Select
        id={id}
        value={sort}
        onChange={(e) => setSort(e.target.value as Sort)}
        className="min-h-11 w-auto py-2 text-small"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
