# Suivi du projet Shemtov Foch

Document interne, jamais publié : il est hors du dossier `shemtov/`, seul dossier mis en ligne. Rien de ce qui est « à confirmer » n'apparaît sur le site public (vérifié par le test T14).
Dernière mise à jour : 24 octobre 2026 (refonte V4).

## 1. Informations vérifiées

| Information | Donnée | Source |
| --- | --- | --- |
| Dénomination, nom commercial | SHEMTOV | Attestation INPI du 23/10/2026 |
| Forme, capital, gérant | SARL, 3 000 €, Yves MAAREK | INPI ; gérant confirmé par toi le 24/10/2026 |
| Directeur de la publication | Yves MAAREK, gérant | Pour une SARL, c'est le gérant (loi n° 82-652 du 29 juillet 1982, art. 93-2) |
| Siège et magasin | 6 rue du Maréchal-Foch, 67000 Strasbourg | INPI |
| SIREN, SIRET, APE | 794 645 978 ; 794 645 978 00014 ; 47.11B | INPI |
| Début d'activité, RNE | 01/08/2013 ; 05/09/2013 (non publiés sur le site) | INPI |
| RCS, TVA | 794 645 978 RCS Strasbourg ; FR83794645978 | Pappers |
| Téléphone | 03 88 11 96 92 | Fédération des épiciers, Consistoire, Facebook |
| Horaires | lun.-jeu. 8h-20h, ven. 8h-17h, sam. fermé, dim. 9h30-13h | Fédération des épiciers et fiche Google, identiques ; confirmés par toi |
| Casher | « SHEMTOV, Épicerie, 6 rue du Maréchal Foch, 03 88 11 96 92 » figure dans la liste « Où manger cacher » du Consistoire Israélite du Bas-Rhin | cibr.fr, relu le 24/10/2026 |
| Page Facebook | facebook.com/Shemtov.Strasbourg | Trouvée en ligne, existence confirmée par toi |
| Commande à distance | Aucune | Confirmé par toi |
| Un seul magasin | Oui | Confirmé par toi |
| Rayons | Les 9 rayons du site | Confirmés par toi (« Rayon tout est bon ») ; détails à relire (section 3) |
| Domaine shemtov.fr | Titulaire SHEMTOV (même adresse), chez OVH depuis le 03/12/2013 | Registre AFNIC, 23/10/2026 |
| Domaine shemtovfoch.fr | Libre à ce jour | Registre AFNIC, 23/10/2026 |
| Fêtes jusqu'en octobre 2027 | Hanoukah, Tou biChvat, Pourim, Pessah, Chavouot, Roch Hachana 5788 | Calendrier Hebcal (diaspora) |
| Logo | Fichier haute définition reçu (`marque/logo-hd.png`) | Envoyé par toi le 24/10/2026 |

## 2. Alertes

1. **shemtov.fr expire le 3 décembre 2026**, veille de Hanoukah. À renouveler dans l'espace OVH.
2. Le registre signale le titulaire du domaine « non identifié » et son contact « non joignable ». Mettre à jour les informations dans OVH, sinon risque de suspension.
3. **Photos : indices de retouche par IA.** Dans deux versions d'une même scène, une rangée de cartons a disparu ; sur plusieurs emballages, de petits textes changent d'une version à l'autre ou sont inventés. Tu as indiqué que toutes les photos sont là : elles sont donc utilisées, avec la mention « Photos non contractuelles » dans le pied de page, les mentions légales et la page Le magasin. Le gérant doit confirmer qu'il accepte leur publication.
4. Le logo porte « Anvers & Foch », ce qui peut laisser penser à un second magasin rue d'Anvers alors qu'il n'y en a qu'un. Le site écrit seulement « Shemtov Foch ». À confirmer.

## 3. À confirmer avec le patron

### Bloquants avant la mise en ligne
- [ ] **Hébergeur** retenu (nom, adresse, téléphone) : mention légale obligatoire. Prévu dimanche.
- [ ] **Domaine** : réutiliser `shemtov.fr` (recommandé, à renouveler avant le 3 décembre) ou prendre `shemtovfoch.fr`.
- [ ] **Relecture et accord du gérant** sur l'ensemble du site : textes, photos (alerte 3), logo (alerte 4), FAQ.

### À confirmer (non bloquant)
- [ ] Cacherout : le site dit seulement « référencée par le Consistoire Israélite du Bas-Rhin ». Une mention plus précise (autorité, périmètre, certificat) demande le certificat.
- [ ] Détails des rayons à relire : « produits sans gluten et végan » (repris de la fiche Google), salades et spécialités traiteur, spiritueux, préparations pour la pâtisserie, assiettes et couverts.
- [ ] Horaires de chaque fête, à saisir dans `exceptions` dès qu'ils sont connus (Hanoukah commence le 4 décembre).
- [ ] Email : `contact@shemtov.fr` fonctionne-t-il, et qui le lit ? Non affiché tant que ce n'est pas vérifié.
- [ ] Accès à la fiche Google (invitation administrateur) et gestion de la page Facebook, pour y ajouter l'adresse du site.
- [ ] Loi Évin : faire valider la présentation des vins et spiritueux (message sanitaire en place).
- [ ] Photo de la façade (absente) : utile pour reconnaître le magasin depuis la rue.

### Réglé
- [x] Directeur de la publication : Yves MAAREK, gérant.
- [x] Logo haute définition reçu, fond rendu transparent.
- [x] Plan 2D : retiré du site à ta demande (V4) ; il reste un document de travail interne.
- [x] Bandeau « Version de travail » retiré : le site n'est pas en ligne, rien ne l'expose.

## 4. Avant la mise en ligne
- [ ] Remplir `domaine` et `hebergeur` (et `email` si confirmé) dans `contenu/donnees.json`, puis lancer `synchroniser.py` : URL canoniques, `sitemap.xml` et bloc hébergeur s'ajoutent seuls.
- [ ] Relancer `tester.mjs` (tout doit être « Réussi » ou « Non exécuté ») et `mesurer.mjs` sur l'hébergement réel.
- [ ] Tester sur un iPhone (Safari) et un Android (Chrome) réels, et avec VoiceOver.
- [ ] Après la mise en ligne : Google Search Console (vérification DNS chez OVH, envoi du sitemap), adresse du site sur la fiche Google et la page Facebook.
