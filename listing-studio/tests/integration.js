/* Test d'intégration du parcours critique.
 *
 *   node tests/integration.js
 *
 * Il déroule la chaîne complète : client, contrat, dossier, import, analyse,
 * optimisation, validation, publication, performances, transaction,
 * commission, encaissement — puis vérifie l'isolation entre organisations et
 * le respect des permissions. C'est ce test qui dit si le produit fonctionne.
 */

import assert from 'node:assert/strict';

/* Environnement navigateur minimal : le magasin local vit en mémoire. */
globalThis.localStorage = {
  s:new Map(),
  getItem(k){ return this.s.get(k) ?? null; },
  setItem(k, v){ this.s.set(k, String(v)); },
  removeItem(k){ this.s.delete(k); },
};

const db = await import('../src/core/db.js');
const WS = await import('../src/domain/workspace.js');
const D = await import('../src/domain/dossiers.js');
const M = await import('../src/domain/money.js');
const C = await import('../src/domain/commission.js');
const P = await import('../src/domain/permissions.js');
const CRM = await import('../src/domain/crm.js');
const Audit = await import('../src/domain/audit.js');
const Ledger = await import('../src/ai/ledger.js');

let passed = 0; const failures = [];
const step = async (name, fn) => {
  try{ await fn(); passed++; console.log(`  OK   ${name}`); }
  catch(err){ failures.push({ name, err }); console.log(`  ÉCHEC ${name}\n         ${err.message}`); }
};

console.log('\nParcours critique');

const boot = WS.bootstrap();
let client, contract, dossier, version, tx, com;

await step('1. Amorçage : utilisateur, organisation, appartenance', () => {
  assert.ok(boot.user.id && boot.org.id, 'espace non créé');
  assert.equal(boot.membership.role, 'owner');
  assert.ok(WS.allows('commission:settle'), 'le propriétaire doit tout pouvoir');
});

await step('2. Création d’un client', () => {
  client = db.clients.insert({ name:'Agence Kléber', email:'contact@kleber.test', status:'client' });
  assert.equal(db.clients.all().length, 1);
});

await step('3. Contrat : 15 % de la commission d’agence', () => {
  contract = db.contracts.insert({
    clientId:client.id, status:'active', paymentTermDays:30,
    terms:{ model:'percent_agency', rate:15, currency:'EUR' },
    startsAt:Date.now(),
  });
  assert.deepEqual(C.validateConfig(contract.terms), [], 'contrat invalide');
});

await step('4. Création du dossier', () => {
  dossier = D.create({ name:'T3 Krutenau', clientId:client.id, market:'sale',
    property:{ city:'Strasbourg', district:'Krutenau', propertyType:'apartment' } });
  assert.equal(dossier.stage, 'intake');
  assert.equal(D.status(dossier.id).nextAction, 'Importer l’annonce et les photos');
});

await step('4b. Blocage expliqué quand une information manque', () => {
  const vide = D.create({ name:'Sans ville', market:'sale' });
  D.importListing(vide.id, { raw:'Appartement 50 m²' });
  const st = D.status(vide.id);
  assert.equal(st.stage, 'intake', 'le dossier ne doit pas avancer sans ville');
  assert.ok(st.recordedBlockers.some(b => /ville/i.test(b)), 'la raison du blocage doit être inscrite');
});

await step('5. Import de l’annonce collée', () => {
  const raw = `SUPERBE APPARTEMENT 3 PIECES !!!
Bel appartement bien situé proche commodités. Cuisine équipée. 72 m² au 3ème étage avec ascenseur.
2 chambres. Charges 180 € par mois. Prix 289 000 €.`;
  const d = D.importListing(dossier.id, { raw, url:'https://www.seloger.com/annonces/exemple' });
  assert.equal(d.stage, 'imported', 'le dossier doit avancer après import');
  assert.equal(d.property.surface, 72);
  assert.equal(d.property.price, 289000);
  assert.equal(d.property.charges, 180);
  assert.ok(d.listing.reference.host.includes('seloger'), 'référence d’URL conservée');
  assert.ok(d.original, 'l’annonce d’origine doit être conservée');
});

