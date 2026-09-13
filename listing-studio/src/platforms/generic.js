import { defineAdapter } from './base.js';

/* Format complet et neutre — sert de base pour toute plateforme non listée
   (« Autre ») et de version de référence pour le rapport client. */
export default defineAdapter({
  id:'generic', label:'Format universel', group:'Universel',
  limits:{ title:90, short:600, long:12000 },
  rules:[
    'Contient toutes les sections générées, sans contrainte de plateforme.',
    'Sert de source pour l’adaptation vers un format spécifique.',
  ],
  build(c, h){
    return [
      { id:'title', label:'Titre', text:c.title },
      { id:'variants', label:'Variantes de titre', text:h.bullets(c.titles) },
      { id:'hook', label:'Accroche', text:c.hook },
      { id:'short', label:'Description courte', text:c.shortDescription },
      { id:'long', label:'Description longue', text:c.longDescription },
      { id:'highlights', label:'Points forts', text:h.bullets(c.highlights) },
      { id:'rooms', label:'Description des pièces', text:h.bullets((c.rooms||[]).map(r => `${r.name} : ${r.text}`)) },
      { id:'amenities', label:'Équipements', text:h.bullets(c.amenities) },
      { id:'services', label:'Services', text:h.bullets(c.services) },
      { id:'location', label:'Localisation', text:c.location },
      { id:'attractions', label:'À proximité', text:h.bullets((c.attractions||[]).map(a => `${a.name} — ${a.note}`)) },
      { id:'activities', label:'Activités', text:h.bullets(c.activities) },
      { id:'practical', label:'Informations pratiques', text:h.bullets((c.practical||[]).map(p => `${p.k} : ${p.v}`)) },
      { id:'rules', label:'Règles du logement', text:h.bullets(c.rules) },
      { id:'checkin', label:'Conditions d’arrivée', text:c.checkin },
      { id:'checkout', label:'Conditions de départ', text:c.checkout },
      { id:'instructions', label:'Instructions voyageurs', text:h.bullets(c.instructions) },
      { id:'tips', label:'Conseils', text:h.bullets(c.tips) },
      { id:'faq', label:'Questions fréquentes', text:(c.faq||[]).map(f => `${f.q}\n${f.a}`).join('\n\n') },
      { id:'cta', label:'Appel à l’action', text:c.cta },
    ];
  },
});
