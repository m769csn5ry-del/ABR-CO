/* Centre d'automatisation — ce que le système fait sans qu'on le lui demande,
 * ce qu'il ne fera jamais, et la trace de ce qu'il a fait.
 */

import { $, esc, num, dateFR, relTime } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, failed } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as ws from '../../domain/workspace.js';
import * as auto from '../../domain/automations.js';
import { isEnabled } from '../../domain/flags.js';

let busy = false;

export function render(){
  if (!ws.allows('dossier:read')){ $('#outlet').innerHTML = denied('dossier:read'); return; }
  renderTopbar({
    title:'Automatisations', crumb:'Pilotage',
    actions:'<button class="btn primary" id="runAll">Tout exécuter maintenant</button>',
  });

  const rules = auto.all();
  const pending = auto.preview();
  const runs = auto.runs(30);
  const waiting = pending.reduce((s, p) => s + (p.enabled ? p.count : 0), 0);
  const off = !isEnabled('automations');

  $('#outlet').innerHTML = `
  <div class="view">
    ${off ? `<div class="callout warn">
      <b>Les automatisations sont désactivées pour cette organisation</b>
      <div style="margin-top:4px">Aucune règle ne s’exécute, même activée individuellement.
        Réactivez-les dans <a href="#/admin?onglet=options">Administration → Options</a>.</div>
    </div>` : ''}

    <div class="tiles" style="${off ? 'margin-top:var(--gap)' : ''}">
      <div class="tile ${waiting ? 'accent' : ''}">
        <div class="tile-label">En attente d’exécution</div>
        <div class="tile-value">${num(waiting)}</div>
        <div class="tile-note">${waiting ? 'éléments que les règles actives traiteraient' : 'rien à traiter'}</div>
      </div>
      <div class="tile">
        <div class="tile-label">Règles actives</div>
        <div class="tile-value">${num(rules.filter(r => r.enabled).length)} <span style="font-size:15px;color:var(--ink-4)">/ ${num(rules.length)}</span></div>
      </div>
      <div class="tile">
        <div class="tile-label">Actions exécutées</div>
        <div class="tile-value">${num(rules.reduce((s, r) => s + r.runCount, 0))}</div>
        <div class="tile-note">depuis l’ouverture de l’organisation</div>
      </div>
    </div>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head">
        <div>
          <h3>Règles</h3>
          <p class="muted" style="font-size:12.2px;margin-top:2px">
            Une règle ne s’exécute que si son état de départ est vrai : la relancer
            deux fois de suite ne produit rien la seconde fois.
          </p>
        </div>
      </div>
      <div class="card-body"><div class="list">
        ${rules.map(r => {
          const p = pending.find(x => x.id === r.id) || { count:0 };
          const allowed = ws.allows(r.permission);
          return `<div class="list-item" style="align-items:flex-start">
            <span style="min-width:0">
              <span style="font-weight:560">${esc(r.label)}</span>
              ${p.count ? `<span class="badge warn" style="margin-left:8px">${num(p.count)} en attente</span>` : ''}
              ${!allowed ? '<span class="badge outline" style="margin-left:8px">autorisation manquante</span>' : ''}
              <div class="subtle">${esc(r.help)}</div>
              <div class="muted" style="font-size:11.6px;margin-top:4px">
                ${r.lastRunAt ? `Dernière exécution ${esc(relTime(r.lastRunAt))} — ${num(r.runCount)} action(s) au total`
                              : 'Jamais exécutée'}
              </div>
            </span>
            <span class="row" style="gap:8px;flex:none">
              ${allowed && p.count ? `<button class="btn sm" data-run="${esc(r.id)}">Exécuter</button>` : ''}
              <label class="switch">
                <input type="checkbox" data-toggle="${esc(r.id)}" ${r.enabled ? 'checked' : ''} ${allowed ? '' : 'disabled'}>
                <span class="track"></span>
              </label>
            </span>
          </div>`;
        }).join('')}
      </div></div>
    </section>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head"><h3>Ce que le système ne fera jamais seul</h3></div>
      <div class="card-body">
        <ul style="margin-left:18px;line-height:1.9;font-size:13.4px">
          ${auto.NEVER_AUTOMATED.map(x => `<li>${esc(x)}</li>`).join('')}
        </ul>
        <p class="subtle" style="margin-top:10px">
          Ces quatre décisions engagent votre entreprise devant un client. Aucune
          configuration ne permet de les confier au système.
        </p>
      </div>
    </section>

    <section class="card" style="margin-top:var(--gap)">
      <div class="card-head">
        <h3>Journal des exécutions</h3>
        <span class="badge outline">${num(runs.length)}</span>
      </div>
      ${runs.length ? `<div class="card-body"><div class="timeline">
        ${runs.map(r => `<div class="tl-item">
          <div style="font-size:13px;font-weight:560">
            ${esc(r.label)}
            <span class="badge ${r.failed ? 'bad' : 'ok'}" style="margin-left:8px">
              ${num(r.done)} faite(s)${r.failed ? `, ${num(r.failed)} en échec` : ''}
            </span>
          </div>
          <div class="muted" style="font-size:11.8px">${esc(dateFR(r.at, true))} — déclenchement ${esc(r.trigger)}</div>
          ${r.details?.length ? `<ul style="margin:6px 0 0 16px;font-size:12.4px;line-height:1.6;color:var(--ink-3)">
            ${r.details.slice(0, 5).map(d => `<li${d.ok ? '' : ' style="color:var(--bad)"'}>${esc(d.text)}</li>`).join('')}
            ${r.details.length > 5 ? `<li class="muted">et ${num(r.details.length - 5)} autre(s)</li>` : ''}
          </ul>` : ''}
        </div>`).join('')}
      </div></div>`
      : `<div class="empty">${icon('history')}<h3>Aucune exécution</h3>
         <p>Le journal se remplit dès qu’une règle agit.</p></div>`}
    </section>
  </div>`;

  $('#runAll').addEventListener('click', () => execute(() => auto.runAll({ manual:true })));
  $('#outlet').querySelectorAll('[data-run]').forEach(b =>
    b.addEventListener('click', () => execute(() => auto.runRule(b.dataset.run, { manual:true }).then(r => [r]))));
  $('#outlet').querySelectorAll('[data-toggle]').forEach(c =>
    c.addEventListener('change', () => {
      try{ auto.setEnabled(c.dataset.toggle, c.checked); render(); }
      catch(err){ failed(err.message); }
    }));
}

async function execute(fn){
  if (busy) return;
  busy = true;
  const btn = $('#runAll');
  btn?.classList.add('loading');
  try{
    const results = await fn();
    const done = results.reduce((s, r) => s + r.done, 0);
    const bad = results.reduce((s, r) => s + r.failed, 0);
    if (!done && !bad) toast('Rien à faire : toutes les règles sont déjà à jour.', 'ok');
    else toast(`${done} action(s) exécutée(s)${bad ? `, ${bad} en échec` : ''}.`, bad ? 'warn' : 'ok');
  }catch(err){ failed(err.message); }
  finally{ busy = false; btn?.classList.remove('loading'); render(); }
}
