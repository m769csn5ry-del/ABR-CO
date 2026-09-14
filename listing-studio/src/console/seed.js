/* Jeu de démonstration — données fictives, explicitement marquées.
 *
 * Il sert à éprouver le produit sans saisir une heure de données. Les textes
 * d'annonces sont écrits pour l'exercice ; les biens n'existent pas. Aucun
 * chiffre présenté ici ne provient d'une source de marché.
 */

import * as db from '../core/db.js';
import * as svc from '../domain/dossiers.js';
import { log } from '../domain/audit.js';

/* `meta` est une table globale : la clé porte l'organisation pour que le jeu de
   démonstration ne soit chargé qu'une fois par organisation. */
const key = () => `seeded:${db.currentOrgId()}`;
export const isSeeded = () => Boolean(db.meta.first(m => m.key === key()));

const ANNONCE_FAIBLE = `SUPERBE APPARTEMENT !!!
Magnifique appartement idéal, très beau, coup de coeur assuré, à saisir rapidement. Bel appartement lumineux dans belle résidence. Bel environnement agréable et calme. Superbe vue. Appartement rare sur le secteur, très joli, à visiter absolument. Contactez nous vite car ce bien exceptionnel ne restera pas longtemps sur le marché et il est vraiment magnifique.`;

const ANNONCE_MOYENNE = `Bel appartement 3 pièces
Superbe appartement très agréable dans un quartier idéal. Belle résidence calme. Appartement lumineux avec balcon, très joli, à visiter rapidement. Deux chambres, cuisine séparée, salle d'eau. Chauffage collectif. Proche commerces et transports. Charges de copropriété 180 € par mois. Classe énergie D. Disponible début mars. Contactez l'agence.`;

export async function seed(){
  if (isSeeded()) return;

  const client = db.clients.insert({
    name:'Agence Rivelin (démonstration)', company:'Rivelin Immobilier',
    email:'contact@exemple.test', phone:'', demo:true,
  });

  db.contracts.insert({
    clientId:client.id, status:'active', demo:true,
    label:'Mandat d’optimisation — démonstration',
    terms:{ model:'percent_agency', rate:15, currency:'EUR', vatRate:20 },
    paymentTermDays:30, startsAt:Date.now() - 90 * 86400000, endsAt:null,
  });

  ['Propriétaire bailleur — Neudorf', 'Conciergerie Petite France', 'Agence Orangerie']
    .forEach((name, i) => db.leads.insert({
      name, status:['contacted','audit_sent','new'][i], demo:true,
      source:'Démonstration', lastContactAt: Date.now() - [9, 6, 1][i] * 86400000,
    }));

  /* Dossier 1 — parcours complet, jusqu'à la commission. */
  const d1 = svc.create({
    name:'T3 Krutenau (démonstration)', clientId:client.id, market:'rent',
    property:{ propertyType:'apartment', city:'Strasbourg', district:'Krutenau' },
  });
  svc.importListing(d1.id, { raw: ANNONCE_MOYENNE });
  svc.update(d1.id, { demo:true, property:{
    ...svc.get(d1.id).property,
    surface:68, rooms:3, bedrooms:2, bathrooms:1, floor:3, year:1998,
    charges:180, dpe:'D', ges:'D', heating:'collectif au gaz',
    hasElevator:true, hasBalcony:true, hasCellar:true,
    orientation:'sud', transport:'Tram Porte de l’Hôpital à 4 minutes à pied.',
    condoLots:24, availability:'1er mars', rent:980, deposit:980,
    livingRoomSurface:26,
    feesNote:'honoraires de location de 10 € par m² à la charge du locataire',
    landmarks:[{ name:'Commerces rue de Zurich', distance:'3 minutes' },
               { name:'Université', distance:'10 minutes' }],
  } }, 'Fiche complétée pour la démonstration');
  await svc.runAnalysis(d1.id);
  const opt = await svc.optimize(d1.id);
  svc.validateVersion(d1.id, opt.version.id, { approved:true, note:'Validé pour la démonstration' });
  svc.markPublished(d1.id, { platform:'Portail de diffusion', at: Date.now() - 40 * 86400000 });
  svc.addReading(d1.id, { phase:'before', from: Date.now() - 68 * 86400000, to: Date.now() - 40 * 86400000,
    values:{ views:420, contacts:6, visits:2, favorites:11 } });
  svc.addReading(d1.id, { phase:'after', from: Date.now() - 40 * 86400000, to: Date.now() - 5 * 86400000,
    values:{ views:910, contacts:19, visits:7, favorites:34 } });
  const tx = svc.recordTransaction(d1.id, {
    amount: 96000, agencyCommission: 96000, type:'rent',
    reference:'Bail démonstration', closedAt: Date.now() - 12 * 86400000,
  });
  svc.computeCommission(d1.id, tx.id);

  /* Dossier 2 — annonce faible, arrêté après l'analyse : c'est l'écran d'analyse
     qui doit convaincre, pas un résultat déjà acquis. */
  const d2 = svc.create({
    name:'Studio Gare (démonstration)', clientId:client.id, market:'rent',
    property:{ propertyType:'studio', city:'Strasbourg', district:'Gare' },
  });
  svc.importListing(d2.id, { raw: ANNONCE_FAIBLE });
  svc.update(d2.id, { demo:true });
  await svc.runAnalysis(d2.id);

  /* Dossier 3 — ouvert, sans annonce : montre les blocages expliqués. */
  svc.create({
    name:'Maison Robertsau (démonstration)', clientId:null, market:'sale',
    property:{ propertyType:'house', city:'Strasbourg' },
  });

  db.meta.insert({ key:key(), at:Date.now() });
  log('entity.create', { entity:'meta', entityId:null, note:'Jeu de démonstration chargé' });
}

export function clearDemo(){
  db.dossiers.all().filter(d => d.demo).forEach(d => svc.remove(d.id));
  db.clients.removeWhere(c => c.demo);
  db.contracts.removeWhere(c => c.demo);
  db.leads.removeWhere(l => l.demo);
  const m = db.meta.first(x => x.key === key());
  if (m) db.meta.remove(m.id);
}
