/* Moteur de rédaction local (sans API externe).
 *
 * Règle absolue : aucune caractéristique n'est inventée. Tout ce qui est écrit
 * provient de la fiche du bien, du positionnement, des équipements cochés ou
 * des points d'intérêt saisis par l'utilisateur. Lorsqu'une information
 * nécessaire manque, le texte porte le marqueur « Information manquante » et
 * le champ est remonté dans `content.missing` pour être complété.
 */

import {
  PROPERTY_TYPES, propertyType, AMENITIES, amenity, amenityLabel,
  AUDIENCES, audience, styleOf, HIGHLIGHTS, highlight, tone as toneOf,
  RULE_PRESETS, PHOTO_CATEGORIES,
} from '../../data/options.js';
import { TONE_PROFILES, AUDIENCE_LINES, HIGHLIGHT_LINES, TITLE_PATTERNS, FAQ_BANK } from './phrases.js';
import { seeded, listFR, capitalize, num, trimTo, uniq, plural } from '../../core/util.js';
import { agree, articles, soft, sentence, para } from './grammar.js';

export const MISSING_MARK = 'Information manquante';

/** Évite deux phrases au sens identique dans un même paragraphe. */
const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter(x => {
    const k = String(x).toLowerCase().replace(/[^a-zà-ÿ]/g, '').slice(0, 34);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
};
const miss = (label) => `[${MISSING_MARK} : ${label}]`;

/* ---------- Normalisation des faits ---------- */
export function facts(project){
  const p = project.property || {};
  const pos = project.positioning || {};
  const custom = p.customAmenities || [];
  const ids = p.amenities || [];
  const has = (id) => ids.includes(id);
  const type = propertyType(p.type);
  const place = [p.district, p.city].filter(Boolean).join(', ') || p.city || '';
  const placeProse = p.city
    ? (p.district ? `${p.city} (quartier ${p.district})` : p.city)
    : (p.district || '');
  const amenityList = ids
    .map(id => amenity(id) || custom.find(c => c.id === id))
    .filter(Boolean);
  const art = articles(type);
  const low = (a) => soft(a.label, a.keepCase);
  const top = amenityList.slice().sort((a, b) => (b.weight || 1) - (a.weight || 1));

  return {
    p, pos, has, type, custom, art, low,
    lowOf: (id) => { const a = amenity(id) || custom.find(c => c.id === id); return a ? soft(a.label, a.keepCase) : id; },
    name: p.name || '',
    place, placeProse,
    city: p.city || '',
    country: p.country || '',
    district: p.district || '',
    guests: Number(p.guests) || 0,
    bedrooms: Number(p.bedrooms) || 0,
    beds: Number(p.beds) || 0,
    bathrooms: Number(p.bathrooms) || 0,
    surface: Number(p.surface) || 0,
    floor: p.floor,
    elevator: p.elevator,
    year: p.year,
    amenityIds: ids,
    amenityLabels: amenityList.map(a => a.label),
    topAmenities: top,
    audiences: (pos.audiences || []).map(a => audience(a)).filter(Boolean),
    style: styleOf(pos.style),
    highlights: (pos.highlights || []).map(h => highlight(h)).filter(Boolean),
    attractions: (pos.attractions || []).filter(a => a && a.name),
    activities: (pos.activities || []).filter(Boolean),
    transport: pos.transport || '',
    rules: (pos.rules || []).map(id => RULE_PRESETS.find(r => r.id === id)?.label || id),
    customRules: (pos.customRules || []).filter(Boolean),
    checkinTime: pos.checkinTime || '',
    checkoutTime: pos.checkoutTime || '',
    selfCheckin: has('arrivee_auto') || pos.selfCheckin === true,
    accessNote: pos.accessNote || '',
    notes: pos.notes || '',
    minNights: Number(project.pricing?.minNights) || Number(pos.minNights) || 0,
    price: Number(project.pricing?.current) || 0,
    currency: p.currency || 'EUR',
    isDemo: Boolean(project.isDemo),
  };
}

/* ---------- Fragments réutilisables ---------- */
function capacityPhrase(f, { withGuests = true } = {}){
  const bits = [];
  if (withGuests && f.guests) bits.push(plural(f.guests, 'voyageur', 'voyageurs'));
  if (f.bedrooms) bits.push(plural(f.bedrooms, 'chambre', 'chambres'));
  if (f.beds) bits.push(plural(f.beds, 'lit', 'lits'));
  if (f.bathrooms) bits.push(plural(f.bathrooms, 'salle de bain', 'salles de bain'));
  return bits.join(' · ');
}

function sizePhrase(f){
  const bits = [];
  if (f.surface) bits.push(`${num(f.surface)} m²`);
  if (f.floor !== '' && f.floor !== undefined && f.floor !== null){
    const n = Number(f.floor);
    if (!isNaN(n)) bits.push(n === 0 ? 'au rez-de-chaussée' : `au ${n}${n === 1 ? 'er' : 'e'} étage`);
  }
  if (f.elevator === true) bits.push('avec ascenseur');
  if (f.elevator === false && Number(f.floor) > 1) bits.push('sans ascenseur');
  return bits.join(', ');
}

function mainAsset(f){
  const h = f.highlights[0];
  if (h && h.id !== 'autre') return h.claim;
  const a = f.topAmenities[0];
  return a ? a.label.toLowerCase() : '';
}

function assetWord(f){
  const map = {
    vue:'avec vue', piscine:'avec piscine', terrasse:'avec terrasse',
    emplacement:'idéalement situé', calme:'au calme', deco:'à la décoration soignée',
    taille:'aux beaux volumes', lumiere:'très lumineux', prix:'au bon rapport qualité-prix',
    attractions:'proche des sites à visiter', equipement:'tout équipé',
  };
  for (const h of f.highlights){ if (map[h.id]) return map[h.id]; }
  if (f.has('piscine')) return 'avec piscine';
  if (f.has('vue')) return 'avec vue';
  if (f.has('terrasse')) return 'avec terrasse';
  if (f.has('jardin')) return 'avec jardin';
  if (f.has('parking')) return 'avec parking';
  return '';
}

/* ---------- Titres ---------- */
export function buildTitles(f, tone, rnd){
  const t = f.type;
  const typeLabel = t.label;
  const styleAdj = f.style.id === 'autre' ? '' : f.style.label.toLowerCase();
  const atout = assetWord(f);
  const lieu = f.place || miss('ville');
  const pub = f.audiences[0]?.forTitle || '';
  const cap = f.guests ? `${f.guests} pers.` : '';

  const filled = TITLE_PATTERNS.map(pat => pat
    .replace('{Type}', typeLabel)
    .replace('{type}', typeLabel.toLowerCase())
    .replace('{style}', styleAdj)
    .replace('{atoutCap}', capitalize(atout))
    .replace('{atout}', atout)
    .replace('{lieu}', lieu)
    .replace('{public}', pub)
    .replace('{capacite}', cap)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s*·\s*/g, ' · ')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/[—·]\s*$/, '')
    .replace(/\s*pour\s*$/, '')
    .replace(/,\s*$/, '')
    .trim());

  const extra = [];
  if (f.name) extra.push(`${f.name} — ${f.type.noun} ${atout || ''} à ${lieu}`.replace(/\s{2,}/g, ' ').trim());
  if (f.highlights[1]) extra.push(`${typeLabel} ${atout} et ${soft(f.highlights[1].label)} · ${lieu}`);
  if (cap && atout) extra.push(`${typeLabel} ${cap} ${atout} — ${lieu}`);

  const all = uniq([...filled, ...extra])
    .map(s => s.replace(/\s{2,}/g, ' ').trim())
    .filter(s => s.length > 12);

  // Ordre : titres de longueur « Airbnb-compatible » d'abord, puis les autres.
  const score = (s) => (s.length <= 50 ? 0 : s.length <= 70 ? 1 : 2) + (s.includes(MISSING_MARK) ? 5 : 0);
  const ordered = all.sort((a, b) => score(a) - score(b) || a.length - b.length);
  const shuffled = ordered.slice(0, 8);
  if (rnd && shuffled.length > 2){
    const head = shuffled.shift();
    shuffled.sort(() => rnd() - 0.5);
    shuffled.unshift(head);
  }
  return shuffled.slice(0, 6);
}

