'use client';

import { useRef, useState, type ReactNode } from 'react';

/* Accordéon natif : <details>/<summary> pour l'accessibilité clavier et la
   recherche dans la page, avec une ouverture animée par grid-template-rows
   (pas de height, donc pas de reflow à chaque frame). */

export function Accordion({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return (
    <div className="border-t border-mineral-line">
      {items.map((item, i) => (
        <AccordionItem key={i} question={item.question}>
          {item.answer}
        </AccordionItem>
      ))}
    </div>
  );
}

function AccordionItem({ question, children }: { question: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={ref}
      className="group border-b border-mineral-line"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className="flex w-full cursor-pointer list-none items-start justify-between gap-6 py-5 text-left
                   text-h4 font-medium transition-colors duration-[180ms] hover:text-verdigris
                   [&::-webkit-details-marker]:hidden"
      >
        <span className="measure">{question}</span>
        <span
          aria-hidden="true"
          className="relative mt-3 block size-3 shrink-0"
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink" />
          <span
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: open ? 'translateX(-50%) scaleY(0)' : 'translateX(-50%) scaleY(1)' }}
          />
        </span>
      </summary>
      <div className="grid grid-rows-[1fr] pb-6">
        <div className="measure text-mineral">{children}</div>
      </div>
    </details>
  );
}
