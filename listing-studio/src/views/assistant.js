/* Panneau assistant IA — conversation et actions appliquées au projet. */

import { $, esc, uid } from '../core/util.js';
import { icon } from '../core/icons.js';
import { respond, SUGGESTIONS } from '../ai/local/assistant.js';
import { shorten, lengthen } from '../ai/local/rewrite.js';
import * as svc from '../data/projects.js';
import * as ai from '../ai/engine.js';
import { toast, failed } from '../core/toast.js';
import { go, currentRoute } from '../core/router.js';
import { on as onEvent } from '../core/events.js';
import { audience as audienceOf, tone as toneOf } from '../data/options.js';

let history = [];
let projectId = null;

export function mountAssistant(){
  render();
  document.addEventListener('assistant:open', () => { syncProject(); render(); });
  onEvent('route:after', () => { syncProject(); render(); });
  onEvent('content:generated', () => render());
}

function syncProject(){
  const m = currentRoute().path.match(/^\/project\/([^/]+)/);
  const next = m && m[1] !== 'new' ? m[1] : null;
  if (next !== projectId){ projectId = next; history = []; }
}

function project(){ return projectId ? svc.getProject(projectId) : null; }

function render(){
  const host = $('#assistant');
  if (!host) return;
  const p = project();
  const mode = ai.describeMode();

  host.innerHTML = `
    <div class="assistant-head">
      <span style="color:var(--brand)">${icon('sparkle')}</span>
      <div class="grow">
        <div class="strong" style="font-size:13.6px">Assistant</div>
        <div class="dim" style="font-size:11.5px">${esc(p ? p.name : 'Aucun projet ouvert')}</div>
      </div>
      <button class="icon-btn" id="asClose" aria-label="Fermer l’assistant">${icon('x')}</button>
    </div>
    <div class="assistant-body" id="asBody">
      ${history.length ? history.map(renderMsg).join('') : welcome(p)}
    </div>
    <div class="assistant-foot">
      <div class="composer">
        <textarea id="asInput" placeholder="${p ? 'Demandez une modification…' : 'Ouvrez un projet pour agir dessus'}" rows="1"></textarea>
        <button class="btn primary" id="asSend" aria-label="Envoyer">${icon('send')}</button>
      </div>
      <div class="dim" style="font-size:11px;margin-top:8px">${esc(mode.detail)}</div>
    </div>`;

  $('#asClose').addEventListener('click', () => import('./shell.js').then(m => m.toggleAssistant(false)));
  const input = $('#asInput');
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  };
  $('#asSend').addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(130, input.scrollHeight) + 'px';
  });

  host.querySelectorAll('[data-suggest]').forEach(b =>
    b.addEventListener('click', () => ask(b.dataset.suggest)));
  host.querySelectorAll('[data-action]').forEach(b =>
    b.addEventListener('click', () => applyAction(JSON.parse(b.dataset.action))));

  const body = $('#asBody');
  body.scrollTop = body.scrollHeight;
}

