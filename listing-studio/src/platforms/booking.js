import { defineAdapter } from './base.js';

/* Fiche plus institutionnelle : description factuelle, environnement séparé,
   aucune coordonnée ni promesse commerciale dans le texte libre. */
export default defineAdapter({
  id:'booking', label:'Booking.com', group:'Location courte durée',
  limits:{ title:70, short:300, long:4000 },
  tonePreference:'professionnel',
  rules:[
    'Nom d’établissement neutre, sans superlatif marketing.',
    'Description factuelle : équipements, surfaces, couchages.',
    'Aucune coordonnée, aucun lien, aucune mention tarifaire dans le texte.',
    'Les alentours font l’objet d’un bloc distinct.',
  ],
  extraChecks:[
    (c) => (/\b\d+\s?(€|eur)/i.test(c.longDescription || '')
      ? { level:'warn', msg:'Un montant apparaît dans la description : à retirer pour cette plateforme.' } : null),
  ],
  build(c, h){
    const noPrice = (t) => String(t || '').replace(/\b\d+\s?(€|EUR)\b/gi, '').replace(/ {2,}/g, ' ');
    return [
      { id:'name', label:'Nom de l’hébergement', text:h.fit(c.propertyName || c.title, 70).text, limit:70 },
      { id:'desc', label:'Description', text:noPrice(h.stripContacts(
          h.paragraphs([c.shortDescription, c.longDescription]))) },
      { id:'rooms', label:'Espaces et couchages', text:h.bullets((c.rooms||[]).map(r => `${r.name} : ${r.text}`)) },
      { id:'amenities', label:'Équipements', text:h.bullets(c.amenities) },
      { id:'surroundings', label:'Aux alentours', text:h.bullets((c.attractions||[]).map(a => `${a.name} — ${a.note}`)) },
      { id:'policies', label:'Conditions', text:[c.checkin, c.checkout, h.bullets(c.rules)].filter(Boolean).join('\n') },
    ];
  },
});
