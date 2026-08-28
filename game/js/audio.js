/* =============================================================
   audio.js — synthèse temps réel du V12 6.5 L + ligne Gintani

   Aucun échantillon audio n'est utilisé : le son est calculé
   échantillon par échantillon dans un AudioWorklet.

   Principe (physiquement motivé) :
     · la hauteur du son d'échappement = fréquence d'allumage
         f = tr/min / 60 * (12 cylindres / 2 tours)  =  tr/min / 10
       -> 900 tr/min : 90 Hz (grondement)   8700 tr/min : 870 Hz (cri)
     · le timbre = résonances FIXES de la ligne d'échappement
       (formants) excitées par chaque bouffée de gaz.
     · une ligne straight-pipe titane (Gintani) = très peu
       d'amortissement -> résonateurs à Q élevé, brillance forte,
       saturation à la charge, et retours de flamme à la décélération.
     · les 2 bancs de 6 cylindres alimentent 2 jeux de résonateurs
       légèrement désaccordés -> image stéréo et battements réels.
   ============================================================= */
(function (global) {
  'use strict';

  /* -----------------------------------------------------------------
     Noyau DSP. Cette classe est sérialisée (toString) pour être
     injectée dans l'AudioWorklet : elle ne doit RIEN référencer
     de la portée extérieure.
     ----------------------------------------------------------------- */
  class V12Core {
    constructor(sr) {
      this.sr = sr;
      this.inv = 1 / sr;

      /* ---- paramètres pilotés depuis le jeu (cibles + valeurs lissées) */
      this.p = { rpm: 0, thr: 0, load: 0, cut: 0, valve: 1, inside: 0, on: 0, crank: 0 };
      this.s = { rpm: 0, thr: 0, load: 0, cut: 0, valve: 1, inside: 0, on: 0, crank: 0 };

      /* ---- allumage : 12 cylindres, 2 bancs (V60°) */
      this.firePhase = 0;
      this.cyl = 0;
      /* dispersion cylindre à cylindre : c'est elle qui donne le côté
         « brut », les sous-harmoniques et le grain d'un V12 de course */
      this.cylGain = new Float32Array(12);
      this.cylJit = new Float32Array(12);
      let seed = 12345;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 12; i++) {
        this.cylGain[i] = 0.965 + rnd() * 0.07;
        this.cylJit[i] = (rnd() - 0.5) * 0.012;
      }

      /* ---- banc de résonateurs (formants de la ligne d'échappement) */
      const F = [96, 188, 291, 423, 638, 985, 1520, 2380, 3450, 5200];
      const BW = [46, 48, 52, 58, 70, 96, 150, 240, 420, 900];
      const G = [0.30, 0.34, 0.42, 0.50, 0.62, 0.72, 0.68, 0.58, 0.40, 0.22];
      this.res = [[], []];
      for (let b = 0; b < 2; b++) {
        const det = b === 0 ? 0.9915 : 1.0089;   // désaccord des 2 bancs
        for (let i = 0; i < F.length; i++) {
          const f = F[i] * det;
          const r = Math.exp(-Math.PI * BW[i] / sr);
          const w = 2 * Math.PI * f / sr;
          this.res[b].push({
            a1: 2 * r * Math.cos(w), a2: -r * r,
            g: G[i] * (1 - r), y1: 0, y2: 0, hi: i >= 6
          });
        }
      }

      /* ---- état des bouffées d'échappement (une par banc) */
      this.pulse = [{ t: 1e9, len: 1, amp: 0 }, { t: 1e9, len: 1, amp: 0 }];

      /* ---- résonateurs des retours de flamme (pétarades) */
      this.pop = [];
      for (let i = 0; i < 3; i++) this.pop.push({ y1: 0, y2: 0, a1: 0, a2: 0, env: 0, dec: 0, g: 0 });
      this.popIdx = 0;

      /* ---- admission : bruit filtré passe-bande suiveur de régime */
      this.inNoise = { y1: 0, y2: 0 };
      /* ---- distribution / pignonnerie */
      this.mechPh = 0;
      /* ---- filtres de sortie */
      this.dcL = { x: 0, y: 0 }; this.dcR = { x: 0, y: 0 };
      this.lpL = 0; this.lpR = 0;
      this.hpL = { x: 0, y: 0 }; this.hpR = { x: 0, y: 0 };
      this.rngS = 987654321;
    }

    rnd() {
      this.rngS ^= this.rngS << 13; this.rngS >>>= 0;
      this.rngS ^= this.rngS >> 17;
      this.rngS ^= this.rngS << 5; this.rngS >>>= 0;
      return this.rngS / 4294967296;
    }

    setParams(o) {
      for (const k in o) if (this.p[k] !== undefined) this.p[k] = o[k];
    }

    /* déclenche une explosion de retour de flamme */
    bang(intensity, big) {
      const r = this.pop[this.popIdx];
      this.popIdx = (this.popIdx + 1) % this.pop.length;
      const f = big ? 150 + this.rnd() * 180 : 620 + this.rnd() * 1500;
      const bw = big ? 130 : 420;
      const rr = Math.exp(-Math.PI * bw / this.sr);
      const w = 2 * Math.PI * f / this.sr;
      r.a1 = 2 * rr * Math.cos(w); r.a2 = -rr * rr;
      r.env = 1; r.g = intensity * (big ? 1.5 : 0.85);
      r.dec = Math.exp(-1 / (this.sr * (big ? 0.075 : 0.013)));
      r.y1 = 0; r.y2 = 0;
    }

    /* un échantillon stéréo -> [L, R] dans out2 */
    tick(out2) {
      const s = this.s, p = this.p;
      /* lissage des paramètres (évite les zips) */
      const k = 0.0016;
      s.rpm += (p.rpm - s.rpm) * 0.02;
      s.thr += (p.thr - s.thr) * k * 12;
      s.load += (p.load - s.load) * k * 8;
      s.cut += (p.cut - s.cut) * 0.05;
      s.valve += (p.valve - s.valve) * k * 4;
      s.inside += (p.inside - s.inside) * 0.0006;
      s.on += (p.on - s.on) * 0.0008;
      s.crank += (p.crank - s.crank) * 0.002;

      const rpm = s.rpm;
      const rn = Math.min(1, Math.max(0, (rpm - 800) / 7900));   // régime normalisé
      /* fréquence d'allumage : 6 explosions par tour de vilebrequin */
      const fire = rpm * 0.1;

      /* --------- avance de la phase d'allumage --------- */
      this.firePhase += fire * this.inv;
      let fired = -1;
      if (this.firePhase >= 1) {
        this.firePhase -= 1;
        this.cyl = (this.cyl + 1) % 12;
        fired = this.cyl;
      }

      /* --------- une bouffée de gaz par allumage --------- */
      if (fired >= 0) {
        /* Ordre d'allumage alterné entre les deux bancs (V12 à 60°,
           allumage régulier). Grouper 6 coups par banc créait un
           battement parasite à la fréquence de rotation. */
        const bank = fired & 1;
        /* coupure d'injection (limiteur / lever de pied) : le cylindre
           ne brûle pas -> souffle sourd, puis pétarade */
        const cutNow = s.cut > 0.5;
        const misfire = cutNow || (s.thr < 0.06 && rpm > 2500 && this.rnd() < 0.55);
        const combustion = misfire ? 0.16 : 1;
        /* la charge (pression moyenne effective) donne le coup de boutoir */
        const drive = 0.30 + 0.70 * s.load;
        const amp = this.cylGain[fired] * combustion * drive * (0.55 + 0.45 * rn) * s.on;
        const pu = this.pulse[bank];
        pu.t = 0;
        pu.len = Math.max(4, Math.floor(this.sr * (0.0016 + 0.0038 * (1 - rn))));
        pu.amp = amp * (1 + this.cylJit[fired]);

        /* --------- retours de flamme Gintani --------- */
        if (rpm > 2600 && (cutNow || s.thr < 0.05)) {
          const prob = cutNow ? 0.34 : 0.14 * rn;
          if (this.rnd() < prob) this.bang((0.35 + 0.65 * rn) * (0.6 + 0.6 * this.rnd()), this.rnd() < 0.22);
        }
      }

      /* --------- excitation des résonateurs --------- */
      let xL = 0, xR = 0;
      for (let b = 0; b < 2; b++) {
        const pu = this.pulse[b];
        let x = 0;
        if (pu.t < pu.len) {
          const t = pu.t / pu.len;
          /* attaque quasi verticale puis détente : signature straight-pipe */
          const env = t < 0.12 ? t / 0.12 : Math.exp(-(t - 0.12) * 5.5);
          const turb = 1 + 0.55 * (this.rnd() - 0.5) * (0.4 + 0.6 * rn);
          x = pu.amp * env * turb;
          pu.t++;
        }
        const bank = this.res[b];
        let y = 0;
        for (let i = 0; i < bank.length; i++) {
          const r = bank[i];
          const v = r.a1 * r.y1 + r.a2 * r.y2 + r.g * x;
          r.y2 = r.y1; r.y1 = v;
          /* les formants aigus ne montent qu'en charge (le cri du V12) */
          y += r.hi ? v * (0.35 + 0.95 * s.load * (0.3 + 0.7 * rn)) : v;
        }
        if (b === 0) xL += y; else xR += y;
      }

      /* --------- pétarades --------- */
      let popOut = 0;
      for (let i = 0; i < this.pop.length; i++) {
        const r = this.pop[i];
        if (r.env > 0.0004) {
          const x = (this.rnd() - 0.5) * r.env * r.g;
          const v = r.a1 * r.y1 + r.a2 * r.y2 + x;
          r.y2 = r.y1; r.y1 = v;
          r.env *= r.dec;
          popOut += v * 0.55;
        }
      }
      /* la déflagration part surtout d'un côté (sortie centrale, mais
         l'onde se réfléchit) */
      xL += popOut * 0.9; xR += popOut * 1.05;

      /* --------- admission : rugissement des 12 trompettes --------- */
      const nz = this.rnd() - 0.5;
      {
        const f = Math.min(this.sr * 0.42, 220 + fire * 1.35);
        const r = 0.974;
        const w = 2 * Math.PI * f / this.sr;
        const v = 2 * r * Math.cos(w) * this.inNoise.y1 - r * r * this.inNoise.y2 + nz * (1 - r);
        this.inNoise.y2 = this.inNoise.y1; this.inNoise.y1 = v;
        const g = 11 * s.thr * (0.25 + 0.75 * rn) * s.on * (0.55 + 1.55 * s.inside);
        xL += v * g; xR += v * g * 0.92;
      }

      /* --------- bruits mécaniques (distribution, pignons) --------- */
      this.mechPh += (fire * 2) * this.inv;
      if (this.mechPh > 1) this.mechPh -= 1;
      const mech = Math.sin(this.mechPh * 6.28318) * 0.02 * rn * s.on * (0.4 + 1.4 * s.inside);
      xL += mech; xR += mech * 0.9;

      /* --------- démarreur --------- */
      if (s.crank > 0.01) {
        const wob = Math.sin(this.firePhase * 6.28318 * 3) * 0.5 + 0.5;
        const st = (this.rnd() - 0.5) * 0.28 * s.crank * (0.5 + wob);
        xL += st; xR += st * 0.95;
      }

      /* --------- saturation : la ligne titane « déchire » en charge --------- */
      const dr = 1.0 + 3.4 * s.load * (0.35 + 0.65 * rn);
      const norm = 1 / Math.tanh(dr);
      xL = Math.tanh(xL * dr) * norm;
      xR = Math.tanh(xR * dr) * norm;

      /* --------- filtrage de sortie --------- */
      /* coupe-bas (on ne veut pas de continu) */
      let v = xL - this.dcL.x + 0.9985 * this.dcL.y; this.dcL.x = xL; this.dcL.y = v; xL = v;
      v = xR - this.dcR.x + 0.9985 * this.dcR.y; this.dcR.x = xR; this.dcR.y = v; xR = v;
      /* passe-bas anti-repliement + effet habitacle (vitres fermées) */
      const fc = 1 - Math.exp(-2 * Math.PI * (11000 - 8200 * s.inside) * this.inv);
      this.lpL += (xL - this.lpL) * fc; this.lpR += (xR - this.lpR) * fc;

      /* Niveau : un atmosphérique à l'échappement libre passe d'un
         grondement discret au ralenti à un cri assourdissant à 8 500.
         ~22 dB d'écart entre les deux extrêmes. */
      const loud = Math.pow(0.08 + 0.92 * s.load * (0.30 + 0.70 * rn), 0.8) * (0.50 + 0.50 * rn);
      const g = 0.42 * loud * (0.45 + 0.55 * s.valve);
      /* coupe-bas à ~65 Hz : on retire le boum inutile */
      const hp = 0.9915;
      let oL = this.lpL - this.hpL.x + hp * this.hpL.y; this.hpL.x = this.lpL; this.hpL.y = oL;
      let oR = this.lpR - this.hpR.x + hp * this.hpR.y; this.hpR.x = this.lpR; this.hpR.y = oR;
      out2[0] = oL * g;
      out2[1] = oR * g;
    }
  }

  /* -----------------------------------------------------------------
     Enveloppe WebAudio : bus, réverbération, pneus, vent, chocs
     ----------------------------------------------------------------- */
  const A = {
    ready: false, ctx: null, core: null, node: null,
    master: null, engineBus: null, verbSend: null,
    volume: 0.8, inside: 0, tunnel: 0,
    _sq: null, _wind: null, _road: null, _grav: null,
    _last: { rpm: 0 }
  };

  function noiseBuffer(ctx, seconds) {
    const len = (ctx.sampleRate * seconds) | 0;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        /* léger rose : plus proche des bruits réels (vent, route) */
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
      }
    }
    return buf;
  }

  /* réponse impulsionnelle synthétique : rue / tunnel */
  function impulse(ctx, seconds, decay, bright) {
    const len = (ctx.sampleRate * seconds) | 0;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        const n = Math.random() * 2 - 1;
        lp += (n - lp) * bright;
        /* premières réflexions marquées : parois du tunnel */
        const early = (i % ((ctx.sampleRate * 0.037) | 0) < 3) ? 2.2 : 1;
        d[i] = lp * env * early * 0.6;
      }
    }
    return buf;
  }

  function loopSource(ctx, buf, dest, gain, filter) {
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = gain;
    if (filter) { src.connect(filter); filter.connect(g); }
    else src.connect(g);
    g.connect(dest);
    src.start();
    return { src: src, gain: g, filter: filter };
  }

  A.init = function () {
    if (A.ready) return Promise.resolve(true);
    const Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) return Promise.resolve(false);
    const ctx = new Ctx({ latencyHint: 'interactive' });
    A.ctx = ctx;

    /* ------ chaîne maître ------ */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -13; comp.knee.value = 22;
    comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.19;
    const master = ctx.createGain();
    master.gain.value = A.volume;
    comp.connect(master); master.connect(ctx.destination);
    A.master = master; A.comp = comp;

    /* ------ bus moteur ------ */
    const engineBus = ctx.createGain(); engineBus.gain.value = 1;
    engineBus.connect(comp);
    A.engineBus = engineBus;

    /* ------ réverbération (rue / tunnel) ------ */
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 1.9, 3.0, 0.34);
    const send = ctx.createGain(); send.gain.value = 0.06;
    const wet = ctx.createGain(); wet.gain.value = 0.9;
    engineBus.connect(send); send.connect(conv); conv.connect(wet); wet.connect(comp);
    A.verbSend = send;

    /* ------ bruits d'ambiance ------ */
    const nb = noiseBuffer(ctx, 3);
    A.noiseBuf = nb;

    const windF = ctx.createBiquadFilter();
    windF.type = 'bandpass'; windF.frequency.value = 700; windF.Q.value = 0.55;
    A._wind = loopSource(ctx, nb, comp, 0, windF);

    const roadF = ctx.createBiquadFilter();
    roadF.type = 'lowpass'; roadF.frequency.value = 420; roadF.Q.value = 0.9;
    A._road = loopSource(ctx, nb, comp, 0, roadF);

    const sqF = ctx.createBiquadFilter();
    sqF.type = 'bandpass'; sqF.frequency.value = 1500; sqF.Q.value = 7.5;
    A._sq = loopSource(ctx, nb, comp, 0, sqF);
    const sqF2 = ctx.createBiquadFilter();
    sqF2.type = 'bandpass'; sqF2.frequency.value = 3050; sqF2.Q.value = 11;
    A._sq2 = loopSource(ctx, nb, comp, 0, sqF2);

    const grF = ctx.createBiquadFilter();
    grF.type = 'bandpass'; grF.frequency.value = 2400; grF.Q.value = 0.8;
    A._grav = loopSource(ctx, nb, comp, 0, grF);

    /* ------ moteur : AudioWorklet, sinon repli ScriptProcessor ------ */
    const src =
      String(V12Core) + '\n' +
      'class V12Proc extends AudioWorkletProcessor{\n' +
      '  constructor(){super();this.core=new V12Core(sampleRate);this.tmp=[0,0];\n' +
      '    this.port.onmessage=(e)=>{const d=e.data;\n' +
      '      if(d.bang!==undefined){this.core.bang(d.bang,!!d.big);}\n' +
      '      else this.core.setParams(d);};}\n' +
      '  process(inputs,outputs){const o=outputs[0];const L=o[0],R=o[1]||o[0];\n' +
      '    for(let i=0;i<L.length;i++){this.core.tick(this.tmp);L[i]=this.tmp[0];R[i]=this.tmp[1];}\n' +
      '    return true;}\n' +
      '}\n' +
      'registerProcessor("v12",V12Proc);\n';

    const finish = () => { A.ready = true; return true; };

    if (ctx.audioWorklet) {
      const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
      return ctx.audioWorklet.addModule(url).then(function () {
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(ctx, 'v12', { outputChannelCount: [2] });
        node.connect(engineBus);
        A.node = node;
        A.post = (o) => node.port.postMessage(o);
        return finish();
      }).catch(function () { return A._fallback(engineBus, finish); });
    }
    return Promise.resolve(A._fallback(engineBus, finish));
  };

  /* Repli : même DSP, exécuté dans le thread principal */
  A._fallback = function (bus, finish) {
    const ctx = A.ctx;
    const core = new V12Core(ctx.sampleRate);
    const sp = ctx.createScriptProcessor(1024, 0, 2);
    const tmp = [0, 0];
    sp.onaudioprocess = function (e) {
      const L = e.outputBuffer.getChannelData(0);
      const R = e.outputBuffer.getChannelData(1);
      for (let i = 0; i < L.length; i++) { core.tick(tmp); L[i] = tmp[0]; R[i] = tmp[1]; }
    };
    sp.connect(bus);
    A.node = sp; A.core = core;
    A.post = (o) => { if (o.bang !== undefined) core.bang(o.bang, o.big); else core.setParams(o); };
    return finish();
  };

  A.resume = function () { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume(); };
  A.setVolume = function (v) { A.volume = v; if (A.master) A.master.gain.value = v; };

  /* ---- transitoires ponctuels ---------------------------------- */
  A.bang = function (i, big) { if (A.ready) A.post({ bang: i, big: !!big }); };

  A.impact = function (force) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
    s.playbackRate.value = 0.35 + Math.random() * 0.25;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 160 + 700 * Math.min(1, force);
    const g = ctx.createGain();
    const amp = Math.min(0.85, 0.12 + force * 0.75);
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + force * 0.35);
    s.connect(f); f.connect(g); g.connect(A.comp);
    s.start(t); s.stop(t + 0.7);
    /* composante métallique */
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(220 + Math.random() * 260, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    const og = ctx.createGain();
    og.gain.setValueAtTime(amp * 0.35, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(og); og.connect(A.comp); o.start(t); o.stop(t + 0.35);
  };

  /* ---- mise à jour continue ------------------------------------- */
  /* st : { rpm, throttle, load, cut, engineOn, crank, speed, slip,
            surface, inside, tunnel, wheelsOnGround }                */
  A.update = function (dt, st) {
    if (!A.ready) return;
    const ctx = A.ctx;

    A.post({
      rpm: st.rpm, thr: st.throttle, load: st.load,
      cut: st.cut ? 1 : 0, valve: st.valve === undefined ? 1 : st.valve,
      inside: st.inside, on: st.engineOn ? 1 : 0, crank: st.crank || 0
    });

    const kmh = st.speed * 3.6;
    const now = ctx.currentTime, tc = 0.06;

    /* vent : croît avec le carré de la vitesse, étouffé dans l'habitacle */
    const wind = Math.min(0.34, Math.pow(kmh / 340, 2.1) * 0.42) * (st.inside ? 0.5 : 1);
    A._wind.gain.gain.setTargetAtTime(wind, now, tc);
    A._wind.filter.frequency.setTargetAtTime(420 + kmh * 3.4, now, tc);

    /* roulement : dépend du revêtement */
    const rough = st.surface === 'grass' ? 1.55 : st.surface === 'dirt' ? 1.9 : 1;
    const road = Math.min(0.22, (kmh / 300) * 0.20) * rough * st.wheelsOnGround * (st.inside ? 0.75 : 1);
    A._road.gain.gain.setTargetAtTime(road, now, tc);
    A._road.filter.frequency.setTargetAtTime(180 + kmh * 3.2, now, tc);

    /* crissement : uniquement sur asphalte et sous glissement réel */
    const sq = st.surface === 'asphalt'
      ? Math.min(0.30, Math.max(0, st.slip - 0.16) * 0.55) * Math.min(1, kmh / 12)
      : 0;
    A._sq.gain.gain.setTargetAtTime(sq, now, 0.045);
    A._sq2.gain.gain.setTargetAtTime(sq * 0.55, now, 0.045);
    A._sq.filter.frequency.setTargetAtTime(1150 + st.slip * 900 + kmh * 1.4, now, 0.08);

    /* gravier / herbe */
    const gr = st.surface !== 'asphalt' ? Math.min(0.26, (kmh / 160) * 0.22) * st.wheelsOnGround : 0;
    A._grav.gain.gain.setTargetAtTime(gr, now, 0.07);

    /* réverbération : forte sous un tunnel, présente en ville */
    A.verbSend.gain.setTargetAtTime(0.05 + st.tunnel * 0.85, now, 0.25);
  };

  global.EngineAudio = A;
})(window);
