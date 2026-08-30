import Image from 'next/image';
import { classNames } from '@/lib/format';
import { asset } from '@/lib/runtime';

/* ------------------------------------------------------------------ *
 * Emplacement visuel.
 *
 * Si `src` est renseigné, on affiche la vraie photo (next/image, donc
 * redimensionnement, formats modernes et lazy loading).
 * Sinon on compose un visuel de substitution EXPLICITEMENT marqué :
 * un schéma technique de semelle, dans le registre atelier, avec les
 * données de la fiche. Aucune photo générique, aucun faux produit.
 *
 * Remplacer les substituts = renseigner `images` dans content/products.ts
 * ou `before`/`after` dans content/beforeafter.ts. Rien d'autre à toucher.
 * ------------------------------------------------------------------ */

/** Hash stable pour faire varier les substituts sans aléatoire au rendu. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FIELDS = ['#E7E5E1', '#E2E0DB', '#EDEBE7'] as const;

/** Semelle vue de dessous — motif technique, cohérent avec le système graphique. */
const OUTSOLE =
  'M100 24C138 24 162 52 164 96C166 130 152 168 144 200C138 224 134 250 136 286C139 330 128 372 100 396C72 372 61 330 64 286C66 250 62 224 56 200C48 168 34 130 36 96C38 52 62 24 100 24Z';

interface VisualProps {
  src?: string;
  alt: string;
  /** Sert de graine au substitut et de légende technique. */
  seed: string;
  caption?: string;
  className?: string;
  /** Indique au navigateur la largeur réelle occupée — évite de charger trop gros. */
  sizes?: string;
  priority?: boolean;
}

export function Visual({
  src,
  alt,
  seed,
  caption,
  className,
  sizes = '(max-width: 768px) 100vw, 40vw',
  priority = false,
}: VisualProps) {
  if (src) {
    return (
      <div className={classNames('relative overflow-hidden bg-paper-sunk', className)}>
        <Image
          src={asset(src)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const h = hash(seed);
  const field = FIELDS[h % FIELDS.length];
  const tickOffset = h % 5;

  return (
    <div
      className={classNames('relative overflow-hidden', className)}
      style={{ background: field }}
      /* Le substitut est décoratif : l'information est déjà dans le texte
         de la fiche. On le retire donc de l'arbre d'accessibilité plutôt
         que d'inventer un alt qui décrirait une photo inexistante. */
      role="img"
      aria-label={`${alt} — visuel de substitution`}
    >
      <svg
        viewBox="0 0 200 420"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {/* Graduations : le motif « coupe » du système graphique. */}
        <g stroke="var(--color-mineral-line)" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => {
            const y = 40 + i * 42 + tickOffset;
            const long = i % 3 === 0;
            return <line key={i} x1={12} y1={y} x2={long ? 30 : 22} y2={y} />;
          })}
        </g>
        <path
          d={OUTSOLE}
          fill="none"
          stroke="var(--color-sketch)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        {/* Ligne d'axe — repère de montage, pas décor. */}
        <line x1="100" y1="24" x2="100" y2="396" stroke="var(--color-mineral-line)" strokeWidth="1" strokeDasharray="3 6" />
      </svg>

      <p className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 pb-2.5 text-tag leading-tight tracking-[0.08em] text-mineral uppercase">
        <span className="truncate">{caption ?? 'Visuel de substitution'}</span>
        <span aria-hidden="true" className="shrink-0 font-medium">
          NEUF
        </span>
      </p>
    </div>
  );
}
