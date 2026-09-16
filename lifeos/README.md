# LifeOS

Logiciel personnel d'organisation : le temps, les tâches, les objectifs, les
finances, les habitudes, les projets, les notes et un assistant — reliés par
un même moteur, dans une seule application.

Ce n'est pas une liste de tâches. Le cœur du logiciel est un moteur qui croise
tes créneaux libres, tes échéances, tes priorités, ton niveau d'énergie, tes
habitudes et tes objectifs pour répondre à la seule question qui compte :
**qu'est-ce que je fais maintenant ?**

---

## Démarrer

L'application est un site statique : aucune installation, aucune compilation,
aucun serveur applicatif.

```bash
# depuis la racine du dépôt
npx http-server lifeos -p 8099 -c-1
# puis ouvrir http://127.0.0.1:8099/
```

Un simple `file://` ne suffit pas : le service worker et le stockage local
exigent `http://` ou `https://`.

### Sur iPhone et sur Mac

Ouvre l'adresse dans Safari, puis **Partager → Sur l'écran d'accueil**.
L'application s'installe comme une app native : plein écran, icône, démarrage
hors ligne, notifications locales.

---

## Ce qui est relié à quoi

C'est le point important : rien n'est une page isolée.

| Quand tu fais ça | Voilà ce qui bouge ailleurs |
|---|---|
| Tu termines une tâche liée à un projet | L'avancement du projet monte (pondéré par les durées estimées) |
| Ce projet sert un objectif | L'objectif avance, son rythme nécessaire est recalculé |
| Tu enregistres une épargne liée à un objectif | La valeur de l'objectif monte, la date d'atteinte est reprojetée |
| Tu poses une tâche à une heure | Elle occupe le calendrier, disparaît des créneaux libres, entre dans les notifications |
| Tu ajoutes un rendez-vous | Le planning du jour le contourne, la capacité de la semaine baisse |
| Tu coches une habitude | La série, le taux de régularité, les statistiques et les objectifs qu'elle alimente suivent |
| Tu dépasses un budget | L'accueil, les finances et la confirmation d'ajout le signalent |
| Un objectif décroche | Ses tâches remontent dans les priorités, le planning et « Je suis perdu » |
| Tu acceptes un planning | Les tâches reçoivent leur date et leur heure — le calendrier et les rappels suivent |

