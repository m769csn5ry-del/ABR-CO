/* =============================================================
   carmodel.js — Lamborghini Aventador SVJ (échappement Gintani)
   Modèle 100 % procédural : aucune ressource externe.

   Cotes réelles utilisées :
     longueur 4943 · largeur 2098 · hauteur 1136 · empattement 2700 mm
     voies 1720 / 1700 mm · pneus 255/30 R20 av. — 355/25 R21 ar.
   Repère local : +X droite, +Y haut, +Z avant, y = 0 au sol.
   ============================================================= */
(function (global) {
  'use strict';

  const CarModel = {};

  /* ---------------------------------------------------------------
     1. PROFIL DE CARROSSERIE
     Chaque station décrit une coupe transversale :
       wFloor / yFloor        bas de caisse
       wShoulder / yShoulder  largeur maximale (épaulement)
       wTop / yTop            haut de caisse
     --------------------------------------------------------------- */
  const STATIONS = [
    /*  z      wFloor yFloor wShldr yShldr  wTop  yTop
        Les stations proches des essieux rentrent le bas de caisse
        (wFloor ≈ 0,61) et remontent l'épaulement au-dessus du sommet
        du pneu : c'est ce qui creuse les passages de roue.          */
    [ 2.470, 0.470, 0.170, 0.560, 0.300, 0.290, 0.395],
    [ 2.330, 0.700, 0.128, 0.850, 0.310, 0.520, 0.452],
    [ 2.150, 0.830, 0.108, 0.955, 0.345, 0.680, 0.520],
    [ 1.950, 0.880, 0.100, 1.010, 0.380, 0.780, 0.575],
    [ 1.800, 0.845, 0.112, 1.030, 0.470, 0.815, 0.610],
    [ 1.650, 0.660, 0.150, 1.049, 0.640, 0.840, 0.632],
    [ 1.500, 0.620, 0.170, 1.049, 0.700, 0.855, 0.650],
    [ 1.350, 0.612, 0.176, 1.049, 0.716, 0.860, 0.668],
    [ 1.200, 0.620, 0.170, 1.049, 0.700, 0.865, 0.702],
    [ 1.050, 0.685, 0.148, 1.035, 0.618, 0.868, 0.742],
    [ 0.930, 0.860, 0.118, 1.008, 0.520, 0.860, 0.792],
    [ 0.860, 0.900, 0.108, 0.996, 0.492, 0.800, 0.868],
    [ 0.560, 0.900, 0.106, 0.986, 0.496, 0.660, 1.072],
    [ 0.220, 0.900, 0.106, 0.982, 0.510, 0.590, 1.132],
    [-0.140, 0.906, 0.106, 0.990, 0.518, 0.596, 1.128],
    [-0.440, 0.920, 0.106, 1.006, 0.520, 0.652, 1.060],
    [-0.700, 0.930, 0.106, 1.020, 0.512, 0.740, 0.990],
    [-0.900, 0.870, 0.118, 1.035, 0.566, 0.800, 0.955],
    [-1.050, 0.650, 0.152, 1.049, 0.704, 0.845, 0.940],
    [-1.200, 0.608, 0.174, 1.049, 0.744, 0.868, 0.930],
    [-1.350, 0.602, 0.180, 1.049, 0.758, 0.878, 0.925],
    [-1.500, 0.608, 0.174, 1.049, 0.744, 0.885, 0.920],
    [-1.650, 0.652, 0.156, 1.049, 0.692, 0.890, 0.918],
    [-1.800, 0.840, 0.152, 1.038, 0.566, 0.892, 0.916],
    [-2.020, 0.880, 0.230, 1.010, 0.500, 0.895, 0.910],
    [-2.280, 0.800, 0.350, 0.960, 0.516, 0.880, 0.898],
    [-2.470, 0.700, 0.470, 0.890, 0.545, 0.820, 0.880]
  ];


  /* Catmull-Rom 1D sur la table de stations (z décroissant) */
  function stationAt(z) {
    const S = STATIONS;
    z = Math.max(S[S.length - 1][0], Math.min(S[0][0], z));
    let i = 0;
    while (i < S.length - 2 && S[i + 1][0] > z) i++;
    const p1 = S[i], p2 = S[i + 1];
    const p0 = S[Math.max(0, i - 1)], p3 = S[Math.min(S.length - 1, i + 2)];
    const t = (p1[0] - z) / (p1[0] - p2[0]);
    const out = [z];
    for (let k = 1; k < 7; k++) {
      const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
      const t2 = t * t, t3 = t2 * t;
      out.push(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3));
    }
    return out;   // [z, wFloor, yFloor, wShoulder, yShoulder, wTop, yTop]
  }

  /* Points de contrôle de la demi-section droite (9 points).
     Le point 3 « rentre » le flanc à mi-hauteur : sans lui la
     carrosserie viendrait couper les pneus dans les passages de roue.
     Repères en t : 0 sol · 0,5 épaulement · 0,75 bas de pavillon · 1 toit. */
  function halfControls(st) {
    const wF = st[1], yF = st[2], wS = st[3], yS = st[4], wT = st[5], yT = st[6];
    return [
      [0, yF],
      [wF * 0.60, yF * 0.92],
      [wF, yF + (yS - yF) * 0.14],
      [wF * 1.02, yF + (yS - yF) * 0.52],
      [wS, yS],
      [wT + (wS - wT) * 0.46, yS + (yT - yS) * 0.60],
      [wT, yT - (yT - yS) * 0.06],
      [wT * 0.56, yT],
      [0, yT]
    ];
  }

  /* Catmull-Rom 2D échantillonné : t ∈ [0,1] du bas au haut */
  function halfPoint(cp, t) {
    const n = cp.length;
    const u = t * (n - 1);
    let i = Math.floor(u);
    if (i > n - 2) i = n - 2;
    const f = u - i;
    const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(n - 1, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    const c = (a, b, cc, d) =>
      0.5 * ((2 * b) + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f2 + (-a + 3 * b - 3 * cc + d) * f3);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  }

  /* point de surface pour (z, t, côté) — sert aussi à poser vitres/prises d'air */
  function surfacePoint(z, t, side) {
    const p = halfPoint(halfControls(stationAt(z)), t);
    return new THREE.Vector3(p[0] * (side < 0 ? -1 : 1), p[1], z);
  }

  const RING = 15;                       /* points par demi-section */

  function ringPoints(z) {
    const cp = halfControls(stationAt(z));
    const pts = [];
    for (let i = 0; i < RING; i++) pts.push(halfPoint(cp, i / (RING - 1)));      /* droite bas->haut */
    for (let i = RING - 2; i >= 1; i--) { const p = halfPoint(cp, i / (RING - 1)); pts.push([-p[0], p[1]]); }
    return pts;                                                                   /* 2*RING-2 points */
  }

  /* --------------------------------------------------------------
     2. MATIÈRES
     -------------------------------------------------------------- */
  function buildMaterials(opts) {
    const carbonCv = U.carbonCanvas(512);
    const carbonMap = U.toTexture(carbonCv, 3, 3, 8);
    const carbonNrm = U.normalFromCanvas(carbonCv, 1.4);
    carbonNrm.repeat.set(3, 3);

    const paint = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(opts.color),
      metalness: opts.matte ? 0.15 : 0.62,
      roughness: opts.matte ? 0.58 : 0.20,
      clearcoat: opts.matte ? 0.18 : 1.0,
      clearcoatRoughness: opts.matte ? 0.42 : 0.045,
      envMapIntensity: opts.matte ? 0.45 : 1.15,
      sheen: opts.matte ? 0.4 : 0
    });

    const carbon = new THREE.MeshPhysicalMaterial({
      map: carbonMap, normalMap: carbonNrm,
      normalScale: new THREE.Vector2(0.8, 0.8),
      color: 0xb8b8bc, metalness: 0.20, roughness: 0.42,
      clearcoat: 0.55, clearcoatRoughness: 0.16, envMapIntensity: 0.55
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x05070b, metalness: 0.0, roughness: 0.09,
      transparent: true, opacity: 0.96, clearcoat: 1, clearcoatRoughness: 0.05,
      envMapIntensity: 0.85, side: THREE.DoubleSide, depthWrite: false
    });

    const black = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.15, roughness: 0.78 });
    const mesh = new THREE.MeshStandardMaterial({ color: 0x141519, metalness: 0.7, roughness: 0.45 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd6d9de, metalness: 1.0, roughness: 0.13, envMapIntensity: 2 });

    /* titane bleui : les tubes Gintani chauffent */
    const tiCv = U.canvas(64, 256), tg = tiCv.getContext('2d');
    const grd = tg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.00, '#3a3f4d'); grd.addColorStop(0.22, '#6a5f86');
    grd.addColorStop(0.42, '#4f6c99'); grd.addColorStop(0.62, '#9a9288');
    grd.addColorStop(0.85, '#b8b4ac'); grd.addColorStop(1.00, '#8e8a83');
    tg.fillStyle = grd; tg.fillRect(0, 0, 64, 256);
    const titanium = new THREE.MeshStandardMaterial({
      map: U.toTexture(tiCv, 1, 1, 4), metalness: 1.0, roughness: 0.24, envMapIntensity: 1.8
    });

    const rim = new THREE.MeshStandardMaterial({
      color: opts.matte ? 0x2b2d33 : 0x41454d, metalness: 0.92, roughness: 0.30, envMapIntensity: 1.1
    });
    const tyreMap = U.toTexture(U.tyreCanvas(), 8, 1, 8);
    const tyre = new THREE.MeshStandardMaterial({ map: tyreMap, color: 0x4a4a50, metalness: 0.02, roughness: 0.92 });
    const disc = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 0.55, roughness: 0.55 });
    const caliper = new THREE.MeshStandardMaterial({ color: 0xd8b33a, metalness: 0.5, roughness: 0.35 });

    const headOff = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.9, roughness: 0.2 });
    const headOn = new THREE.MeshStandardMaterial({
      color: 0xdfe9ff, emissive: 0xbcd2ff, emissiveIntensity: 3.4, metalness: 0.2, roughness: 0.2
    });
    const drl = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xd8e6ff, emissiveIntensity: 2.6, roughness: 0.3
    });
    const tail = new THREE.MeshStandardMaterial({
      color: 0x36060a, emissive: 0xff1418, emissiveIntensity: 1.0, roughness: 0.35
    });
    const reverse = new THREE.MeshStandardMaterial({
      color: 0x101216, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.4
    });
    const alcantara = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.96, metalness: 0.0 });
    const stitch = new THREE.MeshStandardMaterial({ color: 0xc8a44a, roughness: 0.6 });
    const screen = new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0x1d3a5c, emissiveIntensity: 1.1, roughness: 0.25
    });

    return {
      paint, carbon, glass, black, mesh, chrome, titanium, rim, tyre, disc, caliper,
      headOff, headOn, drl, tail, reverse, alcantara, stitch, screen
    };
  }

  /* --------------------------------------------------------------
     3. PIÈCES
     -------------------------------------------------------------- */
  function add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /* nappe posée sur la surface de caisse (vitre, prise d'air, jonc) */
  function patch(z0, z1, t0, t1, side, offset, nz, nt) {
    nz = nz || 10; nt = nt || 6;
    const pos = [], idx = [], uv = [];
    for (let i = 0; i <= nz; i++) {
      const z = U.lerp(z0, z1, i / nz);
      for (let j = 0; j <= nt; j++) {
        const t = U.lerp(t0, t1, j / nt);
        const p = surfacePoint(z, t, side);
        /* normale approchée par différences finies sur la surface */
        const pa = surfacePoint(z, Math.min(1, t + 0.02), side);
        const pb = surfacePoint(z + 0.02, t, side);
        const n = new THREE.Vector3().subVectors(pa, p).cross(new THREE.Vector3().subVectors(pb, p)).normalize();
        if (n.lengthSq() < 0.5) n.set(side < 0 ? -1 : 1, 0, 0);
        if (n.x * p.x + n.y * (p.y - 0.5) < 0) n.negate();
        pos.push(p.x + n.x * offset, p.y + n.y * offset, p.z + n.z * offset);
        uv.push(j / nt, i / nz);
      }
    }
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < nt; j++) {
        const a = i * (nt + 1) + j, b = a + 1, c = a + nt + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* --------------------------- ROUE --------------------------- */
  function buildWheel(M, tyreW, rimR, tyreR, spokes) {
    const g = new THREE.Group();

    /* pneu : tore aplati, épaules marquées */
    const seg = 42, ring = 12;
    const pos = [], idx = [], uv = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j <= ring; j++) {
        const b = (j / ring) * Math.PI * 2;
        /* Section en rectangle arrondi (superellipse) : bande de
           roulement plate au rayon extérieur, flancs verticaux courts —
           c'est le profil d'un pneu de série 25/30. */
        const cb = Math.cos(b), sb = Math.sin(b);
        const rMid = (rimR + tyreR) * 0.5, rAmp = (tyreR - rimR) * 0.5;
        const e = 0.32;
        const w = (tyreW / 2) * Math.sign(cb) * Math.pow(Math.abs(cb), e);
        const rr = rMid + rAmp * Math.sign(sb) * Math.pow(Math.abs(sb), e);
        pos.push(ca * rr, sa * rr, w);
        uv.push(i / seg, j / ring);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < ring; j++) {
        const a = i * (ring + 1) + j, b = a + 1, c = a + ring + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tg.setIndex(idx); tg.computeVertexNormals();
    const tm = new THREE.Mesh(tg, M.tyre);
    tm.castShadow = true; tm.rotation.y = Math.PI / 2;
    g.add(tm);

    /* jante forgée : barrel + voile */
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(rimR, rimR * 0.985, tyreW * 0.92, 40, 1, true), M.rim);
    barrel.rotation.z = Math.PI / 2; barrel.castShadow = true;
    g.add(barrel);
    const face = new THREE.Mesh(new THREE.CircleGeometry(rimR * 0.99, 40), M.rim);
    face.position.x = tyreW * 0.40; face.rotation.y = Math.PI / 2;
    g.add(face);

    /* rayons doubles en Y (style Nireo) */
    const spokeGeo = new THREE.BoxGeometry(0.035, rimR * 0.86, tyreW * 0.30);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      for (let k = -1; k <= 1; k += 2) {
        const s = new THREE.Mesh(spokeGeo, M.rim);
        s.position.set(
          Math.cos(a + k * 0.13) * rimR * 0.47,
          Math.sin(a + k * 0.13) * rimR * 0.47,
          tyreW * 0.20);
        s.rotation.z = a + k * 0.13 + Math.PI / 2;
        s.rotation.y = k * 0.10;
        s.castShadow = true;
        g.add(s);
      }
    }
    /* moyeu central + écrou */
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.26, tyreW * 0.34, 20), M.rim);
    hub.rotation.z = Math.PI / 2; hub.position.x = tyreW * 0.22;
    g.add(hub);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.10, rimR * 0.10, tyreW * 0.13, 6), M.chrome);
    nut.rotation.z = Math.PI / 2; nut.position.x = tyreW * 0.40;
    g.add(nut);

    /* disque carbone-céramique percé + étrier */
    const brake = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.83, rimR * 0.83, 0.032, 34), M.disc);
    d.rotation.z = Math.PI / 2;
    brake.add(d);
    const holeGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.05, 6);
    for (let r = 0; r < 2; r++) {
      const rad = rimR * (0.52 + r * 0.17), n = 14 + r * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.2;
        const h = new THREE.Mesh(holeGeo, M.black);
        h.position.set(0, Math.sin(a) * rad, Math.cos(a) * rad);
        h.rotation.z = Math.PI / 2;
        brake.add(h);
      }
    }
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.135, 0.30), M.caliper);
    cal.position.set(0, rimR * 0.60, 0);
    brake.add(cal);
    brake.position.x = -tyreW * 0.03;
    g.add(brake);
    g.userData.brake = brake;

    return g;
  }

  /* --------------------------------------------------------------
     4. ASSEMBLAGE COMPLET
     -------------------------------------------------------------- */
  CarModel.build = function (opts) {
    opts = Object.assign({ color: 0x2f7f3a, matte: false, carbon: true, interior: true }, opts || {});
    const M = buildMaterials(opts);
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    /* ---------- caisse ---------- */
    const sections = [];
    const zFront = 2.470, zRear = -2.470, N = 62;
    for (let i = 0; i <= N; i++) {
      const z = U.lerp(zFront, zRear, i / N);
      sections.push({ z: z, pts: ringPoints(z) });
    }
    const shell = new THREE.Mesh(U.loft(sections, true, true), M.paint);
    shell.castShadow = true; shell.receiveShadow = true;
    body.add(shell);

    /* ---------- vitrage ---------- */
    /* pare-brise : nappe sur le dessus, de la base de baie au toit */
    body.add(new THREE.Mesh(patch(1.20, 0.26, 0.78, 1.00, 1, 0.006, 14, 7), M.black));
    body.add(new THREE.Mesh(patch(1.20, 0.26, 0.78, 1.00, -1, 0.006, 14, 7), M.black));
    const wsR = new THREE.Mesh(patch(1.14, 0.30, 0.81, 1.00, 1, 0.014, 14, 7), M.glass);
    const wsL = new THREE.Mesh(patch(1.14, 0.30, 0.81, 1.00, -1, 0.014, 14, 7), M.glass);
    body.add(wsR, wsL);
    /* custodes latérales */
    body.add(new THREE.Mesh(patch(0.70, -0.46, 0.52, 0.775, 1, 0.005, 10, 5), M.black));
    body.add(new THREE.Mesh(patch(0.70, -0.46, 0.52, 0.775, -1, 0.005, 10, 5), M.black));
    body.add(new THREE.Mesh(patch(0.64, -0.42, 0.55, 0.745, 1, 0.012, 10, 5), M.glass));
    body.add(new THREE.Mesh(patch(0.64, -0.42, 0.55, 0.745, -1, 0.012, 10, 5), M.glass));
    /* lunette / capot moteur vitré */
    body.add(new THREE.Mesh(patch(-0.46, -0.92, 0.82, 1.00, 1, 0.010, 8, 5), M.glass));
    body.add(new THREE.Mesh(patch(-0.46, -0.92, 0.82, 1.00, -1, 0.010, 8, 5), M.glass));

    /* montants et pavillon en carbone (pack SVJ) */
    const roofMat = opts.carbon ? M.carbon : M.paint;
    body.add(new THREE.Mesh(patch(0.34, -0.40, 0.90, 1.00, 1, 0.014, 8, 4), roofMat));
    body.add(new THREE.Mesh(patch(0.34, -0.40, 0.90, 1.00, -1, 0.014, 8, 4), roofMat));

    /* ---------- écopes latérales hexagonales ---------- */
    const sideIntake = (side) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(patch(-0.28, -0.98, 0.34, 0.50, side, 0.004, 9, 5), M.black));
      /* lamelles */
      for (let i = 0; i < 5; i++) {
        const z = U.lerp(-0.38, -0.97, i / 4);
        const p = surfacePoint(z, 0.42, side);
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.20, 0.045), M.mesh);
        f.position.copy(p).x += 0.012 * side;
        f.rotation.z = side * 0.15;
        g.add(f);
      }
      return g;
    };
    body.add(sideIntake(1), sideIntake(-1));

    /* écopes de custode (au-dessus, style Aventador) */
    body.add(new THREE.Mesh(patch(-0.34, -0.86, 0.56, 0.66, 1, 0.006, 7, 3), M.black));
    body.add(new THREE.Mesh(patch(-0.34, -0.86, 0.56, 0.66, -1, 0.006, 7, 3), M.black));

    /* ---------- boucliers ---------- */
    /* nez : grande bouche centrale + naseaux */
    body.add(new THREE.Mesh(patch(2.42, 2.00, 0.14, 0.42, 1, 0.004, 8, 5), M.mesh));
    body.add(new THREE.Mesh(patch(2.42, 2.00, 0.14, 0.42, -1, 0.004, 8, 5), M.mesh));

    /* splitter avant carbone */
    const splitter = new THREE.Group();
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.035, 0.44), opts.carbon ? M.carbon : M.black);
    sp.position.set(0, 0.085, 2.18);
    sp.rotation.x = -0.05;
    splitter.add(sp);
    /* dérives latérales (canards SVJ) */
    for (let s = -1; s <= 1; s += 2) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.026), opts.carbon ? M.carbon : M.black);
      c.position.set(s * 0.83, 0.20, 2.10);
      c.rotation.set(0.20, s * 0.22, s * 0.10);
      splitter.add(c);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.085, 0.024), opts.carbon ? M.carbon : M.black);
      c2.position.set(s * 0.90, 0.33, 1.99);
      c2.rotation.set(0.16, s * 0.26, s * 0.08);
      splitter.add(c2);
    }
    body.add(splitter);

    /* bas de caisse / jupes */
    for (let s = -1; s <= 1; s += 2) {
      const sk = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 2.05), opts.carbon ? M.carbon : M.black);
      sk.position.set(s * 0.95, 0.145, 0.02);
      sk.rotation.z = s * 0.12;
      body.add(sk);
    }

    /* ---------- optiques avant en Y ---------- */
    const headlights = [];
    const drls = [];
    const mkY = (side) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(patch(2.08, 1.84, 0.50, 0.70, side, 0.004, 5, 4), M.headOff);
      g.add(base);
      /* branches du Y */
      const bar = new THREE.BoxGeometry(0.028, 0.030, 0.30);
      const b1 = new THREE.Mesh(bar, M.drl);
      b1.position.set(side * 0.86, 0.60, 1.93); b1.rotation.set(0.24, side * 0.20, side * 0.55);
      const b2 = new THREE.Mesh(bar, M.drl);
      b2.position.set(side * 0.84, 0.53, 1.99); b2.rotation.set(-0.10, side * 0.24, -side * 0.30);
      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.22), M.drl);
      b3.position.set(side * 0.74, 0.50, 2.04); b3.rotation.set(0.05, side * 0.42, side * 0.05);
      g.add(b1, b2, b3);
      drls.push(b1, b2, b3);
      const proj = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), M.headOff);
      proj.position.set(side * 0.80, 0.565, 1.99);
      g.add(proj);
      headlights.push(proj);
      return g;
    };
    body.add(mkY(1), mkY(-1));

    /* ---------- capot : évents + jonc ---------- */
    for (let s = -1; s <= 1; s += 2) {
      const v = new THREE.Mesh(patch(1.90, 1.55, 0.90, 1.00, s, 0.006, 6, 3), M.mesh);
      body.add(v);
    }

    /* ---------- écope de toit SVJ ---------- */
    const scoop = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.62), opts.carbon ? M.carbon : M.paint);
    sh.position.set(0, 1.128, -0.16); sh.rotation.x = 0.07;
    scoop.add(sh);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.075, 0.05), M.black);
    mouth.position.set(0, 1.122, 0.14);
    scoop.add(mouth);
    body.add(scoop);

    /* ---------- capot moteur : grille hexagonale + V12 visible ---------- */
    const deck = new THREE.Group();
    const hex = new THREE.CylinderGeometry(0.052, 0.052, 0.012, 6);
    for (let r = -3; r <= 3; r++) {
      for (let c = -4; c <= 4; c++) {
        const x = c * 0.098 + (r % 2 ? 0.049 : 0);
        const z = -0.72 + r * 0.088;
        if (Math.abs(x) > 0.62) continue;
        const h = new THREE.Mesh(hex, M.mesh);
        const p = surfacePoint(z, 1.0, 1);
        h.position.set(x, p.y + 0.012 - Math.abs(x) * 0.045, z);
        h.rotation.x = Math.PI / 2 - 0.10;
        h.rotation.z = Math.abs(x) * 0.05;
        deck.add(h);
      }
    }
    body.add(deck);
    /* couvre-culasses / plénum entrevus */
    for (let s = -1; s <= 1; s += 2) {
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.60), M.chrome);
      cam.position.set(s * 0.24, 0.80, -0.78);
      deck.add(cam);
    }

    /* ---------- aileron SVJ ---------- */
    const wing = new THREE.Group();
    const wingMat = opts.carbon ? M.carbon : M.paint;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.042, 0.32), wingMat);
    blade.castShadow = true;
    const flap = new THREE.Group();
    flap.add(blade);
    flap.position.set(0, 1.075, -2.10);
    flap.rotation.x = -0.13;
    wing.add(flap);
    /* joues latérales */
    for (let s = -1; s <= 1; s += 2) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.34), wingMat);
      ep.position.set(s * 0.80, 1.075, -2.10);
      wing.add(ep);
      /* montants cintrés */
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.16), wingMat);
      st.position.set(s * 0.52, 0.94, -2.02);
      st.rotation.x = 0.30;
      wing.add(st);
    }
    body.add(wing);

    /* ---------- feux arrière en Y ---------- */
    const tails = [];
    const mkTail = (side) => {
      const g = new THREE.Group();
      const bar = new THREE.BoxGeometry(0.030, 0.034, 0.24);
      const t1 = new THREE.Mesh(bar, M.tail);
      t1.position.set(side * 0.72, 0.78, -2.36); t1.rotation.set(0.10, side * 0.18, side * 0.62);
      const t2 = new THREE.Mesh(bar, M.tail);
      t2.position.set(side * 0.70, 0.70, -2.38); t2.rotation.set(-0.06, side * 0.20, -side * 0.34);
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, 0.20), M.tail);
      t3.position.set(side * 0.58, 0.665, -2.40); t3.rotation.set(0, side * 0.40, side * 0.06);
      g.add(t1, t2, t3);
      tails.push(t1, t2, t3);
      return g;
    };
    body.add(mkTail(1), mkTail(-1));
    const revLamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), M.reverse);
    revLamp.position.set(0, 0.60, -2.42);
    body.add(revLamp);

    /* ---------- diffuseur ---------- */
    const diff = new THREE.Group();
    const dBase = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.05, 0.60), opts.carbon ? M.carbon : M.black);
    dBase.position.set(0, 0.30, -2.16); dBase.rotation.x = -0.30;
    diff.add(dBase);
    for (let i = -3; i <= 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.20, 0.56), opts.carbon ? M.carbon : M.black);
      fin.position.set(i * 0.235, 0.36, -2.18); fin.rotation.x = -0.30;
      diff.add(fin);
    }
    body.add(diff);

    /* ---------- ligne Gintani : sortie centrale titane ---------- */
    const exhaust = new THREE.Group();
    const tips = [];
    for (let s = -1; s <= 1; s += 2) {
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.088, 0.26, 22, 1, true), M.titanium);
      outer.rotation.x = Math.PI / 2;
      outer.position.set(s * 0.105, 0.585, -2.40);
      exhaust.add(outer);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.078, 22), M.black);
      inner.position.set(s * 0.105, 0.585, -2.30);
      inner.rotation.y = Math.PI;
      exhaust.add(inner);
      tips.push(new THREE.Vector3(s * 0.105, 0.585, -2.54));
    }
    /* collecteur visible sous le capot moteur */
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.42, 10), M.titanium);
        tube.position.set(s * (0.22 + i * 0.085), 0.66, -1.55 + i * 0.06);
        tube.rotation.set(1.28, 0, s * 0.22);
        exhaust.add(tube);
      }
    }
    body.add(exhaust);

    /* ---------- rétroviseurs ---------- */
    for (let s = -1; s <= 1; s += 2) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.14, 8), M.black);
      stalk.position.set(s * 1.00, 0.80, 0.86); stalk.rotation.z = s * 1.15;
      body.add(stalk);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.17), opts.carbon ? M.carbon : M.paint);
      cap.position.set(s * 1.085, 0.83, 0.86); cap.rotation.set(0, s * -0.12, s * 0.10);
      body.add(cap);
      const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.065), M.chrome);
      mir.position.set(s * 1.062, 0.83, 0.855); mir.rotation.set(0, s * 1.62, 0);
      body.add(mir);
    }

    /* ---------- soubassement plat ---------- */
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.03, 3.4), M.black);
    floor.position.set(0, 0.085, -0.05);
    body.add(floor);

    /* ---------- plaque ---------- */
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.012), M.chrome);
    plate.position.set(0, 0.44, -2.415);
    body.add(plate);

    return finishBuild(root, body, M, opts, {
      headlights, drls, tails, revLamp, wing, flap, exhaust, tips, shell
    });
  };

  /* --------------------------------------------------------------
     5. ROUES, HABITACLE, EFFETS, API D'ANIMATION
     -------------------------------------------------------------- */
  function finishBuild(root, body, M, opts, P) {

    /* ---------------- roues ---------------- */
    /* 255/30 R20 av. : Ø = 508 + 2*76,5 = 661 mm  -> R = 0,3305
       355/25 R21 ar. : Ø = 533 + 2*88,8 = 711 mm  -> R = 0,3555 */
    const WB_F = 1.350, WB_R = -1.350;
    const TR_F = 0.860, TR_R = 0.850;
    const RF = 0.3305, RR = 0.3555;

    const wheels = [];
    const specs = [
      { x: TR_F, z: WB_F, r: RF, w: 0.255, rim: 0.254, s: 1 },   /* AVG */
      { x: -TR_F, z: WB_F, r: RF, w: 0.255, rim: 0.254, s: -1 },  /* AVD */
      { x: TR_R, z: WB_R, r: RR, w: 0.355, rim: 0.267, s: 1 },   /* ARG */
      { x: -TR_R, z: WB_R, r: RR, w: 0.355, rim: 0.267, s: -1 }   /* ARD */
    ];
    specs.forEach(function (sp) {
      const steerPivot = new THREE.Group();          /* braquage */
      steerPivot.position.set(sp.x, sp.r, sp.z);
      const spin = new THREE.Group();                /* rotation */
      const w = buildWheel(M, sp.w, sp.rim, sp.r, 5);
      w.scale.x = sp.s;                              /* la jante regarde vers l'extérieur */
      spin.add(w);
      steerPivot.add(spin);
      root.add(steerPivot);
      wheels.push({ pivot: steerPivot, spin: spin, restY: sp.r, radius: sp.r, group: w });
    });

    /* ---------------- habitacle ---------------- */
    let steerWheel = null;
    if (opts.interior) {
      const cab = new THREE.Group();
      /* planche de bord */
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.26, 0.42), M.alcantara);
      dash.position.set(0, 0.80, 0.62); dash.rotation.x = -0.22;
      cab.add(dash);
      /* tunnel central */
      const tun = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 1.30), M.alcantara);
      tun.position.set(0, 0.53, -0.05);
      cab.add(tun);
      /* combiné numérique */
      const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), M.screen);
      cluster.position.set(-0.36, 0.855, 0.50); cluster.rotation.x = -0.30;
      cab.add(cluster);
      /* volant hexagonal à méplat */
      steerWheel = new THREE.Group();
      const rimGeo = new THREE.TorusGeometry(0.175, 0.021, 8, 6);
      const sw = new THREE.Mesh(rimGeo, M.alcantara);
      steerWheel.add(sw);
      for (let i = 0; i < 3; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.028, 0.016), M.black);
        spoke.rotation.z = i * 2.094 + 0.4;
        spoke.position.set(Math.cos(i * 2.094 + 0.4) * 0.085, Math.sin(i * 2.094 + 0.4) * 0.085, 0.006);
        steerWheel.add(spoke);
      }
      const hubc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 6), M.stitch);
      hubc.rotation.x = Math.PI / 2;
      steerWheel.add(hubc);
      steerWheel.position.set(-0.36, 0.755, 0.40);
      steerWheel.rotation.x = -0.42;
      cab.add(steerWheel);
      /* sièges baquets carbone */
      for (let s = -1; s <= 1; s += 2) {
        const seat = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.10, 0.48), M.alcantara);
        base.position.set(0, 0.44, -0.08);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.10), M.alcantara);
        back.position.set(0, 0.74, -0.32); back.rotation.x = 0.17;
        const bol1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.50, 0.10), M.alcantara);
        bol1.position.set(0.20, 0.72, -0.28); bol1.rotation.x = 0.17;
        const bol2 = bol1.clone(); bol2.position.x = -0.20;
        seat.add(base, back, bol1, bol2);
        seat.position.set(s * 0.36, 0, 0.02);
        cab.add(seat);
      }
      body.add(cab);
    }

    /* ---------------- éclairage embarqué ---------------- */
    const lights = new THREE.Group();
    const beamL = new THREE.SpotLight(0xcfe0ff, 0, 130, 0.42, 0.45, 1.4);
    beamL.position.set(0.80, 0.57, 2.00);
    beamL.target.position.set(0.9, -0.6, 34);
    const beamR = new THREE.SpotLight(0xcfe0ff, 0, 130, 0.42, 0.45, 1.4);
    beamR.position.set(-0.80, 0.57, 2.00);
    beamR.target.position.set(-0.9, -0.6, 34);
    lights.add(beamL, beamL.target, beamR, beamR.target);
    /* lueur rouge au sol quand on freine */
    const brakeGlow = new THREE.PointLight(0xff1e18, 0, 4.5, 2.2);
    brakeGlow.position.set(0, 0.62, -2.6);
    lights.add(brakeGlow);
    root.add(lights);

    /* ---------------- flammes / lueur d'échappement ---------------- */
    const flameTex = new THREE.CanvasTexture(U.glowCanvas(128, 255, 150, 60, true));
    const flames = P.tips.map(function (p) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, color: 0xffb257, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      m.position.copy(p);
      m.scale.set(0.5, 0.5, 0.5);
      body.add(m);
      return m;
    });
    /* halo des phares (visible de face la nuit) */
    const haloTex = new THREE.CanvasTexture(U.glowCanvas(128, 200, 220, 255, false));
    const halos = [];
    [1, -1].forEach(function (s) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.position.set(s * 0.80, 0.565, 2.02);
      sp.scale.set(0.9, 0.9, 1);
      body.add(sp);
      halos.push(sp);
    });

    /* ---------------- API d'animation ---------------- */
    const api = {
      root: root,
      body: body,
      wheels: wheels,
      materials: M,
      dimensions: {
        length: 4.943, width: 2.098, height: 1.136,
        wheelbase: 2.700, trackF: 1.720, trackR: 1.700,
        radiusF: 0.3305, radiusR: 0.3555
      },

      /* braquage (rad) — Ackermann appliqué par le module véhicule */
      setSteer: function (aL, aR) {
        wheels[0].pivot.rotation.y = aL;
        wheels[1].pivot.rotation.y = aR;
      },
      /* rotation de roue (rad) */
      setSpin: function (i, a) { wheels[i].spin.rotation.x = a; },
      /* débattement de suspension (m, positif = compression) */
      setSusp: function (i, comp) {
        wheels[i].pivot.position.y = wheels[i].restY - comp;
      },
      setSteeringWheel: function (a) { if (steerWheel) steerWheel.rotation.z = -a * 2.6; },

      setBrake: function (on, hard) {
        const e = on ? (hard ? 5.2 : 3.4) : 1.0;
        M.tail.emissiveIntensity = e;
        brakeGlow.intensity = on ? (hard ? 1.7 : 0.9) : 0;
      },
      setTailOn: function (on) { M.tail.emissiveIntensity = on ? 1.0 : 0.06; },
      setReverse: function (on) { M.reverse.emissiveIntensity = on ? 3.2 : 0.0; },
      setHeadlights: function (on, night) {
        M.drl.emissiveIntensity = on ? 3.2 : 1.1;
        M.headOn.emissiveIntensity = on ? 4.0 : 0;
        P.headlights.forEach(function (h) { h.material = on ? M.headOn : M.headOff; });
        const p = on ? (night ? 150 : 55) : 0;
        beamL.intensity = p; beamR.intensity = p;
        halos.forEach(function (h) { h.material.opacity = on ? (night ? 0.75 : 0.3) : 0; });
      },
      /* ALA : volet d'aileron ouvert (traînée réduite) / fermé (appui max) */
      setALA: function (open) {
        P.flap.rotation.x = U.lerp(-0.13, 0.30, open);
      },
      /* pétarade visuelle */
      flame: function (intensity) {
        flames.forEach(function (f) {
          f.material.opacity = Math.min(1, intensity);
          const s = 0.35 + intensity * 0.85;
          f.scale.set(s, s, s);
        });
      },
      decayFlame: function (dt) {
        flames.forEach(function (f) {
          f.material.opacity = Math.max(0, f.material.opacity - dt * 7);
        });
      },
      setPaint: function (color, matte) {
        M.paint.color.set(color);
        M.paint.metalness = matte ? 0.15 : 0.62;
        M.paint.roughness = matte ? 0.58 : 0.20;
        M.paint.clearcoat = matte ? 0.18 : 1.0;
        M.paint.needsUpdate = true;
      },
      setEnvIntensity: function (v) {
        M.paint.envMapIntensity = v;
        M.carbon.envMapIntensity = v * 0.8;
        M.chrome.envMapIntensity = v * 1.4;
      }
    };
    api.setTailOn(false);
    api.setHeadlights(false, false);
    return api;
  }

  global.CarModel = CarModel;
})(window);
