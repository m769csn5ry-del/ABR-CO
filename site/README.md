# NEUF — boutique de sneakers et atelier de remise à neuf

Site complet : vente de paires neuves authentifiées **et** service de nettoyage /
restauration, sous une seule marque. Next.js 15 (App Router), TypeScript, Tailwind v4.

**« État neuf » est le nom et le positionnement** : la boutique vend des paires neuves,
l'atelier remet les tiennes à neuf. La couleur signature (verdigris) désigne partout la
branche atelier, l'encre la branche boutique — le visiteur apprend le code en une section.

**Le site en ligne : https://m769csn5ry-del.github.io/ABR-CO/neuf/**

Cette démonstration est un export statique publié automatiquement par
`.github/workflows/site-neuf.yml` à chaque modification de `site/`. GitHub Pages
ne sert que des fichiers : les routes d'API en sont retirées et l'interface
bascule sur `NEXT_PUBLIC_DEMO_STATIC`, qui affiche exactement les mêmes messages
« non raccordé ». Rien n'y est simulé — aucune commande, aucun paiement.

Pour un vrai déploiement (Vercel, Node), la construction par défaut conserve les
routes d'API et le rendu serveur : voir « Ce qui reste à brancher ».

---

## Démarrer

```bash
cd site
npm install
npm run dev          # http://localhost:3000
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | 174 tests Playwright (bureau, tablette, iPhone) |
| `npm run audit:ui` | Détecteur Impeccable sur le code source |

---

## Ce qu'il faut modifier pour rendre le site réel

Tout le contenu commercial est isolé dans `content/`. **Aucun composant à toucher.**

| Fichier | Contenu |
| --- | --- |
| `content/site.ts` | **À remplir en premier.** E-mail, téléphone, adresse, horaires, réseaux sociaux, frais de port, délais, code promo. Les champs à `null` sont volontairement vides : aucune coordonnée n'a été inventée. |
| `content/products.ts` | Catalogue. 14 paires de démonstration. |
| `content/services.ts` | Les trois prestations, prix, durées, contenus, matières acceptées. |
| `content/faq.ts` | Questions / réponses (alimente aussi le balisage `FAQPage`). |
| `content/beforeafter.ts` | Cas avant / après. |
| `content/process.ts` | Les six temps de l'atelier et la section confiance. |
| `DESIGN.md` | Le système de design. Le détecteur Impeccable lit son frontmatter. |

### Ajouter de vraies photos

Aucune photo n'est fournie. Chaque emplacement affiche un **visuel de substitution
explicitement marqué** (schéma technique de semelle, `components/media/Visual.tsx`).

**1. Dépose les fichiers** dans `site/public/` :

```
site/public/produits/990v6-gris-1.jpg      ← photos des paires
site/public/avant-apres/cuir-blanc-avant.jpg
site/public/avant-apres/cuir-blanc-apres.jpg
```

**2. Renseigne le chemin** dans `content/` — et rien d'autre. Dès qu'un chemin est
présent, le substitut disparaît de lui-même et `next/image` prend le relais.

```ts
// content/products.ts
{
  slug: 'new-balance-990v6-grey',
  images: [
    '/produits/990v6-gris-1.jpg',   // vue principale
    '/produits/990v6-gris-2.jpg',   // profil intérieur
    '/produits/990v6-gris-3.jpg',   // semelle
  ],
}
```

```ts
// content/beforeafter.ts
{
  id: 'cuir-blanc-plis',
  before: '/avant-apres/cuir-blanc-avant.jpg',
  after:  '/avant-apres/cuir-blanc-apres.jpg',
}
```

Le chemin commence par `/` et **ne contient pas** `public/` ni le nom du dépôt :
`/produits/x.jpg`, pas `/public/produits/x.jpg` ni `/ABR-CO/neuf/produits/x.jpg`.
Le préfixe de déploiement est ajouté automatiquement (`asset()` dans `lib/runtime.ts`).

**Format attendu**

| | |
| --- | --- |
| Proportions | **4:5 vertical** — c'est le cadre des cartes, de la galerie et de l'avant/après |
| Taille | 1200 × 1500 px suffit ; au-delà on alourdit sans gain visible |
| Format | JPEG pour les photos, WebP si tu peux. PNG seulement pour du détourage |
| Poids | vise moins de 300 Ko par image |
| Nombre | 1 à 4 par paire. La galerie affiche autant de vignettes qu'il y a d'entrées |
| Avant / après | **cadrage strictement identique** entre les deux, sinon la comparaison ne veut rien dire |

Le zoom de la fiche produit ne s'active que sur de vraies photos — il reste inerte
sur les substituts, où il n'aurait rien à montrer.

**Style visé** (documenté dans `DESIGN.md`) : studio, fond minéral continu, lumière
latérale douce, paire de trois quarts ou de profil strict, ombre portée courte.
Pas de mise en scène lifestyle, pas de rue, pas de modèle.

**3. Publie** : `git add`, `git commit`, `git push`. Le workflow reconstruit et met
le site en ligne tout seul.

---

## Ce qui reste à brancher pour la production

Rien n'est simulé : chaque route non raccordée répond `501` avec un message explicite,
et l'interface le dit à l'utilisateur plutôt que d'afficher une fausse confirmation.

| Sujet | Où | Ce qu'il faut faire |
| --- | --- | --- |
| **Paiement** | `app/api/commande/route.ts` | `npm i stripe`, renseigner `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, créer une Checkout Session, ajouter `app/api/webhooks/stripe/route.ts` pour décrémenter le stock et envoyer la confirmation. **Recalculer le montant côté serveur depuis le catalogue** — jamais depuis le panier client. |
| **Demandes d'atelier** | `app/api/entretien/route.ts` | `CARE_INBOX` + stockage des photos (S3 / R2 / UploadThing). Le parcours envoie aujourd'hui le *nombre* de photos ; passer le formulaire en `multipart` pour pousser les fichiers. |
| **Formulaire de contact** | `app/api/contact/route.ts` | `CONTACT_INBOX` + un service d'envoi (Resend, Postmark…). |
| **Lettre d'information** | `app/api/newsletter/route.ts` | `NEWSLETTER_API_KEY` + `NEWSLETTER_LIST_ID`. |
| **Comptes clients** | `app/compte/*`, `components/account/` | Fournisseur d'identité (Auth.js, Clerk, Supabase Auth) puis lecture des commandes. Les écrans existent déjà. |
| **Suivi d'atelier** | `app/suivi/[reference]/page.tsx` | Lire la commande en base et passer le statut réel à `<StatusTimeline>`. Les neuf étapes sont déjà implémentées. |
| **Panier serveur** | `lib/cart.tsx` | Aujourd'hui `localStorage`. L'API (`add` / `setQty` / `remove`) ne change pas si tu la synchronises avec un panier serveur. |
| **E-mails transactionnels** | — | Confirmation de commande, réception de la paire, devis, changement de statut. |
| **Administration** | — | Aucune fausse interface n'a été construite. Le modèle de données (`lib/types.ts`) et l'isolement de `content/` permettent de brancher un CMS headless (Sanity, Payload) ou un back-office maison sans retoucher les composants. |
| **Mentions légales, CGV, confidentialité** | `app/mentions-legales`, `app/cgv`, `app/confidentialite` | **Aucun texte juridique n'a été rédigé.** Les pages listent les rubriques obligatoires avec ce qu'elles doivent contenir. À faire écrire et relire par un juriste. |
| **Nom de marque** | — | Vérifier la disponibilité « NEUF » (INPI, domaine, comptes sociaux). C'est un mot courant : force mnémotechnique, faiblesse en recherche. Non vérifié ici. |
| **URL canonique** | `content/site.ts` (`url`) | Actuellement `https://example.com` — sert au sitemap, aux canonicals et à l'Open Graph. |

