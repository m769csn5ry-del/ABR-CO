/* Paramètres : espace, marque, plans, données, IA. */

import { esc, num, download } from '../core/util.js';
import { icon } from '../core/icons.js';
import { PLANS, TONES, plan as planOf } from '../data/options.js';
import { list as platformList } from '../platforms/index.js';
import * as svc from '../data/projects.js';
import * as db from '../core/db.js';
import * as idb from '../core/idb.js';
import * as ai from '../ai/engine.js';
import { renderTopbar } from './shell.js';
import { toast, failed } from '../core/toast.js';
import { confirm } from '../core/modal.js';
import { refreshNav } from './shell.js';

const TABS = [
  { id:'espace', label:'Espace' },
  { id:'marque', label:'Marque' },
  { id:'plan',   label:'Plans' },
  { id:'ia',     label:'IA et intégrations' },
  { id:'donnees',label:'Données' },
];

export default function settings(outlet, params = {}, query = {}){
  const tab = query.tab || 'espace';
  renderTopbar({ title:'Paramètres' });
  draw(outlet, tab);
}

function draw(outlet, tab){
  const u = svc.user();
  const s = u.settings || {};

  outlet.innerHTML = `
  <div class="view">
    <div class="tabs" style="margin-bottom:20px">
      ${TABS.map(t => `<button class="tab ${t.id === tab ? 'on' : ''}" data-t="${t.id}">${esc(t.label)}</button>`).join('')}
    </div>
    <div id="setBody">${({ espace, marque, plan, ia, donnees })[tab](u, s)}</div>
  </div>`;

  outlet.querySelectorAll('[data-t]').forEach(b =>
    b.addEventListener('click', () => draw(outlet, b.dataset.t)));

  wire(outlet, tab);
}

