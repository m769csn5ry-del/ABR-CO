/* Rapports enregistrés. */

import { esc, num, dateFR } from '../core/util.js';
import { icon } from '../core/icons.js';
import { emptyState, scoreBadge } from './components.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { openModal, confirm } from '../core/modal.js';
import { renderReportHTML } from '../report/report.js';
import { printElement } from '../export/index.js';
import { toast } from '../core/toast.js';
import { photoUrlMap } from './preview.js';

export default function reports(outlet){
  renderTopbar({ title:'Rapports', crumb:'Documents remis à vos clients' });
  draw(outlet);
}

function draw(outlet){
  const rows = svc.listReports();
  outlet.innerHTML = `
  <div class="view">
    ${rows.length ? `<div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Rapport</th><th>Client</th><th>Score</th><th>Potentiel</th><th>Créé le</th><th></th></tr></thead>
      <tbody>${rows.map(r => {
        const client = r.clientId ? svc.getClient(r.clientId) : null;
        return `<tr data-r="${esc(r.id)}">
          <td><div class="strong">${esc(r.title)}</div>
            ${r.isDemo ? '<span class="demo-tag">Démo</span>' : ''}</td>
          <td class="muted">${esc(client?.name || '—')}</td>
          <td>${r.scoreBefore !== null ? scoreBadge(r.scoreBefore) : '—'}</td>
          <td>${r.scorePotential !== null ? `<span class="badge ok">${r.scorePotential}/100</span>` : '—'}</td>
          <td class="muted" style="font-size:12.4px">${dateFR(r.createdAt, true)}</td>
          <td class="actions">
            <button class="btn sm" data-act="open">Ouvrir</button>
            <button class="btn sm danger" data-act="del">${icon('trash')}</button></td>
        </tr>`;
      }).join('')}</tbody></table></div></div>`
      : `<div class="card">${emptyState({
          ic:'reports', title:'Aucun rapport',
          text:'Ouvrez un projet, étape « Rapport », puis enregistrez-le pour le retrouver ici.',
          action:'<a class="btn primary" href="#/projects">Voir mes annonces</a>',
        })}</div>`}
  </div>`;

  outlet.querySelectorAll('tr[data-r]').forEach(tr => {
    const id = tr.dataset.r;
    tr.querySelector('[data-act="open"]').addEventListener('click', () => openReport(id));
    tr.querySelector('[data-act="del"]').addEventListener('click', async () => {
      const ok = await confirm({ title:'Supprimer ce rapport ?', danger:true, confirmLabel:'Supprimer',
        message:'Le rapport enregistré sera retiré de la bibliothèque.' });
      if (!ok) return;
      svc.deleteReport(id); toast('Rapport supprimé.'); draw(outlet);
    });
  });
}

async function openReport(id){
  const r = svc.getReport(id);
  if (!r) return;
  const project = svc.getProject(r.projectId);
  const photos = project ? svc.getPhotos(project.id) : [];
  const urls = await photoUrlMap(photos);
  const h = openModal({
    title:r.title, subtitle:dateFR(r.createdAt, true), full:true,
    body: renderReportHTML(r.model, { photoUrls:urls, brand:{ name: svc.settings().brandName } }),
    footer:`<button class="btn" data-close3>Fermer</button>
            <button class="btn primary" data-print>${'Exporter en PDF'}</button>`,
    onMount(handle){
      handle.el.querySelector('[data-close3]').onclick = () => handle.close();
      handle.el.querySelector('[data-print]').onclick = () =>
        printElement(handle.el.querySelector('.report'), { title:r.title });
    },
  });
  void h;
}
