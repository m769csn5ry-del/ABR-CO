import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  /* Le dépôt contient plusieurs lockfiles (site/ est imbriqué) : on
     désigne explicitement la racine pour le traçage des fichiers. */
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  images: {
    // Les visuels de démonstration sont des SVG générés localement.
    // Ajoute ici le domaine de ton CDN quand les vraies photos arrivent.
    remotePatterns: [],
  },
};

export default config;
