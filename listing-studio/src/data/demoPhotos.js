/* Visuels de démonstration générés par le navigateur.
 *
 * Aucune photographie réelle n'est utilisée : les images sont dessinées au
 * canvas, et portent la mention « DÉMO » afin qu'elles ne puissent jamais
 * passer pour les photos d'un vrai logement. Certaines sont volontairement
 * sombres, encombrées ou de travers : l'analyse photo doit avoir de la
 * matière à détecter, comme sur un vrai lot de photos client.
 */

import { seeded } from '../core/util.js';

const W = 1200, H = 800;

const PALETTES = {
  clair:   { wall:['#F3F0EA','#E6E1D7'], floor:'#C9B49A', accent:'#2E4F47', soft:'#DCD3C4' },
  chaud:   { wall:['#F1E7DC','#E0CFBB'], floor:'#B08D68', accent:'#8C5A2B', soft:'#D8C4AC' },
  froid:   { wall:['#EEF1F3','#DCE2E6'], floor:'#A9A9A6', accent:'#2C4557', soft:'#CBD3D9' },
  nuit:    { wall:['#2A2E33','#1C2024'], floor:'#3A342E', accent:'#C9A227', soft:'#40464C' },
  nature:  { wall:['#EDF1E9','#DCE4D6'], floor:'#B3A07E', accent:'#3E5C3A', soft:'#CBD6C2' },
};

