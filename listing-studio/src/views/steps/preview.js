/* Étape 10 — Aperçu de l'annonce (simulation). */

import { esc } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { MODES, simulationHTML, photoUrlMap } from '../preview.js';
import { resolve } from '../../platforms/index.js';

export default function stepPreview(host, ctx){
  const project = ctx.project;
  const photos = ctx.photos();
  const platforms = resolve(project.platforms);
  let mode = 'desktop';
  let platform = platforms[0]?.id || null;

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <div class="preview-toolbar">
      <div class="btn-group" id="modeGroup">
        ${MODES.map(m => `<button data-mode="${m.id}" class="${m.id === mode ? 'on' : ''}">${esc(m.label)}</button>`).join('')}
      </div>
      <div class="row" style="gap:8px">
        <select class="select" id="platSel" style="width:auto">
          ${platforms.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}
        </select>
        <a class="btn sm" href="#/project/${esc(ctx.id)}/preview" target="_self">${icon('eye')} Plein écran</a>
      </div>
    </div>
    <div class="preview-stage" id="stage"><div class="skeleton" style="width:100%;height:340px;border-radius:12px"></div></div>
    <div class="callout plain">${icon('info')}<div>
      L’aperçu sert à présenter votre travail à un prospect. Il porte la mention « Simulation créée avec Listing Studio »
      et n’imite volontairement aucune interface de plateforme.</div></div>
  </div>`;

  const stage = host.querySelector('#stage');

  (async () => {
    const urls = await photoUrlMap(photos);
    const draw = () => { stage.innerHTML = simulationHTML(project, photos, urls, mode, platform); };
    draw();
    host.querySelectorAll('#modeGroup button').forEach(b => b.addEventListener('click', () => {
      host.querySelectorAll('#modeGroup button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); mode = b.dataset.mode; draw();
    }));
    host.querySelector('#platSel').addEventListener('change', e => { platform = e.target.value; draw(); });
  })();

  if (!project.previewSeen) ctx.update({ previewSeen:true });
}
