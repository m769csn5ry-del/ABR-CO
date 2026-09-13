/* Exports : texte, JSON, CSV et PDF (via l'impression du navigateur).
   Le contenu exporté est celui réellement affiché : aucune donnée n'est
   ajoutée à l'export, et les projets de démonstration restent marqués. */

import { composeAll, adapter, resolve } from '../platforms/index.js';
import { download, slug, dateFR, money } from '../core/util.js';
import { PART_LABELS } from '../scoring/listingScore.js';

const DEMO_BANNER = '*** PROJET DE DÉMONSTRATION — informations fictives, à ne pas publier ***';

/* ---------- Texte ---------- */
export function toText(project, { platform = 'generic' } = {}){
  const c = project.content;
  if (!c) return '';
  const parts = [];
  if (project.isDemo) parts.push(DEMO_BANNER, '');
  const adapters = platform === 'all' ? resolve('all') : [adapter(platform)];

  adapters.forEach(a => {
    const out = a.compose(c, { project });
    parts.push('='.repeat(64), a.label.toUpperCase(), '='.repeat(64), '');
    out.blocks.filter(b => b.text && String(b.text).trim()).forEach(b => {
      parts.push(`--- ${b.label} ---`, String(b.text).trim(), '');
    });
    if (out.warnings.length){
      parts.push('--- Contrôles de conformité ---');
      out.warnings.forEach(w => parts.push(`[${w.level === 'bad' ? 'bloquant' : 'attention'}] ${w.msg}`));
      parts.push('');
    }
  });
  parts.push(`Généré avec Listing Studio — ${dateFR(Date.now(), true)}`);
  return parts.join('\n');
}

/* ---------- JSON ---------- */
export function toJSON(project, { photos = [], platform = 'all' } = {}){
  const c = project.content;
  return {
    format:'listing-studio/v1',
    exportedAt: new Date().toISOString(),
    demo: Boolean(project.isDemo),
    project:{
      id: project.id, name: project.name, status: project.status,
      clientId: project.clientId, templateId: project.templateId,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
    },
    property: project.property,
    positioning: project.positioning,
    platforms: project.platforms,
    content: c,
    score: project.score,
    pricing:{ inputs: project.pricing, recommendation: project.pricingRecommendation },
    photos: photos.map((p, i) => ({
      position: i + 1, filename: p.filename, label: p.label, category: p.category,
      categoryConfidence: p.categoryConfidence, isDemo: p.isDemo,
      width: p.width, height: p.height,
      scores: p.analysis?.scores || null,
      recommendations: (p.analysis?.recommendations || []).map(r => r.text),
      orderReason: p.orderReason || null,
    })),
    platformOutputs: c ? composeAll(c, platform, { project }).map(o => ({
      platform:o.platform, label:o.label,
      blocks:o.blocks.filter(b => b.text).map(b => ({ id:b.id, label:b.label, text:b.text })),
      warnings:o.warnings,
    })) : [],
  };
}

/* ---------- CSV ---------- */
const cell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = (arr) => arr.map(r => r.map(cell).join(';')).join('\n');