/* ---------- Accroche et descriptions ---------- */
function openerFor(f, prof, rnd, offset = 0){
  const i = (Math.floor(rnd() * prof.opener.length) + offset) % prof.opener.length;
  const pat = prof.opener[i];
  const baseAdj = prof.adj[Math.floor(rnd() * prof.adj.length)];
  const styleAdj = f.style.id === 'autre' ? null : f.style.adj?.[0];
  const adj = agree(styleAdj || baseAdj, f.art.g);
  const a = f.art;
  return sentence(pat
    .replace(/{Type}/g, f.type.label)
    .replace(/{type}/g, f.type.noun)
    .replace(/{Adj}/g, capitalize(adj))
    .replace(/{adj}/g, adj)
    .replace(/{Un}/g, a.Un).replace(/{un}/g, a.un)
    .replace(/{Ce}/g, a.Ce).replace(/{ce}/g, a.ce)
    .replace(/{pense}/g, agree('pensé', a.g))
    .replace(/{situe}/g, agree('situé', a.g))
    .replace(/{lieu}/g, f.placeProse || miss('ville'))
    .replace(/\s{2,}/g, ' '));
}

export function buildHook(f, prof, rnd){
  const asset = mainAsset(f);
  const cap = capacityPhrase(f);
  const base = openerFor(f, prof, rnd, 1);
  if (asset && cap) return `${base} ${capitalize(asset)} en atout principal, pour ${cap}.`;
  if (asset) return `${base} ${capitalize(asset)} en atout principal.`;
  if (cap) return `${base} Pour ${cap}.`;
  return base;
}

