/* Page d'accueil publique. */

import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import { scoreRing, scoreBars } from './components.js';
import { PLANS } from '../data/options.js';
import { renderDemoPhoto } from '../data/demoPhotos.js';
import * as ai from '../ai/engine.js';
import { photoCategory } from '../data/options.js';

const FEATURES = [
  { ic:'sparkle',  t:'Rédaction complète', d:'Titre, variantes, accroche, descriptions, pièce par pièce, règles, FAQ et appel à l’action — à partir de vos informations, sans rien inventer.' },
  { ic:'photos',   t:'Analyse des photos', d:'Netteté, exposition, composition, désordre et perspective mesurés sur chaque image, avec un ordre de galerie recommandé.' },
  { ic:'layers',   t:'Toutes les plateformes', d:'Un contenu, autant de formats : chaque plateforme a ses limites de longueur et ses sections propres.' },
  { ic:'chart',    t:'Listing Score', d:'Une note sur 100 décomposée en six familles, avec les améliorations classées par gain de points.' },
  { ic:'euro',     t:'Stratégie de prix', d:'Une fourchette argumentée à partir de vos paramètres : saison, durée, équipements, qualité de l’annonce.' },
  { ic:'reports',  t:'Rapport client', d:'Un document de restitution prêt à présenter, exportable en PDF, à votre nom.' },
];

const BEFORE = {
  title:'Appartement à louer Paris',
  text:'Bel appartement bien situé. Proche commerces. Cuisine équipée. Wifi. Contactez-nous pour plus d’informations et disponibilités.',
};
const AFTER = {
  title:'Appartement contemporain au cœur du Marais — Paris',
  text:'Bienvenue dans cet appartement contemporain à Paris (quartier Le Marais). L’emplacement est l’atout numéro un de cette adresse. Le format convient particulièrement à un séjour à deux.\n\nL’appartement accueille jusqu’à 4 voyageurs. Surface et configuration : 48 m², au 3e étage, avec ascenseur.\n\nLa pièce de vie est équipée de TV, Wi-Fi et chauffage. La cuisine est équipée : lave-vaisselle, machine à café. Le logement compte 1 salle de bain, avec serviettes fournies.',
};

