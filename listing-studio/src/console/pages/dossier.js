/* Détail d'un dossier — l'écran de travail quotidien.
 *
 * Cinq onglets : la fiche, l'analyse, l'optimisation, les performances, les
 * finances. Chaque action visible est une action que le rôle courant a le
 * droit d'exécuter ; les autres sont masquées plutôt que désactivées.
 */

import { $, esc, num, dateFR, relTime, copy } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { go } from '../../core/router.js';
import { toast, failed, saved } from '../../core/toast.js';

import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as svc from '../../domain/dossiers.js';
import * as M from '../../domain/money.js';
import { METRICS } from '../../domain/performance.js';
import { STATUS_LABELS, STATUS_FLOW } from '../../domain/commission.js';
import { trail } from '../../domain/audit.js';
import { auditDraft, deliveryDraft, paymentDraft } from '../../domain/outreach.js';
import {
  stageFlow, scoreBlock, axesList, problemList, fmt, dash, formModal, perDay,
} from '../ui.js';

const TABS = [
  { id:'fiche',        label:'Fiche' },
  { id:'analyse',      label:'Analyse' },
  { id:'optimisation', label:'Optimisation' },
  { id:'performances', label:'Performances' },
  { id:'finances',     label:'Finances' },
  { id:'messages',     label:'Messages' },
  { id:'journal',      label:'Journal' },
];

let busy = false;

