import { defineAdapter } from './base.js';

/* Petite annonce : un seul bloc de texte, ton direct, informations
   pratiques en tête, aucune coordonnée dans le corps de l'annonce. */
export default defineAdapter({
  id:'leboncoin', label:'Leboncoin', group:'Petites annonces',
  limits:{ title:50, short:250, long:4000 },
  tonePreference:'direct',
  rules:[
    'Titre de 50 caractères maximum.',
    'Un seul bloc de description, sans mise en forme riche.',
    'Coordonnées interdites dans le texte : la messagerie du site sert d’intermédiaire.',
    'Les informations clés (surface, pièces, prix) doivent apparaître en haut.',
  ],
  build(c, h){
    const facts = (c.practical || []).map(p => `${p.k} : ${p.v}`);
    return [
      { id:'title', label:'Titre', text:h.fit(c.title, 50).text, limit:50 },
      { id:'body', label:'Texte de l’annonce', limit:4000, text:h.fit(h.stripContacts([
          c.hook,
          h.bullets(facts),
          c.longDescription,
          'Équipements : ' + (c.amenities || []).join(', '),
          (c.rules || []).length ? 'Conditions : ' + (c.rules || []).join(' · ') : '',
          c.cta,
        ].filter(Boolean).join('\n\n')), 4000).text },
    ];
  },
});
