import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gallery } from '@/components/shop/Gallery';
import { AddToCart } from '@/components/shop/AddToCart';
import { ProductCard } from '@/components/shop/ProductCard';
import { Accordion } from '@/components/ui/Accordion';
import { Reveal } from '@/components/ui/Reveal';
import { products, productBySlug, inStock } from '@/content/products';
import { site } from '@/content/site';
import { price, delay } from '@/lib/format';
import { CONDITION_LABEL } from '@/lib/types';

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) return { title: 'Paire introuvable' };

  const title = `${product.brand} ${product.model} — ${product.colorway}`;
  return {
    title,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: 'website',
      title,
      description: product.description.slice(0, 155),
      url: `${site.url}/shop/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  const available = inStock(product);
  const similar = products
    .filter((p) => p.slug !== product.slug && (p.brand === product.brand || inStock(p)))
    .slice(0, 4);

  /* Données structurées Product. Les champs déclarés correspondent
     exactement à ce qui est affiché — pas de note ni d'avis inventés. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.brand} ${product.model}`,
    color: product.colorway,
    brand: { '@type': 'Brand', name: product.brand },
    description: product.description,
    itemCondition:
      product.condition === 'tres-bon-etat'
        ? 'https://schema.org/UsedCondition'
        : 'https://schema.org/NewCondition',
    offers: {
      '@type': 'Offer',
      url: `${site.url}/shop/${product.slug}`,
      priceCurrency: site.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="shell py-10 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Fil d'Ariane" className="mb-8 text-small text-mineral">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/shop" className="transition-colors duration-[180ms] hover:text-ink">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span className="text-ink">
              {product.brand} {product.model}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <Gallery
          images={product.images}
          seed={product.slug}
          alt={`${product.brand} ${product.model}, ${product.colorway}`}
          brand={product.brand}
        />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="text-h3 font-semibold tracking-[-0.025em]">
            <span className="block text-body font-normal text-mineral">{product.brand}</span>
            {product.model}
          </h1>

          <p className="mt-3 text-body text-mineral">{product.colorway}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="text-h4 font-medium tabular-nums">{price(product.priceCents)}</p>
            {product.compareAtCents ? (
              <p className="text-body text-mineral line-through tabular-nums">
                {price(product.compareAtCents)}
              </p>
            ) : null}
            <p className="text-small text-mineral">{CONDITION_LABEL[product.condition]}</p>
          </div>

          <p className="measure mt-6 text-body text-ink-soft">{product.description}</p>

          <AddToCart product={product} />

          {/* État constaté : le cœur de la confiance sur une paire d'occasion
              comme sur une paire neuve. Affiché, pas caché dans un onglet. */}
          <section aria-labelledby="constat" className="mt-10 border-t border-mineral-line pt-6">
            <h2 id="constat" className="text-small font-medium">
              État constaté sur cette paire
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {product.inspection.map((line) => (
                <li key={line} className="flex gap-3 text-small text-mineral">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-mineral-line" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8">
            <Accordion
              items={[
                {
                  question: 'Le contrôle en huit points',
                  answer: (
                    <div className="flex flex-col gap-3">
                      <p>
                        À la réception, chaque paire est examinée sur huit points : cohérence de
                        l&apos;étiquette de boîte avec le modèle et la pointure, numérotation
                        identique sur les deux chaussures, régularité des surpiqûres, qualité des
                        collages, densité et odeur de la matière, forme du contrefort, conformité
                        du sockliner, état de la semelle.
                      </p>
                      <p>
                        C&apos;est un contrôle interne, réalisé à l&apos;atelier. Ce n&apos;est pas
                        une certification délivrée par un organisme tiers, et NEUF n&apos;en
                        revendique aucune. Ce qui est constaté sur cette paire est publié
                        ci-dessus, défauts compris.
                      </p>
                    </div>
                  ),
                },
                {
                  question: 'Livraison',
                  answer: (
                    <p>
                      Expédition sous 24 à 48 h ouvrées, livraison en{' '}
                      {delay(site.shipping.deliveryDays)} en France métropolitaine.
                      {site.shipping.freeAboveCents !== null
                        ? ` Port offert à partir de ${price(site.shipping.freeAboveCents)}, sinon ${price(site.shipping.flatCents)}.`
                        : ` Frais de port : ${price(site.shipping.flatCents)}.`}
                    </p>
                  ),
                },
                {
                  question: 'Retours',
                  answer: (
                    <p>
                      {site.returns.days} jours pour changer d&apos;avis, sans motif à donner. La
                      paire doit revenir non portée et dans son état de départ, avec sa boîte si
                      elle en avait une. Les frais de retour sont à ta charge, sauf erreur de
                      notre part.
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similaires" className="mt-28 border-t border-mineral-line pt-14 lg:mt-36">
          <Reveal>
            <h2 id="similaires" className="text-h3 font-semibold tracking-[-0.025em]">
              Dans le même esprit
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-7">
            {similar.map((p, i) => (
              <Reveal key={p.slug} delay={i * 50}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
