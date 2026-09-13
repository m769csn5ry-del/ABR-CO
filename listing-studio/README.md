# Listing Studio

Atelier d'annonces pour la location courte durée : la fiche d'un logement
entre, une annonce prête à publier sort — texte, galerie ordonnée, score,
prix argumenté, aperçu client et rapport.

Destiné aux conciergeries, agences, gestionnaires et propriétaires qui
produisent des annonces à la chaîne pour Airbnb, Booking.com, Vrbo, Abritel,
Expedia, Leboncoin, PAP, Facebook Marketplace — ou tout autre canal.

## Démarrer

```bash
cd listing-studio
npm start            # http://127.0.0.1:4173
```

Aucune installation n'est nécessaire : le serveur n'utilise que Node (18+).
L'application fonctionne intégralement sans backend — rédaction et analyse
d'image s'exécutent dans le navigateur. Le serveur sert les fichiers et
détient les secrets le jour où un fournisseur IA est branché.

Hébergement statique (Netlify, Vercel, Cloudflare Pages, GitHub Pages) :
publiez le dossier `listing-studio/` tel quel. Le routage vit dans le
fragment d'URL (`#/…`), il n'y a donc aucune règle de réécriture à écrire.

## Le parcours

Douze étapes, chacune produisant un livrable utilisable :

| # | Étape | Ce qui en sort |
|---|-------|----------------|
| 1 | Logement | Fiche complète : type, capacité, surface, ~50 équipements + personnalisés |
| 2 | Positionnement | Public, style, points forts, ton, alentours, conditions de séjour |
| 3 | Photos | Import JPG/PNG/WEBP, analyse et note sur 100 par image |
| 4 | Ordre | Galerie ordonnée, chaque position justifiée, réorganisable |
| 5 | Photos manquantes | Checklist déduite des équipements déclarés |
| 6 | Plateformes | Sélection multiple ou « toutes », règles de chaque canal |
| 7 | Annonce | Titre + variantes, accroche, descriptions, pièces, règles, FAQ, CTA |
| 8 | Prix | Fourchette argumentée, trois positionnements |
| 9 | Optimisation | Listing Score /100 et améliorations chiffrées |
| 10 | Aperçu | Simulation desktop, mobile, carte et page complète |
| 11 | Rapport | Document client, exportable en PDF |
| 12 | Export | Texte, PDF, JSON, CSV, et une version par plateforme |

Le **mode démo** (`#/demo`) produit l'ensemble en une trentaine de secondes
à partir d'un logement fictif, pour montrer le résultat à un prospect.

## Trois règles qui tiennent le produit

**Rien n'est inventé.** Le moteur de rédaction n'écrit que ce que la fiche
contient. Une information absente n'est pas comblée : elle apparaît en
`[Information manquante : …]` dans le texte et dans la liste des champs à
renseigner. Aucun commerce, aucune distance, aucun point d'intérêt n'est
imaginé — seuls ceux saisis à l'étape 2 sortent dans l'annonce.
Le test `tests/run.js` échoue si un équipement non coché apparaît.

