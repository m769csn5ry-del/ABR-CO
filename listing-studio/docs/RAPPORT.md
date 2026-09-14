# Rapport de construction

État du produit à l'issue de la phase de construction. Ce rapport dit ce qui
fonctionne, ce qui ne fonctionne pas, et ce qu'il faudrait pour que la partie
manquante existe.

## Ce qui a été construit

### Couche métier

Indépendante de toute interface, éprouvée par un test de parcours en 24 étapes.

- **Cloisonnement multi-organisation** appliqué au dépôt de données, pas à
  l'écran. Trente tables ; une lecture par identifiant d'un enregistrement
  d'une autre organisation renvoie `null`. Le schéma PostgreSQL équivalent, avec
  cloisonnement par ligne, est fourni.
- **Argent** en unités mineures entières, arrondi bancaire, répartition sans
  perte, six devises, aucune addition entre devises différentes.
- **Commissions** : six modèles, plancher, plafond, TVA, trace de calcul
  complète, cycle de vie à transitions gardées. L'IA n'intervient dans aucune
  étape du calcul.
- **Workflow** des dossiers : huit étapes, gardes explicites, raisons de blocage
  enregistrées et affichées. La publication exige une validation humaine ; aucun
  chemin ne la contourne.
- **Permissions** : cinq rôles, une trentaine d'autorisations, vérification dans
  le service et non dans la vue.
- **Analyse d'annonce** déterministe : mesure du texte, vingt-cinq règles typées,
  score sur dix axes, potentiel plafonné axe par axe.
- **Réécriture** construite depuis la fiche du bien : ce qui manque est listé
  comme manquant, jamais comblé.
- **Performances** : relevés saisis, comparaison normalisée par jour, fiabilité
  qualifiée, réserve de causalité.
- **Journaux** : audit des actions financières et de validation, registre des
  exécutions du moteur avec estimation de coût.

### Deux couches de données, volontairement séparées

L'atelier d'annonces (`core/dbLegacy.js`, espace `ls.v1.`) et la console
(`core/db.js`, espace `ls.v2.`) décrivent deux modèles différents : un espace
par utilisateur d'un côté, des organisations, contrats et commissions de
l'autre. Ils coexistent dans des espaces de stockage distincts ;
`migrateFromV1()` importe une fois les projets de l'atelier dans le nouveau
modèle à la première ouverture de la console.

### Automatisation

Six règles agissent sur l'état réel sans intervention : analyse à l'import,
brouillon d'optimisation après l'analyse, calcul de commission à la saisie
d'une transaction, signalement des échéances dépassées, clôture des dossiers
réglés, rédaction des relances. Elles sont rejouables sans effet de bord et
sérialisées entre elles.

Quatre décisions restent humaines par construction et aucune configuration ne
permet de les déléguer : valider une version, déclarer une publication, rendre
une commission exigible, la marquer encaissée.

S'y ajoutent l'import en lot (plusieurs annonces collées d'un coup, analysées
et mises en brouillon à la suite), le rapport client imprimable en PDF, et la
rédaction automatique des messages — audit, remise de version, relance de
règlement, relance de prospect — tous construits sur les chiffres réels du
dossier, aucun envoyé.

### Interface

- **Listing Studio** (`index.html`) — atelier de production d'annonces de
  location courte durée, assistant de rédaction, exports par plateforme.
- **Console d'exploitation** (`console.html`) — tableau de bord des tâches
  réelles, dossiers par étape, page d'analyse, optimisation avant/après,
  performances, finances, pipeline commercial, clients et contrats,
  commissions, administration.

## Ce que les tests couvrent

| Suite | Portée | Résultat |
|---|---|---|
| `npm run test:unit` | moteur : génération, grammaire, plateformes, photos, exports, analyse, import, score, contrats entre modules | 45 / 45 |
| `npm run test:integration` | parcours critique complet, isolation, permissions, journalisation | 24 / 24 |
| `npm run test:console` | dix-sept parcours navigateur de la console, sans erreur console | 17 / 17 |
| `npm run test:e2e` | parcours navigateur de Listing Studio | 19 / 19 |

Le test de console ne contrôle pas seulement l'affichage : il vérifie qu'une
annonce faible est notée comme faible, que l'optimisation produit un gain
mesurable, et qu'aucun défaut de langue n'atteint le texte généré.

## Défauts trouvés et corrigés pendant la construction