export function buildShort(f, prof, rnd, limit){
  const parts = [openerFor(f, prof, rnd)];
  const cap = capacityPhrase(f);
  const size = sizePhrase(f);
  if (cap && size) parts.push(`${capitalize(cap)} · ${size}`);
  else if (cap || size) parts.push(capitalize(cap || size));
  const key = f.topAmenities.slice(0, 4).map(f.low);
  if (key.length) parts.push(`${prof.linker[Math.floor(rnd() * prof.linker.length)]} ${listFR(key)}`);
  const audLine = f.audiences.map(a => AUDIENCE_LINES[a.id]).find(Boolean);
  if (audLine) parts.push(audLine);
  return trimTo(para(parts), limit || prof.max.short);
}

export function buildLong(f, prof, rnd, rooms){
  const P = [];

  // 1. Ouverture et positionnement
  const intro = [openerFor(f, prof, rnd)];
  intro.push(...f.highlights.map(h => HIGHLIGHT_LINES[h.id]).filter(Boolean).slice(0, 2));
  intro.push(...f.audiences.map(a => AUDIENCE_LINES[a.id]).filter(Boolean).slice(0, 2));
  P.push(para(dedupe(intro)));

  // 2. L'espace
  const space = [];
  const size = sizePhrase(f);
  if (f.guests) space.push(`${f.art.Le}${f.type.noun} accueille jusqu’à ${plural(f.guests, 'voyageur', 'voyageurs')}`);
  else space.push(`Capacité d’accueil : ${miss('nombre de voyageurs')}`);
  if (size) space.push(`Surface et configuration : ${size}`);
  if (f.year) space.push(`Logement de ${f.year}`);
  P.push(para(space));
  const roomLines = rooms.slice(0, 7).map(r => r.line || `${r.name} : ${r.text}`);
  if (roomLines.length) P.push(para(roomLines));

  // 3. Équipements
  if (f.amenityLabels.length){
    const lead = prof.linker[Math.floor(rnd() * prof.linker.length)];
    const first = f.topAmenities.slice(0, 6).map(f.low);
    const rest = f.topAmenities.slice(6, 14).map(f.low);
    const eq = [`${lead} ${listFR(first)}`];
    if (rest.length) eq.push(`Également sur place : ${listFR(rest)}`);
    P.push(para(eq));
  }

  // 4. Localisation — uniquement ce qui a été renseigné
  const loc = [];
  if (f.placeProse) loc.push(`Le logement se trouve à ${f.placeProse}${f.country ? `, ${f.country}` : ''}`);
  else loc.push(`Localisation : ${miss('ville')}`);
  if (f.attractions.length){
    loc.push('À proximité : ' + listFR(f.attractions.slice(0, 5).map(a =>
      a.distance ? `${a.name} (${a.distance})` : a.name)));
  }
  if (f.transport) loc.push(f.transport.trim());
  if (f.activities.length) loc.push('Sur place ou à proximité : ' + listFR(f.activities.slice(0, 5)));
  P.push(para(loc));

  // 5. Pratique et conditions
  const prac = [];
  if (f.checkinTime) prac.push(`Arrivée à partir de ${f.checkinTime}${f.selfCheckin ? ', en autonomie' : ''}`);
  if (f.checkoutTime) prac.push(`Départ avant ${f.checkoutTime}`);
  if (f.minNights) prac.push(`Séjour de ${plural(f.minNights, 'nuit minimum', 'nuits minimum')}`);
  const allRules = [...f.rules, ...f.customRules];
  if (allRules.length) prac.push('Règles du logement : ' + allRules.map(r => soft(r)).join(' ; '));
  if (f.notes) prac.push(f.notes.trim());
  if (prac.length) P.push(para(prac));

  // 6. Clôture
  P.push(prof.closer[Math.floor(rnd() * prof.closer.length)]);

  const text = P.filter(Boolean).map(x => sentence(x)).join('\n\n').replace(/[ \t]{2,}/g, ' ');
  return trimTo(text, prof.max.long * 1.6);
}

