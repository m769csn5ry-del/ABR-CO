/* Point d'entrée : amorçage, routes, gestion globale des erreurs. */

import { $ } from './core/util.js';
import * as router from './core/router.js';
import { toast, failed } from './core/toast.js';
import { on as onEvent } from './core/events.js';
import * as ai from './ai/engine.js';
import * as svc from './data/projects.js';
import { renderShell, renderTopbar, refreshNav, setChrome } from './views/shell.js';
import { mountAssistant } from './views/assistant.js';

import landing from './views/landing.js';
import dashboard from './views/dashboard.js';
import newProject from './views/newProject.js';
import wizard from './views/wizard.js';
import listings from './views/listings.js';
import library from './views/library.js';
import templates from './views/templates.js';
import clients from './views/clients.js';
import reports from './views/reports.js';
import settings from './views/settings.js';
import demo from './views/demo.js';
import previewPage from './views/previewPage.js';

const outlet = () => $('#outlet');

/* ---------- Routes ---------- */
function page(view, { chrome = true } = {}){
  return (params, query, route) => {
    setChrome(chrome);
    const el = outlet();
    el.innerHTML = '';
    try{
      view(el, params, query, route);
    }catch(err){
      console.error('[vue]', err);
      el.innerHTML = errorCard(err);
    }
    window.scrollTo({ top:0 });
  };
}

router.route('/', page(landing, { chrome:false }));
router.route('/app', page(dashboard));
router.route('/project/new', page(newProject));
router.route('/project/:id/step/:step', page(wizard));
router.route('/project/:id/preview', page(previewPage, { chrome:false }));
router.route('/project/:id', (p) => router.go(`/project/${p.id}/step/1`, { replace:true }));
router.route('/projects', page(listings));
router.route('/library', page(library));
router.route('/library/:tab', page(library));
router.route('/templates', page(templates));
router.route('/clients', page(clients));
router.route('/reports', page(reports));
router.route('/settings', page(settings));
router.route('/demo', page(demo));

router.fallback((path) => {
  setChrome(true);
  renderTopbar({ title:'Page introuvable' });
  outlet().innerHTML = `<div class="card"><div class="empty">
    <h3>Page introuvable</h3>
    <p class="muted">Le chemin <span class="mono">${path}</span> ne correspond à aucune page.</p>
    <a class="btn primary" href="#/app" style="margin-top:16px">Retour au tableau de bord</a>
  </div></div>`;
});

const errorCard = (err) => `<div class="card"><div class="empty">
  <h3>Cette page n’a pas pu s’afficher</h3>
  <p class="muted">${String(err?.message || err)}</p>
  <div class="row" style="justify-content:center;gap:10px;margin-top:16px">
    <a class="btn" href="#/app">Tableau de bord</a>
    <button class="btn primary" onclick="location.reload()">Recharger</button>
  </div></div></div>`;

/* ---------- Amorçage ---------- */
async function boot(){
  svc.ensureUser();
  renderShell();
  mountAssistant();
  router.start();

  // Le mode IA est sondé en arrière-plan : l'app reste utilisable sans serveur.
  ai.init().catch(() => {});

  onEvent('ai:fallback', (e) => {
    console.warn('[ia] repli local', e);
    toast('Service IA indisponible : rédaction assurée par le moteur local.', 'warn', { duration:4000 });
  });
  onEvent('db:quota', () => {
    failed('Espace de stockage du navigateur saturé : supprimez des photos ou exportez une sauvegarde.');
  });
  onEvent('route:after', () => { refreshNavSafe(); });
}

function refreshNavSafe(){
  try{ refreshNav(); }catch(err){ console.error('[shell]', err); }
}

window.addEventListener('error', (e) => {
  console.error('[global]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[promesse]', e.reason);
  if (e.reason?.message) failed('Erreur : ' + e.reason.message);
});

boot();