await step('6. Analyse : score, axes, problèmes priorisés', async () => {
  const a = await D.runAnalysis(dossier.id);
  assert.ok(a.score.total > 0 && a.score.total < 60, `score attendu bas, obtenu ${a.score.total}`);
  assert.equal(a.score.axes.length, 10);
  assert.ok(a.problems.length >= 5, 'trop peu de problèmes détectés');
  assert.equal(a.problems[0].priority, 1);
  assert.ok(a.problems.every(p => p.recommendation && p.impact >= 0), 'problème sans recommandation');
  assert.equal(D.get(dossier.id).stage, 'analyzed');
});

await step('7. Score reproductible sur deux exécutions', async () => {
  const a1 = (await D.runAnalysis(dossier.id)).score.total;
  const a2 = (await D.runAnalysis(dossier.id)).score.total;
  assert.equal(a1, a2, 'le score doit être déterministe');
});

await step('8. Optimisation : version générée et meilleure que l’originale', async () => {
  db.dossiers.update(dossier.id, { property:{ ...D.get(dossier.id).property,
    city:'Strasbourg', district:'Krutenau', rooms:3, bedrooms:2, bathrooms:1, dpe:'D', ges:'C',
    orientation:'sud', hasBalcony:true, year:1978, feesNote:'honoraires à la charge du vendeur',
    availability:'au 1er décembre', landmarks:[{ name:'Tram Université', distance:'6 min à pied' }] } });
  const r = await D.optimize(dossier.id);
  version = r.version;
  const before = D.get(dossier.id).analysis.score.total;
  assert.ok(r.score.total > before, `la version optimisée (${r.score.total}) doit dépasser l’originale (${before})`);
  assert.ok(r.content.title.length >= 20 && r.content.title.length <= 90);
  assert.ok(r.content.description.split('\n\n').length >= 4, 'description non structurée');
  assert.ok(version.changeSummary.length > 0, 'aucun changement résumé');
  assert.equal(D.get(dossier.id).stage, 'optimized');
});

await step('9. Aucune donnée inventée dans la version générée', () => {
  const content = D.get(dossier.id).optimization.content;
  const text = `${content.title} ${content.description}`;
  assert.ok(!/\b95 m²|\b4 chambres|piscine|jardin/.test(text), 'caractéristique absente de la fiche présente dans le texte');
  const surfaces = text.match(/(\d+)\s?m²/g) || [];
  surfaces.forEach(s => assert.equal(s.replace(/\D/g, ''), '72', `surface inventée : ${s}`));
});

await step('10. Publication refusée sans validation humaine', () => {
  assert.throws(() => D.markPublished(dossier.id, { platform:'SeLoger' }), /validation humaine/);
});

await step('11. Validation puis publication', () => {
  D.validateVersion(dossier.id, version.id, { approved:true, note:'Relu et conforme' });
  assert.equal(D.get(dossier.id).stage, 'validated');
  const d = D.markPublished(dossier.id, { platform:'SeLoger' });
  assert.equal(d.stage, 'published');
  assert.ok(d.publishedAt);
});

await step('12. Saut d’étape interdit', () => {
  const d2 = D.create({ name:'Test saut', market:'sale' });
  assert.throws(() => D.moveTo(d2.id, 'closed'), /non prévu/);
});

await step('13. Performances avant / après', () => {
  const day = 86400000, now = Date.now();
  D.addReading(dossier.id, { phase:'before', from:now - 60 * day, to:now - 30 * day, values:{ views:300, contacts:6 } });
  D.addReading(dossier.id, { phase:'after', from:now - 30 * day, to:now, values:{ views:540, contacts:14 } });
  const perf = D.performance(dossier.id);
  assert.equal(perf.reliability, 'good');
  assert.ok(perf.metrics.find(m => m.id === 'views').improved);
  assert.ok(perf.disclaimer.includes('causalité'), 'le rappel sur la causalité doit rester affiché');
  assert.equal(D.get(dossier.id).stage, 'tracking');
});

await step('14. Transaction enregistrée', () => {
  tx = D.recordTransaction(dossier.id, { amount:28900000, agencyCommission:1445000, type:'sale', reference:'V-2026-018' });
  assert.equal(M.deserialize(tx.amount).amount, 28900000);
});

