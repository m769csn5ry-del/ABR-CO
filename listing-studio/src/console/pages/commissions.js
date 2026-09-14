/* Commissions — ce qui est dû, à qui, depuis quand, et pourquoi ce montant.
 *
 * Chaque ligne affiche sa trace de calcul : le chiffre n'est jamais opaque.
 */

import { $, esc, num, dateFR } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { failed, toast } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as svc from '../../domain/dossiers.js';
import * as commission from '../../domain/commission.js';
import * as M from '../../domain/money.js';
import { fmt, tile } from '../ui.js';

export function render(_params, query){
  if (!ws.allows('commission:read')){ $('#outlet').innerHTML = denied('commission:read'); return; }
  renderTopbar({ title:'Commissions', crumb:'Finances' });

  const cur = ws.currency();
  const all = db.commissions.all().map(c => ({ ...c, status: commission.deriveStatus(c) }));
  const filter = query.statut || '';
  const shown = filter ? all.filter(c => c.status === filter) : all;
  const sum = commission.summarize(all, cur);
  const clients = Object.fromEntries(db.clients.all().map(c => [c.id, c.name]));
  const dossiers = Object.fromEntries(db.dossiers.all().map(d => [d.id, d.name]));

  $('#outlet').innerHTML = `
  <div class="view">
    <div class="tiles">
      ${tile('Encaissé', esc(M.format(sum.paid)), `${num(sum.byStatus.paid.count)} ligne(s)`)}
      ${tile('À encaisser', esc(M.format(sum.receivable)),
             `${num(sum.byStatus.due.count + sum.byStatus.overdue.count)} ligne(s) exigible(s)`, 'accent')}
      ${tile('En retard', esc(M.format(sum.byStatus.overdue.amount)),
             `${num(sum.byStatus.overdue.count)} ligne(s) au-delà de l’échéance`)}
      ${tile('Estimé, non exigible', esc(M.format(sum.byStatus.estimated.amount)),
             `${num(sum.byStatus.estimated.count)} ligne(s) en attente de confirmation`)}
    </div>

    <div class="filters" style="margin-top:var(--gap)">
      <a class="chip ${filter ? '' : 'on'}" href="#/commissions">Toutes <span class="count">${num(all.length)}</span></a>
      ${commission.STATUSES.map(s => `<a class="chip ${filter === s ? 'on' : ''}" href="#/commissions?statut=${esc(s)}">
        ${esc(commission.STATUS_LABELS[s])} <span class="count">${num(sum.byStatus[s].count)}</span></a>`).join('')}
    </div>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head"><h3>Lignes de commission</h3></div>
      ${shown.length ? `<div class="table-wrap"><table>
        <thead><tr>
          <th>Client</th><th>Dossier</th><th>Modèle</th>
          <th class="num">Net</th><th>Échéance</th><th>Statut</th><th></th>
        </tr></thead>
        <tbody>${shown.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)).map(c => `
          <tr>
            <td>${esc(clients[c.clientId] || '—')}</td>
            <td><a href="#/dossier/${esc(c.dossierId)}/finances">${esc(dossiers[c.dossierId] || c.dossierId)}</a></td>
            <td>${esc(c.modelLabel)}</td>
            <td class="num" style="font-weight:560">${esc(fmt(c.amount))}</td>
            <td>${c.dueAt ? esc(dateFR(c.dueAt)) : '—'}</td>
            <td><span class="badge ${c.status === 'paid' ? 'ok' : c.status === 'overdue' ? 'bad' : 'warn'}">
              ${esc(commission.STATUS_LABELS[c.status])}</span></td>
            <td class="nowrap">${ws.allows('commission:write')
              ? (commission.STATUS_FLOW[c.status] || []).filter(s => s !== c.status).map(s =>
                  `<button class="btn sm" data-go="${esc(c.id)}|${esc(s)}">${esc(commission.STATUS_LABELS[s])}</button>`).join(' ')
              : ''}</td>
          </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty">${icon('euro')}<h3>Aucune commission</h3>
        <p>Une commission apparaît quand une transaction est enregistrée sur un
           dossier dont le client a un contrat actif.</p></div>`}
    </section>

    <p class="subtle" style="margin-top:14px">
      Les montants ne sont additionnés qu’entre lignes de même devise. Le détail
      du calcul de chaque ligne est consultable depuis l’onglet Finances du
      dossier correspondant.
    </p>
  </div>`;

  $('#outlet').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const [id, status] = b.dataset.go.split('|');
    try{
      svc.setCommissionStatus(id, status);
      toast(`Statut : ${commission.STATUS_LABELS[status]}.`);
      render(_params, query);
    }catch(err){ failed(err.message); }
  }));
}
