/* Étape 2 — Positionnement, conditions de séjour et alentours. */

import { esc } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { AUDIENCES, STYLES, HIGHLIGHTS, TONES, RULE_PRESETS } from '../../data/options.js';
import { sectionTitle, chipGroup, wireChips, callout, optionGrid } from '../components.js';
import * as ai from '../../ai/engine.js';
import { toast } from '../../core/toast.js';

export default function stepPositioning(host, ctx){
  const project = ctx.project;
  const pos = project.positioning || {};
  const missing = ai.missingInfo({ ...project, photoCount: ctx.photos().length })
    .filter(m => m.step <= 2);

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    ${missing.length ? `<div class="card accent pad">
      <div class="row" style="gap:10px;margin-bottom:10px">${icon('sparkle')}
        <span class="strong">L’assistant a besoin de ces informations avant de rédiger</span></div>
      <ul style="font-size:13.4px;margin:0">
        ${missing.map(m => `<li><span class="strong">${esc(m.label)}</span> — ${esc(m.why)}</li>`).join('')}
      </ul>
    </div>` : `<div class="callout ok">${icon('checkCircle')}<div>Toutes les informations de positionnement nécessaires sont renseignées.</div></div>`}

    <section class="card">
      <div class="card-head"><h3>Public cible</h3><span class="muted" style="font-size:12.4px">Plusieurs choix possibles</span></div>
      <div class="card-body">${chipGroup(AUDIENCES, pos.audiences || [], { name:'aud' })}</div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Style du logement</h3></div>
      <div class="card-body">${optionGrid(STYLES.map(s => ({ id:s.id, label:s.label, desc:s.adj.slice(0,2).join(', ') })), pos.style, { name:'style' })}</div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Points forts</h3><span class="muted" style="font-size:12.4px">Deux à quatre suffisent</span></div>
      <div class="card-body">${chipGroup(HIGHLIGHTS, pos.highlights || [], { name:'hl' })}</div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Ton de rédaction</h3></div>
      <div class="card-body">${optionGrid(TONES, pos.tone, { name:'tone' })}</div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Alentours</h3>
        <button class="btn sm" id="addPoi">${icon('plus')} Ajouter un lieu</button></div>
      <div class="card-body">
        ${callout('Aucun lieu n’est inventé par le logiciel. Les points d’intérêt que vous saisissez ici sont les seuls qui apparaîtront dans l’annonce.', 'plain', 'pin')}
        <div class="col" style="gap:10px;margin-top:16px" id="poiList">
          ${(pos.attractions || []).length ? (pos.attractions || []).map((a, i) => poiRow(a, i)).join('')
            : '<p class="muted" style="font-size:13px">Aucun point d’intérêt saisi.</p>'}
        </div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field span-2">
            <label for="f-activities">Activités à proximité</label>
            <input class="input" id="f-activities" value="${esc((pos.activities || []).join(', '))}" data-list="activities"
              placeholder="Ex. Plage, Golf, Marché du dimanche (séparés par des virgules)">
          </div>
          <div class="field span-2">
            <label for="f-transport">Transports et accès</label>
            <textarea class="textarea" id="f-transport" data-bind="positioning.transport"
              placeholder="Ex. Tram ligne C à 3 minutes, gare à 15 minutes à pied.">${esc(pos.transport || '')}</textarea>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Séjour et conditions</h3></div>
      <div class="card-body">
        <div class="form-grid c3">
          <div class="field"><label for="f-cin">Heure d’arrivée</label>
            <input class="input" id="f-cin" type="time" data-bind="positioning.checkinTime" value="${esc(pos.checkinTime || '')}"></div>
          <div class="field"><label for="f-cout">Heure de départ</label>
            <input class="input" id="f-cout" type="time" data-bind="positioning.checkoutTime" value="${esc(pos.checkoutTime || '')}"></div>
          <div class="field"><label for="f-minn">Séjour minimum (nuits)</label>
            <input class="input" id="f-minn" type="number" min="1" max="90" data-bind="positioning.minNights" value="${esc(pos.minNights ?? '')}"></div>
          <div class="field span-2">
            <label for="f-access">Précisions d’accès</label>
            <textarea class="textarea" id="f-access" data-bind="positioning.accessNote"
              placeholder="Ex. Boîte à clés à gauche de la porte, code communiqué la veille.">${esc(pos.accessNote || '')}</textarea>
          </div>
          <div class="field">
            <label>Arrivée autonome</label>
            <label class="switch"><input type="checkbox" data-bind="positioning.selfCheckin" ${pos.selfCheckin ? 'checked' : ''}>
              <span class="track"></span><span style="font-size:13px">Le voyageur entre seul</span></label>
          </div>
        </div>
        <div style="margin-top:20px">
          ${sectionTitle('Règles du logement')}
          ${chipGroup(RULE_PRESETS, pos.rules || [], { name:'rules' })}
          <div class="field" style="margin-top:14px">
            <label for="f-crules">Règles supplémentaires</label>
            <input class="input" id="f-crules" data-list="customRules" value="${esc((pos.customRules || []).join(', '))}"
              placeholder="Ex. Piscine non sécurisée, surveillance des enfants requise">
          </div>
          <div class="field" style="margin-top:14px">
            <label for="f-notes">Notes internes à intégrer</label>
            <textarea class="textarea" id="f-notes" data-bind="positioning.notes"
              placeholder="Informations factuelles supplémentaires à faire figurer dans l’annonce.">${esc(pos.notes || '')}</textarea>
          </div>
        </div>
      </div>
    </section>
  </div>`;

  wireChips(host, 'aud',   v => ctx.patch('positioning', { audiences:v }));
  wireChips(host, 'hl',    v => ctx.patch('positioning', { highlights:v }));
  wireChips(host, 'rules', v => ctx.patch('positioning', { rules:v }));
  wireChips(host, 'style', v => ctx.patch('positioning', { style:v }));
  wireChips(host, 'tone',  v => { ctx.patch('positioning', { tone:v }); toast(`Ton « ${TONES.find(t => t.id === v).label} » retenu.`); });

  host.querySelectorAll('[data-list]').forEach(input => {
    input.addEventListener('change', () => {
      const values = input.value.split(',').map(s => s.trim()).filter(Boolean);
      ctx.patch('positioning', { [input.dataset.list]: values });
    });
  });

  host.querySelector('#addPoi').addEventListener('click', () => {
    const list = [...(ctx.project.positioning.attractions || []), { name:'', distance:'' }];
    ctx.patch('positioning', { attractions:list });
    ctx.reload();
  });

  host.querySelectorAll('[data-poi]').forEach(row => {
    const i = Number(row.dataset.poi);
    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const list = [...(ctx.project.positioning.attractions || [])];
        list[i] = { name: row.querySelector('[data-f="name"]').value.trim(),
                    distance: row.querySelector('[data-f="distance"]').value.trim() };
        ctx.patch('positioning', { attractions:list.filter(a => a.name || a.distance) });
      });
    });
    row.querySelector('[data-del]')?.addEventListener('click', () => {
      const list = (ctx.project.positioning.attractions || []).filter((_, k) => k !== i);
      ctx.patch('positioning', { attractions:list });
      ctx.reload();
    });
  });
}

function poiRow(a, i){
  return `<div class="row" data-poi="${i}" style="gap:10px">
    <input class="input" data-f="name" value="${esc(a.name || '')}" placeholder="Lieu (ex. Vieux-Port)" style="flex:2">
    <input class="input" data-f="distance" value="${esc(a.distance || '')}" placeholder="Distance (ex. 8 min à pied)" style="flex:1">
    <button class="icon-btn" data-del aria-label="Supprimer">${icon('trash')}</button>
  </div>`;
}
