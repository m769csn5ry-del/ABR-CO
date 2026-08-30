import type { Metadata } from 'next';
import { ShopBrowser } from '@/components/shop/ShopBrowser';
import { products } from '@/content/products';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    "Sneakers neuves et authentifiées, contrôlées en huit points avant mise en vente. L'état constaté est publié sur chaque fiche.",
  alternates: { canonical: '/shop' },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ dispo?: string }>;
}) {
  const { dispo } = await searchParams;

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-14 border-b border-mineral-line pb-10 lg:mb-16">
        <h1 className="text-h1 font-semibold tracking-[-0.03em]">Shop</h1>
        <p className="measure mt-5 text-lead text-mineral">
          {products.length} paires en catalogue. Chacune passe le même contrôle en huit points
          à la réception, et ce qui est constaté — défauts compris — figure sur sa fiche.
        </p>
      </header>

      <ShopBrowser initialOnlyInStock={dispo === 'en-stock'} />
    </div>
  );
}
