/* Briques d'interface partagées par les vues. */

import { esc, num, money, dateFR, relTime, initials } from '../core/util.js';
import { icon } from '../core/icons.js';
import { PART_LABELS } from '../scoring/listingScore.js';
import { clientStatus, projectStatus, photoCategory, propertyType } from '../data/options.js';
import { labelOf } from '../platforms/index.js';

export function scoreRing(value, { size = '', label = '/100' } = {}){
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const r = 42, c = 2 * Math.PI * r;
  const lvl = v >= 80 ? 'excellent' : v >= 55 ? 'bon' : 'faible';
  return `<div class="score-ring ${size} lvl-${lvl}" role="img" aria-label="Score ${v} sur 100">
    <svg viewBox="0 0 100 100">
      <circle class="bg" cx="50" cy="50" r="${r}" fill="none" stroke-width="9"/>
      <circle class="fg" cx="50" cy="50" r="${r}" fill="none" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - v / 100)).toFixed(1)}"/>
    </svg>
    <div class="val">${v}<small>${esc(label)}</small></div>
  </div>`;
}

export const scoreBadge = (v) => {
  const n = Math.round(v || 0);
  const cls = n >= 80 ? 'ok' : n >= 55 ? 'warn' : 'bad';
  return `<span class="badge ${cls}">${n}/100</span>`;
};

export function statCard({ k, v, s = '', ic = 'chart' }){
  return `<div class="card stat">
    <div class="ic">${icon(ic)}</div>
    <div class="k">${esc(k)}</div>
    <div class="v">${esc(String(v))}</div>
    ${s ? `<div class="s">${esc(s)}</div>` : ''}
  </div>`;
}

export function emptyState({ title, text, action = '', ic = 'listings' }){
  return `<div class="empty">
    <div class="ic">${icon(ic)}</div>
    <h3>${esc(title)}</h3>
    <p class="muted">${esc(text)}</p>
    ${action ? `<div style="margin-top:16px">${action}</div>` : ''}
  </div>`;
}

export const sectionTitle = (t, right = '') =>
  `<div class="seg-title"><h3>${esc(t)}</h3><span class="ln"></span>${right}</div>`;

export function scoreBars(score){
  if (!score) return '<p class="muted">Score non calculé.</p>';
  return Object.entries(score.parts).map(([k, p]) => {
    const ratio = p.value / p.max;
    return `<div class="bar-line">
      <div class="nm">${esc(PART_LABELS[k] || k)}</div>
      <div class="track ${ratio < .6 ? 'bad' : ratio < .8 ? 'warn' : ''}"><i style="width:${Math.round(ratio * 100)}%"></i></div>
      <div class="vl">${p.value}/${p.max}</div>
    </div>`;
  }).join('');
}

