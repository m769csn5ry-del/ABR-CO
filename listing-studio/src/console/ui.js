/* Briques d'affichage partagées par les écrans de la console. */

import { esc, num, dateFR, relTime } from '../core/util.js';
import { icon } from '../core/icons.js';
import { openModal } from '../core/modal.js';
import { STAGES, stageLabel } from '../workflow/dossier.js';
import * as M from '../domain/money.js';
import { LEVEL_LABELS } from '../analysis/score.js';

export const fmt = (serialized) => {
  const m = M.deserialize(serialized);
  return m ? M.format(m) : '—';
};

/* Une moyenne par jour descend souvent sous 1 : arrondie à l'entier, elle
   afficherait « +0 » à côté d'un écart de 153 %. */
export const perDay = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) < 10 && !Number.isInteger(v)
    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits:1 }).format(v)
    : num(v);
};

export const dash = (v) => (v === null || v === undefined || v === '' ? '<span class="missing">Information manquante</span>' : esc(String(v)));

export const levelTone = (level) => ({ excellent:'ok', bon:'ok', faible:'warn', critique:'bad' }[level] || 'outline');

export const severityTone = (s) => ({ critical:'bad', major:'warn', minor:'info', info:'outline' }[s] || 'outline');

/** Frise des étapes du dossier : l'opérateur voit d'un coup où il en est. */
export function stageFlow(stage){
  const idx = STAGES.findIndex(s => s.id === stage);
  return `<div class="flow">${STAGES.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'on' : '';
    return `<span class="flow-step ${cls}">${esc(s.label)}</span>`;
  }).join('')}</div>`;
}

export function scoreBlock(score){
  if (!score) return '<div class="empty"><p>Aucune analyse exécutée.</p></div>';
  return `<div class="score-block">
    <div class="score-big">${num(score.total)}<span> / 100</span></div>
    <div class="score-level"><span class="badge ${levelTone(score.level)}">${esc(LEVEL_LABELS[score.level] || score.level)}</span></div>
    <div class="score-gain">
      Potentiel atteignable : <b>${num(score.potential)} / 100</b><br>
      Gain si les problèmes listés sont corrigés : <b>+${num(score.gain)} points</b>.
      <div style="margin-top:6px;font-size:11.6px;color:var(--ink-4)">
        Le potentiel est plafonné axe par axe : corriger un titre ne rapporte
        jamais plus que les points perdus sur le titre.
      </div>
    </div>
  </div>`;
}

export function axesList(score, { reasons = true } = {}){
  if (!score) return '';
  return `<div>${score.axes.map(a => {
    const cls = a.ratio < 45 ? 'low' : a.ratio < 75 ? 'mid' : '';
    return `<div class="axis" title="${esc(a.help || '')}">
      <span class="axis-label">${esc(a.label)}</span>
      <span class="axis-track"><i class="axis-fill ${cls}" style="width:${a.ratio}%"></i></span>
      <span class="axis-pts">${num(a.points)} / ${num(a.max)}</span>
      ${reasons && a.reasons.length ? `<div class="axis-reasons">${a.reasons.map(esc).join(' ')}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

/* Les règles renvoient un code d'action ; l'écran affiche une consigne
   lisible et, quand c'est pertinent, le bouton qui l'exécute. */
export const ACTION_LABELS = {
  generate_title:'Regénérer le titre depuis la fiche du bien.',
  generate_description:'Regénérer la description structurée.',
  generate_cta:'Ajouter une invitation à contacter en fin d’annonce.',
  restructure:'Restructurer le texte en paragraphes courts et titrés.',
  rewrite_simple:'Simplifier les phrases : une idée par phrase.',
  positioning:'Définir la cible et l’angle avant de réécrire.',
  ask_client:'Demander l’information au client : elle ne peut pas être inventée.',
  ask_photos:'Demander des photos supplémentaires au client.',
  reshoot_photos:'Refaire les prises de vue les plus faibles.',
};

export function problemList(problems = [], { limit = 100 } = {}){
  if (!problems.length)
    return `<div class="empty">${icon('checkCircle')}<h3>Aucun problème détecté</h3>
      <p>Les règles d’analyse ne relèvent rien sur ce texte.</p></div>`;
  return problems.slice(0, limit).map((p, i) => `
    <div class="problem">
      <span class="problem-rank">${i + 1}</span>
      <div>
        <div class="problem-head">
          <span class="badge ${severityTone(p.severity)}" style="margin-right:8px">${esc(p.severityLabel || p.severity)}</span>
          ${esc(p.explanation || p.label || p.id)}
        </div>
        ${p.recommendation ? `<div class="problem-why">${esc(p.recommendation)}</div>` : ''}
        ${p.action && ACTION_LABELS[p.action] ? `<div class="problem-do"><b>À faire :</b> ${esc(ACTION_LABELS[p.action])}</div>` : ''}
        ${p.verify ? `<span class="verify">À vérifier auprès du client : le système ne peut pas confirmer cette information.</span>` : ''}
      </div>
      <span class="problem-impact">${p.impact ? `${num(p.impact)} pt` : ''}</span>
    </div>`).join('');
}

export function tile(label, value, note = '', cls = ''){
  return `<div class="tile ${cls}">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value">${value}</div>
    ${note ? `<div class="tile-note">${note}</div>` : ''}
  </div>`;
}

export function dossierRow(d){
  const sc = d.analysis?.score?.total;
  return `<a class="mini" href="#/dossier/${esc(d.id)}">
    <div class="mini-name truncate">${esc(d.name)}</div>
    <div class="mini-sub">${sc === undefined ? 'Non analysé' : `Score ${num(sc)} / 100`} — ${esc(relTime(d.updatedAt))}</div>
  </a>`;
}

export { stageLabel, dateFR, relTime, num, esc, icon };

/* Modale de formulaire : corps libre, un bouton d'annulation, un bouton
   d'action. `onSubmit` reçoit l'élément du corps ; renvoyer false garde la
   modale ouverte (saisie incomplète). */
export function formModal({ title, subtitle = '', body, submitLabel = 'Enregistrer', wide = false, onSubmit }){
  return openModal({
    title, subtitle, wide, body,
    footer:`<button class="btn" data-cancel>Annuler</button>
            <button class="btn primary" data-ok>${esc(submitLabel)}</button>`,
    onMount(h){
      h.el.querySelector('[data-cancel]').onclick = () => h.close();
      h.el.querySelector('[data-ok]').onclick = () => {
        if (onSubmit(h.body, h) !== false) h.close();
      };
      h.el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('input:not([type=number])')){
          e.preventDefault();
          h.el.querySelector('[data-ok]').click();
        }
      });
    },
  });
}
