/* Étape 8 — Stratégie de prix. */

import { esc, money, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { SEASONS } from '../../data/options.js';
import { callout } from '../components.js';
import * as svc from '../../data/projects.js';
import { ladder } from '../../pricing/engine.js';
import { toast } from '../../core/toast.js';

export default function stepPricing(host, ctx){
  const project = ctx.project;
  const pr = project.pricing || {};
  const rec = project.pricingRecommendation;
  const cur = project.property?.currency || 'EUR';

  host.innerHTML = `
  <div class="grid halves" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Paramètres tarifaires</h3></div>
      <div class="card-body">
        <div class="form-grid">
          ${f('p-current','Prix actuel / nuit','current',pr.current)}
          ${f('p-min','Prix minimum','min',pr.min)}
          ${f('p-max','Prix maximum','max',pr.max)}
          ${f('p-clean','Frais de ménage','cleaning',pr.cleaning)}
          <div class="field">
            <label for="p-season">Saison</label>
            <select class="select" id="p-season">
              ${SEASONS.map(s => `<option value="${s.id}" ${pr.season === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
          </div>
          ${f('p-guests','Nombre de voyageurs','guests',pr.guests, 'number')}
          ${f('p-minn','Durée minimale (nuits)','minNights',pr.minNights, 'number')}
          <div class="field">
            <label for="p-in">Date d’arrivée</label>
            <input class="input" type="date" id="p-in" data-p="checkin" value="${esc(pr.checkin || '')}">
          </div>
          <div class="field">
            <label for="p-out">Date de départ</label>
            <input class="input" type="date" id="p-out" data-p="checkout" value="${esc(pr.checkout || '')}">
          </div>
        </div>
        <button class="btn primary block" id="computeBtn" style="margin-top:18px">
          ${icon('euro')} Calculer la recommandation</button>
      </div>
    </section>

    <section id="recBox">${rec ? renderRec(rec, cur) : `<div class="card pad">${
      callout('Renseignez au moins un prix de référence, puis lancez le calcul. La recommandation s’appuie uniquement sur vos paramètres : aucune donnée de marché externe n’est consultée.', 'plain', 'info')
    }</div>`}</section>
  </div>`;

  const readInputs = () => {
    const get = (sel) => host.querySelector(sel)?.value;
    return {
      current: numOrEmpty(get('#p-current')), min: numOrEmpty(get('#p-min')), max: numOrEmpty(get('#p-max')),
      cleaning: numOrEmpty(get('#p-clean')), guests: numOrEmpty(get('#p-guests')),
      minNights: numOrEmpty(get('#p-minn')), season: get('#p-season'),
      checkin: get('#p-in'), checkout: get('#p-out'),
    };
  };

  host.querySelectorAll('[data-p]').forEach(el => {
    el.addEventListener('change', () => ctx.patch('pricing', readInputs()));
  });

  host.querySelector('#computeBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;          // `currentTarget` est nul après le tour de boucle
    btn.classList.add('loading');
    const out = svc.computePricing(ctx.id, readInputs());
    setTimeout(() => {
      host.querySelector('#recBox').innerHTML = out.ok
        ? renderRec(out, cur)
        : `<div class="card pad">${callout(out.reason, 'warn', 'warning')}</div>`;
      toast(out.ok ? 'Recommandation tarifaire calculée.' : 'Prix de référence manquant.', out.ok ? 'ok' : 'warn');
      btn.classList.remove('loading');
    }, 260);
  });
}

const numOrEmpty = (v) => (v === '' || v === undefined ? '' : Number(v));

function f(id, label, key, value, type = 'number'){
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <input class="input" id="${id}" type="${type}" min="0" data-p="${key}" value="${value === '' || value === undefined || value === null ? '' : esc(value)}">
  </div>`;
}

function renderRec(rec, cur){
  const lad = ladder(rec);
  return `<div class="col" style="gap:var(--gap)">
    <div class="card">
      <div class="card-head"><h3>Recommandation</h3>
        <span class="badge ${rec.positioning === 'Aligné' ? 'ok' : rec.positioning === 'Sous-valorisé' ? 'warn' : 'info'}">${esc(rec.positioning)}</span></div>
      <div class="card-body">
        <div class="row-wrap" style="gap:26px;align-items:flex-end">
          <div>
            <div class="eyebrow">Prix recommandé</div>
            <div style="font-size:34px;font-weight:680;letter-spacing:-.03em;line-height:1.1">${money(rec.recommended, cur)}</div>
            <div class="muted" style="font-size:12.5px">par nuit · ${esc(rec.seasonLabel)}</div>
          </div>
          <div>
            <div class="eyebrow">Prix minimum</div>
            <div style="font-size:19px;font-weight:600">${money(rec.floor, cur)}</div>
          </div>
          <div>
            <div class="eyebrow">Prix maximum</div>
            <div style="font-size:19px;font-weight:600">${money(rec.ceiling, cur)}</div>
          </div>
          ${rec.stayTotal ? `<div>
            <div class="eyebrow">Total séjour (${num(rec.nights)} nuits)</div>
            <div style="font-size:19px;font-weight:600">${money(rec.stayTotal, cur)}</div>
          </div>` : ''}
        </div>
        <p class="muted" style="font-size:13px;margin-top:14px">${esc(rec.positioningNote)}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Arguments</h3></div>
      <div class="card-body">
        <ul style="font-size:13.3px">${rec.arguments.map(a => `<li style="margin-bottom:5px">${esc(a)}</li>`).join('')}</ul>
        <div class="callout warn" style="margin-top:14px">${icon('warning')}<div>${esc(rec.disclaimer)}</div></div>
        <div class="dim" style="font-size:11.5px;margin-top:8px">
          Source : ${esc(rec.sourceLabel)} · calcul du ${new Date(rec.asOf).toLocaleString('fr-FR')}
          ${rec.externalData ? '' : ' · aucune donnée externe'}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Trois positionnements</h3></div>
      <div class="card-body">
        <div class="grid c3">
          ${lad.map(l => `<div class="card flat pad">
            <div class="eyebrow">${esc(l.label)}</div>
            <div style="font-size:23px;font-weight:680;margin:4px 0 6px">${money(l.value, cur)}</div>
            <div class="muted" style="font-size:12.4px">${esc(l.note)}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}
