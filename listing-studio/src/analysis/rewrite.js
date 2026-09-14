/* Génération d'annonce vente / location longue durée — moteur local.
 *
 * Déterministe et véridique : chaque phrase est construite à partir d'un fait
 * présent dans la fiche. Une information absente ne devient jamais une
 * approximation : elle ressort dans `missing` pour être réclamée au client.
 */

import { listFR, num, capitalize } from '../core/util.js';

const PROPERTY_TYPES = {
  apartment:{ label:'Appartement', g:'m', noun:'appartement', vowel:true },
  house:{ label:'Maison', g:'f', noun:'maison' },
  studio:{ label:'Studio', g:'m', noun:'studio' },
  loft:{ label:'Loft', g:'m', noun:'loft' },
  building:{ label:'Immeuble', g:'m', noun:'immeuble', vowel:true },
  land:{ label:'Terrain', g:'m', noun:'terrain' },
  commercial:{ label:'Local commercial', g:'m', noun:'local commercial' },
  parking:{ label:'Parking', g:'m', noun:'parking' },
  other:{ label:'Bien', g:'m', noun:'bien' },
};
export const propertyTypes = () => Object.entries(PROPERTY_TYPES).map(([id, t]) => ({ id, label:t.label }));
const typeOf = (id) => PROPERTY_TYPES[id] || PROPERTY_TYPES.other;

const MISSING = 'non_communiqué';
const present = (v) => v !== null && v !== undefined && v !== '' && v !== 0;

/** Titre : type, typologie, atout dominant, localisation. Sous 70 caractères. */
export function buildTitle(p, angle = null){
  const t = typeOf(p.propertyType);
  const bits = [];
  if (present(p.rooms)) bits.push(`${t.label} ${p.rooms} pièces`);
  else bits.push(t.label);
  if (present(p.surface)) bits.push(`${num(p.surface)} m²`);
  const asset = angle || firstAsset(p);
  if (asset) bits.push(asset);
  const place = p.district || p.city;
  const head = bits.join(' ');
  const title = place ? `${head} — ${place}` : head;
  return title.length <= 78 ? title : `${bits.slice(0, 2).join(' ')}${asset ? ' ' + asset : ''} — ${place || ''}`.trim();
}

function firstAsset(p){
  if (p.hasTerrace) return 'avec terrasse';
  if (p.hasBalcony) return 'avec balcon';
  if (p.hasGarden) return 'avec jardin';
  if (p.hasParking) return 'avec parking';
  if (p.hasView) return 'avec vue dégagée';
  if (present(p.floor) && Number(p.floor) >= 3 && p.hasElevator) return 'avec ascenseur';
  if (p.renovated) return 'rénové';
  return null;
}

export function buildTitleVariants(p){
  const out = [buildTitle(p)];
  const t = typeOf(p.propertyType), place = p.district || p.city || '';
  if (present(p.surface) && place) out.push(`${t.label} de ${num(p.surface)} m² — ${place}`);
  if (present(p.rooms) && present(p.bedrooms)) out.push(`${t.label} ${p.rooms} pièces, ${p.bedrooms} chambres${place ? ` — ${place}` : ''}`);
  const asset = firstAsset(p);
  if (asset && place) out.push(`${capitalize(asset.replace(/^avec /, ''))} : ${t.label.toLowerCase()}${present(p.surface) ? ` de ${num(p.surface)} m²` : ''} à ${place}`);
  if (present(p.floor) && p.hasElevator && place) out.push(`${t.label} au ${p.floor}e étage avec ascenseur — ${place}`);
  return Array.from(new Set(out)).filter(x => x.length > 15).slice(0, 5);
}

