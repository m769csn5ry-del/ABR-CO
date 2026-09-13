/* Stratégie tarifaire.
 *
 * IMPORTANT : ce module ne consulte aucune donnée de marché. Il produit une
 * recommandation calculée à partir des seules informations saisies par
 * l'utilisateur (prix de référence, saison, durée, équipements, score de
 * l'annonce). Elle est présentée comme telle : « estimation interne », jamais
 * comme un relevé de marché.
 *
 * Si un connecteur de données externes est configuré (voir server/), la
 * recommandation embarque alors `source` et `asOf`, affichés dans l'interface.
 */

import { season as seasonOf } from '../data/options.js';
import { amenity } from '../data/options.js';
import { clamp, round, money } from '../core/util.js';

const PREMIUM = { piscine:0.08, jacuzzi:0.05, vue:0.06, terrasse:0.03, jardin:0.02,
                  parking:0.03, clim:0.02, bureau:0.02, sauna:0.03, cheminee:0.02,
                  salle_sport:0.02, borne:0.01, menage:0.01 };

export const DISCLAIMER =
  'Estimation interne calculée à partir des informations que vous avez saisies. ' +
  'Aucune donnée de marché externe n’a été consultée : à confronter à vos relevés de concurrence.';

function nightsBetween(a, b){
  if (!a || !b) return 0;
  const d1 = new Date(a), d2 = new Date(b);
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

export function recommend(project, pricing = {}, scoreTotal = null){
  const p = project.property || {};
  const ids = p.amenities || [];
  const current = Number(pricing.current) || 0;
  const userMin = Number(pricing.min) || 0;
  const userMax = Number(pricing.max) || 0;
  const cleaning = Number(pricing.cleaning) || 0;
  const guests = Number(pricing.guests) || Number(p.guests) || 0;
  const capacity = Number(p.guests) || guests || 0;
  const minNights = Number(pricing.minNights) || 0;
  const nights = nightsBetween(pricing.checkin, pricing.checkout);
  const s = seasonOf(pricing.season);

  const base = current || (userMin && userMax ? (userMin + userMax) / 2 : userMin || userMax || 0);
  if (!base){
    return {
      ok:false,
      reason:'Renseignez au moins un prix de référence (prix actuel, ou prix minimum et maximum).',
      disclaimer: DISCLAIMER,
    };
  }

  const factors = [];
  const push = (label, mult, why) => { factors.push({ label, mult, pct: round((mult - 1) * 100, 1), why }); };

  push('Saison', s.mult, `${s.label} : coefficient ${s.mult.toFixed(2)} appliqué au prix de référence.`);

  const premiumSum = clamp(ids.reduce((a, id) => a + (PREMIUM[id] || 0), 0), 0, 0.25);
  if (premiumSum > 0){
    const labels = ids.filter(id => PREMIUM[id]).map(id => amenity(id)?.label).filter(Boolean).slice(0, 5);
    push('Équipements différenciants', 1 + premiumSum, `${labels.join(', ')} justifient une prime tarifaire.`);
  }

  if (scoreTotal !== null && scoreTotal !== undefined){
    const m = 1 + clamp((scoreTotal - 70) / 100 * 0.12, -0.08, 0.06);
    push('Qualité de l’annonce', m, `Listing Score de ${Math.round(scoreTotal)}/100 : une annonce mieux notée soutient un prix plus ferme.`);
  }

  if (capacity && guests && guests < capacity){
    const m = 1 - clamp((capacity - guests) / capacity * 0.12, 0, 0.12);
    push('Remplissage', m, `${guests} voyageur(s) pour une capacité de ${capacity} : léger ajustement à la baisse.`);
  }

  if (nights >= 28) push('Séjour longue durée', 0.78, `${nights} nuits : tarif mensuel attendu, remise de 22 %.`);
  else if (nights >= 7) push('Séjour à la semaine', 0.92, `${nights} nuits : remise hebdomadaire de 8 %.`);
  else if (nights >= 3) push('Séjour court', 0.98, `${nights} nuits : légère remise d’usage.`);

  if (minNights >= 5) push('Durée minimale élevée', 0.96, `${minNights} nuits minimum : contrainte compensée par le prix.`);

  if (pricing.checkin){
    const day = new Date(pricing.checkin).getDay();
    if (day === 5 || day === 6) push('Arrivée en week-end', 1.05, 'Arrivée un vendredi ou un samedi : demande plus forte.');
  }

  const mult = factors.reduce((a, f) => a * f.mult, 1);
  let recommended = base * mult;
  let clampedBy = null;
  if (userMin && recommended < userMin){ recommended = userMin; clampedBy = 'plancher'; }
  if (userMax && recommended > userMax){ recommended = userMax; clampedBy = 'plafond'; }

  const floor = round(userMin || recommended * 0.86);
  const ceiling = round(userMax || recommended * 1.16);
  recommended = round(recommended);

  const delta = current ? round(((recommended - current) / current) * 100, 1) : null;
  let positioning, positioningNote;
  if (delta === null){ positioning = 'À calibrer'; positioningNote = 'Sans prix actuel, la recommandation part de votre fourchette.'; }
  else if (delta >= 8){ positioning = 'Sous-valorisé'; positioningNote = `Votre prix actuel est inférieur d’environ ${Math.abs(delta)} % à la recommandation.`; }
  else if (delta <= -8){ positioning = 'Au-dessus de la cible'; positioningNote = `Votre prix actuel dépasse la recommandation d’environ ${Math.abs(delta)} %.`; }
  else { positioning = 'Aligné'; positioningNote = 'Votre prix actuel est cohérent avec les paramètres saisis.'; }

  const args = factors.map(f => f.why);
  if (cleaning && recommended){
    const ratio = cleaning / recommended;
    if (ratio > 0.45) args.push(`Frais de ménage élevés : ${money(cleaning)} pour une nuit à ${money(recommended)} (${Math.round(ratio * 100)} %). Au-delà de 40 %, le taux de conversion chute sur les courts séjours.`);
    else args.push(`Frais de ménage de ${money(cleaning)}, soit ${Math.round(ratio * 100)} % d’une nuit : proportion acceptable.`);
  }
  if (clampedBy) args.push(`Recommandation ramenée à votre ${clampedBy} (${money(recommended)}).`);
  if (minNights) args.push(`Durée minimale de ${minNights} nuit(s) prise en compte.`);

  const stayTotal = nights ? round(recommended * nights + cleaning) : null;

  return {
    ok:true,
    recommended, floor, ceiling, positioning, positioningNote,
    delta, currentPrice: current, cleaning, nights, stayTotal,
    multiplier: round(mult, 3),
    factors, arguments: args,
    season: s.id, seasonLabel: s.label,
    source:'internal',
    sourceLabel:'Estimation interne Listing Studio',
    asOf: Date.now(),
    externalData:false,
    disclaimer: DISCLAIMER,
  };
}

/** Grille indicative pour trois positionnements. */
export function ladder(rec){
  if (!rec?.ok) return [];
  return [
    { id:'appel',    label:'Prix d’appel',   value: round(rec.recommended * 0.9),
      note:'Remplissage prioritaire : utile en lancement d’annonce ou en creux de saison.' },
    { id:'equilibre',label:'Prix équilibré', value: rec.recommended,
      note:'Recommandation calculée à partir de vos paramètres.' },
    { id:'ferme',    label:'Prix ferme',     value: round(rec.recommended * 1.12),
      note:'À réserver aux périodes de forte demande et aux annonces bien notées.' },
  ];
}
