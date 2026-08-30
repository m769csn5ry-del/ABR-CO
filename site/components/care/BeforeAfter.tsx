'use client';

import { useCallback, useRef, useState } from 'react';
import { Visual } from '@/components/media/Visual';
import type { BeforeAfterCase } from '@/lib/types';
import { classNames } from '@/lib/format';

/* ------------------------------------------------------------------ *
 * Comparateur avant / après — séparation horizontale déplacée
 * VERTICALEMENT, à la souris, au doigt ou au clavier.
 *
 * Technique : une seule couche est découpée au `clip-path: inset()`.
 * Pas de second DOM à redimensionner, pas d'animation de mise en page,
 * tout passe par le compositeur. Pendant le glissé, la transition est
 * coupée pour que la poignée colle au doigt ; elle revient au relâché.
 *
 * Accessibilité : la poignée est un `slider` ARIA. Flèches haut/bas
 * (±4 %), Page↑/↓ (±20 %), Début/Fin (0 / 100 %).
 * ------------------------------------------------------------------ */

export function BeforeAfter({
  item,
  className,
  sizes,
}: {
  item: BeforeAfterCase;
  className?: string;
  sizes?: string;
}) {
  /** Part visible de l'image « avant », depuis le haut, en %. */
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromPointer = useCallback((clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const ratio = ((clientY - rect.top) / rect.height) * 100;
    setSplit(Math.min(100, Math.max(0, ratio)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // La capture garantit que le glissé continue même si le doigt
    // sort du cadre — sinon la poignée « décroche ».
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFromPointer(e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setFromPointer(e.clientY);
  };

  const stop = (e: React.PointerEvent) => {
    if (!dragging) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === 'PageUp' || e.key === 'PageDown' ? 20 : 4;
    let next: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'PageUp') next = split - step;
    else if (e.key === 'ArrowDown' || e.key === 'PageDown') next = split + step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    setSplit(Math.min(100, Math.max(0, next)));
  };

  return (
    <figure className={classNames('flex flex-col gap-4', className)}>
      <div
        ref={frameRef}
        className="relative aspect-[4/5] w-full touch-none select-none overflow-hidden bg-paper-sunk"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        {/* Après — couche du dessous, toujours entière. */}
        <Visual
          src={item.after}
          seed={`${item.id}-apres`}
          alt={`${item.intervention} — après intervention`}
          caption="Après"
          sizes={sizes}
          className="absolute inset-0 h-full w-full"
        />

        {/* Avant — couche du dessus, rognée par le bas. */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 0 ${100 - split}% 0)`,
            transition: dragging ? 'none' : 'clip-path 180ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <Visual
            src={item.before}
            seed={`${item.id}-avant`}
            alt={`${item.intervention} — avant intervention`}
            caption="Avant"
            sizes={sizes}
            className="h-full w-full"
          />
        </div>

        {/* La coupe : filet de séparation + poignée. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Comparer avant et après : ${item.intervention}`}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          aria-valuetext={`${Math.round(split)} % de l'image avant visible`}
          onKeyDown={onKeyDown}
          className="absolute inset-x-0 z-10 -mt-5 flex h-10 cursor-ns-resize items-center justify-center focus-visible:outline-none"
          style={{
            top: `${split}%`,
            transition: dragging ? 'none' : 'top 180ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <span aria-hidden="true" className="absolute inset-x-0 h-px bg-paper" />
          <span
            aria-hidden="true"
            className="relative grid h-7 w-16 place-items-center rounded-pill bg-paper shadow-[0_2px_10px_-4px_rgba(14,15,17,0.5)]"
          >
            <span className="flex flex-col gap-[3px]">
              <span className="block h-px w-5 bg-ink" />
              <span className="block h-px w-5 bg-ink" />
            </span>
          </span>
        </div>

        {/* Repères de lecture, hors de la zone de la poignée. */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-xs bg-ink/80 px-2 py-1 text-tag uppercase tracking-[0.08em] text-paper">
          Avant
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-xs bg-verdigris px-2 py-1 text-tag uppercase tracking-[0.08em] text-paper">
          Après
        </span>
      </div>

      <figcaption className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-verdigris">{item.service}</span>
        <span className="measure text-small text-mineral">{item.intervention}</span>
      </figcaption>
    </figure>
  );
}