export function render(params){
  const id = params.id;
  const tab = TABS.some(t => t.id === params.tab) ? params.tab : 'fiche';
  if (!ws.allows('dossier:read')){ $('#outlet').innerHTML = denied('dossier:read'); return; }

  const d = svc.get(id);
  if (!d){
    renderTopbar({ title:'Dossier introuvable', crumb:'<a href="#/dossiers">Dossiers</a>' });
    $('#outlet').innerHTML = `<div class="view"><div class="empty">${icon('warning')}
      <h3>Dossier introuvable</h3>
      <p>Ce dossier n’existe pas, ou appartient à une autre organisation.</p>
      <a class="btn" href="#/dossiers">Retour aux dossiers</a></div></div>`;
    return;
  }

  const st = svc.status(id);
  renderTopbar({
    title: d.name,
    crumb: `<a href="#/dossiers">Dossiers</a> — ${esc(st.label)}`,
    actions: primaryAction(d, st),
  });

  $('#outlet').innerHTML = `
  <div class="view">
    <section class="card" style="margin-bottom:var(--gap)">
      <div class="card-body tight">
        ${stageFlow(d.stage)}
        <div class="row-between" style="margin-top:12px">
          <span class="subtle"><b>Prochaine action :</b> ${esc(st.nextAction)}</span>
          <span class="badge outline">${num(Math.round(st.progress))} % du parcours</span>
        </div>
        ${st.blockers.length ? `<div class="callout warn" style="margin-top:12px">
          <b>Ce qui bloque le passage à l’étape suivante</b>
          <ul style="margin:6px 0 0 18px">${st.blockers.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </section>

    <div class="tabs" role="tablist">
      ${TABS.map(t => `<a class="tab ${t.id === tab ? 'on' : ''}" href="#/dossier/${esc(id)}/${t.id}">${esc(t.label)}</a>`).join('')}
    </div>

    <div id="tabBody" style="margin-top:var(--gap)"></div>
  </div>`;

  wirePrimary(d);
  ({ fiche, analyse, optimisation, performances, finances, messages, journal })[tab](d, st);
}

const reload = (id, tab) => go(`/dossier/${id}/${tab}`, { replace:true });

function primaryAction(d, st){
  if (d.stage === 'intake' || !d.listing?.title)
    return ws.allows('listing:write') ? '<button class="btn primary" id="act">Importer l’annonce</button>' : '';
  if (!d.analysis)
    return ws.allows('analysis:run') ? '<button class="btn primary" id="act">Lancer l’analyse</button>' : '';
  if (!d.optimization)
    return ws.allows('dossier:write') ? '<button class="btn primary" id="act">Générer la version optimisée</button>' : '';
  if (d.stage === 'optimized')
    return ws.allows('dossier:validate') ? '<button class="btn primary" id="act">Valider l’optimisation</button>' : '';
  if (d.stage === 'validated')
    return ws.allows('dossier:publish') ? '<button class="btn primary" id="act">Marquer comme publiée</button>' : '';
  return '';
}

/* ---------- Onglet : fiche ---------- */
function fiche(d){
  const p = d.property || {};
  const det = d.listing?.detection;
  const body = $('#tabBody');

  const facts = [
    ['Type', label(p.propertyType)], ['Ville', p.city], ['Quartier', p.district],
    ['Surface', p.surface ? `${num(p.surface)} m²` : null],
    ['Pièces', p.rooms], ['Chambres', p.bedrooms], ['Étage', p.floor],
    ['DPE', p.dpe], ['Prix', p.price ? `${num(p.price)} €` : null],
    ['Charges', p.charges ? `${num(p.charges)} € / mois` : null],
    ['Année de construction', p.year], ['Transports', p.transport],
  ];

  body.innerHTML = `
  <div class="grid split" style="align-items:start">
    <section class="card">
      <div class="card-head">
        <h3>Annonce d’origine</h3>
        ${ws.allows('listing:write') ? '<button class="btn sm" id="import">Importer / remplacer</button>' : ''}
      </div>
      <div class="card-body">
        ${d.listing?.title || d.listing?.description ? `
          <div class="field"><span>Titre</span>
            <div class="compare-text" style="max-height:none">${esc(d.listing.title || '')}</div></div>
          <div class="field" style="margin-top:12px"><span>Description</span>
            <div class="compare-text">${esc(d.listing.description || '')}</div></div>
          <div class="muted" style="font-size:11.8px;margin-top:8px">
            Importée ${esc(relTime(d.listing.importedAt))}${d.listing.reference?.url ? ` — référence : <a href="${esc(d.listing.reference.url)}" target="_blank" rel="noopener nofollow">${esc(d.listing.reference.host || 'lien')}</a>` : ''}
          </div>
          ${d.listing.reference?.url ? `<div class="callout plain" style="margin-top:8px">
            Le lien est conservé comme référence uniquement. Aucun contenu n’est
            récupéré automatiquement depuis le site : le texte doit être collé.
          </div>` : ''}
        ` : `<div class="empty">${icon('upload')}<h3>Aucune annonce importée</h3>
             <p>Collez le texte de l’annonce existante pour lancer l’analyse.</p>
             ${ws.allows('listing:write') ? '<button class="btn primary" id="import2">Importer l’annonce</button>' : ''}
             </div>`}
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h3>Fiche du bien</h3>
        ${ws.allows('dossier:write') ? '<button class="btn sm" id="editProp">Modifier</button>' : ''}
      </div>
      <div class="card-body">
        <div class="kv">
          ${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${dash(v)}</span></div>`).join('')}
        </div>
        ${det ? `<div class="callout ${det.missing.length ? 'warn' : 'ok'}" style="margin-top:14px">
          <b>Détection automatique : ${num(det.confidence)} % des champs attendus</b>
          ${det.missing.length ? `<div style="margin-top:6px">Non détecté dans le texte, à saisir ou à demander au client :
            ${det.missing.map(m => `<span class="tag">${esc(m)}</span>`).join(' ')}</div>` : ''}
        </div>` : ''}
      </div>
    </section>
  </div>`;

  body.querySelector('#editProp')?.addEventListener('click', () => editProperty(d));
  body.querySelector('#import')?.addEventListener('click', () => importDialog(d));
  body.querySelector('#import2')?.addEventListener('click', () => importDialog(d));
}

const TYPE_LABELS = { apartment:'Appartement', house:'Maison', studio:'Studio', loft:'Loft', land:'Terrain', parking:'Parking', commercial:'Local commercial', building:'Immeuble' };
const label = (t) => TYPE_LABELS[t] || t;

/* ---------- Onglet : analyse ---------- */
function analyse(d){
  const body = $('#tabBody');
  const a = d.analysis;

  if (!a){
    body.innerHTML = `<div class="empty">${icon('chart')}<h3>Analyse non exécutée</h3>
      <p>L’analyse mesure le texte, applique ${'25'} règles typées et note l’annonce
         sur dix axes. Elle est déterministe : deux exécutions sur le même texte
         donnent le même score.</p>
      ${ws.allows('analysis:run') && d.listing?.title ? '<button class="btn primary" id="run">Lancer l’analyse</button>' : ''}
      ${!d.listing?.title ? '<p class="muted">Importez d’abord l’annonce.</p>' : ''}</div>`;
    body.querySelector('#run')?.addEventListener('click', () => runAnalysis(d.id));
    return;
  }

  const byCat = {};
  a.problems.forEach(p => { (byCat[p.categoryLabel] = byCat[p.categoryLabel] || []).push(p); });

  body.innerHTML = `
  <div class="analysis-top">
    <section class="card"><div class="card-body">${scoreBlock(a.score)}</div></section>
    <section class="card">
      <div class="card-head">
        <div>
          <h3>Répartition par axe</h3>
          <p class="muted" style="font-size:12.2px;margin-top:2px">
            Dix axes, cent points. La barre montre les points obtenus, le détail
            explique ce qui les a coûtés.
          </p>
        </div>
        <span class="badge outline">moteur ${esc(a.score.version)}</span>
      </div>
      <div class="card-body">${axesList(a.score)}</div>
    </section>
  </div>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head">
      <div>
        <h3>Problèmes par ordre de priorité</h3>
        <p class="muted" style="font-size:12.2px;margin-top:2px">
          ${num(a.problems.filter(p => p.severity === 'critical').length)} critique(s),
          ${num(a.problems.filter(p => p.severity === 'major').length)} important(s),
          ${num(a.problems.length)} au total.
        </p>
      </div>
      <div class="row" style="gap:8px">
        <a class="btn sm" href="#/rapport/${esc(d.id)}">Rapport client</a>
        ${ws.allows('analysis:run') ? '<button class="btn sm" id="rerun">Relancer</button>' : ''}
        ${ws.allows('dossier:write') ? '<button class="btn primary sm" id="optimize">Générer la version optimisée</button>' : ''}
      </div>
    </div>
    ${problemList(a.problems)}
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Mesures du texte</h3></div>
    <div class="card-body">
      <div class="kv">
        <div><span>Longueur du titre</span><span>${num(a.measures.title.length)} caractères</span></div>
        <div><span>Mots dans la description</span><span>${num(a.measures.description.words)}</span></div>
        <div><span>Phrases</span><span>${num(a.measures.description.sentences)}</span></div>
        <div><span>Longueur moyenne de phrase</span><span>${num(a.measures.description.readability.avgSentence)} mots</span></div>
        <div><span>Lisibilité</span><span>${num(a.measures.description.readability.score)} / 100</span></div>
        <div><span>Paragraphes</span><span>${num(a.measures.description.structure.paragraphs)}</span></div>
        <div><span>Invitation à contacter</span><span>${a.measures.cta ? 'présente' : 'absente'}</span></div>
        <div><span>Marqueurs de confiance</span><span>${num(a.measures.trustMarkers)} sur 12</span></div>
        <div><span>Mots creux relevés</span><span>${a.measures.description.empty.length ? esc(a.measures.description.empty.join(', ')) : 'aucun'}</span></div>
        <div><span>Répétitions</span><span>${a.measures.description.repetitions.length ? esc(a.measures.description.repetitions.map(r => `${r.word} (${r.count})`).join(', ')) : 'aucune'}</span></div>
      </div>
      <p class="subtle" style="margin-top:14px">
        Ces mesures sont calculées localement, sans appel externe. Le score en
        découle par des règles fixes : il ne dépend d’aucun modèle génératif.
      </p>
    </div>
  </section>`;

  body.querySelector('#rerun')?.addEventListener('click', () => runAnalysis(d.id));
  body.querySelector('#optimize')?.addEventListener('click', () => optimize(d.id));
}

/* ---------- Onglet : optimisation ---------- */
function optimisation(d){
  const body = $('#tabBody');
  const versions = svc.versions(d.id);
  const v = versions[0];

  if (!v){
    body.innerHTML = `<div class="empty">${icon('sparkle')}<h3>Aucune version générée</h3>
      <p>La version optimisée est construite à partir de la fiche du bien.
         Les informations absentes de la fiche ne sont pas inventées : elles sont
         listées comme manquantes.</p>
      ${d.analysis && ws.allows('dossier:write') ? '<button class="btn primary" id="optimize">Générer la version optimisée</button>' : '<p class="muted">Lancez d’abord l’analyse.</p>'}</div>`;
    body.querySelector('#optimize')?.addEventListener('click', () => optimize(d.id));
    return;
  }

  const before = d.analysis?.score;
  const after = v.score;
  const c = v.content;

  body.innerHTML = `
  <section class="card">
    <div class="card-head">
      <div>
        <h3>Version ${num(v.number)}</h3>
        <p class="muted" style="font-size:12.2px;margin-top:2px">
          ${esc(dateFR(v.createdAt, true))} — état : ${esc({ to_validate:'en attente de validation', validated:'validée', rejected:'refusée', published:'publiée' }[v.status] || v.status)}
        </p>
      </div>
      <div class="row" style="gap:8px">
        <button class="btn sm" id="copyTxt">Copier le texte</button>
        ${v.status === 'to_validate' && ws.allows('dossier:validate')
          ? '<button class="btn sm" id="reject">Refuser</button><button class="btn primary sm" id="validate">Valider</button>' : ''}
        ${v.status === 'validated' && ws.allows('dossier:publish')
          ? '<button class="btn primary sm" id="publish">Marquer comme publiée</button>' : ''}
      </div>
    </div>
    <div class="card-body">
      ${before && after ? `<div class="tiles" style="margin-bottom:16px">
        <div class="tile"><div class="tile-label">Score d’origine</div><div class="tile-value">${num(before.total)}</div></div>
        <div class="tile accent"><div class="tile-label">Score de la version</div><div class="tile-value">${num(after.total)}</div></div>
        <div class="tile"><div class="tile-label">Écart</div><div class="tile-value">${after.total >= before.total ? '+' : ''}${num(after.total - before.total)} pts</div>
          <div class="tile-note">mesuré par le même moteur, sur le même barème</div></div>
      </div>` : ''}

      <div class="compare">
        <div class="compare-col">
          <h4>Avant</h4>
          <div class="compare-text">${esc([d.listing?.title, '', d.listing?.description].filter(x => x !== undefined).join('\n'))}</div>
        </div>
        <div class="compare-col">
          <h4>Après</h4>
          <div class="compare-text" id="afterText">${esc([c.title, '', c.description, '', c.cta].join('\n'))}</div>
        </div>
      </div>

      ${v.changeSummary?.length ? `<div class="callout ok" style="margin-top:16px">
        <b>Ce qui a changé</b>
        <ul class="delta" style="margin:6px 0 0 0">${v.changeSummary.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>` : ''}

      ${c.missing?.length ? `<div class="callout warn" style="margin-top:12px">
        <b>Informations manquantes — non inventées</b>
        <div style="margin-top:6px">${c.missing.map(m => `<span class="tag">${esc(m)}</span>`).join(' ')}</div>
        <div style="margin-top:6px;font-size:12.2px">
          Complétez la fiche du bien puis régénérez : chacune de ces informations
          fait gagner des points sur l’axe « Informations ».
        </div>
      </div>` : ''}
    </div>
  </section>

  ${c.titleVariants?.length ? `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Variantes de titre</h3></div>
    <div class="card-body"><div class="list">
      ${c.titleVariants.map(t => `<div class="list-item"><span>${esc(t)}</span><span class="muted num">${num(t.length)} car.</span></div>`).join('')}
    </div></div>
  </section>` : ''}

  ${c.faq?.length ? `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Questions fréquentes suggérées</h3></div>
    <div class="card-body"><div class="list">
      ${c.faq.map(f => `<div class="list-item" style="display:block">
        <div style="font-weight:560">${esc(f.q)}</div>
        <div class="subtle">${esc(f.a)}</div></div>`).join('')}
    </div></div>
  </section>` : ''}

  ${versions.length > 1 ? `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Historique des versions</h3></div>
    <div class="card-body"><div class="list">
      ${versions.map(x => `<div class="list-item">
        <span>Version ${num(x.number)} — ${esc(dateFR(x.createdAt, true))}</span>
        <span class="badge outline">${num(x.score?.total ?? 0)} / 100</span></div>`).join('')}
    </div></div>
  </section>` : ''}`;

  body.querySelector('#copyTxt')?.addEventListener('click', async () => {
    await copy([c.title, '', c.description, '', c.cta].join('\n'));
    saved('Texte copié');
  });
  body.querySelector('#validate')?.addEventListener('click', () => validate(d.id, v.id, true));
  body.querySelector('#reject')?.addEventListener('click', () => validate(d.id, v.id, false));
  body.querySelector('#publish')?.addEventListener('click', () => publish(d.id));
}

/* ---------- Onglet : performances ---------- */
function performances(d){
  const body = $('#tabBody');
  const cmp = svc.performance(d.id);
  const list = svc.readings(d.id).sort((a, b) => b.from - a.from);

  body.innerHTML = `
  <section class="card">
    <div class="card-head">
      <div>
        <h3>Avant / après publication</h3>
        <p class="muted" style="font-size:12.2px;margin-top:2px">Valeurs normalisées par jour de diffusion.</p>
      </div>
      ${ws.allows('performance:write') ? '<button class="btn sm" id="addReading">Saisir un relevé</button>' : ''}
    </div>
    <div class="card-body">
      ${cmp.metrics.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Indicateur</th><th class="num">Avant / jour</th><th class="num">Après / jour</th><th class="num">Écart</th></tr></thead>
          <tbody>${cmp.metrics.map(m => `<tr>
            <td>${esc(m.label)}</td>
            <td class="num">${perDay(m.beforePerDay)}</td>
            <td class="num">${perDay(m.afterPerDay)}</td>
            <td class="num"><span class="badge ${m.improved ? 'ok' : 'bad'}">
              ${m.delta >= 0 ? '+' : ''}${perDay(m.delta)}${m.deltaPct === null ? '' : ` (${m.deltaPct >= 0 ? '+' : ''}${num(m.deltaPct)} %)`}
            </span></td></tr>`).join('')}</tbody>
        </table></div>
        <div class="callout ${cmp.reliability === 'good' ? 'ok' : cmp.reliability === 'indicative' ? 'warn' : 'bad'}" style="margin-top:14px">
          <b>Fiabilité : ${esc({ good:'suffisante', indicative:'indicative', insufficient:'insuffisante' }[cmp.reliability])}</b>
          <div style="margin-top:4px">${esc(cmp.note)}</div>
        </div>
        <p class="subtle" style="margin-top:10px">${esc(cmp.disclaimer)}</p>
      ` : `<div class="empty">${icon('chart')}<h3>Pas encore de comparaison</h3>
           <p>${esc(cmp.note || 'Saisissez un relevé avant et un relevé après optimisation.')}</p>
           ${ws.allows('performance:write') ? '<button class="btn primary" id="addReading2">Saisir un relevé</button>' : ''}</div>`}
    </div>
  </section>

  ${list.length ? `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Relevés saisis</h3></div>
    <div class="card-body"><div class="list">
      ${list.map(r => `<div class="list-item">
        <span>${esc(r.phase === 'before' ? 'Avant' : 'Après')} — du ${esc(dateFR(r.from))} au ${esc(dateFR(r.to))}</span>
        <span class="muted">${esc(METRICS.filter(m => r.values[m.id] !== undefined && r.values[m.id] !== null)
          .map(m => `${m.label} : ${num(r.values[m.id])}`).join(' — ') || 'aucune valeur')}</span>
      </div>`).join('')}
    </div></div>
  </section>` : ''}`;

  body.querySelector('#addReading')?.addEventListener('click', () => readingDialog(d));
  body.querySelector('#addReading2')?.addEventListener('click', () => readingDialog(d));
}

/* ---------- Onglet : finances ---------- */
function finances(d){
  const body = $('#tabBody');
  if (!ws.allows('commission:read')){ body.innerHTML = denied('commission:read'); return; }

  const txs = db.transactions.where(t => t.dossierId === d.id);
  const coms = svc.commissionsOf(d.id);
  const att = svc.attribution(d.id);
  const contract = d.clientId ? db.contracts.first(c => c.clientId === d.clientId && c.status === 'active') : null;

  body.innerHTML = `
  ${!contract ? `<div class="callout warn">
    <b>Aucun contrat actif pour ce client</b>
    <div style="margin-top:4px">La commission ne peut pas être calculée sans contrat :
      le moteur refuse d’estimer un montant sur une base non convenue.
      <a href="#/clients">Définir un contrat</a>.</div>
  </div>` : `<div class="callout plain">
    <b>Contrat appliqué :</b> ${esc(contract.label || contract.terms?.modelLabel || 'contrat actif')} —
    règlement à ${num(contract.paymentTermDays ?? 30)} jours.
  </div>`}

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head">
      <h3>Transactions</h3>
      ${ws.allows('transaction:write') ? '<button class="btn sm" id="addTx">Enregistrer une transaction</button>' : ''}
    </div>
    <div class="card-body">
      ${txs.length ? `<div class="list">${txs.map(t => `<div class="list-item">
        <span>${esc(t.reference || 'Sans référence')} — ${esc(dateFR(t.closedAt))}</span>
        <span>
          <span class="num" style="font-weight:560">${esc(fmt(t.amount))}</span>
          ${t.agencyCommission ? `<span class="muted num" style="margin-left:10px">commission agence : ${esc(fmt(t.agencyCommission))}</span>` : ''}
          ${!coms.some(c => c.transactionId === t.id) ? `<button class="btn sm" data-compute="${esc(t.id)}" style="margin-left:10px">Calculer la commission</button>` : ''}
        </span></div>`).join('')}</div>`
        : `<div class="empty">${icon('euro')}<h3>Aucune transaction</h3>
           <p>Enregistrez la transaction une fois le bien vendu ou loué.</p></div>`}
    </div>
  </section>

  ${coms.map(c => commissionCard(c)).join('')}

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Chaîne d’attribution</h3></div>
    <div class="card-body">
      <div class="kv">
        <div><span>Score avant</span><span>${att.scoreBefore === null ? '—' : `${num(att.scoreBefore)} / 100`}</span></div>
        <div><span>Score après</span><span>${att.scoreAfter === null ? '—' : `${num(att.scoreAfter)} / 100`}</span></div>
        <div><span>Version publiée</span><span>${att.versionId ? esc(att.versionId) : '—'}</span></div>
        <div><span>Publiée le</span><span>${att.publishedAt ? esc(dateFR(att.publishedAt)) : '—'}</span></div>
        <div><span>Relevés de performance</span><span>${num(att.readings)}</span></div>
        <div><span>Transaction</span><span>${att.transactionAt ? esc(dateFR(att.transactionAt)) : '—'}</span></div>
        <div><span>Commission</span><span>${att.commissionId ? 'calculée' : '—'}</span></div>
      </div>
      <div class="callout ${att.complete ? 'ok' : 'plain'}" style="margin-top:14px">
        ${att.complete
          ? 'Chaîne complète : optimisation, publication, transaction et commission sont reliées.'
          : 'Chaîne incomplète : certains maillons manquent encore pour relier l’optimisation au résultat.'}
      </div>
    </div>
  </section>`;

  body.querySelector('#addTx')?.addEventListener('click', () => transactionDialog(d));
  body.querySelectorAll('[data-compute]').forEach(b => b.addEventListener('click', () => {
    try{
      const r = svc.computeCommission(d.id, b.dataset.compute);
      if (!r.ok){ failed(r.problems[0]?.message || 'Calcul impossible.'); return; }
      toast(`Commission calculée : ${M.format(r.amount)}.`);
      reload(d.id, 'finances');
    }catch(err){ failed(err.message); }
  }));
  body.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
    const [cid, status] = b.dataset.status.split('|');
    try{
      svc.setCommissionStatus(cid, status);
      toast(`Statut : ${STATUS_LABELS[status]}.`);
      reload(d.id, 'finances');
    }catch(err){ failed(err.message); }
  }));
}

/* Le moteur autorise « estimée → estimée » pour qu'un recalcul conserve le
   statut. Ce n'est pas une action à proposer : un bouton qui ne change rien
   fait douter de celui d'à côté. */
const nextStatuses = (status) => (STATUS_FLOW[status] || []).filter(s => s !== status);

function commissionCard(c){
  const next = nextStatuses(c.status);
  /* La trace se termine déjà par la TVA et le total : les répéter sous le net
     dû donnerait deux fois les mêmes lignes dans un ordre incompréhensible. */
  const steps = c.trace.filter(t => t.label !== 'TVA' && t.label !== 'Total TTC');
  return `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head">
      <div>
        <h3>Commission — ${esc(c.modelLabel)}</h3>
        <p class="muted" style="font-size:12.2px;margin-top:2px">
          Moteur ${esc(c.engineVersion)} — calculée le ${esc(dateFR(c.computedAt, true))}
          ${c.dueAt ? ` — exigible le ${esc(dateFR(c.dueAt))}` : ''}
        </p>
      </div>
      <div class="row" style="gap:8px">
        <span class="badge ${c.status === 'paid' ? 'ok' : c.status === 'overdue' ? 'bad' : 'warn'}">${esc(STATUS_LABELS[c.status])}</span>
        ${ws.allows('commission:write') ? next.map(s =>
          `<button class="btn sm" data-status="${esc(c.id)}|${esc(s)}">${esc(STATUS_LABELS[s])}</button>`).join('') : ''}
      </div>
    </div>
    <div class="card-body">
      <table class="trace">
        ${steps.map(t => `<tr>
          <td>${esc(t.label)}<div class="t-detail">${esc(t.detail)}</div></td>
          <td class="t-amount">${esc(fmt(t.amount))}</td></tr>`).join('')}
        <tr class="total"><td>Net dû</td><td class="t-amount">${esc(fmt(c.amount))}</td></tr>
        ${c.vat && c.vat.amount ? `<tr><td>TVA</td><td class="t-amount">${esc(fmt(c.vat))}</td></tr>
        <tr class="total"><td>Total TTC</td><td class="t-amount">${esc(fmt(c.gross))}</td></tr>` : ''}
      </table>
      <p class="subtle" style="margin-top:12px">
        Chaque ligne est reproductible : le montant ne provient d’aucun modèle
        génératif, seulement des termes du contrat et de la transaction.
      </p>
    </div>
  </section>`;
}

/* ---------- Onglet : messages ---------- */
/* Les brouillons sont construits à partir de l'état réel du dossier. Rien
   n'est envoyé : aucun service de messagerie n'est connecté. */
function messages(d){
  const client = d.clientId ? db.clients.find(d.clientId) : null;
  const com = svc.commissionsOf(d.id).find(c => c.status === 'due' || c.status === 'overdue');
  const drafts = [
    { id:'audit',    label:'Envoi de l’audit',
      when:'dès que l’analyse est faite', draft: auditDraft(d, client?.name) },
    { id:'delivery', label:'Remise de la version optimisée',
      when:'quand une version est générée', draft: deliveryDraft(d, client?.name) },
    { id:'payment',  label:'Relance de règlement',
      when:'quand une commission est exigible',
      draft: com ? paymentDraft(com, client?.name) : null },
  ];

  $('#tabBody').innerHTML = `
  <div class="callout plain">
    Ces messages sont rédigés à partir des chiffres du dossier. Aucun n’est
    envoyé : relisez, copiez, envoyez depuis votre propre messagerie.
    ${client ? '' : ' Rattachez un client au dossier pour personnaliser l’adresse.'}
  </div>

  ${drafts.map(x => `<section class="card" style="margin-top:var(--gap)">
    <div class="card-head">
      <div>
        <h3>${esc(x.label)}</h3>
        <p class="muted" style="font-size:12.2px;margin-top:2px">
          ${x.draft ? esc(x.draft.reason) : `Disponible ${esc(x.when)}.`}
        </p>
      </div>
      ${x.draft ? `<button class="btn sm" data-copy="${esc(x.id)}">Copier</button>` : ''}
    </div>
    ${x.draft ? `<div class="card-body">
      <div class="field"><span>Objet</span>
        <div class="compare-text" style="max-height:none">${esc(x.draft.subject)}</div></div>
      <div class="field" style="margin-top:10px"><span>Message</span>
        <div class="compare-text" id="body-${esc(x.id)}">${esc(x.draft.body)}</div></div>
    </div>` : ''}
  </section>`).join('')}`;

  $('#tabBody').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const x = drafts.find(y => y.id === b.dataset.copy);
    await copy(`${x.draft.subject}\n\n${x.draft.body}`);
    saved('Message copié');
  }));
}

/* ---------- Onglet : journal ---------- */
function journal(d){
  const entries = trail(d.id, 100);
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Journal du dossier</h3></div>
    <div class="card-body">
      ${entries.length ? `<div class="timeline">${entries.map(e => `
        <div class="tl-item">
          <div style="font-size:13px;font-weight:560">${esc(e.note || e.action)}</div>
          <div class="muted" style="font-size:11.8px">${esc(dateFR(e.at, true))} — ${esc(e.action)}</div>
        </div>`).join('')}</div>`
        : '<div class="empty"><p>Aucune entrée pour ce dossier.</p></div>'}
    </div>
  </section>`;
}

/* ---------- Actions ---------- */
async function runAnalysis(id){
  if (busy) return; busy = true;
  try{ const a = await svc.runAnalysis(id); toast(`Analyse terminée : ${a.score.total} / 100.`); reload(id, 'analyse'); }
  catch(err){ failed(err.message); }
  finally{ busy = false; }
}

async function optimize(id){
  if (busy) return; busy = true;
  try{ const r = await svc.optimize(id); toast(`Version générée : ${r.score.total} / 100.`); reload(id, 'optimisation'); }
  catch(err){ failed(err.message); }
  finally{ busy = false; }
}

function validate(dossierId, versionId, approved){
  try{
    svc.validateVersion(dossierId, versionId, { approved });
    toast(approved ? 'Version validée.' : 'Version refusée.');
    reload(dossierId, 'optimisation');
  }catch(err){ failed(err.message); }
}

function publish(id){
  formModal({
    title:'Marquer l’annonce comme publiée',
    submitLabel:'Confirmer',
    body:`<p class="subtle">Le système n’envoie rien vers un portail : aucune
      intégration de publication n’est connectée. Vous déclarez ici une
      publication faite par ailleurs, pour dater le suivi des performances.</p>
      <label class="field" style="margin-top:12px"><span>Support de publication</span>
        <input class="input" id="pf" placeholder="Portail, site de l’agence, vitrine…" autocomplete="off"></label>`,
    onSubmit(b){
      try{
        svc.markPublished(id, { platform: b.querySelector('#pf')?.value.trim() || '' });
        toast('Publication enregistrée.');
        reload(id, 'performances');
      }catch(err){ failed(err.message); return false; }
    },
  });
}

function importDialog(d){
  formModal({
    title:'Importer l’annonce existante', wide:true, submitLabel:'Importer',
    body:`
      <label class="field"><span>Lien de l’annonce (facultatif, conservé comme référence)</span>
        <input class="input" id="url" placeholder="https://…" value="${esc(d.listing?.reference?.url || '')}" autocomplete="off"></label>
      <div class="callout plain" style="margin:10px 0">
        Aucune récupération automatique n’est effectuée depuis le lien : les
        portails l’interdisent dans leurs conditions d’utilisation. Collez le
        texte visible de l’annonce.
      </div>
      <label class="field"><span>Texte de l’annonce</span>
        <textarea class="textarea" id="raw" rows="12" placeholder="Titre puis description, tels qu’ils apparaissent en ligne.">${esc(d.listing?.raw || '')}</textarea></label>`,
    onSubmit(b){
      const raw = b.querySelector('#raw')?.value.trim() || '';
      const url = b.querySelector('#url')?.value.trim() || '';
      if (!raw){ failed('Collez le texte de l’annonce.'); return false; }
      try{
        svc.importListing(d.id, { raw, url });
        toast('Annonce importée.');
        reload(d.id, 'fiche');
      }catch(err){ failed(err.message); return false; }
    },
  });
}

const NUMERIC = ['surface','rooms','bedrooms','bathrooms','floor','year','price','charges'];

function editProperty(d){
  const p = d.property || {};
  const fields = [
    ['city','Ville','text'], ['district','Quartier','text'],
    ['surface','Surface (m²)','number'], ['rooms','Pièces','number'],
    ['bedrooms','Chambres','number'], ['bathrooms','Salles de bain','number'],
    ['floor','Étage','number'], ['year','Année de construction','number'],
    ['price','Prix (€)','number'], ['charges','Charges (€ / mois)','number'],
    ['dpe','DPE (A à G)','text'], ['transport','Transports à proximité','text'],
  ];
  formModal({
    title:'Fiche du bien', wide:true,
    body:`<p class="subtle">Laissez vide ce que vous ne savez pas : un champ vide
      est signalé comme manquant, jamais comblé par une valeur plausible.</p>
      <div class="form-grid c3" style="margin-top:14px">
        ${fields.map(([k, l, t]) => `<label class="field"><span>${esc(l)}</span>
          <input class="input" data-k="${esc(k)}" type="${t}" value="${esc(p[k] ?? '')}" autocomplete="off"></label>`).join('')}
      </div>`,
    onSubmit(b){
      const patch = { ...p };
      b.querySelectorAll('[data-k]').forEach(i => {
        const k = i.dataset.k; const v = i.value.trim();
        patch[k] = v === '' ? null : (NUMERIC.includes(k) ? Number(v) : v);
      });
      try{ svc.update(d.id, { property:patch }, 'Fiche du bien mise à jour'); saved(); reload(d.id, 'fiche'); }
      catch(err){ failed(err.message); return false; }
    },
  });
}

function readingDialog(d){
  const today = new Date().toISOString().slice(0, 10);
  const ago = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  formModal({
    title:'Saisir un relevé de performance', wide:true,
    body:`<div class="form-grid">
        <label class="field"><span>Phase</span>
          <select class="select" id="phase">
            <option value="before">Avant optimisation</option>
            <option value="after">Après optimisation</option>
          </select></label>
        <label class="field"><span>Du</span><input class="input" type="date" id="from" value="${ago}"></label>
        <label class="field"><span>Au</span><input class="input" type="date" id="to" value="${today}"></label>
      </div>
      <div class="form-grid c3" style="margin-top:12px">
        ${METRICS.map(m => `<label class="field"><span>${esc(m.label)}</span>
          <input class="input" type="number" min="0" data-m="${esc(m.id)}" placeholder="—"></label>`).join('')}
      </div>
      <p class="subtle" style="margin-top:12px">Les valeurs proviennent des
        statistiques du portail où l’annonce est diffusée : elles sont saisies,
        jamais estimées par le système.</p>`,
    onSubmit(b){
      const values = {};
      b.querySelectorAll('[data-m]').forEach(i => { if (i.value !== '') values[i.dataset.m] = Number(i.value); });
      if (!Object.keys(values).length){ failed('Saisissez au moins une valeur.'); return false; }
      try{
        svc.addReading(d.id, {
          phase:b.querySelector('#phase').value,
          from:new Date(b.querySelector('#from').value).getTime(),
          to:new Date(b.querySelector('#to').value).getTime(),
          values,
        });
        saved('Relevé enregistré');
        reload(d.id, 'performances');
      }catch(err){ failed(err.message); return false; }
    },
  });
}

function transactionDialog(d){
  formModal({
    title:'Enregistrer la transaction',
    body:`<div class="form-grid">
        <label class="field"><span>Montant de la transaction (${esc(d.currency || ws.currency())})</span>
          <input class="input" type="number" id="amount" min="0" step="0.01" required></label>
        <label class="field"><span>Commission de l’agence (facultatif)</span>
          <input class="input" type="number" id="agency" min="0" step="0.01" placeholder="—"></label>
        <label class="field"><span>Référence</span>
          <input class="input" id="ref" placeholder="Numéro d’acte, mandat…" autocomplete="off"></label>
        <label class="field"><span>Date de conclusion</span>
          <input class="input" type="date" id="closed" value="${new Date().toISOString().slice(0, 10)}"></label>
      </div>
      <p class="subtle" style="margin-top:12px">Les montants sont stockés en
        centimes entiers : aucun arrondi flottant n’intervient dans le calcul de
        la commission.</p>`,
    onSubmit(b){
      const amount = Number(b.querySelector('#amount').value);
      if (!amount){ failed('Saisissez le montant de la transaction.'); return false; }
      const agency = b.querySelector('#agency').value;
      try{
        svc.recordTransaction(d.id, {
          amount: Math.round(amount * 100),
          agencyCommission: agency === '' ? null : Math.round(Number(agency) * 100),
          reference: b.querySelector('#ref').value.trim(),
          closedAt: new Date(b.querySelector('#closed').value).getTime(),
        });
        saved('Transaction enregistrée');
        reload(d.id, 'finances');
      }catch(err){ failed(err.message); return false; }
    },
  });
}

/* Action principale de la barre d'en-tête : déléguée à l'onglet concerné. */
function wirePrimary(d){
  const btn = document.getElementById('act');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (d.stage === 'intake' || !d.listing?.title) return importDialog(d);
    if (!d.analysis) return runAnalysis(d.id);
    if (!d.optimization) return optimize(d.id);
    if (d.stage === 'optimized') return go(`/dossier/${d.id}/optimisation`);
    if (d.stage === 'validated') return publish(d.id);
  });
}
