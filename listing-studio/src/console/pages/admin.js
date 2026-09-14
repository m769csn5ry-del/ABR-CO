/* Administration — organisation, rôles, indicateurs, journaux.
 *
 * Ce qui est visible ici décrit l'état réel du système, y compris ce qui
 * n'est pas connecté : une intégration absente est annoncée comme absente.
 */

import { $, esc, num, dateFR, download } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { failed, saved, toast } from '../../core/toast.js';
import { confirm as confirmModal } from '../../core/modal.js';
import { renderTopbar, denied, refreshNav } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import { ROLES, ROLE_LABELS, DEFAULT_MATRIX, ALL_PERMISSIONS } from '../../domain/permissions.js';
import * as flags from '../../domain/flags.js';
import { recent as auditRecent } from '../../domain/audit.js';
import { summary as aiSummary, recent as aiRecent } from '../../ai/ledger.js';
import { promptList } from '../../ai/prompts.js';
import { formModal } from '../ui.js';

const TABS = [
  { id:'organisation', label:'Organisation' },
  { id:'equipe',       label:'Équipe et rôles' },
  { id:'options',      label:'Options' },
  { id:'ia',           label:'Journal IA' },
  { id:'audit',        label:'Journal d’audit' },
  { id:'donnees',      label:'Données' },
];

export function render(_params, query){
  if (!ws.allows('org:update')){ $('#outlet').innerHTML = denied('org:update'); return; }
  const tab = TABS.some(t => t.id === query.onglet) ? query.onglet : 'organisation';
  renderTopbar({ title:'Administration', crumb:'Espace' });

  $('#outlet').innerHTML = `
  <div class="view">
    <div class="tabs">${TABS.map(t =>
      `<a class="tab ${t.id === tab ? 'on' : ''}" href="#/admin?onglet=${t.id}">${esc(t.label)}</a>`).join('')}</div>
    <div id="tabBody" style="margin-top:var(--gap)"></div>
  </div>`;

  ({ organisation, equipe, options, ia, audit, donnees })[tab]();
}

const reload = (tab) => render({}, { onglet:tab });

