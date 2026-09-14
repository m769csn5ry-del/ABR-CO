/* Coquille de la console : barre latérale, en-tête, contexte d'organisation.
 *
 * La barre latérale n'affiche que ce que le rôle courant a le droit de voir :
 * masquer une entrée interdite évite de proposer une action qui échouera.
 */

import { $, esc, num } from '../core/util.js';
import { icon } from '../core/icons.js';
import { currentRoute } from '../core/router.js';
import { on as onEvent } from '../core/events.js';
import * as ws from '../domain/workspace.js';
import * as db from '../core/db.js';
import { ROLE_LABELS } from '../domain/permissions.js';
import { deriveTasks } from '../domain/crm.js';
import { preview as automationPreview } from '../domain/automations.js';

const NAV = [
  { group:'Pilotage', items:[
    { id:'home',    label:'Tableau de bord', icon:'dashboard', href:'#/',
      count:() => taskCount() },
    { id:'auto',    label:'Automatisations', icon:'refresh', href:'#/automatisations',
      perm:'dossier:read', count:() => pendingCount() },
  ]},
  { group:'Production', items:[
    { id:'dossiers', label:'Dossiers', icon:'listings', href:'#/dossiers',
      perm:'dossier:read', count:() => db.dossiers.count() },
    { id:'new',      label:'Nouveau dossier', icon:'plus', href:'#/dossiers/nouveau',
      perm:'dossier:write' },
    { id:'batch',    label:'Import en lot', icon:'upload', href:'#/dossiers/lot',
      perm:'dossier:write' },
  ]},
  { group:'Relation client', items:[
    { id:'crm',      label:'Pipeline', icon:'clients', href:'#/crm',
      perm:'lead:read', count:() => db.leads.count() },
    { id:'clients',  label:'Clients et contrats', icon:'reports', href:'#/clients',
      perm:'client:read', count:() => db.clients.count() },
  ]},
  { group:'Finances', items:[
    { id:'commissions', label:'Commissions', icon:'euro', href:'#/commissions',
      perm:'commission:read', count:() => db.commissions.count(c => c.status === 'due' || c.status === 'estimated') },
  ]},
  { group:'Espace', items:[
    { id:'admin', label:'Administration', icon:'settings', href:'#/admin', perm:'org:update' },
  ]},
];

function pendingCount(){
  try{ return automationPreview().reduce((s, p) => s + (p.enabled ? p.count : 0), 0); }
  catch{ return 0; }
}

function taskCount(){
  try{
    return deriveTasks({
      leads: db.leads.all(), dossiers: db.dossiers.all(),
      commissions: db.commissions.all(), contracts: db.contracts.all(),
    }).length;
  }catch{ return 0; }
}

export function renderShell(){
  document.getElementById('app').classList.add('console');
  renderSidebar();
  $('#scrim')?.addEventListener('click', () => document.getElementById('app').classList.remove('nav-open'));
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#/"]')) document.getElementById('app').classList.remove('nav-open');
  });
  onEvent('db:change', renderSidebar);
  onEvent('workspace:switch', renderSidebar);
}

export const refreshNav = () => renderSidebar();

function renderSidebar(){
  const org = ws.org(); const me = ws.me(); const m = ws.membership();
  const active = currentRoute().path || '/';

  $('#sidebar').innerHTML = `
    <a class="brand" href="#/" style="text-decoration:none;color:inherit">
      <span class="brand-mark">LS</span>
      <span>
        <span class="brand-name">Console</span>
        <span class="brand-sub">${esc(org?.settings?.brandName || 'Listing Studio')}</span>
      </span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
      ${NAV.map(g => {
        const items = g.items.filter(i => !i.perm || ws.allows(i.perm));
        if (!items.length) return '';
        return `<div class="nav-group">
          <div class="nav-label">${esc(g.group)}</div>
          ${items.map(i => {
            const path = i.href.replace('#', '');
            const isActive = path === '/' ? active === '/' : active.startsWith(path);
            let c = 0; try{ c = i.count?.() || 0; }catch{ c = 0; }
            return `<a class="nav-item ${isActive ? 'active' : ''}" href="${i.href}">
              ${icon(i.icon)}<span class="grow">${esc(i.label)}</span>
              ${c ? `<span class="count">${num(c)}</span>` : ''}</a>`;
          }).join('')}
        </div>`;
      }).join('')}
    </nav>
    <div class="sidebar-foot">
      <div class="ctx" style="margin:0">
        <span class="avatar">${esc((me?.name || '?').slice(0, 2).toUpperCase())}</span>
        <span style="min-width:0">
          <span class="ctx-name truncate">${esc(org?.name || 'Organisation')}</span>
          <span class="ctx-role">${esc(me?.name || '')} — ${esc(ROLE_LABELS[m?.role] || m?.role || 'sans rôle')}</span>
        </span>
      </div>
    </div>`;
}

export function renderTopbar({ title = '', crumb = '', actions = '' } = {}){
  $('#topbar').innerHTML = `
    <button class="icon-btn burger" id="burger" aria-label="Ouvrir le menu">${icon('menu')}</button>
    <div class="grow" style="min-width:0">
      ${crumb ? `<div class="crumb truncate">${crumb}</div>` : ''}
      <h1 class="truncate">${esc(title)}</h1>
    </div>
    <div class="row" style="gap:8px">${actions}</div>`;
  $('#burger')?.addEventListener('click', () => document.getElementById('app').classList.toggle('nav-open'));
}

/** Écran d'accès refusé — explicite, jamais une page blanche. */
export function denied(permission){
  return `<div class="view"><div class="empty">
    ${icon('lock')}
    <h3>Accès refusé</h3>
    <p>Votre rôle (${esc(ROLE_LABELS[ws.membership()?.role] || '—')}) ne comporte pas
       l’autorisation « ${esc(permission)} ». Demandez-la à un administrateur de
       l’organisation.</p>
  </div></div>`;
}
