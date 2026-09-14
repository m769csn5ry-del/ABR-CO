/* Rapport d'audit — la page qu'on remet au client.
 *
 * Elle s'imprime en PDF par la fonction d'impression du navigateur : pas de
 * bibliothèque tierce, pas de rendu serveur, le même document à l'écran et
 * sur le papier.
 */

import { $, esc, copy } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { toast, failed, saved } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import * as svc from '../../domain/dossiers.js';
import { buildReport } from '../../report/audit.js';
import { auditDraft, deliveryDraft } from '../../domain/outreach.js';

export function render(params){
  if (!ws.allows('report:read')){ $('#outlet').innerHTML = denied('report:read'); return; }
  const d = svc.get(params.id);
  if (!d){
    renderTopbar({ title:'Rapport introuvable' });
    $('#outlet').innerHTML = `<div class="view"><div class="empty">${icon('warning')}
      <h3>Dossier introuvable</h3><a class="btn" href="#/dossiers">Retour aux dossiers</a></div></div>`;
    return;
  }

  const client = d.clientId ? db.clients.find(d.clientId) : null;
  const perf = svc.performance(d.id);

  renderTopbar({
    title:'Rapport d’audit',
    crumb:`<a href="#/dossier/${esc(d.id)}">${esc(d.name)}</a>`,
    actions:`
      <button class="btn" id="draft">Message d’accompagnement</button>
      <button class="btn" id="copyBtn">Copier le texte</button>
      <button class="btn primary" id="print">Imprimer ou enregistrer en PDF</button>`,
  });

  $('#outlet').innerHTML = `<div class="view" style="max-width:940px">
    ${d.analysis ? '' : `<div class="callout warn" style="margin-bottom:var(--gap)">
      <b>Analyse non exécutée</b>
      <div style="margin-top:4px">Le rapport reprend les résultats de l’analyse : lancez-la d’abord depuis
        <a href="#/dossier/${esc(d.id)}/analyse">l’onglet Analyse</a>.</div></div>`}
    <div class="card" style="padding:var(--pad)" id="reportRoot">
      ${buildReport({ dossier:d, client, org:ws.org(), performance:perf.metrics?.length ? perf : null })}
    </div>
  </div>`;

  $('#print').addEventListener('click', () => window.print());
  $('#copyBtn').addEventListener('click', async () => {
    const txt = $('#reportRoot')?.innerText || '';
    if (!txt.trim()){ failed('Rien à copier.'); return; }
    await copy(txt);
    saved('Rapport copié');
  });
  $('#draft').addEventListener('click', () => {
    const draft = d.optimization ? deliveryDraft(d, client?.name) : auditDraft(d, client?.name);
    if (!draft){ failed('Lancez l’analyse pour produire un message.'); return; }
    showDraft(draft);
  });
}

function showDraft(draft){
  import('../ui.js').then(({ formModal }) => {
    formModal({
      title:'Message d’accompagnement', wide:true, submitLabel:'Copier le message',
      body:`<p class="subtle">${esc(draft.reason)} Aucun envoi n’est effectué : relisez, copiez,
        envoyez depuis votre propre messagerie.</p>
        <label class="field" style="margin-top:12px"><span>Objet</span>
          <input class="input" id="subject" value="${esc(draft.subject)}"></label>
        <label class="field" style="margin-top:10px"><span>Message</span>
          <textarea class="textarea" id="body" rows="14">${esc(draft.body)}</textarea></label>`,
      onSubmit(b){
        copy(`${b.querySelector('#subject').value}\n\n${b.querySelector('#body').value}`);
        toast('Message copié.');
      },
    });
  });
}
