# Orga — DBR Studio

To-do list installable sur l'écran d'accueil d'un iPhone. Application web autonome
(PWA) : **un seul fichier HTML**, aucune dépendance, aucun compte, aucun serveur,
aucune requête réseau. Tout est stocké dans le navigateur de l'appareil (`localStorage`).

## Mettre l'app sur l'écran d'accueil

1. Ouvrir l'URL **dans Safari** (Chrome iOS ne sait pas installer de PWA).
2. Bouton **Partager** (le carré avec la flèche vers le haut).
3. **Sur l'écran d'accueil** → **Ajouter**.

L'icône est un monogramme didone champagne sur encre. L'app s'ouvre en plein écran,
sans barre d'adresse, et fonctionne **hors connexion** (service worker).

## Mettre en ligne

L'app est un site statique sans build. `node build.js` produit
`dist/orga-dbr-studio.zip`, dont le **contenu de `todo/` est à la racine de
l'archive** : une fois déployé, l'app vit sur `https://domaine/` et non sur
`https://domaine/todo/`. C'est ce qui garde la portée du service worker (`/`) et
les chemins du manifeste corrects.

**Dépôt direct (le plus simple).** Déposer `dist/orga-dbr-studio.zip` sur un
hébergeur statique acceptant l'envoi de fichiers (Netlify Drop, Cloudflare Pages
en envoi direct…). URL immédiate, aucun build, aucun compte GitHub.

**Vercel en ligne de commande**, depuis l'archive décompressée :

```bash
unzip dist/orga-dbr-studio.zip -d orga && cd orga
npx vercel deploy --prod
```

**Depuis le dépôt Git.** `vercel.json` et `netlify.toml` déclarent déjà `todo`
comme dossier publié, et interdisent la mise en cache de `sw.js` — sans quoi une
mise à jour peut mettre des jours à atteindre les iPhones déjà installés. Attention :
ces hébergeurs déploient la branche de production (`main` par défaut), qui doit
donc porter le dossier `todo/`.

**GitHub Pages.** *Settings → Pages* · Source `Deploy from a branch` · Branch
`claude/iphone-todo-app-ezlckp` (ou `main` après fusion), dossier `/ (root)`.
L'app est alors servie à `https://<utilisateur>.github.io/ABR-CO/todo/` — noter le
suffixe `/todo/` : choisir `main` alors que le dossier n'est que sur la branche de
travail renvoie une 404.

## Parti pris visuel

| | |
|---|---|
| **Fonds** | Galerie `#E8EAEC` (pierre froide) · Chambre noire `#0C0D10` |
| **Texte** | Graphite `#14161A` · Os `#EDECE8` |
| **Accent unique** | Bronze `#8A6A2F` en clair, champagne `#CBA968` en sombre |
| **Alarme** | Rouille `#A6452F`, réservée au retard |
| **Projets** | 8 teintes sourdes : prusse, bronze, oxblood, sauge, ardoise, prune, tabac, céladon |

**Typographie.** Bodoni Moda variable pour la couche display — titres de vue, chiffres du
cadran, monogrammes, compteurs de série. Police système (SF Pro sur iOS) pour tout le
fonctionnel, en chiffres tabulaires, avec des micro-capitales espacées pour les libellés.

**Règle structurante.** La couleur appartient aux projets. La **priorité** est une réglure
d'encre à gauche de la ligne — 1, 2 ou 3 px — jamais une teinte : trois niveaux se lisent
d'un coup d'œil sans introduire trois couleurs de plus. Les cartes flottantes ont laissé
place à des registres à filets, et le seul geste ample est le panneau du jour, en encre
dans les deux thèmes.

## Interactions

| Geste | Effet |
|---|---|
| **Glisser une ligne vers la droite** | Termine la tâche (halo, barré animé) |
| **Glisser vers la gauche** | Supprime — avec 5 s pour annuler depuis l'avis |
| **Toucher une ligne** | Ouvre la fiche complète |
| **Tirer une feuille vers le bas** | La referme |
| **Toucher un jour dans une série** | Coche ou décoche rétroactivement |

L'indicateur d'onglet glisse d'un onglet à l'autre, les listes entrent en cascade
(26 ms de décalage par ligne), l'arc du cadran s'anime depuis sa valeur précédente.
Tout est neutralisé sous `prefers-reduced-motion`.

## Écrans

| Onglet | Contenu |
|---|---|
| **Jour** | Panneau encre (date, salutation, cadran de progression), retards, tâches du jour, séries du jour, terminé |
| **À venir** | 14 prochains jours groupés par date, puis « Plus tard » et « Sans date » |
| **Projets** | Une carte par projet (monogramme, teinte, avancement), détail par projet, tâches sans projet |
| **Séries** | Bande des 7 derniers jours cliquable, série en cours, record, total |

Échéances date + heure, priorités, sous-tâches avec jauge, récurrences (quotidienne à
annuelle) qui **reprogramment** la tâche au lieu de l'archiver, suivi de séries, recherche,
thème clair/sombre/auto, export et import JSON.

## Saisie rapide

Le champ « Intitulé » comprend le français courant :

```
Relancer la fonderie demain 14h30 #DBR !!!
```

→ « Relancer la fonderie », demain, 14:30, projet DBR Studio, priorité haute.

| Écriture | Effet |
|---|---|
| `aujourd'hui`, `demain`, `après-demain` | échéance relative |
| `lundi` … `dimanche` | prochaine occurrence de ce jour |
| `dans 3 jours`, `dans 2 semaines`, `dans 1 mois` | échéance relative |
| `25/12`, `25/12/2027` | date précise (l'année suivante si elle est passée) |
| `14h`, `14h30`, `14:30` | heure |
| `#projet` | projet dont le nom commence ainsi (accents ignorés) |
| `!` `!!` `!!!` | priorité basse / moyenne / haute |

Ce qui est reconnu quitte le titre et remplit les champs du formulaire, visible avant
validation. Un `#tag` sans projet correspondant reste dans le titre.

## Données

Stockage local, clé `orga.v1`. Rien ne transite par le réseau. Les données ne se
synchronisent donc pas entre appareils, et désinstaller l'app ou effacer les données de
Safari les supprime — d'où l'export JSON dans les Réglages.

L'export détecte son hôte : il passe par `claude.use('downloads')` là où cette API existe
(lecteur d'Artifact, qui bloque les liens de téléchargement) et retombe sur un lien `blob:`
partout ailleurs. Un seul fichier source couvre les deux hébergements.

## Développement

La source unique est `src/app.html` (styles + markup + script). Le build produit les deux
sorties :

```bash
node build.js
# → todo/index.html      PWA (manifeste, icônes, service worker)
# → dist/artifact.html   Artifact claude.ai (sans html/head/body)
```

Ne pas éditer `todo/index.html` : il est régénéré.

Après modification, incrémenter `VERSION` dans `todo/sw.js` pour que les iPhones déjà
installés reçoivent la nouvelle version au lieu du cache.

Icônes d'écran d'accueil :

```bash
NODE_PATH=/opt/node22/lib/node_modules node scripts/icons.js
```

### Typographie embarquée

`src/fonts/BodoniModa-latin.woff2` (variable, sous-ensemble latin, 46 Ko) est encastrée en
base64 par `build.js`. C'est délibéré : une police distinctive **et** disponible hors
connexion, sans requête vers un hébergeur de polices. Sous licence SIL OFL 1.1
(`src/fonts/OFL.txt`).
