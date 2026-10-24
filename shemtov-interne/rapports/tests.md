# Résultats des tests

Exécution du 24/10/2026 03:49:40 (heure de Paris).
Navigateur : Chromium (Playwright), serveur local avec les en-têtes de `_headers`. Les requêtes vers l'extérieur sont coupées pendant les tests.
Bilan : 26 réussi, 1 bloquant, 1 à confirmer, 3 non exécuté.

| Id | Test | Résultat | Détail |
| --- | --- | --- | --- |
| S01 | Un client cherche les horaires depuis son iPhone | Réussi | statut « Ferme bientôt · à 17h » visible sans défiler sur l'accueil, horaires du jour « 8h – 17h » ; 1 toucher jusqu'au tableau complet, jour surligné |
| S02 | Un client veut appeler le magasin (téléphone) | Réussi | bouton « Appeler » (tel:+33388119692) visible en bas d'écran sur les 8 pages, 1 toucher ; masqué en descendant, réaffiché en remontant |
| S03 | Un visiteur cherche l'adresse sur ordinateur (itinéraire, copie, carte) | Réussi | itinéraire visible dans l'en-tête, adresse dans le 1er écran d'Infos pratiques, copie OK, carte chargée seulement au clic (CSP frame-src respectée) |
| S04 | Un nouveau client explore les rayons (accueil → rayon, pastilles, téléphone) | Réussi | 9 cartes, lien carte → rayon, pastilles synchronisées, message Loi Évin présent, galerie tactile défilante |
| S05 | Un visiteur utilise le menu mobile | Réussi | ouverture, focus, fond inerte, Échap, retour du focus, navigation, page courante signalée, fermeture en largeur ordinateur |
| S06 | Connexion lente (≈ 400 kb/s, 400 ms de latence) sur téléphone | Réussi | HTML prêt en 2973 ms, premier affichage 3016 ms, LCP 4200 ms, page complète en 14.0 s ; titre et bouton d'appel disponibles dès le HTML |
| S07 | Un utilisateur navigue uniquement au clavier | Réussi | 42 éléments parcourus sur l'accueil sans piège, tous avec contour visible et amenés à l'écran (galerie épinglée comprise) ; FAQ et carte utilisables au clavier |
| S08 | Un utilisateur désactive les animations (prefers-reduced-motion) | Réussi | 8 pages × 2 formats : animations GSAP non chargées, aucune animation CSS, aucun contenu masqué, défilement instantané, galerie non épinglée |
| S09 | Un client consulte les mentions légales (depuis le pied de page) | Réussi | éditeur, forme, capital, SIRET, RCS, TVA, directeur de la publication, crédits ; confidentialité : carte Google, cookies, droits, CNIL |
| S09b | Mentions légales : identité de l'hébergeur | Bloquant | hébergeur non choisi : mention obligatoire (LCEN, art. 6-III) à ajouter dans donnees.json avant publication |
| S10 | Un visiteur clique sur tous les liens disponibles | Réussi | 30 liens internes ouverts (200, ancres présentes), 5 entrées du menu cliquées ; 6 liens externes vers www.google.com, cibr.fr, www.facebook.com, policies.google.com, www.cnil.fr (nouvel onglet annoncé ; non ouverts ici : réseau sortant bloqué) |
| T01 | Chaque page : statut 200, titre et description uniques, un seul h1, aucune erreur, aucune violation CSP, aucune requête externe | Réussi | 8 pages ; hiérarchie des titres sans saut |
| T02 | Statut ouvert/fermé selon l'heure de Paris (5 moments de la semaine) | Réussi | 11-09 07:00 → Fermé · ouvre à 8h ; 11-09 12:00 → Ouvert · ferme à 20h ; 11-06 16:50 → Ferme bientôt · à 17h ; 11-07 10:00 → Fermé · rouvre demain à 9h30 ; 11-08 13:30 → Fermé · rouvre demain à 8h |
| T03 | Horaires exceptionnels : bandeau sur l'accueil, encadré sur Infos pratiques, statut adapté | Réussi | Lundi 9 novembre : Fermeture à 15h (test). ; Mardi 10 novembre : Fermé → Fermé · rouvre mercredi à 8h |
| T04 | Fêtes : dates passées masquées, prochaine fête mise en avant, 3 au plus sur l'accueil | Réussi | au 1er janvier 2027 : Tou biChvat Dans 22 jours / Pourim Dans 80 jours / Pessah Dans 110 jours |
| T05 | Aucun cookie ni stockage local, sur toutes les pages (carte non affichée) | Réussi |  |
| T06 | Sans JavaScript : contenu complet (horaires, fêtes, rayons, FAQ, lien vers la carte) | Réussi | le bouton « Afficher la carte » (qui demande JavaScript) est masqué ; le lien « Ouvrir dans Google Maps » reste |
| T07 | Images indisponibles : textes alternatifs, pas de débordement, aucune erreur | Réussi |  |
| T08 | Images : fichiers présents, attribut sizes juste, résolution suffisante, pas de déformation | Réussi | résolution limitée par la photo d'origine (recadrages serrés) : r-surgeles-480.webp (430 px pour 555 px × 1), r-surgeles-480.webp (430 px pour 351 px × 3), r-recevoir-760.webp (561 px pour 357 px × 3) |
| T09 | Page 404 : statut 404, mise en forme conservée en sous-dossier, liens de retour | Réussi |  |
| T10 | Animations actives (mouvement autorisé) : révélations jouées, galerie épinglée sur ordinateur, aucun bloc resté invisible | Réussi | GSAP + ScrollTrigger chargés à la demande ; défilement horizontal épinglé sur ordinateur, galerie tactile sur téléphone ; tout le contenu visible en fin de défilement |
| T11 | Données structurées (GroceryStore, FAQPage), robots.txt, plan du site | À confirmer | données structurées valides ; adresse canonique, og:url et sitemap.xml seront générés dès que le nom de domaine sera fixé dans donnees.json |
| T12 | En-têtes de sécurité (CSP stricte, HSTS, nosniff…) servis, identiques pour Netlify et Vercel | Réussi | CSP sans unsafe-inline, frame-src limité à www.google.com ; aucun style ni script en ligne |
| T13 | Données synchronisées (donnees.json = pages publiées) | Réussi |  |
| T14 | Aucune mention de travail, aucun reste du plan du magasin dans les fichiers publiés | Réussi |  |
| T15 | Responsive : 16 tailles × 9 pages, aucun débordement, cibles tactiles suffisantes, textes non coupés | Réussi | 320×640, 360×740, 375×667, 390×844, 414×896, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 2560×1440, 3840×2160, 844×390, 667×375, 1024×1366 |
| T16 | Zoom du texte à 200 % (WCAG 1.4.4) : aucun débordement horizontal à 1280 px | Réussi |  |
| T17 | Accessibilité automatique (axe-core, WCAG 2.2 A/AA) : toutes les pages, téléphone et ordinateur, menu ouvert, FAQ ouverte | Réussi | 0 violation sur 21 analyses (règles WCAG 2.0 à 2.2 A/AA et bonnes pratiques) |
| N01 | Safari (iOS, macOS), Firefox, Edge, appareils réels | Non exécuté | seul Chromium est disponible ici ; à tester sur un iPhone et un Android avant publication |
| N02 | Lecteurs d'écran (VoiceOver, NVDA, TalkBack) | Non exécuté | nécessite un appareil réel |
| N03 | Ouverture réelle des liens externes (Google Maps, Facebook, Consistoire, CNIL) | Non exécuté | réseau sortant bloqué dans cet environnement : adresses vérifiées par ailleurs (voir RAPPORT.md) |
