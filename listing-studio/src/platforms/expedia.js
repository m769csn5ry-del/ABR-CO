import { defineAdapter } from './base.js';

/* Distribution type agence de voyage : blocs courts, informations
   normalisées, pas de ton promotionnel appuyé. */
export default defineAdapter({
  id:'expedia', label:'Expedia', group:'Distribution',
  limits:{ title:60, short:250, long:2500 },
  tonePreference:'professionnel',
  rules:[
    'Titre court et normalisé : type de bien + atout principal.',
    'Description synthétique, informations vérifiables uniquement.',
    'Équipements présentés en liste normalisée.',
  ],
  build(c, h){
    return [
      { id:'title', label:'Intitulé', text:h.fit(c.title, 60).text, limit:60 },
      { id:'summary', label:'Résumé', text:h.fit(h.stripContacts(c.shortDescription), 250).text, limit:250 },
      { id:'desc', label:'Description', text:h.fit(h.stripContacts(c.longDescription), 2500).text, limit:2500 },
      { id:'amenities', label:'Équipements', text:h.bullets(c.amenities) },
      { id:'policies', label:'Politiques', text:[c.checkin, c.checkout, h.bullets(c.rules)].filter(Boolean).join('\n') },
    ];
  },
});
