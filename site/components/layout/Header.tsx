'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { mainNav } from './nav';
import { SearchDialog } from './SearchDialog';
import { IconAccount, IconBag, IconClose, IconMenu, IconSearch } from '@/components/ui/Icon';
import { useCart } from '@/lib/cart';
import { classNames } from '@/lib/format';

/* En-tête. Collé en haut, séparé du contenu par la « coupe » (1px).
   Pas de pilule flottante : la marque est éditoriale, pas SaaS. */

export function Header() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Le menu mobile se referme à chaque navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Verrou de défilement pendant que le panneau plein écran est ouvert.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                   focus:rounded-xs focus:bg-ink focus:px-4 focus:py-2.5 focus:text-small focus:text-paper"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 border-b border-mineral-line bg-paper/92 backdrop-blur-[6px]">
        <div className="shell flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
          <Link
            href="/"
            className="flex min-h-11 items-center text-[1.0625rem] font-semibold tracking-[0.08em] uppercase"
            aria-label="NEUF — accueil"
          >
            NEUF
          </Link>

          <nav aria-label="Navigation principale" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {mainNav.slice(1).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    className="group relative block py-2 text-small text-ink-soft transition-colors duration-[180ms] hover:text-ink"
                  >
                    {item.label}
                    {/* La coupe : filet qui pousse depuis la gauche. */}
                    <span
                      aria-hidden="true"
                      className={classNames(
                        'absolute inset-x-0 bottom-0 h-px origin-left bg-ink',
                        'transition-transform duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                        isCurrent(item.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="press grid size-11 place-items-center text-ink-soft transition-colors duration-[180ms] hover:text-ink"
              aria-label="Rechercher une paire"
            >
              <IconSearch className="size-5" />
            </button>

            <Link
              href="/compte"
              className="press hidden size-11 place-items-center text-ink-soft transition-colors duration-[180ms] hover:text-ink sm:grid"
              aria-label="Mon compte"
            >
              <IconAccount className="size-5" />
            </Link>

            <Link
              href="/panier"
              className="press relative grid size-11 place-items-center text-ink-soft transition-colors duration-[180ms] hover:text-ink"
              aria-label={
                ready && count > 0
                  ? `Panier, ${count} article${count > 1 ? 's' : ''}`
                  : 'Panier, vide'
              }
            >
              <IconBag className="size-5" />
              {ready && count > 0 ? (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-pill bg-ink px-1 text-tag font-medium leading-4 text-paper">
                  {count}
                </span>
              ) : null}
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              className="press grid size-11 place-items-center text-ink lg:hidden"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <IconClose className="size-5" /> : <IconMenu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile : panneau plein écran sous l'en-tête, pas de superposition
          hasardeuse. Les deux CTA de branche restent accessibles en bas. */}
      <div
        id="menu-mobile"
        hidden={!menuOpen}
        className="fixed inset-x-0 bottom-0 top-16 z-20 flex flex-col justify-between overflow-y-auto bg-paper lg:hidden"
      >
        <nav aria-label="Navigation mobile" className="shell pt-2">
          <ul>
            {mainNav.map((item, i) => (
              <li key={item.href} className="border-b border-mineral-line">
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  style={{ transitionDelay: `${i * 24}ms` }}
                  className={classNames(
                    'flex min-h-[3.75rem] items-center justify-between text-h4',
                    isCurrent(item.href) ? 'text-ink' : 'text-ink-soft',
                  )}
                >
                  {item.label}
                  {isCurrent(item.href) ? (
                    <span aria-hidden="true" className="block h-px w-8 bg-ink" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shell grid grid-cols-2 gap-3 py-6">
          <Link
            href="/shop"
            className="press grid min-h-[3.25rem] place-items-center rounded-xs bg-ink text-small font-medium text-paper"
          >
            Shopper les sneakers
          </Link>
          <Link
            href="/nettoyage"
            className="press grid min-h-[3.25rem] place-items-center rounded-xs bg-verdigris text-small font-medium text-paper"
          >
            Nettoyer ma paire
          </Link>
          <Link
            href="/compte"
            className="col-span-2 flex min-h-11 items-center justify-center text-small text-mineral underline decoration-mineral-line underline-offset-4 sm:hidden"
          >
            Mon compte
          </Link>
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