/* ---------- Pièces ---------- */
export function buildRooms(f){
  const out = [];
  const L = (ids) => ids.filter(id => f.has(id)).map(id => f.lowOf(id));
  const add = (id, name, text, line) => out.push({ id, name, text, line });

  const salon = L(['tv','netflix','cheminee','clim','chauffage','enceinte','wifi']);
  if (f.type.id !== 'chambre'){
    add('salon', 'Pièce de vie',
      salon.length ? `espace de vie équipé de ${listFR(salon)}` : 'espace de vie commun',
      salon.length
        ? `La pièce de vie est équipée de ${listFR(salon)}.`
        : 'Le logement dispose d’un espace de vie commun.');
  }

  const cuisine = L(['four','micro_ondes','lave_vaisselle','cafe','bouilloire','table_repas']);
  if (f.has('cuisine') || cuisine.length){
    add('cuisine', 'Cuisine',
      cuisine.length ? `cuisine équipée avec ${listFR(cuisine)}` : 'cuisine équipée',
      cuisine.length
        ? `La cuisine est équipée : ${listFR(cuisine)}.`
        : 'La cuisine est équipée pour préparer les repas sur place.');
  }

  if (f.bedrooms || f.beds){
    const extras = L(['lit_bebe','draps','clim']);
    const frag = [
      f.bedrooms ? plural(f.bedrooms, 'chambre', 'chambres') : '',
      f.beds ? plural(f.beds, 'lit', 'lits') : '',
    ].filter(Boolean);
    let line;
    if (f.bedrooms && f.beds)
      line = `${f.bedrooms > 1 ? `Les ${f.bedrooms} chambres totalisent` : 'La chambre compte'} ${plural(f.beds, 'lit', 'lits')}`;
    else if (f.beds) line = `Le couchage compte ${plural(f.beds, 'lit', 'lits')}`;
    else line = `Le logement compte ${plural(f.bedrooms, 'chambre', 'chambres')}`;
    if (extras.length) line += `, avec ${listFR(extras)}`;
    add('chambre', f.bedrooms > 1 ? 'Chambres' : (f.bedrooms === 1 ? 'Chambre' : 'Couchage'),
      `${listFR(frag)}${extras.length ? `, avec ${listFR(extras)}` : ''}`, line + '.');
  }

  if (f.bathrooms){
    const extras = L(['serviettes','seche_cheveux','produits','lave_linge']);
    add('sdb', f.bathrooms > 1 ? 'Salles de bain' : 'Salle de bain',
      `${plural(f.bathrooms, 'salle de bain', 'salles de bain')}${extras.length ? `, ${listFR(extras)}` : ''}`,
      `Le logement compte ${plural(f.bathrooms, 'salle de bain', 'salles de bain')}${extras.length ? `, avec ${listFR(extras)}` : ''}.`);
  }

  const ext = L(['terrasse','balcon','jardin','piscine','jacuzzi','barbecue','mobilier_ext','vue']);
  if (ext.length) add('exterieur', 'Extérieur', listFR(ext), `Côté extérieur : ${listFR(ext)}.`);

  const trav = L(['wifi_fibre','ecran']);
  if (f.has('bureau')){
    add('bureau', 'Espace de travail',
      trav.length ? `coin bureau dédié, ${listFR(trav)}` : 'coin bureau dédié',
      trav.length ? `Un coin bureau est aménagé, avec ${listFR(trav)}.` : 'Un coin bureau dédié est aménagé.');
  }

  const serv = L(['parking','garage','ascenseur','arrivee_auto','borne']);
  if (serv.length) add('acces', 'Accès et stationnement', listFR(serv), `Accès et stationnement : ${listFR(serv)}.`);

  return out;
}

