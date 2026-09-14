/* Import d'annonce.
 *
 * Deux sources : le texte collé par l'utilisateur, et la saisie manuelle.
 * L'import par URL n'aspire aucun site : les portails l'interdisent dans
 * leurs conditions d'utilisation. Le champ URL sert de référence et de
 * rappel, et l'utilisateur colle le contenu qu'il a le droit de nous confier.
 */

const NUM = String.raw`(\d[\d\s.,]*)`;
const toNumber = (s) => {
  if (!s) return null;
  const n = Number(String(s).replace(/[\s.]/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
};
const first = (text, ...patterns) => {
  for (const rx of patterns){ const m = text.match(rx); if (m) return m; }
  return null;
};

/** Extraction déterministe des faits présents dans un texte d'annonce. */
export function parseListingText(raw){
  const text = String(raw || '').replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] && lines[0].length <= 120 ? lines[0] : '';
  const description = title ? lines.slice(1).join('\n') : text;

  const facts = {};
  let m;
  if ((m = first(text, new RegExp(NUM + String.raw`\s?m²`, 'i')))) facts.surface = toNumber(m[1]);
  if ((m = first(text, /\b(\d+)\s?pi[eè]ces?\b/i, /\bT(\d)\b/i, /\bF(\d)\b/i))) facts.rooms = Number(m[1]);
  if ((m = first(text, /\b(\d+)\s?chambres?\b/i))) facts.bedrooms = Number(m[1]);
  if ((m = first(text, /\b(\d+)\s?salles?\s?d[eu]\s?bain/i))) facts.bathrooms = Number(m[1]);
  if ((m = first(text, /\b(\d+)(?:e|ème|er)?\s?étage\b/i))) facts.floor = Number(m[1]);
  else if (/rez-de-chauss[ée]e|\bRDC\b/i.test(text)) facts.floor = 0;
  /* Plusieurs montants coexistent dans une annonce : prix, charges, honoraires,
     taxe foncière, dépôt de garantie. Un montant explicitement rattaché à l'un
     de ces postes n'est jamais retenu comme prix — mieux vaut un prix manquant,
     signalé comme tel, qu'un prix faux présenté comme certain. */
  const NOT_A_PRICE = /(charges?|honoraires?|taxe|fonci[eè]re|d[ée]p[oô]t|caution|garantie|provision|assurance|copropri[ée]t[ée])[^.\n]{0,40}$/i;
  const amounts = Array.from(text.matchAll(new RegExp(NUM + String.raw`\s?(?:€|euros)`, 'gi')))
    .map(a => ({ value: toNumber(a[1]), before: text.slice(Math.max(0, a.index - 60), a.index) }))
    .filter(a => a.value !== null && !NOT_A_PRICE.test(a.before))
    .map(a => a.value);
  const labelled = first(text, new RegExp(String.raw`(?:prix|loyer)\D{0,15}` + NUM, 'i'));
  if (labelled) facts.price = toNumber(labelled[1]);
  else if (amounts.length) facts.price = Math.max(...amounts);
  if ((m = first(text, /\bDPE\s*:?\s*([A-G])\b/i, /\bclasse\s+énergie\s*:?\s*([A-G])\b/i))) facts.dpe = m[1].toUpperCase();
  if ((m = first(text, /\bGES\s*:?\s*([A-G])\b/i))) facts.ges = m[1].toUpperCase();
  /* « charges de copropriété s'élèvent à 180 € » : l'écart entre le mot et le
     montant peut dépasser vingt caractères, mais jamais une fin de phrase. */
  if ((m = first(text, new RegExp(String.raw`charges?[^.\n\d]{0,40}` + NUM, 'i')))) facts.charges = toNumber(m[1]);
  // Une valeur identique au prix n'est pas une charge : c'est le même montant capté deux fois.
  if (facts.charges && facts.price && facts.charges === facts.price) facts.charges = null;
  if ((m = first(text, /\b(19|20)\d{2}\b/))) facts.year = Number(m[0]);
  facts.hasElevator = /\bascenseur\b/i.test(text) ? !/sans ascenseur/i.test(text) : undefined;
  facts.hasBalcony = /\bbalcon\b/i.test(text) || undefined;
  facts.hasTerrace = /\bterrasse\b/i.test(text) || undefined;
  facts.hasGarden = /\bjardin\b/i.test(text) || undefined;
  facts.hasParking = /\bparking\b|\bgarage\b|\bstationnement\b/i.test(text) || undefined;
  facts.hasCellar = /\bcave\b/i.test(text) || undefined;
  if ((m = first(text, /\bexposition\s+(sud-est|sud-ouest|nord-est|nord-ouest|sud|nord|est|ouest)\b/i))) facts.orientation = m[1].toLowerCase();

  const detected = Object.entries(facts).filter(([, v]) => v !== undefined && v !== null).map(([k]) => k);
  const EXPECTED = ['surface','rooms','bedrooms','floor','price','dpe','charges'];
  return {
    title, description,
    facts: Object.fromEntries(Object.entries(facts).filter(([, v]) => v !== undefined)),
    detected,
    missing: EXPECTED.filter(k => facts[k] === undefined || facts[k] === null),
    confidence: Math.round((EXPECTED.filter(k => facts[k] !== undefined && facts[k] !== null).length / EXPECTED.length) * 100),
    source:'paste', importedAt: Date.now(),
  };
}

/** L'URL est conservée comme référence ; aucune récupération automatique. */
export function referenceUrl(url){
  const u = String(url || '').trim();
  if (!u) return null;
  try{
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
    return { url: parsed.href, host: parsed.host,
      note:'Référence conservée. Le contenu doit être collé manuellement : les portails interdisent l’aspiration automatique de leurs pages.' };
  }catch{ return { url:u, host:null, note:'URL non reconnue, conservée telle quelle.' }; }
}