---

## Architecture

```
site/
├── DESIGN.md              Système de design (lu par le détecteur Impeccable)
├── app/
│   ├── layout.tsx         En-tête, pied de page, contexte panier, métadonnées
│   ├── page.tsx           Accueil
│   ├── shop/              Catalogue, filtres, fiche produit (SSG)
│   ├── nettoyage/         Landing atelier + parcours de commande en 9 étapes
│   ├── avant-apres/       Galerie comparative
│   ├── panier/, commande/ Panier, tunnel, confirmation
│   ├── compte/, suivi/    Espace client, suivi d'atelier
│   ├── api/               Routes non raccordées (répondent 501 explicitement)
│   ├── sitemap.ts, robots.ts, icon.svg
├── components/
│   ├── layout/  ui/  shop/  care/  home/  media/  account/
├── content/               ← tout le contenu commercial
├── lib/                   Types, panier, formatage
└── tests/                 Playwright
```

### Choix techniques

- **Aucune bibliothèque d'animation.** Transitions CSS + `IntersectionObserver` +
  `clip-path`. Le comparateur avant/après et les entrées progressives n'ont pas besoin de
  Framer Motion, et 40 ko de JavaScript en moins profitent au premier achat.
- **Aucune bibliothèque d'icônes** : sept glyphes dessinés dans `components/ui/Icon.tsx`.
- **Polices auto-hébergées** depuis npm (`@fontsource`) — aucun appel à Google Fonts,
  donc pas de requête tierce ni de décalage de mise en page.
