/* Vocabulaire métier de Listing Studio : types de biens, équipements,
   publics, styles, points forts, tons, saisons, statuts, plans.
   Une seule source de vérité, réutilisée par les formulaires, l'IA,
   le score et les adaptateurs de plateformes. */

export const PROPERTY_TYPES = [
  { id:'appartement',  label:'Appartement',      noun:'appartement',      g:'m', vowel:true },
  { id:'maison',       label:'Maison',           noun:'maison',           g:'f' },
  { id:'villa',        label:'Villa',            noun:'villa',            g:'f' },
  { id:'studio',       label:'Studio',           noun:'studio',           g:'m' },
  { id:'loft',         label:'Loft',             noun:'loft',             g:'m' },
  { id:'chambre',      label:'Chambre privée',   noun:'chambre privée',   g:'f' },
  { id:'hotel',        label:"Chambre d'hôtel",  noun:"chambre d'hôtel",  g:'f' },
  { id:'gite',         label:'Gîte',             noun:'gîte',             g:'m' },
  { id:'chalet',       label:'Chalet',           noun:'chalet',           g:'m' },
  { id:'autre',        label:'Autre',            noun:'logement',         g:'m' },
];
export const propertyType = (id) => PROPERTY_TYPES.find(t => t.id === id) || PROPERTY_TYPES[9];

/* Équipements — `cat` sert au regroupement, `photo` à la détection des
   photos manquantes, `weight` au calcul du score et à la mise en avant. */
export const AMENITY_GROUPS = [
  { id:'essentiels', label:'Essentiels' },
  { id:'confort',    label:'Confort' },
  { id:'exterieur',  label:'Extérieur et vue' },
  { id:'cuisine',    label:'Cuisine et repas' },
  { id:'travail',    label:'Travail et loisirs' },
  { id:'services',   label:'Services et pratique' },
  { id:'famille',    label:'Famille et accessibilité' },
];

