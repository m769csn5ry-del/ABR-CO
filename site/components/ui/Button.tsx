import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { classNames } from '@/lib/format';

/* Boutons. Trois intentions seulement :
 *   `shop` — encre, la branche boutique
 *   `care` — verdigris, la branche atelier
 *   `quiet` — contour, action secondaire
 * La couleur porte donc une information, elle n'est pas décorative. */

type Variant = 'shop' | 'care' | 'quiet' | 'ghost';
type Size = 'md' | 'lg';

const BASE =
  'press relative inline-flex items-center justify-center gap-2.5 rounded-xs text-center font-medium ' +
  'transition-[background-color,border-color,color] duration-[180ms] ' +
  'disabled:pointer-events-none disabled:opacity-45';

const VARIANT: Record<Variant, string> = {
  shop: 'bg-ink text-paper hover:bg-ink-soft',
  care: 'bg-verdigris text-paper hover:bg-verdigris-deep',
  quiet: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.04]',
  ghost: 'text-ink underline decoration-mineral-line underline-offset-[6px] hover:decoration-ink',
};

const SIZE: Record<Size, string> = {
  md: 'min-h-11 px-5 py-2.5 text-small',
  lg: 'min-h-[3.25rem] px-7 py-3 text-body',
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'shop',
  size = 'md',
  className,
  children,
  ...rest
}: Common & ComponentPropsWithoutRef<'button'>) {
  return (
    <button className={classNames(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'shop',
  size = 'md',
  className,
  children,
  href,
  ...rest
}: Common & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={classNames(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
      {children}
    </Link>
  );
}
