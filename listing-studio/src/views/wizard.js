/* Parcours de création d'une annonce — coquille, navigation par étapes,
   sauvegarde automatique et liaison des formulaires. */

import { $, esc, debounce } from '../core/util.js';
import { icon } from '../core/icons.js';
import { go } from '../core/router.js';
import { renderTopbar } from './shell.js';
import { toast, saved } from '../core/toast.js';

import * as svc from '../data/projects.js';
import { emit } from '../core/events.js';

import stepProperty from './steps/property.js';
import stepPositioning from './steps/positioning.js';
import stepPhotos from './steps/photos.js';
import stepOrder from './steps/order.js';
import stepCoverage from './steps/coverage.js';
import stepPlatforms from './steps/platforms.js';
import stepContent from './steps/content.js';
import stepPricing from './steps/pricing.js';
import stepScore from './steps/score.js';
import stepPreview from './steps/preview.js';
import stepReport from './steps/report.js';
import stepExport from './steps/export.js';

export const STEPS = [
  { n:1,  label:'Logement',     short:'Bien',        view:stepProperty },
  { n:2,  label:'Positionnement', short:'Position',  view:stepPositioning },
  { n:3,  label:'Photos',       short:'Photos',      view:stepPhotos },
  { n:4,  label:'Ordre',        short:'Ordre',       view:stepOrder },
  { n:5,  label:'Couverture',   short:'Manquantes',  view:stepCoverage },
  { n:6,  label:'Plateformes',  short:'Plateformes', view:stepPlatforms },
  { n:7,  label:'Annonce',      short:'Annonce',     view:stepContent },
  { n:8,  label:'Prix',         short:'Prix',        view:stepPricing },
  { n:9,  label:'Optimisation', short:'Score',       view:stepScore },
  { n:10, label:'Aperçu',       short:'Aperçu',      view:stepPreview },
  { n:11, label:'Rapport',      short:'Rapport',     view:stepReport },
  { n:12, label:'Export',       short:'Export',      view:stepExport },
];

let currentCtx = null;
export const activeContext = () => currentCtx;

export default function wizard(outlet, { id, step }){
  const n = Math.max(1, Math.min(STEPS.length, Number(step) || 1));
  let project = svc.getProject(id);
  if (!project){
    outlet.innerHTML = `<div class="view card">${'' }<div class="empty"><h3>Projet introuvable</h3>
      <p class="muted">Ce projet n’existe pas ou appartient à un autre espace de travail.</p>
      <a class="btn primary" href="#/projects" style="margin-top:14px">Retour aux annonces</a></div></div>`;
    renderTopbar({ title:'Projet introuvable' });
    return;
  }
  if ((project.step || 1) !== n) project = svc.updateProject(id, { step:n });

  const meta = STEPS.find(s => s.n === n);
  renderTopbar({
    title: project.name || 'Projet sans titre',
    crumb: `Annonce · Étape ${n} sur ${STEPS.length} — ${esc(meta.label)}`,
    actions: `
      <a class="btn sm" href="#/project/${esc(id)}/preview">${icon('eye')} Aperçu</a>
      <button class="btn sm" id="wzRename">${icon('edit')}</button>`,
  });

  outlet.innerHTML = `
  <div class="view">
    ${project.isDemo ? `<div class="row" style="margin-bottom:10px"><span class="demo-tag">Démonstration</span></div>
      <div class="callout warn" style="margin-bottom:16px">${icon('warning')}
      <div><span class="strong">Projet de démonstration.</span> Les informations et les photos sont fictives :
      elles servent à présenter le travail, jamais à publier une annonce réelle.</div></div>` : ''}

    <div class="stepper" role="tablist" aria-label="Étapes">
      ${STEPS.map(s => `<button class="step-pill ${s.n === n ? 'on' : ''} ${isDone(project, s.n) ? 'done' : ''}"
        data-step="${s.n}" role="tab" aria-selected="${s.n === n}">
        <span class="n">${isDone(project, s.n) && s.n !== n ? '✓' : s.n}</span>${esc(s.short)}</button>`).join('')}
    </div>

    <div id="stepHost" style="margin-top:var(--gap)"></div>

    <div class="wizard-foot">
      <button class="btn" id="wzPrev" ${n === 1 ? 'disabled' : ''}>${icon('chevronLeft')} Précédent</button>
      <div class="muted" style="font-size:12.5px" id="wzSaveState">Sauvegarde automatique active</div>
      <button class="btn primary" id="wzNext">${n === STEPS.length ? 'Terminer' : 'Étape suivante'} ${icon('chevronRight')}</button>
    </div>
  </div>`;

  const host = $('#stepHost', outlet);

  const ctx = {
    get project(){ return svc.getProject(id); },
    id, step:n,
    patch: (section, patch) => { svc.patchSection(id, section, patch); flash(); },
    update: (patch, opts) => { svc.updateProject(id, patch, opts); flash(); },
    reload: () => { renderStep(); },
    hardReload: () => wizard(outlet, { id, step:String(n) }),
    goStep: (target) => go(`/project/${id}/step/${target}`),
    photos: () => svc.getPhotos(id),
    toast,
  };
  currentCtx = ctx;

  function renderStep(){
    host.innerHTML = '';
    meta.view(host, ctx);
    bindForm(host, ctx);
  }
  renderStep();

  $('#wzPrev', outlet).addEventListener('click', () => n > 1 && ctx.goStep(n - 1));
  $('#wzNext', outlet).addEventListener('click', () => {
    if (n < STEPS.length) ctx.goStep(n + 1);
    else { svc.updateProject(id, { status:'pret' }); toast('Projet marqué comme prêt.'); go('/projects'); }
  });
  outlet.querySelectorAll('[data-step]').forEach(b =>
    b.addEventListener('click', () => ctx.goStep(Number(b.dataset.step))));
  $('#wzRename', document).addEventListener('click', async () => {
    const { promptText } = await import('../core/modal.js');
    const v = await promptText({ title:'Renommer le projet', label:'Nom du projet', value: project.name });
    if (v){ svc.updateProject(id, { name:v }); wizard(outlet, { id, step:String(n) }); }
  });

  emit('wizard:render', { id, step:n });
}