function welcome(p){
  return `<div class="msg ai">
      <span class="who">Assistant</span>
      <div class="bubble">
        ${p ? `Je travaille sur <span class="strong">${esc(p.name)}</span>. Je peux réécrire, recentrer le positionnement,
        proposer des titres, pointer les photos à refaire ou expliquer le score.`
            : 'Ouvrez un projet pour que je puisse agir dessus. Je peux aussi générer une démonstration complète.'}
      </div>
    </div>
    <div class="suggest">
      ${(p ? SUGGESTIONS : ['Génère une démo', 'Que peux-tu faire ?']).map(s =>
        `<button data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>`;
}

function renderMsg(m){
  if (m.role === 'me') return `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>`;
  return `<div class="msg ai">
    <span class="who">Assistant</span>
    <div class="bubble">
      ${esc(m.text)}
      ${m.bullets?.length ? `<ul>${m.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>
    ${m.actions?.length ? `<div class="acts">${m.actions.map(a =>
      `<button class="btn sm ${a.primary ? 'primary' : ''}" data-action='${esc(JSON.stringify(a))}'>${esc(a.label)}</button>`).join('')}</div>` : ''}
  </div>`;
}

function ask(text){
  const p = project();
  history.push({ role:'me', text });
  const r = respond(text, {
    project: p || {},
    photos: p ? svc.getPhotos(p.id) : [],
    score: p?.score || null,
    pricing: p?.pricingRecommendation || null,
  });
  history.push({ role:'ai', ...r });
  render();
}

async function applyAction(action){
  const p = project();
  const needsProject = !['demo','openStep'].includes(action.id);
  if (needsProject && !p){ failed('Ouvrez un projet pour appliquer cette action.'); return; }

  try{
    switch (action.id){
      case 'setTone': {
        svc.patchSection(p.id, 'positioning', { tone: action.payload.tone });
        await svc.generateContent(p.id, { tone: action.payload.tone, label:`Ton ${toneOf(action.payload.tone).label} appliqué` });
        done(`Annonce réécrite sur un ton ${toneOf(action.payload.tone).label.toLowerCase()}.`);
        break;
      }
      case 'setAudience':
      case 'setToneAndAudience': {
        const aud = action.payload.audience;
        const patch = { audiences: [aud] };
        if (action.payload.tone) patch.tone = action.payload.tone;
        svc.patchSection(p.id, 'positioning', patch);
        await svc.generateContent(p.id, { tone: patch.tone, label:`Cible ${audienceOf(aud)?.label}` });
        done(`Positionnement recentré sur « ${audienceOf(aud)?.label} ».`);
        break;
      }
      case 'proposeTitles': {
        const titles = await ai.titleVariants(p, action.payload.count || 5, { seed: Date.now() % 983 });
        svc.updateProject(p.id, { content: { ...p.content, titles } });
        history.push({ role:'ai', text:'Voici les titres proposés :', bullets:titles,
          actions: titles.map(t => ({ id:'applyTitle', label:`Utiliser « ${t.slice(0, 28)}… »`, payload:{ title:t } })) });
        render();
        break;
      }
      case 'applyTitle': {
        svc.updateProject(p.id, { content: { ...p.content, title: action.payload.title } });
        svc.refreshScore(p.id);
        done('Titre appliqué.');
        break;
      }
      case 'resize': {
        if (!p.content){ failed('Générez d’abord l’annonce.'); return; }
        const f = action.payload.factor;
        const next = f < 1 ? shorten(p.content.longDescription, f) : lengthen(p.content, f);
        svc.updateProject(p.id, { content: { ...p.content, longDescription: next } }, { snapshotLabel:'Description redimensionnée' });
        svc.refreshScore(p.id);
        done(f < 1 ? 'Description raccourcie.' : 'Description développée.');
        break;
      }
      case 'regenerate': {
        await svc.generateContent(p.id, { seed: Date.now() % 977, label:'Régénération demandée à l’assistant' });
        done('Annonce régénérée.');
        break;
      }
      case 'setPlatforms': {
        svc.updateProject(p.id, { platforms: action.payload.platforms });
        done('Plateformes mises à jour.');
        break;
      }
      case 'openStep': {
        if (p) go(`/project/${p.id}/step/${action.payload.step}`);
        break;
      }
      case 'demo': {
        go('/demo');
        break;
      }
      default: failed('Action inconnue.');
    }
  }catch(err){
    console.error(err);
    failed('Action impossible : ' + (err?.message || 'erreur inconnue'));
  }
}

function done(message){
  toast(message);
  history.push({ role:'ai', text: message + ' Le projet a été mis à jour et une version a été enregistrée dans l’historique.' });
  render();
  // Rafraîchit l'étape affichée si le parcours est ouvert.
  import('./wizard.js').then(w => w.activeContext()?.hardReload?.());
}
