/* Mode démo — génère un projet fictif complet pour une présentation client. */

import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { go } from '../core/router.js';
import { toast, failed } from '../core/toast.js';
import { callout } from './components.js';
import { propertyType } from '../data/options.js';

export default function demo(outlet){
  renderTopbar({ title:'Mode démo', crumb:'Présentation client' });
  const catalog = svc.demoCatalog;

  outlet.innerHTML = `
  <div class="view">
    <div class="page-head">
      <h2>Générer une démonstration complète</h2>
      <p>Choisissez un logement fictif : le studio produit les photos de démonstration, l’annonce, le score,
      la recommandation tarifaire et l’aperçu — en une trentaine de secondes, sans toucher à vos vrais projets.</p>
    </div>

    ${callout('Toutes les informations générées sont fictives et signalées comme telles : mention « Démonstration » dans l’interface, sur l’aperçu, dans le rapport et dans les exports. Les photos sont dessinées par le navigateur et portent la mention DÉMO.', 'warn', 'warning')}

    <div class="grid auto" style="margin-top:20px">
      ${catalog.map(d => `
        <div class="card hover" data-demo="${esc(d.key)}">
          <div class="card-body">
            <div class="spread" style="align-items:flex-start">
              <div>
                <h3 style="font-size:15px">${esc(d.label)}</h3>
                <div class="muted" style="font-size:12.6px;margin-top:4px">${esc(d.summary)}</div>
              </div>
              <span class="badge outline">${esc(propertyType(d.type).label)}</span>
            </div>
            <button class="btn primary block" style="margin-top:16px" data-gen="${esc(d.key)}">
              ${icon('sparkle')} Générer une démo</button>
          </div>
        </div>`).join('')}
    </div>

    <div id="demoProgress" class="hidden" style="margin-top:20px">
      <div class="card pad">
        <div class="working"><span class="spinner"></span><span id="demoLabel">Préparation…</span></div>
        <div class="progress" style="margin-top:12px"><i id="demoBar" style="width:0%"></i></div>
      </div>
    </div>
  </div>`;

  outlet.querySelectorAll('[data-gen]').forEach(btn => btn.addEventListener('click', async () => {
    const key = btn.dataset.gen;
    const box = outlet.querySelector('#demoProgress');
    const bar = outlet.querySelector('#demoBar');
    const label = outlet.querySelector('#demoLabel');
    box.classList.remove('hidden');
    outlet.querySelectorAll('[data-gen]').forEach(b => b.setAttribute('disabled', ''));
    btn.classList.add('loading');

    const PHASES = {
      projet:'Création du projet fictif…',
      photos:'Génération et analyse des photos de démonstration…',
      ordre:'Calcul de l’ordre optimal de la galerie…',
      annonce:'Rédaction de l’annonce…',
      pricing:'Calcul de la recommandation tarifaire…',
      fini:'Terminé.',
    };

    try{
      const project = await svc.createDemoProject(key, {
        onProgress:({ phase, pct, index, total }) => {
          bar.style.width = `${pct}%`;
          label.textContent = PHASES[phase] + (index ? ` (${index}/${total})` : '');
        },
      });
      toast('Démonstration prête.');
      go(`/project/${project.id}/step/10`);
    }catch(err){
      console.error(err);
      failed('Génération de la démo impossible : ' + (err?.message || 'erreur inconnue'));
      box.classList.add('hidden');
      outlet.querySelectorAll('[data-gen]').forEach(b => b.removeAttribute('disabled'));
      btn.classList.remove('loading');
    }
  }));
}
