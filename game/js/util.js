/* =============================================================
   util.js — maths, bruit procédural, générateurs de textures
   ============================================================= */
(function (global) {
  'use strict';

  const U = {};

  /* ------------------------------ maths ------------------------------ */
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (e0, e1, x) => { const t = U.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.deg = Math.PI / 180;
  /* amortissement indépendant du pas de temps */
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  /* rapproche a de b d'au plus `rate * dt` */
  U.approach = (a, b, rate, dt) => {
    const d = b - a, m = rate * dt;
    return Math.abs(d) <= m ? b : a + U.sign(d) * m;
  };
  U.rndRange = (rng, a, b) => a + (b - a) * rng();

  /* PRNG déterministe (mulberry32) : monde identique à chaque partie */
  U.makeRNG = function (seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* --------------------------- bruit de Perlin --------------------------- */
  U.Noise = function (seed) {
    const rng = U.makeRNG(seed);
    const p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const grad2 = (h, x, y) => {
      switch (h & 7) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
        case 4: return x; case 5: return -x; case 6: return y; default: return -y;
      }
    };

    this.n2 = function (x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = fade(xf), v = fade(yf);
      const aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
      const ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      const x1 = U.lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
      const x2 = U.lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
      return U.lerp(x1, x2, v);
    };

    /* somme fractale */
    this.fbm = function (x, y, oct, lac, gain) {
      oct = oct || 4; lac = lac || 2.0; gain = gain || 0.5;
      let a = 1, f = 1, s = 0, n = 0;
      for (let i = 0; i < oct; i++) { s += a * this.n2(x * f, y * f); n += a; a *= gain; f *= lac; }
      return s / n;
    };

    /* bruit « crête » : utile pour les arêtes de montagne */
    this.ridged = function (x, y, oct) {
      let a = 1, f = 1, s = 0, n = 0;
      for (let i = 0; i < (oct || 4); i++) {
        s += a * (1 - Math.abs(this.n2(x * f, y * f)));
        n += a; a *= 0.5; f *= 2.07;
      }
      return s / n;
    };
  };

  /* --------------------------- outils canvas --------------------------- */
  U.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  U.toTexture = function (canvas, repeatX, repeatY, aniso) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX || 1, repeatY || 1);
    t.anisotropy = aniso || 8;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };

  /* bruit blanc/gaussien dessiné dans un canvas, réutilisé partout */
  U.noiseCanvas = function (size, base, amp, seed, mono) {
    const c = U.canvas(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const rng = U.makeRNG(seed || 1);
    for (let i = 0; i < size * size; i++) {
      const n = (rng() + rng() + rng()) / 3;            // ~gaussien
      const v = U.clamp(base + (n - 0.5) * amp, 0, 255);
      const j = i * 4;
      img.data[j] = v;
      img.data[j + 1] = mono ? v : U.clamp(v + (rng() - 0.5) * 6, 0, 255);
      img.data[j + 2] = mono ? v : U.clamp(v + (rng() - 0.5) * 6, 0, 255);
      img.data[j + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  /* carte de normales dérivée de la luminance d'un canvas (Sobel) */
  U.normalFromCanvas = function (src, strength) {
    const s = src.width;
    const sg = src.getContext('2d').getImageData(0, 0, s, s).data;
    const out = U.canvas(s, s), og = out.getContext('2d');
    const img = og.createImageData(s, s);
    const L = (x, y) => {
      const xi = ((x % s) + s) % s, yi = ((y % s) + s) % s;
      const i = (yi * s + xi) * 4;
      return (sg[i] * 0.299 + sg[i + 1] * 0.587 + sg[i + 2] * 0.114) / 255;
    };
    const k = strength === undefined ? 2.0 : strength;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = (L(x + 1, y) - L(x - 1, y)) * k;
        const dy = (L(x, y + 1) - L(x, y - 1)) * k;
        let nx = -dx, ny = -dy, nz = 1;
        const len = Math.hypot(nx, ny, nz);
        nx /= len; ny /= len; nz /= len;
        const i = (y * s + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    og.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  /* ------------------------- textures matières ------------------------- */

  /* Fibre de carbone sergé 2x2, générée pixel par pixel */
  U.carbonCanvas = function (size) {
    size = size || 512;
    const c = U.canvas(size, size), g = c.getContext('2d');
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, size, size);
    const cell = size / 16;          // 16 mèches par côté
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const over = ((x >> 1) + (y >> 1)) % 2 === 0;   // sergé 2x2
        const px = x * cell, py = y * cell;
        const grad = over
          ? g.createLinearGradient(px, py, px + cell, py)
          : g.createLinearGradient(px, py, px, py + cell);
        grad.addColorStop(0, '#0d0d10');
        grad.addColorStop(0.45, '#33353c');
        grad.addColorStop(0.55, '#3a3d45');
        grad.addColorStop(1, '#0b0b0e');
        g.fillStyle = grad;
        g.fillRect(px, py, cell, cell);
        /* micro-fibres */
        g.globalAlpha = 0.16;
        g.strokeStyle = '#8d939c';
        g.lineWidth = 0.6;
        for (let i = 1; i < 6; i++) {
          g.beginPath();
          if (over) { g.moveTo(px, py + (i / 6) * cell); g.lineTo(px + cell, py + (i / 6) * cell); }
          else { g.moveTo(px + (i / 6) * cell, py); g.lineTo(px + (i / 6) * cell, py + cell); }
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    }
    return c;
  };

  /* Bitume : grain fin + gravillons + fissures */
  U.asphaltCanvas = function (size, seed) {
    size = size || 512;
    const c = U.canvas(size, size), g = c.getContext('2d');
    const rng = U.makeRNG(seed || 7);
    g.fillStyle = '#26262a'; g.fillRect(0, 0, size, size);
    const img = g.getImageData(0, 0, size, size);
    for (let i = 0; i < size * size; i++) {
      const n = (rng() + rng() + rng()) / 3 - 0.5;
      const j = i * 4, v = n * 46;
      img.data[j] = U.clamp(img.data[j] + v, 0, 255);
      img.data[j + 1] = U.clamp(img.data[j + 1] + v, 0, 255);
      img.data[j + 2] = U.clamp(img.data[j + 2] + v * 1.05, 0, 255);
    }
    g.putImageData(img, 0, 0);
    /* gravillons */
    for (let i = 0; i < size * 3; i++) {
      const x = rng() * size, y = rng() * size, r = 0.6 + rng() * 2.1;
      const l = 30 + rng() * 60;
      g.fillStyle = 'rgba(' + l + ',' + l + ',' + (l + 4) + ',' + (0.25 + rng() * 0.5) + ')';
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    /* traces de pneus / réparations */
    g.globalAlpha = 0.10;
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = rng() > 0.5 ? '#000' : '#4a4a50';
      g.lineWidth = 1 + rng() * 3;
      g.beginPath();
      let x = rng() * size, y = rng() * size;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  };

  /* Façade d'immeuble : étages, fenêtres, éclairage nocturne aléatoire */
  U.buildingCanvas = function (seed, lit) {
    const w = 256, h = 512;
    const c = U.canvas(w, h), g = c.getContext('2d');
    const rng = U.makeRNG(seed);
    const tone = 26 + rng() * 46;
    g.fillStyle = 'rgb(' + tone + ',' + (tone + 2) + ',' + (tone + 6) + ')';
    g.fillRect(0, 0, w, h);

    const cols = 4 + ((rng() * 4) | 0);
    const rows = 16;
    const mx = w * 0.07, my = h * 0.012;
    const cw = (w - mx * 2) / cols, ch = (h - my * 2) / rows;

    for (let r = 0; r < rows; r++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = mx + cx * cw + cw * 0.13;
        const y = my + r * ch + ch * 0.16;
        const ww = cw * 0.74, wh = ch * 0.62;
        if (lit) {
          const on = rng() < 0.34;
          if (on) {
            const warm = rng();
            const cr = 255, cg = 200 + warm * 40, cb = 120 + warm * 90;
            g.fillStyle = 'rgb(' + cr + ',' + (cg | 0) + ',' + (cb | 0) + ')';
          } else {
            g.fillStyle = 'rgb(10,11,14)';
          }
        } else {
          const refl = 40 + rng() * 60;
          g.fillStyle = 'rgb(' + (refl * 0.7 | 0) + ',' + (refl * 0.85 | 0) + ',' + (refl | 0) + ')';
        }
        g.fillRect(x, y, ww, wh);
        /* meneau */
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(x + ww / 2 - 0.7, y, 1.4, wh);
      }
      /* nez de dalle */
      g.fillStyle = 'rgba(0,0,0,.30)';
      g.fillRect(0, my + r * ch + ch * 0.84, w, ch * 0.14);
    }
    return c;
  };

  /* Flanc de pneu : sculpture + lettrage */
  U.tyreCanvas = function () {
    const s = 256;
    const c = U.canvas(s, s), g = c.getContext('2d');
    g.fillStyle = '#101012'; g.fillRect(0, 0, s, s);
    /* rainures circonférentielles (l'axe X = circonférence) */
    for (let i = 0; i < s; i += 8) {
      g.fillStyle = i % 16 === 0 ? '#161619' : '#0b0b0d';
      g.fillRect(0, i, s, 4);
    }
    for (let i = 0; i < 46; i++) {
      g.fillStyle = 'rgba(0,0,0,.65)';
      g.fillRect(i * (s / 46), 0, 3.4, s);
    }
    g.globalAlpha = .55;
    g.fillStyle = '#3a3a40';
    g.font = 'bold 15px sans-serif';
    for (let i = 0; i < 4; i++) g.fillText('P ZERO CORSA', 12 + i * 64, s * 0.5);
    g.globalAlpha = 1;
    return c;
  };

  /* Sellerie matelassée à motif hexagonal (sièges, contre-portes) */
  U.quiltCanvas = function (r, g, b) {
    const s = 256;
    const c = U.canvas(s, s), x = c.getContext('2d');
    x.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    x.fillRect(0, 0, s, s);
    const hex = (cx, cy, rad) => {
      x.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + Math.PI / 6;
        const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
    };
    const rad = s / 8, dx = rad * Math.sqrt(3), dy = rad * 1.5;
    for (let row = -1; row * dy < s + rad; row++) {
      for (let col = -1; col * dx < s + dx; col++) {
        const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
        const grd = x.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
        grd.addColorStop(0, 'rgba(255,255,255,.13)');
        grd.addColorStop(0.72, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,.34)');
        hex(cx, cy, rad * 0.97); x.fillStyle = grd; x.fill();
        hex(cx, cy, rad * 0.97);
        x.strokeStyle = 'rgba(228,206,150,.55)'; x.lineWidth = 1.2;
        x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]);
      }
    }
    return c;
  };

  /* Marquage routier appliqué sur le ruban : ligne axiale + rives */
  U.roadCanvas = function (lanes, dashed, seed) {
    const w = 256, h = 512;
    const c = U.canvas(w, h), g = c.getContext('2d');
    const asph = U.asphaltCanvas(256, seed || 3);
    g.drawImage(asph, 0, 0, w, h);
    /* rives */
    g.fillStyle = 'rgba(232,232,228,.80)';
    g.fillRect(w * 0.055, 0, w * 0.014, h);
    g.fillRect(w * 0.931, 0, w * 0.014, h);
    /* axe */
    if (lanes >= 2) {
      if (dashed) {
        g.fillStyle = 'rgba(236,236,230,.86)';
        for (let y = 0; y < h; y += 84) g.fillRect(w * 0.492, y, w * 0.016, 46);
      } else {
        g.fillStyle = 'rgba(236,214,120,.86)';
        g.fillRect(w * 0.478, 0, w * 0.013, h);
        g.fillRect(w * 0.508, 0, w * 0.013, h);
      }
    }
    /* usure sur les traces de roues */
    g.globalAlpha = .12; g.fillStyle = '#000';
    g.fillRect(w * 0.20, 0, w * 0.13, h);
    g.fillRect(w * 0.67, 0, w * 0.13, h);
    g.globalAlpha = 1;
    return c;
  };

  /* dégradé radial doux : halos, traînées, phares, particules */
  U.glowCanvas = function (size, r, gg, b, hard) {
    size = size || 128;
    const c = U.canvas(size, size), ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const col = (a) => 'rgba(' + r + ',' + gg + ',' + b + ',' + a + ')';
    grd.addColorStop(0, col(1));
    grd.addColorStop(hard ? 0.28 : 0.13, col(hard ? 0.85 : 0.55));
    grd.addColorStop(0.55, col(0.16));
    grd.addColorStop(1, col(0));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);
    return c;
  };

  /* nuage doux, utilisé pour fumée / poussière */
  U.smokeCanvas = function () {
    const s = 128;
    const c = U.canvas(s, s), g = c.getContext('2d');
    const rng = U.makeRNG(99);
    for (let i = 0; i < 26; i++) {
      const x = s / 2 + (rng() - 0.5) * s * 0.42;
      const y = s / 2 + (rng() - 0.5) * s * 0.42;
      const r = s * (0.09 + rng() * 0.2);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,.17)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    return c;
  };

  /* ----------------------- géométrie : loft de sections -----------------------
     sections : [{ z, pts:[[x,y],…] }] — toutes les sections ont le même nombre
     de points ; on relie les anneaux pour obtenir une carrosserie lisse.        */
  U.loft = function (sections, capFront, capBack) {
    const n = sections[0].pts.length;
    const rings = sections.length;
    const pos = [];
    const idx = [];
    for (let s = 0; s < rings; s++) {
      const sec = sections[s];
      for (let i = 0; i < n; i++) pos.push(sec.pts[i][0], sec.pts[i][1], sec.z);
    }
    for (let s = 0; s < rings - 1; s++) {
      for (let i = 0; i < n; i++) {
        const a = s * n + i;
        const b = s * n + ((i + 1) % n);
        const c = (s + 1) * n + i;
        const d = (s + 1) * n + ((i + 1) % n);
        idx.push(a, c, b, b, c, d);
      }
    }
    /* bouchons par ventilateur central */
    const addCap = (ringIndex, flip) => {
      const base = ringIndex * n;
      let cx = 0, cy = 0;
      for (let i = 0; i < n; i++) { cx += sections[ringIndex].pts[i][0]; cy += sections[ringIndex].pts[i][1]; }
      cx /= n; cy /= n;
      const ci = pos.length / 3;
      pos.push(cx, cy, sections[ringIndex].z);
      for (let i = 0; i < n; i++) {
        const a = base + i, b = base + ((i + 1) % n);
        if (flip) idx.push(ci, b, a); else idx.push(ci, a, b);
      }
    };
    if (capFront) addCap(0, false);
    if (capBack) addCap(rings - 1, true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };

  /* ------------------------------------------------------------------
     Normales par groupes de lissage.

     computeVertexNormals moyenne les normales de toutes les faces qui
     partagent un sommet : une arête vive est donc systématiquement
     arrondie par l'ombrage, et la carrosserie paraît molle quelle que
     soit sa géométrie. Ici on ne moyenne que les faces dont les normales
     sont proches — au-delà de l'angle limite, l'arête reste franche.
     ------------------------------------------------------------------ */
  U.smoothNormals = function (geo, angleDeg) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position.array;
    const vCount = pos.length / 3;
    const fCount = vCount / 3;
    const fn = new Float32Array(fCount * 3);

    const ax = new THREE.Vector3(), bx = new THREE.Vector3(), cx = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (let f = 0; f < fCount; f++) {
      const i = f * 9;
      ax.set(pos[i], pos[i + 1], pos[i + 2]);
      bx.set(pos[i + 3], pos[i + 4], pos[i + 5]);
      cx.set(pos[i + 6], pos[i + 7], pos[i + 8]);
      e1.subVectors(bx, ax); e2.subVectors(cx, ax);
      nrm.crossVectors(e1, e2).normalize();
      fn[f * 3] = nrm.x; fn[f * 3 + 1] = nrm.y; fn[f * 3 + 2] = nrm.z;
    }

    /* faces partageant chaque position */
    const map = new Map();
    const key = (i) => (Math.round(pos[i] * 8192) + '_' +
      Math.round(pos[i + 1] * 8192) + '_' + Math.round(pos[i + 2] * 8192));
    for (let v = 0; v < vCount; v++) {
      const k = key(v * 3);
      let list = map.get(k);
      if (!list) { list = []; map.set(k, list); }
      list.push((v / 3) | 0);
    }

    const lim = Math.cos((angleDeg === undefined ? 40 : angleDeg) * Math.PI / 180);
    const out = new Float32Array(vCount * 3);
    for (let v = 0; v < vCount; v++) {
      const f = (v / 3) | 0;
      const nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2];
      let sx = 0, sy = 0, sz = 0;
      const list = map.get(key(v * 3));
      for (let k = 0; k < list.length; k++) {
        const o = list[k] * 3;
        if (fn[o] * nx + fn[o + 1] * ny + fn[o + 2] * nz >= lim) {
          sx += fn[o]; sy += fn[o + 1]; sz += fn[o + 2];
        }
      }
      const len = Math.hypot(sx, sy, sz) || 1;
      out[v * 3] = sx / len; out[v * 3 + 1] = sy / len; out[v * 3 + 2] = sz / len;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return g;
  };

  /* profil arrondi type « superellipse » utilisé pour les sections de carrosserie */
  U.roundedSection = function (halfW, top, bottom, n, sharpness, shoulder) {
    const pts = [];
    const p = sharpness || 2.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / p);
      const sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / p);
      const yr = sy >= 0 ? top : bottom;
      let x = sx * halfW;
      /* épaulement : la voiture est plus large à mi-hauteur */
      if (shoulder) x *= 1 + shoulder * (1 - Math.abs(sy)) * 0.5;
      pts.push([x, sy * yr]);
    }
    return pts;
  };

  global.U = U;
})(window);
