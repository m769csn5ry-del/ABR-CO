/* Service métier — orchestration entre la base, le stockage des photos et l'IA.
   Les vues n'accèdent jamais directement aux tables : tout passe par ici, ce
   qui garantit l'isolation par utilisateur, l'historique et la cohérence des
   scores. */

import * as db from '../core/db.js';
import * as idb from '../core/idb.js';
import { uid, uniq, deepClone } from '../core/util.js';
import { emit } from '../core/events.js';
import * as ai from '../ai/engine.js';
import { computeScore } from '../scoring/listingScore.js';
import { recommend } from '../pricing/engine.js';
import { optimalOrder, reasonFor } from '../photos/ordering.js';
import { coverage } from '../photos/coverage.js';
import { BUILTIN_TEMPLATES } from './templates.js';
import { DEMO_PROPERTIES, DEMO_CLIENTS, findDemo } from './demo.js';
import { renderDemoPhoto } from './demoPhotos.js';
import { plan as planOf } from './options.js';

/* ---------- Utilisateur et espace de travail ---------- */
export function ensureUser(){
  let user = db.currentUser();
  if (!user){
    const existing = db.users.all()[0];
    user = existing || db.users.insert({
      name:'Mon espace', email:'', company:'', plan:'pro',
      settings:{ currency:'EUR', brandName:'Listing Studio', brandColor:'#14544A',
                 autosave:true, defaultTone:'premium', defaultPlatforms:['airbnb'] },
    });
    db.setCurrentUser(user.id);
  }
  return user;
}
export const user = () => db.currentUser() || ensureUser();
export function updateUser(patch){
  const u = user();
  const next = db.users.update(u.id, patch);
  emit('user:change', next);
  return next;
}
export const settings = () => user().settings || {};
export function updateSettings(patch){
  const u = user();
  return updateUser({ settings: { ...(u.settings || {}), ...patch } });
}

/* ---------- Projets ---------- */
const EMPTY_PROJECT = () => ({
  name:'', clientId:null, status:'brouillon', templateId:null, isDemo:false,
  property:{
    name:'', type:'appartement', address:'', city:'', country:'France', district:'',
    guests:2, bedrooms:1, beds:1, bathrooms:1, surface:'', floor:'', elevator:null, year:'',
    currency:'EUR', amenities:[], customAmenities:[],
  },
  positioning:{
    audiences:[], style:'', highlights:[], tone: settings().defaultTone || 'premium',
    attractions:[], activities:[], transport:'', notes:'',
    checkinTime:'16:00', checkoutTime:'11:00', selfCheckin:false, accessNote:'',
    rules:['non_fumeur'], customRules:[], minNights:2,
  },
  platforms: settings().defaultPlatforms || ['airbnb'],
  pricing:{ current:'', min:'', max:'', season:'moyenne', guests:'', cleaning:'',
            minNights:2, checkin:'', checkout:'' },
  content:null, score:null, pricingRecommendation:null, step:1,
});

export const listProjects = (filter = () => true) =>
  db.projects.where(filter).sort((a, b) => b.updatedAt - a.updatedAt);

export const getProject = (id) => db.projects.find(id);

export function canCreateProject(){
  const u = user();
  const limit = planOf(u.plan).projects;
  const used = db.projects.count(p => !p.isDemo);
  return { allowed: used < limit, used, limit, plan: u.plan };
}

export function createProject(data = {}){
  const base = EMPTY_PROJECT();
  const project = db.projects.insert({
    ...base, ...data,
    property:{ ...base.property, ...(data.property || {}) },
    positioning:{ ...base.positioning, ...(data.positioning || {}) },
    pricing:{ ...base.pricing, ...(data.pricing || {}) },
    name: data.name || data.property?.name || 'Nouveau projet',
  });
  snapshot(project.id, 'Création du projet');
  emit('project:create', project);
  return project;
}

export function updateProject(id, patch, { snapshotLabel = null } = {}){
  const prev = db.projects.find(id);
  if (!prev) return null;
  const next = db.projects.update(id, patch);
  if (snapshotLabel) snapshot(id, snapshotLabel);
  emit('project:update', next);
  return next;
}

/** Fusion profonde d'une sous-section (property, positioning, pricing). */
export function patchSection(id, section, patch){
  const p = db.projects.find(id);
  if (!p) return null;
  return updateProject(id, { [section]: { ...(p[section] || {}), ...patch } });
}