/* ---------- Sections annexes ---------- */
export function buildHighlights(f){
  const out = f.highlights.filter(h => h.id !== 'autre').map(h => {
    const m = {
      vue:'Vue mise en avant depuis les pièces de vie',
      emplacement:'Emplacement au cœur du secteur recherché',
      piscine:'Piscine accessible aux voyageurs',
      deco:'Décoration soignée et cohérente',
      terrasse:'Terrasse utilisable pendant le séjour',
      calme:'Environnement calme',
      attractions:'Points d’intérêt accessibles rapidement',
      prix:'Rapport qualité-prix assumé',
      taille:'Volumes généreux pour la catégorie',
      lumiere:'Luminosité naturelle importante',
      equipement:'Équipement complet pour le quotidien',
    };
    return m[h.id] || h.label;
  });
  f.topAmenities.slice(0, 6).forEach(a => {
    if ((a.weight || 1) >= 3 && out.length < 8) out.push(a.label);
  });
  if (f.guests && out.length < 8) out.push(`Jusqu’à ${plural(f.guests, 'voyageur', 'voyageurs')}`);
  if (f.surface && out.length < 8) out.push(`${num(f.surface)} m²`);
  return uniq(out).slice(0, 8);
}

export function buildServices(f){
  const map = {
    menage:'Ménage professionnel entre chaque séjour',
    concierge:'Conciergerie joignable 7j/7',
    arrivee_auto:'Arrivée autonome',
    boite_cles:'Remise des clés par boîte sécurisée',
    bagages:'Dépôt de bagages possible',
    draps:'Linge de lit fourni',
    serviettes:'Serviettes fournies',
    produits:'Produits de toilette fournis',
    velos:'Vélos à disposition',
    borne:'Borne de recharge pour véhicule électrique',
  };
  return f.amenityIds.map(id => map[id]).filter(Boolean);
}

