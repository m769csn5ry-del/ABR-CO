# BRUNFRAME — instructions permanentes

Ce fichier ne contient que l'essentiel. Le détail vit dans `docs/` ; l'historique des décisions dans `docs/decisions.md` ; les hypothèses dans `docs/assumptions.md`.

## Entreprise
- BRUNFRAME : studio créatif e-commerce (France). BRUN = nom du fondateur ; FRAME = cadrage, composition, structure. Cette lecture est un positionnement, pas une origine juridique.
- À traiter comme une entreprise réelle en construction, pas comme un projet scolaire.
- Fondateur : en alternance (formation commerciale) + études. Heures déclarées : 25 h/semaine (à mesurer, voir `docs/assumptions.md`). Budget de départ : non communiqué.
- BRUNFRAME vit dans le sous-dossier `BRUNFRAME/` du dépôt ABR-CO. Le reste du dépôt (ABR&CO, Orga/DBR Studio, LifeOS, game) est hors périmètre : n'y touche pas sans demande explicite.

## Offres (deux seulement)
1. Visuels publicitaires et commerciaux premium.
2. Création et refonte de sites e-commerce.
- Les fiches produits ne sont JAMAIS une troisième offre autonome (elles s'intègrent aux sites). Ne pas les réintroduire sans validation explicite.
- Séquencement recommandé par le conseil (D-001/D-006) : visuels en offre d'entrée, site en upsell.
- Cibles : petites marques et commerces — mode, bijoux, cosmétiques, déco.

## Objectif
4 000 € de CA (cumulé) au 01/03/2027. C'est un objectif, pas une prévision ni une promesse. Ne pas le confondre avec bénéfice ni revenu net.

## Règles d'honnêteté (non négociables)
- Étiqueter tout chiffre : V vérifié · H hypothèse · E estimation · O objectif.
- Ne jamais inventer clients, témoignages, résultats, prospects, historiques de conversation, expérience.
- Aucune promesse de hausse de ventes ou de revenu.
- Portfolio : projet fictif étiqueté comme tel ≠ projet client. Accord écrit pour tout produit, marque ou image réels (dont Shemtov Foch).
- Juridique, fiscal, social : information générale, sources officielles datées, pas de conclusion sans validation professionnelle.
- Ne jamais dire qu'une action est faite si elle ne l'est pas ; ne jamais dire qu'un sous-agent a tourné s'il a été simulé.

## Identité visuelle BRUNFRAME
Palette officielle : #DBEAFE · #93C5FD · #3B82F6 · #1D4ED8 · #1E3A8A. Réservée aux supports BRUNFRAME, jamais imposée aux clients. Détail : `docs/brand-identity.md`.

## Business Council
- Conseil complet seulement pour : nouvelle offre, tarifs, choix de marché, investissement important, changement de stratégie, outil coûteux, nouvelle activité, recrutement, analyse d'échec, validation d'opportunité. Sinon : expertise directe.
- Agents : `.claude/agents/brunframe-{believer,skeptic,investor,judge}.md` (à la racine du dépôt, seul emplacement de chargement fiable).
- Process : dossier unique (`templates/council-dossier.md`) → 3 analystes en parallèle sans se lire → Judge sur contexte neuf → décision consignée dans `docs/decisions.md`, rapports dans `reports/council/<date>-<slug>/`.
- Coût mesuré le 22/10/2026 : ~320 k tokens de sous-agents pour un conseil complet. Le signaler avant de le lancer.

## Production web
Checklist de livraison en 14 points : `docs/offers.md`. Un site de démo n'est pas une boutique prête à encaisser. Aucun secret dans le code ; aucune action destructive sans validation.

## Méthode de travail
- Lire seulement les fichiers nécessaires ; modifications ciblées ; pas de dépendance superflue.
- Données personnelles de prospects : jamais committées (`prospecting/private/` est ignoré par git).
- Ton : direct, précis, exigeant. Dire quand une idée est mauvaise. Ne pas flatter.
