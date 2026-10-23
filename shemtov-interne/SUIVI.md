# Suivi du projet Shemtov Foch

Document interne, jamais publié : il est hors du dossier `shemtov/`, seul dossier mis en ligne. Rien de ce qui est « à confirmer » n'apparaît sur le site public (vérifié par le test T23).
Dernière mise à jour : 23 octobre 2026.

## 1. Informations vérifiées

| Information | Donnée | Source |
| --- | --- | --- |
| Dénomination, nom commercial | SHEMTOV | Attestation INPI du 23/10/2026 |
| Forme, capital, gérant | SARL, 3 000 €, Yves MAAREK | INPI |
| Siège et magasin | 6 rue du Maréchal-Foch, 67000 Strasbourg | INPI |
| SIREN, SIRET, APE | 794 645 978 ; 794 645 978 00014 ; 47.11B | INPI |
| Début d'activité, RNE | 01/08/2013 ; 05/09/2013 | INPI |
| RCS, TVA | 794 645 978 RCS Strasbourg ; FR83794645978 | Pappers |
| Téléphone | 03 88 11 96 92 | Fédération des épiciers, Consistoire, Facebook |
| Horaires publiés | lun.-jeu. 8h-20h, ven. 8h-17h, sam. fermé, dim. 9h30-13h | Fédération des épiciers et fiche Google, identiques |
| Casher | « Épicerie casher référencée par le Consistoire Israélite du Bas-Rhin » | Liste du Consistoire (cibr.fr) |
| Page Facebook | facebook.com/Shemtov.Strasbourg | Trouvée en ligne |
| Domaine shemtov.fr | Titulaire SHEMTOV (même adresse), chez OVH depuis le 03/12/2013, actif | Registre AFNIC, 23/10/2026 |
| Domaine shemtovfoch.fr | Libre à ce jour | Registre AFNIC, 23/10/2026 |
| Fêtes jusqu'en octobre 2027 | Hanoukah, Tou biChvat, Pourim, Pessah, Chavouot, Roch Hachana | Calendrier Hebcal (diaspora) |
| Organisation du magasin | Murs, zones, meubles et leur ordre | Description fournie pour le plan 2D (non validée, voir 3) |

## 2. Alertes

1. **shemtov.fr expire le 3 décembre 2026**, veille de Hanoukah. À renouveler dans l'espace OVH.
2. Le registre signale le titulaire du domaine « non identifié » et son contact « non joignable ». Mettre à jour les informations dans OVH, sinon risque de suspension.
3. **Photos : indices de retouche par IA.** Deux photos de la crèmerie montrent la même scène, mais dans l'une la rangée de cartons du haut a disparu et l'image a été recomposée. Sur plusieurs emballages, les petits textes sont illisibles ou inventés (« Saislun », « Snnaders »), alors que les grandes marques sont lisibles. Une des quatre dernières photos est l'exacte copie d'une photo déjà reçue. Les photos sont utilisées comme photos de travail. Avant publication, confirmer qu'elles sont d'origine, ou fournir les originaux non retouchés. Montrer des emballages inventés peut tromper les clients.
4. Le logo « Anvers & Foch » laisse penser à un second magasin rue d'Anvers, alors qu'il a été indiqué qu'il n'y en a qu'un. À clarifier.
5. Le logo haute définition s'affiche dans la conversation, mais aucun fichier n'a été reçu. Le renvoyer en pièce jointe.

## 3. À confirmer avec le patron

### Bloquants avant la mise en ligne
- [ ] Directeur de la publication (nom et qualité).
- [ ] Hébergeur retenu (nom, adresse, téléphone).
- [ ] Domaine : réutiliser `shemtov.fr` (recommandé) ou prendre `shemtovfoch.fr`.
- [ ] Photos d'origine ou confirmation de celles reçues (alerte 3), et photo de la façade (absente).
- [ ] Fichier du logo haute définition et version à utiliser (alertes 4 et 5).
- [ ] Validation du plan 2D (`plan/plan-2d-v1.png`) : il sert à la visite guidée du site.
- [ ] Horaires habituels (surtout le vendredi) et horaires de chaque fête.

### Importants
- [ ] Cacherout : autorité, périmètre, formulation exacte et certificat. KiaduKasher cite le « Beth Din de Strasbourg », non repris.
- [ ] Email : `contact@shemtov.fr` fonctionne-t-il, et qui y a accès ?
- [ ] Accès à la fiche Google (invitation administrateur) et gestionnaire de la page Facebook.
- [ ] Rayons vus sur les photos et ajoutés au site, à confirmer : traiteur et salades, saumon fumé, spiritueux, sodas, produits pour la pâtisserie, vaisselle jetable.
- [ ] « Sans gluten et végan » : vient de la description de la fiche Google, absent des photos et du plan.
- [ ] Fruits et légumes frais : cités par l'annuaire des épiciers, absents du plan et des photos, donc absents du site.
- [ ] Correspondance photo et emplacement : les photos de la visite illustrent le type de rayon. Leur emplacement exact sur le plan n'a pas été vérifié.
- [ ] Texte de présentation : relire la version du site (ligne 3 reformulée).
- [ ] Loi Évin : faire valider la présentation des vins et spiritueux.

## 4. Avant la mise en ligne
- [ ] Remplir `domaine`, `responsablePublication`, `hebergeur` (et `email` si confirmé) dans `contenu/donnees.json`, puis synchroniser.
- [ ] Retirer la ligne « Version de travail · non publiée » de `index.html`.
- [ ] Relancer `node shemtov-interne/tests/tester.mjs` : tout doit être « Réussi ».
- [ ] Tester sur un iPhone (Safari) et un Android (Chrome) réels.
