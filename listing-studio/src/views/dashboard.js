/* Tableau de bord. */

import { esc, num, relTime } from '../core/util.js';
import { icon } from '../core/icons.js';
import { statCard, emptyState, projectCard, sectionTitle, scoreRing } from './components.js';
import * as svc from '../data/projects.js';
import { renderTopbar } from './shell.js';
import { go } from '../core/router.js';
import { BUILTIN_TEMPLATES } from '../data/templates.js';
import { toast } from '../core/toast.js';

export default function dashboard(outlet){
  const s = svc.dashboardStats();
  const projects = svc.listProjects().slice(0, 6);
  const templates = svc.allTemplates().slice(0, 6);
  const u = svc.user();
  const quota = svc.canCreateProject();

  renderTopbar({
    title:'Tableau de bord',
    crumb: esc(u.settings?.brandName || 'Listing Studio'),
    actions:`<a class="btn primary" href="#/project/new">${icon('plus')} Nouvelle annonce</a>`,
  });

  outlet.innerHTML = `
  <div class="view">
    <section class="card" style="overflow:hidden;margin-bottom:var(--gap)">
      <div class="card-body" style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;padding:26px">
        <div class="grow" style="min-width:260px">
          <div class="eyebrow">Créer une annonce</div>
          <h2 style="margin:8px 0 8px">Une fiche logement, dix minutes, une annonce prête à publier.</h2>
          <p class="muted" style="max-width:62ch">
            Renseignez le bien, importez les photos, choisissez vos plateformes : le studio rédige, note,
            ordonne la galerie et prépare l’aperçu client.</p>
          <div class="row" style="gap:10px;margin-top:18px;flex-wrap:wrap">
            <a class="btn primary lg" href="#/project/new">${icon('plus')} Nouvelle annonce</a>
            <a class="btn lg" href="#/demo">${icon('sparkle')} Générer une démo</a>
          </div>
          ${quota.limit !== Infinity ? `<div class="muted" style="font-size:12.5px;margin-top:12px">
            Plan ${esc(quota.plan)} : ${num(quota.used)} projet(s) sur ${num(quota.limit)}.</div>` : ''}
        </div>
        ${s.avgScore !== null ? `<div class="card flat pad center" style="min-width:210px">
          <div class="eyebrow" style="margin-bottom:10px">Score moyen du portefeuille</div>
          ${scoreRing(s.avgScore)}
          <div class="muted" style="font-size:12.5px;margin-top:10px">${num(s.listings)} annonce(s) notée(s)</div>
        </div>` : ''}
      </div>
    </section>

    <div class="grid c4" style="margin-bottom:var(--gap)">
      ${statCard({ k:'Annonces créées', v:num(s.listings), s:`${num(s.projects)} projet(s) au total`, ic:'listings' })}
      ${statCard({ k:'Projets en cours', v:num(s.inProgress), s:'Brouillons et en cours', ic:'clock' })}
      ${statCard({ k:'Clients', v:num(s.clients), s:`${num(s.reports)} rapport(s)`, ic:'clients' })}
      ${statCard({ k:'Annonces exportées', v:num(s.exported), s:`${num(s.exportTotal)} export(s) réalisé(s)`, ic:'download' })}
    </div>

    <div class="grid split">
      <section>
        ${sectionTitle('Dernières annonces', '<a class="btn sm" href="#/projects">Tout voir</a>')}
        ${projects.length
          ? `<div class="grid auto">${projects.map(p => projectCard(p)).join('')}</div>`
          : `<div class="card">${emptyState({
              title:'Aucun projet pour l’instant',
              text:'Créez votre première annonce ou générez une démonstration pour voir le résultat en une minute.',
              action:'<a class="btn primary" href="#/project/new">Créer une annonce</a> <a class="btn" href="#/demo">Générer une démo</a>',
            })}</div>`}
      </section>

      <aside class="col" style="gap:var(--gap)">
        <section class="card">
          <div class="card-head"><h3>Templates récents</h3><a class="btn sm ghost" href="#/templates">Gérer</a></div>
          <div class="list">
            ${templates.map(t => `<button class="list-item" data-tpl="${esc(t.id)}" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);cursor:pointer">
              <span class="thumb">${icon('templates')}</span>
              <span class="grow"><span class="strong" style="display:block;font-size:13.5px">${esc(t.label)}</span>
              <span class="muted" style="font-size:12.2px">${esc(t.category)}</span></span>
              ${icon('chevronRight')}
            </button>`).join('')}
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Statistiques générales</h3></div>
          <div class="card-body">
            <dl class="kv">
              <dt>Photos analysées</dt><dd>${num(s.photos)}</dd>
              <dt>Score moyen</dt><dd>${s.avgScore !== null ? s.avgScore + '/100' : '—'}</dd>
              <dt>Templates enregistrés</dt><dd>${num(s.templates)}</dd>
              <dt>Rapports générés</dt><dd>${num(s.reports)}</dd>
              <dt>Projets de démonstration</dt><dd>${num(s.demo)}</dd>
            </dl>
          </div>
        </section>

        ${projects.length ? `<section class="card">
          <div class="card-head"><h3>Reprendre</h3></div>
          <div class="list">
            ${projects.slice(0, 3).map(p => `<a class="list-item" href="#/project/${esc(p.id)}/step/${p.step || 1}">
              <span class="thumb">${icon('listings')}</span>
              <span class="grow"><span class="strong truncate" style="display:block;font-size:13.4px">${esc(p.name)}</span>
              <span class="muted" style="font-size:12px">Étape ${p.step || 1} · ${relTime(p.updatedAt)}</span></span>
              ${icon('arrowRight')}</a>`).join('')}
          </div>
        </section>` : ''}
      </aside>
    </div>
  </div>`;

  outlet.querySelectorAll('[data-tpl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tplId = btn.dataset.tpl;
      const check = svc.canCreateProject();
      if (!check.allowed){
        toast(`Plan ${check.plan} : limite de ${check.limit} projets atteinte.`, 'warn');
        go('/settings?tab=plan');
        return;
      }
      const tpl = svc.allTemplates().find(t => t.id === tplId) || BUILTIN_TEMPLATES[0];
      const p = svc.createProject({ name:`Projet ${tpl.label}` });
      svc.applyTemplate(p.id, tpl.id);
      toast(`Template « ${tpl.label} » appliqué au nouveau projet.`);
      go(`/project/${p.id}/step/1`);
    });
  });
}
