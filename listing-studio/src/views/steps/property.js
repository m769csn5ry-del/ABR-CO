/* Étape 1 — Informations du bien. */

import { esc, uid } from '../../core/util.js';
import { icon } from '../../core/icons.js';
import { PROPERTY_TYPES, AMENITY_GROUPS, AMENITIES } from '../../data/options.js';
import { sectionTitle, callout, chipGroup, wireChips } from '../components.js';
import { promptText, confirm } from '../../core/modal.js';
import { toast } from '../../core/toast.js';

export default function stepProperty(host, ctx){
  const p = ctx.project.property || {};
  const custom = p.customAmenities || [];

  host.innerHTML = `
  <div class="col" style="gap:var(--gap)">
    <section class="card">
      <div class="card-head"><h3>Identité du logement</h3>
        <span class="muted" style="font-size:12.4px">Sauvegarde automatique</span></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field span-2">
            <label for="f-name">Nom du logement</label>
            <input class="input" id="f-name" data-bind="property.name" value="${esc(p.name || '')}"
              placeholder="Ex. Casa Azul, Loft Confluence, Appartement Marais">
            <span class="hint">Nom interne, repris comme nom d’hébergement sur certaines plateformes.</span>
          </div>
          <div class="field">
            <label for="f-type">Type de bien</label>
            <select class="select" id="f-type" data-bind="property.type">
              ${PROPERTY_TYPES.map(t => `<option value="${t.id}" ${p.type === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="f-year">Année du logement</label>
            <input class="input" id="f-year" type="number" min="1500" max="2100" data-bind="property.year"
              value="${esc(p.year ?? '')}" placeholder="Ex. 2019">
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Localisation</h3></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field span-2">
            <label for="f-address">Adresse</label>
            <input class="input" id="f-address" data-bind="property.address" value="${esc(p.address || '')}"
              placeholder="Numéro et rue">
            <span class="hint">L’adresse reste interne : elle n’apparaît dans aucun texte généré.</span>
          </div>
          <div class="field">
            <label for="f-city">Ville</label>
            <input class="input" id="f-city" data-bind="property.city" value="${esc(p.city || '')}" placeholder="Ex. Bordeaux">
          </div>
          <div class="field">
            <label for="f-country">Pays</label>
            <input class="input" id="f-country" data-bind="property.country" value="${esc(p.country || '')}" placeholder="Ex. France">
          </div>
          <div class="field">
            <label for="f-district">Quartier</label>
            <input class="input" id="f-district" data-bind="property.district" value="${esc(p.district || '')}" placeholder="Ex. Chartrons">
          </div>
          <div class="field">
            <label for="f-currency">Devise</label>
            <select class="select" id="f-currency" data-bind="property.currency">
              ${['EUR','CHF','USD','GBP','CAD'].map(c => `<option value="${c}" ${p.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Capacité et configuration</h3></div>
      <div class="card-body">
        <div class="form-grid c3">
          ${numField('f-guests','Nombre de voyageurs','property.guests',p.guests,1,30)}
          ${numField('f-bedrooms','Nombre de chambres','property.bedrooms',p.bedrooms,0,20)}
          ${numField('f-beds','Nombre de lits','property.beds',p.beds,0,40)}
          ${numField('f-bathrooms','Salles de bain','property.bathrooms',p.bathrooms,0,15)}
          ${numField('f-surface','Surface (m²)','property.surface',p.surface,0,2000)}
          ${numField('f-floor','Étage','property.floor',p.floor,-3,60)}
          <div class="field">
            <label for="f-elevator">Ascenseur</label>
            <select class="select" id="f-elevator" data-bind="property.elevator" data-tristate="1">
              <option value="" ${p.elevator === null || p.elevator === undefined || p.elevator === '' ? 'selected' : ''}>Non précisé</option>
              <option value="true" ${p.elevator === true ? 'selected' : ''}>Oui</option>
              <option value="false" ${p.elevator === false ? 'selected' : ''}>Non</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Équipements</h3>
        <button class="btn sm" id="addAmenity">${icon('plus')} Équipement personnalisé</button></div>
      <div class="card-body">
        ${callout('Ne cochez que ce qui existe réellement : rien de ce qui n’est pas coché n’apparaîtra dans l’annonce, et rien ne sera inventé.', 'plain', 'info')}
        <div style="margin-top:18px" class="stack-lg">
          ${AMENITY_GROUPS.map(g => `
            <div>
              ${sectionTitle(g.label)}
              ${chipGroup(AMENITIES.filter(a => a.cat === g.id), p.amenities || [], { name:`am-${g.id}` })}
            </div>`).join('')}
          <div>
            ${sectionTitle('Équipements personnalisés')}
            ${custom.length
              ? `<div class="chips" id="customList">${custom.map(c => `
                  <span class="chip ${(p.amenities || []).includes(c.id) ? 'on' : ''} static" data-custom="${esc(c.id)}">
                    ${esc(c.label)} <button class="x" data-remove="${esc(c.id)}" aria-label="Retirer">×</button></span>`).join('')}</div>`
              : '<p class="muted" style="font-size:13px">Aucun équipement personnalisé. Utilisez le bouton ci-dessus pour en ajouter un (spa privatif, cave à vin, ponton…).</p>'}
          </div>
        </div>
      </div>
    </section>
  </div>`;

  AMENITY_GROUPS.forEach(g => {
    wireChips(host, `am-${g.id}`, () => {
      const selected = AMENITY_GROUPS.flatMap(gr =>
        Array.from(host.querySelectorAll(`[data-chips="am-${gr.id}"] .chip.on`)).map(c => c.dataset.value));
      const customOn = (ctx.project.property.customAmenities || [])
        .map(c => c.id).filter(id => (ctx.project.property.amenities || []).includes(id));
      ctx.patch('property', { amenities: [...selected, ...customOn] });
    });
  });

  host.querySelector('#addAmenity').addEventListener('click', async () => {
    const label = await promptText({ title:'Équipement personnalisé', label:'Intitulé', placeholder:'Ex. Cave à vin' });
    if (!label) return;
    const prop = ctx.project.property;
    const item = { id: uid('cust'), label, weight:2 };
    ctx.patch('property', {
      customAmenities: [...(prop.customAmenities || []), item],
      amenities: [...(prop.amenities || []), item.id],
    });
    toast(`Équipement « ${label} » ajouté.`);
    ctx.reload();
  });

  host.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.remove;
      const ok = await confirm({ title:'Retirer cet équipement ?', message:'Il disparaîtra de la fiche et des textes régénérés.', danger:true, confirmLabel:'Retirer' });
      if (!ok) return;
      const prop = ctx.project.property;
      ctx.patch('property', {
        customAmenities: (prop.customAmenities || []).filter(c => c.id !== id),
        amenities: (prop.amenities || []).filter(a => a !== id),
      });
      ctx.reload();
    });
  });

  host.querySelectorAll('[data-custom]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove]')) return;
      const id = chip.dataset.custom;
      const prop = ctx.project.property;
      const on = (prop.amenities || []).includes(id);
      ctx.patch('property', {
        amenities: on ? prop.amenities.filter(a => a !== id) : [...(prop.amenities || []), id],
      });
      chip.classList.toggle('on', !on);
    });
  });
}

function numField(id, label, bind, value, min, max){
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <input class="input" id="${id}" type="number" min="${min}" max="${max}" data-bind="${bind}"
      value="${value === null || value === undefined ? '' : esc(value)}">
  </div>`;
}