export function toCSV(project, { photos = [] } = {}){
  const c = project.content || {};
  const p = project.property || {};
  const out = [];

  out.push(['Section','Champ','Valeur']);
  if (project.isDemo) out.push(['Avertissement','Nature','Projet de démonstration — données fictives']);

  const push = (sec, k, v) => out.push([sec, k, v]);
  push('Projet','Nom', project.name);
  push('Projet','Statut', project.status);
  push('Projet','Plateformes', Array.isArray(project.platforms) ? project.platforms.join(', ') : project.platforms);
  ['name','type','address','city','country','district','guests','bedrooms','beds','bathrooms','surface','floor','year']
    .forEach(k => push('Logement', k, p[k]));
  push('Logement','Équipements', (p.amenities || []).join(', '));
  push('Annonce','Titre', c.title);
  (c.titles || []).forEach((t, i) => push('Annonce', `Variante ${i + 1}`, t));
  push('Annonce','Accroche', c.hook);
  push('Annonce','Description courte', c.shortDescription);
  push('Annonce','Description longue', c.longDescription);
  (c.highlights || []).forEach((h, i) => push('Points forts', `#${i + 1}`, h));
  (c.rooms || []).forEach(r => push('Pièces', r.name, r.text));
  (c.rules || []).forEach((r, i) => push('Règles', `#${i + 1}`, r));
  (c.faq || []).forEach((f, i) => push('FAQ', f.q, f.a));
  if (project.score){
    push('Score','Total', `${project.score.total}/100`);
    Object.entries(project.score.parts).forEach(([k, v]) => push('Score', PART_LABELS[k] || k, `${v.value}/${v.max}`));
  }
  const rec = project.pricingRecommendation;
  if (rec?.ok){
    push('Pricing','Prix recommandé', rec.recommended);
    push('Pricing','Plancher', rec.floor);
    push('Pricing','Plafond', rec.ceiling);
    push('Pricing','Positionnement', rec.positioning);
    push('Pricing','Source', rec.sourceLabel);
  }

  const photoTable = [[], ['Photos'], ['Position','Fichier','Catégorie','Score','Netteté','Luminosité','Composition','Recommandations']];
  photos.forEach((ph, i) => photoTable.push([
    i + 1, ph.filename, ph.category,
    ph.analysis?.scores?.score ?? '', ph.analysis?.scores?.nettete ?? '',
    ph.analysis?.scores?.luminosite ?? '', ph.analysis?.scores?.composition ?? '',
    (ph.analysis?.recommendations || []).map(r => r.text).join(' | '),
  ]));

  return rows(out) + '\n' + rows(photoTable);
}

/* ---------- Téléchargements ---------- */
const base = (project) => `${slug(project.name || 'annonce')}-${new Date().toISOString().slice(0, 10)}`;

export function downloadText(project, opts){
  download(`${base(project)}.txt`, toText(project, opts), 'text/plain;charset=utf-8');
}
export function downloadJSON(project, opts){
  download(`${base(project)}.json`, JSON.stringify(toJSON(project, opts), null, 2), 'application/json');
}
export function downloadCSV(project, opts){
  // BOM : Excel ouvre correctement l'UTF-8.
  download(`${base(project)}.csv`, '﻿' + toCSV(project, opts), 'text/csv;charset=utf-8');
}
export function downloadPerPlatform(project){
  const c = project.content;
  if (!c) return 0;
  const outs = composeAll(c, project.platforms, { project });
  outs.forEach((o, i) => {
    const body = [
      project.isDemo ? DEMO_BANNER + '\n' : '',
      `${o.label}\n${'='.repeat(o.label.length)}\n`,
      ...o.blocks.filter(b => b.text).map(b => `--- ${b.label} ---\n${b.text}\n`),
    ].join('\n');
    setTimeout(() => download(`${base(project)}-${o.platform}.txt`, body, 'text/plain;charset=utf-8'), i * 260);
  });
  return outs.length;
}

/* ---------- PDF (impression système) ---------- */
/** Imprime un conteneur donné : l'utilisateur choisit « Enregistrer en PDF ». */
export function printElement(el, { title } = {}){
  const previous = document.title;
  if (title) document.title = title;
  const cleanup = () => { document.title = previous; document.body.classList.remove('printing'); };
  document.body.classList.add('printing');
  el?.scrollIntoView?.({ block:'start' });
  window.addEventListener('afterprint', cleanup, { once:true });
  setTimeout(() => { window.print(); setTimeout(cleanup, 800); }, 60);
}

export const FORMATS = [
  { id:'txt',  label:'Texte',  hint:'Toutes les sections, prêtes à coller.' },
  { id:'pdf',  label:'PDF',    hint:'Via l’impression du navigateur (Enregistrer en PDF).' },
  { id:'json', label:'JSON',   hint:'Structure complète, réimportable.' },
  { id:'csv',  label:'CSV',    hint:'Tableur : contenu, score et analyse photo.' },
];