export function buildLocation(f){
  const bits = [];
  if (f.district) bits.push(`Quartier : ${f.district}.`);
  if (f.city) bits.push(`Ville : ${f.city}${f.country ? `, ${f.country}` : ''}.`);
  if (!f.city) bits.push(`Ville : ${miss('ville')}.`);
  if (f.transport) bits.push(f.transport.trim().replace(/\.?$/, '.'));
  if (!f.attractions.length) bits.push(`Points d’intérêt à proximité : ${miss('points d’intérêt')}.`);
  return bits.join(' ');
}

export function buildPractical(f){
  const out = [];
  const add = (k, v) => { if (v !== '' && v !== null && v !== undefined) out.push({ k, v: String(v) }); };
  add('Type de bien', f.type.label);
  add('Voyageurs', f.guests || miss('voyageurs'));
  add('Chambres', f.bedrooms || (f.type.id === 'studio' ? 'Studio' : miss('chambres')));
  add('Lits', f.beds || miss('lits'));
  add('Salles de bain', f.bathrooms || miss('salles de bain'));
  if (f.surface) add('Surface', `${num(f.surface)} m²`);
  if (f.floor !== '' && f.floor !== undefined && f.floor !== null) add('Étage', Number(f.floor) === 0 ? 'Rez-de-chaussée' : f.floor);
  if (f.elevator !== undefined && f.elevator !== null && f.elevator !== '') add('Ascenseur', f.elevator ? 'Oui' : 'Non');
  if (f.year) add('Année du logement', f.year);
  if (f.minNights) add('Séjour minimum', plural(f.minNights, 'nuit', 'nuits'));
  add('Animaux', f.has('animaux') ? 'Acceptés' : 'Non précisé');
  add('Accessibilité', f.has('accessible') ? 'Accès PMR' : 'Non précisé');
  return out;
}

export function buildRules(f){
  const out = [...f.rules, ...f.customRules];
  if (!f.has('animaux') && !out.some(r => /animau/i.test(r))) out.push('Animaux non admis sauf accord préalable');
  if (!out.some(r => /fumeur/i.test(r))) out.push('Logement non-fumeur');
  if (f.minNights) out.push(`Séjour de ${plural(f.minNights, 'nuit minimum', 'nuits minimum')}`);
  return uniq(out);
}

export function buildCheckin(f){
  if (!f.checkinTime) return `Arrivée : ${miss('heure d’arrivée')}.`;
  const bits = [`Arrivée à partir de ${f.checkinTime}.`];
  if (f.selfCheckin) bits.push('Arrivée autonome : les instructions d’accès sont envoyées avant le séjour.');
  else bits.push('Accueil sur place à votre arrivée.');
  if (f.accessNote) bits.push(f.accessNote.trim().replace(/\.?$/, '.'));
  return bits.join(' ');
}
export function buildCheckout(f){
  if (!f.checkoutTime) return `Départ : ${miss('heure de départ')}.`;
  const bits = [`Départ avant ${f.checkoutTime}.`];
  if (f.has('menage')) bits.push('Le ménage de fin de séjour est assuré par nos soins.');
  else bits.push('Merci de laisser le logement rangé et de déposer les clés comme convenu.');
  return bits.join(' ');
}

export function buildInstructions(f){
  const out = [];
  if (f.selfCheckin) out.push('Les codes d’accès sont transmis le jour de l’arrivée.');
  if (f.has('parking')) out.push('Le stationnement prévu pour le logement est indiqué avant l’arrivée.');
  if (f.has('wifi') || f.has('wifi_fibre')) out.push('Les identifiants Wi-Fi sont affichés dans le logement.');
  if (f.has('lave_linge')) out.push('Un lave-linge est à disposition pendant le séjour.');
  if (f.has('animaux')) out.push('Les animaux sont acceptés : merci de le signaler à la réservation.');
  if (f.accessNote) out.push(f.accessNote.trim());
  if (!out.length) out.push(`Instructions d’accès : ${miss('modalités d’arrivée')}.`);
  return out;
}

