import Link from 'next/link';
import { Hero } from '@/components/home/Hero';
import { DualService } from '@/components/home/DualService';
import { ProductCard } from '@/components/shop/ProductCard';
import { BeforeAfter } from '@/components/care/BeforeAfter';
import { Reveal } from '@/components/ui/Reveal';
import { IconArrow } from '@/components/ui/Icon';
import { products } from '@/content/products';
import { beforeAfterCases } from '@/content/beforeafter';
import { careProcess, trustPoints } from '@/content/process';

export default function HomePage() {
  const selection = products.filter((p) => p.featured).slice(0, 4);
  const cases = beforeAfterCases.slice(0, 2);

  return (
    <>
      <Hero />
      <DualService />

      {/* ---------------- Sélection ---------------- */}
      <section aria-labelledby="selection" className="shell border-t border-mineral-line py-24 lg:py-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="selection" className="text-h2 font-semibold tracking-[-0.025em]">
              Arrivées récentes
            </h2>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2.5 text-small font-medium"
            >
              <span className="relative">
                Tout le catalogue
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink
                             transition-transform duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                             group-hover:scale-x-100"
                />
              </span>
              <IconArrow className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-7">
          {selection.map((p, i) => (
            <Reveal key={p.slug} delay={i * 50}>
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Avant / après ---------------- */}
      <section
        aria-labelledby="resultats"
        className="border-y border-mineral-line bg-paper-raised py-24 lg:py-32"
      >
        <div className="shell">
          <Reveal>
            <h2 id="resultats" className="measure text-h2 font-semibold tracking-[-0.025em]">
              Ce que l&apos;atelier change
            </h2>
            <p className="measure mt-5 text-lead text-mineral">
              Fais glisser la séparation vers le haut ou vers le bas. Ce sont des
              interventions types, pas des résultats clients : aucun cas réel n&apos;est
              publié tant que la paire n&apos;a pas été photographiée ici.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:max-w-3xl">
            {cases.map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <BeforeAfter item={item} sizes="(max-width: 640px) 100vw, 380px" />
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <Link
              href="/avant-apres"
              className="group mt-12 inline-flex items-center gap-2.5 text-small font-medium"
            >
              <span className="relative">
                Voir la galerie complète
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink
                             transition-transform duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                             group-hover:scale-x-100"
                />
              </span>
              <IconArrow className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Processus ---------------- */}
      <section aria-labelledby="processus" className="shell py-24 lg:py-32">
        <Reveal>
          <h2 id="processus" className="measure text-h2 font-semibold tracking-[-0.025em]">
            Comment se passe une remise à neuf
          </h2>
        </Reveal>

        {/* Liste ordonnée réelle : la numérotation porte le déroulé, elle
            n'est pas un artifice éditorial posé sur des sections. */}
        <ol className="mt-14 grid gap-px border-y border-mineral-line bg-mineral-line md:grid-cols-2 lg:grid-cols-3">
          {careProcess.map((step, i) => (
            <li key={step.title} className="bg-paper p-7 lg:p-8">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-h4 tabular-nums text-verdigris">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-h4 font-medium tracking-[-0.015em]">{step.title}</h3>
              </div>
              <p className="mt-4 text-small text-mineral">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="measure mt-8 text-small text-mineral">
          Les délais annoncés courent à partir de la réception de la paire à l&apos;atelier.
          Le séchage n&apos;est jamais accéléré : c&apos;est lui qui fixe la durée, et le
          forcer abîme les collages.
        </p>
      </section>

      {/* ---------------- Confiance ---------------- */}
      <section
        aria-labelledby="confiance"
        className="border-t border-mineral-line bg-ink py-24 text-paper lg:py-32 dark-surface"
      >
        <div className="shell">
          <Reveal>
            <h2 id="confiance" className="measure text-h2 font-semibold tracking-[-0.025em]">
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

          <p className="measure mt-12 text-small text-paper/55">
            NEUF ne détient aucune certification délivrée par un tiers et n&apos;en revendique
            aucune. Le contrôle décrit ici est interne, et son détail est publié sur chaque fiche.
          </p>
        </div>
      </section>
    </>
  );
}
