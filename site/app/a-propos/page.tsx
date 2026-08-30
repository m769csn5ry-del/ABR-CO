import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "Prolonger la vie des paires qui existent déjà, et proposer une sélection de paires recherchées. Deux métiers, un même établi.",
  alternates: { canonical: '/a-propos' },
};

export default function AboutPage() {
  return (
    <div className="shell py-14 lg:py-20">
      <header className="max-w-4xl">
        <h1 className="text-h1 font-semibold tracking-[-0.03em] text-balance">
          Une paire bien entretenue dure trois fois plus longtemps
        </h1>
      </header>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="flex flex-col gap-6 text-body text-ink-soft">
          <p className="font-serif text-h4 leading-snug text-ink">
            NEUF est né d&apos;un constat bête : la plupart des paires qu&apos;on jette sont
            encore parfaitement portables. Elles sont juste sales.
          </p>

          <p>
            L&apos;atelier a commencé par ça — nettoyer, dégriser, retendre, reteindre. Puis les
            gens ont demandé si on vendait aussi des paires. On a dit oui, à une condition :
            appliquer le même regard à ce qu&apos;on vend qu&apos;à ce qu&apos;on nettoie. Chaque
            paire qui entre est examinée sur les mêmes huit points, et ce qu&apos;on trouve est
            écrit sur la fiche. Y compris quand c&apos;est un défaut.
          </p>

          <p>
            C&apos;est pour ça que les deux activités ne sont pas deux boutiques accolées. C&apos;est
            le même établi, le même éclairage, les mêmes mains. La différence tient en une chose :
            à qui appartient la paire quand elle arrive.
          </p>

          <p>
            Nous ne promettons pas de miracle. Certaines taches sont définitives, certaines semelles
            ne reviennent pas, certaines paires sont trop abîmées pour qu&apos;une intervention ait
            du sens. Quand c&apos;est le cas, on le dit au diagnostic — avant de facturer quoi que
            ce soit. Un client à qui on a dit non revient plus souvent qu&apos;un client déçu.
          </p>

          <p>
            Le reste est une affaire de méthode : un protocole par matière, aucun passage en
            machine, un séchage qu&apos;on ne force jamais, et des photos à chaque étape pour que
            tu n&apos;aies pas à nous croire sur parole.
          </p>
        </div>

        <aside className="flex flex-col gap-8">
          <Reveal>
            <div className="border-t border-ink pt-5">
              <h2 className="text-h4 font-medium tracking-[-0.015em]">Ce qu&apos;on fait</h2>
              <ul className="mt-4 flex flex-col gap-3 text-small text-mineral">
                <li>Nettoyage et restauration, à la main, matière par matière.</li>
                <li>Vente de paires neuves contrôlées en huit points.</li>
                <li>Diagnostic photographié avant toute intervention.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="border-t border-mineral-line pt-5">
              <h2 className="text-h4 font-medium tracking-[-0.015em]">Ce qu&apos;on ne fait pas</h2>
              <ul className="mt-4 flex flex-col gap-3 text-small text-mineral">
                <li>Revendiquer une certification qu&apos;on n&apos;a pas.</li>
                <li>Promettre le retrait d&apos;une tache qu&apos;on sait définitive.</li>
                <li>Monter en gamme sans ton accord.</li>
                <li>Retoucher une photo de résultat.</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="border-t border-mineral-line pt-5">
              <h2 className="text-h4 font-medium tracking-[-0.015em]">Le nom</h2>
              <p className="mt-4 text-small text-mineral">
                « État neuf » est le terme qui relie les deux métiers : on vend des paires neuves,
                on remet les tiennes à neuf. Le nom dit le travail, il n&apos;a pas besoin
                d&apos;être expliqué.
              </p>
            </div>
          </Reveal>
        </aside>
      </div>

      <div className="mt-20 flex flex-wrap gap-3 border-t border-mineral-line pt-10">
        <ButtonLink href="/shop">Voir le catalogue</ButtonLink>
        <ButtonLink href="/nettoyage" variant="care">
          Voir les prestations
        </ButtonLink>
      </div>
    </div>
  );
}