await step('15. Commission calculée par le moteur, avec sa trace', () => {
  const r = D.computeCommission(dossier.id, tx.id);
  assert.ok(r.ok, JSON.stringify(r.problems));
  com = r.commission;
  assert.equal(M.deserialize(com.amount).amount, 216750, '15 % de 14 450 € = 2 167,50 €');
  assert.ok(com.trace.length >= 2, 'trace de calcul absente');
  assert.equal(com.status, 'estimated');
  assert.ok(com.dueAt > tx.closedAt, 'échéance non calculée');
});

await step('16. Cycle de la commission : estimée → exigible → payée', () => {
  D.setCommissionStatus(com.id, 'due');
  assert.throws(() => D.setCommissionStatus(com.id, 'estimated'), /non autorisé/);
  const paid = D.setCommissionStatus(com.id, 'paid', { note:'Virement reçu' });
  assert.equal(paid.status, 'paid');
  assert.ok(paid.paidAt);
});

await step('17. Chaîne d’attribution complète', () => {
  const chain = D.attribution(dossier.id);
  assert.ok(chain.complete, 'chaîne incomplète');
  assert.ok(chain.optimizedAt && chain.publishedAt && chain.transactionId && chain.commissionId);
  assert.ok(chain.scoreBefore < chain.scoreAfter);
});

console.log('\nIsolation, permissions, journalisation');

await step('18. Isolation entre organisations', () => {
  const other = WS.createOrganization({ name:'Agence concurrente' });
  WS.switchOrg(other.id);
  assert.equal(db.dossiers.all().length, 0, 'les dossiers ne doivent pas traverser les organisations');
  assert.equal(db.clients.all().length, 0);
  assert.equal(db.dossiers.find(dossier.id), null, 'accès par identifiant direct interdit');
  assert.equal(db.commissions.find(com.id), null);
  WS.switchOrg(boot.org.id);
  assert.ok(db.dossiers.all().length >= 2, 'retour dans l’organisation d’origine');
});

await step('19. Permissions : un opérateur ne valide pas et n’encaisse pas', () => {
  const m = { role:'operator' };
  assert.equal(P.can(m, 'dossier:write'), true);
  assert.equal(P.can(m, 'dossier:validate'), false);
  assert.equal(P.can(m, 'commission:settle'), false);
  assert.equal(P.can({ role:'client' }, 'commission:read'), false);
  assert.throws(() => P.assertCan(m, 'commission:settle'), /Permission requise/);
});

await step('20. Journal d’audit : les actions financières sont tracées', () => {
  const trail = Audit.recent(200);
  assert.ok(trail.some(l => l.action === 'commission.compute'), 'calcul de commission non journalisé');
  assert.ok(trail.some(l => l.action === 'commission.status'), 'changement de statut non journalisé');
  assert.ok(trail.some(l => l.action === 'dossier.validate'), 'validation non journalisée');
  assert.ok(trail.every(l => l.actorId), 'action sans auteur');
});

await step('21. Journal IA : chaque exécution est mesurée', () => {
  const s = Ledger.summary();
  assert.ok(s.calls >= 4, `appels non journalisés (${s.calls})`);
  assert.equal(s.errors, 0);
  assert.ok(s.byTask.listing_analysis >= 3);
  assert.ok(s.byTask.listing_rewrite >= 1);
});

await step('22. Tâches dérivées de l’état réel', () => {
  const stale = db.leads.insert({ name:'Conciergerie Azur', status:'audit_sent',
    lastContactAt:Date.now() - 9 * 86400000 });
  const tasks = CRM.deriveTasks({ leads:db.leads.all(), dossiers:db.dossiers.all(),
    commissions:db.commissions.all(), contracts:db.contracts.all() });
  assert.ok(tasks.some(t => t.entity.id === stale.id), 'relance non détectée');
  assert.ok(tasks.every(t => t.title && t.detail && t.entity), 'tâche incomplète');
});

await step('23. Export limité à l’organisation courante', () => {
  const dump = db.exportOrg();
  assert.equal(dump.orgId, boot.org.id);
  assert.ok(dump.tables.dossiers.every(d => d.orgId === boot.org.id), 'fuite entre organisations');
});

console.log(`\n${passed}/${passed + failures.length} étapes validées`);
if (failures.length){
  failures.forEach(f => console.log(`\n${f.name}\n${f.err.stack?.split('\n').slice(0, 4).join('\n')}`));
  process.exit(1);
}
