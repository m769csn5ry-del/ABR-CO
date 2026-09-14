/* Liste des dossiers : pipeline par étape, et création. */

import { $, esc, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { go } from '../../core/router.js';
import { toast, failed } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as svc from '../../domain/dossiers.js';
import { STAGES } from '../../workflow/dossier.js';
import { propertyTypes } from '../../analysis/rewrite.js';
import { dossierRow } from '../ui.js';

export function renderList(_params, query){
  if (!ws.allows('dossier:read')){ $('#outlet').innerHTML = denied('dossier:read'); return; }
  renderTopbar({
    title:'Dossiers', crumb:'Production',
    actions: ws.allows('dossier:write')
      ? '<a class="btn primary" href="#/dossiers/nouveau">Nouveau dossier</a>' : '',
  });

  const filter = query.etape || '';
  const all = svc.list();
  const shown = filter ? all.filter(d => d.stage === filter) : all;

  $('#outlet').innerHTML = `
  <div class="view">
    <div class="filters">
      <a class="chip ${filter ? '' : 'on'}" href="#/dossiers">Tous <span class="count">${num(all.length)}</span></a>
      ${STAGES.map(s => {
        const n = all.filter(d => d.stage === s.id).length;
        return `<a class="chip ${filter === s.id ? 'on' : ''}" href="#/dossiers?etape=${esc(s.id)}">
          ${esc(s.label)} <span class="count">${num(n)}</span></a>`;
      }).join('')}
    </div>

    ${all.length ? `
      <div class="pipeline" style="margin-top:var(--gap)">
        ${STAGES.filter(s => !filter || s.id === filter).map(s => {
          const list = all.filter(d => d.stage === s.id);
          return `<div class="stage-col">
            <div class="stage-head"><span>${esc(s.label)}</span><span class="count">${num(list.length)}</span></div>
            ${list.length ? list.map(dossierRow).join('')
              : '<div class="stage-empty">Aucun dossier</div>'}
          </div>`;
        }).join('')}
      </div>
      ${filter && !shown.length ? `<div class="empty" style="margin-top:var(--gap)"><p>Aucun dossier à cette étape.</p></div>` : ''}
      ${(() => {
        /* Un dossier importé d'une version antérieure peut porter une étape
           inconnue : mieux vaut une colonne « à reprendre » qu'un dossier
           silencieusement absent de tous les écrans. */
        const orphans = all.filter(d => !STAGES.some(s => s.id === d.stage));
        return orphans.length ? `<div class="stage-col" style="margin-top:var(--gap)">
          <div class="stage-head"><span>Étape inconnue — à reprendre</span><span class="count">${num(orphans.length)}</span></div>
          ${orphans.map(dossierRow).join('')}
        </div>` : '';
      })()}
    ` : `<div class="empty" style="margin-top:var(--gap)">${icon('listings')}
        <h3>Aucun dossier</h3>
        <p>Un dossier réunit un client, un bien, l’annonce d’origine, son analyse,
           la version optimisée, les performances et la commission.</p>
        ${ws.allows('dossier:write') ? '<a class="btn primary" href="#/dossiers/nouveau">Créer le premier dossier</a>' : ''}
      </div>`}
  </div>`;
}

export function renderNew(){
  if (!ws.allows('dossier:write')){ $('#outlet').innerHTML = denied('dossier:write'); return; }
  renderTopbar({ title:'Nouveau dossier', crumb:'<a href="#/dossiers">Dossiers</a>' });

  const clients = db.clients.all();

  $('#outlet').innerHTML = `
  <div class="view" style="max-width:780px">
    <form class="card" id="form">
      <div class="card-head"><h3>Informations d’ouverture</h3></div>
      <div class="card-body">
        <p class="subtle" style="margin-bottom:16px">
          Seules les informations que vous fournissez seront utilisées. Aucune
          caractéristique du bien n’est déduite ni inventée : ce qui manque sera
          signalé comme manquant à l’analyse.
        </p>
        <div class="form-grid">
          <label class="field">
            <span>Nom du dossier</span>
            <input class="input" name="name" required placeholder="T3 rue de la Krutenau" autocomplete="off">
          </label>
          <label class="field">
            <span>Client</span>
            <select class="select" name="clientId">
              <option value="">Aucun client rattaché</option>
              ${clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Marché</span>
            <select class="select" name="market">
              <option value="sale">Vente</option>
              <option value="rent">Location longue durée</option>
              <option value="short">Location courte durée</option>
            </select>
          </label>
          <label class="field">
            <span>Type de bien</span>
            <select class="select" name="propertyType">
              ${propertyTypes().map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Ville</span>
            <input class="input" name="city" placeholder="Strasbourg" autocomplete="off">
          </label>
          <label class="field">
            <span>Quartier ou secteur</span>
            <input class="input" name="district" placeholder="Krutenau" autocomplete="off">
          </label>
        </div>
      </div>
      <div class="card-foot" style="display:flex;gap:8px;justify-content:flex-end">
        <a class="btn" href="#/dossiers">Annuler</a>
        <button class="btn primary" type="submit">Créer le dossier</button>
      </div>
    </form>
  </div>`;

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try{
      const d = svc.create({
        name:String(f.get('name') || '').trim(),
        clientId:f.get('clientId') || null,
        market:f.get('market') || 'sale',
        property:{
          propertyType:f.get('propertyType') || 'apartment',
          city:String(f.get('city') || '').trim() || null,
          district:String(f.get('district') || '').trim() || null,
        },
      });
      toast('Dossier créé.');
      go(`/dossier/${d.id}`);
    }catch(err){ failed(err.message); }
  });
}
