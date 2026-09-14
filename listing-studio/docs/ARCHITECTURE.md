# Architecture

Ce document décrit ce qui existe réellement dans le dépôt : les modules, ce
qu'ils garantissent, et — explicitement — ce qui n'est pas connecté.

## Vue d'ensemble

Deux applications partagent le même socle :

| Application | Fichier d'entrée | À qui elle s'adresse |
|---|---|---|
| Listing Studio | `index.html` → `src/main.js` | production d'annonces de location courte durée, assistant de rédaction, exports par plateforme |
| Console d'exploitation | `console.html` → `src/console/main.js` | pilotage de l'activité : dossiers, analyse, optimisation, performances, commissions |

Aucune étape de construction. Modules ES natifs, chemins relatifs, routage par
fragment d'URL : le dossier se sert tel quel depuis n'importe quel hébergement
statique.

## Couches

```
console.html / index.html
        │
        ├── src/console/…        écrans d'exploitation (aucun accès direct à la base)
        ├── src/views/…          écrans de production d'annonces
        │
        ├── src/domain/…         règles métier : argent, permissions, commissions,
        │                        dossiers, CRM, performances, audit, indicateurs
        ├── src/analysis/…       moteur d'analyse déterministe (mesure, règles, score)
        ├── src/workflow/…       machine à états des dossiers
        ├── src/ai/…             registre d'instructions, validation, journal des appels
        │
        └── src/core/db.js       dépôt de données cloisonné par organisation
```

Une vue n'écrit jamais dans la base. Elle appelle un service de `src/domain/`,
qui vérifie la permission, agit, journalise et fait avancer le workflow.

## Cloisonnement multi-organisation

`src/core/db.js` expose un dépôt par table. Toute lecture filtre sur
l'organisation en session ; toute écriture y rattache la ligne. Une lecture par
identifiant d'un enregistrement appartenant à une autre organisation renvoie
`null`, une mise à jour `null`, une suppression `false` : l'isolation ne repose
pas sur l'écran qui ne montre pas la ligne.

Cinq tables sont globales par nature (`users`, `organizations`, `memberships`,
`platforms`, `meta`). `memberships` conserve son `orgId` comme donnée de liaison :
c'est elle qui rattache un utilisateur à une organisation.

`server/schema.sql` contient le schéma PostgreSQL équivalent, avec le même
cloisonnement appliqué au niveau des lignes (RLS), pour une bascule vers une
base partagée.

## Argent

`src/domain/money.js` — tous les montants sont des entiers en unités mineures
(centimes). Aucun flottant n'entre dans un calcul financier. L'arrondi est
bancaire (`roundHalfEven`) ; la répartition d'un montant (`allocate`) est sans
perte : la somme des parts égale toujours le total.

Six devises sont décrites, avec leur nombre de décimales. Deux montants de
devises différentes ne s'additionnent jamais — l'agrégation les ignore plutôt
que de convertir à un taux inventé.

## Commissions

`src/domain/commission.js` — six modèles : pourcentage du prix, pourcentage de
la commission d'agence, forfait, taux variable par seuil, paliers marginaux,
composition de règles. Plancher, plafond et TVA contractuels sont appliqués
après le modèle.

Chaque calcul renvoie une **trace** : la base retenue, chaque étape, chaque
montant intermédiaire. Le montant affiché à l'écran est reconstituable ligne à
ligne. L'IA ne participe à aucune étape.

La configuration d'un contrat est validée à l'enregistrement
(`validateConfig`), pas au moment du calcul. Sans contrat actif pour le client,
aucun montant n'est estimé.

Cycle de vie : `pending → estimated → due → paid`, avec `overdue` dérivé de
l'échéance et `cancelled` possible depuis les états non réglés. Les transitions
interdites sont refusées, pas masquées.

## Analyse d'annonce

Chaîne déterministe en trois temps, dans `src/analysis/` :

1. **Mesure** (`text.js`) — longueurs, lisibilité, répétitions, adjectifs
   invérifiables, structure, faits détectés, mots-clés. Les limites de mots sont
   construites sur les lettres Unicode : `\b` de JavaScript ne reconnaît pas
   « étage » ni « copropriété ».
2. **Règles** (`rules.js`) — vingt-cinq règles typées, chacune avec sa gravité,
   son impact en points, son explication et l'action attendue. Les règles
   portant sur les mentions légales françaises sont marquées `verify` : elles
   signalent une absence, elles n'affirment pas une obligation.
3. **Score** (`score.js`) — dix axes, cent points. Le **potentiel** est plafonné
   axe par axe : corriger un titre ne peut pas rapporter plus que les points
   perdus sur le titre. Sans ce plafond, toute annonce afficherait un potentiel
   de 100.

Deux exécutions sur le même texte donnent le même score. Aucun modèle génératif
n'intervient.

## Réécriture

`src/analysis/rewrite.js` construit la version optimisée à partir de la **fiche
du bien**, jamais du texte d'origine. Une information absente de la fiche
n'apparaît pas dans le texte : elle est retournée dans `missing` et affichée à
l'opérateur comme information à obtenir du client.

C'est la garantie centrale du produit : le système ne peut pas inventer une
surface, un étage ou un prix, parce qu'il ne les tire d'aucune source
probabiliste.

## Workflow

`src/workflow/engine.js` définit des machines à états à transitions gardées.
`src/workflow/dossier.js` décrit les huit étapes du dossier :

```
intake → imported → analyzed → optimized → validated → published → tracking → closed
```

Chaque garde renvoie la liste des raisons qui bloquent. Quand le passage échoue,
la raison est enregistrée sur le dossier (`stageBlockers`) et affichée : un
dossier qui n'avance pas dit pourquoi.

