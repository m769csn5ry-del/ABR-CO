/* Coquille applicative : barre latérale, en-tête, ouverture/fermeture de
   l'assistant, indicateur de plan. Rendue une fois puis mise à jour. */

import { $, esc, num } from '../core/util.js';
import { icon } from '../core/icons.js';
import { go, currentRoute } from '../core/router.js';
import * as svc from '../data/projects.js';
import { plan as planOf } from '../data/options.js';
import { on as onEvent } from '../core/events.js';
import * as ai from '../ai/engine.js';

const NAV = [
  { group:'Pilotage', items:[
    { id:'dashboard', label:'Tableau de bord', icon:'dashboard', href:'#/app' },
    { id:'new',       label:'Nouveau projet',  icon:'plus',      href:'#/project/new' },
  ]},
  { group:'Production', items:[
    { id:'listings',  label:'Mes annonces',      icon:'listings',  href:'#/projects', count:() => svc.listProjects().length },
    { id:'photos',    label:'Bibliothèque',      icon:'photos',    href:'#/library' },
    { id:'templates', label:'Templates',         icon:'templates', href:'#/templates' },
  ]},
  { group:'Relation client', items:[
    { id:'clients',   label:'Clients',  icon:'clients', href:'#/clients', count:() => svc.listClients().length },
    { id:'reports',   label:'Rapports', icon:'reports', href:'#/reports', count:() => svc.listReports().length },
  ]},
  { group:'Espace', items:[
    { id:'settings',  label:'Paramètres', icon:'settings', href:'#/settings' },
  ]},
];

let assistantOpen = false;

export function renderShell(){
  renderSidebar();
  wire();
  onEvent('db:change', () => renderSidebar());
  onEvent('project:update', () => renderSidebar());
  onEvent('ai:mode', () => renderSidebar());
}

/** Rafraîchit la seule barre latérale : la barre d'en-tête appartient à la vue
    affichée, la réécrire ici effacerait ses actions. */
export const refreshNav = () => renderSidebar();

function renderSidebar(){
  const u = svc.user();
  const p = planOf(u.plan);
  const quota = svc.canCreateProject();
  const used = quota.used, limit = quota.limit;
  const pct = limit === Infinity ? 12 : Math.min(100, Math.round((used / limit) * 100));
  const meterCls = limit === Infinity ? '' : pct >= 100 ? 'bad' : pct >= 70 ? 'warn' : '';
  const mode = ai.describeMode();
  const active = currentRoute().path;

  $('#sidebar').innerHTML = `
    <a class="brand" href="#/app" style="text-decoration:none;color:inherit">
      <span class="brand-mark">LS</span>
      <span>
        <span class="brand-name">${esc(u.settings?.brandName || 'Listing Studio')}</span>
        <span class="brand-sub">${esc(u.name || 'Espace de travail')}</span>
      </span>
    </a>
    <nav class="nav" aria-label="Navigation principale">
      ${NAV.map(g => `
        <div class="nav-group">
          <div class="nav-label">${esc(g.group)}</div>
          ${g.items.map(i => {
            const isActive = active.startsWith(i.href.replace('#', '')) ||
              (i.id === 'listings' && active.startsWith('/project/') && active !== '/project/new');
            const c = i.count?.();
            return `<a class="nav-item ${isActive ? 'active' : ''}" href="${i.href}">
              ${icon(i.icon)}<span class="grow">${esc(i.label)}</span>
              ${c ? `<span class="count">${num(c)}</span>` : ''}</a>`;
          }).join('')}
        </div>`).join('')}
    </nav>
    <div class="sidebar-foot">
      <div class="plan-card">
        <div class="spread">
          <div>
            <div class="eyebrow">Plan ${esc(p.label)}</div>
            <div style="font-size:12.6px;margin-top:2px" class="muted">
              ${limit === Infinity ? 'Projets illimités' : `${num(used)} / ${num(limit)} projets`}
            </div>
          </div>
          <a class="btn sm" href="#/settings?tab=plan">Gérer</a>
        </div>
        <div class="meter ${meterCls}"><i style="width:${pct}%"></i></div>
        <div class="row" style="margin-top:10px;gap:6px">
          <span class="badge ${mode.id === 'server' ? 'ok' : 'outline'}">
            <span class="dot"></span>${esc(mode.label)}</span>
        </div>
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
    <div class="row" style="gap:8px">${actions}
      <button class="icon-btn" id="toggleAssistant" aria-label="Assistant IA" title="Assistant IA">${icon('chat')}</button>
    </div>`;
  $('#burger')?.addEventListener('click', () => document.getElementById('app').classList.toggle('nav-open'));
  $('#toggleAssistant')?.addEventListener('click', () => toggleAssistant());
}

function wire(){
  $('#scrim')?.addEventListener('click', () => document.getElementById('app').classList.remove('nav-open'));
  $('#assistantFab')?.addEventListener('click', () => toggleAssistant(true));
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (a) document.getElementById('app').classList.remove('nav-open');
  });
}

export function toggleAssistant(force){
  assistantOpen = force === undefined ? !assistantOpen : force;
  document.getElementById('app').classList.toggle('with-assistant', assistantOpen);
  if (assistantOpen) document.dispatchEvent(new CustomEvent('assistant:open'));
}
export const isAssistantOpen = () => assistantOpen;

export function setChrome(on){
  const app = document.getElementById('app');
  app.classList.toggle('chrome-off', !on);
  if (!on) app.classList.remove('nav-open');
}

export { go };
