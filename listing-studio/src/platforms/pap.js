import { defineAdapter } from './base.js';

/* De particulier à particulier : registre factuel, orienté logement
   plutôt que séjour, sans vocabulaire d'agence. */
export default defineAdapter({
  id:'pap', label:'PAP', group:'Petites annonces',
  limits:{ title:60, short:200, long:2000 },
  tonePreference:'direct',
  rules:[
    'Ton factuel de particulier à particulier.',
    'Description de 2 000 caractères maximum.',
    'Caractéristiques chiffrées mises en avant : surface, pièces, étage.',
  ],
  build(c, h){
    const facts = (c.practical || []).map(p => `${p.k} : ${p.v}`);
    return [
      { id:'title', label:'Titre', text:h.fit(c.title, 60).text, limit:60 },
      { id:'facts', label:'Caractéristiques', text:h.bullets(facts) },
      { id:'body', label:'Descriptif', limit:2000, text:h.fit(h.stripContacts(
          h.paragraphs([c.shortDescription, c.longDescription])), 2000).text },
      { id:'conditions', label:'Conditions', text:h.bullets(c.rules) },
    ];
  },
});
