/* Étape 7 — Génération de l'annonce. */

import { esc, num, words, copy } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { TONES } from '../../data/options.js';
import { copyBlock, callout, emptyState, sectionTitle } from '../components.js';
import * as svc from '../../data/projects.js';
import * as ai from '../../ai/engine.js';
import { toast, failed } from '../../core/toast.js';
import { MISSING_MARK } from '../../ai/local/generator.js';
import { composeAll, labelOf } from '../../platforms/index.js';

export default function stepContent(host, ctx){
  const project = ctx.project;
  const c = project.content;
  const photos = ctx.photos();
  const missing = ai.missingInfo({ ...project, photoCount: photos.length });
  const required = missing.filter(m => m.severity === 'required');

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head">
        <h3>Rédaction de l’annonce</h3>
        <div class="row" style="gap:8px">
          <select class="select" id="toneSel" style="width:auto;min-width:170px">
            ${TONES.map(t => `<option value="${t.id}" ${project.positioning?.tone === t.id ? 'selected' : ''}>Ton ${esc(t.label)}</option>`).join('')}
          </select>
          <button class="btn primary" id="genBtn">${icon('sparkle')} ${c ? 'Régénérer' : 'Générer l’annonce'}</button>
        </div>
      </div>
      ${required.length || !c ? `<div class="card-body">
        ${required.length ? `<div class="callout warn" style="${c ? '' : 'margin-bottom:14px'}">${icon('warning')}
          <div><span class="strong">${num(required.length)} information(s) obligatoire(s) manquante(s).</span>
          L’annonce sera générée, mais les zones concernées porteront la mention « ${MISSING_MARK} ».
          <div class="row-wrap" style="margin-top:8px;gap:6px">
            ${required.map(m => `<button class="badge bad" data-goto="${m.step}">${esc(m.label)}</button>`).join('')}
          </div></div></div>` : ''}
        <div id="genState">${c ? '' : callout('Aucune annonce générée pour l’instant. La rédaction s’appuie exclusivement sur les informations saisies aux étapes précédentes.', 'plain', 'sparkle')}</div>
      </div>` : '<div id="genState" hidden></div>'}
    </section>

    <div id="contentBody">${c ? renderContent(project, c) : ''}</div>
  </div>`;

  host.querySelectorAll('[data-goto]').forEach(b =>
    b.addEventListener('click', () => ctx.goStep(Number(b.dataset.goto))));

  host.querySelector('#toneSel').addEventListener('change', (e) => {
    ctx.patch('positioning', { tone: e.target.value });
    toast(`Ton « ${TONES.find(t => t.id === e.target.value).label} » retenu. Régénérez pour l’appliquer.`, 'info');
  });

  host.querySelector('#genBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('loading');
    host.querySelector('#genState').innerHTML =
      `<div class="working"><span class="spinner"></span><span>Rédaction en cours — titre, descriptions, pièces, règles, FAQ…</span></div>`;
    try{
      await svc.generateContent(ctx.id, { tone: host.querySelector('#toneSel').value, seed: Date.now() % 997 });
      toast('Annonce générée.');
      ctx.reload();
    }catch(err){
      console.error(err);
      failed('La génération a échoué : ' + (err?.message || 'erreur inconnue'));
      btn.classList.remove('loading');
    }
  });

  if (c) wireContent(host, ctx, c);
}

function renderContent(project, c){
  const platforms = composeAll(c, project.platforms, { project });
  const missingCount = (JSON.stringify(c).match(new RegExp(MISSING_MARK, 'g')) || []).length;

  return `
  <section class="card">
    <div class="card-head"><h3>Titre</h3>
      <span class="muted" style="font-size:12.4px">${c.title.length} caractères</span></div>
    <div class="card-body">
      <div class="field">
        <input class="input" id="titleInput" value="${esc(c.title)}" style="font-size:16px;font-weight:600">
        <span class="hint">Modifiable librement. Airbnb coupe à 50 caractères, Leboncoin à 50, Vrbo à 80.</span>
      </div>
      <div style="margin-top:16px">
        ${sectionTitle('Variantes proposées')}
        <div class="col" style="gap:8px">
          ${c.titles.map(t => `<div class="spread" style="gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:var(--r-sm)">
            <span style="font-size:13.6px">${esc(t)}</span>
            <span class="row" style="gap:6px">
              <span class="badge outline">${t.length}</span>
              <button class="btn sm" data-title="${esc(t)}">Utiliser</button>
            </span></div>`).join('')}
        </div>
        <button class="btn sm" id="moreTitles" style="margin-top:10px">${icon('refresh')} Proposer d’autres titres</button>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Textes de l’annonce</h3>
      ${missingCount ? `<span class="badge bad">${num(missingCount)} information(s) manquante(s)</span>` : '<span class="badge ok">Aucune information manquante</span>'}</div>
    <div class="card-body stack-lg">
      <div class="field">
        <label>Accroche</label>
        <textarea class="textarea" id="hookInput" style="min-height:64px">${esc(c.hook)}</textarea>
      </div>
      <div class="field">
        <label>Description courte <span class="muted">(${c.shortDescription.length} caractères)</span></label>
        <textarea class="textarea" id="shortInput" style="min-height:110px">${esc(c.shortDescription)}</textarea>
      </div>
      <div class="field">
        <label>Description longue <span class="muted">(${words(c.longDescription)} mots)</span></label>
        <textarea class="textarea" id="longInput" style="min-height:280px">${esc(c.longDescription)}</textarea>
      </div>
      <div class="row-wrap" style="gap:8px">
        <button class="btn" data-copy-field="title">${icon('copy')} Copier le titre</button>
        <button class="btn" data-copy-field="longDescription">${icon('copy')} Copier la description</button>
        <button class="btn" data-copy-field="all">${icon('copy')} Copier tout</button>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Sections générées</h3></div>
    <div class="card-body">
      <div class="grid c2" style="gap:16px">
        ${block('Points forts', (c.highlights || []).map(h => '• ' + h).join('\n'))}
        ${block('Description des pièces', (c.rooms || []).map(r => `${r.name} : ${r.text}`).join('\n'))}
        ${block('Équipements', (c.amenities || []).join(', '))}
        ${block('Services', (c.services || []).join('\n') || 'Aucun service spécifique déclaré.')}
        ${block('Localisation', c.location)}
        ${block('À proximité', (c.attractions || []).map(a => `${a.name} — ${a.note}`).join('\n') || `${MISSING_MARK} : points d’intérêt`)}
        ${block('Activités', (c.activities || []).join(', ') || 'Non renseignées')}
        ${block('Informations pratiques', (c.practical || []).map(p => `${p.k} : ${p.v}`).join('\n'))}
        ${block('Règles du logement', (c.rules || []).map(r => '• ' + r).join('\n'))}
        ${block('Conditions d’arrivée', c.checkin)}
        ${block('Conditions de départ', c.checkout)}
        ${block('Instructions voyageurs', (c.instructions || []).map(i => '• ' + i).join('\n'))}
        ${block('Conseils voyageurs', (c.tips || []).map(t => '• ' + t).join('\n') || 'Aucun conseil déduit des informations fournies.')}
        ${block('FAQ', (c.faq || []).map(f => `${f.q}\n${f.a}`).join('\n\n'))}
        ${block('Appel à l’action', c.cta)}
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--gap)">
    <div class="card-head"><h3>Adaptation par plateforme</h3>
      <span class="muted" style="font-size:12.4px">${num(platforms.length)} format(s)</span></div>
    <div class="card-body">
      <div class="tabs" id="platTabs">
        ${platforms.map((p, i) => `<button class="tab ${i === 0 ? 'on' : ''}" data-tab="${esc(p.platform)}">${esc(p.label)}</button>`).join('')}
      </div>
      <div id="platPanels" style="margin-top:16px">
        ${platforms.map((p, i) => `<div data-panel="${esc(p.platform)}" class="${i === 0 ? '' : 'hidden'}">
          ${p.warnings.length ? `<div class="col" style="gap:6px;margin-bottom:12px">
            ${p.warnings.map(w => `<div class="callout ${w.level === 'bad' ? 'bad' : 'warn'}" style="padding:9px 12px;font-size:12.8px"><div>${esc(w.msg)}</div></div>`).join('')}
          </div>` : `<div class="callout ok" style="margin-bottom:12px;padding:9px 12px;font-size:12.8px"><div>Contenu conforme au format ${esc(p.label)}.</div></div>`}
          <div class="col" style="gap:12px">
            ${p.blocks.filter(b => b.text && String(b.text).trim()).map(b =>
              copyBlock(`${p.platform}-${b.id}`, `${b.label}${b.limit ? ` · ${String(b.text).length}/${b.limit}` : ''}`, b.text)).join('')}
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

const block = (title, text) => `<div class="card flat pad">
  <div class="eyebrow" style="margin-bottom:6px">${esc(title)}</div>
  <div style="font-size:13.3px;white-space:pre-wrap;line-height:1.6">${highlightMissing(text || '—')}</div>
</div>`;

function highlightMissing(text){
  return esc(String(text)).replace(
    new RegExp(`\\[${MISSING_MARK}[^\\]]*\\]`, 'g'),
    m => `<span class="missing">${m}</span>`);
}

function wireContent(host, ctx, c){
  const save = (patch) => {
    const next = { ...ctx.project.content, ...patch };
    ctx.update({ content: next });
    svc.refreshScore(ctx.id);
  };

  host.querySelector('#titleInput')?.addEventListener('change', e => { save({ title:e.target.value }); toast('Titre enregistré.'); });
  host.querySelector('#hookInput')?.addEventListener('change', e => save({ hook:e.target.value }));
  host.querySelector('#shortInput')?.addEventListener('change', e => save({ shortDescription:e.target.value }));
  host.querySelector('#longInput')?.addEventListener('change', e => save({ longDescription:e.target.value }));

  host.querySelectorAll('[data-title]').forEach(b => b.addEventListener('click', () => {
    save({ title:b.dataset.title });
    toast('Titre appliqué.');
    ctx.reload();
  }));

  host.querySelector('#moreTitles')?.addEventListener('click', async (e) => {
    e.currentTarget.classList.add('loading');
    const titles = await ai.titleVariants(ctx.project, 6, { seed: Date.now() % 991 });
    save({ titles });
    toast('Nouvelles variantes proposées.');
    ctx.reload();
  });

  host.querySelectorAll('[data-copy-field]').forEach(b => b.addEventListener('click', async () => {
    const f = b.dataset.copyField;
    const cur = ctx.project.content;
    let text = '';
    if (f === 'all'){
      const { toText } = await import('../../export/index.js');
      text = toText(ctx.project, { platform: 'generic' });
    } else text = cur[f] || '';
    const ok = await copy(text);
    ok ? toast('Copié dans le presse-papiers.') : failed('Copie impossible : sélectionnez le texte manuellement.');
  }));

  host.querySelectorAll('[data-copy-block] [data-copy]').forEach(b => b.addEventListener('click', async () => {
    const text = b.closest('[data-copy-block]').querySelector('[data-text]').textContent;
    (await copy(text)) ? toast('Copié.') : failed('Copie impossible.');
  }));

  host.querySelectorAll('#platTabs .tab').forEach(tab => tab.addEventListener('click', () => {
    host.querySelectorAll('#platTabs .tab').forEach(t => t.classList.remove('on'));
    tab.classList.add('on');
    host.querySelectorAll('[data-panel]').forEach(p =>
      p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.tab));
  }));
}
