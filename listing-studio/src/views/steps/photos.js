/* Étape 3 — Import et analyse des photos. */

import { esc, num, avg } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { photoCard, emptyState, callout, scoreBadge } from '../components.js';
import * as svc from '../../data/projects.js';
import { photoUrl } from '../../data/projects.js';
import { toast, failed } from '../../core/toast.js';
import { confirm, openModal } from '../../core/modal.js';
import { PHOTO_CATEGORIES, photoCategory } from '../../data/options.js';

export default function stepPhotos(host, ctx){
  const photos = ctx.photos();
  const scores = photos.map(p => p.analysis?.scores?.score || 0);
  const ranked = photos.slice().sort((a, b) => (b.analysis?.scores?.score || 0) - (a.analysis?.scores?.score || 0));

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head"><h3>Photos du logement</h3>
        <span class="muted" style="font-size:12.4px">JPG, JPEG, PNG, WEBP</span></div>
      <div class="card-body">
        <div class="dropzone" id="dz" tabindex="0" role="button" aria-label="Importer des photos">
          ${icon('upload')}
          <div class="big" style="margin-top:8px">Glissez vos photos ici, ou cliquez pour les choisir</div>
          <div class="muted" style="font-size:13px;margin-top:6px">
            Chaque image est analysée dans votre navigateur : netteté, exposition, composition, désordre, perspective.
            Aucune photo n’est envoyée sur un serveur.</div>
          <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" multiple hidden>
        </div>
        <div id="progress" class="hidden" style="margin-top:14px">
          <div class="working"><span class="spinner"></span><span id="progressLabel">Analyse en cours…</span></div>
          <div class="progress" style="margin-top:8px"><i id="progressBar" style="width:0%"></i></div>
        </div>
      </div>
    </section>

    ${photos.length ? `
    <section class="card">
      <div class="card-head">
        <h3>Analyse — ${num(photos.length)} photo(s)</h3>
        <div class="row" style="gap:8px">
          <span class="badge outline">Qualité moyenne ${Math.round(avg(scores))}/100</span>
          <button class="btn sm" id="reanalyze">${icon('refresh')} Ré-analyser</button>
        </div>
      </div>
      <div class="card-body">
        <div class="photo-grid" id="grid">
          ${photos.map((p, i) => photoCard(p, null, { rank:i + 1 })).join('')}
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Classement des meilleures photos</h3>
        <span class="muted" style="font-size:12.4px">Établi sur la note globale</span></div>
      <div class="card-body">
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>#</th><th>Photo</th><th>Pièce</th><th>Score</th><th>Netteté</th><th>Luminosité</th><th>Composition</th><th>Recommandation</th></tr></thead>
            <tbody>
              ${ranked.map((p, i) => `<tr>
                <td class="strong">${i + 1}</td>
                <td class="truncate" style="max-width:180px">${esc(p.label || p.filename)}</td>
                <td>${esc(photoCategory(p.category).label)}</td>
                <td>${scoreBadge(p.analysis?.scores?.score)}</td>
                <td>${p.analysis?.scores?.nettete ?? '—'}</td>
                <td>${p.analysis?.scores?.luminosite ?? '—'}</td>
                <td>${p.analysis?.scores?.composition ?? '—'}</td>
                <td class="muted" style="font-size:12.5px">${esc((p.analysis?.recommendations || [])[0]?.text || '')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>` : `<section class="card">${emptyState({
        ic:'photos',
        title:'Aucune photo pour l’instant',
        text:'Huit à quinze photos bien exposées font la différence sur le taux de clic. Importez-les pour lancer l’analyse.',
      })}</section>`}
  </div>`;

  loadThumbs(host, photos);
  wireDropzone(host, ctx);
  wireCards(host, ctx, photos);

  host.querySelector('#reanalyze')?.addEventListener('click', async () => {
    toast('Ré-analyse lancée…', 'info');
    for (const p of ctx.photos()){
      const url = await photoUrl(p);
      if (!url) continue;
      const img = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = url; });
      const { default: engineRef } = { default: null };
      void engineRef;
      const ai = await import('../../ai/engine.js');
      const a = await ai.analyzePhoto(img, { filename:p.filename });
      svc.db.photoAnalyses.removeWhere(x => x.photoId === p.id);
      svc.db.photoAnalyses.insert({ photoId:p.id, projectId:ctx.id, scores:a.scores, metrics:a.metrics,
                                    recommendations:a.recommendations, engine:a.engine });
      svc.updatePhoto(p.id, { category:a.category, categoryConfidence:a.categoryConfidence, categorySource:a.categorySource });
    }
    svc.refreshScore(ctx.id);
    toast('Analyse mise à jour.');
    ctx.reload();
  });
}

