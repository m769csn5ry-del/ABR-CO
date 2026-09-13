/* Banques de formulations par ton.
 *
 * Le moteur local assemble des phrases à partir de FAITS FOURNIS uniquement.
 * Les modèles ci-dessous ne contiennent aucun élément factuel sur un logement :
 * uniquement de la langue (connecteurs, tournures, registres). Les valeurs
 * concrètes sont toujours injectées depuis la fiche du bien.
 */

export const TONE_PROFILES = {
  premium: {
    adj:['soigné','élégant','lumineux','paisible','généreux'],
    opener:[
      '{Un} {type} {adj} au cœur de {lieu}.',
      '{Type} {adj} à {lieu}, {pense} pour un séjour sans fausse note.',
      'À {lieu}, {ce} {type} {adj} joue la carte de la simplicité bien exécutée.',
    ],
    linker:['Côté confort,','Au quotidien,','Dans les faits,','Concrètement,'],
    closer:[
      'Une adresse à réserver tôt : les belles périodes partent vite.',
      'Le genre d’adresse où l’on revient.',
      'Tout est prêt pour un séjour réussi.',
    ],
    ctas:['Réservez vos dates dès maintenant.','Consultez les disponibilités et réservez.'],
    max:{ short:380, long:2400 },
  },
  chaleureux: {
    adj:['accueillant','cosy','confortable','agréable','baigné de lumière'],
    opener:[
      'Bienvenue dans {ce} {type} {adj} à {lieu}.',
      '{Ce} {type} {adj} vous attend à {lieu}.',
      'On se sent tout de suite bien dans {ce} {type} {adj} de {lieu}.',
    ],
    linker:['Côté pratique,','Au quotidien,','Pour votre confort,','Et surtout,'],
    closer:[
      'On a hâte de vous accueillir.',
      'Il ne manque plus que vous.',
      'Vous êtes ici comme à la maison.',
    ],
    ctas:['Réservez votre séjour, on s’occupe du reste.','Écrivez-nous pour bloquer vos dates.'],
    max:{ short:400, long:2400 },
  },
  professionnel: {
    adj:['fonctionnel','bien agencé','entretenu','pratique','clair'],
    opener:[
      '{Type} {adj} {situe} à {lieu}.',
      '{Ce} {type} {adj} se trouve à {lieu}.',
      'Logement de type {type}, {adj}, à {lieu}.',
    ],
    linker:['Côté équipement,','En pratique,','À noter :','Sur place,'],
    closer:[
      'Le logement est prêt à accueillir vos dates.',
      'Les informations d’arrivée sont transmises avant le séjour.',
      'Toutes les précisions utiles figurent ci-dessous.',
    ],
    ctas:['Vérifiez les disponibilités et réservez.','Envoyez une demande de réservation.'],
    max:{ short:340, long:2000 },
  },
  minimaliste: {
    adj:['épuré','sobre','net','clair','calme'],
    opener:['{Type} {adj}. {lieu}.','{Type} {adj} à {lieu}.','{lieu}. {Type} {adj}.'],
    linker:['Aussi :','Sur place :','À savoir :','Plus :'],
    closer:['Simple. Efficace.','Rien de superflu.','L’essentiel, bien fait.'],
    ctas:['Réservez.','Dates disponibles : réservez.'],
    max:{ short:240, long:1200 },
  },
  familial: {
    adj:['spacieux','pratique','rassurant','confortable','facile à vivre'],
    opener:[
      '{Un} {type} {adj} à {lieu}, {pense} pour les séjours en famille.',
      'À {lieu}, {ce} {type} {adj} simplifie la vie des familles.',
      '{Ce} {type} {adj} de {lieu} a tout pour un séjour en famille.',
    ],
    linker:['Pour les enfants,','Côté organisation,','Au quotidien,','Bon à savoir :'],
    closer:[
      'De quoi poser les valises sans y penser.',
      'Un séjour simple à organiser, du premier au dernier jour.',
      'Tout est prévu pour que chacun trouve sa place.',
    ],
    ctas:['Réservez vos dates en famille.','Bloquez vos vacances dès maintenant.'],
    max:{ short:420, long:2600 },
  },
  luxe: {
    adj:['exceptionnel','rare','raffiné','confidentiel','remarquable'],
    opener:[
      'Une adresse rare : {ce} {type} {adj} de {lieu} ne ressemble à aucun autre.',
      '{Type} {adj} à {lieu}, pour une clientèle exigeante.',
      'À {lieu}, {ce} {type} {adj} pose d’emblée le niveau.',
    ],
    linker:['Dans le détail,','Au chapitre des prestations,','Côté services,','Plus encore,'],
    closer:[
      'Une adresse rare, réservée à quelques séjours par saison.',
      'Le niveau de prestation se vérifie dès l’arrivée.',
      'Une parenthèse qui se mérite.',
    ],
    ctas:['Demandez vos dates en priorité.','Réservez cette adresse dès à présent.'],
    max:{ short:400, long:2600 },
  },
  touristique: {
    adj:['bien placé','idéal pour visiter','central','pratique','ensoleillé'],
    opener:[
      'Point de chute idéal à {lieu} : {ce} {type} {adj} vous met au bon endroit.',
      '{Ce} {type} {adj} de {lieu} est la base parfaite pour explorer les environs.',
      'À {lieu}, {ce} {type} {adj} vous laisse tout le temps de visiter.',
    ],
    linker:['Pour vos sorties,','Au retour de visite,','Sur place,','Côté découvertes,'],
    closer:[
      'Il ne reste plus qu’à choisir votre itinéraire.',
      'Posez les valises, la ville fait le reste.',
      'Le séjour commence dès la porte franchie.',
    ],
    ctas:['Réservez et préparez votre programme.','Bloquez vos dates de visite.'],
    max:{ short:400, long:2400 },
  },
  direct: {
    adj:['fonctionnel','propre','bien équipé','pratique','disponible'],
    opener:['{Type} à {lieu}. {Adj}.','{Type} {adj} à louer à {lieu}.','À louer à {lieu} : {un} {type} {adj}.'],
    linker:['Inclus :','À savoir :','Également :','Détail :'],
    closer:['Disponible aux dates affichées.','Réponse rapide aux demandes.','Dossier simple, réservation rapide.'],
    ctas:['Contactez-nous pour réserver.','Réservez vos dates.'],
    max:{ short:260, long:1400 },
  },
};

