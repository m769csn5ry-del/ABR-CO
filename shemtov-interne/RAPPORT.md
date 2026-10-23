# Rapport du site Shemtov Foch

Document interne, jamais publié. État au 23 octobre 2026. Le site n'est **pas en ligne** : la publication reste bloquée par les points de la section 6.

## 1. Audit initial

**Ce qui existait** : un site statique sans framework ni étape de compilation (`shemtov/`), des polices hébergées localement, le statut ouvert/fermé en direct, les mentions légales vérifiées, un plan 2D généré par script. Rien ne justifiait d'introduire React ou Next.js : le site n'a ni état complexe, ni routes dynamiques, ni données serveur. Le conserver en HTML statique garde le chargement rapide, l'hébergement gratuit et la maintenance simple.

**Ce qui manquait ou a été corrigé** :
- aucune photo réelle, aucune image de partage ni icône ;
- les données (horaires, fêtes, informations légales) étaient recopiées à plusieurs endroits ;
- ni menu mobile, ni page de confidentialité, ni page 404, ni en-têtes de sécurité, ni tests automatisés ;
- le dépôt contient d'autres projets (`todo/`, `lifeos/`, `game/`) : le site Shemtov reste isolé dans `shemtov/`.

**Référence Koffiracha** : la page a pu être lue (textes, structure, polices, couleurs), mais pas ses animations, qu'une extraction de page ne restitue pas. Ce qui a été retenu, sans rien copier : une typographie de titre très grande, un rythme de sections contrastées (sombre, clair), des photos grand format, des animations liées au défilement. L'identité, les couleurs (celles du logo Shemtov), les textes et le code sont propres au projet.

## 2. Ce qui a été construit

| Élément | Détail |
| --- | --- |
| Accueil | Grand titre, photo du magasin avec effet de profondeur, statut ouvert/fermé, accès direct à la présentation et aux infos |
| Le magasin | Texte validé, trois repères (jours d'ouverture, référencement du Consistoire, adresse), photos en parallaxe |
| Nos rayons | Six univers avec photo ; carrousel au doigt sur téléphone, grille décalée sur ordinateur ; chaque univers mène à son étape sur le plan |
| Visite du magasin | Plan interactif collé à l'écran : une « caméra » zoome sur la zone de chaque étape pendant qu'on lit ; sept étapes de l'entrée au fond ; zones cliquables |
| Infos pratiques | Adresse, appel, itinéraire, copie de l'adresse, horaires du jour surlignés, horaires exceptionnels, fêtes à venir |
| Pages | Mentions légales, confidentialité et cookies, page 404 |
| Navigation | En-tête qui s'efface en descendant et revient en remontant ; menu mobile accessible ; barre « Appeler / Itinéraire » sur téléphone |

**Mode immersif retenu** : le mode B (exploration schématique), enrichi des photos réelles de chaque rayon. Pas de scène 3D (WebGL) : le plan 2D n'est pas encore validé, et les photos ne suffisent pas à reconstruire fidèlement le magasin en volume. Le site ne présente jamais le plan comme exact (« Plan indicatif, non à l'échelle »).

**Animations** : apparitions au défilement, phrase d'introduction mot par mot, parallaxe des photos, zoom du plan. GSAP et ScrollTrigger (copiés sur le site, aucun service externe) ne sont chargés que si le visiteur n'a pas demandé à réduire les mouvements. Rien n'est masqué avant leur chargement. Sans JavaScript, le site reste complet.

## 3. Performance

Mesures Lighthouse 12.6 en laboratoire, sur serveur local compressé (gzip), deux passages :

| Profil | Performance | Accessibilité | Bonnes pratiques | SEO | Premier affichage | Affichage principal (LCP) | Blocage | Décalage (CLS) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile (4G simulée) | 95 à 96 | 100 | 100 | 100 | 1,4 s | 2,6 à 2,8 s | 80 ms | 0 |
| Ordinateur | 100 | 100 | 100 | 100 | 0,3 s | 0,6 à 0,7 s | 0 ms | 0 à 0,001 |

