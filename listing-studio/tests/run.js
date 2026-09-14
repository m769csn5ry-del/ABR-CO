/* Tests unitaires du moteur — pure logique, sans navigateur.
 *
 *   npm test
 *
 * Ils protègent les règles qui font la crédibilité du produit :
 * ne rien inventer, respecter les formats de chaque plateforme, et ne jamais
 * présenter une estimation interne comme une donnée de marché.
 */

import assert from 'node:assert/strict';

import { generate, detectMissing, MISSING_MARK } from '../src/ai/local/generator.js';
import { agree, articles, soft, sentence } from '../src/ai/local/grammar.js';
import { shorten, lengthen } from '../src/ai/local/rewrite.js';
import { respond, detectIntent } from '../src/ai/local/assistant.js';
import { adapter, composeAll, resolve } from '../src/platforms/index.js';
import { computeScore, levelOf } from '../src/scoring/listingScore.js';
import { recommend, ladder } from '../src/pricing/engine.js';
import { optimalOrder } from '../src/photos/ordering.js';
import { coverage } from '../src/photos/coverage.js';
import { scoreFromMetrics, recommendations } from '../src/photos/analyzer.js';
import { toText, toJSON, toCSV } from '../src/export/index.js';
import { AMENITIES, PROPERTY_TYPES, TONES } from '../src/data/options.js';
import { facts, trustScore, measure } from '../src/analysis/text.js';
import { parseListingText } from '../src/domain/listingImport.js';
import { generate as rewriteListing } from '../src/analysis/rewrite.js';
import { analyze } from '../src/analysis/index.js';

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try{ fn(); passed++; console.log(`  OK   ${name}`); }
  catch(err){ failures.push({ name, err }); console.log(`  ÉCHEC ${name}\n         ${err.message}`); }
};

/* ---------- Fixtures ---------- */
const villa = () => ({
  id:'p_test', name:'Casa Azul', platforms:['airbnb','booking'],
  property:{
    name:'Casa Azul', type:'villa', city:'Marbella', country:'Espagne', district:'Nueva Andalucía',
    guests:8, bedrooms:4, beds:5, bathrooms:3, surface:210, floor:0, elevator:false, year:2019,
    currency:'EUR',
    amenities:['wifi','clim','piscine','vue','terrasse','parking','cuisine','cafe','tv','menage',
               'draps','serviettes','barbecue','bureau','chauffage','lave_linge','four','jardin'],
  },
  positioning:{
    audiences:['famille','luxe'], style:'premium', tone:'premium',
    highlights:['piscine','vue'], attractions:[{ name:'Puerto Banús', distance:'8 min' }],
    activities:['Golf'], checkinTime:'16:00', checkoutTime:'11:00', rules:['non_fumeur'], minNights:3,
  },
  pricing:{ current:420, min:300, max:700, season:'haute', cleaning:90, minNights:3 },
  photoCount:10,
});

const minimal = () => ({
  id:'p_min', name:'Sans infos', platforms:['airbnb'],
  property:{ type:'appartement', amenities:[] },
  positioning:{ audiences:[], highlights:[], attractions:[] },
  pricing:{}, photoCount:0,
});

const photo = (category, score) => ({
  id:`ph_${category}_${score}`, category, filename:`${category}.jpg`,
  analysis:{ scores:{ score }, recommendations:[] },
});

console.log('\nGrammaire et rédaction');

test('les adjectifs s’accordent au féminin', () => {
  assert.equal(agree('lumineux', 'f'), 'lumineuse');
  assert.equal(agree('familial', 'f'), 'familiale');
  assert.equal(agree('minimaliste', 'f'), 'minimaliste');
  assert.equal(agree('bien agencé', 'f'), 'bien agencée');
});

test('les articles suivent le genre et la voyelle initiale', () => {
  assert.equal(articles({ g:'f', noun:'villa' }).ce, 'cette');
  assert.equal(articles({ g:'m', noun:'appartement', vowel:true }).ce, 'cet');
  assert.equal(articles({ g:'m', noun:'studio' }).ce, 'ce');
});