function grad(ctx, x0, y0, x1, y1, c0, c1){
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}
function rr(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function plant(ctx, x, y, s, rnd){
  ctx.fillStyle = '#8A6A4A';
  rr(ctx, x - 16 * s, y, 32 * s, 30 * s, 5 * s); ctx.fill();
  ctx.strokeStyle = '#3E6B46'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++){
    const a = -Math.PI / 2 + (i - 3) * 0.24 + (rnd() - .5) * 0.1;
    const L = (46 + rnd() * 34) * s;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * L * .5, y + Math.sin(a) * L * .9, x + Math.cos(a) * L, y + Math.sin(a) * L);
    ctx.stroke();
  }
}
function frames(ctx, x, y, n, pal, rnd){
  for (let i = 0; i < n; i++){
    const w = 70 + rnd() * 60, h = 90 + rnd() * 50;
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 3;
    ctx.fillRect(x + i * (w + 26), y, w, h);
    ctx.strokeRect(x + i * (w + 26), y, w, h);
    ctx.fillStyle = pal.soft;
    ctx.fillRect(x + i * (w + 26) + 10, y + 10, w - 20, h - 20);
  }
}
function window_(ctx, x, y, w, h, sky = ['#BFDCF0','#EAF3FA']){
  ctx.fillStyle = grad(ctx, x, y, x, y + h, sky[0], sky[1]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2B2F33'; ctx.lineWidth = 7;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
}
function floorPerspective(ctx, pal, horizon){
  ctx.fillStyle = grad(ctx, 0, horizon, 0, H, pal.floor, '#8E7A61');
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = 'rgba(0,0,0,.09)'; ctx.lineWidth = 2;
  for (let i = -6; i < 14; i++){
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 60, horizon);
    ctx.lineTo(W / 2 + i * 210, H);
    ctx.stroke();
  }
}
function vignette(ctx, strength = 0.3){
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function stamp(ctx){
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(17,22,25,.72)';
  rr(ctx, W - 132, H - 56, 108, 32, 8); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('DÉMO', W - 78, H - 39);
  ctx.restore();
}

/* ---------- Scènes ---------- */
const SCENES = {
  salon(ctx, pal, rnd){
    const hz = 470;
    ctx.fillStyle = grad(ctx, 0, 0, 0, hz, pal.wall[0], pal.wall[1]);
    ctx.fillRect(0, 0, W, hz);
    floorPerspective(ctx, pal, hz);
    window_(ctx, 740, 110, 360, 300);
    frames(ctx, 150, 140, 2, pal, rnd);
    // canapé
    ctx.fillStyle = pal.accent;
    rr(ctx, 130, 470, 470, 140, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    rr(ctx, 150, 452, 200, 60, 12); ctx.fill();
    rr(ctx, 370, 452, 200, 60, 12); ctx.fill();
    // table basse + tapis
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    rr(ctx, 120, 620, 560, 120, 14); ctx.fill();
    ctx.fillStyle = '#7A5B3C';
    rr(ctx, 300, 630, 220, 70, 10); ctx.fill();
    plant(ctx, 1020, 560, 1.1, rnd);
  },
  cuisine(ctx, pal, rnd){
    const hz = 430;
    ctx.fillStyle = grad(ctx, 0, 0, 0, hz, pal.wall[0], pal.wall[1]);
    ctx.fillRect(0, 0, W, hz);
    floorPerspective(ctx, pal, hz);
    // meubles hauts
    ctx.fillStyle = '#FBFAF8';
    for (let i = 0; i < 5; i++) { rr(ctx, 90 + i * 150, 90, 130, 150, 6); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { rr(ctx, 90 + i * 150, 90, 130, 150, 6); ctx.stroke(); }
    // plan de travail
    ctx.fillStyle = '#2F3439';
    rr(ctx, 70, 420, 820, 26, 6); ctx.fill();
    ctx.fillStyle = '#E9E5DD';
    rr(ctx, 70, 446, 820, 190, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.10)';
    for (let i = 0; i < 5; i++){ ctx.beginPath(); ctx.moveTo(70 + i * 164, 446); ctx.lineTo(70 + i * 164, 636); ctx.stroke(); }
    // évier + cafetière
    ctx.fillStyle = '#B9BEC3'; rr(ctx, 200, 400, 150, 22, 6); ctx.fill();
    ctx.fillStyle = pal.accent; rr(ctx, 620, 356, 60, 66, 8); ctx.fill();
    window_(ctx, 940, 150, 200, 250);
    plant(ctx, 980, 600, .8, rnd);
  },
  chambre(ctx, pal, rnd){
    const hz = 480;
    ctx.fillStyle = grad(ctx, 0, 0, 0, hz, pal.wall[0], pal.wall[1]);
    ctx.fillRect(0, 0, W, hz);
    floorPerspective(ctx, pal, hz);
    // tête de lit
    ctx.fillStyle = pal.soft;
    rr(ctx, 300, 210, 600, 190, 14); ctx.fill();
    // lit
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 270, 390, 660, 230, 16); ctx.fill();
    ctx.fillStyle = '#EFEAE1';
    rr(ctx, 270, 520, 660, 100, 12); ctx.fill();
    // oreillers
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 2;
    rr(ctx, 330, 360, 220, 80, 14); ctx.fill(); ctx.stroke();
    rr(ctx, 660, 360, 220, 80, 14); ctx.fill(); ctx.stroke();
    // lampes
    ctx.fillStyle = pal.accent;
    rr(ctx, 180, 420, 70, 90, 8); ctx.fill();
    rr(ctx, 950, 420, 70, 90, 8); ctx.fill();
    window_(ctx, 40, 150, 190, 230);
    plant(ctx, 1090, 560, .9, rnd);
  },
  sdb(ctx, pal, rnd){
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, '#FAFBFC', '#E3E8EB');
    ctx.fillRect(0, 0, W, H);
    // faïence
    ctx.strokeStyle = 'rgba(0,0,0,.055)'; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 90){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 520); ctx.stroke(); }
    for (let y = 0; y < 520; y += 90){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#D7DCE0'; ctx.fillRect(0, 520, W, H - 520);
    // meuble vasque
    ctx.fillStyle = '#8E6B4C'; rr(ctx, 180, 430, 460, 170, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 160, 400, 500, 46, 10); ctx.fill();
    ctx.fillStyle = '#EDF1F3'; rr(ctx, 330, 404, 160, 34, 12); ctx.fill();
    // miroir
    ctx.fillStyle = '#CFE0EA'; ctx.strokeStyle = '#2F3439'; ctx.lineWidth = 6;
    rr(ctx, 280, 120, 260, 230, 12); ctx.fill(); ctx.stroke();
    // douche
    ctx.fillStyle = 'rgba(190,215,230,.55)';
    rr(ctx, 760, 120, 340, 480, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(70,90,100,.5)'; ctx.lineWidth = 5;
    rr(ctx, 760, 120, 340, 480, 10); ctx.stroke();
    // serviettes
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 660, 200, 56, 150, 8); ctx.fill();
    plant(ctx, 120, 620, .6, rnd);
  },
  terrasse(ctx, pal, rnd){
    ctx.fillStyle = grad(ctx, 0, 0, 0, 420, '#9FC7E8', '#E8F1F7');
    ctx.fillRect(0, 0, W, 420);
    // horizon végétal
    ctx.fillStyle = '#6E8F60';
    ctx.beginPath(); ctx.moveTo(0, 420);
    for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 400 + Math.sin(x / 120) * 22);
    ctx.lineTo(W, 470); ctx.lineTo(0, 470); ctx.fill();
    // platelage
    ctx.fillStyle = '#B08D68'; ctx.fillRect(0, 460, W, H - 460);
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3;
    for (let y = 470; y < H; y += 34){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // mobilier
    ctx.fillStyle = '#3F4A46'; rr(ctx, 180, 500, 300, 120, 12); ctx.fill();
    ctx.fillStyle = '#E8E2D6'; rr(ctx, 200, 486, 120, 40, 8); ctx.fill();
    rr(ctx, 340, 486, 120, 40, 8); ctx.fill();
    ctx.fillStyle = '#7A5B3C'; rr(ctx, 560, 540, 240, 90, 8); ctx.fill();
    // parasol
    ctx.fillStyle = '#D9CDBA';
    ctx.beginPath(); ctx.moveTo(900, 330); ctx.lineTo(1160, 440); ctx.lineTo(640, 440); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5B5B57'; ctx.fillRect(893, 330, 12, 300);
    plant(ctx, 1090, 640, 1, rnd);
  },
  piscine(ctx, pal, rnd){
    ctx.fillStyle = grad(ctx, 0, 0, 0, 320, '#8FC3E8', '#DCEBF5');
    ctx.fillRect(0, 0, W, 320);
    ctx.fillStyle = '#6E8F60'; ctx.fillRect(0, 300, W, 90);
    ctx.fillStyle = '#D8CDB8'; ctx.fillRect(0, 380, W, H - 380);
    // bassin
    ctx.fillStyle = grad(ctx, 0, 430, 0, 760, '#2E93C8', '#1C6A96');
    rr(ctx, 150, 430, 900, 330, 22); ctx.fill();
    ctx.strokeStyle = '#EDE6D6'; ctx.lineWidth = 10;
    rr(ctx, 150, 430, 900, 330, 22); ctx.stroke();
    // reflets
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 5;
    for (let i = 0; i < 9; i++){
      const y = 470 + i * 32;
      ctx.beginPath();
      for (let x = 190; x < 1010; x += 40) ctx.lineTo(x, y + Math.sin((x + i * 70) / 55) * 6);
      ctx.stroke();
    }
    // transats
    ctx.fillStyle = '#F4F1EA';
    rr(ctx, 190, 300, 180, 62, 8); ctx.fill();
    rr(ctx, 420, 300, 180, 62, 8); ctx.fill();
    plant(ctx, 1120, 400, 1.1, rnd);
  },
  vue(ctx, pal, rnd){
    ctx.fillStyle = grad(ctx, 0, 0, 0, 430, '#F2C293', '#9CC6E4');
    ctx.fillRect(0, 0, W, 430);
    ctx.fillStyle = 'rgba(255,244,225,.9)';
    ctx.beginPath(); ctx.arc(880, 200, 62, 0, Math.PI * 2); ctx.fill();
    // reliefs
    ctx.fillStyle = '#6B7F8E';
    ctx.beginPath(); ctx.moveTo(0, 430);
    ctx.lineTo(220, 300); ctx.lineTo(430, 415); ctx.lineTo(700, 268); ctx.lineTo(980, 400);
    ctx.lineTo(1200, 320); ctx.lineTo(1200, 470); ctx.lineTo(0, 470); ctx.fill();
    // mer
    ctx.fillStyle = grad(ctx, 0, 460, 0, H, '#2F7EA8', '#1C5878');
    ctx.fillRect(0, 460, W, H - 460);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++){
      const y = 500 + i * 30;
      ctx.beginPath();
      for (let x = 0; x < W; x += 50) ctx.lineTo(x, y + Math.sin((x + i * 90) / 70) * 5);
      ctx.stroke();
    }
    // garde-corps
    ctx.strokeStyle = 'rgba(40,45,50,.8)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, 690); ctx.lineTo(W, 690); ctx.stroke();
    for (let x = 60; x < W; x += 120){ ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x, H); ctx.stroke(); }
  },
  exterieur(ctx, pal, rnd){
    ctx.fillStyle = grad(ctx, 0, 0, 0, 460, '#A9CDE8', '#E9F2F8');
    ctx.fillRect(0, 0, W, 460);
    ctx.fillStyle = '#7FA06C'; ctx.fillRect(0, 520, W, H - 520);
    // façade
    ctx.fillStyle = '#F0EAE0';
    rr(ctx, 230, 200, 740, 330, 6); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.moveTo(190, 210); ctx.lineTo(600, 70); ctx.lineTo(1010, 210); ctx.closePath(); ctx.fill();
    // ouvertures
    for (let i = 0; i < 3; i++) window_(ctx, 300 + i * 220, 280, 130, 120);
    ctx.fillStyle = '#6B4B31'; rr(ctx, 560, 400, 100, 130, 4); ctx.fill();
    // allée
    ctx.fillStyle = '#D8CDB8';
    ctx.beginPath(); ctx.moveTo(520, 530); ctx.lineTo(700, 530); ctx.lineTo(860, H); ctx.lineTo(340, H); ctx.fill();
    plant(ctx, 1080, 620, 1.3, rnd);
    plant(ctx, 140, 640, 1.1, rnd);
  },
  bureau(ctx, pal, rnd){
    const hz = 500;
    ctx.fillStyle = grad(ctx, 0, 0, 0, hz, pal.wall[0], pal.wall[1]);
    ctx.fillRect(0, 0, W, hz);
    floorPerspective(ctx, pal, hz);
    window_(ctx, 760, 120, 380, 330);
    // bureau
    ctx.fillStyle = '#8E6B4C'; rr(ctx, 180, 470, 520, 26, 6); ctx.fill();
    ctx.fillStyle = '#6E5238'; ctx.fillRect(210, 496, 18, 170); ctx.fillRect(650, 496, 18, 170);
    // écran + siège
    ctx.fillStyle = '#2F3439'; rr(ctx, 330, 330, 240, 140, 8); ctx.fill();
    ctx.fillStyle = '#4E6E8E'; rr(ctx, 340, 340, 220, 120, 6); ctx.fill();
    ctx.fillStyle = '#2F3439'; ctx.fillRect(440, 470, 20, 20);
    ctx.fillStyle = pal.accent; rr(ctx, 380, 560, 180, 150, 14); ctx.fill();
    frames(ctx, 120, 150, 1, pal, rnd);
    plant(ctx, 1080, 600, .9, rnd);
  },
  entree(ctx, pal, rnd){
    const hz = 520;
    ctx.fillStyle = grad(ctx, 0, 0, 0, hz, pal.wall[0], pal.wall[1]);
    ctx.fillRect(0, 0, W, hz);
    floorPerspective(ctx, pal, hz);
    ctx.fillStyle = '#6B4B31'; rr(ctx, 420, 150, 300, 420, 6); ctx.fill();
    ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.arc(680, 370, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.soft; rr(ctx, 120, 380, 200, 190, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 830, 200, 180, 230, 10); ctx.fill();
    plant(ctx, 1090, 560, .9, rnd);
  },
};

