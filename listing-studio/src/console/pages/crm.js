/* Pipeline commercial — les prospects et leur relance.
 *
 * Le statut d'un prospect porte un délai de péremption : passé ce délai sans
 * contact, une relance apparaît d'elle-même au tableau de bord.
 */

import { $, esc, num, dateFR, relTime } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { failed, saved, toast } from '../../core/toast.js';
import { renderTopbar, denied } from '../shell.js';
import * as db from '../../core/db.js';
import * as ws from '../../domain/workspace.js';
import { LEAD_STATUSES, leadStatus, deriveTasks } from '../../domain/crm.js';
import { log } from '../../domain/audit.js';
import { formModal } from '../ui.js';
import { followUpDraft, prospectionDraft } from '../../domain/outreach.js';
import { copy } from '../../core/util.js';

export function render(){
  if (!ws.allows('lead:read')){ $('#outlet').innerHTML = denied('lead:read'); return; }
  renderTopbar({
    title:'Pipeline', crumb:'Relation client',
    actions: ws.allows('lead:write') ? '<button class="btn primary" id="newLead">Nouveau prospect</button>' : '',
  });

  const leads = db.leads.all();
  const tasks = deriveTasks({ leads });
  const stale = new Set(tasks.map(t => t.entity.id));

  $('#outlet').innerHTML = `
  <div class="view">
    ${leads.length ? `
      <div class="pipeline">
        ${LEAD_STATUSES.map(s => {
          const list = leads.filter(l => l.status === s.id)
            .sort((a, b) => (b.lastContactAt || b.updatedAt) - (a.lastContactAt || a.updatedAt));
          return `<div class="stage-col">
            <div class="stage-head"><span>${esc(s.label)}</span><span class="count">${num(list.length)}</span></div>
            ${list.length ? list.map(l => `
              <button class="mini" data-lead="${esc(l.id)}">
                <div class="mini-name truncate">${esc(l.name)}</div>
                <div class="mini-sub">
                  ${esc(l.company || l.email || l.phone || 'sans coordonnées')}
                  <br>${esc(relTime(l.lastContactAt || l.updatedAt))}
                  ${stale.has(l.id) ? ' — <span style="color:var(--warn)">à relancer</span>' : ''}
                  ${l.draft ? ' — <span style="color:var(--brand)">message prêt</span>' : ''}
                </div>
              </button>`).join('')
              : '<div class="stage-empty">Aucun prospect</div>'}
          </div>`;
        }).join('')}
      </div>
      <p class="subtle" style="margin-top:var(--gap)">
        Les délais de relance sont attachés au statut : ${LEAD_STATUSES.filter(s => s.staleAfterDays)
          .map(s => `${s.label} ${s.staleAfterDays} j`).join(', ')}.
      </p>`
    : `<div class="empty">${icon('clients')}<h3>Aucun prospect</h3>
       <p>Ajoutez les propriétaires ou agences à qui vous proposez l’optimisation
          de leurs annonces. Le système déclenchera les relances au bon moment.</p>
       ${ws.allows('lead:write') ? '<button class="btn primary" id="newLead2">Ajouter un prospect</button>' : ''}</div>`}
  </div>`;

  document.getElementById('newLead')?.addEventListener('click', () => leadDialog());
  $('#newLead2')?.addEventListener('click', () => leadDialog());
  $('#outlet').querySelectorAll('[data-lead]').forEach(b =>
    b.addEventListener('click', () => leadDialog(db.leads.find(b.dataset.lead))));
}

