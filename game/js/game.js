/* =============================================================
   game.js — boucle principale, caméras, commandes, effets
   ============================================================= */
(function (global) {
  'use strict';

  const V3 = THREE.Vector3;

  /* ------------------------- livrées ------------------------- */
  const PAINTS = [
    { name: 'Verde Alceo', hex: 0x3f8f2e },
    { name: 'Arancio Atlas', hex: 0xd8560f },
    { name: 'Giallo Orion', hex: 0xefc21a },
    { name: 'Rosso Efesto', hex: 0x8c1420 },
    { name: 'Blu Cepheus', hex: 0x14357a },
    { name: 'Nero Nemesis', hex: 0x14161a },
    { name: 'Bianco Canopus', hex: 0xe8ebee },
    { name: 'Grigio Acheso', hex: 0x5a5f66 },
    { name: 'Viola Parsifae', hex: 0x5c2a86 }
  ];
  const TIMES = [
    { name: 'AUBE', t: 0.255 }, { name: 'MATIN', t: 0.33 }, { name: 'MIDI', t: 0.50 },
    { name: 'COUCHER', t: 0.745 }, { name: 'NUIT', t: 0.92 }
  ];
  const MODES = ['STRADA', 'SPORT', 'CORSA'];
  const QUALS = [{ n: 'BASSE', v: 'low' }, { n: 'MOYENNE', v: 'medium' }, { n: 'HAUTE', v: 'high' }];

  const G = {
    paint: 5, matte: true, carbon: true, livery: true, timeIdx: 2, mode: 2, quality: 'high',
    started: false, paused: false, photo: false,
    cam: 0, camNames: ['POURSUITE', 'CAPOT', 'HABITACLE', 'PARE-CHOCS', 'CINÉMA'],
    resScale: 1, shadows: true, bloom: true, fpsCap: 0, fps: 0,
    t100: null, t100Start: null, vmax: 0, dayNight: false
  };

  /* ------------------------- entrées ------------------------- */
  const Input = {
    keys: {}, mouse: { x: 0, y: 0, down: false, dx: 0, dy: 0, wheel: 0 },
    pad: null,
    throttle: 0, brake: 0, steer: 0, handbrake: 0,
    init: function () {
      const self = this;
      addEventListener('keydown', function (e) {
        if (e.repeat) return;
        self.keys[e.code] = true;
        self.onKey && self.onKey(e.code, e);
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
      });
      addEventListener('keyup', function (e) { self.keys[e.code] = false; });
      addEventListener('blur', function () { self.keys = {}; });
      const cv = document.getElementById('gl');
      cv.addEventListener('mousedown', function (e) { self.mouse.down = true; });
      addEventListener('mouseup', function () { self.mouse.down = false; });
      addEventListener('mousemove', function (e) {
        if (self.mouse.down) { self.mouse.dx += e.movementX || 0; self.mouse.dy += e.movementY || 0; }
      });
      cv.addEventListener('wheel', function (e) { self.mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
      addEventListener('gamepadconnected', function (e) { self.pad = e.gamepad.index; });
      addEventListener('gamepaddisconnected', function () { self.pad = null; });
    },
    k: function () { return this.keys; },
    sample: function (dt) {
      const k = this.keys;
      let thr = 0, brk = 0, str = 0, hb = 0;
      if (k.KeyW || k.KeyZ || k.ArrowUp) thr = 1;
      if (k.KeyS || k.ArrowDown) brk = 1;
      if (k.KeyA || k.KeyQ || k.ArrowLeft) str -= 1;
      if (k.KeyD || k.ArrowRight) str += 1;
      if (k.Space) hb = 1;

      /* manette : gâchettes analogiques + stick */
      let padSteer = null;
      if (navigator.getGamepads) {
        const gps = navigator.getGamepads();
        for (let i = 0; i < gps.length; i++) {
          const gp = gps[i];
          if (!gp || !gp.connected) continue;
          const ax = gp.axes[0] || 0;
          if (Math.abs(ax) > 0.09) padSteer = ax;
          const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
          const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
          if (rt > 0.02) thr = Math.max(thr, rt);
          if (lt > 0.02) brk = Math.max(brk, lt);
          if (gp.buttons[0] && gp.buttons[0].pressed) hb = 1;
          this.padUp = gp.buttons[5] && gp.buttons[5].pressed;
          this.padDown = gp.buttons[4] && gp.buttons[4].pressed;
          break;
        }
      }

      /* rampes clavier : progressivité proche d'une pédale */
      const rate = 5.2, back = 7.5;
      this.throttle = U.approach(this.throttle, thr, thr > this.throttle ? rate : back, dt);
      this.brake = U.approach(this.brake, brk, brk > this.brake ? 6.5 : 9, dt);
      this.handbrake = U.approach(this.handbrake, hb, 14, dt);
      if (padSteer !== null) {
        this.steer = padSteer;
      } else {
        const target = str;
        const sr = target === 0 ? 5.0 : 3.4;
        this.steer = U.approach(this.steer, target, sr, dt);
      }
      return this;
    }
  };

  /* ------------------------- effets ------------------------- */
  function Effects(scene) {
    this.scene = scene;
    /* fumée de pneu */
    const smokeTex = new THREE.CanvasTexture(U.smokeCanvas());
    this.smokeMat = new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false,
      color: 0xd8d8d4
    });
    this.smoke = [];
    for (let i = 0; i < 190; i++) {
      const s = new THREE.Sprite(this.smokeMat.clone());
      s.visible = false; s.material.opacity = 0;
      scene.add(s);
      this.smoke.push({ sp: s, life: 0, max: 1, vel: new V3(), size: 1 });
    }
    this.si = 0;

    /* traces de gomme : ruban de quads en anneau */
    this.MAX = 2600;
    const g = new THREE.BufferGeometry();
    this.skidPos = new Float32Array(this.MAX * 6 * 3);
    this.skidAlpha = new Float32Array(this.MAX * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.skidPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.skidAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'attribute float aAlpha; varying float vA;' +
        'void main(){ vA=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying float vA; void main(){ if(vA<=0.002) discard; gl_FragColor=vec4(0.03,0.03,0.035,vA*0.72); }',
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
    });
    this.skid = new THREE.Mesh(g, mat);
    this.skid.frustumCulled = false;
    scene.add(this.skid);
    this.ki = 0;
    this.lastSkid = [];
    for (let i = 0; i < 4; i++) {
      this.lastSkid.push({ p: new V3(), r: new V3(), a: 0, valid: false });
    }
  }

  Effects.prototype.puff = function (pos, vel, size, color) {
    const s = this.smoke[this.si];
    this.si = (this.si + 1) % this.smoke.length;
    s.sp.visible = true;
    s.sp.position.copy(pos);
    s.vel.copy(vel);
    s.life = 0; s.max = 0.9 + Math.random() * 0.9;
    s.size = size;
    s.sp.material.opacity = 0.42;
    s.sp.material.color.setHex(color === undefined ? 0xdedede : color);
    s.sp.scale.setScalar(size);
  };

  /* Corners préalloués : une trace peut produire ~90 quads par seconde et
     par roue ; allouer des vecteurs à ce rythme fait travailler le GC et
     provoque des à-coups visibles à 120 images/s. */
  const _c = [new V3(), new V3(), new V3(), new V3()];
  Effects.prototype.mark = function (i, p, right, width, alpha) {
    const prev = this.lastSkid[i];
    if (prev.valid && p.distanceToSquared(prev.p) < 0.10) return;
    if (prev.valid) {
      const o = this.ki * 18;
      const hwd = width * 0.5;
      _c[0].copy(prev.p).addScaledVector(prev.r, hwd);
      _c[1].copy(prev.p).addScaledVector(prev.r, -hwd);
      _c[2].copy(p).addScaledVector(right, hwd);
      _c[3].copy(p).addScaledVector(right, -hwd);
      for (let k = 0; k < 4; k++) _c[k].y += 0.02;
      /* deux triangles : aL, bL, aR puis aR, bL, bR */
      const order = [0, 2, 1, 1, 2, 3];
      for (let k = 0; k < 6; k++) {
        const c = _c[order[k]];
        this.skidPos[o + k * 3] = c.x;
        this.skidPos[o + k * 3 + 1] = c.y;
        this.skidPos[o + k * 3 + 2] = c.z;
        this.skidAlpha[this.ki * 6 + k] = (order[k] < 2) ? prev.a : alpha;
      }
      this.ki = (this.ki + 1) % this.MAX;
      this.skid.geometry.attributes.position.needsUpdate = true;
      this.skid.geometry.attributes.aAlpha.needsUpdate = true;
    }
    prev.p.copy(p); prev.r.copy(right); prev.a = alpha; prev.valid = true;
  };

  Effects.prototype.breakTrail = function (i) { this.lastSkid[i].valid = false; };

  Effects.prototype.update = function (dt) {
    for (let i = 0; i < this.smoke.length; i++) {
      const s = this.smoke[i];
      if (!s.sp.visible) continue;
      s.life += dt;
      if (s.life >= s.max) { s.sp.visible = false; continue; }
      const t = s.life / s.max;
      s.sp.position.addScaledVector(s.vel, dt);
      s.vel.multiplyScalar(1 - dt * 1.4);
      s.vel.y += dt * 0.55;
      s.sp.scale.setScalar(s.size * (1 + t * 2.6));
      s.sp.material.opacity = 0.42 * (1 - t) * (1 - t);
    }
  };

  /* ------------------------- application ------------------------- */
  const App = {};

  App.boot = function () {
    Input.init();
    this.buildMenu();
    const p = document.getElementById('progress');
    const txt = document.getElementById('loadTxt');
    let step = 0;
    const steps = ['Compilation des textures…', 'Assemblage du V12…', 'Prêt.'];
    const tick = () => {
      step++;
      p.style.width = (step / 3 * 100) + '%';
      txt.textContent = steps[Math.min(step - 1, 2)];
      if (step < 3) setTimeout(tick, 220);
      else setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
      }, 340);
    };
    setTimeout(tick, 260);
  };

  App.buildMenu = function () {
    const sw = document.getElementById('paints');
    PAINTS.forEach(function (p, i) {
      const d = document.createElement('div');
      d.className = 'swatch' + (i === G.paint ? ' sel' : '');
      d.style.background = '#' + p.hex.toString(16).padStart(6, '0');
      d.title = p.name;
      d.onclick = function () {
        G.paint = i;
        sw.querySelectorAll('.swatch').forEach(function (e) { e.classList.remove('sel'); });
        d.classList.add('sel');
        if (App.car) App.car.setPaint(PAINTS[i].hex, G.matte);
      };
      sw.appendChild(d);
    });
    const pills = (host, items, sel, cb) => {
      const el = document.getElementById(host);
      items.forEach(function (it, i) {
        const d = document.createElement('div');
        d.className = 'pill' + (i === sel ? ' sel' : '');
        d.textContent = it;
        d.onclick = function () {
          el.querySelectorAll('.pill').forEach(function (e) { e.classList.remove('sel'); });
          d.classList.add('sel');
          cb(i);
        };
        el.appendChild(d);
      });
    };
    pills('times', TIMES.map(function (t) { return t.name; }), G.timeIdx, function (i) {
      G.timeIdx = i; if (App.world) App.world.setTime(TIMES[i].t);
    });
    pills('modes', MODES, G.mode, function (i) {
      G.mode = i; if (App.vehicle) App.vehicle.setDriveMode(i);
    });
    pills('quality', QUALS.map(function (q) { return q.n; }), 2, function (i) { G.quality = QUALS[i].v; });

    document.getElementById('optMatte').onchange = function (e) {
      G.matte = e.target.checked;
      if (App.car) App.car.setPaint(PAINTS[G.paint].hex, G.matte);
    };
    document.getElementById('optCarbon').onchange = function (e) { G.carbon = e.target.checked; };
    document.getElementById('optLivery').onchange = function (e) { G.livery = e.target.checked; };
    document.getElementById('start').onclick = function () { App.start(); };

    document.getElementById('resume').onclick = function () { App.setPause(false); };
    document.getElementById('toMenu').onclick = function () {
      App.setPause(false);
      document.getElementById('menu').classList.remove('hidden');
      G.started = false;
      document.getElementById('hud').classList.add('hidden');
    };
    document.getElementById('closeHelp').onclick = function () {
      document.getElementById('help').classList.add('hidden');
    };

    const bind = (id, fn) => { const e = document.getElementById(id); e.oninput = e.onchange = function () { fn(e); }; };
    bind('setVol', function (e) { EngineAudio.setVolume(e.value / 100); });
    bind('setFov', function (e) { App.baseFov = +e.value; });
    bind('setRes', function (e) { G.resScale = e.value / 100; App.resize(); });
    pills('setFps', ['60', '120', 'ILLIMITÉ'], 2, function (i) {
      G.fpsCap = i === 0 ? 60 : i === 1 ? 120 : 0;
    });
    bind('setShadow', function (e) {
      G.shadows = e.checked;
      if (App.renderer) App.renderer.shadowMap.enabled = e.checked;
      if (App.world) App.world.sun.shadow.needsUpdate = true;
    });
    bind('setBloom', function (e) { G.bloom = e.checked; if (App.fx) App.fx.enabled = e.checked; });
    bind('setTC', function (e) { if (App.vehicle) App.vehicle.tcOn = e.checked; });
    bind('setABS', function (e) { if (App.vehicle) App.vehicle.absOn = e.checked; });
    bind('setALA', function (e) { if (App.vehicle) App.vehicle.alaOn = e.checked; });
    bind('setAuto', function (e) { if (App.vehicle) App.vehicle.autoBox = e.checked; });
  };

  /* ---------------------------------------------------------------- */
  App.start = function () {
    document.getElementById('menu').classList.add('hidden');
    if (!G.started) {
      if (!this.renderer) this.init();
      document.getElementById('hud').classList.remove('hidden');
      G.started = true;
      EngineAudio.init().then(function () {
        EngineAudio.resume();
        EngineAudio.setVolume(document.getElementById('setVol').value / 100);
        App.vehicle.startEngine();
        App.hud.toast('V12 6.5 L — GINTANI', 2.4);
      });
    } else {
      EngineAudio.resume();
    }
  };

  App.init = function () {
    const canvas = document.getElementById('gl');
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: G.quality !== 'low', powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    this.baseFov = +document.getElementById('setFov').value;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, innerWidth / innerHeight, 0.22, 14000);
    scene.add(this.camera);

    this.world = new World(scene, { quality: G.quality });
    this.world.setTime(TIMES[G.timeIdx].t);

    this.car = CarModel.build({
      color: PAINTS[G.paint].hex, matte: G.matte, carbon: G.carbon,
      livery: G.livery, interior: true
    });
    /* le maillage est calé sur le centre de gravité du châssis */
    this.carPivot = new THREE.Group();
    this.car.root.position.set(0, -0.44, 0.189);
    this.carPivot.add(this.car.root);
    scene.add(this.carPivot);

    this.vehicle = new Vehicle(this.world);
    this.vehicle.setDriveMode(G.mode);
    const sp = this.world.spawnPoint();
    this.vehicle.respawn(sp.x, sp.z, sp.heading);
    const self = this;
    this.vehicle.onShift = function (up) {
      if (up && self.vehicle.rpm > 5200) EngineAudio.bang(0.8, true);
      self.car.flame(self.vehicle.rpm > 6500 ? 0.9 : 0.4);
    };

    this.fx = new PostFX(renderer, innerWidth, innerHeight);
    this.fx.enabled = G.bloom;
    this.effects = new Effects(scene);
    this.hud = new HUD(this.world);

    /* carte d'environnement issue du ciel : reflets crédibles sur la peinture */
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.skyScene = new THREE.Scene();
    const skyClone = new THREE.Mesh(this.world.sky.geometry, this.world.sky.material);
    skyClone.scale.setScalar(100);
    this.skyScene.add(skyClone);
    this.refreshEnv();

    /* Les ombres se régénèrent au plus 60 fois par seconde : à 120 Hz une
       carte d'ombre d'une image d'âge est invisible, et c'est l'une des
       passes GPU les plus coûteuses. */
    this.world.sun.shadow.autoUpdate = false;
    this.world.sun.shadow.needsUpdate = true;

    this.camState = {
      pos: new V3(), look: new V3(), yaw: 0, pitch: 0, dist: 7.4, fov: this.baseFov, shake: 0
    };
    this.clock = new THREE.Clock();
    this.smokeTimer = 0;
    this.popTimer = 0;

    addEventListener('resize', function () { App.resize(); });
    this.resize();

    Input.onKey = function (code, e) { App.onKey(code, e); };
    renderer.setAnimationLoop(function () { App.frame(); });
  };

  App.refreshEnv = function () {
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.skyScene, 0.02, 1, 400);
    this.scene.environment = this.envRT.texture;
    this.world.envDirty = false;
  };

  App.resize = function () {
    if (!this.renderer) return;
    const w = Math.max(2, Math.floor(innerWidth * G.resScale));
    const h = Math.max(2, Math.floor(innerHeight * G.resScale));
    this.renderer.setSize(w, h, false);
    const cv = this.renderer.domElement;
    cv.style.width = '100%'; cv.style.height = '100%';
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.fx.setSize(w, h);
  };

  App.setPause = function (p) {
    G.paused = p;
    document.getElementById('pause').classList.toggle('hidden', !p);
    if (p) { if (EngineAudio.ctx) EngineAudio.ctx.suspend(); }
    else { EngineAudio.resume(); }
  };

  /* ---------------------------------------------------------------- */
  App.onKey = function (code, e) {
    if (!G.started) return;
    const v = this.vehicle;
    switch (code) {
      case 'Escape': this.setPause(!G.paused); break;
      case 'KeyH':
        document.getElementById('help').classList.toggle('hidden');
        break;
      case 'KeyC':
        G.cam = (G.cam + 1) % G.camNames.length;
        this.hud.toast('CAMÉRA ' + G.camNames[G.cam], 1.2);
        break;
      case 'KeyE':
        v.autoBox = !v.autoBox;
        document.getElementById('setAuto').checked = v.autoBox;
        this.hud.toast(v.autoBox ? 'BOÎTE AUTO' : 'BOÎTE SÉQUENTIELLE', 1.4);
        break;
      case 'ShiftLeft': case 'ShiftRight':
        if (!v.autoBox) v.shiftUp(); break;
      case 'ControlLeft': case 'ControlRight':
        if (!v.autoBox) v.shiftDown(); break;
      case 'KeyM':
        v.setDriveMode((v.driveMode + 1) % 3);
        document.querySelectorAll('#modes .pill').forEach(function (el, i) {
          el.classList.toggle('sel', i === v.driveMode);
        });
        this.hud.toast('MODE ' + MODES[v.driveMode], 1.4);
        break;
      case 'KeyL':
        v.launch = !v.launch;
        this.hud.toast(v.launch ? 'LAUNCH CONTROL ARMÉ — FREIN + GAZ' : 'LAUNCH CONTROL COUPÉ', 1.8);
        break;
      case 'KeyF':
        this.lightsOn = !this.lightsOn;
        this.hud.toast(this.lightsOn ? 'PHARES ALLUMÉS' : 'PHARES ÉTEINTS', 1.1);
        break;
      case 'KeyT':
        G.timeIdx = (G.timeIdx + 1) % TIMES.length;
        this.world.setTime(TIMES[G.timeIdx].t);
        this.refreshEnv();
        document.querySelectorAll('#times .pill').forEach(function (el, i) {
          el.classList.toggle('sel', i === G.timeIdx);
        });
        this.hud.toast(TIMES[G.timeIdx].name, 1.2);
        break;
      case 'KeyR': {
        const nr = this.world.nearestRoad(v.pos.x, v.pos.z);
        let h = 0;
        if (nr) {
          const r = nr.road, n = r.pts.length;
          const a = r.pts[nr.i], b = r.pts[(nr.i + 1) % n];
          h = Math.atan2(b[0] - a[0], b[1] - a[1]);
          v.respawn(a[0], a[1], h);
        } else v.respawn(v.pos.x, v.pos.z, 0);
        this.hud.toast('VÉHICULE REPLACÉ', 1.2);
        break;
      }
      case 'KeyP':
        G.photo = !G.photo;
        document.getElementById('photobar').classList.toggle('hidden', !G.photo);
        document.getElementById('hud').classList.toggle('hidden', G.photo);
        break;
    }
  };

  /* ---------------------------------------------------------------- */
  const _q = new THREE.Quaternion(), _v = new V3(), _v2 = new V3(), _v3 = new V3();
  const UP = new V3(0, 1, 0);

  App.frame = function () {
    /* Limiteur d'images. Par défaut aucun plafond : requestAnimationFrame
       se cale sur la dalle, donc 120 Hz sur un écran 120 Hz. Le pas de
       simulation est indépendant (accumulateur à 200 Hz), sauter une image
       ne fausse donc rien. */
    const now = performance.now();
    if (G.fpsCap > 0 && now - (this._lastFrame || 0) < 1000 / G.fpsCap - 0.6) return;
    const raw = now - (this._lastFrame || now);
    this._lastFrame = now;
    if (raw > 0.2) G.fps = G.fps ? G.fps + (1000 / raw - G.fps) * 0.08 : 1000 / raw;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const v = this.vehicle;

    if (!G.paused) {
      Input.sample(dt);
      if (!G.photo) {
        v.throttle = Input.throttle;
        v.brake = Input.brake;
        v.handbrake = Input.handbrake;
        v.steerInput = U.clamp(Input.steer, -1, 1);
        if (Input.padUp && !this._padUp && !v.autoBox) v.shiftUp();
        if (Input.padDown && !this._padDown && !v.autoBox) v.shiftDown();
        this._padUp = Input.padUp; this._padDown = Input.padDown;
      } else { v.throttle = 0; v.brake = 1; v.steerInput = 0; }

      v.update(dt);
      this.world.update(dt, v.pos);
      this.syncCar(dt);
      this.effects.update(dt);
      this.updateAudio(dt);
      this.updateRecords(dt);
    }

    this.updateCamera(dt);

    /* clignotement des phares selon l'heure */
    const night = this.world.night;
    this.car.setHeadlights(this.lightsOn || night > 0.35, night > 0.35);

    if (this.world.envDirty) this.refreshEnv();

    this._shadowAcc = (this._shadowAcc || 0) + dt;
    if (G.shadows && this._shadowAcc >= 1 / 60) {
      this.world.sun.shadow.needsUpdate = true;
      this._shadowAcc = 0;
    }

    const kmh = v.speed * 3.6;
    this.fx.render(this.scene, this.camera, {
      bloom: G.bloom ? (0.42 + night * 0.5) : 0,
      speedBlur: G.photo ? 0 : U.clamp((kmh - 120) / 700, 0, 0.13),
      time: performance.now() * 0.001,
      exposure: 1.0,
      grain: night > 0.4 ? 0.013 : 0.008
    });

    /* Le combiné et la carte sont redessinés au plus 60 fois par seconde :
       inutile de les repeindre à 120 Hz, et cela libère du temps CPU. */
    this._hudAcc = (this._hudAcc || 0) + dt;
    if (!G.paused && !G.photo && this._hudAcc >= 1 / 60) {
      this.hud.update(v, this._hudAcc, { t100: G.t100, vmax: G.vmax, fps: G.fps });
      this._hudAcc = 0;
    }
  };

  /* --------- transfert de l'état physique vers le modèle 3D --------- */
  App.syncCar = function (dt) {
    const v = this.vehicle;
    this.carPivot.position.copy(v.pos);
    this.carPivot.quaternion.copy(v.quat);

    for (let i = 0; i < 4; i++) {
      const w = v.wheels[i];
      this.car.setSusp(i, w.staticComp - w.comp);
      this.car.setSpin(i, w.spin);
    }
    this.car.setSteer(v.wheels[0].steer, v.wheels[1].steer);
    this.car.setSteeringWheel(v.steerAngle / v.maxSteer);
    this.car.setBrake(v.brake > 0.05, v.brake > 0.55);
    this.car.setReverse(v.gear < 0);
    this.car.setALA(v.alaOpen);
    this.car.decayFlame(dt);

    /* combiné de bord : 20 rafraîchissements par seconde suffisent */
    this._clsAcc = (this._clsAcc || 0) + dt;
    if (this._clsAcc >= 1 / 20) {
      this._clsAcc = 0;
      this.car.updateCluster({
        rpm: v.rpm, kmh: v.speed * 3.6, gear: v.gear,
        mode: ['STRADA', 'SPORT', 'CORSA'][v.driveMode],
        tc: v.tcActive > 0.25, abs: v.absActive > 0.25
      });
    }

    /* fumée et traces */
    let smoky = 0;
    for (let i = 0; i < 4; i++) {
      const w = v.wheels[i];
      if (!w.grounded) { this.effects.breakTrail(i); continue; }
      if (w.skid > 0.03 && v.speed > 2.5) {
        _v.copy(w.contact); _v.y = w.contact.y;
        _v2.copy(v.right);
        this.effects.mark(i, _v, _v2, w.width * 0.9, Math.min(0.85, w.skid));
        smoky = Math.max(smoky, w.skid);
      } else this.effects.breakTrail(i);
    }
    this.smokeTimer -= dt;
    if (smoky > 0.25 && this.smokeTimer <= 0) {
      this.smokeTimer = 0.024;
      for (let i = 2; i < 4; i++) {
        const w = v.wheels[i];
        if (w.skid < 0.2 || !w.grounded) continue;
        _v.copy(w.contact);
        _v.x += (Math.random() - 0.5) * 0.3; _v.y += 0.12; _v.z += (Math.random() - 0.5) * 0.3;
        _v2.copy(v.vel).multiplyScalar(-0.10);
        _v2.y += 0.7 + Math.random() * 0.5;
        _v2.addScaledVector(v.right, (Math.random() - 0.5) * 1.4);
        const dust = w.surface !== 'asphalt';
        this.effects.puff(_v, _v2, 0.75 + Math.random() * 0.7, dust ? 0x8b7a5c : 0xdcdcd8);
      }
    }
    /* gerbes de terre hors piste */
    if (v.speed > 6) {
      for (let i = 0; i < 4; i++) {
        const w = v.wheels[i];
        if (w.grounded && w.surface !== 'asphalt' && Math.random() < dt * 18) {
          _v.copy(w.contact); _v.y += 0.1;
          _v2.set((Math.random() - 0.5) * 2, 1.2 + Math.random(), (Math.random() - 0.5) * 2);
          this.effects.puff(_v, _v2, 0.5, 0x7d6b4e);
        }
      }
    }

    /* choc */
    if (v.impact > 0.8) {
      EngineAudio.impact(U.clamp(v.impact / 14, 0.05, 1));
      this.camState.shake = Math.min(1.1, v.impact / 10);
      v.impact = 0;
    }
    /* retournement : redressement automatique après 2,5 s */
    if (v.isUpsideDown() && v.speed < 2.5) {
      this.flipT = (this.flipT || 0) + dt;
      if (this.flipT > 2.5) {
        const nr = this.world.nearestRoad(v.pos.x, v.pos.z);
        if (nr) {
          const r = nr.road, n = r.pts.length;
          const a = r.pts[nr.i], b = r.pts[(nr.i + 1) % n];
          v.respawn(a[0], a[1], Math.atan2(b[0] - a[0], b[1] - a[1]));
        } else v.respawn(v.pos.x, v.pos.z, 0);
        this.flipT = 0;
      }
    } else this.flipT = 0;
  };

  /* --------------------------- audio --------------------------- */
  App.updateAudio = function (dt) {
    const v = this.vehicle;
    if (!EngineAudio.ready) return;
    const rpmN = U.clamp((v.rpm - 800) / 7900, 0, 1);
    /* charge = couple transmis rapporté au couple maxi */
    const torque = Math.abs(v.powerKW * 1000 / Math.max(60, v.omegaE));
    const load = U.clamp(Math.max(torque / 720, v.throttle * 0.55), 0, 1);

    let surface = 'asphalt', ground = 0;
    for (let i = 0; i < 4; i++) {
      if (v.wheels[i].grounded) { ground += 0.25; surface = v.wheels[i].surface; }
    }
    const inside = G.cam === 2 ? 1 : 0;
    EngineAudio.update(dt, {
      rpm: Math.max(v.engineOn ? 700 : 0, v.rpm),
      throttle: v.throttle,
      load: load,
      cut: v.cut,
      engineOn: v.engineOn || v.starter > 0,
      crank: v.starter,
      speed: v.speed,
      slip: v.wheelSlipMax,
      surface: surface === 'kerb' ? 'asphalt' : surface,
      inside: inside,
      tunnel: this.world.tunnelFactor(v.pos),
      wheelsOnGround: ground
    });

    /* flammes visibles synchronisées avec les pétarades */
    this.popTimer -= dt;
    if (v.rpm > 3500 && v.throttle < 0.06 && this.popTimer <= 0) {
      this.popTimer = 0.05 + Math.random() * 0.14;
      if (Math.random() < 0.45) this.car.flame(0.35 + Math.random() * 0.5);
    }
    if (v.cut && Math.random() < 0.3) this.car.flame(0.8);
  };

  /* --------------------------- chronos --------------------------- */
  App.updateRecords = function (dt) {
    const v = this.vehicle;
    const kmh = v.speed * 3.6;
    if (kmh > G.vmax) G.vmax = v.speed;
    if (kmh < 0.7) { G.t100Start = null; this._was100 = false; }
    if (kmh > 0.7 && G.t100Start === null && v.throttle > 0.5) G.t100Start = 0;
    if (G.t100Start !== null && !this._was100) {
      G.t100Start += dt;
      if (kmh >= 100) {
        G.t100 = G.t100Start;
        this._was100 = true;
        this.hud.toast('0–100 km/h : ' + G.t100.toFixed(2) + ' s', 2.6);
      }
      if (G.t100Start > 30) G.t100Start = null;
    }
  };

  /* --------------------------- caméras --------------------------- */
  App.updateCamera = function (dt) {
    const v = this.vehicle;
    const cam = this.camera, cs = this.camState;
    const kmh = v.speed * 3.6;

    /* regard libre à la souris */
    if (Input.mouse.down) {
      cs.yaw -= Input.mouse.dx * 0.0035;
      cs.pitch = U.clamp(cs.pitch - Input.mouse.dy * 0.0030, -0.6, 0.9);
    } else if (!G.photo) {
      cs.yaw = U.damp(cs.yaw, 0, 4, dt);
      cs.pitch = U.damp(cs.pitch, 0, 4, dt);
    }
    Input.mouse.dx = 0; Input.mouse.dy = 0;

    if (G.photo) {
      cs.dist = U.clamp(cs.dist + Input.mouse.wheel * 0.004, 2.2, 40);
      Input.mouse.wheel = 0;
      const y = cs.yaw, p = cs.pitch;
      _v.set(Math.sin(y) * Math.cos(p), Math.sin(p) + 0.25, Math.cos(y) * Math.cos(p))
        .multiplyScalar(cs.dist);
      cam.position.copy(v.pos).add(_v);
      cam.lookAt(v.pos.x, v.pos.y + 0.15, v.pos.z);
      cam.fov = U.damp(cam.fov, 42, 6, dt);
      cam.updateProjectionMatrix();
      return;
    }

    const mode = G.cam;
    if (mode === 0 || mode === 4) {
      /* poursuite : ressort amorti, hauteur et distance croissantes */
      const dist = (mode === 4 ? 10.5 : 7.0) + U.clamp(kmh / 130, 0, 2.1);
      const height = (mode === 4 ? 1.5 : 2.35) + U.clamp(kmh / 420, 0, 0.7);
      _v.copy(v.forward);
      _v.y = 0; _v.normalize();
      _v.applyAxisAngle(UP, cs.yaw);
      _v2.copy(v.pos).addScaledVector(_v, -dist);
      _v2.y += height + cs.pitch * 4;
      /* la caméra retarde légèrement -> sensation de vitesse */
      const lag = mode === 4 ? 3.2 : 6.4 + U.clamp(kmh / 40, 0, 5);
      cs.pos.lerp(_v2, 1 - Math.exp(-lag * dt));
      /* on évite de traverser le sol */
      const g = this.world.sample(cs.pos.x, cs.pos.z);
      if (cs.pos.y < g.y + 0.9) cs.pos.y = g.y + 0.9;
      cam.position.copy(cs.pos);

      _v3.copy(v.pos).addScaledVector(v.forward, 5.5 + kmh / 60);
      _v3.y += 0.9;
      cs.look.lerp(_v3, 1 - Math.exp(-9 * dt));
      cam.lookAt(cs.look);
      /* léger roulis caméra dans les appuis */
      cam.rotateZ(U.clamp(-v.gLat * 0.035, -0.09, 0.09));
    } else {
      /* caméras embarquées */
      if (mode === 1) _v.set(0, 0.62, 0.30);            /* capot */
      else if (mode === 2) _v.set(-0.36, 0.418, 0.16);  /* habitacle : oeil du pilote */
      else _v.set(0, -0.16, 2.35);                      /* pare-chocs */
      _v.applyQuaternion(v.quat).add(v.pos);
      /* petits mouvements de tête sous les accélérations */
      if (mode === 2) {
        _v.addScaledVector(v.right, -U.clamp(v.gLat, -1.2, 1.2) * 0.035);
        _v.y -= U.clamp(v.gLon, -1.5, 1.5) * 0.014;
      }
      cam.position.copy(_v);
      _v2.copy(v.forward).multiplyScalar(30).add(v.pos);
      _v2.y += 1.2 + cs.pitch * 12;
      _v2.addScaledVector(v.right, Math.sin(cs.yaw) * 26);
      cam.lookAt(_v2);
      cam.up.copy(v.up);
    }
    if (mode !== 1 && mode !== 2 && mode !== 3) cam.up.set(0, 1, 0);

    /* secousses : chocs et vibrations à haute vitesse */
    cs.shake = Math.max(0, cs.shake - dt * 2.4);
    const rough = v.wheels.reduce(function (s, w) {
      return s + (w.grounded && w.surface !== 'asphalt' ? 0.25 : 0);
    }, 0);
    const amp = cs.shake * 0.28 + U.clamp((kmh - 180) / 900, 0, 0.05) + rough * 0.035;
    if (amp > 0.0005) {
      cam.position.x += (Math.random() - 0.5) * amp;
      cam.position.y += (Math.random() - 0.5) * amp;
      cam.position.z += (Math.random() - 0.5) * amp;
    }

    /* champ de vision dynamique */
    const targetFov = this.baseFov + U.clamp(kmh / 12, 0, 22) + (v.throttle > 0.8 ? 2 : 0);
    cam.fov = U.damp(cam.fov, targetFov, 4, dt);
    cam.updateProjectionMatrix();
  };

  addEventListener('DOMContentLoaded', function () { App.boot(); });
  global.App = App;
})(window);
