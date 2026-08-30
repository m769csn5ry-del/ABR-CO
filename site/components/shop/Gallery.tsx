'use client';

import { useRef, useState } from 'react';
import { Visual } from '@/components/media/Visual';
import { classNames } from '@/lib/format';

/* Galerie produit.
 *
 * Zoom : la loupe suit le pointeur en déplaçant l'échelle depuis le
 * point survolé (`transform-origin` calculé), sans changer la mise en
 * page. Sur écran tactile, le zoom se déclenche à l'appui long naturel
 * du navigateur — on ne détourne pas le geste de défilement.
 *
 * Tant qu'aucune photo réelle n'est fournie, les vues sont des visuels
 * de substitution marqués (voir components/media/Visual.tsx). */

export function Gallery({
  images,
  seed,
  alt,
  brand,
}: {
  images: string[];
  seed: string;
  alt: string;
  brand: string;
}) {
  // Sans photo réelle, on présente trois angles de substitution distincts.
  const views = images.length > 0 ? images : [undefined, undefined, undefined];
  const [index, setIndex] = useState(0);
  const [zooming, setZooming] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const canZoom = images.length > 0;

  function onMove(e: React.MouseEvent) {
    const frame = frameRef.current;
    if (!frame || !canZoom) return;
    const r = frame.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    frame.style.setProperty('--zoom-x', `${x}%`);
    frame.style.setProperty('--zoom-y', `${y}%`);
  }

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-5">
      <ul className="flex gap-3 lg:flex-col" role="tablist" aria-label="Vues du produit">
        {views.map((src, i) => (
          <li key={i} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Vue ${i + 1} sur ${views.length}`}
              onClick={() => setIndex(i)}
              className={classNames(
                'press block w-16 overflow-hidden border transition-[border-color] duration-[180ms] lg:w-20',
                i === index ? 'border-ink' : 'border-mineral-line hover:border-mineral',
              )}
            >
              <Visual
                src={src}
                seed={`${seed}-${i}`}
                alt=""
                caption={brand}
                sizes="80px"
                className="aspect-[4/5] w-full"
              />
            </button>
          </li>
        ))}
      </ul>

      <div
        ref={frameRef}
        onMouseEnter={() => canZoom && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
        className={classNames(
          'relative flex-1 overflow-hidden bg-paper-sunk',
          canZoom && 'cursor-zoom-in',
        )}
      >
        <div
          className="transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            transform: zooming ? 'scale(1.9)' : 'scale(1)',
            transformOrigin: 'var(--zoom-x, 50%) var(--zoom-y, 50%)',
          }}
        >
          <Visual
            src={views[index]}
            seed={`${seed}-${index}`}
            alt={alt}
            caption={brand}
            sizes="(max-width: 1024px) 100vw, 45vw"
            priority
            className="aspect-[4/5] w-full"
          />
        </div>

        {!canZoom ? (
          <p className="absolute right-3 top-3 rounded-xs bg-paper/90 px-2 py-1 text-tag uppercase tracking-[0.08em] text-mineral">
            Photo à venir
          </p>
        ) : null}
      </div>
    </div>
  );
}