export function buildTips(f){
  const out = [];
  if (f.has('draps') || f.has('serviettes')) out.push('Le linge est fourni : inutile de prévoir draps ou serviettes.');
  if (f.has('cuisine')) out.push('La cuisine est équipée pour préparer vos repas sur place.');
  if (f.has('piscine')) out.push('Prévoyez de quoi profiter de la piscine.');
  if (f.has('parking')) out.push('Le stationnement est prévu : indiquez votre véhicule à la réservation.');
  if (f.attractions.length) out.push('Les points d’intérêt listés sont accessibles depuis le logement.');
  if (f.has('bureau')) out.push('Un espace de travail est disponible pour les séjours professionnels.');
  if (f.audiences.some(a => a.id === 'famille') && f.has('lit_bebe')) out.push('Un lit bébé est disponible sur demande à la réservation.');
  return out.slice(0, 6);
}

export function buildFaq(f){
  const out = [];
  const ans = {
    wifi: f.has('wifi') || f.has('wifi_fibre')
      ? `Oui, le logement dispose du Wi-Fi${f.has('wifi_fibre') ? ' en fibre' : ''}.` : null,
    parking: f.has('parking') || f.has('garage')
      ? `Oui, ${f.has('garage') ? 'un garage fermé' : 'un parking'} est prévu pour le logement.` : null,
    animaux: f.has('animaux') ? 'Oui, les animaux sont acceptés.'
      : 'Les animaux ne sont pas acceptés, sauf accord préalable.',
    arrivee: f.checkinTime
      ? `L’arrivée se fait à partir de ${f.checkinTime}${f.selfCheckin ? ', en autonomie avec les codes transmis avant le séjour' : ', avec un accueil sur place'}.`
      : null,
    capacite: f.guests ? `Le logement accueille jusqu’à ${plural(f.guests, 'voyageur', 'voyageurs')}.` : null,
    menage: f.has('menage') ? 'Le ménage professionnel est assuré entre chaque séjour.' : null,
    linge: (f.has('draps') || f.has('serviettes'))
      ? `Oui, ${listFR([f.has('draps') && 'le linge de lit', f.has('serviettes') && 'les serviettes'].filter(Boolean))} sont fournis.` : null,
    duree: f.minNights ? `Le séjour minimum est de ${plural(f.minNights, 'nuit', 'nuits')}.` : null,
    enfants: (f.has('lit_bebe') || f.has('chaise_haute'))
      ? `Oui, ${listFR([f.has('lit_bebe') && 'un lit bébé', f.has('chaise_haute') && 'une chaise haute'].filter(Boolean))} ${f.has('lit_bebe') && f.has('chaise_haute') ? 'sont disponibles' : 'est disponible'}.` : null,
    clim: f.has('clim') ? 'Oui, le logement est climatisé.' : null,
  };
  FAQ_BANK.forEach(q => { if (ans[q.id]) out.push({ q: q.q, a: ans[q.id] }); });
  return out.slice(0, 7);
}

export function buildCta(f, prof, rnd){
  const base = prof.ctas[Math.floor(rnd() * prof.ctas.length)];
  if (f.price) return `${base}`;
  return base;
}

