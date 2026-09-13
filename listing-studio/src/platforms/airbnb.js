import { defineAdapter } from './base.js';

/* Format court et segmenté : un titre très contraint, un résumé, puis des
   sections « L'espace », « Accès voyageurs », « Le quartier », « Règles ». */
export default defineAdapter({
  id:'airbnb', label:'Airbnb', group:'Location courte durée',
  limits:{ title:50, short:500, long:5000 },
  tonePreference:'chaleureux',
  rules:[
    'Titre limité à 50 caractères — le mot fort en premier.',
    'Résumé de 500 caractères maximum, visible avant le « lire la suite ».',
    'Pas de coordonnées ni de liens dans le texte.',
    'Sections séparées : l’espace, l’accès, le quartier, les règles.',
  ],
  build(c, h){
    return [
      { id:'title', label:'Titre', text:h.fit(c.title, 50).text, limit:50 },
      { id:'summary', label:'Résumé', text:h.fit(h.stripContacts(c.shortDescription), 500).text, limit:500 },
      { id:'space', label:'L’espace', text:h.stripContacts(
          h.paragraphs([c.longDescription, (c.rooms||[]).map(r => `${r.name} : ${r.text}`).join('\n')])) },
      { id:'access', label:'Accès voyageurs', text:h.stripContacts(
          [c.checkin, c.checkout, h.bullets(c.instructions)].filter(Boolean).join('\n')) },
      { id:'neighborhood', label:'Le quartier', text:h.stripContacts(
          [c.location, h.bullets((c.attractions||[]).map(a => `${a.name} — ${a.note}`))].filter(Boolean).join('\n')) },
      { id:'rules', label:'Règles du logement', text:h.bullets(c.rules) },
      { id:'notes', label:'À noter', text:h.bullets(c.tips) },
    ];
  },
});
