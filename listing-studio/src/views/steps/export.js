/* Étape 12 — Export. */

import { esc, copy, num } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { callout, copyBlock } from '../components.js';
import * as ex from '../../export/index.js';
import { printElement } from '../../export/index.js';
import * as svc from '../../data/projects.js';
import { resolve, labelOf } from '../../platforms/index.js';
import { toast, failed } from '../../core/toast.js';
import { buildReportModel, renderReportHTML } from '../../report/report.js';
import { photoUrlMap } from '../preview.js';
import { openModal } from '../../core/modal.js';

export default function stepExport(host, ctx){
  const project = ctx.project;
  const photos = ctx.photos();
  const platforms = resolve(project.platforms);

  if (!project.content){
    host.innerHTML = `<section class="card pad">${callout('Générez d’abord l’annonce : il n’y a rien à exporter pour l’instant.', 'warn', 'warning')}
      <button class="btn primary" id="toGen" style="margin-top:14px">Aller à la génération</button></section>`;
    host.querySelector('#toGen').addEventListener('click', () => ctx.goStep(7));
    return;
  }

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head"><h3>Copier</h3><span class="muted" style="font-size:12.4px">Presse-papiers</span></div>
      <div class="card-body">
        <div class="row-wrap" style="gap:8px">
          <button class="btn" data-copy="title">${icon('copy')} Copier le titre</button>
          <button class="btn" data-copy="shortDescription">${icon('copy')} Copier la description courte</button>
          <button class="btn" data-copy="longDescription">${icon('copy')} Copier la description</button>
          <button class="btn dark" data-copy="all">${icon('copy')} Copier tout</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Formats de fichier</h3></div>
      <div class="card-body">
        <div class="grid c4">
          ${ex.FORMATS.map(f => `<button class="option" data-format="${f.id}">
            <div class="t">${esc(f.label)}</div><div class="d">${esc(f.hint)}</div></button>`).join('')}
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Export par plateforme</h3>
        <span class="muted" style="font-size:12.4px">${num(platforms.length)} format(s) sélectionné(s)</span></div>
      <div class="card-body">
        ${callout('Un fichier par plateforme, mis en forme selon ses règles : longueur de titre, sections, contenus interdits.', 'plain', 'layers')}
        <div class="grid auto" style="margin-top:16px">
          ${platforms.map(p => `<div class="card flat pad">
            <div class="spread"><span class="strong">${esc(p.label)}</span>
              <button class="btn sm" data-plat-copy="${esc(p.id)}">${icon('copy')}</button></div>
            <div class="muted" style="font-size:12.3px;margin-top:4px">Titre ${p.limits.title} car. · description ${p.limits.long} car.</div>
            <button class="btn sm block" data-plat-dl="${esc(p.id)}" style="margin-top:10px">${icon('download')} Télécharger</button>
          </div>`).join('')}
        </div>
        <button class="btn block" id="dlAll" style="margin-top:14px">${icon('download')} Télécharger toutes les versions</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Aperçu de l’export texte</h3></div>
      <div class="card-body">
        ${copyBlock('exp-preview', 'Format universel', ex.toText(project, { platform:'generic' }))}
      </div>
    </section>
  </div>`;

  const mark = (fmt) => { svc.markExported(ctx.id, fmt); };

  host.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const f = b.dataset.copy;
    const text = f === 'all' ? ex.toText(project, { platform: project.platforms }) : (project.content[f] || '');
    (await copy(text)) ? toast('Copié dans le presse-papiers.') : failed('Copie impossible.');
    mark('copie');
  }));

  host.querySelectorAll('[data-format]').forEach(b => b.addEventListener('click', async () => {
    const f = b.dataset.format;
    try{
      if (f === 'txt'){ ex.downloadText(project, { platform: project.platforms }); toast('Fichier texte téléchargé.'); }
      if (f === 'json'){ ex.downloadJSON(project, { photos, platform: project.platforms }); toast('Fichier JSON téléchargé.'); }
      if (f === 'csv'){ ex.downloadCSV(project, { photos }); toast('Fichier CSV téléchargé.'); }
      if (f === 'pdf') await exportPdf(project, photos);
      mark(f);
    }catch(err){ console.error(err); failed('Export impossible : ' + err.message); }
  }));

  host.querySelectorAll('[data-plat-dl]').forEach(b => b.addEventListener('click', () => {
    ex.downloadText(project, { platform: b.dataset.platDl });
    toast(`Version ${labelOf(b.dataset.platDl)} téléchargée.`);
    mark('txt');
  }));

  host.querySelectorAll('[data-plat-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = ex.toText(project, { platform: b.dataset.platCopy });
    (await copy(text)) ? toast(`Version ${labelOf(b.dataset.platCopy)} copiée.`) : failed('Copie impossible.');
    mark('copie');
  }));

  host.querySelector('#dlAll').addEventListener('click', () => {
    const n = ex.downloadPerPlatform(project);
    toast(`${n} fichier(s) en cours de téléchargement.`);
    mark('txt');
  });

  host.querySelectorAll('[data-copy-block] [data-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = b.closest('[data-copy-block]').querySelector('[data-text]').textContent;
    (await copy(text)) ? toast('Copié.') : failed('Copie impossible.');
  }));
}

async function exportPdf(project, photos){
  const urls = await photoUrlMap(photos);
  const model = buildReportModel(project, photos, {
    versions: svc.listVersions(project.id), coverage: svc.photoCoverage(project.id),
  });
  const h = openModal({
    title:'Export PDF',
    subtitle:'Le rapport s’imprime via votre navigateur : choisissez « Enregistrer au format PDF ».',
    full:true,
    body: renderReportHTML(model, { photoUrls:urls, brand:{ name: svc.settings().brandName } }),
    footer:`<button class="btn" data-close2>Fermer</button><button class="btn primary" data-print>Imprimer / Enregistrer en PDF</button>`,
    onMount(handle){
      handle.el.querySelector('[data-close2]').onclick = () => handle.close();
      handle.el.querySelector('[data-print]').onclick = () =>
        printElement(handle.el.querySelector('.report'), { title:`Rapport — ${project.name}` });
    },
  });
  void h;
}