- **Montants en centimes** partout : jamais de flottant sur de la monnaie.
- **Marqueur d'hydratation** (`<html data-hydrated>`) posé par le contexte panier : sert
  au diagnostic et rend les tests de bout en bout déterministes.

---

## Accessibilité et performance

- Lien d'évitement, `aria-current`, focus visible non supprimé, hiérarchie de titres sans
  saut, tous les champs étiquetés, zones tactiles ≥ 44 px, `prefers-reduced-motion`
  respecté (les fondus restent, les déplacements tombent).
- **Le contenu est visible par défaut** : l'état masqué des entrées progressives n'est posé
  qu'en `useLayoutEffect`, donc uniquement si le JavaScript tourne. Un filet de sécurité
  révèle tout au bout de 2 s si l'observateur ne se déclenche jamais.
- Contrastes vérifiés (encre/papier 17,2:1 · minéral/papier 5,1:1 · verdigris/papier 7,2:1).
- 14 fiches produit pré-générées (SSG), ~103 ko de JS partagé.
- `scroll-padding-top` pour que les ancres ne passent pas sous l'en-tête collé.

## SEO

Titres et descriptions par page, Open Graph, `sitemap.xml`, `robots.txt` (espaces
personnels exclus), URLs propres, données structurées `Product` sur les fiches et
`FAQPage` sur la FAQ. **Aucune note ni avis n'est déclaré** — il n'en existe pas.

---

## Tests

```bash
npm test                       # les trois profils
npx playwright test --project=mobile
npx playwright test --ui       # mode interactif
```

174 tests sur **bureau (1280)**, **tablette (iPad 810)** et **iPhone 13** : chargement de
chaque page sans erreur console, titre unique, absence de débordement horizontal de 320 à
1600 px, liens internes, filtres, tri, fiche produit, tailles épuisées, panier persistant,
code promo, refus de simuler un paiement, recherche, parcours d'atelier de bout en bout,
retour en arrière sans perte, envoi de photos, comparateur au clavier, menu mobile,
accessibilité et mouvement réduit.

`playwright.config.ts` reconstruit systématiquement (pas de réutilisation d'un serveur déjà
lancé, qui ferait passer les tests sur une build périmée) et se limite à deux travailleurs :
au-delà, le serveur Node et les navigateurs saturent les mêmes cœurs.

## Audit d'interface

`npm run audit:ui` lance le détecteur Impeccable sur le code source : **0 anti-motif**,
avis compris. Le détecteur lit le frontmatter de `DESIGN.md` et signale toute couleur,
police, taille ou rayon employé hors système — c'est ce qui garde le design system
vivant plutôt que décoratif.

Un passage sur le **DOM rendu** (pages sauvegardées puis analysées) remonte en plus
196 `cramped-padding` : ils portent tous sur le motif de séparation en filet
(`border-b` sur une ligne de liste dont l'enfant occupe toute la hauteur). La règle mesure
des boîtes, pas du texte ; le texte, lui, est centré dans sa ligne. C'est un écart assumé
du système graphique, documenté dans `DESIGN.md` section 2.