/* ---------- Altérations volontaires ---------- */
function degrade(ctx, kind, rnd){
  if (kind === 'sombre'){
    ctx.fillStyle = 'rgba(8,10,14,.52)'; ctx.fillRect(0, 0, W, H);
  }
  if (kind === 'desordre'){
    for (let i = 0; i < 70; i++){
      ctx.fillStyle = `hsla(${rnd() * 360},45%,${40 + rnd() * 40}%,.75)`;
      const x = rnd() * W, y = 430 + rnd() * (H - 460);
      rr(ctx, x, y, 20 + rnd() * 80, 14 + rnd() * 50, 4); ctx.fill();
    }
  }
  if (kind === 'flou'){
    ctx.filter = 'blur(3.2px)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
  }
  if (kind === 'surexpose'){
    ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.fillRect(0, 0, W, H);
  }
}

/**
 * Dessine une photo de démonstration.
 * @param {string} category  catégorie de pièce
 * @param {object} opts      { palette, defect:'sombre'|'desordre'|'flou'|'surexpose'|null, tilt:number, seed }
 * @returns {Promise<Blob>}
 */
export async function renderDemoPhoto(category, opts = {}){
  const rnd = seeded(`${category}|${opts.seed || 0}`);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const pal = PALETTES[opts.palette] || PALETTES.clair;

  ctx.fillStyle = pal.wall[0]; ctx.fillRect(0, 0, W, H);

  const tilt = opts.tilt || 0;
  if (tilt){
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate((tilt * Math.PI) / 180); ctx.scale(1.12, 1.12);
    ctx.translate(-W / 2, -H / 2);
  }
  (SCENES[category] || SCENES.salon)(ctx, pal, rnd);
  if (tilt) ctx.restore();

  if (opts.defect) degrade(ctx, opts.defect, rnd);
  vignette(ctx, opts.defect === 'sombre' ? 0.45 : 0.26);
  stamp(ctx);

  return new Promise(res => cv.toBlob(b => res(b), 'image/jpeg', 0.86));
}

export const DEMO_CATEGORIES = Object.keys(SCENES);
export const DEMO_PALETTES = Object.keys(PALETTES);
