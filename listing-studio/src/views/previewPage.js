/* Aperçu plein écran — vue de présentation à un prospect. */

import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import { MODES, simulationHTML, photoUrlMap } from './preview.js';
import { resolve } from '../platforms/index.js';
import * as svc from '../data/projects.js';
import { setChrome } from './shell.js';

export default function previewPage(outlet, { id }){
  const project = svc.getProject(id);
  if (!project){ outlet.innerHTML = '<div class="empty"><h3>Projet introuvable</h3></div>'; return; }
  const photos = svc.getPhotos(id);
  const platforms = resolve(project.platforms);
  let mode = 'desktop';
  let platform = platforms[0]?.id || null;

  setChrome(false);

  outlet.innerHTML = `
  <div style="min-height:100vh;background:var(--canvas)">
    <div style="position:sticky;top:0;z-index:10;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)">
      <div class="spread" style="max-width:1180px;margin:0 auto;padding:12px 20px;gap:12px;flex-wrap:wrap">
        <a class="btn sm" href="#/project/${esc(id)}/step/10">${icon('chevronLeft')} Retour au projet</a>
        <div class="btn-group" id="modeGroup">
          ${MODES.map(m => `<button data-mode="${m.id}" class="${m.id === mode ? 'on' : ''}">${esc(m.label)}</button>`).join('')}
        </div>
        <select class="select" id="platSel" style="width:auto">
          ${platforms.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="max-width:1180px;margin:0 auto;padding:24px 20px 60px">
      <div class="preview-stage" id="stage" style="background:transparent;border:0;padding:0"></div>
    </div>
  </div>`;

  const stage = outlet.querySelector('#stage');
  (async () => {
    const urls = await photoUrlMap(photos);
    const draw = () => { stage.innerHTML = simulationHTML(project, photos, urls, mode, platform); };
    draw();
    outlet.querySelectorAll('#modeGroup button').forEach(b => b.addEventListener('click', () => {
      outlet.querySelectorAll('#modeGroup button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); mode = b.dataset.mode; draw();
    }));
    outlet.querySelector('#platSel').addEventListener('change', e => { platform = e.target.value; draw(); });
  })();
}
