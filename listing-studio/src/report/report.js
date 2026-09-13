/* Rapport client — document de restitution prêt à présenter.
   Il ne contient que des éléments calculés : scores mesurés, photos analysées,
   priorités issues du Listing Score, recommandation tarifaire interne. */

import { esc, dateFR, num, money, trimTo } from '../core/util.js';
import { PART_LABELS } from '../scoring/listingScore.js';
import { photoCategory, audience as audienceOf, tone as toneOf, propertyType } from '../data/options.js';
import { labelOf } from '../platforms/index.js';

/* ---------- Modèle ---------- */
export function buildReportModel(project, photos = [], { versions = [], coverage = null } = {}){
  const score = project.score;
  const content = project.content;
  const rec = project.pricingRecommendation;

  const analyzed = photos.filter(p => p.analysis);
  const toRedo = analyzed.filter(p => (p.analysis.scores.score || 0) < 55)
    .sort((a, b) => a.analysis.scores.score - b.analysis.scores.score);
  const toImprove = analyzed.filter(p => {
    const s = p.analysis.scores.score || 0; return s >= 55 && s < 70;
  });

  const optimisations = versions.slice(0, 12).map(v => ({
    label: v.label, at: v.createdAt, score: v.scoreTotal,
  }));

  return {
    generatedAt: Date.now(),
    isDemo: Boolean(project.isDemo),
    project:{ id:project.id, name:project.name, status:project.status },
    property: project.property,
    platforms: Array.isArray(project.platforms) ? project.platforms : [project.platforms],
    score,
    potential: score?.potential ?? null,
    photos:{
      total: photos.length, analyzed: analyzed.length,
      average: analyzed.length
        ? Math.round(analyzed.reduce((a, p) => a + (p.analysis.scores.score || 0), 0) / analyzed.length) : null,
      best: analyzed.slice().sort((a, b) => b.analysis.scores.score - a.analysis.scores.score)[0] || null,
      toRedo, toImprove,
      missing: coverage?.missing || [],
      detected: coverage?.detected || [],
      completeness: coverage?.completeness ?? null,
    },
    content:{
      title: content?.title || null,
      titles: content?.titles || [],
      shortDescription: content?.shortDescription || null,
      longDescription: content?.longDescription || null,
      highlights: content?.highlights || [],
      tone: content?.meta?.tone || project.positioning?.tone,
    },
    pricing: rec,
    priorities: (score?.improvements || []).slice(0, 8),
    marketing: marketingAdvice(project, photos, score),
    optimisations,
  };
}

/* ---------- Recommandations marketing ---------- */
export function marketingAdvice(project, photos, score){
  const out = [];
  const pos = project.positioning || {};
  const aud = (pos.audiences || []).map(a => audienceOf(a)?.label).filter(Boolean);
  const plats = Array.isArray(project.platforms) ? project.platforms : [project.platforms];

  if (aud.length)
    out.push(`Positionnement centré sur ${aud.join(', ').toLowerCase()} : conserver ce vocabulaire sur l’ensemble des plateformes pour éviter les annonces contradictoires.`);
  else
    out.push('Aucun public cible défini : l’annonce s’adresse à tout le monde, donc à personne. Choisir une cible principale.');

  if (plats.includes('all') || plats.length > 1)
    out.push(`Diffusion multi-plateformes (${plats.map(labelOf).join(', ')}) : garder un titre cohérent d’un canal à l’autre, seule la longueur doit changer.`);
  else
    out.push(`Diffusion sur ${labelOf(plats[0])} : adapter la longueur du titre et du résumé aux limites de ce canal avant publication.`);

  const cover = photos[0]?.analysis?.scores?.score;
  if (cover !== undefined)
    out.push(cover >= 80
      ? `Photo de couverture notée ${cover}/100 : elle peut porter la campagne, la conserver en première position.`
      : `Photo de couverture notée ${cover}/100 : c’est le premier levier de taux de clic, la reprendre en priorité.`);

  if (score?.parts?.description?.value < 15)
    out.push('Description en retrait : réécrire l’ouverture, les trois premières lignes décident de la lecture.');

  if ((project.positioning?.attractions || []).length === 0)
    out.push('Aucun point d’intérêt renseigné : ajouter 3 à 5 lieux réels avec leur temps de trajet renforce la crédibilité locale.');

  const t = toneOf(pos.tone);
  out.push(`Ton retenu : ${t.label} — ${t.desc.toLowerCase()}. Le conserver dans les réponses aux voyageurs et les relances.`);

  return out;
}

