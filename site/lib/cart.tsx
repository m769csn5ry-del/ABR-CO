'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { productBySlug } from '@/content/products';
import { promoCodes, site } from '@/content/site';
import type { CartLine } from '@/lib/types';

/* ------------------------------------------------------------------ *
 * Panier persistant.
 * L'état vit côté client et se relit depuis localStorage au montage.
 * Quand le back-office arrivera, `lines` devra être synchronisé avec un
 * panier serveur : c'est le seul point à reprendre, l'API ci-dessous
 * (add / setQty / remove) reste la même.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'neuf.cart.v1';
const PROMO_KEY = 'neuf.promo.v1';

type Action =
  | { type: 'hydrate'; lines: CartLine[] }
  | { type: 'add'; slug: string; eu: number; qty: number }
  | { type: 'setQty'; slug: string; eu: number; qty: number }
  | { type: 'remove'; slug: string; eu: number }
  | { type: 'clear' };

/** Plafonne à ce qui est réellement en stock pour la pointure demandée. */
function available(slug: string, eu: number): number {
  return productBySlug(slug)?.sizes.find((s) => s.eu === eu)?.stock ?? 0;
}

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'hydrate':
      return action.lines;
    case 'add': {
      const max = available(action.slug, action.eu);
      if (max <= 0) return state;
      const existing = state.find((l) => l.slug === action.slug && l.eu === action.eu);
      if (!existing) return [...state, { slug: action.slug, eu: action.eu, qty: Math.min(action.qty, max) }];
      return state.map((l) =>
        l.slug === action.slug && l.eu === action.eu ? { ...l, qty: Math.min(l.qty + action.qty, max) } : l,
      );
    }
    case 'setQty': {
      if (action.qty <= 0) return state.filter((l) => !(l.slug === action.slug && l.eu === action.eu));
      const max = available(action.slug, action.eu);
      return state.map((l) =>
        l.slug === action.slug && l.eu === action.eu ? { ...l, qty: Math.min(action.qty, max) } : l,
      );
    }
    case 'remove':
      return state.filter((l) => !(l.slug === action.slug && l.eu === action.eu));
    case 'clear':
      return [];
  }
}

export interface DetailedLine extends CartLine {
  brand: string;
  model: string;
  colorway: string;
  priceCents: number;
  lineTotalCents: number;
  maxQty: number;
}

interface CartValue {
  lines: CartLine[];
  detailed: DetailedLine[];
  count: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  promo: string | null;
  promoError: string | null;
  /** `false` tant que localStorage n'a pas été relu : évite un écart
      entre le rendu serveur et le premier rendu client. */
  ready: boolean;
  add: (slug: string, eu: number, qty?: number) => void;
  setQty: (slug: string, eu: number, qty: number) => void;
  remove: (slug: string, eu: number) => void;
  clear: () => void;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, []);
  const [promo, setPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // On revalide contre le catalogue : une paire retirée ou une
          // pointure épuisée depuis la dernière visite ne doit pas ressurgir.
          const clean = parsed
            .filter(
              (l): l is CartLine =>
                !!l && typeof l === 'object' && typeof (l as CartLine).slug === 'string',
            )
            .map((l) => ({ ...l, qty: Math.min(l.qty, available(l.slug, l.eu)) }))
            .filter((l) => l.qty > 0);
          dispatch({ type: 'hydrate', lines: clean });
        }
      }
      const savedPromo = window.localStorage.getItem(PROMO_KEY);
      if (savedPromo && promoCodes[savedPromo]) setPromo(savedPromo);
    } catch {
      /* localStorage indisponible (navigation privée, quota) : panier vide. */
    }
    setReady(true);
    /* Marqueur d'hydratation. Sert au diagnostic et aux tests de bout en
       bout : avant lui, les gestionnaires React ne sont pas encore posés
       et un clic est perdu. */
    document.documentElement.dataset.hydrated = 'true';
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* Écriture impossible : le panier reste valable pour la session. */
    }
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (promo) window.localStorage.setItem(PROMO_KEY, promo);
      else window.localStorage.removeItem(PROMO_KEY);
    } catch {
      /* idem */
    }
  }, [promo, ready]);

  const detailed = useMemo<DetailedLine[]>(
    () =>
      lines.flatMap((l) => {
        const p = productBySlug(l.slug);
        if (!p) return [];
        return [
          {
            ...l,
            brand: p.brand,
            model: p.model,
            colorway: p.colorway,
            priceCents: p.priceCents,
            lineTotalCents: p.priceCents * l.qty,
            maxQty: available(l.slug, l.eu),
          },
        ];
      }),
    [lines],
  );

  const subtotalCents = detailed.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discountCents = promo
    ? Math.round((subtotalCents * promoCodes[promo].percentOff) / 100)
    : 0;
  const afterDiscount = subtotalCents - discountCents;
  const shippingCents =
    afterDiscount === 0
      ? 0
      : site.shipping.freeAboveCents !== null && afterDiscount >= site.shipping.freeAboveCents
        ? 0
        : site.shipping.flatCents;

  const applyPromo = useCallback((code: string) => {
    const key = code.trim().toUpperCase();
    if (!promoCodes[key]) {
      setPromoError('Ce code ne correspond à aucune offre en cours.');
      return false;
    }
    setPromo(key);
    setPromoError(null);
    return true;
  }, []);

  const value: CartValue = {
    lines,
    detailed,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: afterDiscount + shippingCents,
    promo,
    promoError,
    ready,
    add: (slug, eu, qty = 1) => dispatch({ type: 'add', slug, eu, qty }),
    setQty: (slug, eu, qty) => dispatch({ type: 'setQty', slug, eu, qty }),
    remove: (slug, eu) => dispatch({ type: 'remove', slug, eu }),
    clear: () => dispatch({ type: 'clear' }),
    applyPromo,
    clearPromo: () => {
      setPromo(null);
      setPromoError(null);
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