export function deleteProject(id){
  getPhotoRecords(id).forEach(ph => {
    idb.forget(ph.blobKey); idb.del(ph.blobKey);
    db.photoAnalyses.removeWhere(a => a.photoId === ph.id);
    db.photos.remove(ph.id);
  });
  db.listingVersions.removeWhere(v => v.projectId === id);
  db.reports.removeWhere(r => r.projectId === id);
  db.pricingRecommendations.removeWhere(r => r.projectId === id);
  const ok = db.projects.remove(id);
  emit('project:delete', { id });
  return ok;
}

export function duplicateProject(id){
  const src = db.projects.find(id);
  if (!src) return null;
  const copy = createProject({
    ...deepClone(src), id: undefined, name: `${src.name} (copie)`,
    createdAt: undefined, updatedAt: undefined,
  });
  getPhotoRecords(id).forEach(async (ph) => {
    const blob = await idb.get(ph.blobKey);
    if (!blob) return;
    const key = uid('blob');
    await idb.put(key, blob);
    const rec = db.photos.insert({ ...ph, id: undefined, projectId: copy.id, blobKey: key });
    const an = db.photoAnalyses.first(a => a.photoId === ph.id);
    if (an) db.photoAnalyses.insert({ ...an, id: undefined, photoId: rec.id, projectId: copy.id });
  });
  return copy;
}

/* ---------- Historique / versions ---------- */
export function snapshot(projectId, label){
  const p = db.projects.find(projectId);
  if (!p) return null;
  const v = db.listingVersions.insert({
    projectId, label,
    snapshot: deepClone({
      name:p.name, property:p.property, positioning:p.positioning,
      platforms:p.platforms, pricing:p.pricing, content:p.content, score:p.score,
    }),
    scoreTotal: p.score?.total ?? null,
  });
  // Conserve les 40 dernières versions par projet.
  const all = db.listingVersions.where(x => x.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
  all.slice(40).forEach(old => db.listingVersions.remove(old.id));
  return v;
}

export const listVersions = (projectId) =>
  db.listingVersions.where(v => v.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt);

export function restoreVersion(versionId){
  const v = db.listingVersions.find(versionId);
  if (!v) return null;
  snapshot(v.projectId, 'Avant restauration');
  const next = updateProject(v.projectId, deepClone(v.snapshot));
  emit('project:restore', { projectId: v.projectId, versionId });
  return next;
}

/* ---------- Photos ---------- */
export const getPhotoRecords = (projectId) =>
  db.photos.where(p => p.projectId === projectId).sort((a, b) => (a.position || 0) - (b.position || 0));

export function getPhotos(projectId){
  return getPhotoRecords(projectId).map(p => ({
    ...p,
    analysis: db.photoAnalyses.first(a => a.photoId === p.id) || null,
  }));
}

export const photoUrl = (photo) => idb.url(photo.blobKey);

export const ACCEPTED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp'];
export const ACCEPTED_EXT = /\.(jpe?g|png|webp)$/i;

/** Importe, analyse et classe un lot de fichiers. */
export async function addPhotos(projectId, files, { onProgress } = {}){
  const list = Array.from(files || []);
  const accepted = list.filter(f => ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.test(f.name));
  const rejected = list.filter(f => !accepted.includes(f));
  const start = getPhotoRecords(projectId).length;
  const out = [];

  for (let i = 0; i < accepted.length; i++){
    const file = accepted[i];
    onProgress?.({ done:i, total:accepted.length, filename:file.name });
    try{
      const rec = await importOne(projectId, file, start + i);
      out.push(rec);
    }catch(err){
      console.error('[photos] import impossible', file.name, err);
      rejected.push(file);
    }
  }
  onProgress?.({ done:accepted.length, total:accepted.length });
  emit('photos:change', { projectId });
  return { imported: out, rejected };
}

async function importOne(projectId, blob, position, meta = {}){
  const key = uid('blob');
  await idb.put(key, blob);
  const url = URL.createObjectURL(blob);
  let analysis = null;
  try{
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => rej(new Error('Image illisible'));
      im.src = url;
    });
    analysis = await ai.analyzePhoto(img, { filename: meta.filename || blob.name || '' });
  } finally { URL.revokeObjectURL(url); }

  const rec = db.photos.insert({
    projectId, blobKey:key,
    filename: meta.filename || blob.name || 'photo.jpg',
    label: meta.label || (meta.filename || blob.name || 'Photo').replace(/\.[a-z]+$/i, ''),
    mime: blob.type || 'image/jpeg', size: blob.size || 0,
    width: analysis?.metrics?.width || 0, height: analysis?.metrics?.height || 0,
    category: analysis?.category || 'detail',
    categoryConfidence: analysis?.categoryConfidence || 0,
    categorySource: analysis?.categorySource || '',
    position, isDemo: Boolean(meta.isDemo),
  });
  if (analysis){
    db.photoAnalyses.insert({
      photoId: rec.id, projectId,
      scores: analysis.scores, metrics: analysis.metrics,
      recommendations: analysis.recommendations, engine: analysis.engine,
    });
  }
  return { ...rec, analysis: db.photoAnalyses.first(a => a.photoId === rec.id) };
}

