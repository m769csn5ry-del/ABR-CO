/* =============================================================
   vehicle.js — dynamique véhicule

   Corps rigide 6 ddl + 4 roues suspendues (modèle « raycast »).
   Modèle de pneu : formule magique de Pacejka en glissement combiné
   (ellipse d'adhérence via glissement normalisé), sensibilité à la
   charge et longueur de relaxation.
   Transmission : V12 atmosphérique -> embrayage -> boîte 7 rapports
   -> transfert intégral -> différentiels autobloquants.
   Aérodynamique : appui avant/arrière + ALA (aileron actif).

   Chiffres de référence (Aventador SVJ) :
     1 525 kg à sec · 770 ch à 8 500 tr/min · 720 Nm à 6 750
     rupteur 8 700 · 0-100 en 2,8 s · 350 km/h · 2 700 mm d'empattement
   ============================================================= */
(function (global) {
  'use strict';

  const V3 = THREE.Vector3;

  /* -------- courbe de couple moteur (Nm à pleine charge) -------- */
  const TORQUE = [
    [700, 300], [1000, 400], [1500, 480], [2000, 525], [2500, 560],
    [3000, 588], [3500, 610], [4000, 632], [4500, 652], [5000, 668],
    [5500, 690], [6000, 705], [6500, 718], [6750, 720], [7000, 714],
    [7500, 700], [8000, 680], [8500, 636], [8700, 596], [9000, 480]
  ];
  function torqueAt(rpm) {
    if (rpm <= TORQUE[0][0]) return TORQUE[0][1];
    for (let i = 1; i < TORQUE.length; i++) {
      if (rpm <= TORQUE[i][0]) {
        const a = TORQUE[i - 1], b = TORQUE[i];
        return U.lerp(a[1], b[1], (rpm - a[0]) / (b[0] - a[0]));
      }
    }
    return 0;
  }

  /* -------- formule magique normalisée : pic en s = 1 -------- */
  const MF_B = 1.86, MF_C = 1.55, MF_E = 0.35;
  function magic(s) {
    const x = MF_B * s;
    return Math.sin(MF_C * Math.atan(x - MF_E * (x - Math.atan(x))));
  }

  const SURFACE_MU = { asphalt: 1.00, kerb: 0.92, grass: 0.42, dirt: 0.55, sand: 0.38 };
  const SURFACE_RR = { asphalt: 0.014, kerb: 0.018, grass: 0.075, dirt: 0.055, sand: 0.11 };

  function Vehicle(world) {
    this.world = world;

    /* ------------------- masses & inerties ------------------- */
    this.mass = 1625;                 /* en ordre de marche + pilote */
    this.cgHeight = 0.44;
    this.wheelbase = 2.70;
    this.weightFront = 0.43;          /* répartition 43 / 57 */
    const a = this.wheelbase * (1 - this.weightFront);   /* CG -> essieu avant */
    const b = this.wheelbase * this.weightFront;         /* CG -> essieu arrière */
    this.a = a; this.b = b;
    /* inerties principales (kg·m²), corrigées : masses centrales */
    this.I = new V3(2510, 2810, 640);   /* tangage(X), lacet(Y), roulis(Z) */

    /* ------------------- état ------------------- */
    this.pos = new V3(0, 1, 0);
    this.quat = new THREE.Quaternion();
    this.vel = new V3();
    this.angVel = new V3();
    this.up = new V3(0, 1, 0);
    this.forward = new V3(0, 0, 1);
    this.right = new V3(1, 0, 0);

    /* ------------------- roues ------------------- */
    const L0 = 0.20;                 /* longueur libre de suspension */
    this.springF = 62000; this.springR = 74000;
    this.dampC = 4200; this.dampR = 6600;    /* détente > compression */
    this.arbF = 26000; this.arbR = 32000;    /* barres antiroulis */
    const staticF = (this.mass * 9.81 * this.weightFront / 2) / this.springF;
    const staticR = (this.mass * 9.81 * (1 - this.weightFront) / 2) / this.springR;

    const mk = (x, z, r, w, front) => ({
      /* géométrie */
      hard: new V3(x, r - this.cgHeight + L0 - (front ? staticF : staticR), z),
      radius: r, width: w, front: front,
      L0: L0, maxTravel: 0.135,
      spring: front ? this.springF : this.springR,
      staticComp: front ? staticF : staticR,
      /* état */
      comp: front ? staticF : staticR, compVel: 0, prevComp: 0,
      omega: 0, spin: 0, steer: 0,
      Fz: this.mass * 9.81 * 0.25, Fx: 0, Fy: 0,
      slipRatio: 0, slipAngle: 0, slipN: 0,
      grounded: true, surface: 'asphalt',
      latLag: 0,                     /* longueur de relaxation */
      contact: new V3(), normal: new V3(0, 1, 0),
      worldPos: new V3(), skid: 0, tempSlip: 0
    });
    /* pneus 255/30 R20 (av.) et 355/25 R21 (ar.) */
    this.wheels = [
      mk(0.860, a, 0.3305, 0.255, true),
      mk(-0.860, a, 0.3305, 0.255, true),
      mk(0.850, -b, 0.3555, 0.355, false),
      mk(-0.850, -b, 0.3555, 0.355, false)
    ];
    this.Iw = [1.35, 1.35, 1.95, 1.95];      /* inertie de roue + disque */

    /* ------------------- pneus ------------------- */
    /* Pirelli P Zero Trofeo R. Le pic longitudinal d'un pneu est
       supérieur au pic latéral : l'ellipse d'adhérence n'est pas un
       cercle. kLong/kLat traduisent cet écart (~ +12 % / -5 %). */
    this.muF = 1.28; this.muR = 1.36;
    this.kLong = 1.12; this.kLat = 0.95;
    this.kappaPeak = 0.115;
    this.alphaPeak = 0.145;                  /* tan(α) au pic ≈ 8,3° */
    this.loadSens = 0.090;

    /* ------------------- moteur / transmission ------------------- */
    this.rpm = 0;
    this.omegaE = 0;
    this.Ie = 0.24;                          /* V12 + volant allégé */
    this.idle = 900; this.redline = 8700; this.limiter = 8720;
    this.engineOn = false; this.starter = 0; this.cut = false; this.cutT = 0;
    this.gears = [3.15, 2.19, 1.63, 1.29, 1.03, 0.84, 0.69];
    this.reverseRatio = -3.30;
    this.finalDrive = 4.72;
    this.driveEff = 0.92;
    this.gear = 0;                           /* 0 = N, 1..7, -1 = R */
    this.clutch = 0;                         /* 0 libre .. 1 engagé */
    this.clutchCap = 1050;                   /* Nm */
    this.shiftTimer = 0; this.shiftTime = 0.055; this.pendingGear = null;
    this.shiftCooldown = 0;
    this.autoBox = true;
    this.frontSplit = 0.12;                  /* transfert intégral Haldex */

    /* ------------------- freins ------------------- */
    this.brakeMaxF = 5200; this.brakeMaxR = 3100;   /* Nm carbone-céramique */
    this.handbrakeMax = 3600;

    /* ------------------- aides ------------------- */
    this.tcOn = true; this.absOn = true; this.alaOn = true;
    this.tcActive = 0; this.absActive = 0;
    this.launch = false; this.launchRpm = 4800;

    /* ------------------- aéro ------------------- */
    this.CdA = 0.727;
    this.ClA_F = 0.42; this.ClA_R = 0.68;
    this.alaOpen = 0;
    this.rho = 1.225;

    /* ------------------- direction ------------------- */
    this.steerInput = 0; this.steerAngle = 0;
    this.maxSteer = 33 * U.deg;
    this.rearSteer = 0;

    /* ------------------- commandes ------------------- */
    this.throttle = 0; this.brake = 0; this.handbrake = 0;

    /* ------------------- sorties ------------------- */
    this.speed = 0; this.gLat = 0; this.gLon = 0; this.gVert = 1;
    this.downforce = 0; this.powerKW = 0; this.wheelSlipMax = 0;
    this.airborne = false; this.impact = 0; this.lastImpact = 0;
    this.driveMode = 2;                       /* 0 Strada 1 Sport 2 Corsa */
    this.accum = 0;
    this._q = new THREE.Quaternion();
    this._m = new THREE.Matrix3();
  }

  /* ---------------------------------------------------------------
     Repères
     --------------------------------------------------------------- */
  Vehicle.prototype.updateBasis = function () {
    this.forward.set(0, 0, 1).applyQuaternion(this.quat);
    this.right.set(1, 0, 0).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
  };

  Vehicle.prototype.localToWorld = function (v, out) {
    return out.copy(v).applyQuaternion(this.quat).add(this.pos);
  };

  Vehicle.prototype.pointVelocity = function (rWorld, out) {
    return out.copy(this.angVel).cross(rWorld).add(this.vel);
  };

  /* ---------------------------------------------------------------
     Modes de conduite
     --------------------------------------------------------------- */
  Vehicle.prototype.setDriveMode = function (m) {
    this.driveMode = m;
    if (m === 0) { this.shiftTime = 0.16; this.tcSlip = 0.055; this.frontSplit = 0.22; }
    else if (m === 1) { this.shiftTime = 0.09; this.tcSlip = 0.10; this.frontSplit = 0.16; }
    else { this.shiftTime = 0.050; this.tcSlip = 0.145; this.frontSplit = 0.11; }
  };

  /* ---------------------------------------------------------------
     Démarrage / arrêt
     --------------------------------------------------------------- */
  Vehicle.prototype.startEngine = function () {
    if (this.engineOn) return;
    this.starter = 1.0;
    const self = this;
    setTimeout(function () {
      self.engineOn = true;
      self.omegaE = 2100 * Math.PI / 30;      /* coup de démarrage typique */
      self.starter = 0;
    }, 900);
  };

  /* ---------------------------------------------------------------
     Boîte
     --------------------------------------------------------------- */
  Vehicle.prototype.ratio = function (g) {
    if (g === 0) return 0;
    if (g < 0) return this.reverseRatio * this.finalDrive;
    return this.gears[g - 1] * this.finalDrive;
  };

  Vehicle.prototype.shiftTo = function (g) {
    if (g === this.gear || this.shiftTimer > 0) return;
    if (g > this.gears.length || g < -1) return;
    this.pendingGear = g;
    this.shiftTimer = this.shiftTime;
    /* le régime moteur ne rejoint le nouveau rapport qu'en ~0,3 s :
       sans temporisation la boîte auto enchaînerait tous les rapports */
    this.shiftCooldown = 0.42;
    this.onShift && this.onShift(g > this.gear);
  };
  Vehicle.prototype.shiftUp = function () { if (this.gear < this.gears.length) this.shiftTo(Math.max(1, this.gear + 1)); };
  Vehicle.prototype.shiftDown = function () {
    if (this.gear > 1) this.shiftTo(this.gear - 1);
    else if (this.gear === 1 && this.speed < 1.5) this.shiftTo(0);
    else if (this.gear === 0 && this.speed < 1.5) this.shiftTo(-1);
  };

  /* ---------------------------------------------------------------
     Pas de simulation (sous-pas fixe)
     --------------------------------------------------------------- */
  Vehicle.prototype.update = function (dt) {
    const H = 1 / 200;
    this.accum += Math.min(dt, 0.1);
    let n = 0;
    while (this.accum >= H && n < 24) { this.step(H); this.accum -= H; n++; }
  };

  const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(),
    _fwd = new V3(), _rgt = new V3(), _rw = new V3(), _pv = new V3(),
    _force = new V3(), _torque = new V3(), _tmp = new V3(), _acc = new V3();

  Vehicle.prototype.step = function (h) {
    const W = this.world;
    this.updateBasis();

    const speed = this.vel.length();
    this.speed = speed;
    const vFwd = this.vel.dot(this.forward);
    const kmh = speed * 3.6;

    /* ============ 1. direction ============ */
    /* démultiplication variable : plus doux à haute vitesse */
    const steerLimit = this.maxSteer * (1 - 0.62 * U.smoothstep(0, 250, kmh));
    const rate = 4.2 - 2.4 * U.smoothstep(0, 160, kmh);
    this.steerAngle = U.approach(this.steerAngle, this.steerInput * steerLimit, steerLimit * rate, h);
    /* roues arrière directrices : contre-phase à basse vitesse, en phase au-delà */
    this.rearSteer = this.steerAngle * (kmh < 90 ? -0.085 : 0.045) * U.smoothstep(3, 30, kmh);
    /* Ackermann */
    const tanS = Math.tan(this.steerAngle);
    const wb = this.wheelbase, tw = 1.72;
    const inner = Math.atan(wb * tanS / (wb - 0.5 * tw * tanS));
    const outer = Math.atan(wb * tanS / (wb + 0.5 * tw * tanS));
    this.wheels[0].steer = this.steerAngle > 0 ? inner : outer;
    this.wheels[1].steer = this.steerAngle > 0 ? outer : inner;
    this.wheels[2].steer = this.rearSteer;
    this.wheels[3].steer = this.rearSteer;

    /* ============ 2. suspension & contacts ============ */
    let groundedCount = 0;
    for (let i = 0; i < 4; i++) {
      const wl = this.wheels[i];
      this.localToWorld(wl.hard, _v1);                 /* point d'ancrage */
      _v2.copy(this.up).multiplyScalar(-1);            /* axe de débattement */
      const probe = _v3.copy(_v1).addScaledVector(_v2, wl.L0 + wl.radius);
      const g = W.sample(probe.x, probe.z);
      wl.surface = g.surface;
      _v4.set(g.nx, g.ny, g.nz);
      const denom = -_v4.dot(_v2);
      let comp = 0;
      wl.grounded = false;
      if (denom > 0.15) {
        /* distance ancrage -> plan de contact, le long de l'axe */
        const t = (_v1.y - g.y) * _v4.y + (_v1.x - probe.x) * _v4.x + (_v1.z - probe.z) * _v4.z;
        const dist = t / denom;
        const len = dist - wl.radius / denom;
        comp = wl.L0 - len;
        if (comp > 0) {
          wl.grounded = true;
          groundedCount++;
          comp = Math.min(comp, wl.L0 + wl.maxTravel);
        } else comp = 0;
      }
      wl.compVel = (comp - wl.comp) / h;
      wl.comp = comp;
      wl.normal.copy(_v4);
      wl.worldPos.copy(_v1).addScaledVector(_v2, wl.L0 - comp);
      wl.contact.copy(wl.worldPos).addScaledVector(_v4, -wl.radius);
    }
    this.airborne = groundedCount === 0;

    /* barres antiroulis */
    const arbFront = this.arbF * (this.wheels[0].comp - this.wheels[1].comp);
    const arbRear = this.arbR * (this.wheels[2].comp - this.wheels[3].comp);

    _force.set(0, 0, 0);
    _torque.set(0, 0, 0);

    /* ============ 3. transmission ============ */
    if (this.shiftCooldown > 0) this.shiftCooldown -= h;
    if (this.shiftTimer > 0) {
      this.shiftTimer -= h;
      if (this.shiftTimer <= 0 && this.pendingGear !== null) {
        this.gear = this.pendingGear; this.pendingGear = null;
      }
    }
    const ratio = this.ratio(this.gear);
    const inGear = ratio !== 0 && this.shiftTimer <= 0;

    /* Embrayage. Au-delà de ~18 km/h la transmission est verrouillée.
       En dessous, un asservissement reproduit le pilotage d'une double
       embrayage : la capacité augmente à mesure que le moteur dépasse
       le régime de décollage, et se relâche s'il s'écroule. Le moteur
       se stabilise donc au point d'équilibre — un vrai départ arrêté. */
    let engage = 0;
    if (inGear) {
      const vAbs = Math.abs(vFwd);
      const locked = U.smoothstep(2.0, 5.2, vAbs);
      if (locked >= 1) engage = 1;
      else {
        const target = U.lerp(this.idle + 300, this.launchRpm, U.clamp(this.throttle, 0, 1));
        const servo = U.clamp((this.rpm - target * 0.58) / (target * 0.48), 0, 1);
        engage = Math.max(locked, servo * U.clamp(this.throttle * 1.5, 0, 1));
        if (this.throttle < 0.03 && vAbs < 1.0) engage = 0;
      }
      engage = U.clamp(engage, 0, 1);
    }
    this.clutch = U.damp(this.clutch, engage, 26, h);

    /* couple moteur */
    this.rpm = this.omegaE * 30 / Math.PI;
    let thr = this.throttle;

    /* launch control : régime bloqué pied dedans */
    if (this.launch && this.brake > 0.4 && Math.abs(vFwd) < 0.6) {
      thr = this.rpm < this.launchRpm ? 1 : 0.06;
    }

    /* antipatinage */
    if (this.tcOn && inGear && !this.airborne && Math.abs(vFwd) > 1.5) {
      const drive = 0.5 * (Math.abs(this.wheels[2].slipRatio) + Math.abs(this.wheels[3].slipRatio));
      const over = drive - (this.tcSlip || 0.2);
      if (over > 0 && vFwd > -0.5) {
        const cut = U.clamp(over * 7.5, 0, 1);
        thr *= (1 - cut * 0.94);
        this.tcActive = U.damp(this.tcActive, 1, 30, h);
      } else this.tcActive = U.damp(this.tcActive, 0, 6, h);
    } else this.tcActive = U.damp(this.tcActive, 0, 6, h);

    /* rupteur : coupure d'allumage franche puis reprise */
    if (this.rpm > this.limiter) { this.cut = true; this.cutT = 0.055; }
    if (this.cutT > 0) { this.cutT -= h; if (this.cutT <= 0) this.cut = false; }

    let Te = 0;
    if (this.engineOn) {
      const full = torqueAt(U.clamp(this.rpm, 0, 9000));
      const drag = 14 + 0.017 * this.rpm;         /* frein moteur (pompage) */
      Te = (this.cut ? 0 : full * thr) - drag * (1 - thr * 0.85);
      /* régulation de ralenti */
      if (this.rpm < this.idle && !this.cut) Te += (this.idle - this.rpm) * 0.20;
    } else if (this.starter > 0) {
      Te = 120;
    }

    /* embrayage : couple transmis */
    let Tclutch = 0;
    if (inGear) {
      const omegaWheelSide = 0.5 * (this.wheels[2].omega + this.wheels[3].omega) * ratio;
      const dw = this.omegaE - omegaWheelSide;
      const cap = this.clutchCap * this.clutch;
      Tclutch = U.clamp(dw * 30, -cap, cap);
    }
    /* même traitement pour l'embrayage (raideur kc élevée) */
    const clutchStiff = (inGear && Math.abs(Tclutch) < this.clutchCap * this.clutch - 1) ? 30 : 0;
    this.omegaE += ((Te - Tclutch) * h / this.Ie) / (1 + h * clutchStiff / this.Ie);
    /* butées */
    const wLim = this.limiter * Math.PI / 30;
    if (this.omegaE > wLim * 1.02) this.omegaE = wLim * 1.02;
    if (this.engineOn && this.omegaE < 620 * Math.PI / 30) this.omegaE = 620 * Math.PI / 30;
    if (!this.engineOn) this.omegaE *= Math.exp(-2.4 * h);
    this.rpm = this.omegaE * 30 / Math.PI;

    this.Tclutch = Tclutch; this.thrEff = thr;

    /* couple à l'arbre de sortie */
    const Tshaft = Tclutch * ratio * this.driveEff;
    /* répartition intégrale : le train avant reprend quand l'arrière patine */
    const rearSlip = 0.5 * (Math.abs(this.wheels[2].slipRatio) + Math.abs(this.wheels[3].slipRatio));
    const fSplit = U.clamp(this.frontSplit + U.smoothstep(0.08, 0.45, rearSlip) * 0.28, 0, 0.45);
    const frac = [fSplit * 0.5, fSplit * 0.5, (1 - fSplit) * 0.5, (1 - fSplit) * 0.5];
    const Taxle = [Tshaft * frac[0], Tshaft * frac[1], Tshaft * frac[2], Tshaft * frac[3]];
    /* autobloquants : couple visqueux entre roues d'un même essieu */
    const lsdF = U.clamp((this.wheels[1].omega - this.wheels[0].omega) * 22, -600, 600);
    const lsdR = U.clamp((this.wheels[3].omega - this.wheels[2].omega) * 46, -900, 900);
    Taxle[0] += lsdF; Taxle[1] -= lsdF;
    Taxle[2] += lsdR; Taxle[3] -= lsdR;

    /* Inertie du moteur et de la transmission ramenée à chaque roue :
       Ie * (rapport total)². En 1re elle vaut ~80 kg·m², soit 40 fois
       l'inertie propre d'une roue — l'ignorer rendait l'intégration
       instable et le couple appliqué irréaliste. */
    const reflected = inGear ? this.clutch * this.Ie * ratio * ratio : 0;
    const IwEff = [
      this.Iw[0] + reflected * frac[0], this.Iw[1] + reflected * frac[1],
      this.Iw[2] + reflected * frac[2], this.Iw[3] + reflected * frac[3]
    ];

    /* ============ 4. efforts pneu par pneu ============ */
    this.wheelSlipMax = 0;
    let absAct = 0;
    for (let i = 0; i < 4; i++) {
      const wl = this.wheels[i];
      const Iw = IwEff[i];

      /* --- charge verticale --- */
      let Fz = 0;
      if (wl.grounded) {
        const damp = wl.compVel > 0 ? this.dampC : this.dampR;
        const arb = i === 0 ? -arbFront : i === 1 ? arbFront : i === 2 ? -arbRear : arbRear;
        Fz = wl.spring * wl.comp + damp * wl.compVel + arb;
        /* butée hydraulique en fin de course */
        const over = wl.comp - (wl.L0 * 0.92);
        if (over > 0) Fz += over * 260000;
        Fz = Math.max(0, Fz);
      }
      wl.Fz = U.damp(wl.Fz, Fz, 60, h);

      /* --- repère de contact --- */
      _fwd.copy(this.forward).applyAxisAngle(this.up, wl.steer);
      _fwd.addScaledVector(wl.normal, -_fwd.dot(wl.normal)).normalize();
      _rgt.crossVectors(wl.normal, _fwd).normalize();

      _rw.subVectors(wl.contact, this.pos);
      this.pointVelocity(_rw, _pv);
      const vLong = _pv.dot(_fwd);
      const vLat = _pv.dot(_rgt);

      /* --- freins --- */
      const bias = wl.front ? this.brakeMaxF : this.brakeMaxR;
      let Tb = this.brake * bias;
      if (!wl.front) Tb += this.handbrake * this.handbrakeMax;
      /* ABS : relâche si la roue se bloque */
      if (this.absOn && Math.abs(vLong) > 2.2) {
        const lock = -wl.slipRatio;                 /* > 0 = blocage */
        if (lock > 0.14) { Tb *= U.clamp(1 - (lock - 0.14) * 6.5, 0.05, 1); absAct = 1; }
      }

      /* --- glissements --- */
      const vRef = Math.max(Math.abs(vLong), 2.2);
      let kappa = wl.grounded ? (wl.omega * wl.radius - vLong) / vRef : 0;
      kappa = U.clamp(kappa, -4, 4);
      /* longueur de relaxation : la dérive ne s'établit pas instantanément */
      const relax = 0.55;
      const target = -vLat / Math.max(Math.abs(vLong), 1.2);
      wl.latLag += (target - wl.latLag) * U.clamp(Math.abs(vLong) * h / relax, 0, 1);
      const tanA = wl.grounded ? wl.latLag : 0;
      wl.slipRatio = kappa;
      wl.slipAngle = Math.atan(tanA);

      /* --- adhérence disponible --- */
      const muBase = wl.front ? this.muF : this.muR;
      const surf = SURFACE_MU[wl.surface] !== undefined ? SURFACE_MU[wl.surface] : 1;
      const loadFactor = U.clamp(1 - this.loadSens * (wl.Fz / 4200 - 1), 0.60, 1.14);
      const mu = muBase * surf * loadFactor;

      /* --- glissement combiné normalisé (ellipse d'adhérence) --- */
      const kp = this.kappaPeak, ap = this.alphaPeak;
      const syA = tanA / ap;
      const kLong = this.kLong, kLat = this.kLat;
      const longForce = function (k) {
        const ssx = k / kp;
        const ss = Math.hypot(ssx, syA);
        if (wl.Fz <= 1 || ss < 1e-5) return 0;
        return mu * wl.Fz * magic(ss) * (ssx / ss) * kLong;
      };
      const sx = kappa / kp;
      const s = Math.hypot(sx, syA);
      wl.slipN = s;
      let Fx = 0, Fy = 0;
      if (wl.Fz > 1 && s > 1e-5) {
        const F = mu * wl.Fz * magic(s);
        Fx = F * (sx / s) * kLong;
        Fy = F * (syA / s) * kLat;
      }
      /* raideur longitudinale locale : sert à intégrer la roue de façon
         semi-implicite. Sans cela, la raideur du pneu (≈ 170 kN par unité
         de glissement) rend l'équation de roue instable à 200 Hz. */
      const dk = 0.004;
      const Cx = Math.max(0, (longForce(kappa + dk) - longForce(kappa)) / dk);

      /* résistance au roulement */
      const rr = SURFACE_RR[wl.surface] || 0.014;
      Fx -= rr * wl.Fz * U.sign(vLong);

      /* --- dynamique de roue --- */
      const Tdrive = Taxle[i];
      const Ttyre = -Fx * wl.radius;
      let Tbrk = -U.sign(wl.omega) * Tb;
      /* évite l'oscillation autour de zéro */
      if (Math.abs(wl.omega) < 0.6 && Tb > 0) {
        const stop = -wl.omega * Iw / h;
        Tbrk = U.clamp(stop, -Tb, Tb);
      }
      /* Intégration semi-implicite : la correction est amortie par la
         raideur du pneu -> stable même à fort couple, tout en laissant
         le patinage se développer une fois l'adhérence saturée (Cx -> 0).
         En dessous de ~11 km/h on ajoute un terme d'adhérence statique :
         sans lui la roue oscille autour de zéro (le pic d'adhérence est
         franchi à chaque pas et l'amortissement disparaît). */
      const A = h * wl.radius * (Cx * wl.radius / vRef) / Iw;
      const gA = (h / Iw) / (1 + A);
      const stick = wl.grounded ? (1 - U.smoothstep(0.8, 3.2, Math.abs(vLong))) * 900 : 0;
      const wTarget = vLong / wl.radius;
      wl.omega = (wl.omega + gA * (Tdrive + Ttyre + Tbrk) + gA * stick * wTarget) / (1 + gA * stick);
      if (!wl.grounded) {
        /* en l'air : la roue se cale sur la vitesse d'avance */
        wl.omega = U.damp(wl.omega, vLong / wl.radius, 3, h);
        Fx = 0; Fy = 0;
      }
      wl.spin += wl.omega * h;
      wl.Fx = Fx; wl.Fy = Fy;

      const slipTotal = Math.hypot(kappa, tanA * 2.2);
      wl.tempSlip = slipTotal;
      if (wl.grounded && wl.surface === 'asphalt') this.wheelSlipMax = Math.max(this.wheelSlipMax, slipTotal);
      wl.skid = wl.grounded && slipTotal > 0.35 && this.speed > 3 ? Math.min(1, (slipTotal - 0.35) * 1.6) : 0;

      /* --- application au châssis --- */
      if (wl.grounded) {
        _tmp.copy(wl.normal).multiplyScalar(wl.Fz)
          .addScaledVector(_fwd, Fx).addScaledVector(_rgt, Fy);
        _force.add(_tmp);
        _v1.crossVectors(_rw, _tmp);
        _torque.add(_v1);
      }
    }
    this.absActive = U.damp(this.absActive, absAct, 20, h);

    /* ============ 5. aérodynamique ============ */
    const v2 = speed * speed;
    if (speed > 0.5) {
      /* ALA : ouvre en ligne droite pleins gaz (moins de traînée),
         ferme en courbe et au freinage (appui maximal) */
      const wantOpen = this.alaOn
        ? U.clamp((this.throttle > 0.75 ? 1 : 0) * (1 - Math.abs(this.steerInput) * 2.4) * (1 - this.brake * 3), 0, 1)
        : 0;
      this.alaOpen = U.damp(this.alaOpen, wantOpen, 6, h);

      const q = 0.5 * this.rho * v2;
      const CdA = this.CdA * (1 - 0.09 * this.alaOpen);
      const drag = q * CdA;
      _tmp.copy(this.vel).normalize().multiplyScalar(-drag);
      _force.add(_tmp);

      const clF = this.ClA_F;
      const clR = this.ClA_R * (1 - 0.56 * this.alaOpen);
      const dfF = q * clF, dfR = q * clR;
      this.downforce = dfF + dfR;
      /* appliqué aux centres de poussée avant/arrière -> vrai transfert */
      _tmp.copy(this.up).multiplyScalar(-dfF);
      _force.add(_tmp);
      _v1.copy(this.forward).multiplyScalar(this.a * 0.9).applyQuaternion(new THREE.Quaternion());
      _torque.add(_v2.crossVectors(_v1, _tmp));
      _tmp.copy(this.up).multiplyScalar(-dfR);
      _force.add(_tmp);
      _v1.copy(this.forward).multiplyScalar(-this.b * 1.15);
      _torque.add(_v2.crossVectors(_v1, _tmp));

      /* vectorisation aéro ALA : décrochage d'un seul volet en courbe */
      if (this.alaOn && Math.abs(this.steerInput) > 0.2) {
        const yaw = -this.steerInput * q * 0.030 * (1 - this.alaOpen);
        _torque.addScaledVector(this.up, yaw);
      }
    } else { this.downforce = 0; this.alaOpen = U.damp(this.alaOpen, 0, 4, h); }

    /* ============ 6. gravité, intégration ============ */
    _force.y -= this.mass * 9.81;

    /* amortissement angulaire léger (pneus + amortisseurs, stabilité num.) */
    _torque.addScaledVector(this.angVel, -this.mass * 0.09);

    const acc = _acc.copy(_force).multiplyScalar(1 / this.mass);
    this.vel.addScaledVector(acc, h);
    this.pos.addScaledVector(this.vel, h);

    /* couple monde -> repère véhicule -> accélération angulaire */
    this._q.copy(this.quat).invert();
    _v2.copy(_torque).applyQuaternion(this._q);
    _v2.set(_v2.x / this.I.x, _v2.y / this.I.y, _v2.z / this.I.z);
    _v2.applyQuaternion(this.quat);
    this.angVel.addScaledVector(_v2, h);

    /* intégration du quaternion */
    this._q.set(this.angVel.x * h * 0.5, this.angVel.y * h * 0.5, this.angVel.z * h * 0.5, 0);
    this._q.multiply(this.quat);
    this.quat.x += this._q.x; this.quat.y += this._q.y;
    this.quat.z += this._q.z; this.quat.w += this._q.w;
    this.quat.normalize();

    /* ============ 7. collisions décor ============ */
    this.impact = 0;
    if (W.collide) {
      const pts = [
        new V3(0, 0.10, 2.30), new V3(0, 0.10, -2.28),
        new V3(0.95, 0.10, 0.9), new V3(-0.95, 0.10, 0.9),
        new V3(0.95, 0.10, -0.9), new V3(-0.95, 0.10, -0.9)
      ];
      for (let i = 0; i < pts.length; i++) {
        this.localToWorld(pts[i], _v1);
        const hit = W.collide(_v1, 0.42);
        if (hit) {
          _v2.set(hit.nx, hit.ny, hit.nz);
          this.pos.addScaledVector(_v2, hit.depth * 0.75);
          _rw.subVectors(_v1, this.pos);
          this.pointVelocity(_rw, _pv);
          const vn = _pv.dot(_v2);
          if (vn < 0) {
            const e = 0.22;
            const j = -(1 + e) * vn * this.mass * 0.55;
            this.impact = Math.max(this.impact, -vn);
            _tmp.copy(_v2).multiplyScalar(j / this.mass);
            this.vel.add(_tmp);
            /* frottement tangentiel */
            _v3.copy(_pv).addScaledVector(_v2, -vn).multiplyScalar(-0.55);
            this.vel.addScaledVector(_v3, 0.35);
            /* couple de lacet à l'impact */
            _v4.crossVectors(_rw, _tmp.multiplyScalar(this.mass));
            _v4.applyQuaternion(this._q.copy(this.quat).invert());
            _v4.set(_v4.x / this.I.x, _v4.y / this.I.y, _v4.z / this.I.z);
            _v4.applyQuaternion(this.quat);
            this.angVel.addScaledVector(_v4, 0.5);
          }
        }
      }
      if (this.impact > 0.7) this.lastImpact = this.impact;
    }

    /* ============ 8. sécurité numérique ============ */
    if (!isFinite(this.pos.x + this.pos.y + this.pos.z)) this.respawn(0, 0, 0);
    const gr = W.sample(this.pos.x, this.pos.z);
    if (this.pos.y < gr.y - 3) { this.pos.y = gr.y + 1.2; this.vel.multiplyScalar(0.2); }
    if (this.vel.lengthSq() > 40000) this.vel.setLength(200);
    if (this.angVel.lengthSq() > 400) this.angVel.setLength(20);

    /* ============ 9. boîte automatique ============ */
    if (this.autoBox && this.shiftTimer <= 0 && this.shiftCooldown <= 0) this.autoShift(h, vFwd);

    /* ============ 10. télémétrie ============ */
    this.gLat = _acc.dot(this.right) / 9.81;
    this.gLon = _acc.dot(this.forward) / 9.81;
    this.gVert = _acc.dot(this.up) / 9.81 + 1;
    this.powerKW = Math.max(0, Tclutch * this.omegaE / 1000);
  };

  /* ---------------------------------------------------------------
     Passage automatique des rapports
     --------------------------------------------------------------- */
  Vehicle.prototype.autoShift = function (h, vFwd) {
    if (!this.engineOn) return;
    const up = this.driveMode === 0 ? 6200 : this.driveMode === 1 ? 7600 : 8480;
    const down = this.driveMode === 0 ? 1500 : this.driveMode === 1 ? 2600 : 3400;

    if (this.gear === 0 && Math.abs(vFwd) < 1 && this.throttle > 0.05) { this.shiftTo(1); return; }
    if (this.gear === 0 && vFwd < -0.4) return;
    if (this.gear === -1 && vFwd > 0.5 && this.throttle > 0.05) { this.shiftTo(1); return; }
    if (this.gear < 1) return;

    if (this.rpm > up && this.gear < this.gears.length && this.throttle > 0.05) { this.shiftUp(); return; }
    if (this.gear > 1) {
      /* régime prévisionnel sur le rapport inférieur */
      const rNext = this.ratio(this.gear - 1) / this.ratio(this.gear);
      if (this.rpm * rNext < 8300 && (this.rpm < down || (this.brake > 0.25 && this.rpm * rNext < 7600))) {
        this.shiftDown();
      }
    }
    if (this.gear === 1 && Math.abs(vFwd) < 0.4 && this.throttle < 0.02 && this.brake > 0.3) this.shiftTo(0);
  };

  /* ---------------------------------------------------------------
     Réinitialisation
     --------------------------------------------------------------- */
  Vehicle.prototype.respawn = function (x, z, heading) {
    const g = this.world.sample(x, z);
    this.pos.set(x, g.y + 0.62, z);
    this.quat.setFromAxisAngle(new V3(0, 1, 0), heading || 0);
    this.vel.set(0, 0, 0);
    this.angVel.set(0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i];
      w.omega = 0; w.comp = w.staticComp; w.latLag = 0; w.slipRatio = 0;
    }
    this.gear = this.autoBox ? 1 : 0;
    this.accum = 0;
  };

  Vehicle.prototype.isUpsideDown = function () {
    return this.up.y < 0.25;
  };

  global.Vehicle = Vehicle;
  global.Vehicle.torqueAt = torqueAt;
})(window);
