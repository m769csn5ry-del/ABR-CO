/* Analyse d'image côté client.
 *
 * Les scores ne sont pas décoratifs : ils proviennent de mesures réelles
 * effectuées sur les pixels (netteté par variance du laplacien, exposition,
 * contraste, densité de contours, colorimétrie, répartition de l'énergie).
 * Aucune API externe n'est nécessaire ; l'architecture permet néanmoins de
 * brancher un service de vision (voir ai/engine.js) sans toucher à l'interface.
 */

import { clamp, round } from '../core/util.js';

const WORK = 384;   // largeur d'analyse : compromis précision / rapidité

/* ---------- Mesures bas niveau ---------- */
function toCanvas(img){
  const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.75;
  const w = Math.min(WORK, img.naturalWidth || WORK);
  const h = Math.max(1, Math.round(w * ratio));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { cv, ctx, w, h };
}

function measure(data, w, h){
  const n = w * h;
  const gray = new Float32Array(n);
  let sumL = 0, sumR = 0, sumG = 0, sumB = 0;
  let dark = 0, bright = 0;
  let satSum = 0, lowSatBright = 0, greenish = 0, blueTop = 0, warm = 0;
  const hist = new Uint32Array(256);

  for (let i = 0, p = 0; i < n; i++, p += 4){
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = l;
    sumL += l; sumR += r; sumG += g; sumB += b;
    hist[l | 0]++;
    if (l < 26) dark++;
    if (l > 238) bright++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    satSum += sat;
    if (sat < 0.12 && l > 150) lowSatBright++;
    if (g > r + 12 && g > b + 12) greenish++;
    if (r > b + 22 && l > 60) warm++;
    const y = (i / w) | 0;
    if (y < h / 3 && b > r + 14 && l > 120) blueTop++;
  }

  const mean = sumL / n;
  let varSum = 0;
  for (let i = 0; i < n; i++){ const d = gray[i] - mean; varSum += d * d; }
  const std = Math.sqrt(varSum / n);

  // Laplacien (netteté) + Sobel (densité et orientation des contours)
  let lapSum = 0, lapSq = 0, lapN = 0;
  let edges = 0, vert = 0, horiz = 0;
  const cell = new Float64Array(9);
  for (let y = 1; y < h - 1; y++){
    for (let x = 1; x < w - 1; x++){
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap; lapSq += lap * lap; lapN++;

      const gx = (gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1])
               - (gray[i - w - 1] + 2 * gray[i - 1] + gray[i + w - 1]);
      const gy = (gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1])
               - (gray[i - w - 1] + 2 * gray[i - w] + gray[i - w + 1]);
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > 90){
        edges++;
        if (Math.abs(gx) > Math.abs(gy) * 1.6) vert++;
        else if (Math.abs(gy) > Math.abs(gx) * 1.6) horiz++;
      }
      const cx = Math.min(2, (x / w * 3) | 0), cy = Math.min(2, (y / h * 3) | 0);
      cell[cy * 3 + cx] += mag;
    }
  }
  const lapMean = lapSum / Math.max(1, lapN);
  const lapVar = lapSq / Math.max(1, lapN) - lapMean * lapMean;

  // Entropie de l'histogramme : complexité visuelle
  let entropy = 0;
  for (let k = 0; k < 256; k++){
    if (!hist[k]) continue;
    const p = hist[k] / n;
    entropy -= p * Math.log2(p);
  }

  const cellTotal = cell.reduce((a, b) => a + b, 0) || 1;
  const cellShare = Array.from(cell, c => c / cellTotal);
  const centerBias = cellShare[4];
  const spread = 1 - Math.sqrt(cellShare.reduce((a, s) => a + (s - 1 / 9) ** 2, 0) / (8 / 81));

  const rm = sumR / n, gm = sumG / n, bm = sumB / n;
  const rg = Math.abs(rm - gm), yb = Math.abs(0.5 * (rm + gm) - bm);
  const colorfulness = Math.sqrt(rg * rg + yb * yb) + 0.3 * Math.sqrt(rg * rg + yb * yb);

  return {
    mean, std, entropy,
    darkRatio: dark / n, brightRatio: bright / n,
    sharpness: lapVar,
    edgeRatio: edges / n,
    vertRatio: vert / Math.max(1, edges),
    horizRatio: horiz / Math.max(1, edges),
    saturation: satSum / n,
    lowSatBright: lowSatBright / n,
    green: greenish / n, blueTop: blueTop / Math.max(1, n / 3), warm: warm / n,
    colorfulness, centerBias, spread,
    rm, gm, bm,
  };
}

/* ---------- Passage des mesures aux notes ---------- */
const band = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1) * 100;
/** Note maximale dans une plage idéale, décroissante de part et d'autre. */
function sweet(v, lo, ideal1, ideal2, hi){
  if (v >= ideal1 && v <= ideal2) return 100;
  if (v < ideal1) return clamp((v - lo) / (ideal1 - lo), 0, 1) * 100;
  return clamp((hi - v) / (hi - ideal2), 0, 1) * 100;
}