export function updatePhoto(photoId, patch){
  const next = db.photos.update(photoId, patch);
  emit('photos:change', { projectId: next?.projectId });
  return next;
}

export function deletePhoto(photoId){
  const ph = db.photos.find(photoId);
  if (!ph) return false;
  idb.forget(ph.blobKey); idb.del(ph.blobKey);
  db.photoAnalyses.removeWhere(a => a.photoId === photoId);
  const ok = db.photos.remove(photoId);
  reindexPhotos(ph.projectId);
  emit('photos:change', { projectId: ph.projectId });
  return ok;
}

function reindexPhotos(projectId){
  getPhotoRecords(projectId).forEach((p, i) => db.photos.update(p.id, { position: i }));
}

export function reorderPhotos(projectId, orderedIds){
  orderedIds.forEach((id, i) => db.photos.update(id, { position: i }));
  emit('photos:change', { projectId });
  return getPhotos(projectId);
}

/** Ordre recommandé par l'IA, avec justification par position. */
export function applyOptimalOrder(projectId){
  const photos = getPhotos(projectId);
  const ordered = optimalOrder(photos);
  reorderPhotos(projectId, ordered.map(p => p.id));
  ordered.forEach(p => db.photos.update(p.id, { orderReason: p.reason }));
  return getPhotos(projectId);
}

export function suggestOrder(projectId){
  return optimalOrder(getPhotos(projectId));
}

export function photoCoverage(projectId){
  const p = db.projects.find(projectId);
  return coverage(getPhotos(projectId), p?.property || {});
}

export const orderReason = reasonFor;

/* ---------- Génération et score ---------- */
export async function generateContent(projectId, opts = {}){
  const project = db.projects.find(projectId);
  if (!project) return null;
  const photos = getPhotos(projectId);
  const content = await ai.generateListing({ ...project, photoCount: photos.length }, {
    tone: opts.tone || project.positioning?.tone,
    ...opts,
  });
  const score = computeScore({ ...project, content }, { photos, content });
  const next = updateProject(projectId, { content, score, status: project.status === 'brouillon' ? 'en_cours' : project.status });
  snapshot(projectId, opts.label || 'Génération de l’annonce');
  emit('content:generated', { projectId, content, score });
  return next;
}

export function refreshScore(projectId){
  const project = db.projects.find(projectId);
  if (!project) return null;
  const photos = getPhotos(projectId);
  const score = computeScore(project, { photos, content: project.content });
  return updateProject(projectId, { score });
}

export function computePricing(projectId, input){
  const project = db.projects.find(projectId);
  if (!project) return null;
  const pricing = { ...(project.pricing || {}), ...input };
  const rec = recommend(project, pricing, project.score?.total ?? null);
  updateProject(projectId, { pricing, pricingRecommendation: rec });
  if (rec.ok){
    db.pricingRecommendations.insert({
      projectId, recommended: rec.recommended, floor: rec.floor, ceiling: rec.ceiling,
      positioning: rec.positioning, season: rec.season, source: rec.source, inputs: pricing,
    });
  }
  return rec;
}

/* ---------- Templates ---------- */
export const allTemplates = () => [...BUILTIN_TEMPLATES, ...db.templates.all()];

export function applyTemplate(projectId, templateId){
  const tpl = allTemplates().find(t => t.id === templateId);
  const project = db.projects.find(projectId);
  if (!tpl || !project) return null;
  const preset = tpl.preset || {};
  const next = updateProject(projectId, {
    templateId,
    positioning: {
      ...project.positioning,
      tone: preset.tone || project.positioning.tone,
      audiences: preset.audiences?.length ? uniq(preset.audiences) : project.positioning.audiences,
      style: preset.style || project.positioning.style,
      highlights: preset.highlights?.length ? uniq(preset.highlights) : project.positioning.highlights,
    },
    platforms: preset.platforms?.length ? preset.platforms : project.platforms,
  }, { snapshotLabel: `Template « ${tpl.label} » appliqué` });
  return next;
}