export function projectCard(p, { href } = {}){
  const st = projectStatus(p.status);
  const score = p.score?.total;
  return `<a class="card hover" href="${esc(href || `#/project/${p.id}/step/1`)}" style="display:block;text-decoration:none;color:inherit">
    <div class="card-body" style="padding:16px">
      <div class="spread" style="align-items:flex-start">
        <div class="grow">
          <div class="row" style="gap:8px;margin-bottom:6px">
            <span class="badge ${st.badge}">${esc(st.label)}</span>
            ${p.isDemo ? '<span class="demo-tag">Démo</span>' : ''}
          </div>
          <h3 class="truncate" style="font-size:15px">${esc(p.name || 'Sans titre')}</h3>
          <div class="muted truncate" style="font-size:12.6px;margin-top:3px">
            ${esc([p.property?.type ? propertyType(p.property.type).label : '', p.property?.city].filter(Boolean).join(' · ') || 'Fiche à compléter')}
          </div>
        </div>
        ${typeof score === 'number' ? scoreRing(score, { size:'sm', label:'' }) : ''}
      </div>
      <div class="spread" style="margin-top:14px;font-size:12px" class="muted">
        <span class="dim">${relTime(p.updatedAt)}</span>
        <span class="dim">${esc(Array.isArray(p.platforms) ? p.platforms.map(labelOf).slice(0, 2).join(', ') : labelOf(p.platforms))}</span>
      </div>
    </div>
  </a>`;
}

export function clientRow(c, projectsCount){
  const st = clientStatus(c.status);
  return `<tr data-id="${esc(c.id)}">
    <td><div class="row"><span class="avatar">${esc(initials(c.name))}</span>
      <div><div class="strong">${esc(c.name || 'Sans nom')}</div>
      <div class="muted" style="font-size:12.3px">${esc(c.company || '—')}</div></div></div></td>
    <td class="muted">${esc(c.email || '—')}<br><span class="dim" style="font-size:12px">${esc(c.phone || '')}</span></td>
    <td>${num(c.propertiesCount || 0)}</td>
    <td>${num(projectsCount)}</td>
    <td><span class="badge ${st.badge}">${esc(st.label)}</span></td>
    <td class="actions">
      <button class="btn sm" data-act="edit">Ouvrir</button>
      <button class="btn sm danger" data-act="delete" aria-label="Supprimer">${icon('trash')}</button>
    </td>
  </tr>`;
}

export function photoCard(p, url, { rank = null, actions = true } = {}){
  const s = p.analysis?.scores?.score;
  const cls = s >= 75 ? 'ok' : s >= 55 ? 'warn' : 'bad';
  const recs = (p.analysis?.recommendations || []).slice(0, 2);
  return `<div class="photo-card" data-id="${esc(p.id)}">
    <div class="photo-thumb">
      ${url ? `<img src="${esc(url)}" alt="${esc(p.label || '')}" loading="lazy">` : '<div class="skeleton" style="width:100%;height:100%"></div>'}
      ${rank !== null ? `<span class="rank">${rank}</span>` : ''}
      ${typeof s === 'number' ? `<span class="sc ${cls}">${s}</span>` : ''}
    </div>
    <div class="photo-meta">
      <div class="spread">
        <span class="rm">${esc(photoCategory(p.category).label)}</span>
        ${p.isDemo ? '<span class="demo-tag">Démo</span>' : ''}
      </div>
      <div class="dim truncate" style="font-size:11.5px;margin-top:2px">${esc(p.filename || '')}</div>
      <div class="col" style="gap:3px;margin-top:8px">
        ${recs.map(r => `<div style="font-size:11.8px;color:var(--${r.level === 'ok' ? 'ok' : r.level === 'bad' ? 'bad' : 'warn'})">${esc(r.text)}</div>`).join('')}
      </div>
    </div>
    ${actions ? `<div class="photo-actions">
      <button class="btn sm" data-act="detail">Détail</button>
      <button class="btn sm" data-act="category">Catégorie</button>
      <button class="btn sm danger" data-act="delete">${icon('trash')}</button>
    </div>` : ''}
  </div>`;
}

export function chipGroup(items, selected = [], { name = '', multi = true } = {}){
  const sel = new Set(Array.isArray(selected) ? selected : [selected]);
  return `<div class="chips" data-chips="${esc(name)}" data-multi="${multi}">
    ${items.map(i => `<button type="button" class="chip ${sel.has(i.id) ? 'on' : ''}" data-value="${esc(i.id)}">${esc(i.label)}</button>`).join('')}
  </div>`;
}

export function optionGrid(items, selected, { name = '' } = {}){
  return `<div class="option-grid" data-options="${esc(name)}">
    ${items.map(i => `<button type="button" class="option ${selected === i.id ? 'on' : ''}" data-value="${esc(i.id)}">
      <div class="t">${esc(i.label)}</div>${i.desc ? `<div class="d">${esc(i.desc)}</div>` : ''}
    </button>`).join('')}
  </div>`;
}

/** Câble un groupe de pastilles / options ; appelle onChange avec la sélection. */
export function wireChips(root, name, onChange){
  const box = root.querySelector(`[data-chips="${name}"]`) || root.querySelector(`[data-options="${name}"]`);
  if (!box) return;
  const multi = box.dataset.multi === 'true';
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    if (multi){
      btn.classList.toggle('on');
      onChange(Array.from(box.querySelectorAll('.on')).map(b => b.dataset.value));
    }else{
      box.querySelectorAll('[data-value]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      onChange(btn.dataset.value);
    }
  });
}

export const callout = (text, kind = 'plain', ic = 'info') =>
  `<div class="callout ${kind}">${icon(ic)}<div>${text}</div></div>`;

export const loadingBlock = (label = 'Traitement en cours') =>
  `<div class="working"><span class="spinner"></span><span>${esc(label)}</span></div>`;

export const skeletonCard = () => `<div class="card pad">
  <div class="skeleton sk-line" style="width:40%"></div>
  <div class="skeleton sk-line" style="width:80%"></div>
  <div class="skeleton sk-line" style="width:65%"></div></div>`;

export function copyBlock(id, title, text, { mono = false } = {}){
  return `<div class="copy-block" data-copy-block="${esc(id)}">
    <div class="hd"><span class="strong" style="font-size:12.5px">${esc(title)}</span>
      <button class="btn sm ghost" data-copy>${icon('copy')} Copier</button></div>
    <div class="bd ${mono ? 'mono' : ''}" data-text>${esc(text || '')}</div>
  </div>`;
}

export const missingPill = (label) =>
  `<span class="missing" data-missing>${icon('warning')} ${esc(label)}</span>`;

export const money2 = money;
export const fmtDate = dateFR;
