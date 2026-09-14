/* Point d'entrée de la console.
 *
 * Amorce la session (utilisateur, organisation, appartenance), déclare les
 * routes, puis rend. Toute page vérifie elle-même l'autorisation : le routeur
 * ne fait pas office de contrôle d'accès.
 */

import { $ } from '../core/util.js';
import { icon } from '../core/icons.js';
import { route, fallback, start, go } from '../core/router.js';
import { failed } from '../core/toast.js';
import { on as onEvent } from '../core/events.js';
import * as ws from '../domain/workspace.js';
import { renderShell, renderTopbar, refreshNav } from './shell.js';
import * as dashboard from './pages/dashboard.js';
import * as dossiers from './pages/dossiers.js';
import * as dossier from './pages/dossier.js';
import * as crm from './pages/crm.js';
import * as clients from './pages/clients.js';
import * as commissions from './pages/commissions.js';
import * as admin from './pages/admin.js';
import * as automations from './pages/automations.js';
import * as batch from './pages/batch.js';
import * as report from './pages/report.js';
import * as auto from '../domain/automations.js';
import { seed, isSeeded } from './seed.js';

async function boot(){
  try{
    ws.bootstrap();
  }catch(err){
    document.getElementById('outlet').innerHTML =
      `<div class="view"><div class="callout bad">Impossible d’ouvrir la session : ${err.message}</div></div>`;
    return;
  }

  renderShell();

  route('/', dashboard.render);
  route('/dossiers', dossiers.renderList);
  route('/dossiers/nouveau', dossiers.renderNew);
  route('/dossiers/lot', batch.render);
  route('/dossier/:id', (p, q) => dossier.render({ ...p, tab:'fiche' }, q));
  route('/dossier/:id/:tab', dossier.render);
  route('/crm', crm.render);
  route('/clients', clients.render);
  route('/commissions', commissions.render);
  route('/automatisations', automations.render);
  route('/rapport/:id', report.render);
  route('/admin', admin.render);

  fallback((path) => {
    renderTopbar({ title:'Page introuvable' });
    $('#outlet').innerHTML = `<div class="view"><div class="empty">${icon('warning')}
      <h3>Page introuvable</h3>
      <p>Aucun écran ne correspond à <span class="mono">${path}</span>.</p>
      <a class="btn primary" href="#/">Retour au tableau de bord</a></div></div>`;
  });

  /* Premier lancement : un jeu de démonstration plutôt qu'une console vide.
     Il est marqué comme fictif et se supprime depuis l'administration. */
  if (!isSeeded()){
    try{ await seed(); }
    catch(err){ console.warn('[console] démonstration non chargée', err?.message); }
  }

  onEvent('route:error', ({ err }) => {
    console.error(err);
    failed(err?.message || 'Une erreur est survenue pendant le rendu.');
  });
  /* Les automatisations suivent l'état réel : un changement de dossier, de
     transaction ou de commission déclenche un passage groupé. Les règles ne
     touchent jamais à la validation, à la publication ni à l'encaissement. */
  onEvent('dossier:change', () => auto.schedule());
  onEvent('db:change', ({ table }) => {
    if (['transactions','commissions','leads','contracts'].includes(table)) auto.schedule();
  });

  onEvent('dossier:blocked', ({ reasons }) => {
    if (reasons?.length) console.info('[workflow] étape bloquée :', reasons.join(' '));
  });
  onEvent('workspace:switch', () => { refreshNav(); go('/'); });

  start();

  /* Premier passage à l'ouverture : la console affiche un état déjà à jour
     plutôt qu'une liste de choses que le système savait devoir faire. */
  auto.schedule({ delay: 900 });
}

boot();
