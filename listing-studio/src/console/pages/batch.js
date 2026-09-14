/* Import en lot — la porte d'entrée quand on traite plusieurs annonces.
 *
 * Coller plusieurs annonces séparées par une ligne « --- » crée autant de
 * dossiers. Les automatisations actives prennent le relais : analyse, puis
 * brouillon d'optimisation. Rien n'est validé ni publié.
 */

import { $, esc, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { go } from '../../core/router.js';
import { toast, failed } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as svc from '../../domain/dossiers.js';
import * as auto from '../../domain/automations.js';
import { parseListingText } from '../../domain/listingImport.js';

const SEPARATOR = /^\s*-{3,}\s*$/m;
let busy = false;

export function render(){
  if (!ws.allows('dossier:write')){ $('#outlet').innerHTML = denied('dossier:write'); return; }
  renderTopbar({ title:'Import en lot', crumb:'<a href="#/dossiers">Dossiers</a>' });

  const clients = db.clients.all();

  $('#outlet').innerHTML = `
  <div class="view" style="max-width:900px">
    <section class="card">
      <div class="card-head">
        <div>
          <h3>Coller plusieurs annonces</h3>
          <p class="muted" style="font-size:12.2px;margin-top:2px">
            Séparez chaque annonce par une ligne contenant trois tirets.
            La première ligne de chaque bloc devient le titre.
          </p>
        </div>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <label class="field"><span>Client à rattacher</span>
            <select class="select" id="clientId">
              <option value="">Aucun</option>
              ${clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
            </select></label>
          <label class="field"><span>Marché</span>
            <select class="select" id="market">
              <option value="sale">Vente</option>
              <option value="rent">Location longue durée</option>
              <option value="short">Location courte durée</option>
            </select></label>
          <label class="field"><span>Ville commune (facultatif)</span>
            <input class="input" id="city" placeholder="Strasbourg" autocomplete="off"></label>
        </div>

        <label class="field" style="margin-top:14px"><span>Annonces</span>
          <textarea class="textarea" id="raw" rows="16" placeholder="Titre de la première annonce
Description…

---

Titre de la deuxième annonce
Description…"></textarea></label>

        <div class="row-between" style="margin-top:12px">
          <span class="subtle" id="count">Aucune annonce détectée.</span>
          <span class="row" style="gap:8px">
            <label class="check" style="font-size:12.8px">
              <input type="checkbox" id="chain" checked>
              <span>Enchaîner l’analyse et le brouillon d’optimisation</span>
            </label>
            <button class="btn primary" id="go">Créer les dossiers</button>
          </span>
        </div>

        <div class="callout plain" style="margin-top:12px">
          Aucune récupération automatique depuis un site : collez le texte que vous
          avez le droit de nous confier. Les informations absentes ne sont pas
          devinées, elles sont signalées comme manquantes dans chaque dossier.
        </div>
      </div>
    </section>

    <section class="card" id="resultCard" style="margin-top:var(--gap);display:none">
      <div class="card-head"><h3>Résultat</h3></div>
      <div class="card-body" id="result"></div>
    </section>
  </div>`;

  const ta = $('#raw');
  const refresh = () => {
    const n = blocks(ta.value).length;
    $('#count').textContent = n ? `${n} annonce${n > 1 ? 's' : ''} détectée${n > 1 ? 's' : ''}.` : 'Aucune annonce détectée.';
  };
  ta.addEventListener('input', refresh);
  $('#go').addEventListener('click', run);
}

const blocks = (raw) => String(raw || '').split(SEPARATOR).map(b => b.trim()).filter(b => b.length > 30);

async function run(){
  if (busy) return;
  const raw = $('#raw').value;
  const list = blocks(raw);
  if (!list.length){ failed('Collez au moins une annonce.'); return; }
  if (list.length > 40){ failed('Quarante annonces au maximum par lot.'); return; }

  busy = true;
  const btn = $('#go'); btn.classList.add('loading');
  const clientId = $('#clientId').value || null;
  const market = $('#market').value;
  const city = $('#city').value.trim() || null;
  const chain = $('#chain').checked;
  const created = [];
  const errors = [];

  for (const text of list){
    try{
      const parsed = parseListingText(text);
      const d = svc.create({
        name: (parsed.title || text.split('\n')[0] || 'Annonce importée').slice(0, 80),
        clientId, market,
        property:{ city, ...(parsed.facts || {}) },
      });
      svc.importListing(d.id, { raw:text });
      created.push(svc.get(d.id));
    }catch(err){ errors.push(err.message); }
  }

  let chained = [];
  if (chain && created.length){
    try{
      chained = [await auto.runRule('analyze_on_import', { manual:true, limit:60 }),
                 await auto.runRule('draft_on_analysis', { manual:true, limit:60 })];
    }catch(err){ errors.push(err.message); }
  }

  const fresh = created.map(c => svc.get(c.id)).filter(Boolean);
  $('#resultCard').style.display = '';
  $('#result').innerHTML = `
    <div class="callout ${errors.length ? 'warn' : 'ok'}">
      <b>${num(fresh.length)} dossier(s) créé(s)</b>
      ${chained.length ? `<div style="margin-top:4px">
        ${num(chained[0].done)} analyse(s), ${num(chained[1].done)} brouillon(s) d’optimisation.
        Chaque brouillon attend une validation humaine.</div>` : ''}
      ${errors.length ? `<div style="margin-top:6px">${esc(errors.slice(0, 3).join(' — '))}</div>` : ''}
    </div>
    <div class="table-wrap" style="margin-top:14px"><table>
      <thead><tr><th>Dossier</th><th class="num">Score</th><th class="num">Potentiel</th><th>Étape</th><th></th></tr></thead>
      <tbody>${fresh.map(d => `<tr>
        <td>${esc(d.name)}</td>
        <td class="num">${d.analysis ? `<b>${num(d.analysis.score.total)}</b>` : '—'}</td>
        <td class="num muted">${d.analysis ? num(d.analysis.score.potential) : '—'}</td>
        <td>${esc(d.stage)}</td>
        <td><a class="btn sm" href="#/dossier/${esc(d.id)}/analyse">Ouvrir</a></td>
      </tr>`).join('')}</tbody>
    </table></div>`;

  toast(`${fresh.length} dossier(s) créé(s).`);
  btn.classList.remove('loading');
  busy = false;
  if (fresh.length === 1) go(`/dossier/${fresh[0].id}/analyse`);
}

export { icon };