export const AMENITIES = [
  { id:'wifi',        label:'Wi-Fi',                 cat:'essentiels', weight:3, keepCase:true },
  { id:'chauffage',   label:'Chauffage',             cat:'essentiels', weight:2 },
  { id:'clim',        label:'Climatisation',         cat:'essentiels', weight:3 },
  { id:'eau_chaude',  label:'Eau chaude',            cat:'essentiels', weight:1 },
  { id:'draps',       label:'Draps et linge fournis',cat:'essentiels', weight:2 },
  { id:'serviettes',  label:'Serviettes fournies',   cat:'essentiels', weight:1 },
  { id:'produits',    label:'Produits de toilette',  cat:'essentiels', weight:1 },
  { id:'seche_cheveux', label:'Sèche-cheveux',       cat:'essentiels', weight:1 },

  { id:'tv',          label:'TV',                    cat:'confort',   weight:1, keepCase:true },
  { id:'netflix',     label:'Netflix',               cat:'confort',   weight:1, keepCase:true },
  { id:'enceinte',    label:'Enceinte Bluetooth',    cat:'confort',   weight:1, keepCase:true },
  { id:'cheminee',    label:'Cheminée',              cat:'confort',   weight:2, photo:'salon' },
  { id:'lave_linge',  label:'Lave-linge',            cat:'confort',   weight:2 },
  { id:'seche_linge', label:'Sèche-linge',           cat:'confort',   weight:1 },
  { id:'fer',         label:'Fer à repasser',        cat:'confort',   weight:1 },
  { id:'menage',      label:'Ménage professionnel',  cat:'confort',   weight:2 },

  { id:'piscine',     label:'Piscine',               cat:'exterieur', weight:5, photo:'piscine' },
  { id:'jacuzzi',     label:'Jacuzzi',               cat:'exterieur', weight:4, photo:'jacuzzi' },
  { id:'sauna',       label:'Sauna',                 cat:'exterieur', weight:3 },
  { id:'terrasse',    label:'Terrasse',              cat:'exterieur', weight:4, photo:'terrasse' },
  { id:'balcon',      label:'Balcon',                cat:'exterieur', weight:3, photo:'terrasse' },
  { id:'jardin',      label:'Jardin',                cat:'exterieur', weight:3, photo:'exterieur' },
  { id:'vue',         label:'Vue dégagée',           cat:'exterieur', weight:5, photo:'vue' },
  { id:'barbecue',    label:'Barbecue',              cat:'exterieur', weight:2, photo:'terrasse' },
  { id:'mobilier_ext',label:'Mobilier extérieur',    cat:'exterieur', weight:2, photo:'terrasse' },

  { id:'cuisine',     label:'Cuisine équipée',       cat:'cuisine',   weight:3, photo:'cuisine' },
  { id:'lave_vaisselle', label:'Lave-vaisselle',     cat:'cuisine',   weight:2 },
  { id:'four',        label:'Four',                  cat:'cuisine',   weight:1 },
  { id:'micro_ondes', label:'Micro-ondes',           cat:'cuisine',   weight:1 },
  { id:'cafe',        label:'Machine à café',        cat:'cuisine',   weight:2 },
  { id:'bouilloire',  label:'Bouilloire',            cat:'cuisine',   weight:1 },
  { id:'table_repas', label:'Table à manger',        cat:'cuisine',   weight:1 },

  { id:'bureau',      label:'Espace de travail',     cat:'travail',   weight:3, photo:'bureau' },
  { id:'wifi_fibre',  label:'Wi-Fi fibre haut débit',cat:'travail',   weight:3, keepCase:true },
  { id:'ecran',       label:'Écran externe',         cat:'travail',   weight:1 },
  { id:'salle_sport', label:'Salle de sport',        cat:'travail',   weight:2 },
  { id:'jeux',        label:'Jeux de société',       cat:'travail',   weight:1 },
  { id:'velos',       label:'Vélos',                 cat:'travail',   weight:2 },

  { id:'parking',     label:'Parking',               cat:'services',  weight:4, photo:'parking' },
  { id:'garage',      label:'Garage fermé',          cat:'services',  weight:3, photo:'parking' },
  { id:'borne',       label:'Borne de recharge',     cat:'services',  weight:2 },
  { id:'ascenseur',   label:'Ascenseur',             cat:'services',  weight:2 },
  { id:'arrivee_auto',label:'Arrivée autonome',      cat:'services',  weight:3, photo:'entree' },
  { id:'boite_cles',  label:'Boîte à clés',          cat:'services',  weight:1 },
  { id:'concierge',   label:'Conciergerie 7j/7',     cat:'services',  weight:2 },
  { id:'bagages',     label:'Dépôt de bagages',      cat:'services',  weight:1 },

  { id:'lit_bebe',    label:'Lit bébé',              cat:'famille',   weight:2 },
  { id:'chaise_haute',label:'Chaise haute',          cat:'famille',   weight:1 },
  { id:'jeux_enfants',label:'Jeux pour enfants',     cat:'famille',   weight:1 },
  { id:'animaux',     label:'Animaux acceptés',      cat:'famille',   weight:2 },
  { id:'accessible',  label:'Accès PMR',             cat:'famille',   weight:2, keepCase:true },
  { id:'plain_pied',  label:'Logement de plain-pied',cat:'famille',   weight:1 },
  { id:'fumeur',      label:'Espace fumeur extérieur',cat:'famille',  weight:1 },
];

export const amenity = (id) => AMENITIES.find(a => a.id === id) || null;
export function amenityLabel(id, custom = []){
  const a = amenity(id);
  if (a) return a.label;
  const c = custom.find(x => (x.id || x) === id);
  return c ? (c.label || c) : id;
}