test('les sigles et noms propres gardent leur casse', () => {
  assert.equal(soft('TV'), 'TV');
  assert.equal(soft('Wi-Fi'), 'Wi-Fi');
  assert.equal(soft('Netflix', true), 'Netflix');
  assert.equal(soft('Machine à café'), 'machine à café');
});

test('la ponctuation française ne casse pas les heures', () => {
  assert.ok(sentence('Arrivée à partir de 16:00').includes('16:00'));
  assert.ok(sentence('Règles : a ; b').endsWith('.'));
});

console.log('\nVéracité du contenu généré');

test('aucune caractéristique absente de la fiche n’apparaît', () => {
  const p = villa();
  const c = generate(p);
  const declared = new Set(p.property.amenities);
  const texte = [c.title, c.hook, c.shortDescription, c.longDescription,
                 ...c.highlights, ...c.amenities, ...(c.rooms || []).map(r => r.text)]
    .join(' ').toLowerCase();
  // Aucun équipement NON coché ne doit être cité.
  const intrus = AMENITIES
    .filter(a => !declared.has(a.id))
    .filter(a => texte.includes(a.label.toLowerCase()))
    // « Cuisine » est un mot courant : on ne teste que les libellés distinctifs.
    .filter(a => a.label.length > 8);
  assert.deepEqual(intrus.map(a => a.label), [], 'équipements inventés : ' + intrus.map(a => a.label).join(', '));
});

test('aucun lieu n’est inventé : seuls les points d’intérêt saisis sortent', () => {
  const c = generate(villa());
  assert.equal(c.attractions.length, 1);
  assert.equal(c.attractions[0].name, 'Puerto Banús');
});

test('une fiche vide produit des marqueurs « Information manquante »', () => {
  const c = generate(minimal());
  const dump = JSON.stringify(c);
  assert.ok(dump.includes(MISSING_MARK), 'aucun marqueur d’information manquante');
  assert.ok(c.missing.some(m => m.field === 'property.city'), 'la ville manquante n’est pas signalée');
  assert.ok(c.missing.some(m => m.severity === 'required'), 'aucune information obligatoire signalée');
});

test('les informations manquantes disparaissent quand la fiche est complète', () => {
  const required = detectMissing(villa()).filter(m => m.severity === 'required');
  assert.deepEqual(required.map(m => m.field), []);
});