export function scoreFromMetrics(m, ratio){
  const sharpness = clamp(band(Math.log10(Math.max(m.sharpness, 1)), 1.35, 2.85), 0, 100);
  const exposure = sweet(m.mean, 30, 105, 172, 235)
    - m.darkRatio * 120 - m.brightRatio * 140;
  const luminosite = clamp(exposure, 0, 100);
  const contraste = clamp(sweet(m.std, 12, 42, 72, 105), 0, 100);

  // Composition : énergie bien répartie, sujet pas uniquement au centre,
  // format paysage privilégié pour une annonce.
  const format = ratio >= 1.2 && ratio <= 1.9 ? 100 : ratio >= 1 ? 78 : ratio >= 0.75 ? 52 : 34;
  const composition = clamp(
    0.42 * clamp(m.spread * 100, 0, 100) +
    0.20 * clamp(100 - Math.abs(m.centerBias - 0.16) * 420, 0, 100) +
    0.38 * format, 0, 100);

  // Désordre : beaucoup de contours courts + entropie élevée + faible
  // proportion de surfaces calmes.
  const clutter = clamp(
    (m.edgeRatio - 0.055) * 900 + (m.entropy - 7.1) * 26 - (1 - m.spread) * 20, 0, 100);
  const ordre = clamp(100 - clutter, 0, 100);

  // Perspective : verticales dominantes et régulières = prise de vue droite.
  const perspective = clamp(
    56 + (m.vertRatio - 0.30) * 130 + (m.horizRatio - 0.22) * 60, 10, 100);

  const attractivite = clamp(
    0.34 * luminosite + 0.22 * contraste +
    0.22 * clamp(band(m.colorfulness, 6, 46), 0, 100) +
    0.22 * composition, 0, 100);

  const pro = clamp(
    0.34 * sharpness + 0.26 * luminosite + 0.22 * composition + 0.18 * perspective
    - (m.brightRatio > 0.08 ? 12 : 0), 0, 100);

  const global = clamp(
    0.26 * sharpness + 0.22 * luminosite + 0.16 * composition +
    0.13 * ordre + 0.10 * perspective + 0.13 * attractivite, 0, 100);

  return {
    nettete: round(sharpness),
    luminosite: round(luminosite),
    contraste: round(contraste),
    composition: round(composition),
    ordre: round(ordre),
    perspective: round(perspective),
    attractivite: round(attractivite),
    qualitePro: round(pro),
    score: round(global),
  };
}

/* ---------- Recommandations lisibles ---------- */
export function recommendations(s, m, ratio){
  const out = [];
  const add = (level, text) => out.push({ level, text });

  if (s.score >= 82) add('ok', 'Bonne photo');
  if (s.nettete < 45) add('bad', 'Manque de netteté : reprendre la photo stabilisée');
  else if (s.nettete < 62) add('warn', 'Netteté moyenne : vérifier la mise au point');
  if (m.mean < 78) add('bad', 'Trop sombre');
  else if (m.darkRatio > 0.22) add('warn', 'Zones bouchées : ouvrir les rideaux ou éclairer la pièce');
  if (m.brightRatio > 0.07) add('warn', 'Zones brûlées : exposer pour les fenêtres');
  if (s.composition < 55) add('warn', 'À recadrer');
  if (ratio < 1) add('warn', 'Format portrait : préférer le format paysage pour une annonce');
  if (s.ordre < 52) add('warn', 'Désordre visible');
  if (s.perspective < 45) add('warn', 'Redresser les verticales : tenir l’appareil à hauteur de poitrine');
  if (s.attractivite < 50) add('warn', 'Photo peu attractive');
  if (s.score < 45) add('bad', 'Photo à refaire');
  if (!out.length) add('ok', 'Photo exploitable en l’état');
  return out;
}

export const LEVEL = (score) => (score >= 75 ? 'ok' : score >= 55 ? 'warn' : 'bad');

/* Catégories où la densité de contours vient de la matière (eau, végétation,
   relief) et non d'un encombrement : on neutralise la pénalité de rangement
   plutôt que d'afficher « Désordre visible » sur une photo de piscine. */
const OUTDOOR = new Set(['piscine','vue','exterieur','terrasse','jardin','quartier','jacuzzi']);

export function adjustForCategory(analysis, category){
  if (!OUTDOOR.has(category)) return analysis;
  const s = { ...analysis.scores };
  if (s.ordre < 70){
    s.ordre = Math.min(100, s.ordre + 28);
    s.score = round(clamp(
      0.26 * s.nettete + 0.22 * s.luminosite + 0.16 * s.composition +
      0.13 * s.ordre + 0.10 * s.perspective + 0.13 * s.attractivite, 0, 100));
  }
  const recs = analysis.recommendations
    .filter(r => r.text !== 'Désordre visible')
    .filter(r => !(r.text === 'Photo à refaire' && s.score >= 45));
  if (!recs.length) recs.push({ level:'ok', text:'Photo exploitable en l’état' });
  return { ...analysis, scores:s, recommendations:recs };
}

/* ---------- Point d'entrée ---------- */
export async function analyzeImage(img, { filename = '' } = {}){
  const { ctx, w, h } = toCanvas(img);
  const { data } = ctx.getImageData(0, 0, w, h);
  const m = measure(data, w, h);
  const ratio = (img.naturalWidth || w) / (img.naturalHeight || h);
  const scores = scoreFromMetrics(m, ratio);
  return {
    metrics: {
      ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, round(v, 4)])),
      ratio: round(ratio, 3),
      width: img.naturalWidth || w,
      height: img.naturalHeight || h,
    },
    scores,
    recommendations: recommendations(scores, m, ratio),
    filename,
    analyzedAt: Date.now(),
    engine: 'local-vision',
  };
}
