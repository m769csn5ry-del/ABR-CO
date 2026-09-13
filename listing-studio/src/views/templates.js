/* Templates d'annonce. */

import { esc, num } from '../core/util.js';
import { icon } from '../core/icons.js';
import { TEMPLATE_CATEGORIES } from '../data/templates.js';
import { tone as toneOf, audience as audienceOf, styleOf, highlight } from '../data/options.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { openModal, confirm, promptText } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { go } from '../core/router.js';
import { labelOf } from '../platforms/index.js';
import { emptyState } from './components.js';

export default function templates(outlet){
  renderTopbar({
    title:'Templates',
    actions:`<button class="btn primary" id="newTpl">${icon('plus')} Enregistrer un template</button>`,
  });
  draw(outlet);
  document.getElementById('newTpl').addEventListener('click', () => createFromProject(() => draw(outlet)));
}

function draw(outlet){
  const all = svc.allTemplates();
  outlet.innerHTML = `
  <div class="view">
    <div class="page-head">
      <p class="muted">Un template fixe un positionnement et une manière de rédiger — jamais des informations de logement.
      Appliquez-le à un projet : ton, public, style, points forts et plateformes sont pré-réglés.</p>
    </div>
    ${TEMPLATE_CATEGORIES.map(cat => {
      const rows = all.filter(t => t.category === cat);
      if (!rows.length && cat !== 'Mes templates') return '';
      return `<section style="margin-bottom:26px">
        <div class="seg-title"><h3>${esc(cat)}</h3><span class="ln"></span>
          <span class="muted" style="font-size:12.4px">${num(rows.length)}</span></div>
        ${rows.length ? `<div class="grid auto">${rows.map(card).join('')}</div>`
          : `<div class="card">${emptyState({ ic:'templates', title:'Aucun template personnel',
              text:'Enregistrez le positionnement d’un projet abouti pour le réutiliser.' })}</div>`}
      </section>`;
    }).join('')}
  </div>`;

  outlet.querySelectorAll('[data-tpl]').forEach(el => {
    const id = el.dataset.tpl;
    el.querySelector('[data-act="apply"]').addEventListener('click', () => applyTo(id, () => draw(outlet)));
    el.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
      const ok = await confirm({ title:'Supprimer ce template ?', danger:true, confirmLabel:'Supprimer',
        message:'Les projets qui l’ont utilisé ne sont pas modifiés.' });
      if (!ok) return;
      svc.deleteTemplate(id); toast('Template supprimé.'); draw(outlet);
    });
  });
}

function card(t){
  const p = t.preset || {};
  return `<div class="card pad" data-tpl="${esc(t.id)}">
    <div class="spread" style="align-items:flex-start">
      <div><h3 style="font-size:15px">${esc(t.label)}</h3>
        <p class="muted" style="font-size:12.8px;margin-top:4px">${esc(t.description)}</p></div>
      ${t.builtin ? '<span class="badge outline">Intégré</span>' : '<span class="badge brand">Perso</span>'}
    </div>
    <dl class="kv" style="margin-top:14px;font-size:12.6px">
      <dt>Ton</dt><dd>${esc(toneOf(p.tone).label)}</dd>
      <dt>Public</dt><dd>${esc((p.audiences || []).map(a => audienceOf(a)?.label).filter(Boolean).join(', ') || '—')}</dd>
      <dt>Style</dt><dd>${esc(styleOf(p.style).label)}</dd>
      <dt>Points forts</dt><dd>${esc((p.highlights || []).map(h => highlight(h)?.label).filter(Boolean).join(', ') || '—')}</dd>
      <dt>Plateformes</dt><dd>${esc((p.platforms || []).map(labelOf).join(', ') || '—')}</dd>
    </dl>
    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn sm primary grow" data-act="apply">Appliquer à un projet</button>
      ${t.builtin ? '' : `<button class="btn sm danger" data-act="delete">${icon('trash')}</button>`}
    </div>
  </div>`;
}

function applyTo(templateId, done){
  const projects = svc.listProjects();
  openModal({
    title:'Appliquer le template',
    body: projects.length ? `
      <p class="muted" style="font-size:13px;margin-bottom:12px">
        Le positionnement du projet sera remplacé ; la fiche du logement et les photos ne changent pas.
        Une version est enregistrée avant modification.</p>
      <div class="col" style="gap:8px">
        ${projects.map(p => `<button class="btn block" data-p="${esc(p.id)}" style="justify-content:space-between">
          <span>${esc(p.name)}</span><span class="muted">${esc(p.property?.city || '')}</span></button>`).join('')}
      </div>`
      : '<p class="muted">Aucun projet. Créez d’abord une annonce.</p>',
    footer: projects.length ? '' : `<a class="btn primary" href="#/project/new">Créer une annonce</a>`,
    onMount(h){
      h.el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
        svc.applyTemplate(b.dataset.p, templateId);
        h.close(); toast('Template appliqué. Régénérez l’annonce pour en voir l’effet.');
        go(`/project/${b.dataset.p}/step/7`);
        done?.();
      }));
    },
  });
}

function createFromProject(done){
  const projects = svc.listProjects();
  if (!projects.length){ toast('Créez d’abord un projet.', 'warn'); return; }
  openModal({
    title:'Enregistrer un template',
    body:`<div class="field"><label>Projet source</label>
        <select class="select" data-src>${projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field" style="margin-top:12px"><label>Nom du template</label>
        <input class="input" data-label placeholder="Ex. Villa premium famille"></div>
      <div class="field" style="margin-top:12px"><label>Description</label>
        <input class="input" data-desc placeholder="À quoi sert ce template ?"></div>`,
    footer:`<button class="btn" data-cancel>Annuler</button><button class="btn primary" data-save>Enregistrer</button>`,
    onMount(h){
      h.el.querySelector('[data-cancel]').onclick = () => h.close();
      h.el.querySelector('[data-save]').onclick = () => {
        const label = h.el.querySelector('[data-label]').value.trim();
        if (!label){ toast('Donnez un nom au template.', 'warn'); return; }
        svc.saveTemplate({
          label, description: h.el.querySelector('[data-desc]').value.trim(),
          projectId: h.el.querySelector('[data-src]').value,
        });
        h.close(); toast('Template enregistré.'); done?.();
      };
    },
  });
}
