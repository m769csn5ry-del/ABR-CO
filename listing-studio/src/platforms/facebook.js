import { defineAdapter } from './base.js';

/* Marketplace : lecture au pouce, premières lignes décisives,
   texte d'un seul tenant avec des retours à la ligne fréquents. */
export default defineAdapter({
  id:'facebook', label:'Facebook Marketplace', group:'Petites annonces',
  limits:{ title:100, short:200, long:5000 },
  tonePreference:'chaleureux',
  rules:[
    'Les deux premières lignes décident de la lecture : accroche en tête.',
    'Phrases courtes, listes à puces, pas de pavé.',
    'Titre jusqu’à 100 caractères.',
  ],
  build(c, h){
    return [
      { id:'title', label:'Titre', text:h.fit(c.title, 100).text, limit:100 },
      { id:'post', label:'Texte de la publication', limit:5000, text:h.fit([
          c.hook,
          (c.highlights || []).slice(0, 5).map(x => '• ' + x).join('\n'),
          c.shortDescription,
          'Équipements : ' + (c.amenities || []).slice(0, 12).join(', '),
          c.cta,
        ].filter(Boolean).join('\n\n'), 5000).text },
    ];
  },
});
