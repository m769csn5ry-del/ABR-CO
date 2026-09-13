/* CRM simple — clients et projets associés. */

import { esc, num, initials } from '../core/util.js';
import { icon } from '../core/icons.js';
import { emptyState, clientRow } from './components.js';
import { CLIENT_STATUSES, clientStatus } from '../data/options.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { openModal, confirm } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { go } from '../core/router.js';

let q = '';

export default function clients(outlet){
  renderTopbar({
    title:'Clients',
    actions:`<button class="btn primary" id="newClient">${icon('plus')} Nouveau client</button>`,
  });
  draw(outlet);
  document.getElementById('newClient').addEventListener('click', () => editClient(null, () => draw(outlet)));
}

function draw(outlet){
  const all = svc.listClients();
  const rows = all.filter(c => !q || [c.name, c.company, c.email].join(' ').toLowerCase().includes(q.toLowerCase()));

  outlet.innerHTML = `
  <div class="view">
    <div class="filters">
      <div class="search grow">${icon('search')}
        <input class="input" id="cq" placeholder="Rechercher un client…" value="${esc(q)}"></div>
      <div class="row" style="gap:8px">
        ${CLIENT_STATUSES.map(s => `<span class="badge ${s.badge}">${esc(s.label)} · ${num(all.filter(c => c.status === s.id).length)}</span>`).join('')}
      </div>
    </div>
    ${rows.length ? `<div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Client</th><th>Contact</th><th>Logements</th><th>Projets</th><th>Statut</th><th></th></tr></thead>
      <tbody>${rows.map(c => clientRow(c, svc.clientProjects(c.id).length)).join('')}</tbody>
    </table></div></div>` : `<div class="card">${emptyState({
      ic:'clients', title: all.length ? 'Aucun résultat' : 'Aucun client',
      text: all.length ? 'Ajustez votre recherche.' : 'Ajoutez vos propriétaires et conciergeries pour rattacher leurs annonces.',
      action: all.length ? '' : '<button class="btn primary" id="firstClient">Ajouter un client</button>',
    })}</div>`}
  </div>`;

  outlet.querySelector('#cq').addEventListener('input', e => { q = e.target.value; draw(outlet); });
  outlet.querySelector('#firstClient')?.addEventListener('click', () => editClient(null, () => draw(outlet)));
  outlet.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelector('[data-act="edit"]').addEventListener('click', () => editClient(id, () => draw(outlet)));
    tr.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      const c = svc.getClient(id);
      const linked = svc.clientProjects(id).length;
      const ok = await confirm({
        title:'Supprimer ce client ?', danger:true, confirmLabel:'Supprimer',
        message:`« ${c.name} » sera supprimé de votre CRM.`,
        detail: linked ? `${linked} projet(s) resteront, mais ne seront plus rattachés à ce client.` : '',
      });
      if (!ok) return;
      svc.deleteClient(id); toast('Client supprimé.'); draw(outlet);
    });
  });
}

function editClient(id, done){
  const c = id ? svc.getClient(id) : { name:'', email:'', phone:'', company:'', propertiesCount:0, status:'prospect', notes:'' };
  const projects = id ? svc.clientProjects(id) : [];

  openModal({
    title: id ? c.name || 'Client' : 'Nouveau client',
    wide: Boolean(id),
    body:`
      <div class="form-grid">
        <div class="field"><label>Nom</label><input class="input" data-f="name" value="${esc(c.name)}" autofocus></div>
        <div class="field"><label>Entreprise</label><input class="input" data-f="company" value="${esc(c.company)}"></div>
        <div class="field"><label>Email</label><input class="input" type="email" data-f="email" value="${esc(c.email)}"></div>
        <div class="field"><label>Téléphone</label><input class="input" data-f="phone" value="${esc(c.phone)}"></div>
        <div class="field"><label>Nombre de logements</label><input class="input" type="number" min="0" data-f="propertiesCount" value="${esc(c.propertiesCount)}"></div>
        <div class="field"><label>Statut</label><select class="select" data-f="status">
          ${CLIENT_STATUSES.map(s => `<option value="${s.id}" ${c.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
        </select></div>
        <div class="field span-2"><label>Notes</label><textarea class="textarea" data-f="notes">${esc(c.notes)}</textarea></div>
      </div>
      ${id ? `<div style="margin-top:20px">
        <div class="eyebrow" style="margin-bottom:8px">Annonces associées (${num(projects.length)})</div>
        ${projects.length ? `<div class="list card">${projects.map(p => `
          <a class="list-item" href="#/project/${esc(p.id)}/step/1">
            <span class="thumb">${icon('listings')}</span>
            <span class="grow"><span class="strong" style="display:block;font-size:13.4px">${esc(p.name)}</span>
            <span class="muted" style="font-size:12.2px">${esc(p.property?.city || '')}</span></span>
            ${p.score ? `<span class="badge outline">${p.score.total}/100</span>` : ''}
          </a>`).join('')}</div>`
          : '<p class="muted" style="font-size:13px">Aucune annonce rattachée. Associez un projet depuis la fiche du projet.</p>'}
      </div>` : ''}`,
    footer:`<button class="btn" data-cancel>Annuler</button><button class="btn primary" data-save>Enregistrer</button>`,
    onMount(h){
      h.el.querySelector('[data-cancel]').onclick = () => h.close();
      h.el.querySelector('[data-save]').onclick = () => {
        const data = {};
        h.el.querySelectorAll('[data-f]').forEach(el => {
          data[el.dataset.f] = el.type === 'number' ? Number(el.value) : el.value.trim();
        });
        if (!data.name){ toast('Le nom est obligatoire.', 'warn'); return; }
        id ? svc.updateClient(id, data) : svc.createClient(data);
        h.close(); toast(id ? 'Client mis à jour.' : 'Client créé.'); done?.();
      };
    },
  });
}