/* ---------- Informations manquantes ---------- */
export function detectMissing(project){
  const f = facts(project);
  const out = [];
  const add = (field, label, why, severity = 'required', step = 1) => out.push({ field, label, why, severity, step });

  if (!f.name) add('property.name', 'Nom du logement', 'Sert de référence interne et de nom d’hébergement sur certaines plateformes.', 'recommended', 1);
  if (!f.p.type) add('property.type', 'Type de bien', 'Détermine le vocabulaire de toute l’annonce.', 'required', 1);
  if (!f.city) add('property.city', 'Ville', 'Aucune annonce ne peut être publiée sans localisation.', 'required', 1);
  if (!f.guests) add('property.guests', 'Nombre de voyageurs', 'Information attendue par toutes les plateformes.', 'required', 1);
  if (!f.bedrooms && f.p.type !== 'studio' && f.p.type !== 'chambre') add('property.bedrooms', 'Nombre de chambres', 'Structure la description des espaces.', 'required', 1);
  if (!f.beds) add('property.beds', 'Nombre de lits', 'Information de couchage attendue par les voyageurs.', 'required', 1);
  if (!f.bathrooms) add('property.bathrooms', 'Nombre de salles de bain', 'Critère de filtre sur la plupart des plateformes.', 'required', 1);
  if (!f.surface) add('property.surface', 'Surface', 'Renforce la crédibilité de l’annonce.', 'recommended', 1);
  if (f.amenityIds.length < 5) add('property.amenities', 'Équipements', 'Moins de 5 équipements cochés : l’annonce paraîtra pauvre.', 'recommended', 1);
  if (!f.audiences.length) add('positioning.audiences', 'Public cible', 'Oriente le ton et les arguments.', 'required', 2);
  if (!f.pos.style) add('positioning.style', 'Style du logement', 'Oriente le vocabulaire de la description.', 'recommended', 2);
  if (!f.highlights.length) add('positioning.highlights', 'Points forts', 'Sans point fort, l’annonce n’a pas d’angle.', 'required', 2);
  if (!f.attractions.length) add('positioning.attractions', 'Points d’intérêt à proximité', 'Aucun lieu n’est inventé : renseignez-les pour enrichir la section localisation.', 'recommended', 2);
  if (!f.checkinTime) add('positioning.checkinTime', 'Heure d’arrivée', 'Nécessaire pour les conditions d’arrivée.', 'recommended', 2);
  if (!f.checkoutTime) add('positioning.checkoutTime', 'Heure de départ', 'Nécessaire pour les conditions de départ.', 'recommended', 2);

  const photoCount = (project.photoCount ?? project.photos?.length) || 0;
  if (photoCount < 5) add('photos', 'Photos', `Seulement ${photoCount} photo(s) : 8 à 15 photos sont attendues.`, photoCount ? 'recommended' : 'required', 3);
  if (!project.pricing?.current) add('pricing.current', 'Prix actuel', 'Nécessaire pour la stratégie tarifaire.', 'recommended', 8);

  return out;
}

/* ---------- Composition complète ---------- */
export function generate(project, opts = {}){
  const f = facts(project);
  const toneId = opts.tone || project.positioning?.tone || 'premium';
  const prof = TONE_PROFILES[toneId] || TONE_PROFILES.premium;
  const rnd = seeded(`${project.id || 'p'}|${toneId}|${opts.seed || 0}`);

  const rooms = buildRooms(f);
  const titles = buildTitles(f, toneId, rnd);
  const content = {
    propertyName: f.name,
    title: opts.keepTitle && project.content?.title ? project.content.title : titles[0] || miss('titre'),
    titles,
    hook: buildHook(f, prof, rnd),
    shortDescription: buildShort(f, prof, rnd),
    longDescription: buildLong(f, prof, rnd, rooms),
    highlights: buildHighlights(f),
    rooms,
    amenities: f.amenityLabels,
    services: buildServices(f),
    location: buildLocation(f),
    attractions: f.attractions.map(a => ({ name: a.name, note: a.distance || 'à proximité' })),
    activities: f.activities,
    practical: buildPractical(f),
    rules: buildRules(f),
    checkin: buildCheckin(f),
    checkout: buildCheckout(f),
    instructions: buildInstructions(f),
    tips: buildTips(f),
    faq: buildFaq(f),
    cta: buildCta(f, prof, rnd),
    missing: detectMissing(project),
    meta: {
      tone: toneId,
      engine: 'local',
      generatedAt: Date.now(),
      seed: opts.seed || 0,
      isDemo: f.isDemo,
    },
  };
  return content;
}

export const TONE_IDS = Object.keys(TONE_PROFILES);
export { PROPERTY_TYPES, AMENITIES, AUDIENCES, HIGHLIGHTS, PHOTO_CATEGORIES, toneOf };
