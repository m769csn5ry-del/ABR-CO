/* Étape 5 — Photos manquantes : checklist des catégories attendues. */

import { esc, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { callout } from '../components.js';
import * as svc from '../../data/projects.js';
import { toast } from '../../core/toast.js';

export default function stepCoverage(host, ctx){
  const cov = svc.photoCoverage(ctx.id);
  const photos = ctx.photos();
  const checked = ctx.project.coverageChecked || [];

  host.innerHTML = `
  <div class="grid c2" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Photos détectées</h3>
        <span class="badge ${cov.completeness >= 80 ? 'ok' : cov.completeness >= 50 ? 'warn' : 'bad'}">
          Couverture ${cov.completeness}%</span></div>
      <div class="card-body">
        ${cov.detected.length ? `<div class="col" style="gap:8px">
          ${cov.detected.map(d => `<div class="spread" style="padding:9px 0;border-bottom:1px solid var(--line)">
            <span class="row" style="gap:8px">${icon('checkCircle')}<span class="strong">${esc(d.label)}</span></span>
            <span class="muted">${num(d.count)} photo(s)</span></div>`).join('')}
        </div>` : '<p class="muted">Aucune photo importée.</p>'}
        ${cov.perBedroom.bedrooms > 1 ? `<div style="margin-top:16px">${
          cov.perBedroom.photos >= cov.perBedroom.bedrooms
            ? callout(`Chaque chambre est représentée (${cov.perBedroom.photos} photo(s) pour ${cov.perBedroom.bedrooms} chambres).`, 'ok', 'checkCircle')
            : callout(`${cov.perBedroom.photos} photo(s) de chambre pour ${cov.perBedroom.bedrooms} chambres déclarées : les voyageurs attendent une vue par chambre.`, 'warn', 'warning')
        }</div>` : ''}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Photos recommandées</h3>
        <span class="muted" style="font-size:12.4px">${num(cov.missing.length)} à prévoir</span></div>
      <div class="card-body">
        ${cov.missing.length ? `
          <p class="muted" style="font-size:13px;margin-bottom:14px">
            Cette liste découle de votre fiche : seuls les éléments que vous avez déclarés y figurent.
            Cochez au fur et à mesure pour suivre le shooting.</p>
          <div class="col" style="gap:2px">
            ${cov.missing.map(m => `
              <label class="check" style="padding:10px;border-radius:var(--r-sm);border:1px solid var(--line);margin-bottom:8px">
                <input type="checkbox" data-cov="${esc(m.id)}" ${checked.includes(m.id) ? 'checked' : ''}>
                <span>
                  <span class="strong">${esc(m.label)}</span>
                  ${m.essential ? '<span class="badge bad" style="margin-left:6px">Essentielle</span>' : '<span class="badge outline" style="margin-left:6px">Conseillée</span>'}
                  <span class="muted" style="display:block;font-size:12.4px;margin-top:2px">${esc(m.why)}</span>
                </span>
              </label>`).join('')}
          </div>
          <button class="btn block" id="markReviewed" style="margin-top:6px">${icon('check')} Marquer la checklist comme revue</button>
        ` : callout('Toutes les catégories attendues pour ce logement sont couvertes.', 'ok', 'checkCircle')}
      </div>
    </section>
  </div>`;

  host.querySelectorAll('[data-cov]').forEach(cb => {
    cb.addEventListener('change', () => {
      const list = new Set(ctx.project.coverageChecked || []);
      cb.checked ? list.add(cb.dataset.cov) : list.delete(cb.dataset.cov);
      ctx.update({ coverageChecked: Array.from(list) });
    });
  });
  host.querySelector('#markReviewed')?.addEventListener('click', () => {
    ctx.update({ coverageReviewed:true });
    toast('Checklist photo marquée comme revue.');
    ctx.hardReload();
  });
}
