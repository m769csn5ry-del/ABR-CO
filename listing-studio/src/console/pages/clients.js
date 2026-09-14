/* Clients et contrats de rémunération.
 *
 * Le contrat est la seule source autorisée du calcul de commission : sans
 * contrat actif, aucun montant n'est estimé. Sa configuration est validée
 * avant enregistrement, jamais au moment du calcul.
 */

import { $, esc, num, dateFR } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, failed, saved } from '../../core/toast.js';
import { confirm as confirmModal } from '../../core/modal.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as commission from '../../domain/commission.js';
import { log } from '../../domain/audit.js';
import { formModal } from '../ui.js';

export function render(){
  if (!ws.allows('client:read')){ $('#outlet').innerHTML = denied('client:read'); return; }
  renderTopbar({
    title:'Clients et contrats', crumb:'Relation client',
    actions: ws.allows('client:write') ? '<button class="btn primary" id="newClient">Nouveau client</button>' : '',
  });

  const clients = db.clients.all().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const contracts = db.contracts.all();
  const dossiers = db.dossiers.all();

  $('#outlet').innerHTML = `
  <div class="view">
    ${clients.length ? clients.map(c => {
      const active = contracts.filter(x => x.clientId === c.id && x.status === 'active');
      const past = contracts.filter(x => x.clientId === c.id && x.status !== 'active');
      const mine = dossiers.filter(d => d.clientId === c.id);
      return `<section class="card" style="margin-bottom:var(--gap)">
        <div class="card-head">
          <div>
            <h3>${esc(c.name)}</h3>
            <p class="muted" style="font-size:12.2px;margin-top:2px">
              ${esc([c.email, c.phone, c.company].filter(Boolean).join(' — ') || 'aucun contact renseigné')}
            </p>
          </div>
          <div class="row" style="gap:8px">
            <span class="badge outline">${num(mine.length)} dossier(s)</span>
            ${ws.allows('contract:write') ? `<button class="btn sm" data-contract="${esc(c.id)}">Nouveau contrat</button>` : ''}
            ${ws.allows('client:write') ? `<button class="btn sm" data-edit="${esc(c.id)}">Modifier</button>` : ''}
          </div>
        </div>
        <div class="card-body">
          ${active.length ? active.map(x => contractBlock(x)).join('')
            : `<div class="callout warn">
                <b>Aucun contrat actif</b>
                <div style="margin-top:4px">Les commissions de ce client ne peuvent pas être calculées
                  tant qu’aucun contrat n’est en vigueur.</div>
              </div>`}
          ${past.length ? `<div class="muted" style="font-size:12px;margin-top:10px">
            ${num(past.length)} contrat(s) archivé(s).</div>` : ''}
          ${mine.length ? `<div class="list" style="margin-top:14px">
            ${mine.map(d => `<a class="list-item" href="#/dossier/${esc(d.id)}">
              <span>${esc(d.name)}</span>
              <span class="muted">${esc(d.analysis?.score ? `${d.analysis.score.total} / 100` : 'non analysé')}</span>
            </a>`).join('')}</div>` : ''}
        </div>
      </section>`;
    }).join('')
    : `<div class="empty">${icon('clients')}<h3>Aucun client</h3>
       <p>Un client porte les contrats de rémunération et rattache les dossiers.</p>
       ${ws.allows('client:write') ? '<button class="btn primary" id="newClient2">Créer un client</button>' : ''}</div>`}
  </div>`;

  document.getElementById('newClient')?.addEventListener('click', () => clientDialog());
  $('#newClient2')?.addEventListener('click', () => clientDialog());
  $('#outlet').querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => clientDialog(db.clients.find(b.dataset.edit))));
  $('#outlet').querySelectorAll('[data-contract]').forEach(b =>
    b.addEventListener('click', () => contractDialog(b.dataset.contract)));
  $('#outlet').querySelectorAll('[data-archive]').forEach(b =>
    b.addEventListener('click', async () => {
      if (!await confirmModal({ title:'Archiver ce contrat',
        message:'Les commissions déjà calculées sont conservées ; aucun nouveau calcul ne pourra s’appuyer sur ce contrat.',
        confirmLabel:'Archiver' })) return;
      db.contracts.update(b.dataset.archive, { status:'archived' });
      log('entity.update', { entity:'contract', entityId:b.dataset.archive, note:'Contrat archivé' });
      saved('Contrat archivé');
      render();
    }));
}

function contractBlock(x){
  const m = commission.model(x.terms?.model);
  const cur = x.terms?.currency || ws.currency();
  return `<div class="callout plain" style="margin-bottom:10px">
    <div class="row-between">
      <span>
        <b>${esc(x.label || m?.label || 'Contrat')}</b>
        <div style="font-size:12.4px;margin-top:2px">${esc(m ? m.describe(x.terms, cur) : 'modèle inconnu')}</div>
        <div class="muted" style="font-size:11.8px;margin-top:3px">
          Règlement à ${num(x.paymentTermDays ?? 30)} jours
          ${x.terms?.vatRate ? ` — TVA ${num(x.terms.vatRate)} %` : ' — sans TVA'}
          ${x.startsAt ? ` — depuis le ${esc(dateFR(x.startsAt))}` : ''}
          ${x.endsAt ? ` — jusqu’au ${esc(dateFR(x.endsAt))}` : ''}
        </div>
      </span>
      ${ws.allows('contract:write') ? `<button class="btn sm" data-archive="${esc(x.id)}">Archiver</button>` : ''}
    </div>
  </div>`;
}

