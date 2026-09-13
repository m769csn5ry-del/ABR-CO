/* Étape 11 — Rapport client. */

import { esc, dateFR } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import * as svc from '../../data/projects.js';
import { buildReportModel, renderReportHTML } from '../../report/report.js';
import { photoUrlMap } from '../preview.js';
import { printElement } from '../../export/index.js';
import { toast } from '../../core/toast.js';

export default function stepReport(host, ctx){
  const project = ctx.project;

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <div class="spread no-print" style="flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="font-size:19px">Rapport client</h2>
        <p class="muted" style="font-size:13px;margin-top:4px">
          Document de restitution : score avant / après, photos à refaire, contenu recommandé, prix et priorités.</p>
      </div>
      <div class="row" style="gap:8px">
        <button class="btn" id="saveReport">${icon('check')} Enregistrer</button>
        <button class="btn primary" id="pdfReport">${icon('download')} Exporter en PDF</button>
      </div>
    </div>
    <div id="reportHost"><div class="skeleton" style="height:420px;border-radius:12px"></div></div>
  </div>`;

  (async () => {
    const photos = ctx.photos();
    const urls = await photoUrlMap(photos);
    const model = buildReportModel(project, photos, {
      versions: svc.listVersions(ctx.id),
      coverage: svc.photoCoverage(ctx.id),
    });
    const brand = { name: svc.settings().brandName || 'Listing Studio' };
    host.querySelector('#reportHost').innerHTML = renderReportHTML(model, { photoUrls:urls, brand });

    host.querySelector('#pdfReport').addEventListener('click', () => {
      printElement(host.querySelector('.report'), { title:`Rapport — ${project.name}` });
      svc.markExported(ctx.id, 'pdf');
    });

    host.querySelector('#saveReport').addEventListener('click', () => {
      const r = svc.saveReport({
        projectId: ctx.id, clientId: project.clientId,
        title:`Rapport — ${project.name}`,
        scoreBefore: model.score?.total ?? null,
        scorePotential: model.potential ?? null,
        isDemo: Boolean(project.isDemo),
        model,
      });
      svc.updateProject(ctx.id, { reportId: r.id });
      toast('Rapport enregistré dans la bibliothèque.');
      ctx.hardReload();
    });
  })();
}
