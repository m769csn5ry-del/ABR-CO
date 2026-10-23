# Shemtov Foch · site vitrine

Document technique interne. Le site publié est uniquement le dossier `shemtov/` ; ce dossier-ci (`shemtov-interne/`) n'est jamais mis en ligne.

## Organisation
- `shemtov/index.html` : la page d'accueil
- `shemtov/mentions-legales.html` : mentions légales (données vérifiées uniquement)
- `shemtov/assets/style.css`, `site.js` : styles et script
- `shemtov/assets/fonts/` : polices Fredoka et Figtree (licence SIL OFL), hébergées avec le site
- `shemtov/assets/logo.png` : logo fourni (217 × 233 px), à remplacer par une version haute définition
- `shemtov-interne/SUIVI.md` : ce qui est vérifié, ce qui reste à confirmer
- `shemtov-interne/plan/` : plan 2D du magasin (voir plus bas)
- `shemtov-interne/outils/apercu.py` : fabrique un aperçu d'une seule page, sans dépendance

## Ce qui est automatique
- **Ouvert / fermé** en haut de page, calculé à l'heure de Paris.
- **Jour en cours** surligné dans le tableau des horaires.
- **Prochaines fêtes** : les fêtes passées disparaissent, la suivante est mise en avant avec le nombre de jours restants. Dates dans les attributs `data-start` et `data-end` de chaque `<li class="fete">` (source : calendrier Hebcal, diaspora). La liste va jusqu'à Roch Hachana 5788 (octobre 2027).

## Changer les horaires
- **Horaires habituels** : attributs `data-open` et `data-close` des lignes du tableau `#hours` dans `index.html`. Le texte affiché, le statut et le jour surligné sont recalculés à partir d'eux. Mettre aussi à jour le bloc JSON-LD du `<head>`.
- **Horaires exceptionnels** : liste `EXCEPTIONS` en haut de `shemtov/assets/site.js`, une ligne par date, avec un exemple en commentaire. Un encadré orange apparaît en haut de page pendant les 14 jours qui précèdent la date, et le statut Ouvert / Fermé en tient compte.

## Photos
Déposer les fichiers dans `shemtov/assets/photos/` avec ces noms exacts : ils s'affichent tout seuls, et sans fichier le site reste propre (pictogramme à la place de la photo).
- `facade.jpg` : façade du magasin
- `rayon-epicerie.jpg`, `rayon-frais.jpg`, `rayon-viande.jpg`, `rayon-poisson.jpg`, `rayon-surgeles.jpg`, `rayon-vin.jpg`, `rayon-douceurs.jpg`, `rayon-sans-gluten.jpg`

Format conseillé : JPEG horizontal, 1600 px de large, moins de 400 Ko chacun. Une zone photo reste cachée tant que son fichier n'existe pas. Quand les photos sont toutes là, ajouter `loading="lazy"` aux balises `<img>` des tuiles pour alléger le chargement.

## Aperçu d'une seule page
```
python3 shemtov-interne/outils/apercu.py <dossier-de-sortie>
```
Écrit `apercu-index.html` et `apercu-mentions-legales.html`, qui embarquent styles, script, polices et logo.

## Plan 2D du magasin
`python3 shemtov-interne/plan/generer_plan.py` régénère `plan-2d-v1.svg` après avoir vérifié les consignes (ordre des meubles, pas de chevauchement, entrée dégagée). La 3D ne démarre qu'après validation du plan.

## Mise en ligne
- **Netlify** : nouveau site relié à ce dépôt, *Base directory* = `shemtov`.
- **Vercel** : nouveau projet relié à ce dépôt, *Root Directory* = `shemtov`.

Le `netlify.toml` et le `vercel.json` à la racine du dépôt servent à un autre projet (`todo/`) : ne pas les modifier.