/* ---------- Rendu HTML ---------- */
const ring = (value, max = 100, label = '') => {
  // Le libellé vit sous l'anneau : à l'intérieur, il se serre contre le chiffre.
  const pct = Math.max(0, Math.min(1, (value || 0) / max));
  const r = 42, c = 2 * Math.PI * r;
  const lvl = value >= 80 ? 'excellent' : value >= 55 ? 'bon' : 'faible';
  return `<div class="score-ring lvl-${lvl}">
    <svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="${r}" fill="none" stroke-width="9"/>
    <circle class="fg" cx="50" cy="50" r="${r}" fill="none" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg>
    <div class="val">${Math.round(value || 0)}</div></div>
    ${label ? `<div class="center dim" style="font-size:11px;margin-top:4px">${esc(label)}</div>` : ''}`;
};

export function renderReportHTML(model, { photoUrls = {}, brand = {} } = {}){
  const s = model.score;
  const p = model.property || {};
  const brandName = brand.name || 'Listing Studio';

  const photoRow = (list, tone) => list.slice(0, 6).map(ph => `
    <div style="width:150px">
      <div style="aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:#F1F3F4;border:1px solid rgba(17,22,25,.1)">
        ${photoUrls[ph.id] ? `<img src="${esc(photoUrls[ph.id])}" alt="" style="width:100%;height:100%;object-fit:cover">` : ''}
      </div>
      <div style="font-size:11.5px;margin-top:5px"><span class="badge ${tone}">${ph.analysis?.scores?.score ?? '—'}/100</span>
      <div class="muted" style="margin-top:3px">${esc(photoCategory(ph.category).label)}</div>
      <div class="dim" style="font-size:10.5px;line-height:1.35;margin-top:2px">${esc((ph.analysis?.recommendations || []).map(r => r.text).slice(0, 2).join(' · '))}</div></div>
    </div>`).join('');

  return `
<div class="report" data-print>
  <div class="report-head">
    <div class="eyebrow">Rapport d’optimisation d’annonce</div>
    <div class="t">${esc(model.project.name)}</div>
    <div class="m">${esc([p.type ? propertyType(p.type).label : '', p.city, p.country].filter(Boolean).join(' · '))} — établi le ${dateFR(model.generatedAt)} par ${esc(brandName)}</div>
    ${model.isDemo ? '<div style="margin-top:12px"><span class="demo-tag">Démonstration — données fictives</span></div>' : ''}
  </div>

  <div class="report-sec">
    <h3>Score de l’annonce</h3>
    <div class="report-scores">
      <div>${ring(s?.total || 0, 100, 'score actuel')}</div>
      <div style="font-size:22px;color:var(--ink-4)">→</div>
      <div>${ring(model.potential || s?.total || 0, 100, 'après optimisation')}</div>
      <div class="grow">
        <div class="row" style="gap:10px;margin-bottom:10px">
          <span class="badge ${s?.tone || ''}">${esc(s?.levelLabel || '—')}</span>
          ${model.potential && s ? `<span class="report-delta">+${Math.max(0, Math.round(model.potential - s.total))} points accessibles</span>` : ''}
        </div>
        ${s ? Object.entries(s.parts).map(([k, v]) => `
          <div class="bar-line"><div class="nm">${esc(PART_LABELS[k] || k)}</div>
            <div class="track ${v.value / v.max < .6 ? 'bad' : v.value / v.max < .8 ? 'warn' : ''}">
              <i style="width:${Math.round((v.value / v.max) * 100)}%"></i></div>
            <div class="vl">${v.value}/${v.max}</div></div>`).join('') : '<p class="muted">Score non calculé.</p>'}
      </div>
    </div>
  </div>

  <div class="report-sec">
    <h3>Analyse des photos</h3>
    <div class="row-wrap" style="gap:22px;margin-bottom:16px">
      <div><div class="eyebrow">Photos analysées</div><div style="font-size:22px;font-weight:680">${num(model.photos.analyzed)}</div></div>
      <div><div class="eyebrow">Qualité moyenne</div><div style="font-size:22px;font-weight:680">${model.photos.average ?? '—'}<span class="muted" style="font-size:13px">/100</span></div></div>
      <div><div class="eyebrow">Couverture</div><div style="font-size:22px;font-weight:680">${model.photos.completeness ?? '—'}<span class="muted" style="font-size:13px">%</span></div></div>
      <div><div class="eyebrow">À refaire</div><div style="font-size:22px;font-weight:680">${num(model.photos.toRedo.length)}</div></div>
    </div>
    ${model.photos.toRedo.length ? `<div class="eyebrow" style="margin-bottom:8px">Photos à refaire</div>
      <div class="row-wrap" style="gap:14px;align-items:flex-start">${photoRow(model.photos.toRedo, 'bad')}</div>` : `
      <div class="callout ok" style="margin-bottom:12px">Aucune photo sous le seuil critique.</div>`}
    ${model.photos.toImprove.length ? `<div class="eyebrow" style="margin:18px 0 8px">Photos à retravailler</div>
      <div class="row-wrap" style="gap:14px;align-items:flex-start">${photoRow(model.photos.toImprove, 'warn')}</div>` : ''}
    ${model.photos.missing.length ? `<div class="eyebrow" style="margin:18px 0 8px">Photos recommandées (manquantes)</div>
      <ul style="columns:2;font-size:13.4px">${model.photos.missing.slice(0, 10).map(m => `<li>${esc(m.label)} — ${esc(m.why)}</li>`).join('')}</ul>` : ''}
  </div>

  <div class="report-sec">
    <h3>Contenu recommandé</h3>
    <div class="eyebrow">Titre retenu</div>
    <p style="font-size:17px;font-weight:600;margin:6px 0 14px">${esc(model.content.title || 'Non généré')}</p>
    ${model.content.titles.length > 1 ? `<div class="eyebrow">Variantes proposées</div>
      <ul style="font-size:13.4px;margin-bottom:14px">${model.content.titles.slice(1, 5).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="eyebrow">Description courte</div>
    <p style="font-size:13.6px;margin:6px 0 14px">${esc(model.content.shortDescription || '—')}</p>
    <div class="eyebrow">Description longue (extrait)</div>
    <p style="font-size:13.4px;white-space:pre-wrap;color:var(--ink-2)">${esc(trimTo(model.content.longDescription || '—', 900))}${(model.content.longDescription || '').length > 900 ? '…' : ''}</p>
  </div>

  <div class="report-sec">
    <h3>Recommandation tarifaire</h3>
    ${model.pricing?.ok ? `
      <div class="row-wrap" style="gap:26px;margin-bottom:14px">
        <div><div class="eyebrow">Prix recommandé</div><div style="font-size:26px;font-weight:680">${money(model.pricing.recommended, p.currency || 'EUR')}</div><div class="muted" style="font-size:12px">par nuit</div></div>
        <div><div class="eyebrow">Fourchette</div><div style="font-size:17px;font-weight:600">${money(model.pricing.floor, p.currency || 'EUR')} – ${money(model.pricing.ceiling, p.currency || 'EUR')}</div></div>
        <div><div class="eyebrow">Positionnement</div><div style="font-size:17px;font-weight:600">${esc(model.pricing.positioning)}</div></div>
      </div>
      <ul style="font-size:13.3px">${model.pricing.arguments.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      <div class="callout warn" style="margin-top:12px"><div>${esc(model.pricing.disclaimer)}</div></div>
    ` : '<p class="muted">Aucun prix de référence renseigné : la recommandation tarifaire n’a pas été calculée.</p>'}
  </div>

  <div class="report-sec">
    <h3>Priorités d’action</h3>
    <div class="report-prio">
      ${model.priorities.length ? model.priorities.map((i, n) => `
        <div class="p"><div class="n">${n + 1}</div>
          <div><div style="font-weight:600;font-size:13.6px">${esc(i.text)}</div>
          <div class="muted" style="font-size:12.3px">${esc(PART_LABELS[i.part] || i.part)} · gain estimé +${i.gain} points</div></div></div>`).join('')
        : '<p class="muted">Aucune amélioration prioritaire : l’annonce est au niveau attendu.</p>'}
    </div>
  </div>

  <div class="report-sec">
    <h3>Recommandations marketing</h3>
    <ul style="font-size:13.4px">${model.marketing.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
  </div>

  ${model.optimisations.length ? `<div class="report-sec">
    <h3>Optimisations effectuées</h3>
    <div class="timeline">${model.optimisations.map((o, i) => `
      <div class="tl-item"><div class="rail"><span class="dot"></span><span class="line"></span></div>
      <div class="bd"><div class="h">${esc(o.label)}</div>
      <div class="m">${dateFR(o.at, true)}${o.score !== null && o.score !== undefined ? ` · score ${o.score}/100` : ''}</div></div></div>`).join('')}
    </div></div>` : ''}

  <div class="report-sec" style="background:var(--surface-2)">
    <div class="spread" style="flex-wrap:wrap;gap:10px">
      <div class="muted" style="font-size:12px">Rapport établi avec ${esc(brandName)} — ${dateFR(model.generatedAt, true)}</div>
      <div class="dim" style="font-size:11.5px">Les scores et recommandations proviennent de l’analyse des éléments fournis. Aucune donnée de marché externe n’a été utilisée.</div>
    </div>
  </div>
</div>`;
}