function clientDialog(existing = null){
  formModal({
    title: existing ? 'Modifier le client' : 'Nouveau client',
    body:`<div class="form-grid">
      <label class="field"><span>Nom</span><input class="input" id="name" value="${esc(existing?.name || '')}" required autocomplete="off"></label>
      <label class="field"><span>Société</span><input class="input" id="company" value="${esc(existing?.company || '')}" autocomplete="off"></label>
      <label class="field"><span>Courriel</span><input class="input" type="email" id="email" value="${esc(existing?.email || '')}" autocomplete="off"></label>
      <label class="field"><span>Téléphone</span><input class="input" id="phone" value="${esc(existing?.phone || '')}" autocomplete="off"></label>
    </div>`,
    onSubmit(b){
      const name = b.querySelector('#name').value.trim();
      if (!name){ failed('Le nom est obligatoire.'); return false; }
      const data = {
        name, company:b.querySelector('#company').value.trim(),
        email:b.querySelector('#email').value.trim(), phone:b.querySelector('#phone').value.trim(),
      };
      try{
        ws.require_('client:write');
        if (existing) db.clients.update(existing.id, data);
        else db.clients.insert(data);
        log(existing ? 'entity.update' : 'entity.create', { entity:'client', entityId:existing?.id || null, note:name });
        saved();
        render();
      }catch(err){ failed(err.message); return false; }
    },
  });
}

function contractDialog(clientId){
  const cur = ws.currency();
  formModal({
    title:'Contrat de rémunération', wide:true, submitLabel:'Enregistrer le contrat',
    body:`
      <label class="field"><span>Modèle</span>
        <select class="select" id="model">
          ${commission.modelList().filter(m => m.id !== 'custom')
            .map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('')}
        </select></label>

      <div class="form-grid" style="margin-top:12px">
        <label class="field" data-for="rate"><span>Taux (%)</span>
          <input class="input" type="number" id="rate" min="0" max="100" step="0.01" value="15"></label>
        <label class="field" data-for="fixedAmount" hidden><span>Montant forfaitaire (${esc(cur)})</span>
          <input class="input" type="number" id="fixed" min="0" step="0.01" value="500"></label>
        <label class="field"><span>Délai de règlement (jours)</span>
          <input class="input" type="number" id="term" min="0" value="30"></label>
        <label class="field"><span>TVA applicable (%)</span>
          <input class="input" type="number" id="vat" min="0" max="100" step="0.1" value="20"></label>
      </div>

      <div data-for="tiers" hidden style="margin-top:12px">
        <div class="field"><span>Paliers</span></div>
        <p class="subtle">Un palier par ligne : seuil en ${esc(cur)} puis taux, séparés par un point-virgule.
          Le dernier palier doit être ouvert — laissez son seuil vide.</p>
        <textarea class="textarea" id="tiers" rows="4">200000;5
500000;4
;3</textarea>
      </div>

      <label class="field" style="margin-top:12px"><span>Intitulé du contrat</span>
        <input class="input" id="label" placeholder="Mandat d’optimisation 2026" autocomplete="off"></label>

      <div class="callout plain" style="margin-top:12px">
        Aucune signature électronique n’est simulée : ce contrat est une
        configuration de calcul interne, pas un document signé.
      </div>
      <div id="err" class="err-text" style="margin-top:10px"></div>`,
    onSubmit(b){
      const model = b.querySelector('#model').value;
      const terms = {
        model, currency:cur,
        vatRate: Number(b.querySelector('#vat').value) || null,
      };
      if (['percent_sale','percent_agency'].includes(model)) terms.rate = Number(b.querySelector('#rate').value);
      if (model === 'fixed') terms.fixedAmount = Math.round(Number(b.querySelector('#fixed').value) * 100);
      if (['tiered','percent_variable'].includes(model)){
        terms.tiers = b.querySelector('#tiers').value.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => {
            const [upTo, rate] = l.split(';').map(s => s.trim());
            return { upTo: upTo === '' ? null : Math.round(Number(upTo) * 100), rate: Number(rate) };
          });
      }
      const problems = commission.validateConfig(terms);
      if (problems.length){
        b.querySelector('#err').textContent = problems.map(p => p.message).join(' ');
        return false;
      }
      try{
        ws.require_('contract:write');
        db.contracts.insert({
          clientId, terms, status:'active',
          label: b.querySelector('#label').value.trim() || commission.model(model).label,
          paymentTermDays: Number(b.querySelector('#term').value) || 30,
          startsAt: Date.now(), endsAt: null,
        });
        log('entity.create', { entity:'contract', entityId:clientId, note:`Contrat ${model}` });
        toast('Contrat enregistré.');
        render();
      }catch(err){ b.querySelector('#err').textContent = err.message; return false; }
    },
  });

  // Affiche les seuls champs utiles au modèle choisi.
  const root = document.querySelector('.modal-root .modal:last-child .modal-body');
  const sync = () => {
    const m = root.querySelector('#model').value;
    const show = { rate:['percent_sale','percent_agency'], fixedAmount:['fixed'], tiers:['tiered','percent_variable'] };
    Object.entries(show).forEach(([k, models]) => {
      root.querySelectorAll(`[data-for="${k}"]`).forEach(el => { el.hidden = !models.includes(m); });
    });
  };
  root.querySelector('#model').addEventListener('change', sync);
  sync();
}
