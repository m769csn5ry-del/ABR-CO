# Suivi du projet Shemtov Foch

Document interne. Il ne doit jamais être publié : il est volontairement hors du dossier `shemtov/`, qui est le seul à être mis en ligne.
Dernière mise à jour : 23 octobre 2026.

## 1. Informations vérifiées

| Information | Donnée | Source |
| --- | --- | --- |
| Dénomination sociale, nom commercial | SHEMTOV | Attestation INPI du 23/10/2026 |
| Forme juridique, capital | SARL, 3 000 € | INPI |
| Gérant | Yves MAAREK | INPI |
| Siège et magasin | 6 rue du Maréchal-Foch, 67000 Strasbourg | INPI |
| SIREN / SIRET | 794 645 978 / 794 645 978 00014 | INPI |
| Activité, APE | Épicerie, 47.11B | INPI |
| Début d'activité, immatriculation RNE | 01/08/2013, 05/09/2013 | INPI |
| RCS, TVA intracommunautaire | 794 645 978 RCS Strasbourg, FR83794645978 | Pappers |
| Téléphone | 03 88 11 96 92 | Fédération des épiciers, Consistoire, page Facebook |
| Horaires publiés | lun-jeu 8h-20h, ven 8h-17h, sam fermé, dim 9h30-13h | Annuaire Fédération des épiciers, identiques à la fiche Google consultée le 23/10/2026 |
| Référencement casher | « Épicerie casher référencée par le Consistoire Israélite du Bas-Rhin » | Liste des commerces casher du Consistoire (cibr.fr) |
| Page Facebook | facebook.com/Shemtov.Strasbourg | Trouvée par recherche, gestionnaire inconnu |
| Dates des fêtes (jusqu'en octobre 2027) | Hanoukah 4-12 déc. 2026, Tou biChvat 23 janv., Pourim 23 mars, Pessah 22-29 avr., Chavouot 11-12 juin, Roch Hachana 2-3 oct. 2027 | Calendrier Hebcal (diaspora) |
| Nom de domaine shemtov.fr | Enregistré le 03/12/2013 chez OVH, titulaire SHEMTOV (même adresse), actif | Registre AFNIC (RDAP), 23/10/2026 |
| Domaine shemtovfoch.fr | Non enregistré à ce jour | Registre AFNIC (RDAP), 23/10/2026 |

## 2. Alertes

1. **shemtov.fr expire le 3 décembre 2026**, veille de Hanoukah. À renouveler dans l'espace OVH du patron avant cette date.
2. Le registre indique pour le titulaire du domaine : identification « non identifiée » et contact « non joignable ». Il faut vérifier dans OVH que l'email et les informations du titulaire sont à jour. Dans le cas contraire, le domaine peut être suspendu.
3. Le fichier de logo décrit comme « version commune Anvers & Foch » laisse penser qu'un autre point de vente existe rue d'Anvers, alors qu'il a été indiqué qu'il n'y a qu'un seul magasin. À clarifier avant d'utiliser le logo tel quel.

## 3. À confirmer avec le patron (rien de cela n'apparaît sur le site public)

### Bloquants avant la mise en ligne
- [ ] Nom de domaine : réutiliser `shemtov.fr` (recommandé : déjà au nom de la société, déjà cité sur Facebook) ou prendre `shemtovfoch.fr` (libre, environ 8 à 10 € par an). Dans les deux cas, titulaire = SHEMTOV.
- [ ] Email professionnel : `contact@shemtov.fr` apparaît dans un annuaire, mais son fonctionnement est inconnu. Envoyer un message test et vérifier qui y a accès dans OVH. Tant que ce n'est pas fait, il n'est affiché nulle part.
- [ ] Responsable de la publication (nom et qualité).
- [ ] Hébergeur retenu (nom, adresse, coordonnées) pour les mentions légales.
- [ ] Logo en haute définition (SVG, PDF vectoriel ou grand PNG) et version à utiliser pour Foch. Le logo du Consistoire fait 150 × 150 px, celui reçu 217 × 233 px.
- [ ] Horaires habituels validés, en particulier le vendredi, et horaires des fêtes.
- [ ] Cacherout : autorité compétente, périmètre et formulation exacte. KiaduKasher cite le « Beth Din de Strasbourg », non repris sur le site tant que le certificat actuel n'est pas vu.
- [ ] Invitation à gérer la fiche Google (Paramètres de la fiche → Utilisateurs et accès → Ajouter → adresse Gmail → Administrateur).
- [ ] Qui gère la page Facebook.

### Importants
- [ ] Fruits et légumes : l'annuaire de la Fédération les cite, mais la description du plan du magasin n'en montre pas. Ils ne figurent pas sur le site.
- [ ] Rayon « sans gluten et végan » : issu de la description de la fiche Google, absent de la description du plan. À confirmer.
- [ ] Spécialités et marques : non communiquées, donc aucun bloc « spécialités » sur le site pour l'instant.
- [ ] Texte de présentation : la ligne 3 du texte reçu citait les fruits et légumes, elle a été reformulée en « produits d'épicerie, produits frais et surgelés ». À faire relire.
- [ ] Accroche « depuis 2013 » : le début d'activité légal est le 1er août 2013, mais rien ne prouve que le magasin était déjà à cette adresse. Non utilisée.
- [ ] URL réelle du lien Google Maps : seul le texte du lien a été transmis. Le bouton « Itinéraire » utilise une adresse de destination, et le lien « Fiche Google » un lien provisoire à remplacer.
- [ ] Photos : façade et un rayon par tuile (voir README).

## 4. Avant la mise en ligne
- [ ] Retirer la ligne `<div class="demo">` de `index.html`.
- [ ] Ajouter dans `mentions-legales.html` les sections confirmées (gabarits ci-dessous).
- [ ] Brancher le domaine sur l'hébergement (réglages DNS dans OVH, saisis par le patron).
- [ ] Mettre à jour le JSON-LD de `index.html` si les horaires changent, et y ajouter `"url"`.
- [ ] Vérifier le site sur téléphone, en clair et en sombre.

## 5. Gabarits pour les mentions légales
À coller dans `mentions-legales.html`, avant « Données personnelles et cookies », une fois l'information confirmée.

```html
<h2>Contact par email</h2>
<p><a href="mailto:ADRESSE">ADRESSE</a></p>

<h2>Responsable de la publication</h2>
<p>NOM, qualité.</p>

<h2>Hébergeur</h2>
<p>NOM, adresse, site web.</p>
```

## 6. Périmètre du site
Le site présente le magasin, ses rayons, ses horaires et ses coordonnées. Il n'y a ni commande, ni panier, ni paiement en ligne, ni formulaire, ni cookie de suivi.
Retiré par rapport à la première démo : les fausses actualités, le bandeau d'avis avec la note Google, le texte sur le sens du nom.
Conservé : les prochaines fêtes, qui servent les horaires exceptionnels. À retirer si le patron le préfère.