function flash(){
  const el = document.getElementById('wzSaveState');
  if (!el) return;
  el.textContent = 'Enregistré';
  el.style.color = 'var(--ok)';
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    el.textContent = 'Sauvegarde automatique active';
    el.style.color = '';
  }, 1600);
}

function isDone(p, step){
  switch (step){
    case 1: return Boolean(p.property?.city && p.property?.guests);
    case 2: return Boolean(p.positioning?.audiences?.length && p.positioning?.highlights?.length);
    case 3: return (p.photoCount ?? 0) > 0 || svc.getPhotoRecords(p.id).length > 0;
    case 4: return svc.getPhotoRecords(p.id).some(x => x.orderReason);
    case 5: return Boolean(p.coverageReviewed);
    case 6: return Boolean(p.platforms && (p.platforms === 'all' || p.platforms.length));
    case 7: return Boolean(p.content);
    case 8: return Boolean(p.pricingRecommendation?.ok);
    case 9: return Boolean(p.score);
    case 10: return Boolean(p.previewSeen);
    case 11: return Boolean(p.reportId);
    case 12: return (p.exportCount || 0) > 0;
    default: return false;
  }
}

/* ---------- Liaison de formulaire ----------
   Tout champ portant data-bind="section.champ" est sauvegardé automatiquement,
   sans bouton « enregistrer » : la saisie n'est jamais perdue. */
export function bindForm(host, ctx){
  const save = debounce((section, field, value) => {
    if (section === 'root') ctx.update({ [field]: value });
    else ctx.patch(section, { [field]: value });
  }, 420);

  host.querySelectorAll('[data-bind]').forEach(el => {
    const [section, field] = el.dataset.bind.split('.');
    const read = () => {
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'number') return el.value === '' ? '' : Number(el.value);
      if (el.dataset.tristate) return el.value === '' ? null : el.value === 'true';
      return el.value;
    };
    const evt = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') ? 'change' : 'input';
    el.addEventListener(evt, () => save(section, field, read()));
    el.addEventListener('blur', () => save.flush(section, field, read()));
  });
}

export function saveNow(){ saved(); }
