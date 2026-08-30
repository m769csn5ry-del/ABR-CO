import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ *
 * Gabarit des pages légales.
 *
 * Aucun texte juridique n'a été rédigé ni inventé : ces pages listent
 * les rubriques que la loi française impose, avec ce qu'il faut y
 * mettre. À faire relire par un juriste avant mise en ligne — un texte
 * légal généré est un risque, pas un gain de temps.
 * ------------------------------------------------------------------ */

export interface LegalSection {
  heading: string;
  /** Ce que la rubrique doit contenir. */
  required: string;
}

export function LegalPage({
  title,
  intro,
  sections,
  children,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  children?: ReactNode;
}) {
  return (
    <div className="shell py-14 lg:py-20">
      <h1 className="text-h1 font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="measure mt-5 text-lead text-mineral">{intro}</p>

      <p className="measure mt-8 rounded-xs border border-oxide/30 bg-oxide-wash px-4 py-3 text-small text-oxide">
        Page à compléter. Les rubriques ci-dessous sont celles exigées par la réglementation
        française ; leur contenu doit être rédigé et validé juridiquement avant toute mise en
        ligne. Rien n&apos;a été rédigé automatiquement.
      </p>

      {children}

      <div className="mt-14 max-w-3xl">
        {sections.map((section) => (
          <section key={section.heading} className="border-t border-mineral-line py-6">
            <h2 className="text-h4 font-medium tracking-[-0.015em]">{section.heading}</h2>
            <p className="measure mt-3 text-small text-mineral">{section.required}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
