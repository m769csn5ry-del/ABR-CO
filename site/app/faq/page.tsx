import type { Metadata } from 'next';
import Link from 'next/link';
import { Accordion } from '@/components/ui/Accordion';
import { faq, faqTopics } from '@/content/faq';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    "Matières acceptées, délais, envoi de la paire, contrôle des sneakers vendues, paiement, livraison, suivi et retours.",
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  /* Balisage FAQPage : les réponses indexées sont exactement celles
     affichées, sans reformulation pour le moteur. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <div className="shell py-14 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-14">
        <h1 className="text-h1 font-semibold tracking-[-0.03em]">Questions fréquentes</h1>
        <p className="measure mt-5 text-lead text-mineral">
          Si ta question n&apos;est pas là,{' '}
          <Link href="/contact" className="underline decoration-mineral-line underline-offset-4 hover:decoration-ink">
            écris-nous
          </Link>
          .
        </p>
      </header>

      <div className="flex flex-col gap-16">
        {faqTopics.map((topic) => {
          const items = faq.filter((f) => f.topic === topic.id);
          if (items.length === 0) return null;
          return (
            <section key={topic.id} aria-labelledby={`faq-${topic.id}`}>
              <h2 id={`faq-${topic.id}`} className="text-h3 font-semibold tracking-[-0.025em]">
                {topic.label}
              </h2>
              <div className="mt-8">
                <Accordion
                  items={items.map((item) => ({
                    question: item.question,
                    answer: <p>{item.answer}</p>,
                  }))}
                />
              </div>
            </section>
          );
        })}
      </div>

      <p className="measure mt-16 border-t border-mineral-line pt-8 text-small text-mineral">
        Les délais et conditions annoncés ici sont ceux enregistrés dans la configuration du
        site ({site.returns.days} jours de rétractation, livraison en{' '}
        {site.shipping.deliveryDays[0]} à {site.shipping.deliveryDays[1]} jours ouvrés).
        Ils font foi une fois les mentions légales et les CGV publiées.
      </p>
    </div>
  );
}
