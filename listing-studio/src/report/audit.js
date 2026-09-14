/* Rapport d'audit remis au client.
 *
 * C'est le livrable commercial : ce que le client lit, garde, et sur quoi il
 * décide. Il ne contient que des éléments mesurés — aucun chiffre de marché,
 * aucune promesse de résultat, aucune donnée que le système n'a pas établie.
 */

import { esc, num, dateFR } from '../core/util.js';
import { ACTION_LABELS } from '../console/ui.js';
import { LEVEL_LABELS } from '../analysis/score.js';

/* Les valeurs par jour sont souvent inférieures à 1 : les arrondir à l'entier
   afficherait « +0 » en face d'un écart de 153 %. */
const perDay = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) < 10 && !Number.isInteger(v)
    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits:1 }).format(v)
    : num(v);
};

const tone = (level) => ({ excellent:'ok', bon:'ok', faible:'warn', critique:'bad' }[level] || 'outline');
const sev = (s) => ({ critical:'bad', major:'warn', minor:'info', info:'outline' }[s] || 'outline');

/**
 * @param {object} ctx { dossier, client, org, versions, performance }
 * @returns {string} HTML complet du rapport
 */
export function buildReport({ dossier, client = null, org = null, performance = null }){
  const a = dossier.analysis;
  const o = dossier.optimization;
  if (!a) return '<div class="callout warn">Lancez l’analyse avant de produire le rapport.</div>';

  const critical = a.problems.filter(p => p.severity === 'critical');
  const major = a.problems.filter(p => p.severity === 'major');
  const others = a.problems.filter(p => !['critical','major'].includes(p.severity));
  const gain = o?.score ? o.score.total - a.score.total : null;

  return `
  <article class="report">
    <header class="report-head">
      <div class="eyebrow">Audit d’annonce</div>
      <div class="t">${esc(dossier.name)}</div>
      <div class="m">
        ${client ? `Préparé pour ${esc(client.name)} — ` : ''}${esc(dateFR(Date.now()))}
        ${org?.name ? ` — ${esc(org.name)}` : ''}
      </div>
      <div class="report-scores" style="margin-top:20px">
        <div>
          <div class="eyebrow">Score actuel</div>
          <div class="report-figure">${num(a.score.total)}<span> / 100</span></div>
          <div class="m" style="margin-top:2px">${esc(LEVEL_LABELS[a.score.level])}</div>
        </div>
        <div>
          <div class="eyebrow">Potentiel atteignable</div>
          <div class="report-figure">${num(a.score.potential)}<span> / 100</span></div>
          <div class="m" style="margin-top:2px">+${num(a.score.gain)} points récupérables</div>
        </div>
      </div>
    </header>

    <section class="report-sec">
      <h3>Ce que dit l’analyse</h3>
      <p>
        L’annonce obtient <b>${num(a.score.total)} points sur 100</b> sur une grille de dix critères :
        titre, description, photos, informations, positionnement, conversion, référencement,
        confiance, différenciation et mentions attendues.
        ${critical.length
          ? `<b>${num(critical.length)} point${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''}</b> ${critical.length > 1 ? 'sont relevés' : 'est relevé'}`
          : 'Aucun point critique n’est relevé'}${major.length ? `, ainsi que ${num(major.length)} point${major.length > 1 ? 's' : ''} important${major.length > 1 ? 's' : ''}` : ''}.
      </p>
      <p class="muted" style="font-size:12.6px">
        Cette grille est interne et appliquée de la même façon à toutes les annonces.
        Elle mesure la qualité du contenu publié, pas la valeur du bien ni le prix du marché.
      </p>
    </section>

    <section class="report-sec">
      <h3>Répartition par critère</h3>
      <table>
        <thead><tr><th>Critère</th><th class="num">Obtenu</th><th class="num">Maximum</th><th>Ce qui coûte des points</th></tr></thead>
        <tbody>${a.score.axes.map(x => `<tr>
          <td>${esc(x.label)}</td>
          <td class="num"><b>${num(x.points)}</b></td>
          <td class="num muted">${num(x.max)}</td>
          <td class="muted" style="font-size:12.4px">${x.reasons.length ? esc(x.reasons.join(' ')) : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </section>

    ${[['Points critiques', critical], ['Points importants', major], ['Points secondaires', others]]
      .filter(([, list]) => list.length).map(([title, list]) => `
      <section class="report-sec">
        <h3>${esc(title)}</h3>
        <div class="report-prio">
          ${list.map((p, i) => `<div class="p">
            <span class="n">${i + 1}</span>
            <div style="min-width:0">
              <div><b>${esc(p.explanation)}</b> <span class="badge ${sev(p.severity)}">${esc(p.severityLabel)}</span></div>
              ${p.recommendation ? `<div class="muted" style="font-size:12.8px;margin-top:3px">${esc(p.recommendation)}</div>` : ''}
              ${p.action && ACTION_LABELS[p.action] ? `<div style="font-size:12.8px;margin-top:4px">À faire : ${esc(ACTION_LABELS[p.action])}</div>` : ''}
              ${p.verify ? '<div class="muted" style="font-size:12px;margin-top:3px">À vérifier : cette information ne peut pas être confirmée par le système.</div>' : ''}
            </div>
          </div>`).join('')}
        </div>
      </section>`).join('')}

    ${o ? `
    <section class="report-sec">
      <h3>Version proposée</h3>
      <div class="report-delta">
        <span>Score actuel <b>${num(a.score.total)}</b></span>
        <span>→</span>
        <span>Version proposée <b>${num(o.score.total)}</b></span>
        ${gain !== null ? `<span class="badge ${gain > 0 ? 'ok' : 'outline'}">${gain >= 0 ? '+' : ''}${num(gain)} points</span>` : ''}
      </div>
      <div class="report-title-proposal">${esc(o.content.title)}</div>
      <div style="white-space:pre-wrap;line-height:1.7;margin-top:10px">${esc(o.content.description)}</div>
      <p style="margin-top:12px"><i>${esc(o.content.cta)}</i></p>
      ${o.content.missing?.length ? `
        <div class="callout warn" style="margin-top:16px;display:block">
          <b>Informations à nous transmettre</b>
          <p style="margin-top:6px">
            Ces éléments n’apparaissent pas dans la version proposée parce que nous ne les
            connaissons pas, et nous préférons ne rien écrire que nous ignorons :
            ${esc(o.content.missing.join(', '))}.
          </p>
        </div>` : ''}
    </section>` : ''}

    ${performance?.metrics?.length ? `
    <section class="report-sec">
      <h3>Performances observées</h3>
      <table>
        <thead><tr><th>Indicateur</th><th class="num">Avant / jour</th><th class="num">Après / jour</th><th class="num">Écart</th></tr></thead>
        <tbody>${performance.metrics.map(m => `<tr>
          <td>${esc(m.label)}</td><td class="num">${perDay(m.beforePerDay)}</td>
          <td class="num">${perDay(m.afterPerDay)}</td>
          <td class="num">${m.delta >= 0 ? '+' : ''}${perDay(m.delta)}${m.deltaPct === null ? '' : ` (${m.deltaPct >= 0 ? '+' : ''}${num(m.deltaPct)} %)`}</td>
        </tr>`).join('')}</tbody>
      </table>
      <p class="muted" style="font-size:12.4px;margin-top:10px">
        ${esc(performance.note || '')} ${esc(performance.disclaimer || '')}
      </p>
    </section>` : ''}

    <footer class="report-sec" style="border-top:1px solid var(--line);padding-top:16px">
      <p class="muted" style="font-size:12.2px">
        Rapport établi le ${esc(dateFR(Date.now(), true))} à partir du texte de l’annonce
        et des informations transmises sur le bien. Les scores proviennent d’une grille
        d’évaluation interne, appliquée de façon identique à chaque annonce et reproductible :
        la même annonce donne toujours le même score. Aucune donnée de marché externe n’est
        utilisée, et aucun résultat commercial n’est garanti.
      </p>
    </footer>
  </article>`;
}