function leadDialog(existing = null){
  formModal({
    title: existing ? existing.name : 'Nouveau prospect', wide:true,
    body:`<div class="form-grid">
        <label class="field"><span>Nom</span><input class="input" id="name" value="${esc(existing?.name || '')}" required autocomplete="off"></label>
        <label class="field"><span>Société</span><input class="input" id="company" value="${esc(existing?.company || '')}" autocomplete="off"></label>
        <label class="field"><span>Courriel</span><input class="input" type="email" id="email" value="${esc(existing?.email || '')}" autocomplete="off"></label>
        <label class="field"><span>Téléphone</span><input class="input" id="phone" value="${esc(existing?.phone || '')}" autocomplete="off"></label>
        <label class="field"><span>Statut</span>
          <select class="select" id="status">
            ${LEAD_STATUSES.map(s => `<option value="${esc(s.id)}" ${existing?.status === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select></label>
        <label class="field"><span>Source</span><input class="input" id="source" value="${esc(existing?.source || '')}" placeholder="Prospection, recommandation…" autocomplete="off"></label>
      </div>
      <label class="field" style="margin-top:12px"><span>Note</span>
        <textarea class="textarea" id="note" rows="3">${esc(existing?.note || '')}</textarea></label>
      ${existing ? `
        <div class="row" style="gap:8px;margin-top:14px">
          <button type="button" class="btn sm" id="draftBtn">${existing.draft ? 'Voir le message préparé' : 'Rédiger une relance'}</button>
          ${existing.draft ? '<button type="button" class="btn sm" id="sentBtn">Marquer comme envoyé</button>' : ''}
        </div>
        <div class="muted" style="font-size:11.8px;margin-top:10px">
          Créé le ${esc(dateFR(existing.createdAt))}${existing.lastContactAt ? ` — dernier contact ${esc(relTime(existing.lastContactAt))}` : ''}${existing.followUpCount ? ` — ${num(existing.followUpCount)} relance(s) envoyée(s)` : ''}.
          Enregistrer met à jour la date de dernier contact.
        </div>` : ''}`,
    onSubmit(b){
      const name = b.querySelector('#name').value.trim();
      if (!name){ failed('Le nom est obligatoire.'); return false; }
      const data = {
        name,
        company:b.querySelector('#company').value.trim(),
        email:b.querySelector('#email').value.trim(),
        phone:b.querySelector('#phone').value.trim(),
        status:b.querySelector('#status').value,
        source:b.querySelector('#source').value.trim(),
        note:b.querySelector('#note').value.trim(),
        lastContactAt: Date.now(),
      };
      try{
        ws.require_('lead:write');
        if (existing){
          db.leads.update(existing.id, data);
          if (existing.status !== data.status)
            log('entity.update', { entity:'lead', entityId:existing.id, note:`${leadStatus(existing.status).label} → ${leadStatus(data.status).label}` });
        } else {
          db.leads.insert(data);
          log('entity.create', { entity:'lead', entityId:null, note:name });
        }
        saved();
        render();
      }catch(err){ failed(err.message); return false; }
    },
  });

  if (!existing) return;
  const root = document.querySelector('.modal-root .modal:last-child .modal-body');
  root.querySelector('#draftBtn')?.addEventListener('click', async () => {
    const draft = existing.draft
      ? { subject: existing.draftSubject || 'Relance', body: existing.draft,
          reason:'Brouillon préparé automatiquement.' }
      : (existing.lastContactAt ? followUpDraft(existing)
                                : prospectionDraft({ name: existing.name, city: existing.city || '' }));
    await copy(`${draft.subject}\n\n${draft.body}`);
    db.leads.update(existing.id, { draft: draft.body, draftSubject: draft.subject, draftAt: Date.now() });
    toast('Message copié. Envoyez-le depuis votre messagerie, puis marquez-le comme envoyé.', 'ok', { duration:4200 });
  });
  root.querySelector('#sentBtn')?.addEventListener('click', () => {
    db.leads.update(existing.id, {
      followUpCount: (existing.followUpCount || 0) + 1,
      lastContactAt: Date.now(), draft:null, draftSubject:null,
      status: existing.status === 'new' ? 'contacted' : existing.status,
    });
    log('entity.update', { entity:'lead', entityId:existing.id, note:'Relance marquée comme envoyée' });
    saved('Relance enregistrée');
    document.querySelector('.modal-root .modal:last-child [data-cancel]')?.click();
    render();
  });
}
