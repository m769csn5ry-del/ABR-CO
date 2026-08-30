import type { MetadataRoute } from 'next';

/* Requis par `output: export` : ces routes doivent être figées
   à la construction, elles n'ont de toute façon rien de dynamique. */
export const dynamic = 'force-static';
import { site } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espaces personnels et pages transactionnelles : rien à indexer.
      disallow: ['/compte', '/compte/', '/panier', '/commande', '/suivi/'],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
