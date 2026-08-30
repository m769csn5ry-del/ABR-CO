import Link from 'next/link';
import { services } from '@/content/services';
import { products } from '@/content/products';
import { price, delay } from '@/lib/format';
import { site } from '@/content/site';
import { Reveal } from '@/components/ui/Reveal';

/* ------------------------------------------------------------------ *
 * Section signature : le tableau des deux métiers.
 *
 * Plutôt que deux cartes jumelles, les deux branches sont mises en
 * regard ligne à ligne — ce qu'on livre, sur quel délai, à partir de
 * quel prix, pour qui. La comparaison est la forme, et elle répond à
 * la seule question que se pose le visiteur : « laquelle des deux
 * me concerne ? »
 * ------------------------------------------------------------------ */

const rows = [
  {
    label: 'Ce que tu obtiens',
    shop: 'Une paire neuve, contrôlée en huit points, lacée et emballée.',
    care: "Ta paire nettoyée ou restaurée, avec les photos du diagnostic.",
  },
  {
    label: 'Délai',
    shop: `Expédition sous 48 h, livraison en ${delay(site.shipping.deliveryDays)}.`,
    care: `De ${services[0].durationDays[0]} à ${services[2].durationDays[1]} jours ouvrés selon la prestation.`,
  },
  {
    label: 'À partir de',
    shop: `${price(Math.min(...products.map((p) => p.priceCents)))}`,
    care: `${price(services[0].fromCents ?? 0)}`,
  },
  {
    label: 'Pour qui',
    shop: "Tu cherches un modèle précis et tu veux savoir exactement ce que tu achètes.",
    care: "Tu as déjà la paire. Elle mérite mieux qu'un passage en machine.",
  },
];

export function DualService() {
  return (
    <section aria-labelledby="deux-metiers" className="shell py-24 lg:py-32">
      <Reveal>
        <h2 id="deux-metiers" className="measure text-h2 font-semibold tracking-[-0.025em]">
          Deux métiers, un même atelier
        </h2>
        <p className="measure mt-5 text-lead text-mineral">
          La boutique et l&apos;atelier partagent le même établi et le même contrôle.
          Ce qui change, c&apos;est à qui appartient la paire.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <div className="mt-14 border-t border-ink">
          {/* En-têtes de colonnes : la couleur code la branche. */}
          <div className="grid grid-cols-2 gap-x-6 border-b border-mineral-line py-5 lg:grid-cols-[10rem_1fr_1fr] lg:gap-x-10">
            <p className="hidden text-small text-mineral lg:block" />
            <h3 className="text-h4 font-medium">Shop</h3>
            <h3 className="text-h4 font-medium text-verdigris">Care</h3>
          </div>

          <dl>
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-mineral-line py-6 lg:grid-cols-[10rem_1fr_1fr] lg:gap-x-10"
              >
                <dt className="col-span-2 text-small text-mineral lg:col-span-1 lg:pt-0.5">
                  {row.label}
                </dt>
                <dd className="text-body text-pretty">{row.shop}</dd>
                <dd className="text-body text-pretty">{row.care}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-2 gap-x-6 pt-8 lg:grid-cols-[10rem_1fr_1fr] lg:gap-x-10">
            <span className="hidden lg:block" />
            <Link
              href="/shop"
              className="press inline-flex min-h-11 items-center justify-center rounded-xs bg-ink px-5 text-small font-medium text-paper transition-colors duration-[180ms] hover:bg-ink-soft"
            >
              Voir le catalogue
            </Link>
            <Link
              href="/nettoyage"
              className="press inline-flex min-h-11 items-center justify-center rounded-xs bg-verdigris px-5 text-small font-medium text-paper transition-colors duration-[180ms] hover:bg-verdigris-deep"
            >
              Voir les prestations
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
