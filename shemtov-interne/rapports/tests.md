# Résultats des tests

Navigateur : Chromium (Playwright), serveur local avec les en-têtes de `_headers`.
Bilan : 25 réussi, 0 échoué, 2 non exécuté, 1 sans objet.

| Id | Test | Résultat | Détail |
| --- | --- | --- | --- |
| T01 | Ouverture du site (titre, aucune erreur, aucune violation CSP, aucune requête externe) | Réussi | GSAP et ScrollTrigger chargés depuis le site |
| T02 | Chargement du hero (image principale chargée, LCP mesuré en laboratoire) | Réussi | LCP local 196 ms (serveur local, sans limitation réseau) |
| T03 | Navigation entre sections (liens du menu ordinateur) | Réussi |  |
| T04 | Menu mobile : ouverture, focus, Échap, fermeture au clic sur un lien | Réussi |  |
| T05 | Navigation vers les rayons : une carte mène à son étape et la zone s'allume sur le plan | Réussi | caméra du plan : viewBox 75.0 -37.7 540.0 773.3 |
| T06 | Animations : blocs révélés au défilement, phrase mot à mot, aucun bloc resté invisible | Réussi | 13 mots animés dans la phrase d'introduction |
| T07 | Mouvement réduit : pas de GSAP, aucun élément masqué, caméra sans animation | Réussi |  |
| T08 | Infos pratiques : statut calculé, 7 jours, jour en cours, horaires corrects | Réussi | Lundi 8h – 20h / Mardi 8h – 20h / Mercredi 8h – 20h / Jeudi 8h – 20h / Vendredi 8h – 17h / Samedi Fermé / Dimanche 9h30 – 13h |
| T09 | Horaires exceptionnels : encadré affiché et statut adapté | Réussi | Lundi 26 octobre : Fermeture à 15h (test). ; Mardi 27 octobre : Fermé |
| T10 | Boutons d'appel : tous pointent vers tel:+33388119692 | Réussi | 6 liens d'appel |
| T11 | Boutons itinéraire : Google Maps vers le 6 rue du Maréchal-Foch, ouverture dans un nouvel onglet | Réussi | 4 liens |
| T12 | Copier l'adresse : message de confirmation | Réussi | presse-papiers : 6 rue du Maréchal-Foch, 67000 Strasbourg |
| T13 | Page mentions-legales.html : affichage, contenu attendu, aucune mention de travail | Réussi |  |
| T14 | Page confidentialite.html : affichage, contenu attendu, aucune mention de travail | Réussi |  |
| T15 | Cookies et stockage : aucun cookie, aucun stockage local | Réussi |  |
| T16 | Clavier : lien d'évitement, focus visible, menu ordinateur atteignable | Réussi | Shemtov Foch → Le magasin → Nos rayons → Visite → Infos pratiques → Itinéraire → Découvrir le magasin → Nous trouver |
| T17 | Rechargement et liens directs (#visite, page secondaire, 404) | Réussi |  |
| T18 | Connexion lente (≈ 400 kb/s, 400 ms) : contenu lisible avant la fin du chargement | Réussi | contenu HTML prêt en 3283 ms, page complète en 10522 ms |
| T19 | Images indisponibles : textes alternatifs présents, mise en page intacte, aucune erreur JS | Réussi |  |
| T20 | Erreur de chargement des scripts : le site reste complet sans JavaScript | Réussi |  |
| T21 | Fonctionnement sans WebGL | Sans objet | le site n'utilise pas WebGL : aucune scène 3D tant que le plan n'est pas validé |
| T22 | Données synchronisées (donnees.json = pages publiées) | Réussi |  |
| T23 | Aucune mention « à confirmer » dans les fichiers publiés | Réussi |  |
| T28 | Visite guidée : la zone surlignée correspond à l'étape lue (téléphone et ordinateur) | Réussi | 7 étapes × 2 largeurs |
| T24 | Responsive : 15 tailles, aucun débordement horizontal, boutons ≥ 44 px, textes non coupés | Réussi | 320×640, 360×740, 375×667, 390×844, 414×896, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 2560×1440, 844×390, 667×375, 1024×1366 |
| T25 | Accessibilité automatique (axe-core, règles WCAG 2.2 A/AA) sur 4 pages, mobile et ordinateur | Réussi | 0 violation sur 16 combinaisons (4 pages × 2 largeurs × 2 thèmes) |
| T26 | Safari iOS, Safari macOS, Firefox, Edge, appareils réels | Non exécuté | seul Chromium est disponible dans cet environnement |
| T27 | Lecteurs d'écran (VoiceOver, NVDA) | Non exécuté | nécessite un appareil réel |
