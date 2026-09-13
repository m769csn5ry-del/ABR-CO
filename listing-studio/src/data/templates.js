/* Templates d'annonce : des préréglages de positionnement et de rédaction.
   Un template ne contient AUCUNE donnée de logement — uniquement une manière
   de présenter celui que l'utilisateur a saisi. */

export const BUILTIN_TEMPLATES = [
  {
    id:'tpl_luxury', label:'Luxury', category:'Positionnement', builtin:true,
    description:'Adresse d’exception, vocabulaire rare, arguments de prestation.',
    preset:{ tone:'luxe', audiences:['luxe','couple'], style:'luxe',
             highlights:['vue','deco','piscine'], platforms:['airbnb','booking','vrbo'] },
  },
  {
    id:'tpl_premium', label:'Premium', category:'Positionnement', builtin:true,
    description:'Haut de gamme sobre : la qualité s’énonce sans superlatif.',
    preset:{ tone:'premium', audiences:['couple','pro'], style:'premium',
             highlights:['deco','emplacement','calme'], platforms:['airbnb','booking'] },
  },
  {
    id:'tpl_family', label:'Family', category:'Public', builtin:true,
    description:'Séjour en famille : espace, sécurité, organisation du quotidien.',
    preset:{ tone:'familial', audiences:['famille'], style:'familial',
             highlights:['taille','calme','equipement'], platforms:['vrbo','abritel','airbnb'] },
  },
  {
    id:'tpl_business', label:'Business', category:'Public', builtin:true,
    description:'Déplacement professionnel : efficacité, connexion, autonomie.',
    preset:{ tone:'professionnel', audiences:['pro','longue'], style:'contemporain',
             highlights:['emplacement','equipement','calme'], platforms:['booking','airbnb','expedia'] },
  },
  {
    id:'tpl_couple', label:'Couple', category:'Public', builtin:true,
    description:'Escapade à deux : intimité, atmosphère, détails soignés.',
    preset:{ tone:'chaleureux', audiences:['couple'], style:'contemporain',
             highlights:['deco','vue','calme'], platforms:['airbnb'] },
  },
  {
    id:'tpl_budget', label:'Budget', category:'Public', builtin:true,
    description:'Rapport qualité-prix assumé, informations directes.',
    preset:{ tone:'direct', audiences:['budget','touristes'], style:'moderne',
             highlights:['prix','emplacement'], platforms:['leboncoin','facebook','airbnb'] },
  },
  {
    id:'tpl_villa', label:'Villa', category:'Type de bien', builtin:true,
    description:'Grand volume avec extérieur : piscine, terrasse, vie dehors.',
    preset:{ tone:'premium', audiences:['famille','amis'], style:'contemporain',
             highlights:['piscine','terrasse','taille'], platforms:['vrbo','abritel','booking'] },
  },
  {
    id:'tpl_appartement', label:'Appartement', category:'Type de bien', builtin:true,
    description:'Ville, quartier, praticité et transports.',
    preset:{ tone:'chaleureux', audiences:['couple','touristes'], style:'moderne',
             highlights:['emplacement','attractions','lumiere'], platforms:['airbnb','booking'] },
  },
  {
    id:'tpl_maison', label:'Maison', category:'Type de bien', builtin:true,
    description:'Maison de séjour : jardin, pièces de vie, confort familial.',
    preset:{ tone:'familial', audiences:['famille'], style:'traditionnel',
             highlights:['taille','calme','deco'], platforms:['abritel','vrbo','leboncoin'] },
  },
  {
    id:'tpl_studio', label:'Studio', category:'Type de bien', builtin:true,
    description:'Petite surface optimisée : ce qui compte, dit vite.',
    preset:{ tone:'minimaliste', audiences:['pro','budget'], style:'minimaliste',
             highlights:['emplacement','prix'], platforms:['airbnb','leboncoin','pap'] },
  },
];

export const TEMPLATE_CATEGORIES = ['Positionnement', 'Public', 'Type de bien', 'Mes templates'];

export const findTemplate = (id, userTemplates = []) =>
  BUILTIN_TEMPLATES.find(t => t.id === id) || userTemplates.find(t => t.id === id) || null;
