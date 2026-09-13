/* Étape 4 — Ordre des photos (recommandation + glisser-déposer). */

import { esc, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { emptyState, callout, scoreBadge } from '../components.js';
import * as svc from '../../data/projects.js';
import { photoUrl } from '../../data/projects.js';
import { photoCategory } from '../../data/options.js';
import { toast } from '../../core/toast.js';

export default function stepOrder(host, ctx){
  const photos = ctx.photos();
  const suggested = svc.suggestOrder(ctx.id);
  const sameAsSuggested = photos.map(p => p.id).join() === suggested.map(p => p.id).join();

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head">
        <h3>Ordre de la galerie</h3>
        <div class="row" style="gap:8px">
          <button class="btn sm ${sameAsSuggested ? '' : 'primary'}" id="applyOrder">${icon('sparkle')} Appliquer l’ordre recommandé</button>
        </div>
      </div>
      <div class="card-body">
        ${callout('Les trois premières vignettes décident du clic. L’ordre proposé place l’image la plus forte en couverture, puis déroule une visite logique. Vous pouvez tout réorganiser à la main.', 'plain', 'info')}
        ${photos.length ? `<div class="sortable" id="sortable" style="margin-top:16px">
          ${photos.map((p, i) => row(p, i)).join('')}
        </div>` : emptyState({ ic:'photos', title:'Aucune photo à ordonner', text:'Importez d’abord des photos à l’étape précédente.' })}
      </div>
    </section>

    ${photos.length ? `<section class="card">
      <div class="card-head"><h3>Ordre recommandé par l’assistant</h3>
        <span class="muted" style="font-size:12.4px">${sameAsSuggested ? 'Déjà appliqué' : 'Non appliqué'}</span></div>
      <div class="card-body">
        <ol style="font-size:13.5px;padding-left:20px">
          ${suggested.map(p => `<li style="margin-bottom:6px">
            <span class="strong">${esc(photoCategory(p.category).label)}</span>
            <span class="muted"> — ${esc(p.reason)}</span></li>`).join('')}
        </ol>
      </div>
    </section>` : ''}
  </div>`;

  photos.forEach(async p => {
    const url = await photoUrl(p);
    const img = host.querySelector(`[data-row="${p.id}"] img`);
    if (img && url) img.src = url;
  });

  host.querySelector('#applyOrder')?.addEventListener('click', () => {
    svc.applyOptimalOrder(ctx.id);
    toast('Ordre recommandé appliqué.');
    ctx.reload();
  });

  wireDragDrop(host, ctx);
}

function row(p, i){
  return `<div class="sort-item" data-row="${esc(p.id)}" draggable="true">
    <span class="handle" aria-hidden="true">${icon('drag')}</span>
    <span class="pos">${i + 1}</span>
    <img alt="" loading="lazy">
    <div class="grow" style="min-width:0">
      <div class="row" style="gap:8px">
        <span class="strong" style="font-size:13.6px">${esc(photoCategory(p.category).label)}</span>
        ${scoreBadge(p.analysis?.scores?.score)}
        ${i === 0 ? '<span class="badge brand">Couverture</span>' : ''}
      </div>
      <div class="muted truncate" style="font-size:12.3px;margin-top:2px">${esc(p.orderReason || svc.orderReason(p, i))}</div>
    </div>
    <div class="row" style="gap:4px">
      <button class="icon-btn" data-up aria-label="Monter">${icon('chevronLeft')}</button>
      <button class="icon-btn" data-down aria-label="Descendre">${icon('chevronRight')}</button>
    </div>
  </div>`;
}

function wireDragDrop(host, ctx){
  const list = host.querySelector('#sortable');
  if (!list) return;
  let dragged = null;

  const commit = () => {
    const ids = Array.from(list.querySelectorAll('[data-row]')).map(el => el.dataset.row);
    svc.reorderPhotos(ctx.id, ids);
    svc.refreshScore(ctx.id);
    ctx.reload();
  };

  list.querySelectorAll('[data-row]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragged = el; el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.row);
    });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); dragged = null;
      list.querySelectorAll('.drop-target').forEach(t => t.classList.remove('drop-target')); });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragged || dragged === el) return;
      el.classList.add('drop-target');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop-target');
      if (!dragged || dragged === el) return;
      const items = Array.from(list.children);
      const from = items.indexOf(dragged), to = items.indexOf(el);
      if (from < to) el.after(dragged); else el.before(dragged);
      commit();
    });
    el.querySelector('[data-up]').addEventListener('click', () => {
      const prev = el.previousElementSibling;
      if (prev){ prev.before(el); commit(); }
    });
    el.querySelector('[data-down]').addEventListener('click', () => {
      const next = el.nextElementSibling;
      if (next){ next.after(el); commit(); }
    });
  });
}
