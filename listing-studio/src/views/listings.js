/* « Mes annonces » — liste, recherche, filtres, actions projet. */

import { esc, relTime } from '../core/util.js';
import { icon } from '../core/icons.js';
import { emptyState, scoreBadge, projectCard } from './components.js';
import { PROJECT_STATUSES, projectStatus } from '../data/options.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { go } from '../core/router.js';
import { confirm, openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { labelOf } from '../platforms/index.js';

let state = { q:'', status:'', view:'grid', client:'' };

export default function listings(outlet){
  renderTopbar({
    title:'Mes annonces',
    actions:`<a class="btn primary" href="#/project/new">${icon('plus')} Nouvelle annonce</a>`,
  });
  draw(outlet);
}

function draw(outlet){
  const all = svc.listProjects();
  const clients = svc.listClients();
  const q = state.q.toLowerCase();
  const rows = all.filter(p =>
    (!state.status || p.status === state.status) &&
    (!state.client || p.clientId === state.client) &&
    (!q || [p.name, p.property?.city, p.property?.type].join(' ').toLowerCase().includes(q)));

  outlet.innerHTML = `
  <div class="view">
    <div class="filters">
      <div class="search grow">${icon('search')}
        <input class="input" id="q" placeholder="Rechercher une annonce, une ville…" value="${esc(state.q)}"></div>
      <select class="select" id="status" style="width:auto">
        <option value="">Tous les statuts</option>
        ${PROJECT_STATUSES.map(s => `<option value="${s.id}" ${state.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>
      <select class="select" id="client" style="width:auto">
        <option value="">Tous les clients</option>
        ${clients.map(c => `<option value="${esc(c.id)}" ${state.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
      <div class="btn-group">
        <button data-view="grid" class="${state.view === 'grid' ? 'on' : ''}">Grille</button>
        <button data-view="table" class="${state.view === 'table' ? 'on' : ''}">Tableau</button>
      </div>
    </div>

    ${rows.length === 0 ? `<div class="card">${emptyState({
      title: all.length ? 'Aucun résultat' : 'Aucune annonce',
      text: all.length ? 'Ajustez la recherche ou les filtres.' : 'Créez votre première annonce, ou générez une démonstration complète en une minute.',
      action: all.length ? '' : '<a class="btn primary" href="#/project/new">Créer une annonce</a> <a class="btn" href="#/demo">Générer une démo</a>',
    })}</div>` : state.view === 'grid'
      ? `<div class="grid auto">${rows.map(p => projectCard(p)).join('')}</div>`
      : table(rows)}
  </div>`;

  const rerender = () => draw(outlet);
  outlet.querySelector('#q').addEventListener('input', e => { state.q = e.target.value; rerender(); });
  outlet.querySelector('#status').addEventListener('change', e => { state.status = e.target.value; rerender(); });
  outlet.querySelector('#client').addEventListener('change', e => { state.client = e.target.value; rerender(); });
  outlet.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => { state.view = b.dataset.view; rerender(); }));

  outlet.querySelectorAll('[data-row-id]').forEach(tr => {
    const id = tr.dataset.rowId;
    tr.querySelector('[data-act="open"]')?.addEventListener('click', () => go(`/project/${id}/step/1`));
    tr.querySelector('[data-act="menu"]')?.addEventListener('click', () => projectMenu(id, rerender));
  });
}

function table(rows){
  return `<div class="card"><div class="table-wrap"><table class="tbl">
    <thead><tr><th>Annonce</th><th>Ville</th><th>Statut</th><th>Score</th><th>Plateformes</th><th>Modifié</th><th></th></tr></thead>
    <tbody>
      ${rows.map(p => {
        const st = projectStatus(p.status);
        return `<tr data-row-id="${esc(p.id)}">
          <td><div class="strong">${esc(p.name)}</div>
            <div class="muted" style="font-size:12.2px">${esc(p.property?.name || '')} ${p.isDemo ? '<span class="demo-tag">Démo</span>' : ''}</div></td>
          <td>${esc(p.property?.city || '—')}</td>
          <td><span class="badge ${st.badge}">${esc(st.label)}</span></td>
          <td>${p.score ? scoreBadge(p.score.total) : '<span class="dim">—</span>'}</td>
          <td class="muted" style="font-size:12.4px">${esc(Array.isArray(p.platforms) ? p.platforms.map(labelOf).join(', ') : labelOf(p.platforms))}</td>
          <td class="muted" style="font-size:12.4px">${relTime(p.updatedAt)}</td>
          <td class="actions">
            <button class="btn sm" data-act="open">Ouvrir</button>
            <button class="btn sm" data-act="menu">···</button></td>
        </tr>`;
      }).join('')}
    </tbody></table></div></div>`;
}

function projectMenu(id, rerender){
  const p = svc.getProject(id);
  const versions = svc.listVersions(id);
  openModal({
    title: p.name,
    subtitle:`Statut : ${projectStatus(p.status).label}`,
    body:`
      <div class="col" style="gap:10px">
        <div class="row-wrap" style="gap:8px">
          <a class="btn" href="#/project/${esc(id)}/step/1">Ouvrir le parcours</a>
          <a class="btn" href="#/project/${esc(id)}/preview">Aperçu</a>
          <button class="btn" data-act="duplicate">Dupliquer</button>
          <button class="btn danger" data-act="delete">Supprimer</button>
        </div>
        <div class="field" style="margin-top:8px">
          <label>Statut</label>
          <select class="select" data-status>
            ${PROJECT_STATUSES.map(s => `<option value="${s.id}" ${p.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Client associé</label>
          <select class="select" data-client>
            <option value="">Aucun</option>
            ${svc.listClients().map(c => `<option value="${esc(c.id)}" ${p.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div style="margin-top:6px">
          <div class="eyebrow" style="margin-bottom:8px">Historique des modifications</div>
          <div class="timeline" style="max-height:260px;overflow:auto">
            ${versions.length ? versions.map(v => `
              <div class="tl-item"><div class="rail"><span class="dot"></span><span class="line"></span></div>
                <div class="bd spread">
                  <div><div class="h">${esc(v.label)}</div>
                  <div class="m">${relTime(v.createdAt)}${v.scoreTotal !== null && v.scoreTotal !== undefined ? ` · score ${v.scoreTotal}/100` : ''}</div></div>
                  <button class="btn sm" data-restore="${esc(v.id)}">Restaurer</button>
                </div></div>`).join('')
              : '<p class="muted">Aucune version enregistrée.</p>'}
          </div>
        </div>
      </div>`,
    onMount(h){
      h.el.querySelector('[data-status]').addEventListener('change', e => {
        svc.updateProject(id, { status:e.target.value }); toast('Statut mis à jour.'); rerender();
      });
      h.el.querySelector('[data-client]').addEventListener('change', e => {
        svc.updateProject(id, { clientId:e.target.value || null }); toast('Client associé.'); rerender();
      });
      h.el.querySelector('[data-act="duplicate"]').addEventListener('click', () => {
        const copy = svc.duplicateProject(id);
        h.close(); toast('Projet dupliqué.'); rerender();
        if (copy) go(`/project/${copy.id}/step/1`);
      });
      h.el.querySelector('[data-act="delete"]').addEventListener('click', async () => {
        const ok = await confirm({
          title:'Supprimer ce projet ?', danger:true, confirmLabel:'Supprimer définitivement',
          message:`« ${p.name} » sera supprimé avec ses photos, versions et rapports.`,
          detail:'Cette action est irréversible.',
        });
        if (!ok) return;
        svc.deleteProject(id); h.close(); toast('Projet supprimé.'); rerender();
      });
      h.el.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', async () => {
        const ok = await confirm({ title:'Restaurer cette version ?', message:'L’état actuel sera d’abord sauvegardé dans l’historique.' });
        if (!ok) return;
        svc.restoreVersion(b.dataset.restore);
        h.close(); toast('Version restaurée.'); rerender();
      }));
    },
  });
}
