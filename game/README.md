# SVJ Gintani — simulateur de conduite en monde ouvert

Simulateur de conduite d'une Lamborghini Aventador SVJ à ligne d'échappement
Gintani, en monde ouvert, entièrement dans le navigateur.

**Tout est généré par le code** : la voiture, le décor, les textures et le son
du V12. Aucun modèle 3D, aucune image, aucun échantillon audio n'est chargé.
La seule dépendance, Three.js, est incluse dans `vendor/` — le jeu fonctionne
hors ligne.

## Lancer

Ouvrir `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari).
Un double-clic suffit. Pour éviter toute restriction locale, on peut aussi
servir le dossier :

```bash
cd game && python3 -m http.server 8000     # puis http://localhost:8000
```

Le son démarre au clic sur **DÉMARRER LE MOTEUR** (les navigateurs exigent une
action de l'utilisateur avant de produire du son).

## Commandes

| Touche | Action |
|---|---|
| `Z` `W` `↑` | Accélérer |
| `S` `↓` | Freiner · marche arrière |
| `Q` `A` `←` / `D` `→` | Direction |
| `Espace` | Frein à main |
| `Maj gauche` / `Ctrl` | Monter / descendre un rapport |
| `E` | Boîte automatique ↔ séquentielle |
| `C` | Caméra (poursuite, capot, habitacle, pare-chocs, cinéma) |
| Souris maintenue | Regarder autour |
| `M` | Mode de conduite Strada / Sport / Corsa |
| `L` | Launch control (armer, puis frein + gaz) |
| `F` phares · `T` heure · `R` replacer · `P` photo · `H` aide · `Échap` pause |

Manette compatible : gâchettes analogiques (accélérateur/frein progressifs),
stick gauche pour la direction, palettes pour les rapports.

## Le modèle physique

Corps rigide à 6 degrés de liberté intégré à 200 Hz, quatre roues suspendues
indépendantes, contacts calculés analytiquement sur le terrain.

- **Pneus** : formule magique de Pacejka en *glissement combiné*. Les
  glissements longitudinal et de dérive sont normalisés par leur valeur au pic,
  puis combinés — ce qui produit naturellement l'ellipse d'adhérence (on ne peut
  pas freiner et virer à fond en même temps). Sensibilité à la charge, longueur
  de relaxation, et pic longitudinal supérieur au pic latéral (+12 % / −5 %).
- **Suspensions** : ressorts et amortisseurs dissymétriques (compression /
  détente), barres antiroulis, butées hydrauliques de fin de course.
- **Moteur** : courbe de couple tabulée du V12 6.5 L (720 Nm à 6 750 tr/min,
  770 ch à 8 500), frein moteur par pertes de pompage, régulation de ralenti,
  rupteur à coupure d'allumage.
- **Transmission** : embrayage à capacité variable — au démarrage un
  asservissement reproduit le pilotage d'une boîte à double embrayage, le
  moteur se stabilisant à son régime de décollage pendant que l'embrayage
  patine. Sept rapports, transfert intégral à répartition variable,
  différentiels autobloquants. L'inertie du moteur ramenée aux roues
  (`Ie × rapport²`, ≈ 49 kg·m² en première) est prise en compte : c'est elle
  qui émousse la première.
- **Aérodynamique** : appuis avant et arrière appliqués à leurs centres de
  poussée respectifs (donc transfert de charge réel), traînée, et système
  **ALA** — le volet d'aileron s'ouvre en ligne droite pleins gaz pour réduire
  la traînée, se referme au freinage et en courbe pour maximiser l'appui, avec
  vectorisation en virage.
- **Aides** : ABS et antipatinage asservis au *pic* d'adhérence (κ ≈ 0,12),
  désactivables ; réglages différents selon le mode de conduite.

### Chiffres mesurés dans le simulateur

| | Simulé | Annoncé (SVJ) |
|---|---|---|
| 0–100 km/h | 3,4 s | 2,8 s |
| 0–200 km/h | 8,6 s | 8,6 s |
| 400 m départ arrêté | 10,8 s à 228 km/h | ≈ 10,4 s |
| Vitesse maximale | 348 km/h | > 350 km/h |
| Appui aérodynamique | 413 kg à 345 km/h | ≈ 400 kg |
| Freinage 100–0 | 29,9 m | 30 m |
| Adhérence latérale | 1,4 g (basse vitesse) → 1,74 g (260 km/h) | ≈ 1,3–1,8 g |

Le 0–100 est plus prudent que la valeur constructeur, mesurée avec correction
de départ ; le reste est conforme.

## Le son du V12

Le moteur n'est pas un échantillon rejoué : il est calculé échantillon par
échantillon dans un `AudioWorklet` (repli sur `ScriptProcessor` si besoin).

La hauteur du son vient de la **fréquence d'allumage** — douze cylindres, quatre
temps, soit six explosions par tour de vilebrequin : `f = régime / 10`. Au
ralenti (900 tr/min) c'est un grondement à 90 Hz ; à 8 400 tr/min, un cri à
840 Hz. Le timbre, lui, vient de résonateurs **fixes** qui modélisent la ligne
d'échappement : une ligne titane sans silencieux résonne haut et longtemps, d'où
la brillance et le mordant caractéristiques.

Les deux bancs de six cylindres alimentent deux jeux de résonateurs légèrement
désaccordés, en allumage alterné : l'image stéréo et les battements sont ceux
d'un vrai V12. S'y ajoutent le rugissement d'admission qui suit le régime, une
saturation progressive avec la charge, et — signature de la ligne Gintani — les
**retours de flamme** à la décélération et sur coupure au rupteur, synchronisés
avec les flammes visibles aux sorties.

Autour : réverbération convolutive (marquée sous le tunnel), bruit de vent
fonction du carré de la vitesse, roulement dépendant du revêtement, crissement
de pneus piloté par le glissement réel, chocs.

## 120 images par seconde

La boucle de rendu n'impose aucun plafond par défaut : `requestAnimationFrame`
se cale sur la dalle, donc 120 Hz sur un écran 120 Hz. Un sélecteur
**60 / 120 / illimité** est disponible dans le menu pause, et le nombre
d'images par seconde s'affiche dans la télémétrie.

Ce qui a été fait pour tenir la cadence :

- **Simulation découplée du rendu** : la physique tourne à pas fixe de 200 Hz
  avec accumulateur. Le nombre d'images par seconde ne change donc rien au
  comportement de la voiture, et sauter une image ne fausse rien.
- **Zéro allocation par image** dans les chemins chauds. Les points de contact
  de carrosserie, les vecteurs de caméra et les sommets des traces de gomme
  sont préalloués : à 200 Hz et 120 images/s, en recréer à chaque passage
  faisait travailler le ramasse-miettes et provoquait des à-coups.
- **HUD à 60 Hz, carte à 20 Hz** : repeindre le combiné en Canvas 2D à 120 Hz
  n'apporte rien de visible et coûte du temps CPU.
- **Ombres régénérées à 60 Hz** : à 120 images/s, une carte d'ombre d'une image
  d'âge est invisible, et c'est l'une des passes GPU les plus lourdes.

Coût CPU mesuré par image (hors GPU) : physique 0,20 ms · modèle 0,01 ms ·
audio 0,02 ms · caméra 0,02 ms · HUD 0,15 ms — soit **~0,3 ms sur les 8,33 ms**
que laisse le 120 Hz. La limite est donc uniquement graphique : si la cadence
n'y est pas, baisser la résolution ou couper le post-traitement dans le menu
pause suffit à la retrouver.

## Le monde

4 × 4 km de relief fractal : plaine urbaine, collines, montagnes en périphérie.

- **Rocade** de 6 km avec tunnel, **ligne droite de 3 km** pour la vitesse de
  pointe, **damier urbain** avec trottoirs, **col de montagne** à épingles et
  glissières, bretelles de liaison.
- Tracés en splines, altitudes lissées et pente limitée à 16 % ; le terrain se
  raccorde aux chaussées par des accotements.
- Ville de ~120 immeubles à façades procédurales (fenêtres allumées la nuit),
  ~2 600 arbres, lampadaires, garde-corps — le tout fusionné en quelques
  maillages pour rester rapide.
- Cycle jour/nuit complet : ciel calculé (soleil, halo, étoiles), brouillard
  atmosphérique, carte d'environnement régénérée pour les reflets de la
  carrosserie, éclairage urbain qui s'allume au crépuscule.

Les requêtes de terrain sont **analytiques** (pas de lancer de rayon sur un
maillage) : altitude, normale et nature du revêtement sont calculées à la volée,
ce qui permet de tourner à 200 Hz sans coût.

## La voiture

Carrosserie construite par *loft* : vingt-sept sections transversales cotées sur
les dimensions réelles (4 943 × 2 098 × 1 136 mm, empattement 2 700 mm), reliées
par une spline d'Hermite à tension abaissée — une Aventador est faite de facettes
et d'arêtes vives, pas de galets. Les sections proches des essieux rentrent le
bas de caisse et remontent l'épaulement au-dessus du pneu : c'est ainsi que se
creusent les passages de roue.

Y sont greffés : bouclier avant à grande bouche noire, splitter à extrémités
relevées et double étage de dérives, optiques en Y couché, capot à deux grands
évents et nervure centrale, écopes latérales à lamelles, écope de toit, capot
moteur à grille hexagonale laissant voir le V12, aileron SVJ à grandes joues et
volet mobile (animé par l'ALA), diffuseur à ailettes, **sorties Gintani** — deux
tubes de gros diamètre en titane bleui, très écartés et montés haut, sans
silencieux — rétroviseurs, et un habitacle complet (volant hexagonal qui tourne,
sièges baquets en cuir rouge, combiné numérique) visible en caméra intérieure.

Réglages de livrée dans le garage : neuf teintes, finition mate ou vernie, pack
carbone, filet rouge de bas de caisse. Par défaut : **noir mat, filet rouge,
étriers rouges, sellerie rouge**.

Pneus aux cotes exactes — 255/30 R20 à l'avant, 355/25 R21 à l'arrière — jantes
forgées à rayons doubles, disques carbone-céramique percés et étriers.

Textures générées en `<canvas>` : sergé de carbone 2×2 avec carte de normales
dérivée, bitume grainé, marquages routiers, façades, flancs de pneus, dégradé de
titane chauffé.

## Rendu

Post-traitement écrit sur mesure (aucun module `examples/` de Three.js) :
extraction des hautes lumières, pyramide de flou séparable sur quatre niveaux,
composition avec vignettage, aberration chromatique, grain et flou radial de
vitesse, puis conversion sRGB.

Réglages disponibles en pause : résolution, ombres, post-traitement, champ de
vision, volume, aides à la conduite.

## Organisation

```
game/
├── index.html          interface, HUD, menus
├── css/style.css
├── js/
│   ├── util.js         maths, bruit de Perlin, générateurs de textures, loft
│   ├── audio.js        synthèse du V12 (AudioWorklet) et ambiances
│   ├── carmodel.js     modèle 3D procédural de la SVJ
│   ├── vehicle.js      dynamique du véhicule
│   ├── world.js        terrain, routes, ville, ciel
│   ├── postfx.js       chaîne de post-traitement
│   ├── hud.js          combiné et carte
│   └── game.js         boucle principale, caméras, commandes, effets
└── vendor/three.min.js  Three.js r160 (licence MIT incluse)
```