export const AUDIENCES = [
  { id:'couple',     label:'Couple',                   forTitle:'les couples',            kw:['escapade à deux','séjour romantique'] },
  { id:'famille',    label:'Famille',                  forTitle:'les familles',           kw:['vacances en famille','séjour avec enfants'] },
  { id:'amis',       label:"Groupe d'amis",            forTitle:'un groupe d’amis',       kw:['séjour entre amis','week-end de groupe'] },
  { id:'pro',        label:'Voyageurs professionnels', forTitle:'les voyageurs d’affaires',kw:['déplacement professionnel','séjour de travail'] },
  { id:'touristes',  label:'Touristes',                forTitle:'visiter la région',      kw:['séjour découverte','visite de la ville'] },
  { id:'luxe',       label:'Clientèle luxe',           forTitle:'une clientèle exigeante',kw:['séjour d’exception','adresse haut de gamme'] },
  { id:'budget',     label:'Voyageurs petit budget',   forTitle:'les petits budgets',     kw:['bon rapport qualité-prix','séjour malin'] },
  { id:'longue',     label:'Séjour longue durée',      forTitle:'les longs séjours',      kw:['séjour longue durée','installation de plusieurs semaines'] },
  { id:'autre',      label:'Autre',                    forTitle:'',                       kw:['séjour'] },
];
export const audience = (id) => AUDIENCES.find(a => a.id === id) || null;

export const STYLES = [
  { id:'moderne',      label:'Moderne',      adj:['moderne','épuré','lumineux'] },
  { id:'minimaliste',  label:'Minimaliste',  adj:['minimaliste','sobre','ordonné'] },
  { id:'luxe',         label:'Luxe',         adj:['luxueux','raffiné','exclusif'] },
  { id:'boheme',       label:'Bohème',       adj:['bohème','chaleureux','singulier'] },
  { id:'industriel',   label:'Industriel',   adj:['industriel','graphique','spacieux'] },
  { id:'familial',     label:'Familial',     adj:['familial','pratique','accueillant'] },
  { id:'premium',      label:'Premium',      adj:['premium','soigné','haut de gamme'] },
  { id:'traditionnel', label:'Traditionnel', adj:['traditionnel','authentique','chaleureux'] },
  { id:'contemporain', label:'Contemporain', adj:['contemporain','design','élégant'] },
  { id:'autre',        label:'Autre',        adj:['soigné'] },
];
export const styleOf = (id) => STYLES.find(s => s.id === id) || STYLES[9];

export const HIGHLIGHTS = [
  { id:'vue',         label:'Vue',                        claim:'la vue' },
  { id:'emplacement', label:'Emplacement',                claim:"l'emplacement" },
  { id:'piscine',     label:'Piscine',                    claim:'la piscine' },
  { id:'deco',        label:'Décoration',                 claim:'la décoration' },
  { id:'terrasse',    label:'Terrasse',                   claim:'la terrasse' },
  { id:'calme',       label:'Calme',                      claim:'le calme' },
  { id:'attractions', label:'Proximité des attractions',  claim:'la proximité des sites à visiter' },
  { id:'prix',        label:'Prix',                       claim:'le rapport qualité-prix' },
  { id:'taille',      label:'Taille',                     claim:'les volumes' },
  { id:'lumiere',     label:'Luminosité',                 claim:'la lumière' },
  { id:'equipement',  label:'Niveau d’équipement',        claim:"le niveau d'équipement" },
  { id:'autre',       label:'Autre',                      claim:'ce logement' },
];
export const highlight = (id) => HIGHLIGHTS.find(h => h.id === id) || null;

export const TONES = [
  { id:'premium',      label:'Premium',      desc:'Soigné, valorisant, sans excès' },
  { id:'chaleureux',   label:'Chaleureux',   desc:'Proche, humain, accueillant' },
  { id:'professionnel',label:'Professionnel',desc:'Factuel, clair, efficace' },
  { id:'minimaliste',  label:'Minimaliste',  desc:'Phrases courtes, aucun superflu' },
  { id:'familial',     label:'Familial',     desc:'Rassurant, pratique, concret' },
  { id:'luxe',         label:'Luxe',         desc:'Rare, exclusif, très haut de gamme' },
  { id:'touristique',  label:'Touristique',  desc:'Orienté découverte et activités' },
  { id:'direct',       label:'Direct',       desc:'Va à l’essentiel, sans détour' },
];
export const tone = (id) => TONES.find(t => t.id === id) || TONES[0];

export const SEASONS = [
  { id:'basse',   label:'Basse saison',   mult:0.86 },
  { id:'moyenne', label:'Moyenne saison', mult:1.00 },
  { id:'haute',   label:'Haute saison',   mult:1.22 },
  { id:'evenement', label:'Événement / pic', mult:1.45 },
];
export const season = (id) => SEASONS.find(s => s.id === id) || SEASONS[1];