/** Description en cinq paragraphes : cadrage, espaces, technique, quartier, conditions. */
export function buildDescription(p, { market = 'sale' } = {}){
  const t = typeOf(p.propertyType);
  const missing = [];
  const need = (key, label) => { if (!present(p[key])) { missing.push(label); return false; } return true; };
  const P = [];

  /* 1. Cadrage */
  {
    const parts = [];
    const place = p.district && p.city ? `${p.city}, quartier ${p.district}` : (p.city || MISSING);
    if (!p.city) missing.push('ville');
    const head = present(p.surface)
      ? `${t.label} de ${num(p.surface)} m²${p.surfaceCarrez ? ' (surface Carrez)' : ''}`
      : `${t.label}`;
    if (!present(p.surface)) missing.push('surface');
    const loc = present(p.floor)
      ? (Number(p.floor) === 0 ? 'en rez-de-chaussée' : `au ${p.floor}e étage${p.hasElevator ? ' avec ascenseur' : p.hasElevator === false ? ' sans ascenseur' : ''}`)
      : '';
    parts.push(`${head} ${loc ? loc + ', ' : ''}à ${place}.`);
    if (present(p.year)) parts.push(`Immeuble de ${p.year}.`);
    if (present(p.condoLots)) parts.push(`Copropriété de ${num(p.condoLots)} lots.`);
    P.push(parts.join(' '));
  }

  /* 2. Espaces */
  {
    const parts = [];
    if (present(p.rooms)) parts.push(`${p.rooms} pièces`);
    if (present(p.bedrooms)) parts.push(`${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''}`);
    if (present(p.bathrooms)) parts.push(`${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bains`);
    if (parts.length) P.push(`Distribution : ${listFR(parts)}.`
      + (present(p.livingRoomSurface) ? ` Séjour de ${num(p.livingRoomSurface)} m².` : ''));
    else missing.push('distribution des pièces');
    const ext = [p.hasBalcony && 'balcon', p.hasTerrace && 'terrasse', p.hasGarden && 'jardin',
                 p.hasCellar && 'cave', p.hasParking && 'stationnement'].filter(Boolean);
    if (ext.length) P.push(`${capitalize(listFR(ext))}${p.orientation ? `, exposition ${p.orientation}` : ''}.`);
    else if (p.orientation) P.push(`Exposition ${p.orientation}.`);
  }

  /* 3. Technique et charges */
  {
    const parts = [];
    if (p.heating) parts.push(`chauffage ${p.heating}`);
    if (present(p.dpe)) parts.push(`DPE classe ${p.dpe}${present(p.ges) ? `, GES classe ${p.ges}` : ''}`);
    else missing.push('classe énergie (DPE)');
    if (present(p.charges)) parts.push(`charges de ${num(p.charges)} € par mois`);
    else if (market === 'rental') missing.push('montant des charges');
    if (present(p.propertyTax)) parts.push(`taxe foncière de ${num(p.propertyTax)} € par an`);
    if (parts.length) P.push(`${capitalize(listFR(parts))}.`);
  }

  /* 4. Quartier — uniquement les repères saisis */
  {
    const parts = [];
    (p.landmarks || []).filter(l => l.name).forEach(l =>
      parts.push(l.distance ? `${l.name} (${l.distance})` : l.name));
    if (parts.length) P.push(`À proximité : ${listFR(parts)}.`);
    else missing.push('repères de proximité');
    if (p.transport) P.push(`${p.transport.trim().replace(/\.?$/, '.')}`);
  }

  /* 5. Conditions */
  {
    const parts = [];
    if (market === 'rental'){
      if (present(p.rent)) parts.push(`Loyer de ${num(p.rent)} € hors charges`);
      else missing.push('montant du loyer');
      if (present(p.deposit)) parts.push(`dépôt de garantie de ${num(p.deposit)} €`);
    } else if (present(p.price)){
      parts.push(`Prix de ${num(p.price)} €${p.feesIncluded ? ' honoraires inclus' : ''}`);
    } else missing.push('prix');
    if (p.feesNote) parts.push(p.feesNote);
    else missing.push('mention des honoraires');
    if (p.availability) parts.push(`disponible ${p.availability}`);
    else missing.push('disponibilité');
    if (parts.length) P.push(`${listFR(parts)}.`);
  }

  return { text: P.filter(Boolean).join('\n\n'), missing: Array.from(new Set(missing)) };
}

export function buildArguments(p){
  const out = [];
  if (present(p.surface) && present(p.rooms)) out.push(`${num(p.surface)} m² pour ${p.rooms} pièces`);
  if (p.hasTerrace || p.hasBalcony || p.hasGarden)
    out.push(`Extérieur privatif : ${listFR([p.hasGarden && 'jardin', p.hasTerrace && 'terrasse', p.hasBalcony && 'balcon'].filter(Boolean))}`);
  if (p.hasElevator && present(p.floor) && Number(p.floor) >= 2) out.push(`Étage élevé desservi par ascenseur`);
  if (p.hasParking) out.push('Stationnement inclus');
  if (present(p.dpe) && ['A','B','C'].includes(String(p.dpe).toUpperCase())) out.push(`Performance énergétique classe ${p.dpe}`);
  if (p.renovated) out.push('Rénovation récente');
  if (p.orientation) out.push(`Exposition ${p.orientation}`);
  if ((p.landmarks || []).length) out.push(`Repères : ${(p.landmarks || []).slice(0, 2).map(l => l.name).join(', ')}`);
  return out.slice(0, 6);
}

export function buildCTA(market){
  return market === 'rental'
    ? 'Dossier complet et visite sur demande : contactez-nous pour convenir d’un créneau.'
    : 'Visite sur rendez-vous : contactez-nous pour obtenir le dossier complet et les diagnostics.';
}

export function buildFAQ(p, market){
  const faq = [];
  if (present(p.charges)) faq.push({ q:'Quel est le montant des charges ?', a:`Les charges s’élèvent à ${num(p.charges)} € par mois.` });
  if (present(p.dpe)) faq.push({ q:'Quelle est la performance énergétique ?', a:`Le bien est classé ${p.dpe} au DPE${present(p.ges) ? ` et ${p.ges} au GES` : ''}.` });
  if (p.hasParking !== undefined) faq.push({ q:'Un stationnement est-il prévu ?', a: p.hasParking ? 'Oui, un stationnement est inclus.' : 'Non, aucun stationnement n’est rattaché au bien.' });
  if (present(p.floor)) faq.push({ q:'À quel étage se situe le bien ?', a:`Au ${p.floor}e étage${p.hasElevator ? ', desservi par un ascenseur' : ', sans ascenseur'}.` });
  if (p.availability) faq.push({ q:'À partir de quand est-il disponible ?', a:`Le bien est disponible ${p.availability}.` });
  if (market === 'rental' && present(p.deposit)) faq.push({ q:'Quel est le dépôt de garantie ?', a:`Il s’élève à ${num(p.deposit)} €.` });
  return faq.slice(0, 6);
}

/** Génère la version optimisée complète. */
export function generate(property, { market = 'sale', angle = null } = {}){
  const description = buildDescription(property, { market });
  return {
    title: buildTitle(property, angle),
    titleVariants: buildTitleVariants(property),
    summary: description.text.split('\n\n')[0],
    description: description.text,
    arguments: buildArguments(property),
    differentiators: buildArguments(property).slice(0, 3),
    cta: buildCTA(market),
    faq: buildFAQ(property, market),
    keywords: [typeOf(property.propertyType).label, property.city, property.district,
               present(property.rooms) ? `${property.rooms} pièces` : null,
               present(property.surface) ? `${property.surface} m²` : null].filter(Boolean),
    missing: description.missing,
    engine:'local-rules',
    generatedAt: Date.now(),
  };
}
