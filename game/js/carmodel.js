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
    [ 2.470, 0.500, 0.168, 0.664, 0.290, 0.576, 0.392],
    [ 2.415, 0.700, 0.150, 0.868, 0.298, 0.740, 0.414],
    [ 2.340, 0.796, 0.132, 0.944, 0.308, 0.808, 0.446],
    [ 2.260, 0.826, 0.120, 0.972, 0.318, 0.834, 0.476],
    [ 2.120, 0.852, 0.108, 0.996, 0.338, 0.856, 0.518],
    [ 1.950, 0.868, 0.100, 0.995, 0.362, 0.856, 0.554],
    [ 1.870, 0.858, 0.106, 1.012, 0.410, 0.852, 0.578],
    [ 1.800, 0.845, 0.112, 1.030, 0.470, 0.848, 0.606],
    [ 1.650, 0.660, 0.150, 1.049, 0.640, 0.840, 0.632],
    [ 1.500, 0.620, 0.170, 1.049, 0.700, 0.855, 0.650],
    [ 1.350, 0.612, 0.176, 1.049, 0.716, 0.860, 0.668],
    [ 1.200, 0.620, 0.170, 1.049, 0.700, 0.865, 0.702],
    [ 1.050, 0.685, 0.148, 1.035, 0.618, 0.868, 0.742],
    [ 0.930, 0.860, 0.118, 0.988, 0.552, 0.850, 0.792],
    [ 0.860, 0.888, 0.108, 0.960, 0.566, 0.782, 0.868],
    [ 0.560, 0.884, 0.106, 0.968, 0.604, 0.520, 1.072],
    [ 0.220, 0.882, 0.106, 0.962, 0.622, 0.452, 1.132],
    [-0.140, 0.888, 0.106, 0.968, 0.628, 0.460, 1.128],
    [-0.440, 0.908, 0.106, 0.985, 0.606, 0.520, 1.060],
    [-0.700, 0.924, 0.106, 1.002, 0.546, 0.706, 0.990],
    [-0.900, 0.870, 0.118, 1.035, 0.566, 0.800, 0.955],
    [-1.050, 0.650, 0.152, 1.049, 0.704, 0.845, 0.940],
    [-1.200, 0.608, 0.174, 1.049, 0.744, 0.868, 0.930],
    [-1.350, 0.602, 0.180, 1.049, 0.758, 0.878, 0.925],
    [-1.500, 0.608, 0.174, 1.049, 0.744, 0.885, 0.920],
    [-1.650, 0.652, 0.156, 1.049, 0.692, 0.890, 0.918],
    [-1.800, 0.840, 0.152, 1.038, 0.566, 0.892, 0.916],
    [-1.900, 0.852, 0.190, 1.024, 0.536, 0.888, 0.910],
    [-2.020, 0.866, 0.240, 1.014, 0.516, 0.896, 0.902],
    [-2.280, 0.812, 0.398, 0.992, 0.548, 0.890, 0.856],
    [-2.470, 0.762, 0.548, 0.912, 0.588, 0.868, 0.802]
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

  /* Creux longitudinal du capot et du capot moteur. Sur une Aventador la
     ligne médiane est nettement en contrebas des bosses d'ailes : sans ce
     décrochement, le dessus n'est qu'un dôme. */
  function hoodDip(z) {
    const f = Math.max(0, 1 - Math.pow((z - 1.86) / 0.78, 2));
    /* Vallée du capot moteur, très creusée : ce sont les arcs-boutants
       qui relient le pavillon aux hanches — la signature de l'Aventador
       vue de trois quarts arrière. */
    const r = Math.max(0, 1 - Math.pow((z + 0.86) / 0.66, 2));
    return f * 0.086 + Math.pow(r, 0.7) * 0.082;
  }

  /* Points de contrôle de la demi-section droite (9 points).
     Le point 3 « rentre » le flanc à mi-hauteur : sans lui la
     carrosserie viendrait couper les pneus dans les passages de roue.
     Repères en t : 0 sol · 0,5 épaulement · 0,75 bas de pavillon · 1 toit. */
  function halfControls(st) {
    const wF = st[1], yF = st[2], wS = st[3], yS = st[4], wT = st[5], yT = st[6];
    const dip = hoodDip(st[0]);
    return [
      [0, yF],
      [wF * 0.60, yF * 0.92],
      [wF, yF + (yS - yF) * 0.14],
      [wF * 1.02, yF + (yS - yF) * 0.52],
      [wS, yS],
      [wT + (wS - wT) * 0.46, yS + (yT - yS) * 0.60],
      [wT, yT - (yT - yS) * 0.06],
      [wT * 0.66, yT],          /* bosse d'aile / arête d'arc-boutant */
      [0, yT - dip]             /* creux médian */
    ];
  }

  /* Spline d'Hermite cardinale, t ∈ [0,1] du bas vers le haut.
     La tension (0,5 = Catmull-Rom classique) est volontairement abaissée :
     une Aventador est faite de facettes et d'arêtes vives, pas de galets. */
  const TENSION = 0.30;
  /* Points de rupture : la tangente y est annulée, ce qui produit une arête
     franche au lieu d'un raccord doux. Ce sont les lignes de caractère de
     la voiture — bas de caisse, ligne d'épaulement, arête de pavillon,
     sommet d'aile. Sans elles la caisse reste un galet. */
  const CREASE = [false, false, true, false, true, false, true, true, false];
  function halfPoint(cp, t) {
    const n = cp.length;
    const u = t * (n - 1);
    let i = Math.floor(u);
    if (i > n - 2) i = n - 2;
    const f = u - i;
    const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(n - 1, i + 2)];
    const t1 = CREASE[i] ? 0 : TENSION;
    const t2 = CREASE[i + 1] ? 0 : TENSION;
    const f2 = f * f, f3 = f2 * f;
    const h00 = 2 * f3 - 3 * f2 + 1, h10 = f3 - 2 * f2 + f;
    const h01 = -2 * f3 + 3 * f2, h11 = f3 - f2;
    const c = (a, b, cc, d) =>
      h00 * b + h10 * t1 * (cc - a) + h01 * cc + h11 * t2 * (d - b);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  }

  /* point de surface pour (z, t, côté) — sert aussi à poser vitres/prises d'air */
  function surfacePoint(z, t, side) {
    const p = halfPoint(halfControls(stationAt(z)), t);
    return new THREE.Vector3(p[0] * (side < 0 ? -1 : 1), p[1], z);
  }

  /* 10 points seulement : la section devient quasi polygonale entre les
     points de contrôle. Combiné aux points de rupture et à l'ombrage par
     groupes de lissage, cela donne les facettes de la vraie voiture —
     avec 15 points la surface se rearrondissait entre chaque arête. */
  const RING = 10;

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

    /* Le vitrage doit paraître sombre de l'extérieur — c'est le reflet du
       ciel qui s'en charge — tout en restant traversable du regard depuis
       l'habitacle. Un fond opaque réglerait le premier point et ruinerait
       le second. */
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a0e15, metalness: 0.0, roughness: 0.05,
      transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false
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
    const caliper = new THREE.MeshStandardMaterial({ color: 0xb51420, metalness: 0.45, roughness: 0.32 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xb00d18, metalness: 0.3, roughness: 0.35 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x7d1118, roughness: 0.78, metalness: 0.02 });

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
      accent, leather, headOff, headOn, drl, tail, reverse, alcantara, stitch, screen
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

  /* ------------------------------------------------------------------
     Panneau découpé à un contour exact.

     Les nappes posées sur la carrosserie (patch) suivent la surface mais
     n'ont que des contours rectangulaires : impossible d'obtenir une
     écope hexagonale ou un feu en flèche. Ici on dessine le contour point
     par point et on l'extrude — c'est du panneau, pas de la décalcomanie.
     ------------------------------------------------------------------ */
  function panel(pts, depth, mat, bevel) {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: depth === undefined ? 0.02 : depth,
      bevelEnabled: !!bevel, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1,
      curveSegments: 1
    });
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* hexagone allongé : le motif récurrent de la marque */
  function hexPts(w, h, cut) {
    const c = cut === undefined ? 0.30 : cut;
    return [
      [-w / 2, 0], [-w / 2 + w * c, h / 2], [w / 2 - w * c, h / 2],
      [w / 2, 0], [w / 2 - w * c, -h / 2], [-w / 2 + w * c, -h / 2]
    ];
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
    opts = Object.assign({ color: 0x14161a, matte: true, carbon: true, interior: true, livery: true }, opts || {});
    const M = buildMaterials(opts);
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    /* ---------- caisse ---------- */
    /* On loft directement sur les stations décrites, sans les rééchantillonner.
       Interpoler 62 coupes le long d'une spline rendait la surface
       continûment courbe : la voiture restait lisse quelles que soient les
       arêtes des sections. En reliant les stations telles quelles, chaque
       bande devient une facette — c'est le dessin réel de la voiture. Les
       intervalles trop longs sont subdivisés pour éviter les cassures
       grossières là où le galbe change vite. */
    const sections = [];
    for (let i = 0; i < STATIONS.length; i++) {
      const z0 = STATIONS[i][0];
      sections.push({ z: z0, pts: ringPoints(z0) });
      /* aucune subdivision : les stations SONT les arêtes du dessin */
    }
    /* 38° : les panneaux restent lisses, les arêtes de caractère restent
       franches — c'est ce qui distingue une carrosserie d'un savon. */
    const shell = new THREE.Mesh(U.smoothNormals(U.loft(sections, true, true), 38), M.paint);
    shell.castShadow = true; shell.receiveShadow = true;
    body.add(shell);

    /* ---------- vitrage ---------- */
    /* pare-brise : nappe sur le dessus, de la base de baie au toit */
    const wsR = new THREE.Mesh(patch(1.14, 0.30, 0.81, 1.00, 1, 0.014, 14, 7), M.glass);
    const wsL = new THREE.Mesh(patch(1.14, 0.30, 0.81, 1.00, -1, 0.014, 14, 7), M.glass);
    body.add(wsR, wsL);
    /* custodes latérales */
    body.add(new THREE.Mesh(patch(0.64, -0.42, 0.625, 0.752, 1, 0.012, 10, 5), M.glass));
    body.add(new THREE.Mesh(patch(0.64, -0.42, 0.625, 0.752, -1, 0.012, 10, 5), M.glass));
    /* lunette / capot moteur vitré */
    body.add(new THREE.Mesh(patch(-0.46, -0.92, 0.82, 1.00, 1, 0.010, 8, 5), M.glass));
    body.add(new THREE.Mesh(patch(-0.46, -0.92, 0.82, 1.00, -1, 0.010, 8, 5), M.glass));

    /* liseré noir en pourtour de pare-brise */
    for (let sd = -1; sd <= 1; sd += 2) {
      body.add(new THREE.Mesh(patch(1.19, 1.15, 0.79, 1.00, sd, 0.010, 1, 8), M.black));
      body.add(new THREE.Mesh(patch(1.16, 0.28, 0.790, 0.812, sd, 0.010, 12, 1), M.black));
    }

    /* montants et pavillon en carbone (pack SVJ) */
    const roofMat = opts.carbon ? M.carbon : M.paint;
    body.add(new THREE.Mesh(patch(0.34, -0.40, 0.90, 1.00, 1, 0.014, 8, 4), roofMat));
    body.add(new THREE.Mesh(patch(0.34, -0.40, 0.90, 1.00, -1, 0.014, 8, 4), roofMat));

    /* ---------- lignes de jonction (portes, ouvrants) ---------- */
    for (let sd = -1; sd <= 1; sd += 2) {
      /* montant avant de porte, qui remonte vers le pare-brise */
      body.add(new THREE.Mesh(patch(1.045, 1.020, 0.30, 0.64, sd, 0.0035, 1, 10), M.black));
      /* montant arrière */
      body.add(new THREE.Mesh(patch(-0.325, -0.350, 0.30, 0.62, sd, 0.0035, 1, 10), M.black));
      /* seuil de porte */
      body.add(new THREE.Mesh(patch(1.020, -0.330, 0.295, 0.310, sd, 0.0035, 14, 1), M.black));
      /* poignée encastrée */
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.030, 0.16), M.black);
      const hp = surfacePoint(-0.10, 0.52, sd);
      hd.position.copy(hp); hd.position.x += sd * 0.012;
      body.add(hd);
      /* évent derrière la roue avant */
      body.add(new THREE.Mesh(patch(0.985, 0.815, 0.31, 0.47, sd, 0.004, 5, 4), M.black));
      body.add(new THREE.Mesh(patch(0.965, 0.835, 0.33, 0.45, sd, 0.010, 5, 4), M.mesh));
    }
    /* jonction de capot */
    body.add(new THREE.Mesh(patch(1.185, 1.160, 0.80, 1.00, 1, 0.004, 1, 8), M.black));
    body.add(new THREE.Mesh(patch(1.185, 1.160, 0.80, 1.00, -1, 0.004, 1, 8), M.black));

    /* ---------- écopes latérales hexagonales ---------- */
    /* Écope latérale : hexagone découpé au contour, encadrement carbone
       en relief, fond noir en retrait et lamelles verticales. Une nappe
       rectangulaire posée sur le flanc ne pouvait pas donner cette forme. */
    const sideIntake = (side) => {
      const g = new THREE.Group();
      const cx = side * 0.955, cy = 0.455, cz = -0.62;
      const put = (m, dx) => {
        m.rotation.y = side * Math.PI / 2;
        m.position.set(cx + side * dx, cy, cz);
        g.add(m);
      };
      /* fond noir, enfoncé */
      put(panel(hexPts(0.86, 0.40, 0.26), 0.02, M.black), -0.085);
      /* encadrement carbone en relief */
      const ring = new THREE.Shape();
      const outer = hexPts(0.98, 0.50, 0.26), inner = hexPts(0.86, 0.40, 0.26);
      ring.moveTo(outer[0][0], outer[0][1]);
      for (let i = 1; i < outer.length; i++) ring.lineTo(outer[i][0], outer[i][1]);
      ring.closePath();
      const hole = new THREE.Path();
      hole.moveTo(inner[0][0], inner[0][1]);
      for (let i = 1; i < inner.length; i++) hole.lineTo(inner[i][0], inner[i][1]);
      hole.closePath();
      ring.holes.push(hole);
      const rg = new THREE.ExtrudeGeometry(ring, {
        depth: 0.05, bevelEnabled: false, curveSegments: 1
      });
      const rm = new THREE.Mesh(rg, opts.carbon ? M.carbon : M.black);
      rm.castShadow = true;
      rm.rotation.y = side * Math.PI / 2;
      rm.position.set(cx + side * 0.006, cy, cz);
      g.add(rm);
      /* lamelles verticales dans le creux */
      for (let i = 0; i < 5; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.30, 0.028), M.mesh);
        f.position.set(cx - side * 0.045, cy, cz - 0.30 + i * 0.15);
        g.add(f);
      }
      return g;
    };
    body.add(sideIntake(1), sideIntake(-1));

    /* Livrée : filet rouge le long du bas de caisse, accent sur la lame
       avant et marquage sur la custode — comme sur la voiture de référence. */
    if (opts.livery) {
      for (let sd = -1; sd <= 1; sd += 2) {
        body.add(new THREE.Mesh(patch(1.10, -1.45, 0.215, 0.245, sd, 0.008, 14, 2), M.accent));
        body.add(new THREE.Mesh(patch(-0.95, -1.35, 0.62, 0.70, sd, 0.009, 6, 3), M.accent));
      }
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.016, 0.06), M.accent);
      lip.position.set(0, 0.100, 2.40); lip.rotation.x = -0.06;
      body.add(lip);
    }

    /* écopes de custode (au-dessus, style Aventador) */
    body.add(new THREE.Mesh(patch(-0.34, -0.86, 0.56, 0.66, 1, 0.006, 7, 3), M.black));
    body.add(new THREE.Mesh(patch(-0.34, -0.86, 0.56, 0.66, -1, 0.006, 7, 3), M.black));

    /* ---------- boucliers ---------- */
    const cfPre = opts.carbon ? M.carbon : M.black;
    /* Bandeau noir sur toute la largeur du bouclier, puis naseaux creusés :
       vu de face, la SVJ est une lame noire surmontée du nez peint. */
    /* Vu de face, la SVJ est une lame noire surmontée du nez peint : tout
       ce qui est sous la ligne de phares est bouclier, avec une bouche
       centrale et deux écopes trapézoïdales à lamelles. */
    /* Masse noire enveloppante sur tout le bas de face */
    for (let sd = -1; sd <= 1; sd += 2) {
      body.add(new THREE.Mesh(patch(2.46, 1.88, 0.030, 0.40, sd, 0.003, 12, 7), M.black));
    }

    /* La face avant est plate : on y découpe les ouvertures au contour,
       comme sur la voiture. Une nappe rectangulaire ne pouvait donner ni
       la bouche hexagonale ni les écopes trapézoïdales. */
    /* Le bouclier n'est pas un plan : c'est une face centrale et deux
       joues orientées vers l'extérieur. Trois facettes valent mieux qu'un
       aplat, qui se noyait dans le galbe du nez. */
    const mouthZ = 2.462, cheekZ = 2.352;

    /* bouche centrale hexagonale, creusée */
    (function () {
      const m = panel(hexPts(0.74, 0.235, 0.26), 0.11, M.mesh);
      m.position.set(0, 0.258, mouthZ - 0.11);
      body.add(m);
    })();
    /* encadrement carbone et lame horizontale */
    (function () {
      const outer = hexPts(0.86, 0.315, 0.26), inner = hexPts(0.74, 0.235, 0.26);
      const sh = new THREE.Shape();
      sh.moveTo(outer[0][0], outer[0][1]);
      for (let i = 1; i < outer.length; i++) sh.lineTo(outer[i][0], outer[i][1]);
      sh.closePath();
      const hl = new THREE.Path();
      hl.moveTo(inner[0][0], inner[0][1]);
      for (let i = 1; i < inner.length; i++) hl.lineTo(inner[i][0], inner[i][1]);
      hl.closePath();
      sh.holes.push(hl);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {
        depth: 0.055, bevelEnabled: false, curveSegments: 1
      }), cfPre);
      m.castShadow = true;
      m.position.set(0, 0.258, mouthZ - 0.055);
      body.add(m);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.036, 0.13), cfPre);
      bl.position.set(0, 0.258, mouthZ - 0.062);
      body.add(bl);
    })();

    /* joues : écopes trapézoïdales tournées vers l'extérieur */
    for (let sd = -1; sd <= 1; sd += 2) {
      const cxF = sd * 0.640, ang = sd * 0.26;
      const place = (pts, depth, mat, back) => {
        const m = panel(pts, depth, mat);
        m.rotation.y = ang;
        const d = depth + back;
        m.position.set(cxF + Math.sin(ang) * d, 0.252, cheekZ - Math.cos(ang) * d);
        body.add(m);
      };
      place([[-0.275, -0.165], [0.275, -0.165], [0.298, 0.155], [-0.298, 0.155]], 0.05, cfPre, 0);
      place([[-0.235, -0.130], [0.235, -0.130], [0.255, 0.120], [-0.255, 0.120]], 0.09, M.mesh, 0.014);
      for (let k = -1; k <= 1; k++) {
        const finF = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.20, 0.07), M.mesh);
        finF.rotation.y = ang;
        finF.position.set(cxF + Math.cos(ang) * k * 0.13 + Math.sin(ang) * 0.05,
          0.252, cheekZ - Math.cos(ang) * 0.05 + Math.sin(ang) * k * 0.13);
        body.add(finF);
      }
    }

    /* Bouclier avant SVJ : large bouche noire, splitter proéminent aux
       extrémités relevées, double étage de dérives latérales. */
    const splitter = new THREE.Group();
    const cf = cfPre;
    /* lame principale */
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.038, 0.40), cf);
    sp.position.set(0, 0.094, 2.13);
    sp.rotation.x = -0.06;
    splitter.add(sp);
    /* extrémités relevées */
    for (let s = -1; s <= 1; s += 2) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.042, 0.30), cf);
      tip.position.set(s * 0.86, 0.126, 2.06);
      tip.rotation.set(-0.06, 0, s * 0.30);
      splitter.add(tip);
      /* dérives : deux étages, comme sur la voiture */
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.115, 0.028), cf);
      c.position.set(s * 0.84, 0.215, 2.06);
      c.rotation.set(0.22, s * 0.24, s * 0.12);
      splitter.add(c);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.095, 0.026), cf);
      c2.position.set(s * 0.90, 0.345, 1.95);
      c2.rotation.set(0.18, s * 0.28, s * 0.10);
      splitter.add(c2);
      /* joue verticale du bouclier */
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.24, 0.34), M.black);
      cheek.position.set(s * 0.955, 0.26, 1.98);
      cheek.rotation.y = s * 0.10;
      splitter.add(cheek);
    }
    /* séparateur central de la grande bouche */
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
      /* Le boîtier est une grande surface sombre qui enveloppe le coin
         d'aile et file vers l'arrière ; les branches lumineuses vivent
         DEDANS. Des barres posées sur la carrosserie ne ressemblent à
         rien — c'est le creux sombre qui fait l'optique. */
      g.add(new THREE.Mesh(patch(2.34, 1.56, 0.36, 0.84, side, 0.002, 12, 8), M.black));
      const base = new THREE.Mesh(patch(2.30, 1.66, 0.40, 0.78, side, 0.008, 11, 7), M.headOff);
      g.add(base);
      g.add(new THREE.Mesh(patch(2.26, 1.62, 0.775, 0.840, side, 0.013, 9, 2),
        opts.carbon ? M.carbon : M.paint));
      /* branches du Y */
      /* Le Y couché est la signature de la SVJ : deux branches ouvertes
         vers le haut, réunies par un trait qui plonge vers le nez. */
      /* Le Y doit se lire DE FACE : les branches sont posées sur la
         surface avant de l'aile, pas sur son dessus. */
      const bar = new THREE.BoxGeometry(0.030, 0.034, 0.40);
      const b1 = new THREE.Mesh(bar, M.drl);
      b1.position.set(side * 0.862, 0.520, 2.055); b1.rotation.set(0.10, side * 0.42, side * 0.52);
      const b2 = new THREE.Mesh(bar, M.drl);
      b2.position.set(side * 0.876, 0.432, 2.045); b2.rotation.set(-0.08, side * 0.44, -side * 0.34);
      const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, 0.34), M.drl);
      b3.position.set(side * 0.735, 0.428, 2.220); b3.rotation.set(0.02, side * 0.72, side * 0.05);
      const b4 = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.026, 0.24), M.drl);
      b4.position.set(side * 0.912, 0.492, 1.930); b4.rotation.set(0.06, side * 0.30, side * 0.30);
      g.add(b1, b2, b3, b4);
      drls.push(b1, b2, b3, b4);
      const proj = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), M.headOff);
      proj.position.set(side * 0.828, 0.470, 2.140);
      g.add(proj);
      headlights.push(proj);
      return g;
    };
    body.add(mkY(1), mkY(-1));

    /* ---------- capot : deux grands évents + nervure centrale ---------- */
    for (let s = -1; s <= 1; s += 2) {
      body.add(new THREE.Mesh(patch(1.98, 1.46, 0.855, 0.985, s, 0.005, 8, 4), M.black));
      body.add(new THREE.Mesh(patch(1.94, 1.50, 0.870, 0.975, s, 0.010, 8, 4), M.mesh));
      /* arête de l'aile, qui souligne le bombé au-dessus de la roue */
      body.add(new THREE.Mesh(patch(2.05, 1.15, 0.795, 0.815, s, 0.007, 10, 2),
        opts.carbon ? M.carbon : M.black));
    }
    /* nervure centrale du capot */
    body.add(new THREE.Mesh(patch(2.28, 1.20, 0.993, 1.000, 1, 0.008, 10, 2), M.black));
    body.add(new THREE.Mesh(patch(2.28, 1.20, 0.993, 1.000, -1, 0.008, 10, 2), M.black));

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
    /* Le capot moteur n'est pas un semis de pastilles : ce sont deux
       grands panneaux de grille hexagonale encadrés de carbone, séparés
       par une nervure centrale, avec le V12 visible en dessous. */
    const deckY = 0.965, deckZ = -0.815;
    for (let sd = -1; sd <= 1; sd += 2) {
      const grid = panel(hexPts(0.62, 0.50, 0.24), 0.02, M.mesh);
      grid.rotation.x = -Math.PI / 2 + 0.10;
      grid.position.set(sd * 0.335, deckY - 0.035, deckZ);
      deck.add(grid);

      /* encadrement carbone en relief */
      const outer = hexPts(0.72, 0.60, 0.24), inner = hexPts(0.62, 0.50, 0.24);
      const sh = new THREE.Shape();
      sh.moveTo(outer[0][0], outer[0][1]);
      for (let i = 1; i < outer.length; i++) sh.lineTo(outer[i][0], outer[i][1]);
      sh.closePath();
      const hl = new THREE.Path();
      hl.moveTo(inner[0][0], inner[0][1]);
      for (let i = 1; i < inner.length; i++) hl.lineTo(inner[i][0], inner[i][1]);
      hl.closePath();
      sh.holes.push(hl);
      const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {
        depth: 0.04, bevelEnabled: false, curveSegments: 1
      }), opts.carbon ? M.carbon : M.paint);
      ring.castShadow = true;
      ring.rotation.x = -Math.PI / 2 + 0.10;
      ring.position.set(sd * 0.335, deckY - 0.035, deckZ);
      deck.add(ring);

      /* barreaux de grille */
      for (let k = -2; k <= 2; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.44), M.mesh);
        bar.position.set(sd * 0.335 + k * 0.115, deckY - 0.012, deckZ);
        deck.add(bar);
      }
    }
    /* nervure centrale peinte */
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.66), M.paint);
    spine.position.set(0, deckY - 0.030, deckZ);
    deck.add(spine);

    body.add(deck);
    /* couvre-culasses / plénum entrevus */
    for (let s = -1; s <= 1; s += 2) {
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.62), M.chrome);
      cam.position.set(s * 0.30, 0.845, -0.815);
      deck.add(cam);
    }

    /* ---------- aileron SVJ ---------- */
    const wing = new THREE.Group();
    const wingMat = opts.carbon ? M.carbon : M.paint;
    /* L'aileron SVJ est porté par deux pylônes verticaux plantés au ras
       de la poupe, la pale bien au-dessus du capot moteur — et non par
       des jambettes courtes noyées dans la carrosserie. */
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.050, 0.40), wingMat);
    blade.castShadow = true;
    const flap = new THREE.Group();
    flap.add(blade);
    /* bord de fuite relevé */
    const gurney = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.055, 0.022), wingMat);
    gurney.position.set(0, 0.030, -0.19);
    flap.add(gurney);
    flap.position.set(0, 1.118, -2.15);
    flap.rotation.x = -0.11;
    wing.add(flap);
    for (let s = -1; s <= 1; s += 2) {
      /* joue latérale */
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.30, 0.50), wingMat);
      ep.position.set(s * 0.828, 1.128, -2.15);
      wing.add(ep);
      /* pylône vertical */
      const py = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.24), wingMat);
      py.position.set(s * 0.455, 0.978, -2.11);
      py.rotation.x = 0.12;
      wing.add(py);
      /* embase sur le capot moteur */
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.30), wingMat);
      foot.position.set(s * 0.455, 0.848, -2.07);
      wing.add(foot);
    }
    body.add(wing);

    /* ---------- feux arrière en Y ---------- */
    const tails = [];
    const mkTail = (side) => {
      const g = new THREE.Group();
      /* Feu en flèche : un contour unique découpé, comme sur la voiture,
         au lieu de trois barreaux posés côte à côte. */
      const arrow = [
        [0, 0.075], [0.30, 0.150], [0.34, 0.098], [0.075, 0], [0.34, -0.098],
        [0.30, -0.150], [0, -0.075], [-0.02, 0]
      ];
      /* L'extrusion part du plan z=0 vers +Z : la face visible depuis
         l'arrière est donc celle d'origine, sans rotation. Le miroir se
         fait par l'échelle seule — rotation ET échelle se seraient
         annulées d'un côté. */
      const lens = panel(arrow, 0.045, M.tail, true);
      lens.scale.x = side;
      lens.position.set(side * 0.335, 0.706, -2.392);
      g.add(lens);
      tails.push(lens);
      /* embase noire en retrait */
      const backing = panel([
        [-0.03, 0.19], [0.38, 0.19], [0.40, 0.02], [0.12, -0.02],
        [0.40, -0.06], [0.38, -0.19], [-0.03, -0.19]
      ], 0.02, M.black);
      backing.scale.x = side;
      backing.position.set(side * 0.335, 0.706, -2.404);
      g.add(backing);
      return g;
    };
    body.add(mkTail(1), mkTail(-1));
    const revLamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), M.reverse);
    revLamp.position.set(0, 0.60, -2.42);
    body.add(revLamp);

    /* ---------- diffuseur ---------- */
    const diff = new THREE.Group();
    /* Diffuseur : une plaque dont les canaux sont réellement ajourés,
       avec les cloisons derrière. Une boîte plus des ailettes posées
       devant ne creusait rien. */
    const dW = 1.46, dH = 0.255;
    const face = new THREE.Shape();
    face.moveTo(-dW / 2, -dH / 2);
    face.lineTo(dW / 2, -dH / 2);
    face.lineTo(dW / 2 - 0.06, dH / 2);
    face.lineTo(-dW / 2 + 0.06, dH / 2);
    face.closePath();
    for (let i = -2; i <= 2; i++) {
      const cw = 0.20, cx = i * 0.255;
      const hl = new THREE.Path();
      hl.moveTo(cx - cw / 2, -dH / 2 + 0.045);
      hl.lineTo(cx + cw / 2, -dH / 2 + 0.045);
      hl.lineTo(cx + cw / 2, dH / 2 - 0.045);
      hl.lineTo(cx - cw / 2, dH / 2 - 0.045);
      hl.closePath();
      face.holes.push(hl);
    }
    const dm = new THREE.Mesh(new THREE.ExtrudeGeometry(face, {
      depth: 0.30, bevelEnabled: false, curveSegments: 1
    }), opts.carbon ? M.carbon : M.black);
    dm.castShadow = true;
    dm.position.set(0, 0.322, -2.36);
    dm.rotation.x = -0.24;
    diff.add(dm);
    /* fond des canaux */
    const dBack = new THREE.Mesh(new THREE.BoxGeometry(dW, dH, 0.03), M.black);
    dBack.position.set(0, 0.322, -2.11);
    dBack.rotation.x = -0.24;
    diff.add(dBack);
    /* cloisons verticales prolongées vers l'arrière */
    for (let i = -3; i <= 3; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.026, dH * 0.92, 0.34), opts.carbon ? M.carbon : M.black);
      st.position.set(i * 0.255 + 0.1275, 0.322, -2.23);
      st.rotation.x = -0.24;
      diff.add(st);
    }
    body.add(diff);

    /* ---------- ligne Gintani : sortie centrale titane ---------- */
    const exhaust = new THREE.Group();
    const tips = [];
    /* Ligne Gintani : deux tubes de gros diamètre, très écartés et
       montés haut, sur un fond noir mat — pas de silencieux. */
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.10), M.black);
    shroud.position.set(0, 0.585, -2.37);
    exhaust.add(shroud);
    for (let s = -1; s <= 1; s += 2) {
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.104, 0.30, 24, 1, true), M.titanium);
      outer.rotation.x = Math.PI / 2;
      outer.position.set(s * 0.185, 0.585, -2.40);
      exhaust.add(outer);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.100, 0.011, 8, 24), M.titanium);
      lip.position.set(s * 0.185, 0.585, -2.545);
      exhaust.add(lip);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.094, 24), M.black);
      inner.position.set(s * 0.185, 0.585, -2.32);
      inner.rotation.y = Math.PI;
      exhaust.add(inner);
      tips.push(new THREE.Vector3(s * 0.185, 0.585, -2.60));
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

    /* ---------------- habitacle ----------------
       Vu depuis la caméra intérieure, la coque de carrosserie est
       éliminée (faces arrière) : il faut donc bâtir un intérieur complet —
       pavillon, contre-portes, plancher, cloison moteur — sinon on voit
       le décor à travers la voiture.                                     */
    let steerWheel = null, clusterCanvas = null, clusterTex = null, needleRpm = 0;
    if (opts.interior) {
      const cab = new THREE.Group();

      const quiltRed = U.toTexture(U.quiltCanvas(104, 16, 24), 3, 2, 8);
      const quiltBlk = U.toTexture(U.quiltCanvas(24, 24, 28), 3, 3, 8);
      const seatMat = new THREE.MeshStandardMaterial({ map: quiltRed, roughness: 0.70, metalness: 0.02 });
      const trimMat = new THREE.MeshStandardMaterial({
        map: quiltBlk, roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide
      });
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0x0c0d10, roughness: 0.96, metalness: 0.02, side: THREE.DoubleSide
      });
      const dashMat = new THREE.MeshStandardMaterial({
        color: 0x121317, roughness: 0.92, metalness: 0.03, side: THREE.DoubleSide
      });
      const carbonIn = M.carbon;

      /* ---- coque : pavillon, contre-portes, plancher, cloison ---- */
      for (let sd = -1; sd <= 1; sd += 2) {
        /* pavillon : commence derrière la traverse de pare-brise, sinon il
           recouvrirait le vitrage */
        cab.add(new THREE.Mesh(patch(0.42, -0.48, 0.84, 1.00, sd, -0.028, 10, 5), shellMat));
        /* contre-porte : sous la ceinture de caisse uniquement */
        cab.add(new THREE.Mesh(patch(0.98, -0.40, 0.27, 0.49, sd, -0.045, 12, 6), trimMat));
        /* accoudoir */
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.070, 0.60), M.leather);
        const ap = surfacePoint(0.16, 0.47, sd);
        arm.position.copy(ap); arm.position.x -= sd * 0.075;
        cab.add(arm);
      }
      /* montants A : deux jambes de force entre la baie et le pavillon */
      const beam = function (ax, ay, az, bx, by, bz, r, mat) {
        const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
        const d = new THREE.Vector3().subVectors(b, a);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.25, d.length(), 8), mat);
        m.position.copy(a).addScaledVector(d, 0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        return m;
      };
      for (let sd = -1; sd <= 1; sd += 2) {
        cab.add(beam(sd * 0.795, 0.715, 1.09, sd * 0.585, 1.088, 0.415, 0.031, shellMat));
      }
      /* traverse de pavillon */
      cab.add(beam(-0.585, 1.088, 0.415, 0.585, 1.088, 0.415, 0.026, shellMat));

      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.03, 1.55), shellMat);
      floor.position.set(0, 0.185, 0.02);
      cab.add(floor);
      /* cloison moteur, habillée d'alcantara, avec la vitre du V12 */
      const bulk = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.68, 0.05), trimMat);
      bulk.position.set(0, 0.56, -0.52);
      cab.add(bulk);
      const bulkGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.30), M.glass);
      bulkGlass.position.set(0, 0.74, -0.495);
      cab.add(bulkGlass);

      /* ---- planche de bord ---- */
      /* corps principal, incliné vers le conducteur */
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.26, 0.42), dashMat);
      dash.position.set(0, 0.632, 0.70); dash.rotation.x = -0.24;
      cab.add(dash);
      /* casquette : visière au-dessus de l'écran, elle ne doit pas le masquer */
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.022, 0.15), dashMat);
      hood.position.set(-0.36, 0.856, 0.474); hood.rotation.x = 0.30;
      cab.add(hood);
      for (let k = -1; k <= 1; k += 2) {
        const cheekH = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.10, 0.14), dashMat);
        cheekH.position.set(-0.36 + k * 0.185, 0.808, 0.480); cheekH.rotation.x = 0.30;
        cab.add(cheekH);
      }
      /* jonc carbone traversant */
      const trimBar = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.045, 0.05), carbonIn);
      trimBar.position.set(0, 0.618, 0.516); trimBar.rotation.x = -0.20;
      cab.add(trimBar);

      /* ---- combiné numérique (texture mise à jour en jeu) ---- */
      clusterCanvas = U.canvas(512, 256);
      clusterTex = new THREE.CanvasTexture(clusterCanvas);
      clusterTex.colorSpace = THREE.SRGBColorSpace;
      const clusterMat = new THREE.MeshBasicMaterial({ map: clusterTex, toneMapped: false });
      const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.152), clusterMat);
      cluster.position.set(-0.36, 0.802, 0.472);
      /* l'écran doit regarder le pilote, pas le pare-brise */
      cluster.lookAt(-0.36, 0.872, -0.03);
      cab.add(cluster);

      /* ---- aérateurs hexagonaux ---- */
      const ventGeo = new THREE.CylinderGeometry(0.043, 0.043, 0.030, 6);
      [[-0.66, 0.686, 0.548], [0.66, 0.686, 0.548],
       [-0.075, 0.640, 0.548], [0.075, 0.640, 0.548]].forEach(function (p) {
        const v = new THREE.Mesh(ventGeo, M.mesh);
        v.position.set(p[0], p[1], p[2]);
        v.rotation.set(Math.PI / 2 - 0.26, 0, 0);
        cab.add(v);
      });

      /* ---- console centrale : boutons hexagonaux + cache rouge du démarreur ---- */
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.34, 0.10), carbonIn);
      stack.position.set(0, 0.578, 0.480); stack.rotation.x = -0.34;
      cab.add(stack);
      const btnGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.012, 6);
      for (let r = 0; r < 3; r++) {
        for (let c = -1; c <= 1; c++) {
          const b = new THREE.Mesh(btnGeo, M.chrome);
          b.position.set(c * 0.075, 0.536 - r * 0.058, 0.520 - r * 0.020);
          b.rotation.x = Math.PI / 2 - 0.34;
          cab.add(b);
        }
      }
      /* le cache basculant rouge du bouton de démarrage : signature Lamborghini */
      const coverHinge = new THREE.Group();
      coverHinge.position.set(0, 0.648, 0.448);
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.075), M.accent);
      cover.position.set(0, 0, 0.036);
      coverHinge.add(cover);
      coverHinge.rotation.x = -0.30;
      cab.add(coverHinge);
      const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.010, 16), M.accent);
      startBtn.position.set(0, 0.636, 0.480); startBtn.rotation.x = Math.PI / 2 - 0.34;
      cab.add(startBtn);

      /* ---- tunnel central ---- */
      const tun = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.26, 1.05), carbonIn);
      tun.position.set(0, 0.330, 0.02);
      cab.add(tun);
      const tunTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.95), M.leather);
      tunTop.position.set(0, 0.462, 0.02);
      cab.add(tunTop);

      /* ---- volant à méplats haut et bas ---- */
      steerWheel = new THREE.Group();
      const rimPts = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const p = 3.4;
        rimPts.push(new THREE.Vector3(
          Math.sign(ca) * Math.pow(Math.abs(ca), 2 / p) * 0.172,
          Math.sign(sa) * Math.pow(Math.abs(sa), 2 / p) * 0.152, 0));
      }
      const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
      const rim = new THREE.Mesh(new THREE.TubeGeometry(rimCurve, 72, 0.020, 8, true), M.alcantara);
      steerWheel.add(rim);
      /* repère 12 h rouge */
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.030, 0.024), M.accent);
      mark.position.set(0, 0.152, 0.012);
      steerWheel.add(mark);
      /* branches */
      for (let i = 0; i < 3; i++) {
        const a = i === 0 ? Math.PI : (i === 1 ? -0.35 : Math.PI + 0.35);
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.030, 0.018), carbonIn);
        sp.position.set(Math.cos(a) * 0.088, Math.sin(a) * 0.082, 0.004);
        sp.rotation.z = a;
        steerWheel.add(sp);
      }
      const hubC = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.032, 6), M.black);
      hubC.rotation.x = Math.PI / 2;
      steerWheel.add(hubC);
      /* palettes fixes derrière le volant */
      for (let sd = -1; sd <= 1; sd += 2) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.115, 0.014), carbonIn);
        pad.position.set(sd * 0.115, -0.020, -0.055);
        pad.rotation.z = sd * 0.18;
        steerWheel.add(pad);
      }
      steerWheel.position.set(-0.36, 0.664, 0.415);
      steerWheel.rotation.x = -0.40;
      cab.add(steerWheel);
      /* colonne */
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 10), M.black);
      col.position.set(-0.36, 0.719, 0.505); col.rotation.x = Math.PI / 2 - 0.40;
      cab.add(col);

      /* ---- sièges baquets carbone à sellerie matelassée ---- */
      for (let sd = -1; sd <= 1; sd += 2) {
        const seat = new THREE.Group();
        /* coque */
        const shell = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.68, 0.10), carbonIn);
        shell.position.set(0, 0.66, -0.30); shell.rotation.x = 0.16;
        const shellB = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.09, 0.52), carbonIn);
        shellB.position.set(0, 0.310, -0.05);
        seat.add(shell, shellB);
        /* assise et dossier en cuir rouge matelassé */
        const cush = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.075, 0.44), seatMat);
        cush.position.set(0, 0.372, -0.05);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.075), seatMat);
        back.position.set(0, 0.615, -0.255); back.rotation.x = 0.16;
        seat.add(cush, back);
        /* maintiens latéraux */
        for (let k = -1; k <= 1; k += 2) {
          const bol = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.44, 0.10), seatMat);
          bol.position.set(k * 0.205, 0.600, -0.235); bol.rotation.set(0.16, 0, -k * 0.10);
          seat.add(bol);
          const bolS = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.40), seatMat);
          bolS.position.set(k * 0.175, 0.395, -0.06);
          seat.add(bolS);
        }
        /* appuie-tête intégré, avec le passage de harnais */
        const hr = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.19, 0.085), seatMat);
        hr.position.set(0, 0.905, -0.315); hr.rotation.x = 0.16;
        seat.add(hr);
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.11), M.black);
        slot.position.set(0, 0.800, -0.300);
        seat.add(slot);
        seat.position.set(sd * 0.36, 0, 0.02);
        cab.add(seat);
      }

      /* ---- rétroviseur intérieur et console de pavillon ---- */
      const rvm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.030), M.black);
      rvm.position.set(0, 1.045, 0.60); rvm.rotation.x = 0.10;
      cab.add(rvm);
      const roofCons = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.028, 0.34), M.alcantara);
      roofCons.position.set(0, 1.062, 0.32);
      cab.add(roofCons);

      /* ---- pédalier ---- */
      for (let k = 0; k < 3; k++) {
        const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.130, 0.018), M.mesh);
        pedal.position.set(-0.52 + k * 0.110, 0.262, 0.790);
        pedal.rotation.x = -0.30;
        cab.add(pedal);
      }

      /* Petite lumière d'ambiance : l'habitacle d'une voiture fermée ne
         reçoit presque rien du soleil, il faut l'aider pour qu'il se lise. */
      const cabinLight = new THREE.PointLight(0xffe9d0, 0.85, 3.2, 2.0);
      cabinLight.position.set(0, 1.00, 0.30);
      cab.add(cabinLight);

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
      sp.scale.set(0.55, 0.55, 1);
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
      setHeadlights: function (on, night, seenFromFront) {
        M.drl.emissiveIntensity = on ? 3.2 : 1.1;
        M.headOn.emissiveIntensity = on ? 4.0 : 0;
        P.headlights.forEach(function (h) { h.material = on ? M.headOn : M.headOff; });
        const p = on ? (night ? 150 : 55) : 0;
        beamL.intensity = p; beamR.intensity = p;
        /* Le halo est un panneau toujours face caméra : sans cette
           condition il traversait la carrosserie et brillait derrière. */
        const show = on && night && seenFromFront !== false;
        halos.forEach(function (h) { h.material.opacity = show ? 0.42 : 0; });
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
      /* Combiné TFT du tableau de bord : redessiné en jeu, visible depuis
         la caméra intérieure. Même information que le HUD, mais dans la
         voiture — c'est ce que voit réellement le pilote. */
      updateCluster: function (st) {
        if (!clusterCanvas) return;
        const g = clusterCanvas.getContext('2d');
        const W = clusterCanvas.width, H = clusterCanvas.height;
        needleRpm += (st.rpm - needleRpm) * 0.35;
        g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);

        /* compte-tours circulaire */
        const cx = 160, cy = 132, R = 104;
        const A0 = Math.PI * 0.78, A1 = Math.PI * 2.22;
        g.lineWidth = 15;
        g.strokeStyle = 'rgba(255,255,255,.09)';
        g.beginPath(); g.arc(cx, cy, R, A0, A1); g.stroke();
        const aRed = A0 + (A1 - A0) * (8500 / 9000);
        g.strokeStyle = 'rgba(255,45,45,.30)';
        g.beginPath(); g.arc(cx, cy, R, aRed, A1); g.stroke();
        const aNow = A0 + (A1 - A0) * Math.max(0, Math.min(1, needleRpm / 9000));
        const grd = g.createLinearGradient(cx - R, 0, cx + R, 0);
        grd.addColorStop(0, '#7fe0a0'); grd.addColorStop(0.68, '#ffd15a'); grd.addColorStop(1, '#ff3b30');
        g.strokeStyle = grd;
        g.beginPath(); g.arc(cx, cy, R, A0, Math.max(A0 + 0.01, aNow)); g.stroke();
        g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let r = 0; r <= 9; r++) {
          const a = A0 + (A1 - A0) * (r / 9);
          g.fillStyle = r >= 8.5 ? '#ff6a60' : 'rgba(226,232,240,.80)';
          g.fillText(String(r), cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30));
        }

        /* rapport engagé au centre */
        g.fillStyle = '#ffffff';
        g.font = 'bold 66px sans-serif';
        g.fillText(st.gear === 0 ? 'N' : st.gear < 0 ? 'R' : String(st.gear), cx, cy + 6);

        /* vitesse */
        g.textAlign = 'right';
        g.fillStyle = '#ffffff'; g.font = 'bold 74px sans-serif';
        g.fillText(String(Math.round(st.kmh)), 462, 118);
        g.fillStyle = 'rgba(150,160,172,.9)'; g.font = '600 16px sans-serif';
        g.fillText('km/h', 462, 162);

        /* mode et témoins */
        g.textAlign = 'left';
        g.fillStyle = '#c8a44a'; g.font = 'bold 17px sans-serif';
        g.fillText(st.mode || 'CORSA', 300, 214);
        if (st.tc) { g.fillStyle = '#ffc32e'; g.fillText('TC', 420, 214); }
        if (st.abs) { g.fillStyle = '#ffc32e'; g.fillText('ABS', 452, 214); }

        /* bandeau de passage de rapport */
        const frac = Math.max(0, Math.min(1, (needleRpm - 5600) / 3100));
        for (let i = 0; i < 12; i++) {
          const on = i < Math.round(frac * 12);
          g.fillStyle = !on ? 'rgba(255,255,255,.07)'
            : (i < 5 ? '#25d366' : i < 9 ? '#ffc32e' : '#ff2d2d');
          g.fillRect(20 + i * 25, 12, 19, 8);
        }
        clusterTex.needsUpdate = true;
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
