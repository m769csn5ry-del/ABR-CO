'use client';

import { useMemo, useState } from 'react';
import { BeforeAfter } from './BeforeAfter';
import { beforeAfterCases } from '@/content/beforeafter';
import { BEFORE_AFTER_TAG_LABEL, type BeforeAfterTag } from '@/lib/types';
import { classNames } from '@/lib/format';

const TAGS = Object.keys(BEFORE_AFTER_TAG_LABEL) as BeforeAfterTag[];

export function BeforeAfterGallery() {
  const [active, setActive] = useState<BeforeAfterTag[]>([]);

  const shown = useMemo(
    () =>
      active.length === 0
        ? beforeAfterCases
        : beforeAfterCases.filter((c) => c.tags.some((t) => active.includes(t))),
    [active],
  );

  function toggle(tag: BeforeAfterTag) {
    setActive((a) => (a.includes(tag) ? a.filter((t) => t !== tag) : [...a, tag]));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-y border-mineral-line py-5">
        <span id="filtre-matiere" className="mr-2 text-small text-mineral">
          Filtrer
        </span>
        <div role="group" aria-labelledby="filtre-matiere" className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const on = active.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag)}
                className={classNames(
                  'press min-h-11 rounded-xs border px-4 text-small transition-[border-color,background-color] duration-[180ms]',
                  on
                    ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
                    : 'border-mineral-line bg-paper-raised hover:border-mineral',
                )}
              >
                {BEFORE_AFTER_TAG_LABEL[tag]}
              </button>
            );
          })}
        </div>
        {active.length > 0 ? (
          <button
            type="button"
            onClick={() => setActive([])}
            className="ml-auto text-small text-mineral underline decoration-mineral-line underline-offset-4 hover:text-ink"
          >
            Tout afficher
          </button>
        ) : null}
      </div>

      <p aria-live="polite" className="mt-6 text-small text-mineral">
        {shown.length} intervention{shown.length > 1 ? 's' : ''}
      </p>

      {shown.length === 0 ? (
        <p className="py-16 text-lead text-mineral">
          Aucune intervention pour cette combinaison de matières.
        </p>
      ) : (
        <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <BeforeAfter key={item.id} item={item} sizes="(max-width: 640px) 100vw, 33vw" />
          ))}
        </div>
      )}
    </>
  );
}
