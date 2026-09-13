/* Étape 9 — Optimisation : Listing Score et améliorations prioritaires. */

import { esc, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { scoreRing, scoreBars, callout, emptyState } from '../components.js';
import { PART_LABELS, LEVELS } from '../../scoring/listingScore.js';
import * as svc from '../../data/projects.js';
import { toast } from '../../core/toast.js';

const STEP_OF_PART = { titre:7, photos:3, description:7, equipements:1, informations:1, positionnement:2 };

export default function stepScore(host, ctx){
  const project = svc.refreshScore(ctx.id) || ctx.project;
  const s = project.score;

  if (!s){
    host.innerHTML = `<section class="card">${emptyState({
      ic:'chart', title:'Score non calculé',
      text:'Générez d’abord l’annonce : le score se calcule sur le contenu réel, les photos et la fiche.',
      action:`<button class="btn primary" id="toGen">Aller à la génération</button>`,
    })}</section>`;
    host.querySelector('#toGen').addEventListener('click', () => ctx.goStep(7));
    return;
  }

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-body" style="display:flex;gap:30px;align-items:center;flex-wrap:wrap">
        ${scoreRing(s.total)}
        <div class="grow" style="min-width:240px">
          <div class="row" style="gap:10px;margin-bottom:8px">
            <span class="badge ${s.tone}">${esc(s.levelLabel)}</span>
            <span class="muted" style="font-size:13px">Potentiel ${s.potential}/100</span>
          </div>
          <h2 style="font-size:20px">${esc(headline(s))}</h2>
          <p class="muted" style="margin-top:6px;max-width:60ch">${esc(advice(s))}</p>
        </div>
        <div class="col" style="gap:8px">
          <button class="btn" id="recalc">${icon('refresh')} Recalculer</button>
          <button class="btn" id="toReport">${icon('reports')} Générer le rapport</button>
        </div>
      </div>
    </section>

    <div class="grid halves" style="align-items:start">
      <section class="card">
        <div class="card-head"><h3>Détail de la notation</h3></div>
        <div class="card-body">
          ${scoreBars(s)}
          <div class="col" style="gap:6px;margin-top:16px">
            ${Object.entries(s.parts).map(([k, p]) => `<div class="spread" style="font-size:12.6px">
              <span class="muted">${esc(PART_LABELS[k])}</span>
              <span class="dim">${esc(p.details.join(' · '))}</span></div>`).join('')}
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Améliorations prioritaires</h3>
          <span class="muted" style="font-size:12.4px">${num(s.improvements.length)} action(s)</span></div>
        <div class="card-body">
          ${s.improvements.length ? `<div class="col" style="gap:10px">
            ${s.improvements.slice(0, 9).map((i, n) => `
              <div class="spread" style="gap:12px;padding:12px;border:1px solid var(--line);border-radius:var(--r-sm);align-items:flex-start">
                <div class="row" style="gap:10px;align-items:flex-start">
                  <span class="badge ${i.priority === 1 ? 'bad' : i.priority === 2 ? 'warn' : 'outline'}">${n + 1}</span>
                  <div>
                    <div style="font-size:13.5px;font-weight:550">${esc(i.text)}</div>
                    <div class="dim" style="font-size:12px;margin-top:2px">${esc(PART_LABELS[i.part])} · gain +${i.gain} pts</div>
                  </div>
                </div>
                <button class="btn sm" data-fix="${esc(i.part)}">Corriger</button>
              </div>`).join('')}
          </div>` : callout('Aucune amélioration prioritaire : l’annonce est au niveau attendu.', 'ok', 'checkCircle')}
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-head"><h3>Niveaux</h3></div>
      <div class="card-body">
        <div class="grid c3">
          ${LEVELS.map(l => `<div class="card flat pad ${s.level === l.id ? 'accent' : ''}">
            <div class="spread"><span class="strong">${esc(l.label)}</span>
              ${s.level === l.id ? '<span class="badge brand">Votre niveau</span>' : ''}</div>
            <div class="muted" style="font-size:12.6px;margin-top:4px">${esc(levelText(l.id))}</div>
          </div>`).join('')}
        </div>
      </div>
    </section>
  </div>`;

  host.querySelector('#recalc').addEventListener('click', () => {
    svc.refreshScore(ctx.id);
    toast('Score recalculé.');
    ctx.reload();
  });
  host.querySelector('#toReport').addEventListener('click', () => ctx.goStep(11));
  host.querySelectorAll('[data-fix]').forEach(b =>
    b.addEventListener('click', () => ctx.goStep(STEP_OF_PART[b.dataset.fix] || 1)));
}

function headline(s){
  if (s.total >= 80) return 'Annonce prête à publier';
  if (s.total >= 55) return 'Annonce correcte, marge de progression réelle';
  return 'Annonce insuffisante en l’état';
}
function advice(s){
  if (!s.improvements.length) return 'Tous les critères mesurés sont au niveau attendu.';
  const accessible = Math.max(0, Math.round(s.potential - s.total));
  const top = Math.min(3, s.improvements.length);
  const gain = Math.min(accessible, Math.round(s.improvements.slice(0, top).reduce((a, i) => a + i.gain, 0)));
  if (accessible === 0)
    return `Le score plafonne déjà : les ${s.improvements.length} action(s) restantes relèvent du soin, pas du rattrapage.`;
  return `En traitant les ${top} premières actions, vous récupérez environ ${gain} point(s) sur les ${accessible} encore accessibles.`;
}
function levelText(id){
  return {
    faible:'Moins de 55/100 : l’annonce manque d’éléments essentiels, la conversion en souffre.',
    bon:'De 55 à 79/100 : l’annonce tient la route, quelques leviers restent inexploités.',
    excellent:'80/100 et plus : annonce complète, photos solides, positionnement clair.',
  }[id];
}
