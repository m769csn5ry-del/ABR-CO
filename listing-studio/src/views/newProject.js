/* Création d'un projet. */

import { esc, num } from '../core/util.js';
import { icon } from '../core/icons.js';
import { PROPERTY_TYPES } from '../data/options.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { go } from '../core/router.js';
import { toast } from '../core/toast.js';
import { callout } from './components.js';

export default function newProject(outlet){
  const quota = svc.canCreateProject();
  const clients = svc.listClients();
  const templates = svc.allTemplates();

  renderTopbar({ title:'Nouveau projet', crumb:'Création d’une annonce' });

  outlet.innerHTML = `
  <div class="view" style="max-width:860px;margin:0 auto">
    ${!quota.allowed ? `<div style="margin-bottom:18px">${callout(
      `Plan ${esc(quota.plan)} : ${num(quota.used)} projets sur ${num(quota.limit)}. Passez au plan Pro pour continuer, ou supprimez un projet existant.`,
      'warn', 'warning')}</div>` : ''}

    <section class="card">
      <div class="card-head"><h3>Informations de départ</h3>
        <span class="muted" style="font-size:12.4px">Tout reste modifiable ensuite</span></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field span-2"><label for="np-name">Nom du projet</label>
            <input class="input" id="np-name" placeholder="Ex. Villa Casa Azul — Marbella" autofocus></div>
          <div class="field"><label for="np-type">Type de bien</label>
            <select class="select" id="np-type">
              ${PROPERTY_TYPES.map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}
            </select></div>
          <div class="field"><label for="np-city">Ville</label>
            <input class="input" id="np-city" placeholder="Ex. Marbella"></div>
          <div class="field"><label for="np-client">Client</label>
            <select class="select" id="np-client">
              <option value="">Aucun client</option>
              ${clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
            </select></div>
          <div class="field"><label for="np-tpl">Template de départ</label>
            <select class="select" id="np-tpl">
              <option value="">Aucun</option>
              ${templates.map(t => `<option value="${esc(t.id)}">${esc(t.label)} — ${esc(t.category)}</option>`).join('')}
            </select></div>
        </div>
        <div class="row" style="gap:10px;margin-top:20px;flex-wrap:wrap">
          <button class="btn primary lg" id="create" ${quota.allowed ? '' : 'disabled'}>
            ${icon('plus')} Créer le projet</button>
          <a class="btn lg" href="#/demo">${icon('sparkle')} Partir d’une démonstration</a>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head"><h3>Ce qui vous attend</h3></div>
      <div class="card-body">
        <ol style="font-size:13.6px;line-height:1.9;padding-left:20px">
          <li>Fiche du logement : capacité, surface, équipements.</li>
          <li>Positionnement : public, style, points forts, conditions de séjour.</li>
          <li>Photos : import, analyse et notation automatiques.</li>
          <li>Galerie : ordre recommandé et photos manquantes.</li>
          <li>Plateformes, génération de l’annonce, prix, score, aperçu, rapport et export.</li>
        </ol>
      </div>
    </section>
  </div>`;

  outlet.querySelector('#create').addEventListener('click', () => {
    const name = outlet.querySelector('#np-name').value.trim();
    const city = outlet.querySelector('#np-city').value.trim();
    const type = outlet.querySelector('#np-type').value;
    const clientId = outlet.querySelector('#np-client').value || null;
    const tplId = outlet.querySelector('#np-tpl').value;

    const p = svc.createProject({
      name: name || (city ? `Annonce ${city}` : 'Nouveau projet'),
      clientId,
      property:{ name, city, type },
    });
    if (tplId) svc.applyTemplate(p.id, tplId);
    toast('Projet créé. Complétez la fiche du logement.');
    go(`/project/${p.id}/step/1`);
  });
}