function organisation(){
  const o = ws.org();
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Organisation</h3></div>
    <div class="card-body">
      <form id="orgForm" class="form-grid">
        <label class="field"><span>Nom</span><input class="input" id="name" value="${esc(o.name)}"></label>
        <label class="field"><span>Marque affichée</span><input class="input" id="brand" value="${esc(o.settings?.brandName || '')}"></label>
        <label class="field"><span>Type</span>
          <select class="select" id="kind">
            ${[['agency','Agence'],['manager','Gestionnaire'],['owner','Propriétaire'],['freelance','Indépendant']]
              .map(([v, l]) => `<option value="${v}" ${o.kind === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
        <label class="field"><span>Devise</span>
          <select class="select" id="currency">
            ${['EUR','USD','GBP','CHF','SGD','IDR'].map(c => `<option ${o.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select></label>
        <label class="field"><span>Délai de règlement par défaut (jours)</span>
          <input class="input" type="number" id="term" min="0" value="${num(o.settings?.paymentTermDays ?? 30)}"></label>
      </form>
      <div class="card-foot" style="padding:16px 0 0;display:flex;justify-content:flex-end">
        <button class="btn primary" id="saveOrg">Enregistrer</button>
      </div>
      <div class="callout plain" style="margin-top:14px">
        Changer la devise n’affecte que les nouveaux montants : les montants déjà
        enregistrés conservent la leur et ne sont jamais convertis automatiquement.
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head">
      <h3>Organisations</h3>
      <button class="btn sm" id="newOrg">Créer une organisation</button>
    </div>
    <div class="card-body"><div class="list">
      ${ws.organizations().map(x => `<div class="list-item">
        <span>${esc(x.name)} <span class="muted">— ${esc(ROLE_LABELS[x.role] || x.role)}</span></span>
        ${x.id === ws.org().id ? '<span class="badge ok">courante</span>'
          : `<button class="btn sm" data-switch="${esc(x.id)}">Basculer</button>`}
      </div>`).join('')}
    </div>
    <p class="subtle" style="margin-top:12px">
      Les données de chaque organisation sont cloisonnées : un enregistrement
      d’une autre organisation est illisible depuis celle-ci, même par son
      identifiant.
    </p></div>
  </section>`;

  $('#saveOrg').addEventListener('click', () => {
    try{
      ws.updateOrg({
        name:$('#name').value.trim(),
        kind:$('#kind').value,
        currency:$('#currency').value,
        settings:{ ...ws.org().settings, brandName:$('#brand').value.trim(), paymentTermDays:Number($('#term').value) || 30 },
      });
      saved(); refreshNav(); reload('organisation');
    }catch(err){ failed(err.message); }
  });
  $('#newOrg').addEventListener('click', () => formModal({
    title:'Nouvelle organisation',
    body:`<label class="field"><span>Nom</span><input class="input" id="n" autocomplete="off"></label>
      <p class="subtle" style="margin-top:10px">Vous en serez propriétaire. Ses données
        seront entièrement séparées de l’organisation courante.</p>`,
    onSubmit(b){
      const n = b.querySelector('#n').value.trim();
      if (!n){ failed('Nom obligatoire.'); return false; }
      try{ ws.createOrganization({ name:n }); toast('Organisation créée.'); reload('organisation'); }
      catch(err){ failed(err.message); return false; }
    },
  }));
  $('#tabBody').querySelectorAll('[data-switch]').forEach(b => b.addEventListener('click', () => {
    try{ ws.switchOrg(b.dataset.switch); toast('Organisation active changée.'); refreshNav(); reload('organisation'); }
    catch(err){ failed(err.message); }
  }));
}

function equipe(){
  const list = ws.members();
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head">
      <h3>Membres</h3>
      <button class="btn sm" id="invite">Ajouter un membre</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Courriel</th><th>Rôle</th><th class="num">Autorisations</th></tr></thead>
      <tbody>${list.map(m => `<tr>
        <td>${esc(m.user?.name || '—')}</td>
        <td>${esc(m.user?.email || '—')}</td>
        <td><select class="select" data-role="${esc(m.id)}">
          ${ROLES.map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${esc(ROLE_LABELS[r])}</option>`).join('')}
        </select></td>
        <td class="num">${num(m.permissions)} / ${num(ALL_PERMISSIONS.length)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="card-foot muted">
      L’ajout d’un membre ne déclenche aucun envoi de courriel : aucun service de
      messagerie n’est connecté. Le compte est créé localement dans cette organisation.
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Matrice des autorisations</h3></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Autorisation</th>${ROLES.map(r => `<th class="num">${esc(ROLE_LABELS[r])}</th>`).join('')}</tr></thead>
      <tbody>${ALL_PERMISSIONS.map(p => `<tr>
        <td class="mono">${esc(p)}</td>
        ${ROLES.map(r => {
          const has = DEFAULT_MATRIX[r] === '*' || (DEFAULT_MATRIX[r] || []).includes(p);
          return `<td class="num">${has ? icon('check') : '<span class="muted">—</span>'}</td>`;
        }).join('')}
      </tr>`).join('')}</tbody>
    </table></div>
  </section>`;

  $('#invite').addEventListener('click', () => formModal({
    title:'Ajouter un membre',
    body:`<div class="form-grid">
      <label class="field"><span>Nom</span><input class="input" id="n" autocomplete="off"></label>
      <label class="field"><span>Courriel</span><input class="input" type="email" id="e" autocomplete="off"></label>
      <label class="field"><span>Rôle</span><select class="select" id="r">
        ${ROLES.map(r => `<option value="${r}" ${r === 'operator' ? 'selected' : ''}>${esc(ROLE_LABELS[r])}</option>`).join('')}
      </select></label>
    </div>`,
    onSubmit(b){
      const email = b.querySelector('#e').value.trim();
      if (!email){ failed('Courriel obligatoire.'); return false; }
      try{
        ws.inviteMember({ email, name:b.querySelector('#n').value.trim(), role:b.querySelector('#r').value });
        saved('Membre ajouté'); reload('equipe');
      }catch(err){ failed(err.message); return false; }
    },
  }));
  $('#tabBody').querySelectorAll('[data-role]').forEach(sel => sel.addEventListener('change', () => {
    try{ ws.setMemberRole(sel.dataset.role, sel.value); saved('Rôle modifié'); reload('equipe'); }
    catch(err){ failed(err.message); reload('equipe'); }
  }));
}

function options(){
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Fonctionnalités</h3></div>
    <div class="card-body"><div class="list">
      ${flags.all().map(f => `<div class="list-item">
        <span>
          <span style="font-weight:560">${esc(f.label)}</span>
          <div class="subtle">${esc(f.help)}</div>
        </span>
        <label class="switch">
          <input type="checkbox" data-flag="${esc(f.key)}" ${f.enabled ? 'checked' : ''}>
          <span class="track"></span>
        </label>
      </div>`).join('')}
    </div></div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Registre des instructions IA</h3></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Identifiant</th><th>Version</th><th>Sortie attendue</th></tr></thead>
      <tbody>${promptList().map(p => `<tr>
        <td class="mono">${esc(p.id)}</td>
        <td class="num">${esc(p.version)}</td>
        <td>${esc(Object.keys(p.schema?.properties || {}).join(', ') || '—')}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="card-foot muted">
      Chaque sortie du modèle est validée contre ce schéma avant d’être
      enregistrée. Une réponse non conforme est rejetée, jamais affichée telle quelle.
    </div>
  </section>`;

  $('#tabBody').querySelectorAll('[data-flag]').forEach(c => c.addEventListener('change', () => {
    flags.set(c.dataset.flag, c.checked);
    saved(c.checked ? 'Activé' : 'Désactivé');
  }));
}

function ia(){
  const s = aiSummary({});
  const rows = aiRecent(40);
  $('#tabBody').innerHTML = `
  <div class="tiles">
    <div class="tile"><div class="tile-label">Exécutions</div><div class="tile-value">${num(s.calls)}</div></div>
    <div class="tile"><div class="tile-label">Échecs</div><div class="tile-value">${num(s.errors)}</div>
      <div class="tile-note">${num(s.errorRate)} % des exécutions</div></div>
    <div class="tile"><div class="tile-label">Durée moyenne</div><div class="tile-value">${num(s.avgDuration)} ms</div></div>
    <div class="tile"><div class="tile-label">Coût estimé</div>
      <div class="tile-value">${s.costKnown ? `${num(s.costCents)} ¢` : '0 ¢'}</div>
      <div class="tile-note">${s.costKnown ? 'estimation tarifaire' : 'moteur local : aucun coût externe'}</div></div>
  </div>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Dernières exécutions</h3></div>
    ${rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Tâche</th><th>Moteur</th><th>Instruction</th><th class="num">Durée</th><th>État</th><th>Date</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td class="mono">${esc(r.task)}</td>
        <td>${esc(r.engine || '—')}</td>
        <td class="mono">${esc(r.promptId ? `${r.promptId} ${r.promptVersion || ''}` : '—')}</td>
        <td class="num">${num(r.duration || 0)} ms</td>
        <td><span class="badge ${r.status === 'error' ? 'bad' : 'ok'}">${esc(r.status)}</span></td>
        <td>${esc(dateFR(r.startedAt, true))}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty"><p>Aucune exécution enregistrée.</p></div>'}
    <div class="card-foot muted">
      Le contenu des requêtes n’est pas conservé par défaut. Les analyses et
      réécritures actuelles s’exécutent localement : aucune donnée ne sort du
      navigateur tant qu’un fournisseur externe n’est pas configuré côté serveur.
    </div>
  </section>`;
}

function audit(){
  const rows = auditRecent(120);
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head">
      <h3>Journal d’audit</h3>
      <span class="badge outline">${num(rows.length)} entrée(s)</span>
    </div>
    ${rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>Détail</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td class="nowrap">${esc(dateFR(r.at, true))}</td>
        <td class="mono">${esc(r.action)}</td>
        <td>${esc(r.entity || '—')}</td>
        <td>${esc(r.note || '')}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty"><p>Aucune entrée.</p></div>'}
    <div class="card-foot muted">
      Les validations, publications, calculs de commission, changements de statut
      financier et modifications de rôle sont journalisés sans exception.
    </div>
  </section>`;
}

function donnees(){
  /* Compté au travers du dépôt : les volumes affichés sont ceux de
     l'organisation courante, pas ceux de la base entière. */
  const s = {};
  db.TABLES.forEach(t => {
    try{ s[t] = db.table(t).count(); }catch{ s[t] = 0; }
  });
  $('#tabBody').innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Volumes</h3></div>
    <div class="card-body">
      <div class="kv">${Object.entries(s).filter(([, v]) => v > 0)
        .map(([k, v]) => `<div><span>${esc(k)}</span><span>${num(v)}</span></div>`).join('')
        || '<div><span>Aucune donnée</span><span>0</span></div>'}</div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Export et effacement</h3></div>
    <div class="card-body">
      <p class="subtle">L’export contient les données de l’organisation courante
        uniquement. Les organisations auxquelles vous appartenez par ailleurs
        n’y figurent pas.</p>
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn" id="export">Exporter en JSON</button>
        <button class="btn danger" id="wipe">Effacer les données de cette organisation</button>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Où sont stockées les données</h3></div>
    <div class="card-body">
      <p class="subtle">
        Cette version conserve les données dans le navigateur (stockage local et
        IndexedDB pour les images). Rien n’est transmis à un serveur. Le schéma
        PostgreSQL équivalent, avec le cloisonnement par organisation appliqué au
        niveau des lignes, est fourni dans <span class="mono">server/schema.sql</span>
        pour une bascule vers une base partagée.
      </p>
    </div>
  </section>`;

  $('#export').addEventListener('click', () => {
    const dump = db.exportOrg();
    download(`listing-studio-${new Date().toISOString().slice(0, 10)}.json`,
             JSON.stringify(dump, null, 2), 'application/json');
    toast('Export téléchargé.');
  });
  $('#wipe').addEventListener('click', async () => {
    if (!await confirmModal({
      title:'Effacer les données de cette organisation',
      message:'Dossiers, clients, contrats, transactions et commissions de l’organisation courante seront supprimés.',
      detail:'Cette action est définitive. Exportez vos données avant de continuer.',
      confirmLabel:'Effacer', danger:true })) return;
    db.wipeCurrentOrg();
    toast('Données effacées.');
    reload('donnees');
  });
}
