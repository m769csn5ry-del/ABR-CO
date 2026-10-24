# Shemtov Foch · site vitrine

Document technique interne. Seul le dossier `shemtov/` est mis en ligne ; `shemtov-interne/` ne l'est jamais.

- `RAPPORT.md` : rapport de la refonte V4 (réalisations, tests, performance, sécurité, conformité, statuts)
- `SUIVI.md` : informations vérifiées, alertes, ce qui reste à confirmer
- `rapports/tests.md` : résultat du dernier passage des tests
- `rapports/performance.md` : dernières mesures Lighthouse

## Organisation

```
shemtov/                      site publié (HTML statique, aucune compilation)
  index.html                  accueil
  le-magasin.html             présentation du magasin, photos
  nos-rayons.html             les 9 rayons
  infos-pratiques.html        horaires, horaires exceptionnels, adresse, carte Google (au clic), fêtes
  contact.html, faq.html
  mentions-legales.html, confidentialite.html, 404.html
  _headers, vercel.json       en-têtes de sécurité (Netlify, Vercel), mêmes valeurs
  robots.txt                  généré (sitemap.xml aussi, dès que le domaine est connu)
  assets/
    style.css                 styles (identité claire)
    site.js                   statut ouvert/fermé, menu, copie d'adresse, carte au clic, pastilles des rayons
    anim.js                   animations GSAP, chargées après la page et seulement si le mouvement est autorisé
    donnees.js                généré depuis donnees.json
    vendor/                   GSAP 3.13.0 et ScrollTrigger (licence standard GreenSock)
    fonts/                    Plus Jakarta Sans (titres) et Inter (textes), licence SIL OFL
    photos/                   photos optimisées (WebP, 3 largeurs), générées
    logo-160/320/480.webp, favicon.png, apple-touch-icon.png, og.jpg
shemtov-interne/
  contenu/donnees.json        SOURCE UNIQUE : coordonnées, horaires, exceptions, fêtes, rayons, FAQ, informations légales
  outils/synchroniser.py      remplit les blocs <!-- donnees:xxx --> des pages depuis donnees.json
  outils/photos.py            prépare photos, logo transparent, icônes et image de partage
  outils/apercu.py            fabrique un aperçu autonome de chaque page
  marque/logo-hd.png          logo haute définition reçu
  plan/                       plan 2D de travail (interne, retiré du site à la V4)
  tests/tester.mjs            banc de tests : 10 scénarios clients et contrôles techniques (Playwright, axe-core)
  tests/mesurer.mjs           mesures Lighthouse de toutes les pages
  tests/serveur.mjs           serveur local avec les en-têtes de sécurité et la compression
```

## Commandes

```
python3 shemtov-interne/outils/synchroniser.py              # après toute modification de donnees.json
python3 shemtov-interne/outils/photos.py <dossier-originaux> # après ajout ou changement de photos
node shemtov-interne/tests/serveur.mjs 8080                 # voir le site sur http://127.0.0.1:8080/
AXE_PATH=<chemin>/axe.min.js node shemtov-interne/tests/tester.mjs   # tests (SEULEMENT=S01,T10 pour en lancer quelques-uns)
LIGHTHOUSE=<chemin>/lighthouse node shemtov-interne/tests/mesurer.mjs # mesures de performance
python3 shemtov-interne/outils/apercu.py <dossier>          # aperçus autonomes
```

## Mettre à jour les horaires (sans toucher aux pages)

Tout se fait dans `shemtov-interne/contenu/donnees.json`, puis `python3 shemtov-interne/outils/synchroniser.py`.

Horaires habituels : `"lundi": ["08:00", "20:00"]`, `null` pour un jour fermé.

Horaires exceptionnels (fête, congé) : une entrée par date dans `exceptions` :

```json
{ "date": "2026-12-04", "horaires": ["08:00", "15:00"], "note": "Veille de Hanoukah : fermeture à 15h." }
{ "date": "2026-12-12", "horaires": null }
```

`null` signifie fermé toute la journée. Pendant les 14 jours qui précèdent, un bandeau apparaît en haut de l'accueil et un encadré dans Infos pratiques ; le statut ouvert/fermé en tient compte. Le script refuse une heure ou une date mal écrite.

Fêtes : liste `fetes` (nom, début, fin, texte). Les fêtes passées disparaissent seules ; ajouter l'année suivante en septembre.

## Blocs générés

Les pages contiennent des blocs `<!-- donnees:xxx --> … <!-- /donnees:xxx -->` : ne pas les modifier à la main, ils sont réécrits par `synchroniser.py` (en-tête, pied de page, horaires, fêtes, rayons, FAQ, mentions, photos `img-xxx`). Le texte en dehors des blocs se modifie directement dans les pages. Le script vérifie aussi que le numéro et l'adresse écrits dans les pages correspondent aux données, et ajoute les espaces insécables avant « : ; ? ! ».

## Photos

Noms attendus des originaux : voir `PHOTOS` dans `outils/photos.py` (`01-fromages.png`, `15-epicerie-vue.png`…). Les originaux ne sont pas dans le dépôt (3 à 4 Mo chacun). Le script recadre, produit des WebP en 480, 760 et 940 px sans jamais agrandir, et supprime les métadonnées. Les photos fixes des pages sont choisies dans `IMAGES` (`outils/synchroniser.py`), celles des rayons dans `donnees.json`.

## Mise en ligne

Voir `RAPPORT.md`, section « Déploiement ». Le `netlify.toml` et le `vercel.json` à la racine du dépôt servent à un autre projet (`todo/`) : ne pas les modifier. Après la mise en ligne : déclarer le site dans Google Search Console (propriété de domaine, vérification DNS chez OVH), y envoyer `sitemap.xml`, et ajouter l'adresse du site sur la fiche Google et la page Facebook.
