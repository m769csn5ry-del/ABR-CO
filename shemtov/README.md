# Shemtov · site de l'épicerie

Site statique (un seul `index.html`, aucun build) pour l'épicerie casher Shemtov,
6 rue du Maréchal-Foch, 67000 Strasbourg. Ouvrir `index.html` dans un navigateur suffit.

## Contenu
- `index.html` : toute la page (styles et script inclus)
- `assets/logo.png` : logo fourni par le commerçant (217 × 233 px, à remplacer par une version HD ou vectorielle)

## Ce qui est automatique
- **Ouvert / fermé** dans le bandeau du haut, calculé à l'heure de Paris à partir du tableau `HORAIRES` (script en bas de page).
- **Jour en cours** surligné dans le tableau des horaires.
- **Prochaines fêtes** : les fêtes passées disparaissent, la suivante est mise en avant avec le nombre de jours restants.
  Les dates sont dans les attributs `data-start` / `data-end` de chaque `<li class="fete">` (source : calendrier Hebcal, diaspora).
  Liste valable jusqu'à Roch Hachana 5788 (octobre 2027), à renouveler ensuite.

## À modifier quand les horaires changent
Trois endroits : le tableau `#hours`, le tableau `HORAIRES` dans le script, et le bloc JSON-LD dans le `<head>`.

## À remplacer avant la mise en ligne
- Photos : une par rayon (`.tile`) et une par actualité (`.photo`). Les trois actualités sont des exemples marqués « Exemple ».
- Mentions légales (raison sociale, SIRET, responsable de publication) dans le pied de page.
- Lien Facebook : l'URL actuelle est celle du groupe « SHEMTOV STRASBOURG », à confirmer.
- Lien Instagram à ajouter dans « Infos pratiques » une fois le compte créé.
- Nom de domaine, balises Open Graph (image de partage) et bandeau « Démo » à retirer.

## Mise en ligne
- **Netlify** : nouveau site relié à ce dépôt, *Base directory* = `shemtov`.
- **Vercel** : nouveau projet relié à ce dépôt, *Root Directory* = `shemtov`.

Le `netlify.toml` et le `vercel.json` à la racine du dépôt servent à un autre projet (`todo/`) : ne pas les modifier.
