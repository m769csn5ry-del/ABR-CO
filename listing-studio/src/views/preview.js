/* Aperçu de l'annonce — simulation neutre.
 *
 * Cet aperçu ne reproduit ni les logos, ni les couleurs, ni la mise en page
 * propriétaire d'une plateforme : c'est une présentation générique, marquée
 * comme simulation, destinée à montrer le travail à un prospect.
 */

import { esc, num, money, words } from '../core/util.js';
import { icon } from '../core/icons.js';
import { photoUrl } from '../data/projects.js';
import { amenityLabel } from '../data/options.js';
import { adapter, labelOf } from '../platforms/index.js';

export const MODES = [
  { id:'desktop', label:'Desktop' },
  { id:'mobile',  label:'Mobile' },
  { id:'card',    label:'Carte d’annonce' },
  { id:'full',    label:'Page complète' },
];

export function simulationHTML(project, photos, urls, mode = 'desktop', platform = null){
  const c = project.content;
  if (!c) return `<div class="empty"><h3>Aucune annonce générée</h3>
    <p class="muted">Générez l’annonce à l’étape 7 pour afficher l’aperçu.</p></div>`;

  const p = project.property || {};
  const cur = p.currency || 'EUR';
  const price = Number(project.pricingRecommendation?.recommended || project.pricing?.current) || null;
  const cover = photos[0];
  const gallery = photos.slice(0, 5);
  const plat = platform ? adapter(platform) : null;
  const title = plat ? (plat.compose(c, { project }).blocks.find(b => b.id === 'title' || b.id === 'headline' || b.id === 'name')?.text || c.title) : c.title;

  if (mode === 'card'){
    return `<div class="sim-card">
      <div class="ph">${cover && urls[cover.id] ? `<img src="${esc(urls[cover.id])}" alt="">` : ''}</div>
      <div class="bd">
        <div class="t">${esc(title)}</div>
        <div class="l">${esc([p.district, p.city, p.country].filter(Boolean).join(', '))}</div>
        <div class="l" style="margin-top:4px">${esc(facts(p).join(' · '))}</div>
        ${price ? `<div class="p">${money(price, cur)} <span>par nuit</span></div>` : ''}
        <div class="sim-note" style="margin-top:10px;border:0;padding:0">
          <span>Simulation créée avec Listing Studio</span>${project.isDemo ? '<span>Démonstration</span>' : ''}</div>
      </div>
    </div>`;
  }

  const isMobile = mode === 'mobile';
  const full = mode === 'full';

  return `<div class="sim ${isMobile ? 'sim-mobile' : 'sim-desktop'}">
    <div class="sim-gallery">
      ${gallery.map((ph, i) => `<div class="g">
        ${urls[ph.id] ? `<img src="${esc(urls[ph.id])}" alt="${esc(ph.label || '')}">` : ''}
        ${i === gallery.length - 1 && photos.length > gallery.length
          ? `<span class="more">+${num(photos.length - gallery.length)} photos</span>` : ''}
      </div>`).join('') || '<div class="g"></div>'}
    </div>
    <div class="sim-body">
      ${project.isDemo ? '<div style="margin-bottom:10px"><span class="demo-tag">Démonstration — logement fictif</span></div>' : ''}
      ${plat ? `<div style="margin-bottom:10px"><span class="badge outline">Format ${esc(plat.label)} — simulation</span></div>` : ''}
      <h2 class="sim-title">${esc(title)}</h2>
      <div class="sim-sub">${esc([p.district, p.city, p.country].filter(Boolean).join(', ') || 'Localisation à compléter')}</div>

      <div class="sim-facts">
        ${factTiles(p).join('')}
      </div>

      <div class="sim-sec">
        <h4>Présentation</h4>
        <p>${esc(c.shortDescription)}</p>
      </div>

      ${full || !isMobile ? `<div class="sim-sec">
        <h4>Description</h4>
        <p>${esc(c.longDescription)}</p>
      </div>` : ''}

      ${(c.highlights || []).length ? `<div class="sim-sec">
        <h4>Points forts</h4>
        <div class="sim-amens">${c.highlights.map(h => `<div class="a">${esc(h)}</div>`).join('')}</div>
      </div>` : ''}

      <div class="sim-sec">
        <h4>Équipements</h4>
        <div class="sim-amens">${(c.amenities || []).slice(0, full ? 60 : 12).map(a => `<div class="a">${esc(a)}</div>`).join('')}</div>
      </div>

      ${full ? `
        <div class="sim-sec"><h4>Les espaces</h4>
          <div class="col" style="gap:6px">${(c.rooms || []).map(r =>
            `<div style="font-size:13.5px"><span class="strong">${esc(r.name)}</span> — ${esc(r.text)}</div>`).join('')}</div></div>
        <div class="sim-sec"><h4>À proximité</h4>
          <div class="col" style="gap:5px">${(c.attractions || []).map(a =>
            `<div style="font-size:13.5px">${esc(a.name)} <span class="muted">— ${esc(a.note)}</span></div>`).join('') || '<span class="muted">Non renseigné</span>'}</div></div>
        <div class="sim-sec"><h4>Questions fréquentes</h4>
          <div class="col" style="gap:10px">${(c.faq || []).map(f =>
            `<div><div class="strong" style="font-size:13.4px">${esc(f.q)}</div>
             <div class="muted" style="font-size:13.2px">${esc(f.a)}</div></div>`).join('')}</div></div>
      ` : ''}

      <div class="sim-sec">
        <h4>Règles et informations pratiques</h4>
        <div class="grid c2" style="gap:14px">
          <div><div class="eyebrow" style="margin-bottom:6px">Règles</div>
            <div class="col" style="gap:4px;font-size:13.2px">${(c.rules || []).map(r => `<div>${esc(r)}</div>`).join('')}</div></div>
          <div><div class="eyebrow" style="margin-bottom:6px">Pratique</div>
            <div class="col" style="gap:4px;font-size:13.2px">${(c.practical || []).slice(0, 8).map(x =>
              `<div><span class="muted">${esc(x.k)} :</span> ${esc(x.v)}</div>`).join('')}</div></div>
        </div>
        <div style="margin-top:12px;font-size:13.2px">
          <div>${esc(c.checkin)}</div><div>${esc(c.checkout)}</div>
        </div>
      </div>

      <div class="sim-price">
        <div>
          ${price ? `<div class="p">${money(price, cur)} <span>par nuit</span></div>` : '<div class="p" style="font-size:17px">Prix à définir</div>'}
          ${project.pricing?.cleaning ? `<div class="muted" style="font-size:12.5px">Frais de ménage : ${money(project.pricing.cleaning, cur)}</div>` : ''}
        </div>
        <button class="btn primary lg" type="button" disabled aria-disabled="true">${esc(c.cta || 'Réserver')}</button>
      </div>

      <div class="sim-note">
        <span>Simulation créée avec Listing Studio</span>
        <span>${project.isDemo ? 'Contenu de démonstration · ' : ''}Cet aperçu n’est pas une page ${plat ? esc(plat.label) : 'de plateforme'} : mise en page neutre, sans identité visuelle tierce.</span>
      </div>
    </div>
  </div>`;
}

function facts(p){
  return [
    p.guests ? `${num(p.guests)} voyageurs` : null,
    p.bedrooms ? `${num(p.bedrooms)} ch.` : null,
    p.beds ? `${num(p.beds)} lits` : null,
    p.bathrooms ? `${num(p.bathrooms)} sdb` : null,
  ].filter(Boolean);
}

function factTiles(p){
  const t = [
    { v:p.guests, k:'Voyageurs' },
    { v:p.bedrooms, k:'Chambres' },
    { v:p.beds, k:'Lits' },
    { v:p.bathrooms, k:'Salles de bain' },
  ];
  if (p.surface) t.push({ v:`${num(p.surface)} m²`, k:'Surface' });
  return t.slice(0, 4).map(x => `<div class="f"><div class="v">${x.v || '—'}</div><div class="k">${esc(x.k)}</div></div>`);
}

/** Charge les URL d'objet des photos d'un projet. */
export async function photoUrlMap(photos){
  const map = {};
  await Promise.all(photos.map(async p => { map[p.id] = await photoUrl(p); }));
  return map;
}

export { labelOf };