La publication exige une version **validée par un humain**. Il n'existe aucun
chemin qui publie sans cette validation.

## Permissions

`src/domain/permissions.js` — cinq rôles (`owner`, `admin`, `manager`,
`operator`, `client`), une trentaine d'autorisations, une matrice par défaut et
des ajustements par appartenance. Chaque service appelle `require_()` avant
d'agir. L'interface masque ce qui est interdit plutôt que de le désactiver, mais
c'est le service qui refuse.

## Performances

`src/domain/performance.js` — les relevés sont saisis, jamais estimés. La
comparaison avant/après normalise par jour de diffusion, puis qualifie sa propre
fiabilité (suffisante, indicative, insuffisante) selon la durée d'observation et
le volume. Une réserve de causalité accompagne systématiquement l'écart :
saisonnalité, prix et concurrence évoluent en parallèle.

## Automatisations

`src/domain/automations.js` — six règles qui agissent sur l'état réel :
analyser une annonce importée, préparer le brouillon d'optimisation, calculer
la commission d'une transaction saisie, signaler une commission échue, clôturer
un dossier réglé, rédiger les relances des prospects sans nouvelle.

Chaque règle ne s'exécute que si son état de départ est vrai : elle est donc
rejouable sans effet de bord. Les exécutions sont sérialisées — deux passages
simultanés liraient les mêmes cibles avant que l'un n'écrive. Chaque passage
laisse une trace datée avec ce qu'il a fait et sur quoi.

Quatre décisions restent humaines par construction, quelle que soit la
configuration : valider une version optimisée, déclarer une annonce publiée,
rendre une commission exigible, la marquer encaissée. La liste est affichée
telle quelle dans le centre d'automatisation.

Déclenchement : un changement de dossier, de transaction, de commission, de
prospect ou de contrat programme un passage groupé (400 ms de regroupement),
plus un passage à l'ouverture de la console.

## Messages

`src/domain/outreach.js` rédige les relances de prospects, l'envoi d'audit, la
remise d'une version optimisée et la relance de règlement. Chaque texte est
construit sur des données réelles : quand une donnée manque, la phrase qui s'y
rapporte disparaît au lieu d'être comblée. Le nom d'usage n'est extrait que
s'il ressemble à celui d'une personne — « Bonjour Agence » serait pire qu'un
« Bonjour » nu. Aucun participe accordé n'est employé : le genre de
l'expéditeur ne se devine pas.

**Rien n'est envoyé** : aucun service de messagerie n'est connecté. Les textes
sont des brouillons à relire, copier et envoyer depuis sa propre messagerie.

## Rapport client

`src/report/audit.js` produit le livrable remis au client : score, potentiel,
répartition par critère, problèmes classés, version proposée, performances
observées. Il s'imprime en PDF par la fonction d'impression du navigateur —
pas de bibliothèque tierce, le même document à l'écran et sur le papier. Il
porte ses propres réserves : grille interne, aucune donnée de marché, aucun
résultat garanti.

## Journaux

- `src/domain/audit.js` — validations, publications, calculs de commission,
  changements de statut financier, modifications de rôle.
- `src/ai/ledger.js` — chaque exécution du moteur (local ou distant) : tâche,
  instruction et version, durée, état, estimation de coût. Le contenu des
  requêtes n'est pas conservé par défaut.

## IA

`src/ai/prompts.js` est un registre versionné d'instructions, chacune avec le
schéma de sortie attendu. `src/ai/validate.js` valide toute réponse contre ce
schéma avant enregistrement ; une réponse non conforme est rejetée.

**État réel** : l'analyse et la réécriture actuelles s'exécutent entièrement en
local, par règles. Aucune donnée ne quitte le navigateur. Le fournisseur
distant (`server/ai-provider.js`) n'est appelé que si une clé est configurée
côté serveur ; l'indicateur `ai_server` reste désactivé par défaut.

## Ce qui n'est pas connecté

Annoncé comme tel dans l'interface, jamais présenté comme fonctionnel :

| Sujet | État |
|---|---|
| Publication vers un portail | aucune intégration ; l'opérateur déclare une publication faite ailleurs |
| Récupération d'annonce par URL | aucune aspiration : le lien est une référence, le texte est collé |
| Signature électronique | aucune ; un contrat est une configuration de calcul, pas un document signé |
| Envoi de courriels | aucun ; ajouter un membre crée un compte local |
| Facturation SaaS (Stripe) | indicateur `billing` présent, désactivé, aucun paiement traité |
| Données de marché externes | aucune ; les estimations de prix sont internes et annoncées comme telles |

## Persistance

Cette version conserve les données dans le navigateur : `localStorage` pour les
enregistrements, IndexedDB pour les images. Rien n'est transmis à un serveur.
L'export JSON est limité à l'organisation courante.

## Variables d'environnement

Côté serveur uniquement (`server/.env.example`). Aucune clé n'est lue par le
frontend.

| Variable | Rôle | Sans elle |
|---|---|---|
| `ANTHROPIC_API_KEY` | fournisseur IA distant | le moteur local prend le relais |
| `AI_MODEL` | modèle utilisé | valeur par défaut du fournisseur |
| `PORT` | port du serveur de développement | 4173 |

## Commandes

```
npm start                  serveur local
npm test                   tests unitaires + parcours critique
npm run test:unit          42 tests unitaires du moteur
npm run test:integration   24 étapes du parcours critique
npm run test:e2e           parcours navigateur de Listing Studio
npm run test:console       parcours navigateur de la console
```

Les tests navigateur demandent `playwright-core` et un Chromium :
`PLAYWRIGHT_MODULES=/chemin/vers/node_modules CHROMIUM=/chemin/vers/chrome`.