Aucun chiffre affiché n'est stocké : tout est recalculé depuis les données
brutes (tâches, transactions, relevés d'habitudes). Un nombre affiché est
donc toujours vérifiable en ouvrant l'écran correspondant.

---

## Le moteur d'organisation

### La journée (`src/domain/planner.js`)

1. **Créneaux libres** — la plage de la journée moins les rendez-vous et les
   tâches déjà posées à une heure.
2. **Candidats** — tâches du jour, retards, échéances à trois jours,
   habitudes non tenues, puis le meilleur du reste s'il reste de la place.
3. **Score** — une seule formule pour toute l'application
   (`L.tasks.score`) : priorité, proximité de l'échéance, retard, tâche déjà
   commencée, objectif en retard servi, ancienneté.
4. **Placement** — remplissage créneau par créneau, en préférant :
   - l'accord entre l'exigence de la tâche et ton énergie à ce moment,
   - terminer une tâche plutôt que l'entamer,
   - le moment demandé par une habitude (matin, soir…).
   Une tâche plus longue que ton bloc de concentration est découpée, et une
   pause est glissée après les blocs longs.
5. **Restitution** — un déroulé horaire justifié (chaque bloc dit *pourquoi*
   il est là), plus ce qui ne rentre pas et les avertissements de surcharge.

Rien n'est écrit dans tes données tant que tu n'as pas accepté. Accepter
inscrit la date et l'heure sur les tâches ; « garder et retoucher » laisse un
brouillon modifiable bloc par bloc ; refuser ne laisse aucune trace.

### La semaine (`src/domain/weekly.js`)

Même principe à sept jours : capacité réelle de chaque jour, échéances placées
avant leur date, répartition vers les jours les plus creux, priorités de la
semaine, objectifs qui décrochent, projets à risque, journées qui vont
déborder, tâches à reporter. Validée, elle donne son jour à chaque tâche.

Déclenchée à la main, ou annoncée chaque dimanche à 10 h (réglable).

### « Je suis perdu » (`src/domain/focus.js`)

Une à trois actions, pas une liste. Chacune est concrète, tient dans le temps
réellement disponible, indique son horaire et la raison pour laquelle elle
passe devant. Un rendez-vous imminent prend toujours le dessus.

---

## L'assistant

Deux modes, le premier suffit à tout ce qui est courant.

**Local (par défaut)** — hors ligne, sans clé, sans compte. Il reconnaît les
demandes en français et répond avec tes vrais chiffres :

- « Organise ma soirée », « j'ai 2 heures libres, que faire ? »
- « Quelles sont mes priorités ? », « qu'est-ce qui est en retard ? »
- « Combien ai-je dépensé ce mois-ci ? », « combien dois-je économiser par mois ? »
- « Ajoute réviser les stats demain 14h 1h30 » (date, heure, durée, priorité,
  projet et récurrence sont lus dans la phrase)
- « Reporte les courses à samedi », « ajoute une dépense de 24,50 € en courses »

**Étendu (facultatif)** — une clé d'API Claude saisie dans
*Paramètres → Assistant* débloque les questions libres. Le contexte envoyé est
réduit au nécessaire, les finances peuvent en être exclues, et l'assistant ne
modifie rien si tu lui retires l'autorisation d'agir. La clé reste sur
l'appareil, dans ton profil.

---

## Données, comptes et sécurité

- **Tout reste sur l'appareil** : IndexedDB (repli sur `localStorage`), une
  base par profil. Rien n'est envoyé nulle part, sauf si tu actives le mode
  étendu de l'assistant.
- **Profils isolés** : l'espace de stockage est nommé à partir de l'identité
  du compte. Deux profils sur le même navigateur ne se voient pas.
- **Chiffrement facultatif** : une phrase secrète chiffre tout le profil en
  AES-GCM (clé dérivée PBKDF2, 180 000 tours). Sans la phrase, le contenu du
  disque est illisible — y compris pour l'application.
- **Sauvegarde** : export JSON complet, réimportable ; export `.ics` du
  calendrier.

### Connexion Google et Apple

Les boutons sont en place. Ces deux services fournissent une identité vérifiée
depuis le navigateur ; il faut y déclarer ton application une fois :

- **Google** — Console Google Cloud → *Identifiants* → ID client OAuth
  (application Web). Colle l'identifiant dans *Paramètres → Compte*.
- **Apple** — compte développeur → *Identifiers* → **Services ID**, avec l'URL
  de retour exacte de ton installation.

Sans ces identifiants, les profils locaux prennent le relais : l'application
est pleinement utilisable, chaque profil gardant ses données séparées.

Ces connexions servent l'**identité**, pas la synchronisation : partager les
mêmes données entre deux appareils demande un serveur. La couche de stockage
est écrite pour ça — `src/core/storage.js` expose `load/save/clear`, et un
adaptateur distant se substitue au local sans toucher au reste.

---

## Calendrier

- Vues mois, semaine et jour. Les tâches datées, les échéances et les
  habitudes importantes y figurent au même titre que les rendez-vous.
- **Import / export `.ics`** : fichier ou adresse d'abonnement (Google Agenda :
  « adresse secrète au format iCal » ; Apple : calendrier public). L'import par
  adresse dépend de l'autorisation d'accès inter-domaine du fournisseur —
  l'import de fichier fonctionne toujours.
- Une synchronisation bidirectionnelle automatique demande un serveur et un
  compte OAuth : hors du périmètre d'une application sans serveur.

## Notifications

