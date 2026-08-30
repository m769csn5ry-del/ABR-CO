'use client';

import { useEffect, useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { classNames } from '@/lib/format';

/* Entrée progressive à l'apparition dans le viewport.
 *
 * Principe : le contenu est VISIBLE par défaut dans le HTML rendu. L'état
 * masqué n'est posé qu'en `useLayoutEffect` — donc uniquement si le JS
 * tourne, et avant la première peinture, sans clignotement. Si le script
 * échoue, la page reste entièrement lisible.
 * `prefers-reduced-motion` court-circuite tout : rien ne bouge, rien ne se cache. */

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface RevealProps {
  children: ReactNode;
  /** Décalage en cascade, 40–60ms entre voisins. Au-delà l'interface traîne. */
  delay?: number;
  as?: ElementType;
  className?: string;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    el.dataset.reveal = 'pending';
    el.style.setProperty('--reveal-delay', `${delay}ms`);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.reveal = 'in';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    io.observe(el);

    // Filet de sécurité : si l'observateur ne se déclenche jamais
    // (onglet en arrière-plan au chargement), on révèle quand même.
    const failsafe = window.setTimeout(() => {
      if (el.dataset.reveal !== 'in') el.dataset.reveal = 'in';
    }, 2000);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Cascade sur une liste d'enfants, sans écrire les délais à la main. */
export function RevealList({
  children,
  step = 50,
  className,
  as,
}: {
  children: ReactNode[];
  step?: number;
  className?: string;
  as?: ElementType;
}) {
  return (
    <>
      {children.map((child, i) => (
        <Reveal key={i} delay={Math.min(i * step, 300)} className={className} as={as}>
          {child}
        </Reveal>
      ))}
    </>
  );
}

export { classNames };
