---
colors:
  paper: "#F2F1EE"
  paperRaised: "#FBFAF8"
  paperSunk: "#E7E5E1"
  ink: "#0E0F11"
  inkSoft: "#2A2C2F"
  mineral: "#5F6367"
  mineralLine: "#D5D3CE"
  mineralFaint: "#E2E0DB"
  verdigris: "#1C5750"
  verdigrisDeep: "#123B36"
  verdigrisWash: "#E2EBE8"
  sketch: "#B4B0A9"
  oxide: "#8C3A2B"
  oxideWash: "#F3E6E3"
typography:
  scale:
    tag: "0.6875rem"
    label: "0.75rem"
    small: "0.875rem"
    body: "1.0625rem"
    lead: "1.3125rem"
    h4Min: "1.25rem"
    h4: "1.6875rem"
    h3Min: "1.5rem"
    h3: "2.25rem"
    h2Min: "1.75rem"
    h2: "3rem"
    h1Min: "2rem"
    h1: "4rem"
    displayMin: "2.25rem"
    display: "5.5rem"
  display:
    fontFamily: "Instrument Sans Variable"
    fontSize: "clamp(2.25rem, 1.35rem + 4.5vw, 5.5rem)"
  h1:
    fontFamily: "Instrument Sans Variable"
    fontSize: "clamp(2rem, 1.4rem + 3vw, 4rem)"
  h2:
    fontFamily: "Instrument Sans Variable"
    fontSize: "clamp(1.75rem, 1.3rem + 2.2vw, 3rem)"
  h3:
    fontFamily: "Instrument Sans Variable"
    fontSize: "clamp(1.5rem, 1.25rem + 1.2vw, 2.25rem)"
  h4:
    fontFamily: "Instrument Sans Variable"
    fontSize: "clamp(1.25rem, 1.15rem + 0.65vw, 1.6875rem)"
  body:
    fontFamily: "Instrument Sans Variable"
    fontSize: "1.0625rem"
  editorial:
    fontFamily: "Instrument Serif"
    fontSize: "1.6875rem"
  tag:
    fontFamily: "Instrument Sans Variable"
    fontSize: "0.6875rem"
rounded:
  none: "0px"
  xs: "2px"
  sm: "3px"
  pill: "999px"
---

# NEUF — Système de design

Document de référence unique. Le détecteur Impeccable lit le frontmatter ci-dessus
et signale toute couleur, police, taille ou rayon employé dans le code qui n'y figure pas.
Modifier un token ici, puis dans `app/globals.css`.

## 1. La marque

**NEUF.** « État neuf » est le terme exact qui relie les deux activités : la boutique
vend des paires **neuves**, l'atelier remet les tiennes **à neuf**. Le nom porte donc
le positionnement complet — il n'a pas besoin d'être expliqué.

- **Wordmark** : `NEUF` en Instrument Sans 600, capitales, interlettrage `0.08em`.
  Pas de logo dessiné : le mot fait le travail.
- **Signature** : `Sneakers neuves. Paires remises à neuf.` Une ligne, les deux métiers.
- **Favicon** : carré encre, `N` papier, filet verdigris. Voir `app/icon.svg`.

À vérifier avant exploitation commerciale : disponibilité du nom (INPI), du domaine
et des comptes sociaux. « Neuf » est un mot courant — c'est une force mnémotechnique
et une faiblesse en recherche. Cette vérification n'a pas été faite ici.

## 2. Le système graphique : la coupe

Un seul motif, décliné partout, toujours fonctionnel — jamais décoratif :

| Emplacement | Rôle |
| --- | --- |
| Séparateur de section | Découpe la page sans caisson ni carte |
| Soulignement de navigation | Grandit depuis la gauche au survol / focus |
| Barre de progression du parcours entretien | Avancement réel |
| Séparation avant / après | Poignée déplacée par l'utilisateur |
| Graduations de la frise processus | Repères d'étape |

La coupe est un filet de 1px en `mineralLine`, ou 2px en `ink` quand elle est active.
Elle remplace les cartes : **le site sépare par le vide et le filet, pas par des boîtes.**

