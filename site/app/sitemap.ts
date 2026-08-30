import type { MetadataRoute } from 'next';

/* Requis par `output: export` : ces routes doivent être figées
   à la construction, elles n'ont de toute façon rien de dynamique. */
export const dynamic = 'force-static';
import { products } from '@/content/products';
import { site } from '@/content/site';

/* Plan du site. Les pages de compte, de suivi et de confirmation en sont
   exclues : elles sont personnelles et marquées noindex. */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/shop', priority: 0.9 },
    { path: '/nettoyage', priority: 0.9 },
    { path: '/nettoyage/commande', priority: 0.8 },
    { path: '/avant-apres', priority: 0.7 },
    { path: '/a-propos', priority: 0.5 },
    { path: '/faq', priority: 0.6 },
    { path: '/contact', priority: 0.5 },
    { path: '/mentions-legales', priority: 0.2 },
    { path: '/cgv', priority: 0.2 },
    { path: '/confidentialite', priority: 0.2 },
    { path: '/livraison-retours', priority: 0.3 },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${site.url}${r.path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: r.priority,
    })),
    ...products.map((p) => ({
      url: `${site.url}/shop/${p.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