const espace = (u, s) => `
  <div class="grid c2" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Espace de travail</h3></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field span-2"><label>Nom de l’espace</label>
            <input class="input" data-u="name" value="${esc(u.name || '')}"></div>
          <div class="field"><label>Email</label>
            <input class="input" type="email" data-u="email" value="${esc(u.email || '')}"></div>
          <div class="field"><label>Société</label>
            <input class="input" data-u="company" value="${esc(u.company || '')}"></div>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Préférences de production</h3></div>
      <div class="card-body">
        <div class="field"><label>Ton par défaut</label>
          <select class="select" data-s="defaultTone">
            ${TONES.map(t => `<option value="${t.id}" ${s.defaultTone === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
          </select></div>
        <div class="field" style="margin-top:14px"><label>Plateformes par défaut</label>
          <div class="chips" data-default-plats>
            ${platformList({ includeGeneric:false }).map(p =>
              `<button type="button" class="chip ${(s.defaultPlatforms || []).includes(p.id) ? 'on' : ''}" data-value="${p.id}">${esc(p.label)}</button>`).join('')}
          </div></div>
        <div class="field" style="margin-top:14px"><label>Devise par défaut</label>
          <select class="select" data-s="currency">
            ${['EUR','CHF','USD','GBP','CAD'].map(c => `<option value="${c}" ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select></div>
      </div>
    </section>
  </div>`;

const marque = (u, s) => `
  <div class="grid c2" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Marque affichée sur les livrables</h3></div>
      <div class="card-body">
        <div class="field"><label>Nom de marque</label>
          <input class="input" data-s="brandName" value="${esc(s.brandName || 'Listing Studio')}">
          <span class="hint">Apparaît en en-tête des rapports client et dans la barre latérale.</span></div>
        <div class="field" style="margin-top:14px"><label>Signature de bas de rapport</label>
          <input class="input" data-s="brandSignature" value="${esc(s.brandSignature || '')}"
            placeholder="Ex. Azur Conciergerie — 06 00 00 00 00"></div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Aperçu</h3></div>
      <div class="card-body">
        <div class="report-head" style="border-radius:12px">
          <div class="eyebrow">Rapport d’optimisation d’annonce</div>
          <div class="t">Nom du logement</div>
          <div class="m">établi par ${esc(s.brandName || 'Listing Studio')}</div>
        </div>
        <p class="muted" style="font-size:12.6px;margin-top:12px">
          Le branding personnalisé est une fonction du plan Agency ; il reste modifiable ici pour préparer vos livrables.</p>
      </div>
    </section>
  </div>`;

const plan = (u) => {
  const current = planOf(u.plan);
  return `
  <div class="price-grid">
    ${PLANS.map(p => `<div class="price-card ${u.plan === p.id ? 'feat' : ''}">
      ${u.plan === p.id ? '<span class="badge brand" style="position:absolute;top:-11px;left:24px">Plan actif</span>' : ''}
      <div class="eyebrow">${esc(p.label)}</div>
      <div class="amt">${p.price === 0 ? 'Gratuit' : p.price + ' €'}<span>${p.price === 0 ? '' : ' / mois'}</span></div>
      <div class="muted" style="font-size:13px">${p.projects === Infinity ? 'Projets illimités' : `${p.projects} projets actifs`}</div>
      <ul>${p.features.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul>
      ${p.locked.length ? `<div class="dim" style="font-size:12px;margin-bottom:14px">Non inclus : ${esc(p.locked.join(', '))}</div>` : ''}
      <button class="btn ${u.plan === p.id ? '' : (p.price > current.price ? 'primary' : '')} block"
        data-plan="${p.id}" ${u.plan === p.id ? 'disabled' : ''}>
        ${u.plan === p.id ? 'Plan actuel'
          : p.price > current.price ? `Passer au plan ${esc(p.label)}` : `Revenir au plan ${esc(p.label)}`}</button>
    </div>`).join('')}
  </div>
  <div class="callout warn" style="margin-top:18px">${icon('info')}<div>
    Aucun paiement n’est branché : le changement de plan ne fait que débloquer les fonctions dans l’application,
    le temps que le socle produit soit finalisé.</div></div>`;
};

const ia = () => {
  const mode = ai.describeMode();
  const h = ai.health();
  return `
  <div class="grid c2" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Moteur de rédaction</h3>
        <span class="badge ${mode.id === 'server' ? 'ok' : 'outline'}">${esc(mode.label)}</span></div>
      <div class="card-body">
        <p class="muted" style="font-size:13.2px">${esc(mode.detail)}</p>
        <dl class="kv" style="margin-top:14px">
          <dt>Serveur détecté</dt><dd>${h?.reachable ? 'Oui' : 'Non'}</dd>
          <dt>Fournisseur configuré</dt><dd>${h?.ai?.configured ? 'Oui' : 'Non'}</dd>
          <dt>Modèle</dt><dd>${esc(h?.ai?.model || '—')}</dd>
        </dl>
        <button class="btn" id="probeAi" style="margin-top:14px">${icon('refresh')} Retester la connexion</button>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Clés d’API</h3></div>
      <div class="card-body">
        <div class="callout ok">${icon('lock')}<div>
          Aucune clé n’est saisie ni stockée dans le navigateur. La clé du fournisseur reste sur votre serveur,
          dans une variable d’environnement (voir <span class="mono">server/.env.example</span>).</div></div>
        <p class="muted" style="font-size:13px;margin-top:14px">
          Sans serveur configuré, l’application fonctionne entièrement en local : rédaction déterministe et analyse
          d’image dans le navigateur. Le passage au moteur connecté ne change rien à l’interface.</p>
      </div>
    </section>
  </div>`;
};

const donnees = () => {
  const st = db.stats();
  return `
  <div class="grid c2" style="align-items:start">
    <section class="card">
      <div class="card-head"><h3>Contenu de l’espace</h3></div>
      <div class="card-body">
        <dl class="kv">
          ${Object.entries(st).filter(([k]) => k !== 'meta').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${num(v)}</dd>`).join('')}
        </dl>
        <div class="row-wrap" style="gap:8px;margin-top:16px">
          <button class="btn" id="exportData">${icon('download')} Exporter la sauvegarde</button>
          <label class="btn" style="cursor:pointer">${icon('upload')} Importer
            <input type="file" id="importData" accept="application/json" hidden></label>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Zone sensible</h3></div>
      <div class="card-body">
        <p class="muted" style="font-size:13.2px">
          Les données vivent dans ce navigateur : effacer l’espace supprime définitivement projets, photos et rapports.</p>
        <button class="btn danger block" id="wipe" style="margin-top:14px">${icon('trash')} Effacer mon espace de travail</button>
      </div>
    </section>
  </div>`;
};

function wire(outlet, tab){
  outlet.querySelectorAll('[data-u]').forEach(el => el.addEventListener('change', () => {
    svc.updateUser({ [el.dataset.u]: el.value.trim() });
    toast('Enregistré.'); refreshNav();
  }));
  outlet.querySelectorAll('[data-s]').forEach(el => el.addEventListener('change', () => {
    svc.updateSettings({ [el.dataset.s]: el.value });
    toast('Enregistré.'); refreshNav();
  }));
  outlet.querySelectorAll('[data-default-plats] .chip').forEach(chip => chip.addEventListener('click', () => {
    chip.classList.toggle('on');
    const values = Array.from(outlet.querySelectorAll('[data-default-plats] .chip.on')).map(c => c.dataset.value);
    svc.updateSettings({ defaultPlatforms: values });
    toast('Plateformes par défaut mises à jour.');
  }));

  outlet.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => {
    svc.updateUser({ plan: b.dataset.plan });
    toast(`Plan ${planOf(b.dataset.plan).label} activé (simulation, sans paiement).`);
    refreshNav(); draw(outlet, 'plan');
  }));

  outlet.querySelector('#probeAi')?.addEventListener('click', async (e) => {
    e.currentTarget.classList.add('loading');
    await ai.init();
    toast('Connexion testée.');
    draw(outlet, 'ia');
  });

  outlet.querySelector('#exportData')?.addEventListener('click', () => {
    const dump = db.exportAll();
    download(`listing-studio-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(dump, null, 2), 'application/json');
    toast('Sauvegarde exportée (hors fichiers photo).');
  });

  outlet.querySelector('#importData')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirm({ title:'Importer cette sauvegarde ?', danger:true, confirmLabel:'Importer',
      message:'Les tables présentes dans le fichier remplaceront celles de cet espace.' });
    if (!ok) return;
    try{
      db.importAll(JSON.parse(await file.text()));
      toast('Sauvegarde importée.');
      location.reload();
    }catch(err){ failed('Fichier illisible : ' + err.message); }
  });

  outlet.querySelector('#wipe')?.addEventListener('click', async () => {
    const ok = await confirm({
      title:'Effacer tout l’espace ?', danger:true, confirmLabel:'Tout effacer',
      message:'Projets, photos, clients, templates et rapports seront supprimés.',
      detail:'Action irréversible. Exportez d’abord une sauvegarde si nécessaire.',
    });
    if (!ok) return;
    db.wipeCurrentUser();
    await idb.clearAll();
    toast('Espace vidé.');
    location.hash = '#/app';
    location.reload();
  });
}