export function saveTemplate({ label, description, projectId }){
  const p = db.projects.find(projectId);
  if (!p) return null;
  return db.templates.insert({
    label, description: description || 'Template enregistré depuis un projet.',
    category:'Mes templates', builtin:false,
    preset:{
      tone: p.positioning?.tone, audiences: p.positioning?.audiences,
      style: p.positioning?.style, highlights: p.positioning?.highlights,
      platforms: p.platforms,
    },
  });
}
export const deleteTemplate = (id) => db.templates.remove(id);

/* ---------- Clients ---------- */
export const listClients = () => db.clients.all().sort((a, b) => b.updatedAt - a.updatedAt);
export const getClient = (id) => db.clients.find(id);
export const createClient = (data) => db.clients.insert({
  name:'', email:'', phone:'', company:'', propertiesCount:0, status:'prospect', notes:'', ...data,
});
export const updateClient = (id, patch) => db.clients.update(id, patch);
export function deleteClient(id){
  db.projects.where(p => p.clientId === id).forEach(p => db.projects.update(p.id, { clientId: null }));
  return db.clients.remove(id);
}
export const clientProjects = (clientId) => db.projects.where(p => p.clientId === clientId);

/* ---------- Rapports ---------- */
export const listReports = () => db.reports.all().sort((a, b) => b.createdAt - a.createdAt);
export const getReport = (id) => db.reports.find(id);
export const saveReport = (data) => db.reports.insert(data);
export const deleteReport = (id) => db.reports.remove(id);

/* ---------- Mode démo ---------- */
export async function createDemoProject(key, { onProgress } = {}){
  const demo = findDemo(key);
  onProgress?.({ phase:'projet', pct:5 });

  let client = db.clients.first(c => c.name === DEMO_CLIENTS[0].name);
  if (!client) client = createClient({ ...DEMO_CLIENTS[0], isDemo:true });

  const project = createProject({
    name: demo.label, isDemo:true, clientId: client.id, status:'en_cours',
    property: deepClone(demo.property),
    positioning: deepClone(demo.positioning),
    pricing: deepClone(demo.pricing),
    platforms:['airbnb','booking','vrbo'],
    demoKey: key,
  });

  const total = demo.photos.length;
  for (let i = 0; i < total; i++){
    const spec = demo.photos[i];
    onProgress?.({ phase:'photos', pct: 10 + Math.round((i / total) * 65), index:i + 1, total });
    const blob = await renderDemoPhoto(spec.category, {
      palette: demo.palette, defect: spec.defect,
      tilt: spec.defect === 'desordre' ? 2.5 : 0, seed: `${key}-${i}`,
    });
    await importOne(project.id, blob, i, {
      filename: `demo-${spec.category}-${i + 1}.jpg`,
      label: `${spec.category} ${i + 1} (démo)`,
      isDemo: true,
    });
  }

  onProgress?.({ phase:'ordre', pct:78 });
  applyOptimalOrder(project.id);

  onProgress?.({ phase:'annonce', pct:85 });
  await generateContent(project.id, { label:'Génération de démonstration' });

  onProgress?.({ phase:'pricing', pct:95 });
  computePricing(project.id, demo.pricing);
  refreshScore(project.id);

  onProgress?.({ phase:'fini', pct:100 });
  const final = db.projects.find(project.id);
  emit('demo:created', final);
  return final;
}

export const demoCatalog = DEMO_PROPERTIES.map(d => ({
  key:d.key, label:d.label, summary:d.summary, city:d.property.city, type:d.property.type,
}));

/* ---------- Statistiques du tableau de bord ---------- */
export function dashboardStats(){
  const projects = db.projects.all();
  const withContent = projects.filter(p => p.content);
  const exported = projects.filter(p => p.exportCount > 0);
  const photos = db.photos.all();
  const scores = withContent.map(p => p.score?.total).filter(n => typeof n === 'number');
  return {
    listings: withContent.length,
    projects: projects.length,
    inProgress: projects.filter(p => ['brouillon','en_cours'].includes(p.status)).length,
    clients: db.clients.count(),
    exported: exported.length,
    exportTotal: projects.reduce((a, p) => a + (p.exportCount || 0), 0),
    photos: photos.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    reports: db.reports.count(),
    templates: db.templates.count(),
    demo: projects.filter(p => p.isDemo).length,
  };
}

export function markExported(projectId, format){
  const p = db.projects.find(projectId);
  if (!p) return;
  updateProject(projectId, {
    exportCount: (p.exportCount || 0) + 1,
    lastExport: { format, at: Date.now() },
  });
}

export { db, idb };