export const CLIENT_STATUSES = [
  { id:'prospect',   label:'Prospect',      badge:'outline' },
  { id:'discussion', label:'En discussion', badge:'info' },
  { id:'client',     label:'Client',        badge:'ok' },
  { id:'termine',    label:'Terminé',       badge:'' },
];
export const clientStatus = (id) => CLIENT_STATUSES.find(s => s.id === id) || CLIENT_STATUSES[0];

export const PROJECT_STATUSES = [
  { id:'brouillon', label:'Brouillon',  badge:'outline' },
  { id:'en_cours',  label:'En cours',   badge:'info' },
  { id:'pret',      label:'Prêt',       badge:'brand' },
  { id:'publie',    label:'Publié',     badge:'ok' },
  { id:'archive',   label:'Archivé',    badge:'' },
];
export const projectStatus = (id) => PROJECT_STATUSES.find(s => s.id === id) || PROJECT_STATUSES[0];

export const PLANS = [
  {
    id:'free', label:'Free', price:0, projects:3,
    features:['3 projets actifs','Génération de l’annonce','Analyse photo de base','Aperçu et export texte'],
    locked:['Rapports PDF','Templates premium','Exports avancés','Gestion multi-clients'],
  },
  {
    id:'pro', label:'Pro', price:39, projects:Infinity,
    features:['Projets illimités','Analyse photo complète','IA avancée et variantes','Rapports PDF','Templates premium','Exports JSON et CSV'],
    locked:['Gestion d’équipe','Branding personnalisé'],
  },
  {
    id:'agency', label:'Agency', price:99, projects:Infinity,
    features:['Tout le plan Pro','Gestion multi-clients','Gestion d’équipe','Branding personnalisé','Rapports personnalisés','Exports avancés par plateforme'],
    locked:[],
  },
];
export const plan = (id) => PLANS.find(p => p.id === id) || PLANS[0];

/* Catégories de photos attendues dans une annonce complète. */
export const PHOTO_CATEGORIES = [
  { id:'salon',      label:'Salon',            priority:2,  essential:true },
  { id:'cuisine',    label:'Cuisine',          priority:5,  essential:true },
  { id:'chambre',    label:'Chambre',          priority:4,  essential:true },
  { id:'sdb',        label:'Salle de bain',    priority:7,  essential:true },
  { id:'exterieur',  label:'Extérieur',        priority:10, essential:false },
  { id:'vue',        label:'Vue',              priority:3,  essential:false },
  { id:'terrasse',   label:'Terrasse',         priority:6,  essential:false },
  { id:'piscine',    label:'Piscine',          priority:3,  essential:false },
  { id:'jacuzzi',    label:'Jacuzzi',          priority:8,  essential:false },
  { id:'salle_manger', label:'Salle à manger', priority:6,  essential:false },
  { id:'entree',     label:'Entrée',           priority:11, essential:false },
  { id:'bureau',     label:'Espace de travail',priority:9,  essential:false },
  { id:'parking',    label:'Parking',          priority:12, essential:false },
  { id:'equipements',label:'Équipements',      priority:9,  essential:false },
  { id:'quartier',   label:'Quartier',         priority:13, essential:false },
  { id:'detail',     label:'Détail / décoration', priority:11, essential:false },
];
export const photoCategory = (id) => PHOTO_CATEGORIES.find(c => c.id === id) || PHOTO_CATEGORIES[15];

export const RULE_PRESETS = [
  { id:'non_fumeur',  label:'Non-fumeur' },
  { id:'fetes',       label:'Fêtes et événements interdits' },
  { id:'animaux_non', label:'Animaux non admis' },
  { id:'animaux_oui', label:'Animaux admis sur demande' },
  { id:'calme',       label:'Calme demandé après 22 h' },
  { id:'enfants',     label:'Adapté aux enfants' },
  { id:'caution',     label:'Caution demandée à l’arrivée' },
  { id:'id',          label:'Pièce d’identité demandée' },
];
