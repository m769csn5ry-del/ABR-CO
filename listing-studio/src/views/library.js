/* Bibliothèque centralisée — photos, annonces, clients, templates, rapports. */

import { esc, num, relTime, dateFR } from '../core/util.js';
import { icon } from '../core/icons.js';
import { emptyState, scoreBadge } from './components.js';
import * as svc from '../data/projects.js';
import { photoUrl } from '../data/projects.js';
import { photoCategory, PHOTO_CATEGORIES, clientStatus } from '../data/options.js';
import { renderTopbar } from './shell.js';
import { openModal } from '../core/modal.js';
import { go } from '../core/router.js';

const TABS = [
  { id:'photos',    label:'Photos' },
  { id:'listings',  label:'Annonces' },
  { id:'clients',   label:'Clients' },
  { id:'templates', label:'Templates' },
  { id:'reports',   label:'Rapports' },
];

let state = { tab:'photos', q:'', cat:'', project:'' };

export default function library(outlet, params = {}){
  if (params.tab) state.tab = params.tab;
  renderTopbar({ title:'Bibliothèque', crumb:'Tous vos éléments réutilisables' });
  draw(outlet);
}

function draw(outlet){
  outlet.innerHTML = `
  <div class="view">
    <div class="tabs" style="margin-bottom:18px">
      ${TABS.map(t => `<button class="tab ${state.tab === t.id ? 'on' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`).join('')}
    </div>
    <div id="libBody"></div>
  </div>`;
  outlet.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => { state.tab = b.dataset.tab; draw(outlet); }));
  const body = outlet.querySelector('#libBody');
  ({ photos:photosTab, listings:listingsTab, clients:clientsTab, templates:templatesTab, reports:reportsTab })[state.tab](body, outlet);
}

function filters(extra = ''){
  return `<div class="filters">
    <div class="search grow">${icon('search')}
      <input class="input" id="libq" placeholder="Rechercher…" value="${esc(state.q)}"></div>
    ${extra}
  </div>`;
}

function wireSearch(body, outlet){
  body.querySelector('#libq')?.addEventListener('input', e => { state.q = e.target.value; draw(outlet); });
}

function photosTab(body, outlet){
  const projects = svc.listProjects();
  const all = projects.flatMap(p => svc.getPhotos(p.id).map(ph => ({ ...ph, projectName:p.name })));
  const q = state.q.toLowerCase();
  const rows = all.filter(p =>
    (!state.cat || p.category === state.cat) &&
    (!state.project || p.projectId === state.project) &&
    (!q || [p.filename, p.label, p.projectName].join(' ').toLowerCase().includes(q)));

  body.innerHTML = `
    ${filters(`
      <select class="select" id="cat" style="width:auto">
        <option value="">Toutes les pièces</option>
        ${PHOTO_CATEGORIES.map(c => `<option value="${c.id}" ${state.cat === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
      </select>
      <select class="select" id="proj" style="width:auto">
        <option value="">Tous les projets</option>
        ${projects.map(p => `<option value="${esc(p.id)}" ${state.project === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select>`)}
    ${rows.length ? `<div class="lib-grid">${rows.map(p => `
      <div class="lib-tile" data-photo="${esc(p.id)}">
        <div class="ph"><img data-src="${esc(p.id)}" alt="${esc(p.label || '')}" loading="lazy"></div>
        <div class="bd">
          <div class="spread"><span class="strong truncate">${esc(photoCategory(p.category).label)}</span>
            ${scoreBadge(p.analysis?.scores?.score)}</div>
          <div class="dim truncate" style="font-size:11.5px">${esc(p.projectName)}</div>
        </div>
      </div>`).join('')}</div>`
      : `<div class="card">${emptyState({ ic:'photos', title:'Aucune photo', text:'Les photos importées dans vos projets apparaissent ici.' })}</div>`}`;

  wireSearch(body, outlet);
  body.querySelector('#cat')?.addEventListener('change', e => { state.cat = e.target.value; draw(outlet); });
  body.querySelector('#proj')?.addEventListener('change', e => { state.project = e.target.value; draw(outlet); });

  rows.forEach(async p => {
    const url = await photoUrl(p);
    const img = body.querySelector(`img[data-src="${p.id}"]`);
    if (img && url) img.src = url;
  });

  body.querySelectorAll('[data-photo]').forEach(tile => tile.addEventListener('click', async () => {
    const p = rows.find(x => x.id === tile.dataset.photo);
    const url = await photoUrl(p);
    openModal({
      title: p.label || p.filename, subtitle:`${p.projectName} · ${photoCategory(p.category).label}`, wide:true,
      body:`<img src="${esc(url || '')}" alt="" style="width:100%;border-radius:10px">
        <div class="row-wrap" style="gap:8px;margin-top:14px">
          ${(p.analysis?.recommendations || []).map(r => `<span class="badge ${r.level === 'ok' ? 'ok' : r.level === 'bad' ? 'bad' : 'warn'}">${esc(r.text)}</span>`).join('')}
        </div>`,
      footer:`<a class="btn primary" href="#/project/${esc(p.projectId)}/step/3">Ouvrir le projet</a>`,
    });
  }));
}

function listingsTab(body, outlet){
  const q = state.q.toLowerCase();
  const rows = svc.listProjects().filter(p => p.content &&
    (!q || [p.name, p.content.title, p.property?.city].join(' ').toLowerCase().includes(q)));
  body.innerHTML = `${filters()}
    ${rows.length ? `<div class="card list">${rows.map(p => `
      <a class="list-item" href="#/project/${esc(p.id)}/step/7">
        <span class="thumb">${icon('listings')}</span>
        <span class="grow"><span class="strong truncate" style="display:block">${esc(p.content.title)}</span>
          <span class="muted" style="font-size:12.3px">${esc(p.name)} · ${relTime(p.updatedAt)}</span></span>
        ${p.score ? scoreBadge(p.score.total) : ''}
      </a>`).join('')}</div>`
      : `<div class="card">${emptyState({ title:'Aucune annonce rédigée', text:'Les annonces générées apparaissent ici.' })}</div>`}`;
  wireSearch(body, outlet);
}

function clientsTab(body, outlet){
  const q = state.q.toLowerCase();
  const rows = svc.listClients().filter(c => !q || [c.name, c.company].join(' ').toLowerCase().includes(q));
  body.innerHTML = `${filters()}
    ${rows.length ? `<div class="card list">${rows.map(c => `
      <a class="list-item" href="#/clients">
        <span class="thumb">${icon('clients')}</span>
        <span class="grow"><span class="strong" style="display:block">${esc(c.name)}</span>
          <span class="muted" style="font-size:12.3px">${esc(c.company || '')} · ${num(svc.clientProjects(c.id).length)} projet(s)</span></span>
        <span class="badge ${clientStatus(c.status).badge}">${esc(clientStatus(c.status).label)}</span>
      </a>`).join('')}</div>`
      : `<div class="card">${emptyState({ ic:'clients', title:'Aucun client', text:'Ajoutez vos clients depuis l’onglet Clients.' })}</div>`}`;
  wireSearch(body, outlet);
}

function templatesTab(body, outlet){
  const q = state.q.toLowerCase();
  const rows = svc.allTemplates().filter(t => !q || [t.label, t.category].join(' ').toLowerCase().includes(q));
  body.innerHTML = `${filters()}
    <div class="grid auto">${rows.map(t => `
      <div class="card pad">
        <div class="spread"><span class="strong">${esc(t.label)}</span>
          <span class="badge outline">${esc(t.category)}</span></div>
        <p class="muted" style="font-size:12.8px;margin-top:6px">${esc(t.description)}</p>
        <a class="btn sm block" href="#/templates" style="margin-top:12px">Utiliser</a>
      </div>`).join('')}</div>`;
  wireSearch(body, outlet);
}

function reportsTab(body, outlet){
  const q = state.q.toLowerCase();
  const rows = svc.listReports().filter(r => !q || r.title.toLowerCase().includes(q));
  body.innerHTML = `${filters()}
    ${rows.length ? `<div class="card list">${rows.map(r => `
      <a class="list-item" href="#/reports">
        <span class="thumb">${icon('reports')}</span>
        <span class="grow"><span class="strong" style="display:block">${esc(r.title)}</span>
          <span class="muted" style="font-size:12.3px">${dateFR(r.createdAt, true)}</span></span>
        ${r.scoreBefore !== null ? scoreBadge(r.scoreBefore) : ''}
      </a>`).join('')}</div>`
      : `<div class="card">${emptyState({ ic:'reports', title:'Aucun rapport', text:'Générez un rapport depuis l’étape 11 d’un projet.' })}</div>`}`;
  wireSearch(body, outlet);
}
