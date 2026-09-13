import { defineAdapter } from './base.js';

/* Orientation séjour famille / groupe : titre descriptif long autorisé,
   description développée, mise en avant des couchages et de l'extérieur. */
export default defineAdapter({
  id:'vrbo', label:'Vrbo', group:'Location courte durée',
  limits:{ title:80, short:400, long:10000 },
  tonePreference:'familial',
  rules:[
    'Titre descriptif jusqu’à 80 caractères : type de bien, atout, localisation.',
    'Description longue tolérée : détailler pièce par pièce.',
    'Couchages et espaces extérieurs explicitement listés.',
  ],
  build(c, h){
    return [
      { id:'headline', label:'Titre', text:h.fit(c.title, 80).text, limit:80 },
      { id:'summary', label:'Aperçu', text:h.fit(c.shortDescription, 400).text, limit:400 },
      { id:'desc', label:'Description', text:h.paragraphs([c.hook, c.longDescription]) },
      { id:'rooms', label:'Pièce par pièce', text:h.bullets((c.rooms||[]).map(r => `${r.name} : ${r.text}`)) },
      { id:'amenities', label:'Équipements', text:h.bullets(c.amenities) },
      { id:'area', label:'Le secteur', text:[c.location, h.bullets(c.activities)].filter(Boolean).join('\n') },
      { id:'rules', label:'Règles et conditions', text:[h.bullets(c.rules), c.checkin, c.checkout].filter(Boolean).join('\n') },
    ];
  },
});
