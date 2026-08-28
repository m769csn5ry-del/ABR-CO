# Orga — to-do list pour l'écran d'accueil iPhone

Application web autonome (PWA) : **un seul fichier HTML**, aucune dépendance, aucun compte,
aucun serveur. Tout est stocké dans le navigateur de l'iPhone (`localStorage`).

## Mettre l'app sur l'écran d'accueil

1. Ouvrir l'URL de l'app **dans Safari** (Chrome iOS ne sait pas installer de PWA).
2. Bouton **Partager** (le carré avec la flèche vers le haut).
3. **Sur l'écran d'accueil** → **Ajouter**.

L'icône apparaît alors comme une vraie app : ouverture en plein écran, sans barre d'adresse,
et fonctionnement **hors connexion** (service worker).

## Activer l'hébergement (GitHub Pages)

Dans ce dépôt : **Settings → Pages → Build and deployment**

- **Source** : `Deploy from a branch`
- **Branch** : `claude/iphone-todo-app-ezlckp` (ou `main` après fusion), dossier `/ (root)`
- **Save**

L'app est ensuite disponible à l'adresse :

```
https://<utilisateur>.github.io/ABR-CO/todo/
```

Le dépôt doit être public, ou le compte doit disposer de GitHub Pages sur dépôt privé.

## Ce que fait l'app

| Écran | Contenu |
|---|---|
| **Aujourd'hui** | Anneau de progression, tâches en retard, tâches du jour, habitudes du jour, tâches terminées |
| **À venir** | 14 prochains jours groupés par date, puis « Plus tard » et « Sans date » |
| **Projets** | Une carte par projet (couleur, icône, avancement), détail par projet, tâches sans projet |
| **Habitudes** | Bande des 7 derniers jours cliquable, série en cours 🔥, record, total |

- **Échéances** : date + heure, badges « Aujourd'hui / Demain / N j de retard ».
- **Priorités** : basse / moyenne / haute, tri automatique.
- **Sous-tâches** : cases à cocher + barre d'avancement sur la ligne de tâche.
- **Récurrences** : quotidienne, du lundi au vendredi, hebdomadaire, bimensuelle, mensuelle, annuelle.
  Cocher une tâche récurrente la reprogramme automatiquement au lieu de l'archiver.
- **Habitudes** : n'importe quelle tâche récurrente peut être suivie avec une série.
- **Recherche** dans les titres, notes, projets et sous-tâches.
- **Thème** clair / sombre / automatique.
- **Export / import** JSON pour sauvegarder ou changer d'appareil.

## Saisie rapide

Le champ « Tâche » comprend le français courant. En tapant :

```
Relancer le fournisseur demain 14h30 #ABR !!!
```

l'app crée « Relancer le fournisseur », échéance demain, 14:30, projet ABR&CO, priorité haute.

| Écriture | Effet |
|---|---|
| `aujourd'hui`, `demain`, `après-demain` | échéance relative |
| `lundi` … `dimanche` | prochaine occurrence de ce jour |
| `dans 3 jours`, `dans 2 semaines`, `dans 1 mois` | échéance relative |
| `25/12`, `25/12/2027` | date précise (l'année suivante si la date est passée) |
| `14h`, `14h30`, `14:30` | heure |
| `#projet` | affecte au projet dont le nom commence ainsi (accents ignorés) |
| `!` `!!` `!!!` | priorité basse / moyenne / haute |

Ce qui est reconnu est retiré du titre et reporté dans les champs du formulaire, visible
avant validation. Un `#tag` qui ne correspond à aucun projet est laissé tel quel dans le titre.

## Export dans les deux hébergements

Le lecteur d'Artifact de claude.ai bloque les liens de téléchargement. L'export détecte
l'hôte : il passe par `claude.use('downloads')` quand cette API existe, et retombe sur un
lien `blob:` classique partout ailleurs (GitHub Pages, Safari, navigateur de bureau).
Le même fichier source fonctionne donc dans les deux versions.

## Données

Stockage local à l'appareil, sous la clé `orga.v1`. Rien ne transite par le réseau.
Conséquence : les données ne se synchronisent pas entre appareils, et **désinstaller
l'app ou effacer les données de Safari les supprime**. D'où l'export JSON dans les Réglages.

## Développement

La source unique est `src/app.html` (styles + markup + script). Le script de build produit
les deux sorties :

```bash
node build.js
# → todo/index.html      version PWA (avec manifeste, icônes, service worker)
# → dist/artifact.html   version pour un Artifact claude.ai (sans html/head/body)
```

Ne pas éditer `todo/index.html` directement : il est régénéré.

Après une modification, incrémenter `VERSION` dans `todo/sw.js` pour que les iPhones déjà
installés récupèrent la nouvelle version au lieu de servir le cache.

Les icônes sont générées par `scripts/icons.js` (rendu Chromium via Playwright) :

```bash
node scripts/icons.js
```