async function loadThumbs(host, photos){
  for (const p of photos){
    const url = await photoUrl(p);
    const el = host.querySelector(`.photo-card[data-id="${p.id}"] .photo-thumb`);
    if (el && url) el.innerHTML = `<img src="${url}" alt="${esc(p.label || '')}" loading="lazy">`
      + el.innerHTML.replace(/<div class="skeleton"[^>]*><\/div>/, '');
  }
}

function wireDropzone(host, ctx){
  const dz = host.querySelector('#dz');
  const input = host.querySelector('#fileInput');
  const prog = host.querySelector('#progress');
  const bar = host.querySelector('#progressBar');
  const label = host.querySelector('#progressLabel');

  const run = async (files) => {
    if (!files?.length) return;
    prog.classList.remove('hidden');
    try{
      const { imported, rejected } = await svc.addPhotos(ctx.id, files, {
        onProgress:({ done, total, filename }) => {
          bar.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`;
          label.textContent = filename ? `Analyse de ${filename} (${done + 1}/${total})` : 'Finalisation…';
        },
      });
      if (rejected.length) failed(`${rejected.length} fichier(s) ignoré(s) : formats acceptés JPG, PNG, WEBP.`);
      if (imported.length) toast(`${imported.length} photo(s) analysée(s).`);
      svc.refreshScore(ctx.id);
      ctx.reload();
    }catch(err){
      console.error(err);
      failed('Import impossible : ' + (err?.message || 'erreur inconnue'));
    }finally{
      prog.classList.add('hidden');
      bar.style.width = '0%';
    }
  };

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change', () => { run(input.files); input.value = ''; });
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => run(e.dataTransfer?.files));
}

function wireCards(host, ctx, photos){
  host.querySelectorAll('.photo-card').forEach(card => {
    const id = card.dataset.id;
    const photo = photos.find(p => p.id === id);
    card.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
      const ok = await confirm({ title:'Supprimer cette photo ?', message:'Elle sera retirée du projet et de la galerie.', danger:true, confirmLabel:'Supprimer' });
      if (!ok) return;
      svc.deletePhoto(id);
      svc.refreshScore(ctx.id);
      toast('Photo supprimée.');
      ctx.reload();
    });
    card.querySelector('[data-act="category"]')?.addEventListener('click', () => {
      openModal({
        title:'Pièce représentée',
        subtitle: photo.categorySource ? `Détection : ${photo.categorySource} (confiance ${Math.round((photo.categoryConfidence || 0) * 100)} %)` : '',
        body:`<div class="chips">${PHOTO_CATEGORIES.map(c => `<button class="chip ${photo.category === c.id ? 'on' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`).join('')}</div>`,
        onMount(h){
          h.el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
            svc.updatePhoto(id, { category:b.dataset.cat, categorySource:'correction manuelle', categoryConfidence:1 });
            h.close(); toast('Catégorie mise à jour.'); ctx.reload();
          }));
        },
      });
    });
    card.querySelector('[data-act="detail"]')?.addEventListener('click', async () => {
      const url = await photoUrl(photo);
      const s = photo.analysis?.scores || {};
      openModal({
        title: photo.label || photo.filename,
        subtitle:`${photoCategory(photo.category).label} · ${photo.width}×${photo.height} px`,
        wide:true,
        body:`<div class="grid c2" style="gap:18px">
          <div><img src="${esc(url || '')}" alt="" style="width:100%;border-radius:10px;border:1px solid var(--line)"></div>
          <div>
            ${['nettete','luminosite','contraste','composition','ordre','perspective','attractivite','qualitePro'].map(k => `
              <div class="bar-line"><div class="nm">${esc(LABELS[k])}</div>
                <div class="track ${s[k] < 55 ? 'bad' : s[k] < 75 ? 'warn' : ''}"><i style="width:${s[k] || 0}%"></i></div>
                <div class="vl">${s[k] ?? '—'}</div></div>`).join('')}
            <div class="spread" style="margin-top:16px">
              <span class="strong">Note globale</span>${scoreBadge(s.score)}</div>
            <div class="col" style="gap:6px;margin-top:14px">
              ${(photo.analysis?.recommendations || []).map(r => `<div class="callout ${r.level === 'ok' ? 'ok' : r.level === 'bad' ? 'bad' : 'warn'}" style="padding:9px 12px;font-size:12.8px"><div>${esc(r.text)}</div></div>`).join('')}
            </div>
          </div></div>`,
      });
    });
  });
}

const LABELS = {
  nettete:'Netteté', luminosite:'Luminosité', contraste:'Contraste', composition:'Composition',
  ordre:'Rangement', perspective:'Perspective', attractivite:'Attractivité', qualitePro:'Qualité pro',
};
