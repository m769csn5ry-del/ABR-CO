import type { NextConfig } from 'next';

/* Deux modes de sortie.
 *
 * · Par défaut : application complète (routes d'API, rendu serveur).
 *   C'est ce qui part sur Vercel / Node une fois Stripe et le reste raccordés.
 *
 * · `STATIC_EXPORT=1` : export statique pour la démonstration publiée sur
 *   GitHub Pages. Pages ne sert que des fichiers : pas de route d'API, donc
 *   le workflow retire `app/api` avant la construction et l'interface bascule
 *   sur NEXT_PUBLIC_DEMO_STATIC — elle affiche exactement les mêmes messages
 *   « non raccordé », sans appel réseau qui ne pourrait pas aboutir.
 */
const isStatic = process.env.STATIC_EXPORT === '1';

/* Pages sert un projet sous /<dépôt>/, et la démo vit dans un sous-dossier
   pour ne pas écraser l'app Orga publiée à la racine. */
const basePath = process.env.PAGES_BASE_PATH ?? '';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,

  ...(isStatic
    ? {
        output: 'export' as const,
        basePath,
        assetPrefix: basePath || undefined,
        // Pages n'a pas d'optimiseur d'images : on sert les fichiers tels quels.
        images: { unoptimized: true },
        // Chaque route devient un dossier avec son index.html.
        trailingSlash: true,
      }
    : { images: { remotePatterns: [] } }),
};

export default config;
