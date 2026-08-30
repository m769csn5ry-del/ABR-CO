import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { BeforeAfter } from '@/components/care/BeforeAfter';
import { IconArrow } from '@/components/ui/Icon';
import { services } from '@/content/services';
import { careProcess, trustPoints } from '@/content/process';
import { beforeAfterCases } from '@/content/beforeafter';
import { price, delay } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Nettoyage et restauration',
  description:
    "Trois prestations d'atelier : Essential Clean, Deep Clean, Restore. Diagnostic photographié, protocole adapté à la matière, suivi en neuf étapes.",
  alternates: { canonical: '/nettoyage' },
};

export default function CarePage() {
  const cases = beforeAfterCases.slice(2, 5);

  return (
    <>
      {/* ---------------- Hero atelier ---------------- */}
      <section className="border-b border-mineral-line bg-verdigris text-paper dark-surface">
        <div className="shell grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-24">
          <div>
            <h1 className="text-h1 font-semibold tracking-[-0.03em] text-balance">
              Redonne à tes sneakers leur meilleur état.
            </h1>
            <p className="measure mt-6 text-lead text-paper/75">
              Trois prestations, un protocole par matière, et un diagnostic photographié avant
              qu&apos;on touche à quoi que ce soit. Tu vois l&apos;état de départ, tu sais ce qui
              est atteignable.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/nettoyage/commande"
                className="press inline-flex min-h-[3.25rem] items-center rounded-xs bg-paper px-7 text-body font-medium text-verdigris transition-colors duration-[180ms] hover:bg-paper-raised"
              >
                Commander un nettoyage
              </Link>
              <Link
                href="#prestations"
                className="press inline-flex min-h-[3.25rem] items-center rounded-xs border border-paper/35 px-7 text-body font-medium transition-colors duration-[180ms] hover:border-paper"
              >
                Comparer les prestations
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-paper/20 pt-8 lg:border-t-0 lg:pt-0">
            <div>
              <dt className="text-small text-paper/60">Délai</dt>
              <dd className="mt-1 text-h4 font-medium">3 à 21 j</dd>
            </div>
            <div>
              <dt className="text-small text-paper/60">À partir de</dt>
              <dd className="mt-1 text-h4 font-medium tabular-nums">
                {price(services[0].fromCents ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-small text-paper/60">Suivi</dt>
              <dd className="mt-1 text-h4 font-medium">9 étapes</dd>
            </div>
            <div>
              <dt className="text-small text-paper/60">Machine</dt>
              <dd className="mt-1 text-h4 font-medium">Jamais</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Prestations ---------------- */}
      <section id="prestations" aria-labelledby="titre-prestations" className="shell py-24 lg:py-32">
        <Reveal>
          <h2 id="titre-prestations" className="measure text-h2 font-semibold tracking-[-0.025em]">
            Trois prestations
          </h2>
          <p className="measure mt-5 text-lead text-mineral">
            Si tu hésites, prends la moins chère. Au diagnostic nous te dirons si elle suffit,
            et nous ne montons jamais en gamme sans ton accord.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px border-y border-mineral-line bg-mineral-line lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.slug} delay={i * 60}>
              <article className="flex h-full flex-col bg-paper p-7 lg:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-h4 font-medium tracking-[-0.015em]">{service.name}</h3>
                  <p className="shrink-0 text-body tabular-nums">
                    {service.fromCents === null ? (
                      <span className="text-verdigris">Sur devis</span>
                    ) : (
                      <>
                        <span className="text-small text-mineral">dès </span>
                        {price(service.fromCents)}
                      </>
                    )}
                  </p>
                </div>

                <p className="mt-4 text-small text-mineral">{service.summary}</p>

                <p className="mt-5 text-small">
                  <span className="text-mineral">Délai : </span>
                  {delay(service.durationDays)}
                </p>

                <hr className="rule-cut my-6" />

                <h4 className="text-small font-medium">Ce qui est fait</h4>
                <ul className="mt-3 flex flex-col gap-2">
                  {service.includes.map((line) => (
                    <li key={line} className="flex gap-3 text-small text-mineral">
                      <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-mineral-line" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <h4 className="mt-6 text-small font-medium">Matières acceptées</h4>
                <p className="mt-2 text-small text-mineral">{service.accepts.join(' · ')}</p>

                <ButtonLink
                  href={`/nettoyage/commande?prestation=${service.slug}`}
                  variant={service.billing === 'devis' ? 'quiet' : 'care'}
                  className="mt-8 w-full"
                >
                  {service.billing === 'devis' ? 'Demander un devis' : `Choisir ${service.name}`}
                </ButtonLink>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="measure mt-8 text-small text-mineral">
          Les paires dont la structure est compromise — décollement sur toute la longueur,
          déchirure de la tige, moisissure installée — sont refusées. Nous te le disons au
          diagnostic, avant toute facturation.
        </p>
      </section>

      {/* ---------------- Déroulé ---------------- */}
      <section
        aria-labelledby="deroule"
        className="border-y border-mineral-line bg-paper-raised py-24 lg:py-32"
      >
        <div className="shell">
          <Reveal>
            <h2 id="deroule" className="measure text-h2 font-semibold tracking-[-0.025em]">
              Le déroulé, étape par étape
            </h2>
          </Reveal>

          <ol className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {careProcess.map((step, i) => (
              <Reveal key={step.title} delay={i * 40}>
                <li className="border-t border-ink pt-5">
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-h4 tabular-nums text-verdigris">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-h4 font-medium tracking-[-0.015em]">{step.title}</h3>
                  </div>
                  <p className="mt-4 text-small text-mineral">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Résultats ---------------- */}
      <section aria-labelledby="resultats-atelier" className="shell py-24 lg:py-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="resultats-atelier" className="text-h2 font-semibold tracking-[-0.025em]">
              Types d&apos;interventions
            </h2>
            <Link href="/avant-apres" className="group inline-flex items-center gap-2.5 text-small font-medium">
              <span className="relative">
                Galerie complète
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100"
                />
              </span>
              <IconArrow className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((item, i) => (
            <Reveal key={item.id} delay={i * 50}>
              <BeforeAfter item={item} sizes="(max-width: 640px) 100vw, 33vw" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Confiance ---------------- */}
      <section
        aria-labelledby="confiance-atelier"
        className="border-t border-mineral-line bg-ink py-24 text-paper lg:py-32 dark-surface"
      >
        <div className="shell">
          <Reveal>
            <h2 id="confiance-atelier" className="measure text-h2 font-semibold tracking-[-0.025em]">
              Ce sur quoi tu peux compter
            </h2>
          </Reveal>
          <dl className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {trustPoints.map((point, i) => (
              <Reveal key={point.title} delay={i * 40}>
                <div className="border-t border-paper/20 pt-5">
                  <dt className="text-h4 font-medium tracking-[-0.015em]">{point.title}</dt>
                  <dd className="mt-3 text-small text-paper/65">{point.body}</dd>
                </div>
              </Reveal>
            ))}
          </dl>

          <div className="mt-14">
            <Link
              href="/nettoyage/commande"
              className="press inline-flex min-h-[3.25rem] items-center rounded-xs bg-paper px-7 text-body font-medium text-ink transition-colors duration-[180ms] hover:bg-paper-raised"
            >
              Commander un nettoyage
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