test('chaque ton produit un texte distinct et complet', () => {
  const p = villa();
  const seen = new Set();
  TONES.forEach(t => {
    const c = generate(p, { tone:t.id });
    assert.ok(c.longDescription.length > 300, `ton ${t.id} : description trop courte`);
    assert.ok(!/undefined|NaN|\[object/.test(JSON.stringify(c)), `ton ${t.id} : contenu corrompu`);
    seen.add(c.shortDescription);
  });
  assert.ok(seen.size >= TONES.length - 1, 'les tons produisent des textes identiques');
});

test('tous les types de bien sont rédigeables', () => {
  PROPERTY_TYPES.forEach(t => {
    const p = villa(); p.property.type = t.id;
    const c = generate(p);
    assert.ok(c.title.length > 8, `type ${t.id} : titre vide`);
    assert.ok(!/\bun (villa|maison|chambre)\b/i.test(c.longDescription), `type ${t.id} : accord fautif`);
  });
});

test('la régénération change la formulation, pas les faits', () => {
  const p = villa();
  const a = generate(p, { seed:1 });
  const b = generate(p, { seed:2 });
  assert.notEqual(a.longDescription, b.longDescription);
  assert.deepEqual(a.amenities, b.amenities);
  assert.deepEqual(a.practical, b.practical);
});

console.log('\nRéécriture');

test('raccourcir réduit la longueur en gardant l’ouverture', () => {
  const c = generate(villa());
  const court = shorten(c.longDescription, 0.6);
  assert.ok(court.length < c.longDescription.length * 0.85, 'texte non raccourci');
  assert.ok(court.startsWith(c.longDescription.slice(0, 40)), 'ouverture perdue');
});

test('développer n’ajoute que des éléments déjà connus', () => {
  const c = generate(villa());
  const long = lengthen(c, 1.5);
  assert.ok(long.length > c.longDescription.length, 'texte non développé');
  assert.ok(long.includes('Puerto Banús') || long.includes('Informations pratiques'));
});

console.log('\nAssistant');

test('les demandes courantes sont comprises', () => {
  const cas = {
    'Rends cette annonce plus premium':'tone',
    'Donne-moi 5 meilleurs titres':'titles',
    'Cible davantage les couples':'audience',
    'Rends la description plus courte':'shorten',
    'Que dois-je améliorer ?':'improve',
    'Quelles photos dois-je refaire ?':'photos',
    'Optimise cette annonce pour une clientèle professionnelle':'audience',
  };
  Object.entries(cas).forEach(([q, attendu]) => assert.equal(detectIntent(q), attendu, `« ${q} »`));
});

test('l’assistant propose une action applicable', () => {
  const r = respond('Rends cette annonce plus premium', { project: villa() });
  assert.equal(r.actions[0].id, 'setTone');
  assert.equal(r.actions[0].payload.tone, 'premium');
});

console.log('\nAdaptateurs de plateformes');

test('chaque plateforme rend toutes ses sections', () => {
  const c = generate(villa());
  composeAll(c, 'all', {}).forEach(out => {
    assert.ok(out.blocks.length >= 2, `${out.label} : trop peu de blocs`);
    assert.ok(out.text.length > 200, `${out.label} : sortie vide`);
  });
});

test('les limites de titre sont respectées à l’export', () => {
  const c = generate(villa());
  c.title = 'Un titre volontairement très long destiné à dépasser toutes les limites imposées par les plateformes de diffusion';
  resolve('all').forEach(a => {
    const out = a.compose(c, {});
    const titre = out.blocks.find(b => ['title','headline','name'].includes(b.id));
    if (titre) assert.ok(titre.text.length <= a.limits.title,
      `${a.label} : titre de ${titre.text.length} caractères pour une limite de ${a.limits.title}`);
    assert.ok(out.warnings.some(w => /Titre/.test(w.msg)), `${a.label} : dépassement non signalé`);
  });
});

test('Leboncoin et Booking retirent les coordonnées du texte', () => {
  const c = generate(villa());
  c.longDescription += ' Contactez-nous au 06 12 34 56 78 ou sur https://exemple.fr — mail@exemple.fr';
  ['leboncoin','booking','airbnb'].forEach(id => {
    const out = adapter(id).compose(c, {});
    assert.ok(!/06 12 34 56 78|https:\/\/|mail@exemple/.test(out.text), `${id} : coordonnées conservées`);
  });
});

test('Booking signale un montant présent dans la description', () => {
  const c = generate(villa());
  c.longDescription += ' Tarif : 420 € la nuit.';
  const out = adapter('booking').compose(c, {});
  assert.ok(out.warnings.some(w => /montant/i.test(w.msg)), 'montant non signalé');
});

console.log('\nListing Score');

test('une annonce complète obtient un score élevé, une vide un score bas', () => {
  const p = villa();
  const c = generate(p);
  const photos = ['salon','vue','piscine','chambre','cuisine','sdb','terrasse','exterieur']
    .map((cat, i) => photo(cat, 78 + (i % 5) * 4));
  const bon = computeScore({ ...p, content:c }, { photos, content:c });
  assert.ok(bon.total >= 75, `score attendu élevé, obtenu ${bon.total}`);
  assert.equal(bon.level, levelOf(bon.total).id);

  const vide = computeScore({ ...minimal(), content: generate(minimal()) }, { photos:[], content: generate(minimal()) });
  assert.ok(vide.total < 45, `score attendu bas, obtenu ${vide.total}`);
  assert.equal(vide.level, 'faible');
  assert.ok(vide.improvements.length >= 5, 'aucune priorité proposée');
});

test('les six familles totalisent bien 100 points', () => {
  const p = villa(); const c = generate(p);
  const s = computeScore({ ...p, content:c }, { photos:[photo('salon', 90)], content:c });
  const max = Object.values(s.parts).reduce((a, x) => a + x.max, 0);
  assert.equal(max, 100);
  assert.ok(s.total <= 100 && s.potential <= 100);
});

test('chaque amélioration désigne une action concrète', () => {
  const p = minimal(); const c = generate(p);
  const s = computeScore({ ...p, content:c }, { photos:[], content:c });
  s.improvements.forEach(i => {
    assert.ok(i.text.length > 12, 'amélioration trop vague');
    assert.ok(i.gain > 0, 'gain non chiffré');
    assert.ok(i.part, 'famille non renseignée');
  });
});

console.log('\nPrix');

test('la recommandation reste dans la fourchette et s’explique', () => {
  const p = villa();
  const rec = recommend(p, p.pricing, 88);
  assert.ok(rec.ok);
  assert.ok(rec.recommended >= p.pricing.min && rec.recommended <= p.pricing.max);
  assert.ok(rec.arguments.length >= 3, 'arguments insuffisants');
  assert.equal(ladder(rec).length, 3);
});

test('aucune estimation n’est présentée comme une donnée de marché', () => {
  const rec = recommend(villa(), villa().pricing, 80);
  assert.equal(rec.externalData, false);
  assert.match(rec.disclaimer, /Aucune donnée de marché externe/);
  assert.match(rec.sourceLabel, /interne/i);
});

test('sans prix de référence, le module le dit au lieu d’inventer', () => {
  const rec = recommend(villa(), {}, 80);
  assert.equal(rec.ok, false);
  assert.match(rec.reason, /prix de référence/);
});

test('la haute saison coûte plus cher que la basse', () => {
  const p = villa();
  const basse = recommend(p, { ...p.pricing, min:0, max:0, season:'basse' }, 80).recommended;
  const haute = recommend(p, { ...p.pricing, min:0, max:0, season:'haute' }, 80).recommended;
  assert.ok(haute > basse, `haute ${haute} devrait dépasser basse ${basse}`);
});

console.log('\nPhotos');

test('les mesures d’image se traduisent en notes cohérentes', () => {
  const bonne = scoreFromMetrics({
    mean:132, std:58, entropy:7.2, darkRatio:0.02, brightRatio:0.01, sharpness:900,
    edgeRatio:0.06, vertRatio:0.34, horizRatio:0.26, saturation:0.3, lowSatBright:0.1,
    green:0.05, blueTop:0.1, warm:0.3, colorfulness:30, centerBias:0.16, spread:0.86,
    rm:130, gm:125, bm:120,
  }, 1.5);
  const sombre = scoreFromMetrics({
    mean:44, std:22, entropy:6.2, darkRatio:0.42, brightRatio:0, sharpness:120,
    edgeRatio:0.04, vertRatio:0.3, horizRatio:0.2, saturation:0.2, lowSatBright:0.02,
    green:0.02, blueTop:0.02, warm:0.2, colorfulness:12, centerBias:0.3, spread:0.5,
    rm:50, gm:44, bm:40,
  }, 0.75);
  assert.ok(bonne.score > 70, `bonne photo notée ${bonne.score}`);
  assert.ok(sombre.score < 55, `photo sombre notée ${sombre.score}`);
  assert.ok(sombre.luminosite < bonne.luminosite);
  const recs = recommendations(sombre, { mean:44, darkRatio:0.42, brightRatio:0 }, 0.75);
  assert.ok(recs.some(r => /sombre/i.test(r.text)), 'obscurité non signalée');
  assert.ok(recs.some(r => /portrait/i.test(r.text)), 'format portrait non signalé');
});

test('l’ordre optimal met la meilleure image en couverture et justifie chaque position', () => {
  const photos = [photo('sdb', 52), photo('chambre', 74), photo('vue', 91), photo('salon', 88)];
  const ordre = optimalOrder(photos);
  assert.equal(ordre[0].category, 'vue');
  assert.equal(ordre[ordre.length - 1].category, 'sdb');
  ordre.forEach(p => assert.ok(p.reason && p.reason.length > 20, 'position non justifiée'));
});

test('les photos manquantes découlent des équipements déclarés', () => {
  const p = villa();
  const cov = coverage([photo('salon', 80), photo('cuisine', 80)], p.property);
  const manquantes = cov.missing.map(m => m.id);
  assert.ok(manquantes.includes('piscine'), 'piscine déclarée mais non réclamée en photo');
  assert.ok(manquantes.includes('terrasse'), 'terrasse déclarée mais non réclamée en photo');
  assert.ok(!manquantes.includes('salon'), 'salon présent mais réclamé');

  const sansExtras = coverage([], { type:'studio', amenities:['wifi'] });
  assert.ok(!sansExtras.missing.some(m => m.id === 'piscine'), 'piscine réclamée sans piscine déclarée');
});

console.log('\nExports');

test('l’export texte contient toutes les sections', () => {
  const p = villa(); p.content = generate(p);
  const txt = toText(p, { platform:'generic' });
  ['Titre','Description longue','Équipements','Règles du logement','Questions fréquentes']
    .forEach(s => assert.ok(txt.includes(s), `section « ${s} » absente`));
});

test('l’export JSON est complet et relisible', () => {
  const p = villa(); p.content = generate(p); p.score = computeScore(p, { photos:[], content:p.content });
  const obj = toJSON(p, { photos:[photo('salon', 88)], platform:'all' });
  const relu = JSON.parse(JSON.stringify(obj));
  assert.equal(relu.format, 'listing-studio/v1');
  assert.ok(relu.platformOutputs.length >= 6);
  assert.equal(relu.photos[0].category, 'salon');
});

test('l’export CSV échappe les séparateurs', () => {
  const p = villa(); p.content = generate(p);
  p.content.title = 'Titre; avec "guillemets" et, virgules';
  const csv = toCSV(p, { photos:[] });
  assert.ok(csv.includes('"Titre; avec ""guillemets"" et, virgules"'), 'échappement CSV incorrect');
  assert.ok(csv.split('\n').length > 20);
});

test('un projet de démonstration est signalé dans l’export', () => {
  const p = villa(); p.isDemo = true; p.content = generate(p);
  assert.ok(toText(p, { platform:'generic' }).includes('DÉMONSTRATION'));
  assert.equal(toJSON(p, { photos:[] }).demo, true);
  assert.ok(toCSV(p, { photos:[] }).includes('démonstration'));
});

/* ---------- Moteur d'analyse : détection des faits ---------- */
test('un mot accentué est reconnu : « étage » se trouve, « étagère » ne compte pas', () => {
  // `\b` de JavaScript ignore les lettres accentuées : sans limites Unicode,
  // aucune annonce mentionnant un étage n'était créditée de l'information.
  assert.equal(facts('Appartement au 3e étage avec ascenseur.').floor, true);
  assert.equal(facts('Studio en rez-de-chaussée.').floor, true);
  assert.equal(facts('Une étagère murale dans le séjour.').floor, false);
  assert.equal(facts('Copropriété de 24 lots.').condo, true);
  assert.ok(trustScore('68 m², 3e étage, DPE classe D, charges de 180 €') >= 4);
});

test('les mesures du texte reflètent la structure réelle', () => {
  const m = measure({ title:'Appartement 3 pièces', description:'Une phrase.\n\nUne autre phrase ici.' });
  assert.equal(m.description.structure.paragraphs, 2);
  assert.equal(m.description.sentences, 2);
  assert.equal(m.title.length, 20);
});

/* ---------- Import : un montant de charges n'est pas un prix ---------- */
test('un montant rattaché aux charges n’est jamais retenu comme prix', () => {
  const r = parseListingText('T3 de 68 m². Les charges de copropriété s’élèvent à 180 € par mois.');
  assert.equal(r.facts.price, undefined, 'les charges ont été prises pour un prix');
  assert.equal(r.facts.charges, 180);
  assert.ok(r.missing.includes('price'), 'le prix manquant doit être signalé');
});

test('le prix explicite l’emporte sur les autres montants du texte', () => {
  const r = parseListingText('Maison 120 m². Prix : 395 000 €. Charges 150 € par mois. Taxe foncière 1 200 €.');
  assert.equal(r.facts.price, 395000);
  assert.equal(r.facts.charges, 150);
});

/* ---------- Réécriture : rien d'inventé, rien de bancal ---------- */
test('une fiche vide ne produit aucune caractéristique inventée', () => {
  const r = rewriteListing({ propertyType:'house' }, { market:'sale' });
  assert.ok(!/non_communiqué|undefined|null|NaN/.test(r.description), 'marqueur technique dans le texte');
  assert.ok(!/\d+\s?m²/.test(r.description), 'une surface est apparue sans donnée');
  assert.ok(r.missing.includes('ville') && r.missing.includes('surface'));
});

test('la version optimisée respecte l’élision et la capitalisation', () => {
  const r = rewriteListing({
    propertyType:'apartment', city:'Strasbourg', surface:68, rooms:3, bedrooms:2,
    hasBalcony:true, hasCellar:true, heating:'Collectif au gaz', availability:'1er mars',
  }, { market:'rent' });
  assert.ok(!/de un |de une /.test(r.description), 'élision manquante');
  assert.ok(!/\n[a-zé]/.test('\n' + r.description), 'un paragraphe commence en minuscule');
  assert.ok(r.description.includes('chauffage est collectif'), 'majuscule parasite en milieu de phrase');
});

test('une annonce de location parle de loyer, pas de prix de vente', () => {
  const r = rewriteListing({ propertyType:'apartment', city:'Lyon', rent:980 }, { market:'rent' });
  assert.ok(r.description.includes('Loyer de 980'), 'le vocabulaire de la location n’est pas appliqué');
  assert.ok(!r.description.includes('Prix de'));
});

/* ---------- Score : discriminant et reproductible ---------- */
test('le score sépare une annonce creuse d’une annonce factuelle', () => {
  const creuse = analyze({
    title:'SUPERBE APPARTEMENT !!!',
    description:'Magnifique appartement idéal, très beau, coup de coeur assuré, à saisir rapidement.',
  }, { market:'rent', professional:true });
  const factuelle = analyze({
    title:'Appartement 3 pièces 68 m² avec balcon — Krutenau',
    description:rewriteListing({
      propertyType:'apartment', city:'Strasbourg', district:'Krutenau', surface:68, rooms:3,
      bedrooms:2, bathrooms:1, floor:3, year:1998, charges:180, dpe:'D', hasElevator:true,
      hasBalcony:true, rent:980, availability:'1er mars', transport:'Tram à 4 minutes à pied.',
      landmarks:[{ name:'Commerces rue de Zurich', distance:'3 minutes' }],
      feesNote:'honoraires de 10 € par m²',
    }, { market:'rent' }).description,
  }, { market:'rent', professional:true });
  assert.ok(creuse.score.total < 40, `annonce creuse notée ${creuse.score.total}`);
  assert.ok(factuelle.score.total > creuse.score.total + 25,
    `écart insuffisant : ${creuse.score.total} contre ${factuelle.score.total}`);
});

test('le potentiel ne dépasse jamais ce qui est récupérable axe par axe', () => {
  const a = analyze({ title:'A', description:'Court.' }, { market:'sale' });
  assert.ok(a.score.potential <= 100);
  assert.ok(a.score.potential >= a.score.total);
  assert.ok(a.score.gain === a.score.potential - a.score.total);
  assert.ok(a.score.potential < 100, 'un texte vide ne peut pas promettre un score parfait');
});

/* ---------- Bilan ---------- */
console.log(`\n${passed}/${passed + failures.length} tests unitaires validés`);
if (failures.length){
  console.log('\nDétail des échecs :');
  failures.forEach(f => console.log(`  ${f.name}\n    ${f.err.stack?.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
