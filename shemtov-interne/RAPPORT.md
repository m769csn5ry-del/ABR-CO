# Rapport de la refonte V4 du site Shemtov Foch

Document interne, jamais publié. État au 24 octobre 2026. Le site n'est **pas en ligne** et ne le sera pas sans ton autorisation explicite. La publication reste bloquée par les points de la section 10.

Rappel : ce rapport ne déclare pas le site « juridiquement conforme à 100 % ». Il liste ce qui a été vérifié, avec la preuve, et ce qui demande encore une validation humaine ou juridique.

## 1. Audit de la version précédente (V3) et améliorations réellement effectuées

| Défaut relevé sur la V3 | Correction V4 |
| --- | --- |
| Ambiance trop sombre (fond noir violacé), impression « enfantine » | Identité claire : fond crème `#FAF8F4`, encre chaude, rose du logo réservé aux accents, une seule section sombre (fêtes) pour le rythme, pied de page sombre |
| Polices Fredoka (arrondie, ludique) et Figtree | Plus Jakarta Sans pour les titres, Inter pour les textes, hébergées avec le site ; titres resserrés, hiérarchie et interlignages revus |
| Plan interactif du magasin imprécis | **Supprimé** du site avec son code (`svg_web`, `plan-web.svg`, styles, script, test T28). Remplacé par une présentation des rayons en photos, sans aucune carte intérieure. Le plan 2D reste un document de travail interne |
| Une seule page avec ancres | 8 pages (accueil, le magasin, nos rayons, infos pratiques, FAQ, contact, mentions légales, confidentialité) + page 404 |
| Pas de carte, pas de FAQ, pas de page contact | Carte Google Maps chargée au clic (rien n'est envoyé à Google avant), FAQ de 10 questions aux réponses vérifiées, page contact centrée sur le téléphone |
| Bandeau « Version de travail » | Retiré |
| Données recopiées dans plusieurs pages | Générateur `synchroniser.py` : en-tête, pied de page, horaires, fêtes, rayons, FAQ, mentions et photos sont produits depuis `donnees.json` ; le script vérifie aussi le numéro et l'adresse écrits à la main dans les pages |
| Logo basse définition | Logo HD reçu, fond rendu transparent sans liseré, 3 tailles WebP ; favicon, icône Apple et image de partage refaites |
| Typographie française | Espaces insécables ajoutées automatiquement avant « : ; ? ! » (plus de ponctuation seule en début de ligne) |

Ce qui a été conservé parce que solide : le site statique sans framework ni compilation (rapide, hébergement gratuit, maintenance simple), le statut ouvert/fermé à l'heure de Paris, les horaires exceptionnels, la CSP stricte, GSAP hébergé sur le site, les pages légales vérifiées.

## 2. Pages finalisées

| Page | Contenu |
| --- | --- |
| Accueil | Statut du jour dès le premier écran (lien vers les horaires), grand titre animé, mosaïque de trois photos et badge du logo, bandeau aujourd'hui / adresse / téléphone, présentation courte, 4 repères (casher, du frais aux vins, en magasin uniquement, Facebook), galerie des 9 rayons, fêtes à venir, horaires et adresse, bandeau d'horaires exceptionnels si besoin |
| Le magasin | Présentation (uniquement des faits vérifiés : rien sur l'histoire, les engagements ou l'ancienneté), liens vers chaque rayon, galerie de 6 photos « non contractuelles », encadrés casher et « pas de commande en ligne » |
| Nos rayons | Barre de pastilles qui suit la lecture, 9 rayons (photo, description, liste), message sanitaire sur le rayon boissons |
| Infos pratiques | Horaires du jour surlignés, statut en direct, horaires exceptionnels, adresse, itinéraire, copie de l'adresse, téléphone, carte Google au clic, toutes les fêtes à venir |
| Contact | Téléphone en premier (avec statut ouvert/fermé), adresse, Facebook, horaires, lien FAQ. Pas de formulaire : il n'est pas nécessaire et obligerait à traiter des données personnelles |
| FAQ | 10 questions (dont toutes celles du cahier des charges), réponses générées depuis les données ; données structurées FAQPage |
| Mentions légales, confidentialité | Éditeur, directeur de la publication, crédits, carte Google, cookies, droits, CNIL |
| 404 | Page sobre avec retour à l'accueil et aux horaires, non indexée |

En-tête : logo, 5 liens, bouton « Itinéraire » ; sur téléphone, menu plein écran avec statut, appel et itinéraire. Pied de page : coordonnées, plan du site, horaires, pages légales, Facebook, mention légale courte, « Photos non contractuelles ». Sur téléphone, barre fixe « Appeler / Itinéraire » sur toutes les pages.

## 3. Animations intégrées

- **Haut de page** (CSS, pour ne jamais retarder l'affichage) : titre de l'accueil mot par mot dans des masques, photo principale qui se dévoile avec un zoom lent, petites photos et badge qui arrivent en décalé ; sur les autres pages, titre qui glisse sans disparaître (il reste lisible dès le premier affichage).
- **Au défilement** (GSAP + ScrollTrigger) : titres de section mot par mot, blocs et cartes en apparition douce et en cascade, photos dont le cadre s'ouvre pendant que l'image se pose, parallaxe légère des photos sur grand écran.
- **Galerie des rayons** : sur ordinateur (souris, écran ≥ 1024 px), la section s'épingle et les cartes défilent à l'horizontale avec une barre de progression ; le clavier amène la carte atteinte à l'écran. Sur tablette et téléphone, carrousel au doigt avec aimantation.
- **Navigation** : transitions entre pages (View Transitions, navigateurs compatibles), en-tête et barre d'appel qui s'effacent en descendant et reviennent en remontant, soulignés animés, flèches des boutons, zoom des cartes au survol, menu mobile avec apparition des liens en cascade, FAQ avec icône animée.
- **Règles respectées** : aucune introduction bloquante ; rien n'est masqué avant le chargement des animations ; GSAP n'est chargé qu'une seconde après la page et seulement si le visiteur n'a pas demandé à réduire les animations ; avec la réduction demandée, aucune animation CSS, aucun défilement doux, aucune galerie épinglée (test S08).

## 4. Mobile et ordinateur

- Conçu par format, pas réduit : menu plein écran et barre d'appel sur téléphone ; galerie tactile ; boutons du haut côte à côte même sur un écran de 390 px ; badge décoratif masqué sur téléphone (le logo est dans l'en-tête).
- Zones de sécurité des iPhone (encoche, barre d'accueil) prises en compte dans l'en-tête, le menu et la barre d'appel.
- Vérifié sur 16 tailles, du 320 × 640 au 4K et en paysage, sur les 9 pages : aucun débordement, boutons d'au moins 44 px, cibles d'au moins 24 px, textes non coupés (test T15) ; zoom du texte à 200 % sans défilement horizontal (T16).
- Contrôle visuel page par page sur 1440 px et 390 px (captures écran par écran) : défauts trouvés et corrigés pendant ce contrôle : mosaïque du haut décalée, adresse coupée au milieu, titre trop long sur Le magasin, pastille active des rayons hors cadre, ponctuation seule en début de ligne, statut et pastille d'en-tête sur la même ligne.

## 5. Résultats des tests exécutés

Détail : `rapports/tests.md` (banc `tests/tester.mjs`, Chromium via Playwright, serveur local avec les en-têtes de production ; les requêtes vers l'extérieur sont coupées pour prouver qu'aucune ne part).

**Bilan du dernier passage complet (24 octobre 2026) : 26 réussis, 0 échoué, 1 bloquant (hébergeur), 1 à confirmer (domaine), 3 non exécutés.**

**Les 10 scénarios clients du cahier des charges** :

| # | Scénario | Résultat |
| --- | --- | --- |
| S01 | Horaires depuis un iPhone | Réussi : statut du jour visible sans défiler, horaires du jour, 1 toucher jusqu'au tableau complet |
| S02 | Appeler le magasin | Réussi : bouton « Appeler » visible en bas d'écran sur les 8 pages, 1 toucher |
| S03 | Adresse sur ordinateur | Réussi : itinéraire dans l'en-tête, adresse dans le 1er écran, copie, carte chargée seulement au clic |
| S04 | Explorer les rayons | Réussi : carte → rayon, pastilles synchronisées, galerie tactile |
| S05 | Menu mobile | Réussi : focus, fond inerte, Échap, page courante signalée |
| S06 | Connexion lente | Réussi : titre et bouton d'appel présents dès le HTML (≈ 4 s à 400 kb/s) |
| S07 | Clavier seul | Réussi : 42 éléments, contour visible, aucun piège, FAQ et carte au clavier |
| S08 | Animations désactivées | Réussi sur les 8 pages, téléphone et ordinateur |
| S09 | Mentions légales | Réussi pour le contenu ; **bloquant** : hébergeur à ajouter |
| S10 | Tous les liens | Réussi : tous les liens internes ouverts (statut 200, ancres présentes) ; liens externes vérifiés dans leur forme, non ouverts ici (réseau sortant bloqué) |

Contrôles techniques T01 à T17 : tous réussis (pages, statut horaire à 5 moments de la semaine, horaires exceptionnels, fêtes, cookies, sans JavaScript, images, 404, animations, sécurité, données synchronisées, absence de mention de travail et de reste du plan, responsive, zoom, accessibilité). T11 est « à confirmer » : URL canoniques et sitemap attendent le nom de domaine.

Défauts trouvés par les tests et corrigés : un lien externe de la FAQ n'annonçait pas l'ouverture d'un nouvel onglet ; la barre d'appel n'était dans aucune région de page (axe) ; l'attribut `sizes` des cartes de rayons sous-estimait leur largeur ; le statut du jour n'était visible sur iPhone qu'après un défilement.

**Non exécuté** (aucune preuve, donc rien n'est affirmé) : Safari iOS et macOS, Firefox, Edge et appareils réels (seul Chromium est disponible ici) ; lecteurs d'écran ; ouverture réelle de Google Maps, Facebook et des sites externes.

## 6. Performance mesurée

Mesures Lighthouse de laboratoire sur les 8 pages : `rapports/performance.md` (`tests/mesurer.mjs`).

Lighthouse 12.6, 24 octobre 2026 ; téléphone = profil mobile par défaut (4G lente et processeur ralenti, simulés) :

| Pages | Format | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accueil, Le magasin, Nos rayons | Téléphone | 96 à 97 | 100 | 100 | 100 | 2,63 à 2,71 s | 0 | 3 à 68 ms |
| Infos pratiques, FAQ, Contact, Mentions, Confidentialité | Téléphone | 100 | 100 | 100 | 100 | 1,51 à 1,65 s | 0 | 0 ms |
| Les 8 pages | Ordinateur | 100 | 100 | 100 | 100 | 0,36 à 0,57 s | 0 à 0,002 | 0 ms |

Évolution pendant la refonte (téléphone, LCP) : accueil 3,28 → 2,71 s, Le magasin 3,23 → 2,63 s, Nos rayons 3,38 → 2,63 s, pages de texte 2,2 → 1,6 s.

- Le LCP visé (≤ 2,5 s) est atteint sur ordinateur et sur les pages de texte sur téléphone. Sur les trois pages dont l'élément principal est une photo, il reste un peu au-dessus (2,63 à 2,71 s) en 4G lente simulée. Les photos fournies, très détaillées et retouchées, se compressent mal (130 Ko pour une photo de 760 px). Des photos d'origine plus nettes et une photo de façade amélioreraient ce point.
- Optimisations faites : WebP en 3 largeurs avec `sizes` exact (vérifié par T08), photo principale prioritaire et plus compressée, images sous l'écran en chargement différé, badge décoratif non chargé sur téléphone, polices hébergées et préchargées seulement là où le titre est l'élément principal, titres des pages intérieures visibles dès le premier rendu, GSAP chargé une seconde après la page, aucun script ni style bloquant à part la feuille de style (8 Ko compressée), aucun décalage de mise en page.
- INP : ne se mesure qu'avec de vrais visiteurs (Search Console, après la mise en ligne). En laboratoire, le temps de blocage (TBT) reste faible.
- Ce sont des mesures de laboratoire sur un serveur local : les valeurs réelles dépendront de l'hébergeur et du réseau des visiteurs.

## 7. Sécurité

| Point | État | Preuve |
| --- | --- | --- |
| CSP | Stricte : tout vient du site lui-même, aucun `unsafe-inline` ni `unsafe-eval` ; seule exception, `frame-src https://www.google.com` pour la carte affichée au clic | T01 (aucune violation sur 8 pages), T03, T12 |
| Autres en-têtes | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, HSTS ; valeurs identiques pour Netlify (`_headers`) et Vercel (`vercel.json`) | T12 |
| Code | Aucun style, script ou gestionnaire d'événement en ligne ; aucune saisie, donc aucune injection possible | T12 |
| Dépendances | Une seule, GSAP 3.13.0, copiée sur le site (aucun CDN). Aucune dépendance ajoutée en V4 | `assets/vendor/LICENCES.txt` |
| Données et secrets | Aucun formulaire, compte, clé ni secret | Revue du code |
| Liens externes | `rel="noopener"`, nouvel onglet annoncé aux lecteurs d'écran | S10 |
| HTTPS | Fourni par l'hébergeur ; HSTS déjà prêt | Implémenté, à vérifier en ligne |

## 8. Vérifications juridiques

Audit technique, qui ne remplace pas l'avis d'un professionnel du droit.

| Exigence | Mesure en place | Justificatif | État |
| --- | --- | --- | --- |
| Éditeur (LCEN art. 6-III) : dénomination, forme, capital, siège, téléphone, RCS, SIRET, TVA | Page mentions légales générée depuis les données | INPI, Pappers ; test S09 | Validé et testé |
| Directeur de la publication | Yves MAAREK, gérant | Pour une SARL, le gérant (loi 82-652, art. 93-2) ; gérant confirmé par toi | Validé et testé |
| Hébergeur (nom, adresse, téléphone) | Bloc prêt, s'affiche dès que la donnée est saisie | — | **Bloquant** |
| Cookies et traceurs | Aucun cookie ni stockage ; carte Google chargée seulement au clic, après une information claire ; pas de bandeau nécessaire | T05, S03 | Validé et testé |
| RGPD | Aucune donnée collectée par le site ; page confidentialité : responsable, carte Google, journaux de l'hébergeur, droits, CNIL | Page confidentialité | Validé ; à compléter avec la durée de conservation des journaux une fois l'hébergeur choisi |
| Publicité pour l'alcool (loi Évin) | Message sanitaire sur le rayon boissons et dans les mentions ; présentation factuelle | Code de la santé publique L3323-2 et L3323-4 | À confirmer par un juriste |
| Cacherout | Seule mention : « référencée par le Consistoire Israélite du Bas-Rhin », avec le lien vers sa liste ; aucun logo, aucune certification affirmée, aucun produit présenté comme certifié | Liste cibr.fr relue le 24/10/2026 : « SHEMTOV, Épicerie, 6 rue du Maréchal Foch, 03 88 11 96 92 » | Validé |
| Photos | Photos du magasin, sans personne ; mention « Photos non contractuelles » | Indices de retouche (SUIVI, alerte 3) | À confirmer par le gérant |
| Logo, polices, bibliothèques | Logo fourni ; Plus Jakarta Sans et Inter sous SIL OFL 1.1 ; GSAP sous licence standard GreenSock ; crédits dans les mentions | `LICENCES.txt`, mentions | Validé |
| Informations commerciales | Aucun prix, promotion, avis, allégation ou disponibilité promise ; « l'assortiment varie selon les arrivages » | Relecture des pages | Validé |
| Vente en ligne | Aucune : ni panier, ni commande, ni paiement, ni compte | — | Sans objet |
| Accessibilité (obligation) | WCAG 2.2 AA visé ; le site ne vend rien et l'entreprise est une microentreprise : a priori pas d'obligation réglementaire | — | À confirmer |

## 9. Classement des points par statut

**Validé et testé**
- Les 10 scénarios clients (S01 à S10), dans Chromium.
- Statut ouvert/fermé, horaires exceptionnels, fêtes, horaires du jour.
- Carte Google : aucune requête avant le clic, cadre créé au clic, CSP respectée.
- Aucun cookie, aucun stockage, aucune requête externe à l'ouverture des pages.
- Responsive sur 16 tailles, zoom 200 %, navigation clavier, mouvement réduit, fonctionnement sans JavaScript.
- axe-core : 0 violation sur 21 analyses (9 pages × 2 largeurs, menu ouvert, FAQ ouverte).
- En-têtes de sécurité et CSP ; données synchronisées ; absence du plan et de toute mention de travail.
- Mentions légales (sauf hébergeur), confidentialité, données structurées.

**Implémenté mais non testé**
- Safari, Firefox, Edge, appareils réels ; VoiceOver, NVDA, TalkBack.
- Affichage effectif de la carte Google et ouverture des liens externes (réseau sortant bloqué ici ; adresses vérifiées par ailleurs).
- Transitions entre pages (View Transitions) : présentes dans le code, non vérifiées automatiquement.
- HTTPS, HSTS et compression chez l'hébergeur réel.
- INP réel (mesurable seulement avec de vrais visiteurs).

**À confirmer** (voir SUIVI, section 3)
- Relecture des textes par le gérant ; formulation casher ; détails de certains rayons (sans gluten et végan, traiteur, spiritueux, pâtisserie, vaisselle).
- Accord du gérant sur les photos (indices de retouche) et sur le logo « Anvers & Foch ».
- Horaires des jours de fête, email de contact, accès à la fiche Google et à la page Facebook.
- Validation loi Évin par un juriste.
- Domaine (canonical et sitemap générés dès qu'il est fixé).

**Bloquant avant publication**
- Hébergeur : mention légale obligatoire (prévu dimanche).
- Domaine : choix, et renouvellement de `shemtov.fr` avant le **3 décembre 2026** si on le garde.
- Accord du gérant sur le contenu.
- Ton autorisation explicite de mise en ligne.

## 10. Problèmes restant à résoudre

1. Hébergeur et domaine (bloquants, ci-dessus).
2. LCP mobile simulé légèrement au-dessus de 2,5 s sur les pages à photo principale : dépend surtout des photos fournies.
3. Deux photos de rayon proviennent de recadrages serrés (surgelés : 430 px, recevoir : 561 px de large) : un peu douces sur les grands écrans et les écrans haute densité. Une photo plus large de chaque rayon réglerait ce point.
4. Pas de photo de la façade.

## 11. Déploiement (après ton autorisation)

1. **Domaine** : renouveler `shemtov.fr` chez OVH avant le 3 décembre 2026 et mettre à jour les informations du titulaire.
2. **Hébergement** : Netlify (*Base directory* = `shemtov`) ou Vercel (*Root Directory* = `shemtov`). Les en-têtes de `_headers` ou `vercel.json` s'appliquent seuls. Aucune compilation.
3. **DNS** : chez OVH, faire pointer le domaine vers l'hébergeur.
4. **Données** : renseigner `domaine` et `hebergeur` dans `shemtov-interne/contenu/donnees.json`, puis `python3 shemtov-interne/outils/synchroniser.py` (ajoute URL canoniques, image de partage absolue, `sitemap.xml`, bloc hébergeur).
5. Relancer `tester.mjs` et `mesurer.mjs` ; tester sur un iPhone et un Android.
6. Mettre en ligne, puis : Google Search Console (vérification DNS, envoi du sitemap), adresse du site sur la fiche Google et la page Facebook.

## 12. Modifier les contenus

| Je veux changer… | Où | Ensuite |
| --- | --- | --- |
| Horaires habituels ou exceptionnels, fêtes | `shemtov-interne/contenu/donnees.json` | `python3 shemtov-interne/outils/synchroniser.py` |
| Téléphone, adresse, informations légales, rayons, FAQ | `donnees.json` | Synchroniser |
| Photos | Originaux nommés comme dans `outils/photos.py` | `python3 shemtov-interne/outils/photos.py <dossier>` puis synchroniser |
| Textes hors blocs générés | La page concernée dans `shemtov/` | Synchroniser (vérifie numéro et adresse), puis tests |
| Vérifier le tout | — | `node shemtov-interne/tests/tester.mjs` |
| Voir le site en local | — | `node shemtov-interne/tests/serveur.mjs 8080`, puis http://127.0.0.1:8080/ |