export default function landing(outlet){
  outlet.innerHTML = `
<div class="landing">
  <div class="landing-nav">
    <div class="inner">
      <a href="#/" class="row" style="gap:10px;text-decoration:none;color:inherit">
        <span class="brand-mark">LS</span>
        <span><span class="brand-name">Listing Studio</span></span>
      </a>
      <nav class="links">
        <a href="#produit">Produit</a><a href="#exemples">Exemples</a>
        <a href="#rapport">Rapport client</a><a href="#tarifs">Tarifs</a>
      </nav>
      <div class="row" style="gap:8px">
        <a class="btn" href="console.html#/">Console</a>
        <a class="btn" href="#/app">Ouvrir l’espace</a>
        <a class="btn primary" href="#/project/new">Créer une annonce</a>
      </div>
    </div>
  </div>

  <section class="hero">
    <span class="pill">${icon('sparkle')} Pour conciergeries, agences et propriétaires</span>
    <h1>Transforme les informations d’un logement en annonce qui donne envie de réserver.</h1>
    <p class="sub">Génère, optimise et présente des annonces immobilières professionnelles pour toutes tes plateformes depuis un seul espace.</p>
    <div class="cta">
      <a class="btn primary lg" href="#/project/new">Créer une annonce</a>
      <a class="btn lg" href="#/demo">Voir une démo</a>
    </div>
    <div class="trust">Airbnb · Booking.com · Vrbo · Abritel · Expedia · Leboncoin · PAP · Facebook Marketplace — et tout autre format via l’adaptateur universel.</div>
  </section>

  <section class="section alt" id="exemples">
    <div class="inner">
      <div class="section-head">
        <h2>Avant / après</h2>
        <p>Les mêmes informations de logement. À gauche, ce qu’un propriétaire écrit en deux minutes. À droite, ce que Listing Studio produit à partir de la même fiche.</p>
      </div>
      <div class="ba-grid">
        <div class="ba before">
          <div class="hd"><span>Avant</span><span>Score 41/100</span></div>
          <div class="bd"><div class="t">${esc(BEFORE.title)}</div><div class="x">${esc(BEFORE.text)}</div></div>
        </div>
        <div class="ba after">
          <div class="hd"><span>Après</span><span>Score 88/100</span></div>
          <div class="bd"><div class="t">${esc(AFTER.title)}</div><div class="x" style="white-space:pre-wrap">${esc(AFTER.text)}</div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="produit">
    <div class="section-head">
      <h2>Un atelier complet, pas un générateur de texte</h2>
      <p>Chaque étape produit un livrable utilisable : contenu, galerie ordonnée, score, prix, aperçu et rapport.</p>
    </div>
    <div class="grid c3">
      ${FEATURES.map(f => `<div class="card pad"><div class="feature">
        <div class="ic">${icon(f.ic)}</div>
        <div><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></div></div></div>`).join('')}
    </div>
  </section>

  <section class="section alt">
    <div class="inner">
      <div class="grid c2" style="align-items:start">
        <div class="card pad">
          <div class="eyebrow">Exemple de score</div>
          <div class="row" style="gap:22px;margin:14px 0 18px;align-items:center">
            ${scoreRing(88)}
            <div><div style="font-size:15px;font-weight:600">Excellent</div>
            <div class="muted" style="font-size:13px">Potentiel 96/100 après les trois premières actions.</div></div>
          </div>
          ${scoreBars({ parts:{
            titre:{ value:18, max:20 }, photos:{ value:17, max:20 }, description:{ value:19, max:20 },
            equipements:{ value:14, max:15 }, informations:{ value:10, max:10 }, positionnement:{ value:12, max:15 },
          } })}
        </div>
        <div class="card pad">
          <div class="eyebrow">Exemple d’analyse photo</div>
          <p class="muted" style="font-size:13px;margin:8px 0 14px">
            Les trois images ci-dessous sont générées puis analysées en direct dans votre navigateur :
            netteté, exposition, composition et désordre sont mesurés, pas simulés.</p>
          <div id="demoPhotos" class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
            ${[0, 1, 2].map(() => `<div><div class="skeleton" style="aspect-ratio:4/3;border-radius:8px"></div>
              <div class="skeleton sk-line" style="width:70%"></div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="rapport">
    <div class="section-head">
      <h2>Le rapport que vous remettez au client</h2>
      <p>Score avant / après, photos à refaire, titre et description recommandés, priorités et recommandation tarifaire — à votre nom, exportable en PDF.</p>
    </div>
    <div class="card" style="overflow:hidden">
      <div class="report-head">
        <div class="eyebrow">Rapport d’optimisation d’annonce</div>
        <div class="t">Villa Casa Azul — Marbella</div>
        <div class="m">Villa · Marbella · Espagne — établi par votre agence</div>
      </div>
      <div class="card-body">
        <div class="grid c3">
          <div><div class="eyebrow">Score actuel</div><div style="font-size:26px;font-weight:680">64<span class="muted" style="font-size:14px">/100</span></div></div>
          <div><div class="eyebrow">Après optimisation</div><div style="font-size:26px;font-weight:680;color:var(--ok)">91<span class="muted" style="font-size:14px">/100</span></div></div>
          <div><div class="eyebrow">Photos à refaire</div><div style="font-size:26px;font-weight:680">3<span class="muted" style="font-size:14px"> sur 12</span></div></div>
        </div>
        <div class="grid c2" style="margin-top:20px">
          <div class="card flat pad"><div class="eyebrow">Priorité 1</div>
            <div class="strong" style="margin-top:4px">Reprendre la photo de couverture</div>
            <div class="muted" style="font-size:13px">Gain estimé : +6 points de score, premier levier de taux de clic.</div></div>
          <div class="card flat pad"><div class="eyebrow">Priorité 2</div>
            <div class="strong" style="margin-top:4px">Compléter les équipements déclarés</div>
            <div class="muted" style="font-size:13px">7 équipements présents non cochés : +4 points et meilleure position en filtre.</div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section alt" id="tarifs">
    <div class="inner">
      <div class="section-head">
        <h2>Des plans pensés pour les professionnels</h2>
        <p>Aucun paiement n’est activé pour l’instant : les plans structurent l’accès aux fonctionnalités dans l’application.</p>
      </div>
      <div class="price-grid">
        ${PLANS.map(p => `
          <div class="price-card ${p.id === 'pro' ? 'feat' : ''}">
            ${p.id === 'pro' ? '<span class="badge brand" style="position:absolute;top:-11px;left:24px">Le plus utilisé</span>' : ''}
            <div class="eyebrow">${esc(p.label)}</div>
            <div class="amt">${p.price === 0 ? 'Gratuit' : p.price + ' €'}<span>${p.price === 0 ? '' : ' / mois'}</span></div>
            <div class="muted" style="font-size:13px">${p.projects === Infinity ? 'Projets illimités' : `${p.projects} projets actifs`}</div>
            <ul>${p.features.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul>
            <a class="btn ${p.id === 'pro' ? 'primary' : ''} block" href="#/settings?tab=plan">Choisir ${esc(p.label)}</a>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section center">
    <h2 style="font-size:clamp(22px,3vw,32px)">Prêt à produire votre première annonce ?</h2>
    <p class="muted" style="margin:10px auto 22px;max-width:52ch">Créez un projet, importez vos photos, laissez le studio faire le reste. Vos données restent dans votre navigateur.</p>
    <div class="row" style="justify-content:center;gap:12px;flex-wrap:wrap">
      <a class="btn primary lg" href="#/project/new">Créer une annonce</a>
      <a class="btn lg" href="#/demo">Voir une démo</a>
    </div>
  </section>

  <footer class="landing-foot">
    Listing Studio — outil d’aide à la rédaction et à l’optimisation d’annonces.
    Les aperçus sont des simulations neutres : ils ne reproduisent ni les logos, ni l’identité visuelle des plateformes citées.
  </footer>
</div>`;

  renderLiveSamples(outlet);
}

/* Génère trois visuels de démonstration et les analyse réellement. */
async function renderLiveSamples(outlet){
  const host = outlet.querySelector('#demoPhotos');
  if (!host) return;
  const specs = [
    { cat:'salon',  defect:null,       palette:'clair'  },
    { cat:'chambre',defect:'sombre',   palette:'chaud'  },
    { cat:'sdb',    defect:'desordre', palette:'froid'  },
  ];
  const cards = [];
  for (const [i, s] of specs.entries()){
    try{
      const blob = await renderDemoPhoto(s.cat, { palette:s.palette, defect:s.defect, seed:`landing-${i}` });
      const url = URL.createObjectURL(blob);
      const img = await new Promise((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url;
      });
      const a = await ai.analyzePhoto(img, { filename: `${s.cat}.jpg` });
      const cls = a.scores.score >= 75 ? 'ok' : a.scores.score >= 55 ? 'warn' : 'bad';
      cards.push(`<div>
        <div style="aspect-ratio:4/3;border-radius:8px;overflow:hidden;border:1px solid var(--line)">
          <img src="${url}" alt="Exemple ${esc(s.cat)}" style="width:100%;height:100%;object-fit:cover"></div>
        <div class="row" style="gap:6px;margin-top:6px">
          <span class="badge ${cls}">${a.scores.score}/100</span>
          <span class="dim" style="font-size:11.5px">${esc(photoCategory(a.category).label)}</span></div>
        <div class="dim" style="font-size:11px;line-height:1.35;margin-top:3px">${esc(a.recommendations[0]?.text || '')}</div>
      </div>`);
    }catch(err){
      console.warn('[landing] exemple non généré', err);
    }
  }
  if (cards.length) host.innerHTML = cards.join('');
}
