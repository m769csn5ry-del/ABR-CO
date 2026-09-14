/* Tableau de bord — ce qui demande une action aujourd'hui, rien d'autre.
 *
 * Toutes les tâches affichées sont dérivées de l'état réel des données
 * (dossiers, relances, commissions, contrats). Aucune n'est décorative :
 * chacune pointe une entité ouvrable.
 */

import { $, esc, num, dateFR } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { renderTopbar } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import { deriveTasks, TASK_TYPES } from '../../domain/crm.js';
import { STAGES } from '../../workflow/dossier.js';
import * as commission from '../../domain/commission.js';
import * as M from '../../domain/money.js';
import { tile, dossierRow } from '../ui.js';

const ROUTE_OF = {
  lead:(id) => `#/crm?lead=${id}`,
  dossier:(id) => `#/dossier/${id}`,
  commission:() => '#/commissions',
  contract:() => '#/clients',
};

export function render(){
  renderTopbar({
    title:'Tableau de bord',
    crumb: esc(ws.org()?.name || ''),
    actions: ws.allows('dossier:write')
      ? '<a class="btn primary" href="#/dossiers/nouveau">Nouveau dossier</a>' : '',
  });

  const dossiers = db.dossiers.all();
  const commissions = db.commissions.all();
  const tasks = deriveTasks({
    leads: db.leads.all(), dossiers, commissions, contracts: db.contracts.all(),
  });

  const cur = ws.currency();
  const pending = commissions.filter(c => ['due','estimated','overdue'].includes(commission.deriveStatus(c)));
  const due = commission.summarize(pending, cur);
  const paid = commission.summarize(commissions.filter(c => c.status === 'paid'), cur);
  const analyzed = dossiers.filter(d => d.analysis?.score);
  const avg = analyzed.length
    ? Math.round(analyzed.reduce((s, d) => s + d.analysis.score.total, 0) / analyzed.length) : null;
  const gained = dossiers.filter(d => d.optimization?.score && d.analysis?.score);
  const avgGain = gained.length
    ? Math.round(gained.reduce((s, d) => s + (d.optimization.score.total - d.analysis.score.total), 0) / gained.length) : null;

  const byStage = {};
  STAGES.forEach(s => { byStage[s.id] = dossiers.filter(d => d.stage === s.id); });

  $('#outlet').innerHTML = `
  <div class="view">
    <div class="tiles">
      ${tile('Dossiers actifs', num(dossiers.filter(d => d.stage !== 'closed').length),
             `${num(dossiers.length)} au total`)}
      ${tile('Score moyen après analyse', avg === null ? '—' : `${num(avg)} <span style="font-size:15px;color:var(--ink-4)">/ 100</span>`,
             analyzed.length ? `sur ${num(analyzed.length)} annonce(s) analysée(s)` : 'aucune analyse exécutée')}
      ${tile('Gain moyen constaté', avgGain === null ? '—' : `+${num(avgGain)} pts`,
             gained.length ? `sur ${num(gained.length)} optimisation(s)` : 'aucune optimisation générée')}
      ${ws.allows('commission:read')
        ? tile('Commissions à encaisser', esc(M.format(due.total)),
               `${num(pending.length)} ligne(s) — ${esc(M.format(paid.total))} déjà encaissé(s)`, 'accent')
        : ''}
    </div>

    <div class="grid split" style="margin-top:var(--gap);align-items:start">
      <section class="card">
        <div class="card-head">
          <div>
            <h3>À traiter</h3>
            <p class="muted" style="font-size:12.4px;margin-top:2px">
              Tâches déduites de l’état réel des dossiers, relances et commissions.
            </p>
          </div>
          <span class="badge ${tasks.length ? 'warn' : 'ok'}">${num(tasks.length)}</span>
        </div>
        ${tasks.length ? `<div>${tasks.slice(0, 12).map(taskRow).join('')}</div>`
          : `<div class="empty">${icon('checkCircle')}<h3>Rien en attente</h3>
             <p>Aucune relance, validation, mesure ou commission n’est échue.</p></div>`}
        ${tasks.length > 12 ? `<div class="card-foot muted">${num(tasks.length - 12)} autre(s) tâche(s) non affichée(s).</div>` : ''}
      </section>

      <section class="card">
        <div class="card-head"><h3>Dossiers par étape</h3></div>
        <div class="card-body">
          ${STAGES.map(s => `
            <div class="row-between" style="padding:7px 0;border-bottom:1px solid var(--line)">
              <span>
                <a href="#/dossiers?etape=${esc(s.id)}" style="font-size:13.2px">${esc(s.label)}</a>
                <div class="muted" style="font-size:11.6px">${esc(s.description || '')}</div>
              </span>
              <span class="badge ${byStage[s.id].length ? 'outline' : ''}">${num(byStage[s.id].length)}</span>
            </div>`).join('')}
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head">
        <h3>Derniers dossiers</h3>
        <a class="btn sm" href="#/dossiers">Tout voir</a>
      </div>
      <div class="card-body">
        ${dossiers.length
          ? `<div class="grid auto-sm">${db.dossiers.recent('updatedAt', 6).map(dossierRow).join('')}</div>`
          : `<div class="empty">${icon('listings')}<h3>Aucun dossier</h3>
             <p>Créez un dossier pour importer une annonce existante et l’analyser.</p>
             ${ws.allows('dossier:write') ? '<a class="btn primary" href="#/dossiers/nouveau">Créer un dossier</a>' : ''}
             </div>`}
      </div>
    </section>
  </div>`;
}

function taskRow(t){
  const href = ROUTE_OF[t.entity.kind]?.(t.entity.id) || '#/';
  return `<a class="task" href="${href}" style="text-decoration:none;color:inherit">
    <span class="prio ${esc(t.priority)}"></span>
    <span class="task-main">
      <span class="task-title">${esc(t.title)}</span>
      <div class="task-detail">${esc(t.detail)}</div>
      <div class="task-due">${esc(TASK_TYPES[t.type]?.label || t.type)} — échéance ${esc(dateFR(t.dueAt))}</div>
    </span>
    ${icon('chevronRight')}
  </a>`;
}
