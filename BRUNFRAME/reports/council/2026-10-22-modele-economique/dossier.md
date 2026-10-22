# DOSSIER DU CONSEIL BRUNFRAME — 22 octobre 2026

## Décision à instruire
BRUNFRAME possède-t-il un modèle économique suffisamment crédible pour obtenir ses premiers clients et construire une activité rentable avec les moyens actuels du fondateur ?

## A. Déclaré par le fondateur (NON vérifié indépendamment)
- BRUNFRAME : studio créatif e-commerce, France. Fondateur = "BRUN". Projet mené en parallèle d'études et d'une alternance en formation commerciale (expérience de vente / relation client / commerce physique, notamment le magasin Shemtov Foch à Strasbourg).
- Deux offres autonomes : (1) visuels publicitaires/commerciaux premium (flyers, bannières, visuels Instagram, campagnes, assistés par IA) ; (2) création/refonte de sites e-commerce. Les fiches produits ne sont PAS une offre autonome.
- Niches prioritaires : mode, bijoux, cosmétiques, décoration. Cible : petites marques e-commerce indépendantes et commerces locaux.
- Portfolio visé : 8 réalisations (6 visuels + 2 sites). Prix : non définis. Statut juridique : non décidé (EURL "envisagée").
- Prospection prévue : LinkedIn, Instagram, e-mail, réseau, recommandations, contacts locaux.
- Contraintes : temps limité (alternance + études), budget de départ faible (non chiffré), expérience en création web "en développement", portfolio à construire, formalités à clarifier, aucun client.
- Objectif : 4 000 € "de revenus liés à l'activité" d'ici le 1er mars 2027. Nature NON précisée (CA cumulé ? mensuel ? bénéfice ? revenu net personnel ?). Aujourd'hui = 22/10/2026, soit 130 jours (~18,5 semaines) avant l'échéance.
- Projet pilote envisagé : Shemtov Foch (Strasbourg) — AUCUN accord obtenu, pas un contrat.

## B. Vérifié aujourd'hui (audit du 22/10/2026)
1. Dépôt GitHub de travail `m769csn5ry-del/ABR-CO` (101 fichiers) : contient (a) une landing page de la marque de vêtements "ABR&CO — Drop 001 Édition fondatrice, 60 pièces", collée dans README.md (787 Ko, images en base64) ; (b) "Orga — DBR Studio", PWA de tâches ; (c) "LifeOS", PWA d'organisation personnelle ; (d) un simulateur de conduite 3D (three.js). **Zéro fichier BRUNFRAME**, aucun CLAUDE.md, aucun .claude/, docs/, agents/, portfolio/. Les noms de branches indiquent que ces projets ont été produits en sessions Claude Code (développement assisté par IA). Les workflows publient automatiquement `todo/` et `lifeos/` sur GitHub Pages quand `main` change.
2. `https://maison-habitee.netlify.app` répond HTTP 200 (scrape du 22/10/2026). C'est une "Démo de refonte" d'une MARQUE FICTIVE, mention visible "Marque fictive · démo BRUNFRAME". Contenu constaté : bascule Avant/Après ; visite 3D de la maison pilotée au scroll ("Construction de la maison en 3D…") ; objets cliquables vers fiches ; fiche "Luminaire Aura" 320 € ; compteurs Panier 0 / Favoris 0 ; 8 catégories ; inscription newsletter ; "Livraison offerte dès 150 €, retours 30 jours". Un bandeau promotionnel Netlify ("Build your own site with Netlify") apparaît dans le rendu. Une seule URL crawlable (le seul lien extrait est celui du bandeau Netlify) : la navigation semble pilotée en JavaScript.
3. NON vérifié (le sandbox n'a pas d'accès navigateur direct au site, le proxy renvoie 403) : performance, rendu mobile, erreurs console, accessibilité, repli sans WebGL, SEO réel, mentions légales, paiement (le site est une démo sans encaissement testé).
4. Aucune preuve disponible de : client, témoignage, chiffre d'affaires, prospect listé, grille de prix, immatriculation, visuel publicitaire de portfolio (0 retrouvé dans le dépôt), second site du portfolio (non identifié).
5. Environnement outillé : Claude Code, sous-agents disponibles, connecteurs Canva / Figma / Notion / Gmail / Google Calendar / Google Drive / Netlify / Lovable / Gamma / Firecrawl (certains connecteurs échouent à la connexion dans cette session).

## C. Inconnues critiques (à traiter comme hypothèses explicites, ne pas inventer)
Heures disponibles par semaine · budget en euros · âge/statut exact de l'alternant et clauses éventuelles de l'employeur · statut juridique · maîtrise réelle de Shopify/WooCommerce/Figma · qualité des visuels IA produits · accord Shemtov Foch · nature exacte des 4 000 €.

## D. Règles du conseil
- Séparer systématiquement : DONNÉE VÉRIFIÉE / HYPOTHÈSE / ESTIMATION / OBJECTIF. Étiqueter chaque chiffre.
- Aucun chiffre inventé présenté comme un résultat réel. Aucune garantie de revenu. Aucun faux client, faux prospect, faux témoignage.
- Les prix et taux de conversion que tu poses sont des HYPOTHÈSES de travail, à signaler comme telles.
- Pour tout fait externe (marché, fiscalité, prix) : recherche web ciblée (4 recherches maximum), sources officielles pour le social/fiscal, cite la source et sa date ; sinon marque "non vérifié".
- Travail strictement en lecture : ne modifie, ne crée, ne supprime AUCUN fichier du dépôt.