| Défaut | Conséquence | Correction |
|---|---|---|
| Les limites de mots de JavaScript ignorent les lettres accentuées | aucune annonce mentionnant un « étage » ou une « copropriété » n'était créditée de l'information ; le score sous-évaluait toutes les annonces françaises | limites reconstruites sur les lettres Unicode |
| Un montant de charges retenu comme prix de vente | prix faux affiché comme certain | les montants rattachés aux charges, honoraires, taxe ou dépôt sont écartés ; le prix est signalé manquant |
| Vocabulaire de vente sur un marché locatif | « Prix de 980 € » sur une annonce de location | marché normalisé, loyer et dépôt de garantie distincts |
| `orgId` effacé à l'insertion d'une appartenance | aucune permission ne s'appliquait : toutes les actions étaient refusées | les tables globales qui portent un `orgId` de liaison le conservent |
| Échec de transition silencieux | un dossier restait bloqué sans dire pourquoi | la raison est enregistrée et affichée |
| Potentiel toujours proche de 100 | chiffre flatteur et faux | gain plafonné axe par axe |
| Version optimisée analysée sans son invitation à contacter | l'axe Conversion sous-évaluait la version produite | le texte analysé est celui qui sera publié |
| Élisions et majuscules parasites | « de un balcon », « Chauffage Collectif gaz » | assemblage des phrases corrigé |
| Clés techniques anglaises dans le rapport client | « surface absent. floor absent. transport absent. » sous les yeux du client | motifs rédigés en français |
| Moyennes par jour arrondies à l'entier | « +0 » affiché en face d'un écart de +153 % | une décimale conservée sous 10 |
| Prénom déduit d'une raison sociale | « Bonjour Agence, » en tête d'un message client | le prénom n'est extrait que d'un nom de personne |
| La refonte de la couche de données avait retiré des fonctions utilisées par l'atelier | l'atelier d'annonces ne démarrait plus du tout (19 parcours sur 19 en échec) | l'atelier retrouve sa propre couche (`core/dbLegacy.js`), la console garde la sienne ; un test structurel vérifie désormais que chaque appel existe |

## Ce qui n'est pas connecté

Annoncé comme tel dans l'interface. Aucun de ces points n'est présenté comme
fonctionnel.

| Sujet | Ce qu'il faudrait | Coût externe estimé |
|---|---|---|
| Publication vers un portail | accord et accès API du portail ; la plupart n'en ouvrent pas aux tiers | variable, souvent contractuel |
| Récupération d'annonce par URL | interdite par les conditions d'utilisation des portails ; la saisie par copier-coller est la voie légale | — |
| Signature électronique | intégration d'un prestataire (Yousign, Docusign) | de l'ordre de 1 à 3 € par document |
| Envoi de courriels | fournisseur transactionnel (Postmark, Resend, SES) ; les messages sont déjà rédigés, il ne manque que l'expédition | quelques euros par mois à faible volume |
| Facturation SaaS | Stripe ; l'abstraction est en place, aucun paiement n'est traité | 1,5 % + 0,25 € par transaction européenne |
| Moteur IA distant | clé API côté serveur ; l'analyse et la réécriture actuelles n'en ont pas besoin | de l'ordre de 0,01 à 0,05 € par annonce réécrite |
| Données de marché | source de données immobilières sous licence | plusieurs centaines d'euros par mois |
| Base partagée | PostgreSQL ; le schéma existe, les données vivent aujourd'hui dans le navigateur | 10 à 25 € par mois pour démarrer |

## Passage à un SaaS commercial

Ce qui est déjà en place : cloisonnement par organisation, rôles et
autorisations, indicateurs de fonctionnalité, journal d'audit, export par
organisation, abstraction de facturation.

Ce qu'il resterait à faire, dans cet ordre :

1. **Déplacer la persistance** du navigateur vers PostgreSQL. Le schéma et le
   cloisonnement par ligne existent ; le dépôt (`src/core/db.js`) présente déjà
   l'interface qu'une couche serveur devrait implémenter.
2. **Authentification réelle** — aujourd'hui la session est locale. Un
   fournisseur d'identité, puis le rattachement des appartenances existantes.
3. **Envoi de courriels** — l'invitation d'un membre et les relances du CRM
   n'ont de sens qu'avec un envoi réel.
4. **Facturation** — brancher Stripe sur les plans déjà décrits.
5. **Intégrations de publication** — au cas par cas, selon les portails qui
   ouvrent une API.

Les points 1 et 2 conditionnent tout le reste : tant que les données vivent dans
le navigateur, le produit est un outil personnel, pas un service vendu.

## Limites assumées

- **Le système n'invente rien.** Une fiche incomplète donne un texte court, et
  un texte court est pénalisé par le score. C'est voulu : l'alternative serait
  d'inventer une surface ou un étage.
- **Les écarts de performance sont corrélés, jamais causaux.** Saisonnalité,
  prix et concurrence évoluent en parallèle. L'interface le dit à chaque
  comparaison.
- **Les estimations de prix sont internes.** Aucune donnée de marché externe
  n'est récupérée ; rien n'est présenté comme une valeur de marché.
- **Les mentions légales françaises sont signalées, pas affirmées.** Les règles
  concernées portent un avertissement de vérification.