- Avant optimisation, le mobile était à 87 avec un affichage principal à 4,0 s. Gains : image d'accueil en trois tailles dont une de 760 px, logo allégé (13 Ko → 7 Ko), compression des fichiers texte.
- Reste au-dessus de l'objectif sur mobile simulé : l'affichage principal (2,6 à 2,8 s pour 2,5 s visé). L'image d'accueil pèse 117 Ko en 760 px. Les photos fournies, très détaillées et retouchées, se compressent mal : des photos d'origine régleront en partie ce point.
- Ce sont des mesures de laboratoire. Les Core Web Vitals réels (75ᵉ centile des visites) ne pourront être mesurés qu'après la mise en ligne.
- Poids : page d'accueil 29 Ko (7 Ko compressée), styles 24 Ko, script du site 16 Ko, GSAP et ScrollTrigger 116 Ko (chargés après l'affichage), photos 3,2 Mo au total sur le disque, dont le navigateur ne charge que la taille utile.

## 4. Accessibilité

Objectif de qualité : WCAG 2.2 niveau AA. Ce n'est pas une certification.

- axe-core 4.10 : **0 violation** sur 16 combinaisons (4 pages × téléphone et ordinateur × thème clair et sombre).
- Lighthouse : 100 sur mobile et sur ordinateur.
- Mesures en place : lien « Aller au contenu », focus visible partout, menu mobile qui rend le reste de la page inerte, se ferme avec Échap et rend le focus au bouton, zones tactiles d'au moins 44 px, textes alternatifs sur toutes les photos, plan décrit en texte pour les lecteurs d'écran, statut annoncé poliment, mouvement réduit respecté (aucune animation, aucun défilement doux), contenu complet sans JavaScript.
- Correction faite pendant les tests : l'effet « mot par mot » laissait les mots pâles tant qu'on ne faisait pas défiler, ce qui donnait un contraste insuffisant. Les mots apparaissent désormais une seule fois, puis restent pleinement lisibles.
- **Non testé** : VoiceOver (iPhone) et NVDA (Windows), qui demandent un appareil réel.
- Obligation légale : le site ne vend rien. L'European Accessibility Act vise surtout le commerce en ligne et exempte les microentreprises pour les services. À faire confirmer, mais a priori pas d'obligation réglementaire spécifique.

## 5. Sécurité

| Point | État |
| --- | --- |
| Politique de sécurité du contenu (CSP) | Stricte : uniquement le site lui-même, aucun `unsafe-inline`, ni `unsafe-eval`. Vérifiée sans violation par le test T01 |
| Autres en-têtes | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, HSTS (dans `_headers` pour Netlify et `vercel.json` pour Vercel) |
| Dépendances | Une seule bibliothèque embarquée, GSAP 3.13.0 : `npm audit` ne trouve aucune vulnérabilité. Aucune dépendance chargée depuis un autre site |
| Données | Aucun formulaire, aucun compte, aucune clé d'API, aucun secret dans le code |
| Liens externes | Tous en `rel="noopener"` |
| Mise à jour | Relancer `npm audit` sur GSAP avant chaque mise à jour du site |

## 6. Conformité juridique (France)

Audit technique, qui ne remplace pas l'avis d'un professionnel du droit.

| Exigence | Mesure en place | Justificatif | État | Action restante | Validation |
| --- | --- | --- | --- | --- | --- |
| Mentions légales : éditeur (dénomination, forme, capital, siège, téléphone, RCS, TVA) | Page mentions légales générée depuis les données | Attestation INPI, Pappers | Conforme | Aucune | Patron |
| Mentions légales : directeur de la publication | Bloc prévu, s'affiche dès que la donnée est saisie | — | **Bloquant** | Nom et qualité à fournir | Patron |
| Mentions légales : hébergeur (nom, adresse, téléphone) | Bloc prévu | — | **Bloquant** | Choisir l'hébergeur | Patron / toi |
| Adresse email de contact | Non affichée | contact@shemtov.fr non vérifiée | À vérifier | Tester l'adresse dans OVH | Patron |
| RGPD : traitements | Aucun traitement par le site lui-même. Journaux techniques de l'hébergeur mentionnés | Page confidentialité | À vérifier | Préciser la durée de conservation et les transferts hors UE une fois l'hébergeur choisi (Netlify et Vercel sont américains) | Toi |
| Cookies et traceurs | Aucun cookie, aucun stockage local, aucune requête vers un service tiers | Test T15, test T01 | Conforme, pas de bandeau nécessaire | Ne rien ajouter sans revoir ce point | — |
| Publicité pour l'alcool (loi Évin) | Message sanitaire près des vins, dans la visite et dans les mentions. Présentation factuelle, sans incitation | Code de la santé publique L3323-2 et L3323-4 | À vérifier | Faire valider les photos de spiritueux et la formulation | Juriste |
| Cacherout | Seule mention : « référencée par le Consistoire Israélite du Bas-Rhin », avec le lien | Liste du Consistoire | Conforme | Mention plus précise seulement avec le certificat | Patron |
| Photos | Photos fournies par le magasin, sans personne identifiable | Fichiers reçus | **Bloquant** | Confirmer qu'elles sont d'origine. Deux indices de retouche par IA (voir SUIVI) | Patron |
| Logo | Version 217 × 233 px | Fichier reçu | **Bloquant** | Recevoir le fichier haute définition et confirmer la version « Anvers & Foch » | Patron |
| Marques visibles sur les produits | Présentes de façon accessoire dans les photos de rayon | Mention dans les mentions légales | Conforme | Aucune | — |
| Polices et bibliothèques | Fredoka et Figtree sous licence SIL OFL, GSAP sous licence standard | `assets/vendor/LICENCES.txt` | Conforme | Aucune | — |
| Vente en ligne | Aucune : pas de panier, de commande, de paiement ni de compte | — | Sans objet | Revoir si une vente est ajoutée | — |
| Informations alimentaires | Catégories de produits seulement : aucun prix, label, origine, allégation ni promotion | — | Conforme | Aucune | — |

