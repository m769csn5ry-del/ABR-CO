/* ------------------------------------------------------------------ *
 * CATALOGUE DE DÉMONSTRATION.
 * Paires plausibles, stocks et prix inventés, aucune photo réelle.
 * Remplacement : édite ou remplace ce tableau. Renseigne `images` avec
 * les chemins de tes visuels (ex. '/produits/xxx-1.jpg') — dès qu'un
 * chemin est présent, le visuel de substitution disparaît de lui-même.
 * ------------------------------------------------------------------ */
import type { Product } from '@/lib/types';

export const products: Product[] = [
  // ─── Sélection maison ────────────────────────────────────────────
  // Les quatre paires ci-dessous sont les modèles réels de la boutique.
  // Il ne manque que les photos : dépose les fichiers dans
  // public/produits/ sous les noms indiqués, puis remplis `images`.
  {
    slug: 'dior-b22-gris-bleu',
    brand: 'Dior',
    model: 'B22',
    colorway: 'Gris / Bleu ciel',
    condition: 'neuf',
    priceCents: 115000,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 1 }, { eu: 42, stock: 2 },
      { eu: 43, stock: 1 }, { eu: 44, stock: 1 }, { eu: 45, stock: 0 },
    ],
    // À remplir : '/produits/dior-b22-gris-bleu-1.jpg', etc.
    images: [],
    description:
      "Assemblage de cuir de veau gris, de mesh technique bleu ciel et de panneaux translucides, sur une semelle compensée signée DIOR. Le B22 mélange quatre matières sur une seule tige : c'est ce qui en fait l'intérêt, et ce qui impose un entretien matière par matière.",
    inspection: [
      'Étiquette de boîte cohérente avec le modèle et la pointure',
      'Numérotation identique sur les deux chaussures',
      'Mesh translucide sans accroc ni jaunissement',
      'Marquage de semelle net, sans bavure',
      'Cuir sans pli de port, aucune trace de sol',
    ],
    releaseYear: 2023,
    featured: true,
  },
  {
    slug: 'chanel-runner-blanc-argent',
    brand: 'Chanel',
    model: 'Runner',
    colorway: 'Blanc / Argent',
    condition: 'neuf',
    priceCents: 105000,
    sizes: [
      { eu: 36, stock: 1 }, { eu: 37, stock: 2 }, { eu: 38, stock: 1 },
      { eu: 39, stock: 1 }, { eu: 40, stock: 0 },
    ],
    // À remplir : '/produits/chanel-runner-blanc-argent-1.jpg', etc.
    images: [],
    description:
      "Cuir de veau blanc et empiècements en cuir métallisé argent, CC brodé sur le flanc, semelle bicolore blanc et noir. Le métallisé est la partie fragile : il marque au frottement et ne se rattrape pas au nettoyage classique.",
    inspection: [
      'Étiquette et boîte conformes au modèle',
      'Cuir métallisé sans micro-rayure ni écaillage',
      'CC brodé régulier, fils non tirés',
      'Semelle vierge, aucune trace de port',
      'Sac à poussière d\'origine fourni',
    ],
    releaseYear: 2024,
    featured: true,
  },
  {
    slug: 'prada-americas-cup-marine',
    brand: 'Prada',
    model: "America's Cup",
    colorway: 'Bleu marine / Gris',
    condition: 'neuf',
    priceCents: 78000,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 1 }, { eu: 42, stock: 2 },
      { eu: 43, stock: 1 }, { eu: 44, stock: 1 }, { eu: 45, stock: 1 },
    ],
    // À remplir : '/produits/prada-americas-cup-marine-1.jpg', etc.
    images: [],
    description:
      "Cuir verni bleu marine sur mesh gris, semelle en gomme blanche à débordement, languette Linea Rossa. Silhouette de pont de bateau des années 1990, restée au catalogue sans retouche majeure. Le verni se nettoie facilement, la gomme blanche beaucoup moins.",
    inspection: [
      'Étiquette de boîte cohérente avec le modèle et la pointure',
      'Cuir verni sans micro-fissure ni marque de pliure',
      'Mesh gris uniforme, aucune décoloration',
      'Semelle gomme blanche non oxydée',
      'Lacets et sockliner d\'origine en place',
    ],
    releaseYear: 2024,
    featured: true,
  },
  {
    slug: 'hermes-bouncing-blanc',
    brand: 'Hermès',
    model: 'Bouncing',
    colorway: 'Blanc / Noir',
    condition: 'neuf',
    priceCents: 79000,
    sizes: [
      { eu: 39, stock: 1 }, { eu: 40, stock: 1 }, { eu: 41, stock: 2 },
      { eu: 42, stock: 1 }, { eu: 43, stock: 1 }, { eu: 44, stock: 0 },
    ],
    // À remplir : '/produits/hermes-bouncing-blanc-1.jpg', etc.
    images: [],
    description:
      "Veau blanc et chèvre velours, H découpé sur le talon et repris en relief sous la semelle. Semelle striée en gomme, montage souple. Le velours de chèvre est la matière la plus délicate du lot : brossage à sec uniquement, jamais d'eau.",
    inspection: [
      'Boîte, sac et étiquette conformes',
      'Veau blanc sans marque de manipulation',
      'Chèvre velours au poil uniforme, non lustré',
      'H de semelle net, arêtes vives',
      'Semelle striée sans trace de sol',
    ],
    releaseYear: 2024,
    featured: true,
  },
  // ─── Classiques ──────────────────────────────────────────────────
  {
    slug: 'air-jordan-1-high-og-chicago',
    brand: 'Jordan',
    model: 'Air Jordan 1 Retro High OG',
    colorway: 'Chicago — White / Varsity Red / Black',
    condition: 'neuf',
    priceCents: 42000,
    sizes: [
      { eu: 41, stock: 1 }, { eu: 42, stock: 1 }, { eu: 43, stock: 2 },
      { eu: 44, stock: 1 }, { eu: 45, stock: 1 }, { eu: 46, stock: 0 },
    ],
    // À remplir : '/produits/air-jordan-1-high-og-chicago-1.jpg', etc.
    images: [],
    description:
      "La silhouette de 1985 dans le coloris qui l'a fixée. Cuir pleine fleur blanc, empiècements rouges, col montant noir. Deux points à surveiller dans le temps : le cuir marque à la flexion de la pointe, et l'intercalaire blanche jaunit au stockage — les deux se traitent, mais mieux vaut agir tôt.",
    inspection: [
      'Étiquette de boîte cohérente avec le modèle et la pointure',
      'Numérotation identique sur les deux chaussures',
      'Cuir sans pli de port, grain régulier',
      'Intercalaire blanche non oxydée',
      'Wings et Swoosh nets, piqûres régulières',
    ],
    releaseYear: 2022,
  },
  {
    slug: 'air-jordan-3-white-cement',
    brand: 'Jordan',
    model: 'Air Jordan 3 Retro',
    colorway: 'White Cement — White / Fire Red / Cement Grey',
    condition: 'neuf',
    priceCents: 24000,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 2 }, { eu: 42, stock: 1 },
      { eu: 43, stock: 1 }, { eu: 44, stock: 2 }, { eu: 45, stock: 1 },
    ],
    // À remplir : '/produits/air-jordan-3-white-cement-1.jpg', etc.
    images: [],
    description:
      "Cuir blanc tumbled, empiècements éléphant sur la pointe et le talon, unité Air visible, Jumpman sur la languette. L'imprimé éléphant est une impression sur cuir, pas une matière : un nettoyage abrasif l'efface définitivement. C'est la paire qu'on nous confie le plus souvent après une mauvaise manipulation.",
    inspection: [
      'Étiquette de boîte conforme au modèle',
      'Imprimé éléphant net, sans zone effacée',
      'Unité Air intacte, aucune perte de pression',
      'Cuir tumbled sans marque de manipulation',
      'Intercalaire blanche non jaunie',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'air-jordan-4-bred',
    brand: 'Jordan',
    model: 'Air Jordan 4 Retro',
    colorway: 'Bred — Black / Fire Red / Cement Grey',
    condition: 'tres-bon-etat',
    priceCents: 28000,
    compareAtCents: 34000,
    sizes: [
      { eu: 42, stock: 1 }, { eu: 43, stock: 1 }, { eu: 44, stock: 1 },
    ],
    // À remplir : '/produits/air-jordan-4-bred-1.jpg', etc.
    images: [],
    description:
      "Nubuck noir, filets latéraux en mesh, œillets en plastique moulé, semelle rouge et grise. Paire portée, passée par l'atelier avant mise en vente : nubuck rebrossé, filets dépoussiérés à basse pression, intercalaire dégrisée. Les marques restantes sont listées ci-dessous, sans retouche photo.",
    inspection: [
      'Portée : légère marque de flexion sur la pointe droite',
      'Nubuck rebrossé en atelier, teinte homogène',
      'Filets latéraux intacts, aucun fil tiré',
      'Œillets plastique sans fissure',
      'Intercalaire dégrisée, blanc homogène',
      'Lacets remplacés par des neufs',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'new-balance-990v6-grey',
    brand: 'New Balance',
    model: '990v6',
    colorway: 'Grey / Silver',
    condition: 'neuf',
    priceCents: 22900,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 2 }, { eu: 42, stock: 1 },
      { eu: 43, stock: 0 }, { eu: 44, stock: 2 }, { eu: 45, stock: 1 },
    ],
    images: [],
    description:
      "Le gris d'origine, sur la sixième génération de la 990. Tige en daim et mesh, amorti FuelCell, montage américain. Paire jamais portée, boîte d'origine et lacets de rechange fournis.",
    inspection: [
      'Étiquette de boîte cohérente avec le modèle et la pointure',
      'Numérotation identique sur les deux languettes',
      'Colle et surpiqûres régulières, aucune reprise',
      'Mousse intérieure intacte, aucune trace de port',
    ],
    releaseYear: 2022,
  },
  {
    slug: 'asics-gel-1130-cream',
    brand: 'ASICS',
    model: 'GEL-1130',
    colorway: 'Cream / Oyster Grey',
    condition: 'neuf',
    priceCents: 12500,
    compareAtCents: 14000,
    sizes: [
      { eu: 39, stock: 2 }, { eu: 40, stock: 1 }, { eu: 41, stock: 3 },
      { eu: 42, stock: 2 }, { eu: 43, stock: 1 }, { eu: 44, stock: 0 },
    ],
    images: [],
    description:
      "Silhouette running du début des années 2000 revenue au catalogue. Superpositions de mesh et de synthétique, GEL visible au talon. Coloris crème et gris, le plus facile à porter de la série.",
    inspection: [
      'Boîte et étiquette conformes',
      'GEL au talon sans déformation ni bulle',
      'Aucun jaunissement de la semelle intercalaire',
      'Semelle propre, aucune usure du crampon',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'salomon-xt-6-black',
    brand: 'Salomon',
    model: 'XT-6',
    colorway: 'Black / Phantom',
    condition: 'neuf',
    priceCents: 19500,
    sizes: [
      { eu: 40, stock: 0 }, { eu: 41, stock: 1 }, { eu: 42, stock: 2 },
      { eu: 43, stock: 1 }, { eu: 44, stock: 1 }, { eu: 45, stock: 0 },
    ],
    images: [],
    description:
      "Chaussure de trail devenue pièce de ville. Laçage Quicklace, châssis Agile Chassis System, semelle Contagrip. Le noir intégral, sans contraste, qui vieillit le mieux.",
    inspection: [
      'Laçage Quicklace complet et fonctionnel',
      'Aucune décoloration du textile technique',
      'Semelle Contagrip sans usure',
      'Boîte d\'origine présente',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'nike-air-max-1-obsidian',
    brand: 'Nike',
    model: 'Air Max 1',
    colorway: 'Obsidian / White',
    condition: 'neuf-sans-boite',
    priceCents: 13500,
    sizes: [
      { eu: 41, stock: 1 }, { eu: 42, stock: 1 }, { eu: 43, stock: 2 },
      { eu: 44, stock: 1 }, { eu: 45, stock: 1 },
    ],
    images: [],
    description:
      "La silhouette de 1987 dans son coloris bleu marine et blanc. Daim sur le mudguard, mesh sur les flancs, bulle d'air visible. Paire neuve, jamais portée, mais livrée sans sa boîte d'origine.",
    inspection: [
      'Bulle d\'air intacte, aucune perte de pression',
      'Daim uniforme, sans marque de manipulation',
      'Semelle vierge, aucune trace de sol',
      'Livrée sans boîte — le prix en tient compte',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'adidas-samba-og-white',
    brand: 'adidas',
    model: 'Samba OG',
    colorway: 'Cloud White / Core Black',
    condition: 'neuf',
    priceCents: 11000,
    sizes: [
      { eu: 38, stock: 1 }, { eu: 39, stock: 2 }, { eu: 40, stock: 2 },
      { eu: 41, stock: 3 }, { eu: 42, stock: 2 }, { eu: 43, stock: 1 }, { eu: 44, stock: 0 },
    ],
    images: [],
    description:
      "Chaussure de salle des années 1950 passée dans le vestiaire courant. Cuir pleine fleur, empiècement en suède sur la pointe, semelle gomme. Le coloris blanc et noir du catalogue permanent.",
    inspection: [
      'Cuir sans pli de port',
      'Semelle gomme non oxydée',
      'Trois bandes régulières, piqûres nettes',
      'Boîte et papier de soie présents',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'nike-dunk-low-panda',
    brand: 'Nike',
    model: 'Dunk Low',
    colorway: 'White / Black',
    condition: 'tres-bon-etat',
    priceCents: 9500,
    compareAtCents: 12000,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 42, stock: 1 }, { eu: 43, stock: 1 },
    ],
    images: [],
    description:
      "Paire portée avec précaution, passée à l'atelier avant mise en vente. Le cuir blanc a été nettoyé, la semelle dégrisée. Les défauts constatés sont listés ci-dessous, sans retouche photo.",
    inspection: [
      'Portée : légère marque de pli sur la pointe gauche',
      'Semelle intercalaire dégrisée en atelier, blanc homogène',
      'Semelle extérieure : usure faible et régulière',
      'Lacets remplacés par des neufs',
      'Sans boîte d\'origine',
    ],
    releaseYear: 2021,
  },
  {
    slug: 'new-balance-1906r-silver',
    brand: 'New Balance',
    model: '1906R',
    colorway: 'Silver Metallic / Sea Salt',
    condition: 'neuf',
    priceCents: 16500,
    sizes: [
      { eu: 40, stock: 2 }, { eu: 41, stock: 1 }, { eu: 42, stock: 0 },
      { eu: 43, stock: 2 }, { eu: 44, stock: 1 },
    ],
    images: [],
    description:
      "Réédition d'une silhouette running de 2010. Mesh et synthétique argenté, ABZORB et N-ergy au talon. Une des rares sneakers argentées qui ne vire pas au clinquant.",
    inspection: [
      'Revêtement argenté sans micro-rayure',
      'Amorti ABZORB ferme, aucun affaissement',
      'Sockliner d\'origine en place',
      'Boîte conforme au coloris',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'asics-gel-kayano-14-white',
    brand: 'ASICS',
    model: 'GEL-Kayano 14',
    colorway: 'White / Midnight',
    condition: 'neuf',
    priceCents: 15000,
    sizes: [
      { eu: 41, stock: 1 }, { eu: 42, stock: 2 }, { eu: 43, stock: 1 },
      { eu: 44, stock: 1 }, { eu: 45, stock: 1 },
    ],
    images: [],
    description:
      "Le running technique de 2008, avec ses empiècements argentés et son GEL apparent. Coloris blanc et bleu nuit. Structure lourde, très construite — c'est ce qui en fait l'intérêt aujourd'hui.",
    inspection: [
      'Empiècements argentés sans écaillage',
      'GEL avant et arrière intacts',
      'Mesh sans accroc',
      'Paire jamais portée, boîte d\'origine',
    ],
    releaseYear: 2023,
  },
  {
    slug: 'adidas-gazelle-indoor-blue',
    brand: 'adidas',
    model: 'Gazelle Indoor',
    colorway: 'Bright Blue / Gum',
    condition: 'neuf',
    priceCents: 10500,
    sizes: [
      { eu: 39, stock: 1 }, { eu: 40, stock: 2 }, { eu: 41, stock: 1 },
      { eu: 42, stock: 2 }, { eu: 43, stock: 0 },
    ],
    images: [],
    description:
      "Version indoor de la Gazelle, plus basse et plus étroite que la version terrain. Suède bleu franc, semelle gomme, trois bandes blanches. Le bleu est saturé sans être criard.",
    inspection: [
      'Suède dense, poil uniforme',
      'Semelle gomme claire, non jaunie',
      'Doublure textile sans marque',
      'Boîte d\'origine présente',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'nike-air-force-1-white',
    brand: 'Nike',
    model: 'Air Force 1 \'07',
    colorway: 'Triple White',
    condition: 'neuf',
    priceCents: 11500,
    sizes: [
      { eu: 39, stock: 2 }, { eu: 40, stock: 3 }, { eu: 41, stock: 2 },
      { eu: 42, stock: 3 }, { eu: 43, stock: 2 }, { eu: 44, stock: 1 }, { eu: 45, stock: 1 },
    ],
    images: [],
    description:
      "Le blanc intégral de 1982, toujours au catalogue. Cuir lisse, perforations sur la pointe, bulle d'air au talon. La paire la plus simple à entretenir, et celle qui le demande le plus.",
    inspection: [
      'Cuir uniforme, aucune marque de stockage',
      'Semelle blanche non oxydée',
      'Œillets et lacets d\'origine',
      'Boîte conforme',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'puma-speedcat-red',
    brand: 'PUMA',
    model: 'Speedcat OG',
    colorway: 'Rosso Corsa',
    condition: 'neuf',
    priceCents: 10000,
    sizes: [
      { eu: 38, stock: 1 }, { eu: 39, stock: 1 }, { eu: 40, stock: 2 },
      { eu: 41, stock: 1 }, { eu: 42, stock: 1 },
    ],
    images: [],
    description:
      "Chaussure de pilote automobile, semelle fine et profil très bas. Suède rouge, forme étroite. Taille petit : prends une demi-pointure au-dessus de ta taille habituelle.",
    inspection: [
      'Suède rouge sans marque ni auréole',
      'Semelle fine intacte',
      'Contrefort ferme',
      'Boîte d\'origine présente',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'veja-v-10-extra-white',
    brand: 'VEJA',
    model: 'V-10',
    colorway: 'Extra White / Nautico',
    condition: 'neuf',
    priceCents: 13000,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 2 }, { eu: 42, stock: 1 },
      { eu: 43, stock: 1 }, { eu: 44, stock: 0 },
    ],
    images: [],
    description:
      "Cuir tanné sans chrome et semelle en caoutchouc d'Amazonie. Logo V bleu marine sur tige blanche. Le cuir est plus souple que la moyenne : il se marque vite, il se nettoie bien.",
    inspection: [
      'Cuir sans pli ni marque',
      'Semelle caoutchouc naturel, teinte homogène',
      'Doublure coton bio en place',
      'Boîte et sachet d\'origine',
    ],
    releaseYear: 2024,
  },
  {
    slug: 'reebok-club-c-85-chalk',
    brand: 'Reebok',
    model: 'Club C 85',
    colorway: 'Chalk / Green',
    condition: 'neuf-sans-boite',
    priceCents: 7500,
    sizes: [
      { eu: 40, stock: 1 }, { eu: 41, stock: 1 }, { eu: 42, stock: 2 }, { eu: 43, stock: 1 },
    ],
    images: [],
    description:
      "Tennis en cuir de 1985, coupe basse et fine. Cuir crème, détail vert au talon. Paire neuve issue d'un fond de stock, livrée sans boîte.",
    inspection: [
      'Cuir crème uniforme',
      'Semelle non jaunie malgré le stockage',
      'Aucune trace de port',
      'Sans boîte — le prix en tient compte',
    ],
    releaseYear: 2022,
  },
  {
    slug: 'nike-p-6000-metallic',
    brand: 'Nike',
    model: 'P-6000',
    colorway: 'Metallic Silver / Sail',
    condition: 'tres-bon-etat',
    priceCents: 6500,
    sizes: [{ eu: 42, stock: 1 }, { eu: 44, stock: 1 }],
    images: [],
    description:
      "Assemblage de pièces de running Nike des années 2000. Paire portée, passée par l'atelier : mesh nettoyé, semelle dégrisée. Les marques restantes sont listées ci-dessous.",
    inspection: [
      'Portée : légère marque d\'usure sur le talon droit',
      'Mesh nettoyé, aucune tache résiduelle',
      'Semelle intercalaire dégrisée en atelier',
      'Lacets remplacés',
      'Sans boîte d\'origine',
    ],
    releaseYear: 2021,
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

export const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) =>
  a.localeCompare(b, 'fr'),
);

export const allSizes = [...new Set(products.flatMap((p) => p.sizes.map((s) => s.eu)))].sort(
  (a, b) => a - b,
);

export const inStock = (p: Product) => p.sizes.some((s) => s.stock > 0);

export const lowStock = (p: Product) => {
  const left = p.sizes.filter((s) => s.stock > 0);
  return left.length > 0 && left.length <= 2;
};
