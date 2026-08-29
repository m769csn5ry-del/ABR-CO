/* =============================================================
   world.js — monde ouvert procédural (≈ 4 km × 4 km)

   · relief fractal (plaine centrale, collines, montagnes en bordure)
   · réseau routier tracé par splines : rocade, ligne droite de
     vitesse maxi, damier urbain, col de montagne avec épingles
   · ville, garde-corps, lampadaires, arbres, tunnel
   · requêtes de terrain analytiques (pas de raycast de maillage)
   ============================================================= */
(function (global) {
  'use strict';

  const V3 = THREE.Vector3;
  const SIZE = 4096;          /* côté du monde */
  const HALF = SIZE / 2;

  /* ------------------------------------------------------------------
     Outils splines
     ------------------------------------------------------------------ */
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  /* rééchantillonne une polyligne de contrôle tous les `step` mètres */
  function resample(ctrl, step, closed) {
    const pts = [];
    const n = ctrl.length;
    const get = (i) => {
      if (closed) return ctrl[((i % n) + n) % n];
      return ctrl[U.clamp(i, 0, n - 1)];
    };
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const approx = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const div = Math.max(2, Math.ceil(approx / step));
      for (let k = 0; k < div; k++) {
        const t = k / div;
        pts.push([catmull(p0[0], p1[0], p2[0], p3[0], t),
        catmull(p0[1], p1[1], p2[1], p3[1], t)]);
      }
    }
    if (!closed) pts.push([ctrl[n - 1][0], ctrl[n - 1][1]]);
    return pts;
  }

  /* ------------------------------------------------------------------
     Monde
     ------------------------------------------------------------------ */
  function World(scene, opts) {
    opts = opts || {};
    this.scene = scene;
    this.quality = opts.quality || 'high';
    this.noise = new U.Noise(20240815);
    this.rng = U.makeRNG(97531);
    this.roads = [];
    this.colliders = [];
    this.tunnels = [];
    this.lampLights = [];
    this.time = 0.32;          /* 0 = minuit, 0.5 = midi */

    this._buildRoads();
    this._buildSpatialIndex();
    this._buildTerrain();
    this._buildRoadMeshes();
    this._buildCity();
    this._buildProps();
    this._buildTunnel();
    this._buildBridges();
    this._buildAmenities();
    this._buildSky();
  }

  /* ---------------------- relief de base ---------------------- */
  World.prototype.baseHeight = function (x, z) {
    const n = this.noise;
    const r = Math.hypot(x, z) / HALF;
    let h = n.fbm(x * 0.00052, z * 0.00052, 5) * 30;
    /* massif en périphérie */
    const m = Math.pow(U.smoothstep(0.42, 1.05, r), 1.5);
    h += n.ridged(x * 0.00135 + 31, z * 0.00135 - 17, 5) * m * 210;
    /* micro-relief */
    h += n.fbm(x * 0.0062, z * 0.0062, 3) * 1.9;
    /* cuvette urbaine plane */
    const dCity = Math.hypot(x + 120, z + 60);
    h = U.lerp(3.0, h, U.smoothstep(430, 1050, dCity));
    return h;
  };

  /* ---------------------- tracés routiers ---------------------- */
  World.prototype._buildRoads = function () {
    const R = [];

    /* 1. Rocade : grand anneau autour de la ville, avec une très longue
          ligne droite au sud pour la vitesse de pointe */
    const ring = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      let rad = 980 + Math.sin(a * 3) * 90 + Math.cos(a * 2.3) * 60;
      /* aplatissement au sud -> ligne droite */
      if (a > 3.5 && a < 5.6) rad = 1080;
      ring.push([Math.cos(a) * rad - 120, Math.sin(a) * rad - 60]);
    }
    R.push({ name: 'Rocade', ctrl: ring, width: 14.5, closed: true, lanes: 2, dashed: true });

    /* 2. Ligne droite de 2,4 km (aéroport désaffecté) */
    R.push({
      name: 'Ligne droite', width: 18, closed: false, lanes: 2, dashed: true,
      ctrl: [[-1500, 700], [-900, 720], [-200, 735], [500, 745], [1150, 740], [1500, 730]]
    });

    /* 3. Damier urbain */
    for (let i = -2; i <= 2; i++) {
      R.push({
        name: 'Avenue ' + (i + 3), width: 12, closed: false, lanes: 2, dashed: true, urban: true,
        ctrl: [[-120 + i * 190, -430], [-120 + i * 190, -140],
        [-120 + i * 190, 140], [-120 + i * 190, 430]]
      });
      R.push({
        name: 'Rue ' + (i + 3), width: 11, closed: false, lanes: 2, dashed: true, urban: true,
        ctrl: [[-500, -60 + i * 175], [-240, -60 + i * 175],
        [120, -60 + i * 175], [400, -60 + i * 175]]
      });
    }

    /* 4. Col de montagne : longue montée avec épingles */
    const pass = [[-980, -420]];
    let px = -1120, pz = -560;
    for (let i = 0; i < 13; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      px += -95 - this.rng() * 60;
      pz += -105 - this.rng() * 55;
      pass.push([px + dir * 190, pz - 40]);
      pass.push([px - dir * 150, pz - 135]);
    }
    R.push({ name: 'Col', ctrl: pass, width: 9.5, closed: false, lanes: 2, dashed: false });

    /* 5. Bretelles ville <-> rocade */
    R.push({
      name: 'Bretelle nord', width: 12, closed: false, lanes: 2, dashed: true,
      ctrl: [[-120, 430], [-140, 560], [-150, 700], [-130, 830]]
    });
    R.push({
      name: 'Bretelle sud', width: 12, closed: false, lanes: 2, dashed: true,
      ctrl: [[-120, -430], [-110, -580], [-120, -740], [-140, -900]]
    });
    R.push({
      name: 'Bretelle ouest', width: 12, closed: false, lanes: 2, dashed: true,
      ctrl: [[-500, -60], [-680, -80], [-860, -120], [-1010, -190]]
    });
    R.push({
      name: 'Bretelle est', width: 12, closed: false, lanes: 2, dashed: true,
      ctrl: [[400, -60], [600, -40], [780, 10], [900, 90]]
    });

    /* ------ rééchantillonnage + altitudes lissées ------ */
    const self = this;
    R.forEach(function (road) {
      const pts = resample(road.ctrl, 5, road.closed);
      /* altitude brute */
      const ys = pts.map(function (p) { return self.baseHeight(p[0], p[1]); });
      /* lissage fort : une route ne suit pas le bruit du terrain */
      const smooth = ys.slice();
      for (let pass2 = 0; pass2 < 26; pass2++) {
        for (let i = 0; i < ys.length; i++) {
          const a = smooth[(i - 1 + ys.length) % ys.length];
          const b = smooth[(i + 1) % ys.length];
          if (!road.closed && (i === 0 || i === ys.length - 1)) continue;
          smooth[i] = (a + b) * 0.5 * 0.72 + smooth[i] * 0.28;
        }
      }
      /* limitation de pente à 16 % */
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < smooth.length; i++) {
          const dx = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          const dy = smooth[i] - smooth[i - 1];
          const max = dx * 0.16;
          if (dy > max) smooth[i] = smooth[i - 1] + max;
          else if (dy < -max) smooth[i] = smooth[i - 1] - max;
        }
      }
      road.pts = pts;
      road.ys = smooth;
      self.roads.push(road);
    });
  };

  /* ---------------------- index spatial des segments ---------------------- */
  World.prototype._buildSpatialIndex = function () {
    const CELL = 48;
    this.cell = CELL;
    this.gridN = Math.ceil(SIZE / CELL);
    this.grid = new Array(this.gridN * this.gridN);
    const self = this;
    const put = (ix, iz, item) => {
      if (ix < 0 || iz < 0 || ix >= self.gridN || iz >= self.gridN) return;
      const k = iz * self.gridN + ix;
      if (!self.grid[k]) self.grid[k] = [];
      self.grid[k].push(item);
    };
    this.roads.forEach(function (road, ri) {
      const n = road.pts.length;
      const last = road.closed ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const a = road.pts[i], b = road.pts[(i + 1) % n];
        const infl = road.width * 0.5 + 22;
        const minx = Math.min(a[0], b[0]) - infl, maxx = Math.max(a[0], b[0]) + infl;
        const minz = Math.min(a[1], b[1]) - infl, maxz = Math.max(a[1], b[1]) + infl;
        const i0 = Math.floor((minx + HALF) / CELL), i1 = Math.floor((maxx + HALF) / CELL);
        const j0 = Math.floor((minz + HALF) / CELL), j1 = Math.floor((maxz + HALF) / CELL);
        for (let j = j0; j <= j1; j++) for (let i2 = i0; i2 <= i1; i2++) put(i2, j, { r: ri, i: i });
      }
    });

    /* grille des obstacles */
    this.colGrid = new Array(this.gridN * this.gridN);
    this._putCollider = function (c) {
      const idx = self.colliders.push(c) - 1;
      const rr = c.r !== undefined ? c.r : Math.hypot(c.hx, c.hz);
      const i0 = Math.floor((c.x - rr + HALF) / CELL), i1 = Math.floor((c.x + rr + HALF) / CELL);
      const j0 = Math.floor((c.z - rr + HALF) / CELL), j1 = Math.floor((c.z + rr + HALF) / CELL);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          if (i < 0 || j < 0 || i >= self.gridN || j >= self.gridN) continue;
          const k = j * self.gridN + i;
          if (!self.colGrid[k]) self.colGrid[k] = [];
          self.colGrid[k].push(idx);
        }
      }
    };
  };

  /* ---------------------- requête route la plus proche ---------------------- */
  World.prototype.nearestRoad = function (x, z) {
    const CELL = this.cell;
    const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
    if (i < 0 || j < 0 || i >= this.gridN || j >= this.gridN) return null;
    const list = this.grid[j * this.gridN + i];
    if (!list) return null;
    let best = null, bd = 1e9;
    for (let k = 0; k < list.length; k++) {
      const road = this.roads[list[k].r];
      const n = road.pts.length;
      const ia = list[k].i, ib = (ia + 1) % n;
      const ax = road.pts[ia][0], az = road.pts[ia][1];
      const bx = road.pts[ib][0], bz = road.pts[ib][1];
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz;
      let t = len2 > 0 ? ((x - ax) * dx + (z - az) * dz) / len2 : 0;
      t = U.clamp(t, 0, 1);
      const cx = ax + dx * t, cz = az + dz * t;
      const d = Math.hypot(x - cx, z - cz);
      if (d < bd) {
        bd = d;
        best = { dist: d, y: U.lerp(road.ys[ia], road.ys[ib], t), road: road, t: t, i: ia };
      }
    }
    return best;
  };

  /* ---------------------- altitude & surface ---------------------- */
  World.prototype.heightAt = function (x, z) {
    const base = this.baseHeight(x, z);
    const nr = this.nearestRoad(x, z);
    if (!nr) return base;
    const hw = nr.road.width * 0.5;
    if (nr.dist <= hw) return nr.y;
    /* accotement puis raccordement au terrain */
    const k = U.smoothstep(hw, hw + 15, nr.dist);
    return U.lerp(nr.y, base, k * k * (3 - 2 * k));
  };

  World.prototype.surfaceAt = function (x, z, nr) {
    nr = nr || this.nearestRoad(x, z);
    if (nr) {
      const hw = nr.road.width * 0.5;
      if (nr.dist <= hw - 0.15) return 'asphalt';
      if (nr.dist <= hw + 0.75) return 'kerb';
      if (nr.dist <= hw + 3.5) return 'dirt';
    }
    const n = this.noise.fbm(x * 0.004, z * 0.004, 2);
    return n > 0.28 ? 'dirt' : 'grass';
  };

  const _s = { y: 0, nx: 0, ny: 1, nz: 0, surface: 'asphalt' };
  World.prototype.sample = function (x, z) {
    const h = this.heightAt(x, z);
    const d = 0.7;
    const hx = this.heightAt(x + d, z) - this.heightAt(x - d, z);
    const hz = this.heightAt(x, z + d) - this.heightAt(x, z - d);
    let nx = -hx, ny = 2 * d, nz = -hz;
    const l = Math.hypot(nx, ny, nz) || 1;
    _s.y = h; _s.nx = nx / l; _s.ny = ny / l; _s.nz = nz / l;
    _s.surface = this.surfaceAt(x, z);
    return _s;
  };

  /* ---------------------- collisions ---------------------- */
  const _hit = { nx: 0, ny: 0, nz: 0, depth: 0 };
  World.prototype.collide = function (p, radius) {
    const CELL = this.cell;
    const i = Math.floor((p.x + HALF) / CELL), j = Math.floor((p.z + HALF) / CELL);
    if (i < 0 || j < 0 || i >= this.gridN || j >= this.gridN) return null;
    const list = this.colGrid[j * this.gridN + i];
    if (!list) return null;
    let found = null, bestDepth = 0;
    for (let k = 0; k < list.length; k++) {
      const c = this.colliders[list[k]];
      if (p.y > c.y + c.hy + radius || p.y < c.y - c.hy - radius) continue;
      let nx, nz, depth;
      if (c.r !== undefined) {                       /* cylindre */
        const dx = p.x - c.x, dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        depth = c.r + radius - d;
        if (depth <= 0) continue;
        nx = d > 1e-4 ? dx / d : 1; nz = d > 1e-4 ? dz / d : 0;
      } else {                                        /* boîte alignée */
        const dx = p.x - c.x, dz = p.z - c.z;
        const px = c.hx + radius - Math.abs(dx);
        const pz = c.hz + radius - Math.abs(dz);
        if (px <= 0 || pz <= 0) continue;
        if (px < pz) { depth = px; nx = U.sign(dx) || 1; nz = 0; }
        else { depth = pz; nx = 0; nz = U.sign(dz) || 1; }
      }
      if (depth > bestDepth) {
        bestDepth = depth;
        _hit.nx = nx; _hit.ny = 0; _hit.nz = nz; _hit.depth = depth;
        found = _hit;
      }
    }
    return found;
  };


  /* distance à la voie la plus proche en excluant une route donnée */
  World.prototype.otherRoadNear = function (x, z, exceptIndex, radius) {
    const CELL = this.cell;
    const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
    if (i < 0 || j < 0 || i >= this.gridN || j >= this.gridN) return false;
    const list = this.grid[j * this.gridN + i];
    if (!list) return false;
    for (let k = 0; k < list.length; k++) {
      if (list[k].r === exceptIndex) continue;
      const road = this.roads[list[k].r];
      const n = road.pts.length;
      const ia = list[k].i, ib = (ia + 1) % n;
      const ax = road.pts[ia][0], az = road.pts[ia][1];
      const dx = road.pts[ib][0] - ax, dz = road.pts[ib][1] - az;
      const len2 = dx * dx + dz * dz;
      let t = len2 > 0 ? ((x - ax) * dx + (z - az) * dz) / len2 : 0;
      t = U.clamp(t, 0, 1);
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < radius + road.width * 0.5) return true;
    }
    return false;
  };

  /* ---------------------- maillage du terrain ---------------------- */
  World.prototype._buildTerrain = function () {
    const N = this.quality === 'low' ? 230 : this.quality === 'medium' ? 340 : 470;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cGrass = new THREE.Color(0x3f4a2a);
    const cDry = new THREE.Color(0x6b6238);
    const cRock = new THREE.Color(0x4a4741);
    const cSnow = new THREE.Color(0xdfe3e8);
    const cDirt = new THREE.Color(0x5b4c37);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = this.heightAt(x, z);
      pos.setY(i, y);
      /* pente approchée pour choisir la matière */
      const s = Math.abs(this.heightAt(x + 6, z) - y) + Math.abs(this.heightAt(x, z + 6) - y);
      const slope = U.clamp(s / 6, 0, 1);
      const n2 = this.noise.fbm(x * 0.0033, z * 0.0033, 3);
      tmp.copy(cGrass).lerp(cDry, U.clamp(n2 * 1.6 + 0.4, 0, 1));
      tmp.lerp(cDirt, U.smoothstep(0.18, 0.42, slope) * 0.7);
      tmp.lerp(cRock, U.smoothstep(0.35, 0.8, slope));
      tmp.lerp(cSnow, U.smoothstep(150, 240, y) * (1 - slope * 0.5));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const detail = U.toTexture(U.noiseCanvas(256, 128, 100, 5, true), 380, 380, 4);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, map: detail, roughness: 0.97, metalness: 0.0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.terrain = mesh;

    /* mer lointaine pour masquer le bord du monde */
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE * 6, SIZE * 6),
      new THREE.MeshStandardMaterial({ color: 0x1d2a35, roughness: 0.12, metalness: 0.6 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -26;
    this.scene.add(sea);
  };

  /* ---------------------- rubans de chaussée ---------------------- */
  World.prototype._buildRoadMeshes = function () {
    const texCache = {};
    const self = this;
    this.roads.forEach(function (road, roadIndex) {
      const key = road.lanes + '_' + (road.dashed ? 'd' : 's');
      if (!texCache[key]) {
        const t = U.toTexture(U.roadCanvas(road.lanes, road.dashed, 3), 1, 1, 16);
        texCache[key] = t;
      }
      const tex = texCache[key].clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

      const pts = road.pts, ys = road.ys, n = pts.length;
      const last = road.closed ? n : n - 1;
      const pos = [], uv = [], idx = [], nor = [];
      let dist = 0;
      const hw = road.width * 0.5;
      for (let i = 0; i <= last; i++) {
        const ci = i % n;
        const pi = (i - 1 + n) % n, ni = (i + 1) % n;
        const a = pts[pi], b = pts[ni], c = pts[ci];
        let dx = b[0] - a[0], dz = b[1] - a[1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        /* normale horizontale */
        const rx = -dz, rz = dx;
        const y = ys[ci];
        /* dévers léger dans les courbes */
        for (let s = -1; s <= 1; s += 2) {
          pos.push(c[0] + rx * hw * s, y + 0.05, c[1] + rz * hw * s);
          nor.push(0, 1, 0);
          uv.push(s < 0 ? 0 : 1, dist / 16);
        }
        if (i > 0) {
          const px = pts[(i - 1 + n) % n];
          dist += Math.hypot(c[0] - px[0], c[1] - px[1]);
        }
      }
      for (let i = 0; i < last; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);       /* face tournée vers le ciel */
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.86, metalness: 0.02, polygonOffset: true,
        polygonOffsetFactor: -2, polygonOffsetUnits: -2
      }));
      m.receiveShadow = true;
      self.scene.add(m);

      /* Accotement : trottoir bétonné en ville, terre battue ailleurs */
      const urban = !!road.urban;
      const outW = urban ? 5.2 : 3.6;
      const outY = urban ? 0.16 : -0.32;
      /* Aux carrefours, le trottoir d'une rue barrerait la chaussée de
         l'autre : on le supprime là où une autre voie passe à proximité. */
      const skip = new Array(n).fill(false);
      if (urban) {
        for (let i = 0; i < n; i++) {
          if (self.otherRoadNear(pts[i][0], pts[i][1], roadIndex, hw + outW + 4)) skip[i] = true;
        }
      }
      const pos2 = [], idx2 = [];
      for (let i = 0; i <= last; i++) {
        const ci = i % n;
        const pi = (i - 1 + n) % n, ni = (i + 1) % n;
        let dx = pts[ni][0] - pts[pi][0], dz = pts[ni][1] - pts[pi][1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const rx = -dz, rz = dx;
        const c = pts[ci], y = ys[ci];
        pos2.push(c[0] + rx * (hw + outW), y + outY, c[1] + rz * (hw + outW));
        pos2.push(c[0] + rx * hw, y + 0.045, c[1] + rz * hw);
        pos2.push(c[0] - rx * hw, y + 0.045, c[1] - rz * hw);
        pos2.push(c[0] - rx * (hw + outW), y + outY, c[1] - rz * (hw + outW));
      }
      for (let i = 0; i < last; i++) {
        if (skip[i % n] || skip[(i + 1) % n]) continue;
        const a = i * 4, b = ((i + 1) % (last + 1)) * 4;
        idx2.push(a, b, a + 1, a + 1, b, b + 1);
        idx2.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);
      }
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
      g2.setIndex(idx2);
      g2.computeVertexNormals();
      const m2 = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({
        color: urban ? 0x8e8d88 : 0x4d4436, roughness: urban ? 0.9 : 1,
        side: THREE.DoubleSide }));
      m2.receiveShadow = true;
      self.scene.add(m2);
    });
  };

  /* ------------- fusion d'instances en un seul maillage ------------- */
  function mergeGeo(list, base) {
    base = base || new THREE.BoxGeometry(1, 1, 1);
    const VN = base.attributes.position.count;
    /* certaines géométries de three (icosaèdre, cône ouvert…) ne sont pas
       indexées : on fabrique alors un index séquentiel */
    const baseIdx = base.index ? base.index.array : null;
    const IN = baseIdx ? base.index.count : VN;
    const vc = VN * list.length, ic = IN * list.length;
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
    const idx = new Uint32Array(ic);
    const bp = base.attributes.position.array, bn = base.attributes.normal.array,
      bu = base.attributes.uv ? base.attributes.uv.array : new Float32Array(VN * 2);
    const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new V3();
    let vo = 0, io = 0;
    list.forEach(function (b) {
      m.compose(new V3(b.x, b.y, b.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rx || 0, b.ry || 0, b.rz || 0)),
        new V3(b.sx, b.sy, b.sz));
      nm.getNormalMatrix(m);
      for (let i = 0; i < VN; i++) {
        v.set(bp[i * 3], bp[i * 3 + 1], bp[i * 3 + 2]).applyMatrix4(m);
        pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
        v.set(bn[i * 3], bn[i * 3 + 1], bn[i * 3 + 2]).applyMatrix3(nm).normalize();
        nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
        uv[(vo + i) * 2] = bu[i * 2] * (b.ur || 1);
        uv[(vo + i) * 2 + 1] = bu[i * 2 + 1] * (b.vr || 1);
      }
      for (let i = 0; i < IN; i++) idx[io + i] = (baseIdx ? baseIdx[i] : i) + vo;
      vo += VN; io += IN;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
  }

  /* ---------------------- ville ---------------------- */
  World.prototype._buildCity = function () {
    const rng = U.makeRNG(555);
    const groups = [];
    const NM = 7;
    for (let i = 0; i < NM; i++) {
      const day = U.toTexture(U.buildingCanvas(100 + i, false), 1, 1, 8);
      const night = U.toTexture(U.buildingCanvas(100 + i, true), 1, 1, 8);
      groups.push({
        list: [],
        matDay: new THREE.MeshStandardMaterial({ map: day, roughness: 0.72, metalness: 0.25 }),
        matNight: new THREE.MeshStandardMaterial({
          map: night, emissiveMap: night, emissive: 0xffffff,
          emissiveIntensity: 0.0, roughness: 0.72, metalness: 0.25
        })
      });
    }

    const self = this;
    let placed = 0;
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        /* Le damier des rues est en -120 + i*190 : caler les centres
           d'îlots sur les mêmes valeurs les plaçait EN PLEINE CHAUSSÉE,
           et presque tous les immeubles étaient rejetés. Décalage d'un
           demi-îlot pour viser le cœur des blocs. */
        const bx = -120 + (gx + 0.5) * 190, bz = -60 + (gz + 0.5) * 175;
        const count = 7 + ((rng() * 5) | 0);
        for (let k = 0; k < count; k++) {
          const ox = (rng() - 0.5) * 118;
          const oz = (rng() - 0.5) * 104;
          const x = bx + ox, z = bz + oz;
          const nr = self.nearestRoad(x, z);
          const w = 14 + rng() * 24, d = 14 + rng() * 22;
          const clearance = Math.max(w, d) * 0.5 + 3.5;
          /* nearestRoad rend null hors de la zone d'influence : c'est
             justement un emplacement libre, il ne faut pas le rejeter */
          if (nr && nr.dist < nr.road.width * 0.5 + clearance) continue;
          const h = 14 + Math.pow(rng(), 1.8) * 96;
          const y = self.heightAt(x, z);
          const gi = (rng() * NM) | 0;

          /* Une tour n'est pas un parallélépipède : elle se rétrécit par
             paliers. Deux ou trois volumes empilés suffisent à donner une
             silhouette, et le rendu reste un seul maillage fusionné. */
          const tiers = h > 55 ? 3 : (h > 30 ? 2 : 1);
          let bottom = y, remain = h, tw = w, td = d;
          for (let t = 0; t < tiers; t++) {
            const frac = t === tiers - 1 ? 1 : (0.42 + rng() * 0.22);
            const th = remain * frac;
            groups[gi].list.push({
              x: x, y: bottom + th / 2, z: z, sx: tw, sy: th, sz: td,
              ur: Math.max(1, Math.round(tw / 9)), vr: Math.max(1, Math.round(th / 9))
            });
            if (t === 0) {
              self._putCollider({ x: x, y: y + h / 2, z: z, hx: tw / 2, hy: h / 2, hz: td / 2 });
            }
            /* corniche entre deux paliers */
            if (t < tiers - 1) {
              groups[gi].list.push({
                x: x, y: bottom + th + 0.5, z: z,
                sx: tw + 1.4, sy: 1.0, sz: td + 1.4, ur: 1, vr: 1
              });
            }
            bottom += th; remain -= th;
            tw *= 0.74 + rng() * 0.14; td *= 0.74 + rng() * 0.14;
          }
          placed++;
          /* superstructures de toiture */
          const roofBits = 1 + ((rng() * 3) | 0);
          for (let k = 0; k < roofBits; k++) {
            groups[gi].list.push({
              x: x + (rng() - 0.5) * tw * 1.1, y: y + h + 1.6 + rng() * 2,
              z: z + (rng() - 0.5) * td * 1.1,
              sx: 2 + rng() * 5, sy: 3 + rng() * 4, sz: 2 + rng() * 5, ur: 1, vr: 1
            });
          }
          /* mât d'antenne sur les plus hautes */
          if (h > 70 && rng() > 0.4) {
            groups[gi].list.push({
              x: x, y: y + h + 9, z: z, sx: 0.5, sy: 18, sz: 0.5, ur: 1, vr: 1
            });
          }
        }
      }
    }
    /* Dalle de sol par îlot : sans elle les immeubles poussent sur une
       pelouse, ce qui ruine la lecture de la ville. */
    const pads = [];
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        const bx = -120 + (gx + 0.5) * 190, bz = -60 + (gz + 0.5) * 175;
        const by = self.heightAt(bx, bz);
        pads.push({ x: bx, y: by + 0.06, z: bz, sx: 177, sy: 0.30, sz: 162, ur: 18, vr: 16 });
      }
    }
    const padTex = U.toTexture(U.noiseCanvas(256, 132, 34, 21, true), 1, 1, 8);
    const padMesh = new THREE.Mesh(mergeGeo(pads), new THREE.MeshStandardMaterial({
      map: padTex, color: 0x9a9a94, roughness: 0.94, metalness: 0.0
    }));
    padMesh.receiveShadow = true;
    this.scene.add(padMesh);

    this.cityMats = [];
    const cityGroup = new THREE.Group();
    groups.forEach(function (g) {
      if (!g.list.length) return;
      const geo = mergeGeo(g.list);
      const mesh = new THREE.Mesh(geo, g.matNight);
      mesh.castShadow = true; mesh.receiveShadow = true;
      cityGroup.add(mesh);
      self.cityMats.push(g.matNight);
    });
    this.scene.add(cityGroup);
    this.buildingCount = placed;
  };

  /* ---------------------- mobilier, arbres, glissières ---------------------- */
  World.prototype._buildProps = function () {
    const self = this;
    const rng = U.makeRNG(31337);
    const poles = [], rails = [], lamps = [];
    const trunks = [], crowns = [];

    this.roads.forEach(function (road) {
      const n = road.pts.length;
      const isMountain = road.name === 'Col';
      const step = isMountain ? 5 : 9;
      for (let i = 0; i < n; i += step) {
        const ci = i, ni = (i + 1) % n;
        let dx = road.pts[ni][0] - road.pts[ci][0], dz = road.pts[ni][1] - road.pts[ci][1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const rx = -dz, rz = dx;
        const x = road.pts[ci][0], z = road.pts[ci][1], y = road.ys[ci];
        const off = road.width * 0.5 + 1.5;

        if (isMountain) {
          /* glissière côté vide */
          for (let s = -1; s <= 1; s += 2) {
            rails.push({
              x: x + rx * off * s, y: y + 0.55, z: z + rz * off * s,
              sx: 0.12, sy: 0.34, sz: l * step * 1.05, ry: Math.atan2(dx, dz)
            });
            poles.push({
              x: x + rx * off * s, y: y + 0.32, z: z + rz * off * s,
              sx: 0.11, sy: 0.75, sz: 0.11
            });
          }
        } else if (i % (step * 4) === 0) {
          /* lampadaires alternés */
          const s = (i / step) % 8 < 4 ? 1 : -1;
          const lx = x + rx * (off + 0.6) * s, lz = z + rz * (off + 0.6) * s;
          poles.push({ x: lx, y: y + 4.2, z: lz, sx: 0.16, sy: 8.4, sz: 0.16 });
          poles.push({
            x: lx - rx * 1.1 * s, y: y + 8.2, z: lz - rz * 1.1 * s,
            sx: 2.4, sy: 0.14, sz: 0.14, ry: Math.atan2(rz, rx)
          });
          lamps.push({
            x: lx - rx * 2.1 * s, y: y + 8.05, z: lz - rz * 2.1 * s,
            sx: 0.7, sy: 0.14, sz: 0.34
          });
          self._putCollider({ x: lx, y: y + 4, z: lz, r: 0.3, hy: 4.4 });
        }
      }
    });

    /* arbres hors chaussée */
    const treeCount = this.quality === 'low' ? 900 : this.quality === 'medium' ? 1800 : 2800;
    for (let i = 0; i < treeCount; i++) {
      const x = (rng() - 0.5) * SIZE * 0.92;
      const z = (rng() - 0.5) * SIZE * 0.92;
      const y = self.heightAt(x, z);
      if (y > 190 || y < 1) continue;
      const nr = self.nearestRoad(x, z);
      if (nr && nr.dist < nr.road.width * 0.5 + 7) continue;
      const dCity = Math.hypot(x + 120, z + 60);
      if (dCity < 420 && rng() > 0.12) continue;
      const h = 5 + rng() * 9;
      const cw = 2.6 + rng() * 2.0;
      trunks.push({ x: x, y: y + h * 0.22, z: z, sx: 0.40, sy: h * 0.45, sz: 0.40 });
      crowns.push({ x: x, y: y + h * 0.62, z: z, sx: cw, sy: h * 0.95, sz: cw, ry: rng() * 6.28 });
      if (rng() > 0.45) crowns.push({ x: x, y: y + h * 1.02, z: z, sx: cw * 0.62, sy: h * 0.55, sz: cw * 0.62, ry: rng() * 6.28 });
    }

    /* ---- rochers et buissons : le terrain nu paraissait vide ---- */
    const rocks = [], bushes = [];
    const scatterCount = this.quality === 'low' ? 700 : this.quality === 'medium' ? 1500 : 2400;
    for (let i = 0; i < scatterCount; i++) {
      const x = (rng() - 0.5) * SIZE * 0.95;
      const z = (rng() - 0.5) * SIZE * 0.95;
      const y = self.heightAt(x, z);
      if (y < 1.5) continue;
      const nr = self.nearestRoad(x, z);
      if (nr && nr.dist < nr.road.width * 0.5 + 5) continue;
      /* pente locale : les rochers affleurent surtout dans les dévers */
      const slope = Math.abs(self.heightAt(x + 5, z) - y) + Math.abs(self.heightAt(x, z + 5) - y);
      if (slope > 2.2 || y > 120) {
        const r = 0.8 + rng() * 3.4;
        rocks.push({
          x: x, y: y + r * 0.32, z: z, sx: r, sy: r * (0.5 + rng() * 0.5), sz: r * (0.7 + rng() * 0.6),
          rx: rng() * 0.5, ry: rng() * 6.28, rz: rng() * 0.5
        });
      } else if (rng() > 0.45) {
        const r = 0.6 + rng() * 1.5;
        bushes.push({ x: x, y: y + r * 0.4, z: z, sx: r, sy: r * 0.85, sz: r, ry: rng() * 6.28 });
      }
    }

    /* ---- mobilier de voirie : panneaux, feux, glissières de ville ---- */
    const signPoles = [], signPlates = [], lightHeads = [];
    this.roads.forEach(function (road, ri) {
      if (!road.urban && road.name !== 'Rocade') return;
      const n = road.pts.length;
      for (let i = 0; i < n; i += 26) {
        const ci = i, ni = (i + 1) % n;
        let dx = road.pts[ni][0] - road.pts[ci][0], dz = road.pts[ni][1] - road.pts[ci][1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const rx = -dz, rz = dx;
        const x = road.pts[ci][0], z = road.pts[ci][1], y = road.ys[ci];
        const off = road.width * 0.5 + 1.9;
        const sd = (i / 26) % 2 ? 1 : -1;
        const px = x + rx * off * sd, pz = z + rz * off * sd;
        signPoles.push({ x: px, y: y + 1.25, z: pz, sx: 0.09, sy: 2.5, sz: 0.09 });
        signPlates.push({
          x: px, y: y + 2.55, z: pz, sx: 0.70, sy: 0.70, sz: 0.05,
          ry: Math.atan2(dx, dz)
        });
        /* feu tricolore aux abords des carrefours urbains */
        if (road.urban && self.otherRoadNear(x, z, ri, road.width * 0.5 + 16)) {
          signPoles.push({ x: px, y: y + 2.9, z: pz, sx: 0.10, sy: 5.8, sz: 0.10 });
          signPoles.push({
            x: px - rx * 1.6 * sd, y: y + 5.7, z: pz - rz * 1.6 * sd,
            sx: 3.4, sy: 0.11, sz: 0.11, ry: Math.atan2(rz, rx)
          });
          lightHeads.push({
            x: px - rx * 3.1 * sd, y: y + 5.35, z: pz - rz * 3.1 * sd,
            sx: 0.26, sy: 0.78, sz: 0.26
          });
        }
      }
    });

    /* ---- panneaux publicitaires le long de la rocade ---- */
    const boardFrames = [], boardFaces = [];
    const ring = this.roads[0];
    for (let i = 0; i < ring.pts.length; i += 34) {
      const ni = (i + 1) % ring.pts.length;
      let dx = ring.pts[ni][0] - ring.pts[i][0], dz = ring.pts[ni][1] - ring.pts[i][1];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const rx = -dz, rz = dx;
      const sd = (i / 34) % 2 ? 1 : -1;
      const bx = ring.pts[i][0] + rx * 17 * sd, bz = ring.pts[i][1] + rz * 17 * sd;
      const by = self.heightAt(bx, bz);
      const ry = Math.atan2(dx, dz);
      boardFrames.push({ x: bx, y: by + 3.0, z: bz, sx: 0.42, sy: 6.0, sz: 0.42 });
      boardFrames.push({ x: bx, y: by + 6.4, z: bz, sx: 8.6, sy: 0.35, sz: 0.35, ry: ry });
      boardFaces.push({ x: bx, y: by + 8.3, z: bz, sx: 8.2, sy: 3.4, sz: 0.22, ry: ry });
      self._putCollider({ x: bx, y: by + 4, z: bz, r: 0.5, hy: 4 });
    }

    const addMerged = (list, mat, shadow, base) => {
      if (!list.length) return null;
      const m = new THREE.Mesh(mergeGeo(list, base), mat);
      m.castShadow = !!shadow; m.receiveShadow = true;
      this.scene.add(m);
      return m;
    };
    const metal = new THREE.MeshStandardMaterial({ color: 0x8b9099, metalness: 0.85, roughness: 0.42 });
    const bark = new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x2c4423, roughness: 0.95 });
    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0x2a2c30, emissive: 0xffdca8, emissiveIntensity: 0, roughness: 0.5
    });
    addMerged(poles, metal, true);
    addMerged(rails, metal, true);
    addMerged(lamps, this.lampMat, false);
    addMerged(trunks, bark, true);
    addMerged(crowns, leaf, true, new THREE.ConeGeometry(0.5, 1, 7, 1));

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 0.98, flatShading: true });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d4f2c, roughness: 0.97, flatShading: true });
    addMerged(rocks, rockMat, true, new THREE.IcosahedronGeometry(0.5, 0));
    addMerged(bushes, bushMat, true, new THREE.IcosahedronGeometry(0.5, 0));
    addMerged(signPoles, metal, true);
    addMerged(signPlates, new THREE.MeshStandardMaterial({
      color: 0xd8d8d2, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide
    }), true);
    this.trafficMat = new THREE.MeshStandardMaterial({
      color: 0x14151a, emissive: 0x1c8f34, emissiveIntensity: 1.6, roughness: 0.5
    });
    addMerged(lightHeads, this.trafficMat, false);
    addMerged(boardFrames, metal, true);
    this.boardMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22, emissive: 0x2a3550, emissiveIntensity: 0.25,
      roughness: 0.7, side: THREE.DoubleSide
    });
    addMerged(boardFaces, this.boardMat, true);
    this.lampPositions = lamps;
  };

  /* ---------------------- ouvrages d'art ----------------------
     Les tracés sont lissés et à pente limitée : ils passent donc
     naturellement au-dessus des creux du terrain. Partout où la chaussée
     surplombe le sol de plus de 3 m, on bâtit un viaduc — piles,
     sous-poutre et parapets. Les ponts naissent du relief, ils ne sont
     pas posés arbitrairement. */
  World.prototype._buildBridges = function () {
    const piers = [], decks = [], rails = [];
    const self = this;
    let count = 0;
    this.roads.forEach(function (road) {
      const n = road.pts.length;
      const last = road.closed ? n : n - 1;
      for (let i = 0; i < last; i += 2) {
        const ci = i % n, ni = (i + 1) % n;
        const x = road.pts[ci][0], z = road.pts[ci][1], y = road.ys[ci];
        const gap = y - self.baseHeight(x, z);
        if (gap < 3) continue;
        count++;
        let dx = road.pts[ni][0] - road.pts[ci][0], dz = road.pts[ni][1] - road.pts[ci][1];
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const rx = -dz, rz = dx;
        const ry = Math.atan2(dx, dz);
        const hw = road.width * 0.5;
        /* sous-poutre */
        decks.push({ x: x, y: y - 0.55, z: z, sx: hw * 2.1, sy: 0.9, sz: 11, ry: ry });
        /* parapets */
        for (let sd = -1; sd <= 1; sd += 2) {
          rails.push({
            x: x + rx * (hw + 0.35), y: y + 0.55, z: z + rz * (hw + 0.35),
            sx: 0.22, sy: 1.0, sz: 11, ry: ry
          });
        }
        /* piles, une sur quatre stations */
        if (i % 8 === 0 && gap > 4.5) {
          for (let sd = -1; sd <= 1; sd += 2) {
            piers.push({
              x: x + rx * hw * 0.55, y: y - 1.0 - gap / 2, z: z + rz * hw * 0.55,
              sx: 1.5, sy: gap, sz: 1.5
            });
          }
        }
      }
    });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8a8a85, roughness: 0.95 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 0.85 });
    const add = (list, mat) => {
      if (!list.length) return;
      const m = new THREE.Mesh(mergeGeo(list), mat);
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    };
    add.call(this, piers, concrete);
    add.call(this, decks, concrete);
    add.call(this, rails, railMat);
    this.bridgeSpans = count;
  };

  /* ---------------------- station-service et parking ---------------------- */
  World.prototype._buildAmenities = function () {
    const self = this;
    const boxes = [], glassBits = [], pumps = [], fascias = [], hoses = [];

    /* --- station-service en bord de rocade --- */
    const ring = this.roads[0];
    const si = Math.floor(ring.pts.length * 0.62);
    const a = ring.pts[si], b = ring.pts[(si + 1) % ring.pts.length];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const rx = -dz, rz = dx;
    const ry = Math.atan2(dx, dz);
    const sx = a[0] + rx * 34, sz = a[1] + rz * 34;
    const sy = self.heightAt(sx, sz);

    /* forecourt en enrobé, pas en béton blanc */
    const fore = new THREE.Mesh(new THREE.PlaneGeometry(48, 36),
      new THREE.MeshStandardMaterial({ map: U.toTexture(U.asphaltCanvas(512, 63), 6, 5, 8), roughness: 0.92 }));
    fore.rotation.x = -Math.PI / 2;
    fore.rotation.z = -ry;
    fore.position.set(sx, sy + 0.10, sz);
    fore.receiveShadow = true;
    this.scene.add(fore);
    /* auvent : dalle blanche + bandeau rouge en périphérie */
    boxes.push({ x: sx, y: sy + 5.9, z: sz, sx: 26, sy: 0.55, sz: 15, ry: ry });
    fascias.push({ x: sx, y: sy + 5.35, z: sz, sx: 26.4, sy: 0.62, sz: 15.4, ry: ry });
    for (let i = -1; i <= 1; i += 2) {
      for (let j = -1; j <= 1; j += 2) {
        boxes.push({
          x: sx + rx * i * 10.5 + dx * j * 5.5, y: sy + 2.9, z: sz + rz * i * 10.5 + dz * j * 5.5,
          sx: 0.65, sy: 5.4, sz: 0.65
        });
      }
    }
    /* pompes */
    for (let i = -1; i <= 1; i += 2) {
      /* îlot */
      boxes.push({ x: sx + rx * i * 4.4, y: sy + 0.22, z: sz + rz * i * 4.4, sx: 2.0, sy: 0.30, sz: 7.0, ry: ry });
      for (let j = -1; j <= 1; j += 2) {
        const px2 = sx + rx * i * 4.4 + dx * j * 1.9, pz2 = sz + rz * i * 4.4 + dz * j * 1.9;
        pumps.push({ x: px2, y: sy + 1.15, z: pz2, sx: 1.05, sy: 1.65, sz: 0.85, ry: ry });
        boxes.push({ x: px2, y: sy + 2.05, z: pz2, sx: 0.95, sy: 0.30, sz: 0.75, ry: ry });
        /* flexible replié sur le flanc */
        hoses.push({ x: px2 + rx * 0.55, y: sy + 1.35, z: pz2 + rz * 0.55, sx: 0.10, sy: 1.0, sz: 0.10 });
      }
    }
    /* boutique */
    boxes.push({ x: sx - dx * 15, y: sy + 2.2, z: sz - dz * 15, sx: 16, sy: 4.4, sz: 9, ry: ry });
    glassBits.push({ x: sx - dx * 15, y: sy + 2.3, z: sz - dz * 15, sx: 16.3, sy: 2.6, sz: 9.3, ry: ry });
    /* enseigne sur le toit */
    fascias.push({ x: sx - dx * 15, y: sy + 5.1, z: sz - dz * 15, sx: 9, sy: 1.5, sz: 0.4, ry: ry });
    this.stationPos = { x: sx, z: sz };

    /* --- parking en ville, avec places tracées --- */
    const px = 165, pz = 200;
    const py = self.heightAt(px, pz);
    const lotCv = U.canvas(512, 512), lg = lotCv.getContext('2d');
    lg.drawImage(U.asphaltCanvas(512, 41), 0, 0);
    lg.strokeStyle = 'rgba(236,236,230,.75)'; lg.lineWidth = 5;
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i <= 10; i++) {
        const x = 26 + i * 46;
        lg.beginPath(); lg.moveTo(x, 40 + r * 250); lg.lineTo(x, 190 + r * 250); lg.stroke();
      }
      lg.beginPath(); lg.moveTo(20, 40 + r * 250); lg.lineTo(486, 40 + r * 250); lg.stroke();
    }
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(88, 88),
      new THREE.MeshStandardMaterial({ map: U.toTexture(lotCv, 1, 1, 8), roughness: 0.9 }));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(px, py + 0.09, pz);
    lot.receiveShadow = true;
    this.scene.add(lot);
    /* butées de parking */
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 10; i++) {
        boxes.push({ x: px - 40 + i * 8.2, y: py + 0.20, z: pz - 22 + r * 44, sx: 2.2, sy: 0.28, sz: 0.36 });
      }
    }
    this.parkingPos = { x: px, z: pz };

    const conc = new THREE.MeshStandardMaterial({ color: 0xa2a29c, roughness: 0.92 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.5, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55
    });
    const push = (list, mat, shadow) => {
      if (!list.length) return;
      const m = new THREE.Mesh(mergeGeo(list), mat);
      m.castShadow = !!shadow; m.receiveShadow = true;
      this.scene.add(m);
    };
    push.call(this, boxes, conc, true);
    push.call(this, pumps, pumpMat, true);
    push.call(this, hoses, new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 }), true);
    this.stationSign = new THREE.MeshStandardMaterial({
      color: 0xb8202a, emissive: 0xb8202a, emissiveIntensity: 0.3, roughness: 0.55
    });
    push.call(this, fascias, this.stationSign, true);
    push.call(this, glassBits, glassMat, false);
  };

  /* ---------------------- tunnel ---------------------- */
  World.prototype._buildTunnel = function () {
    const road = this.roads[0];              /* la rocade */
    const n = road.pts.length;
    const i0 = Math.floor(n * 0.12), i1 = Math.floor(n * 0.18);
    const pos = [], idx = [];
    const RAD = 9.5, SEG = 14;
    for (let i = i0; i <= i1; i++) {
      const ci = i % n;
      const ni = (i + 1) % n, pi = (i - 1 + n) % n;
      let dx = road.pts[ni][0] - road.pts[pi][0], dz = road.pts[ni][1] - road.pts[pi][1];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const rx = -dz, rz = dx;
      const c = road.pts[ci], y = road.ys[ci];
      for (let s = 0; s <= SEG; s++) {
        const a = Math.PI * (s / SEG);
        const ox = Math.cos(a) * RAD, oy = Math.sin(a) * RAD;
        pos.push(c[0] + rx * ox, y + oy * 0.86, c[1] + rz * ox);
      }
    }
    const rows = i1 - i0;
    for (let i = 0; i < rows; i++) {
      for (let s = 0; s < SEG; s++) {
        const a = i * (SEG + 1) + s, b = a + 1, cc = a + SEG + 1, d = cc + 1;
        idx.push(a, b, cc, b, d, cc);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const tunnelTex = U.toTexture(U.noiseCanvas(256, 120, 40, 12, true), 30, 6, 4);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      map: tunnelTex, color: 0x8a8a86, roughness: 0.94, side: THREE.DoubleSide
    }));
    m.receiveShadow = true;
    this.scene.add(m);

    /* zone d'écho */
    const ca = road.pts[i0 % n], cb = road.pts[i1 % n];
    this.tunnels.push({
      x0: Math.min(ca[0], cb[0]) - 20, x1: Math.max(ca[0], cb[0]) + 20,
      z0: Math.min(ca[1], cb[1]) - 20, z1: Math.max(ca[1], cb[1]) + 20
    });

    /* néons */
    const neons = [];
    for (let i = i0; i <= i1; i += 2) {
      const ci = i % n;
      const c = road.pts[ci];
      neons.push({ x: c[0], y: road.ys[ci] + 7.6, z: c[1], sx: 1.6, sy: 0.12, sz: 0.5 });
    }
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0xfff4d8, emissive: 0xffe9bb, emissiveIntensity: 2.4
    });
    this.scene.add(new THREE.Mesh(mergeGeo(neons), neonMat));
  };

  World.prototype.tunnelFactor = function (p) {
    for (let i = 0; i < this.tunnels.length; i++) {
      const t = this.tunnels[i];
      if (p.x > t.x0 && p.x < t.x1 && p.z > t.z0 && p.z < t.z1) return 1;
    }
    return 0;
  };

  /* ---------------------- ciel & lumières ---------------------- */
  World.prototype._buildSky = function () {
    const vert = [
      'varying vec3 vDir;',
      'void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    const frag = [
      'uniform vec3 sunDir; uniform float night; uniform vec3 dayTop; uniform vec3 dayBot;',
      'uniform vec3 nightTop; uniform vec3 nightBot; uniform vec3 sunCol;',
      'varying vec3 vDir;',
      'float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);',
      '  vec3 dayC = mix(dayBot, dayTop, pow(h, 0.72));',
      '  vec3 nightC = mix(nightBot, nightTop, pow(h, 0.9));',
      '  vec3 col = mix(dayC, nightC, night);',
      '  float sd = max(dot(d, sunDir), 0.0);',
      /* halo puis disque solaire */
      '  col += sunCol * pow(sd, 8.0) * 0.45 * (1.0-night);',
      '  col += sunCol * pow(sd, 900.0) * 12.0;',
      /* teinte chaude vers l horizon cote soleil */
      '  col += sunCol * pow(sd, 3.0) * 0.16 * (1.0 - abs(d.y)) * (1.0-night*0.7);',
      /* etoiles */
      '  if(night > 0.05 && d.y > 0.0){',
      '    vec3 g = floor(d*260.0);',
      '    float s = hash(g);',
      '    if(s > 0.9965){ float tw = 0.6+0.4*sin(s*100.0); col += vec3(0.85,0.9,1.0)*tw*night*1.4; }',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');

    this.skyUniforms = {
      sunDir: { value: new V3(0.4, 0.6, 0.5).normalize() },
      night: { value: 0 },
      dayTop: { value: new THREE.Color(0x2f6fd0) },
      dayBot: { value: new THREE.Color(0xbcd3ea) },
      nightTop: { value: new THREE.Color(0x03050e) },
      nightBot: { value: new THREE.Color(0x0d1526) },
      sunCol: { value: new THREE.Color(0xfff0c8) }
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms, vertexShader: vert, fragmentShader: frag,
        side: THREE.BackSide, depthWrite: false, fog: false
      })
    );
    sky.scale.setScalar(9000);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.sky = sky;

    this.sun = new THREE.DirectionalLight(0xfff1d6, 3.0);
    this.sun.castShadow = true;
    const sm = this.quality === 'low' ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    const cam = this.sun.shadow.camera;
    const ext = this.quality === 'high' ? 118 : 88;
    cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext;
    cam.near = 1; cam.far = 460;
    this.sun.shadow.bias = -0.0009;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x9dc0ea, 0x40402f, 0.9);
    this.scene.add(this.hemi);

    this.fog = new THREE.FogExp2(0xa8bed2, 0.00042);
    this.scene.fog = this.fog;

    this.setTime(this.time);
  };

  /* t : 0 = minuit · 0.25 = aube · 0.5 = midi · 0.75 = crépuscule */
  World.prototype.setTime = function (t) {
    this.time = ((t % 1) + 1) % 1;
    const ang = (this.time - 0.25) * Math.PI * 2;
    const dir = new V3(Math.cos(ang) * 0.55, Math.sin(ang), Math.sin(ang * 0.5) * 0.42 + 0.25).normalize();
    this.skyUniforms.sunDir.value.copy(dir);

    const elev = dir.y;
    const night = U.clamp(1 - U.smoothstep(-0.14, 0.16, elev), 0, 1);
    this.skyUniforms.night.value = night;
    /* couleur du soleil : chaude à l'horizon */
    const warm = U.clamp(1 - U.smoothstep(0.02, 0.42, elev), 0, 1);
    const sc = new THREE.Color().setHSL(U.lerp(0.13, 0.09, warm), U.lerp(0.35, 0.92, warm), U.lerp(0.94, 0.62, warm));
    this.skyUniforms.sunCol.value.copy(sc);

    this.sun.position.copy(dir).multiplyScalar(220);
    this.sun.color.copy(sc);
    this.sun.intensity = U.clamp(elev * 4.2, 0, 3.4) * (1 - night * 0.9) + 0.03;
    this.hemi.intensity = U.lerp(0.26, 1.05, 1 - night);
    this.hemi.color.setHex(night > 0.6 ? 0x223049 : 0x9dc0ea);

    /* brouillard atmosphérique */
    const fogDay = new THREE.Color(0xa8bed2), fogNight = new THREE.Color(0x090d16);
    this.fog.color.copy(fogDay).lerp(fogNight, night);
    this.fog.density = U.lerp(0.00040, 0.00062, night);

    /* éclairages urbains */
    if (this.cityMats) this.cityMats.forEach(function (m) { m.emissiveIntensity = night * 1.15; });
    if (this.lampMat) this.lampMat.emissiveIntensity = night * 2.6;
    if (this.boardMat) this.boardMat.emissiveIntensity = 0.2 + night * 1.4;
    if (this.stationSign) this.stationSign.emissiveIntensity = 0.25 + night * 1.9;
    this.night = night;
    this.envDirty = true;
  };

  World.prototype.update = function (dt, target) {
    /* la caméra d'ombre suit la voiture */
    if (target) {
      this.sun.target.position.set(target.x, target.y, target.z);
      this.sun.position.copy(this.skyUniforms.sunDir.value).multiplyScalar(200).add(target);
      this.sun.target.updateMatrixWorld();
    }
    if (this.sky && target) this.sky.position.set(target.x, 0, target.z);
  };

  /* point de départ : sur la ligne droite, face à l'est */
  World.prototype.spawnPoint = function () {
    const road = this.roads[1];
    const i = Math.floor(road.pts.length * 0.42);   /* milieu de la ligne droite, terrain plat */
    const a = road.pts[i], b = road.pts[i + 1];
    return { x: a[0], z: a[1], heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
  };

  global.World = World;
  global.WORLD_SIZE = SIZE;
})(window);
