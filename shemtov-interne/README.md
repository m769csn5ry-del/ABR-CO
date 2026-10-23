# Shemtov Foch · site vitrine

Document technique interne. Seul le dossier `shemtov/` est mis en ligne ; `shemtov-interne/` ne l'est jamais.

- `RAPPORT.md` : audit, choix, performance, accessibilité, sécurité, conformité, déploiement
- `SUIVI.md` : ce qui est vérifié, ce qui reste à confirmer
- `rapports/tests.md` : résultat du dernier passage des tests

## Organisation

```
shemtov/                      site publié (HTML statique, aucune compilation)
  index.html                  accueil : présentation, rayons, visite guidée, infos pratiques
  mentions-legales.html, confidentialite.html, 404.html
  _headers, vercel.json       en-têtes de sécurité (Netlify, Vercel)
  robots.txt                  généré
  assets/
    style.css                 styles (thème clair et sombre)
    site.js                   statut ouvert/fermé, menu, copie d'adresse, visite guidée
    anim.js                   animations GSAP, chargées seulement si le mouvement est autorisé
    donnees.js                généré depuis donnees.json
    vendor/                   GSAP 3.13.0 et ScrollTrigger (licence standard GreenSock)
    fonts/                    Fredoka et Figtree (licence SIL OFL)
    photos/                   photos optimisées (WebP), générées
    logo.png, logo-128.png, favicon.png, apple-touch-icon.png, og.jpg
shemtov-interne/
  contenu/donnees.json        SOURCE UNIQUE : coordonnées, horaires, exceptions, fêtes, informations légales
  outils/synchroniser.py      reporte donnees.json dans les pages
  outils/photos.py            prépare les photos depuis les originaux
  outils/apercu.py            fabrique un aperçu d'une seule page par fichier HTML
  plan/generer_plan.py        plan 2D (image de travail et version web interactive)
  tests/tester.mjs            banc de tests (Playwright, axe-core)
  tests/serveur.mjs           serveur local avec les en-têtes de sécurité
```

## Commandes

```
python3 shemtov-interne/outils/synchroniser.py              # après toute modification de donnees.json
python3 shemtov-interne/outils/photos.py <dossier-originaux> # après ajout ou changement de photos
python3 shemtov-interne/plan/generer_plan.py                # après modification du plan, puis synchroniser
node shemtov-interne/tests/serveur.mjs 8080                 # voir le site sur http://127.0.0.1:8080/
AXE_PATH=<chemin>/axe.min.js node shemtov-interne/tests/tester.mjs   # tests
python3 shemtov-interne/outils/apercu.py <dossier>          # aperçus autonomes
```

## Horaires exceptionnels

Dans `donnees.json`, liste `exceptions`, une entrée par date :

```json
{ "date": "2026-12-04", "horaires": ["08:00", "15:00"], "note": "Veille de Hanoukah : fermeture à 15h." }
{ "date": "2026-12-12", "horaires": null }
```

`null` signifie fermé toute la journée. Un encadré orange apparaît en haut de page pendant les 14 jours qui précèdent, et le statut ouvert/fermé en tient compte.

## Photos

Noms attendus des originaux : voir `PHOTOS` dans `outils/photos.py` (`01-fromages.png`, `15-epicerie-vue.png`, `17-bonbons.png`…). Les originaux ne sont pas dans le dépôt (3 à 4 Mo chacun). Le script recadre, produit des WebP en plusieurs largeurs sans jamais agrandir, et supprime les métadonnées.

## Mise en ligne

Voir `RAPPORT.md`, section 8. Le `netlify.toml` et le `vercel.json` à la racine du dépôt servent à un autre projet (`todo/`) : ne pas les modifier.