**Conclusion** : publication publique bloquée tant que le directeur de la publication, l'hébergeur, la confirmation des photos et le logo HD manquent.

## 7. Tests

Le détail figure dans `rapports/tests.md`. Bilan : **25 réussis, 0 échoué, 2 non exécutés, 1 sans objet**.
- Non exécutés : Safari (iOS et macOS), Firefox, Edge et appareils réels, car seul Chromium est disponible ici ; lecteurs d'écran.
- Sans objet : le fonctionnement sans WebGL, puisque le site n'en utilise pas.
- Défauts trouvés et corrigés pendant les tests :
  - le menu mobile ne s'affichait pas : l'effet de flou de l'en-tête le contenait ;
  - un lien direct vers `#visite` restait en haut de page : conflit entre défilement doux et GSAP ;
  - le bouton de l'en-tête faisait 42 px au lieu de 44 ;
  - le plan surlignait l'étape suivante sur ordinateur. Le test T28, ajouté pour ce cas, échoue bien avec l'ancien réglage ;
  - le contraste de l'effet « mot par mot ».

## 8. Déploiement (après autorisation)

1. **Domaine** : renouveler `shemtov.fr` chez OVH avant le **3 décembre 2026** et mettre à jour les informations du titulaire.
2. **Hébergement Netlify** : créer un site relié au dépôt, avec *Base directory* = `shemtov` (Vercel : *Root Directory* = `shemtov`). Les en-têtes de `_headers` ou `vercel.json` s'appliquent seuls.
3. **DNS** : chez OVH, faire pointer le domaine vers l'hébergeur (valeurs données par Netlify ou Vercel).
4. **Données** : renseigner `domaine`, `responsablePublication` et `hebergeur` dans `shemtov-interne/contenu/donnees.json`, puis lancer `python3 shemtov-interne/outils/synchroniser.py`. Cela ajoute l'URL canonique, l'image de partage, `sitemap.xml` et le bloc hébergeur.
5. Retirer la ligne « Version de travail · non publiée » de `index.html`.
6. Relancer les tests, puis mettre en ligne.

## 9. Modifier les contenus

| Je veux changer… | Où | Ensuite |
| --- | --- | --- |
| Horaires habituels, horaires exceptionnels, fêtes | `shemtov-interne/contenu/donnees.json` | `python3 shemtov-interne/outils/synchroniser.py` |
| Téléphone, adresse, informations légales | `donnees.json` (et les liens d'appel dans les pages : le script vérifie qu'ils correspondent) | Synchroniser |
| Photos | Originaux dans un dossier, avec les noms indiqués dans `outils/photos.py` | `python3 shemtov-interne/outils/photos.py <dossier>` |
| Plan | `shemtov-interne/plan/generer_plan.py` | Lancer le script, puis synchroniser |
| Textes | `shemtov/index.html` | Relancer les tests |
| Vérifier le tout | — | `node shemtov-interne/tests/tester.mjs` |
| Voir le site en local | — | `node shemtov-interne/tests/serveur.mjs 8080`, puis ouvrir http://127.0.0.1:8080/ |