export const AUDIENCE_LINES = {
  couple:  'Le format convient particulièrement à un séjour à deux.',
  famille: 'L’agencement a été pensé pour des séjours en famille.',
  amis:    'Le logement se prête bien aux séjours entre amis.',
  pro:     'Le logement convient aux déplacements professionnels.',
  touristes:'La localisation facilite les visites et les déplacements.',
  luxe:    'Le niveau de prestation vise une clientèle exigeante.',
  budget:  'Le rapport qualité-prix est l’argument principal de cette annonce.',
  longue:  'Le logement est adapté aux séjours de plusieurs semaines.',
  autre:   '',
};

export const HIGHLIGHT_LINES = {
  vue:        'La vue est l’un des atouts majeurs du logement.',
  emplacement:'L’emplacement est l’atout numéro un de cette adresse.',
  piscine:    'La piscine structure la vie du logement.',
  deco:       'La décoration a fait l’objet d’un vrai travail.',
  terrasse:   'La terrasse prolonge naturellement les pièces de vie.',
  calme:      'Le calme est l’une des premières choses que l’on remarque.',
  attractions:'Les principaux points d’intérêt sont accessibles rapidement.',
  prix:       'Le rapport qualité-prix est volontairement mis en avant.',
  taille:     'Les volumes font partie des points forts du logement.',
  lumiere:    'La lumière naturelle traverse les pièces de vie.',
  equipement: 'Le niveau d’équipement couvre tous les usages du quotidien.',
  autre:      '',
};

/* Modèles de titres : {type} {atout} {lieu} {style} — sans aucun fait implicite. */
export const TITLE_PATTERNS = [
  '{Type} {atout} — {lieu}',
  '{Type} {style} {atout}, {lieu}',
  '{lieu} · {Type} {atout}',
  '{Type} {atout} pour {public}',
  '{Type} {style} à {lieu}',
  '{atoutCap} — {type} {style} à {lieu}',
  '{Type} {capacite} {atout} · {lieu}',
];

export const ROOM_TEMPLATES = {
  salon:   ['Pièce de vie {adj} avec {items}.','Le salon {adj} accueille {items}.','Espace de vie {adj} : {items}.'],
  cuisine: ['Cuisine {adj} équipée de {items}.','La cuisine {adj} comprend {items}.','Cuisine {adj} : {items}.'],
  chambre: ['{nom} : {items}.','{nom}, {adj}, avec {items}.'],
  sdb:     ['{nom} avec {items}.','{nom} : {items}.'],
  exterieur:['Espace extérieur {adj} : {items}.','Côté extérieur : {items}.'],
  travail: ['Espace de travail {adj} : {items}.','Un coin bureau {adj} avec {items}.'],
};

export const FAQ_BANK = [
  { id:'wifi',    q:'Le Wi-Fi est-il disponible ?' },
  { id:'parking', q:'Le stationnement est-il prévu ?' },
  { id:'animaux', q:'Les animaux sont-ils acceptés ?' },
  { id:'arrivee', q:'Comment se passe l’arrivée ?' },
  { id:'capacite',q:'Combien de voyageurs le logement peut-il accueillir ?' },
  { id:'menage',  q:'Le ménage est-il inclus ?' },
  { id:'linge',   q:'Le linge de lit et les serviettes sont-ils fournis ?' },
  { id:'duree',   q:'Y a-t-il une durée minimale de séjour ?' },
  { id:'enfants', q:'Le logement convient-il aux enfants en bas âge ?' },
  { id:'clim',    q:'Le logement est-il climatisé ?' },
];