Rappels de tâches, d'échéances, de rendez-vous, d'habitudes et d'objectifs,
planning du matin, préparation de la semaine — tous construits à partir des
vraies données et reconstruits à chaque modification.

Limite assumée : sans serveur de push, les rappels partent quand l'application
est ouverte (ou installée sur l'écran d'accueil et réveillée). Les rendez-vous
manqués du matin et du dimanche sont rattrapés au lancement suivant.

---

## Raccourcis clavier

| Touche | Action |
|---|---|
| `⌘ K` | Barre de commandes (chercher, naviguer, agir) |
| `/` | Rechercher |
| `T` `N` `E` `P` `O` `H` | Nouvelle tâche · note · dépense · projet · objectif · habitude |
| `L` | Je suis perdu |
| `G` puis `A J C T P O F H S N` | Aller à un écran |
| `⌘ Z` / `⌘ ⇧ Z` | Annuler / rétablir |
| `?` | Aide |

---

## Architecture

Quatre couches, une dépendance à sens unique : l'interface connaît le métier,
le métier ne connaît pas l'interface.

```
lifeos/
  index.html            coquille : métadonnées, styles, ordre de chargement
  manifest.webmanifest  installation sur l'écran d'accueil
  sw.js                 service worker (démarrage hors ligne)
  styles/
    tokens.css          couleurs, typographie, rythme, thèmes clair/sombre
    base.css            remise à zéro, utilitaires
    shell.css           barre latérale, barre haute, barre d'onglets
    components.css      boutons, champs, cartes, fenêtres, menus…
    views.css           styles propres à chaque écran
  src/
    core/               socle sans métier
      util date format schema seed storage store
    domain/             règles métier — aucune ne touche au DOM
      domains tasks projects goals finance habits calendar
      notes stats search planner weekly focus
    services/           ponts vers le monde extérieur
      notifications ics auth nlp assistant
    ui/                 briques d'affichage réutilisables
      dom icons overlay charts forms palette shortcuts router
    views/              un fichier par écran
      common home today planning calendar tasks projects goals
      finance habits stats notes assistant settings
    app.js              assemblage : stockage → état → écrans → navigation
```

**État** — un seul objet, décrit par `core/schema.js`, modifié uniquement par
`store.update()`. Chaque modification nommée entre dans l'historique
d'annulation, déclenche une écriture différée et un redessin.

**Écrans** — des fonctions pures qui renvoient un nœud DOM. Ils lisent l'état,
n'écrivent jamais dedans directement : ils appellent le métier.

### Ajouter une section

1. Une entrée dans `SECTIONS` (`core/schema.js`) — c'est elle qui crée
   l'élément de navigation, la possibilité de le masquer et de le réordonner.
2. Un fichier `src/views/ma-section.js` qui pose `L.views.maSection = …`.
3. La balise `<script>` dans `index.html` et l'entrée dans `SHELL` de `sw.js`.

Rien d'autre à toucher : navigation, recherche, barre de commandes et
raccourcis suivent.

---

## Vérifications

```bash
npx http-server lifeos -p 8099 -c-1 &

# parcours complet des écrans, captures et erreurs de console
NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-check.js ./captures

# 55 contrôles : calculs, liens entre modules, isolation des profils,
# chiffrement, sauvegardes, hors ligne
NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-test.js
```

Les icônes d'écran d'accueil se régénèrent avec
`node scripts/lifeos-icons.js`.

---

## Mise en ligne

Site statique, donc n'importe quel hébergeur :

- **Netlify** — dossier à publier : `lifeos`, aucune commande de build.
- **Vercel** — `outputDirectory: "lifeos"`.
- **GitHub Pages** — copier le contenu de `lifeos/` à la racine de la branche
  publiée (le service worker et le manifeste veulent vivre à la racine du
  domaine ou d'un sous-dossier servi comme tel).

Servir `sw.js` et `manifest.webmanifest` sans cache long, pour que les mises à
jour arrivent tout de suite.