## 3. Couleur

Fond `paper` `#F2F1EE` — un blanc cassé **froid**, légèrement minéral. Choix délibéré
contre le crème chaud (`#FDFBF7` et voisins) devenu le réflexe « tasteful » par défaut.

La couleur signature **verdigris** `#1C5750` n'est pas décorative : elle **désigne la
branche CARE**. Boutique = encre et papier. Atelier = verdigris. Le visiteur apprend
le code en une section et le retrouve partout (CTA, statuts, filtres, frise de suivi).

`sketch` `#B4B0A9` est le trait des schémas techniques (visuels de substitution) :
il appartient au système graphique, pas au décor.

`oxide` `#8C3A2B` sert exclusivement aux ruptures de stock et aux erreurs de formulaire.

Contrastes vérifiés : `ink`/`paper` 17.2:1 · `mineral`/`paper` 5.1:1 · `verdigris`/`paper` 7.2:1 ·
`paper`/`ink` 17.2:1 · `oxide`/`paper` 6.4:1. Tous ≥ AA.

## 4. Typographie

Deux familles, une fonderie, pour rester cohérent :

- **Instrument Sans Variable** — titres, interface, corps de texte. Grotesque à
  personnalité (le `g`, le `a`, la largeur variable) sans être une des faces
  sur-employées (Inter, Geist, Space Grotesk, Plus Jakarta…).
- **Instrument Serif** — uniquement en romain, pour la voix éditoriale : histoire de
  marque, intertitres de l'atelier, chiffres de l'avant/après. Jamais en italique
  surdimensionné en tête de page.

Règles : hiérarchie par **contraste de taille** (rapport ≥ 1.2 entre deux marches),
corps à `1.0625rem` / interligne `1.6`, mesure limitée à `68ch`, interlettrage large
(`0.08em`) réservé aux capitales courtes. **Aucun sur-titre / eyebrow au-dessus d'un
titre** : le titre porte son propre poids.

## 5. Espace

Rythme, pas uniformité : `4 8 12 16 24 32 48 64 96 128 160`.
Groupements serrés à l'intérieur d'un bloc, respiration franche entre sections
(`96px` mobile → `160px` grand écran). L'espace **au-dessus** d'un titre dépasse
toujours celui qui le sépare de son contenu.

## 6. Formes

Rayons quasi nuls : `0` pour les visuels et les zones de contenu, `2px` pour les
contrôles, pilule réservée aux étiquettes courtes. Angles vifs = registre éditorial,
et évite le `rounded-2xl` généralisé. **Bordure franche OU ombre douce, jamais les deux.**
Pas de carte dans une carte.

## 7. Mouvement

| Courbe | Valeur | Usage |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entrées, apparitions, survols |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Déplacements à l'écran |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Panneaux, tiroirs, menu mobile |

Durées : pression `140ms` · survol `180ms` · menu `240ms` · tiroir `280ms`.
**Plafond de 300ms sur tout ce qui est sur le chemin d'un achat.**

Règles fermes : jamais `transition: all` · jamais `ease-in` · jamais depuis `scale(0)`
· jamais d'animation de `width`/`height`/`margin` · survols derrière
`@media (hover: hover) and (pointer: fine)` · sortie plus rapide que l'entrée ·
échelonnement 40–60ms · contenu **visible par défaut**, l'animation d'entrée est un
enrichissement, jamais une condition d'affichage.

`prefers-reduced-motion` : les déplacements tombent, les fondus et changements de
couleur restent. Rien ne disparaît.

## 8. Images

Style photographique cible : studio, fond minéral continu, lumière latérale douce,
paire cadrée de trois quarts ou de profil strict, ombre portée courte. Pas de mise en
scène lifestyle, pas de rue, pas de modèle.

Aucune photo réelle n'est disponible dans ce dépôt. Chaque emplacement affiche un
visuel de substitution **généré et explicitement marqué** (`components/media/Placeholder.tsx`),
qui compose la fiche à partir de ses propres données. Le remplacement se fait en
renseignant le champ `image` de l'entrée concernée dans `content/` — aucun composant
à modifier.
