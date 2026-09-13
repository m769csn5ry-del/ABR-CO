import { defineAdapter } from './base.js';

/* Équivalent francophone de Vrbo : mêmes usages, vocabulaire français. */
export default defineAdapter({
  id:'abritel', label:'Abritel', group:'Location courte durée',
  limits:{ title:80, short:400, long:10000 },
  tonePreference:'familial',
  rules:[
    'Titre en français, jusqu’à 80 caractères.',
    'Description détaillée avec les couchages par chambre.',
    'Préciser clairement les conditions d’arrivée et de départ.',
  ],
  build(c, h){
    return [
      { id:'headline', label:'Titre', text:h.fit(c.title, 80).text, limit:80 },
      { id:'summary', label:'Résumé', text:h.fit(c.shortDescription, 400).text, limit:400 },
      { id:'desc', label:'Description détaillée', text:h.paragraphs([c.hook, c.longDescription]) },
      { id:'rooms', label:'Les pièces', text:h.bullets((c.rooms||[]).map(r => `${r.name} : ${r.text}`)) },
      { id:'amenities', label:'Équipements', text:h.bullets(c.amenities) },
      { id:'area', label:'Environnement', text:[c.location, h.bullets((c.attractions||[]).map(a => `${a.name} — ${a.note}`))].filter(Boolean).join('\n') },
      { id:'practical', label:'Informations pratiques', text:h.bullets((c.practical||[]).map(p => `${p.k} : ${p.v}`)) },
      { id:'rules', label:'Règlement intérieur', text:h.bullets(c.rules) },
    ];
  },
});
