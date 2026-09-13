/* Étape 6 — Choix des plateformes de diffusion. */

import { esc } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { groups, ALL, adapter } from '../../platforms/index.js';
import { callout } from '../components.js';
import { toast } from '../../core/toast.js';

export default function stepPlatforms(host, ctx){
  const selection = ctx.project.platforms;
  const isAll = selection === ALL || (Array.isArray(selection) && selection.includes(ALL));
  const selected = new Set(Array.isArray(selection) ? selection : [selection]);

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head"><h3>Plateformes de diffusion</h3>
        <label class="switch"><input type="checkbox" id="allToggle" ${isAll ? 'checked' : ''}>
          <span class="track"></span><span style="font-size:13px">Toutes les plateformes</span></label></div>
      <div class="card-body">
        ${callout('Le contenu est adapté au format de chaque plateforme : longueur du titre, structure des sections, contenus interdits. Aucun logo ni élément d’identité visuelle n’est reproduit — les aperçus sont des simulations neutres.', 'plain', 'layers')}
        <div class="stack-lg" style="margin-top:18px">
          ${groups().map(g => `
            <div>
              <div class="eyebrow" style="margin-bottom:10px">${esc(g.label)}</div>
              <div class="grid auto">
                ${g.items.map(a => card(a, selected.has(a.id) || isAll, isAll)).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Règles appliquées</h3></div>
      <div class="card-body" id="rulesBox">${rules(selected, isAll)}</div>
    </section>
  </div>`;

  host.querySelector('#allToggle').addEventListener('change', (e) => {
    ctx.update({ platforms: e.target.checked ? ALL : ['airbnb'] });
    toast(e.target.checked ? 'Toutes les plateformes sélectionnées.' : 'Sélection réinitialisée sur Airbnb.');
    ctx.reload();
  });

  host.querySelectorAll('[data-plat]').forEach(el => {
    el.addEventListener('click', () => {
      if (isAll) return;
      const id = el.dataset.plat;
      const next = new Set(Array.isArray(ctx.project.platforms) ? ctx.project.platforms : [ctx.project.platforms]);
      next.has(id) ? next.delete(id) : next.add(id);
      if (!next.size) next.add(id);
      ctx.update({ platforms: Array.from(next) });
      ctx.reload();
    });
  });
}

function card(a, on, disabled){
  return `<button type="button" class="option ${on ? 'on' : ''}" data-plat="${esc(a.id)}" ${disabled ? 'aria-disabled="true"' : ''}>
    <div class="spread">
      <span class="t">${esc(a.label)}</span>
      ${on ? `<span style="color:var(--brand)">${icon('check')}</span>` : ''}
    </div>
    <div class="d">Titre ${a.limits.title} car. · description ${a.limits.long} car.</div>
  </button>`;
}

function rules(selected, isAll){
  const ids = isAll ? ['airbnb','booking','vrbo','abritel','expedia','leboncoin','pap','facebook'] : Array.from(selected);
  return ids.map(id => {
    const a = adapter(id);
    return `<div style="margin-bottom:16px">
      <div class="strong" style="font-size:13.6px;margin-bottom:6px">${esc(a.label)}</div>
      <ul style="font-size:13px;color:var(--ink-3)">${a.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </div>`;
  }).join('') || '<p class="muted">Aucune plateforme sélectionnée.</p>';
}