**Les estimations tarifaires ne se déguisent pas en données de marché.** La
recommandation se calcule à partir des seuls paramètres saisis (saison,
durée, équipements, qualité de l'annonce) et s'affiche comme estimation
interne, avec sa date. Le jour où une source externe est branchée, sa
provenance et sa date d'extraction s'affichent à la place.

**Les aperçus sont des simulations neutres.** Aucun logo, aucune couleur,
aucune mise en page propriétaire n'est reproduite. Chaque aperçu porte la
mention « Simulation créée avec Listing Studio ». Les projets de
démonstration sont marqués partout — interface, aperçu, rapport, exports —
et leurs photos portent une pastille « DÉMO ».

## Ce qui est réellement calculé

**Analyse photo** (`src/photos/analyzer.js`) : les notes viennent de mesures
sur les pixels, pas d'un tirage. Netteté par variance du laplacien,
exposition et écrêtage par histogramme, contraste par écart-type, densité et
orientation des contours par Sobel (d'où la perspective et le désordre),
colorimétrie de Hasler-Süsstrunk, répartition de l'énergie sur une grille
3×3 pour la composition. La pièce représentée est déduite du nom de fichier
puis de la signature colorimétrique, avec son niveau de confiance — et reste
corrigeable d'un clic.

**Listing Score** (`src/scoring/listingScore.js`) : 100 points répartis en six
familles (titre 20, photos 20, description 20, équipements 15, informations
10, positionnement 15). Chaque point perdu correspond à une action nommée,
chiffrée en gain, et cliquable vers l'étape concernée. Trois niveaux :
faible (< 55), bon (55-79), excellent (≥ 80).

## Architecture

```
listing-studio/
  index.html              coquille applicative
  assets/css/             jetons de design, coquille, composants, vues, impression
  src/
    core/                 util, base locale, stockage fichiers, routeur, modales, notifications
    data/                 vocabulaire métier, templates, démo, service de projets
    ai/                   façade IA : moteur local + client serveur + assistant
    platforms/            un adaptateur de formatage par plateforme
    photos/               analyse, classification, ordre, couverture
    scoring/ pricing/     Listing Score, stratégie tarifaire
    export/ report/       texte, JSON, CSV, PDF, rapport client
    views/                pages et étapes du parcours
  server/
    server.js             fichiers statiques + /api/* (sans dépendance)
    ai-provider.js        appels au fournisseur IA — la clé reste ici
    schema.sql            schéma PostgreSQL avec Row Level Security
    .env.example          configuration
  tests/                  unitaires (Node) et bout en bout (navigateur)
```

Les couches sont séparées : les vues ne touchent jamais au stockage, elles
passent par `src/data/projects.js` ; les moteurs ne connaissent pas
l'interface ; la base locale (`src/core/db.js`) reproduit le schéma serveur,
table pour table, et filtre chaque lecture sur l'utilisateur courant.

### Clés d'API

Le navigateur n'appelle que `/api/*`. La clé du fournisseur vit dans
`ANTHROPIC_API_KEY` côté serveur et n'est jamais transmise au client.
Sans clé, `/api/health` annonce « non configuré » et l'application bascule
d'elle-même sur son moteur local — le comportement reste identique pour
l'utilisateur.

```bash
cp server/.env.example .env     # puis renseignez la clé
npm install                     # installe le SDK officiel (dépendance optionnelle)
ANTHROPIC_API_KEY=... npm start
```

### Ajouter une plateforme

Un fichier, une ligne de registre :

```js
// src/platforms/ma-plateforme.js
import { defineAdapter } from './base.js';

export default defineAdapter({
  id:'ma-plateforme', label:'Ma plateforme', group:'Petites annonces',
  limits:{ title:60, short:200, long:3000 },
  rules:['Titre de 60 caractères maximum.'],
  build(c, h){
    return [
      { id:'title', label:'Titre', text:h.fit(c.title, 60).text, limit:60 },
      { id:'body',  label:'Annonce', text:h.stripContacts(c.longDescription) },
    ];
  },
});
```

Puis l'importer dans `src/platforms/index.js`. L'interface, les exports, le
rapport et les contrôles de conformité la prennent en compte automatiquement.

### Base de données

`server/schema.sql` crée les tables attendues — Users, Clients, Properties,
Projects, Listings, ListingVersions, Photos, PhotoAnalyses, Platforms,
Templates, Reports, PricingRecommendations — avec les politiques RLS qui
garantissent qu'un utilisateur ne lit que ses propres lignes, même en cas
d'erreur applicative. La version navigateur applique la même règle dans
`src/core/db.js`.

## Tests

```bash
npm test                                   # 33 tests unitaires, sans navigateur
PLAYWRIGHT_MODULES=/chemin/node_modules \
  node tests/e2e.mjs                       # 19 parcours dans Chromium
```

Les tests de bout en bout échouent à la moindre erreur console : une annonce
qui casse doit se voir en intégration, pas devant un client. Ils couvrent
l'accueil, la démo complète, l'analyse photo, le glisser-déposer, la
génération, le prix, le score, le rapport, les exports, l'assistant, la
sauvegarde automatique, le CRM, les routes inconnues et le responsive.

## Données et vie privée

Tout vit dans le navigateur : les enregistrements dans `localStorage`, les
fichiers photo dans IndexedDB. Rien n'est envoyé sur un serveur tant qu'aucun
fournisseur n'est configuré. Les paramètres permettent d'exporter une
sauvegarde complète, de la réimporter, ou d'effacer l'espace de travail.

## Modèle commercial

Trois plans — Free (3 projets), Pro, Agency — structurent l'accès aux
fonctionnalités. Aucun paiement n'est branché : le changement de plan est une
simulation, le temps que le socle produit soit finalisé.
