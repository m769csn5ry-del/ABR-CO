/* =============================================================
   hud.js — combiné d'instruments et carte, dessinés en Canvas 2D
   ============================================================= */
(function (global) {
  'use strict';

  function HUD(world) {
    this.world = world;
    this.cluster = document.getElementById('cluster');
    this.cx = this.cluster.getContext('2d');
    this.map = document.getElementById('minimap');
    this.mx = this.map.getContext('2d');

    this.el = {
      speed: document.getElementById('speed'),
      gear: document.getElementById('gear'),
      mode: document.getElementById('mode'),
      thr: document.getElementById('barThrottle'),
      brk: document.getElementById('barBrake'),
      str: document.getElementById('barSteer'),
      tc: document.getElementById('aidTC'),
      abs: document.getElementById('aidABS'),
      ala: document.getElementById('aidALA'),
      lc: document.getElementById('aidLC'),
      glat: document.getElementById('tGlat'),
      glon: document.getElementById('tGlon'),
      df: document.getElementById('tDF'),
      pow: document.getElementById('tPow'),
      t100: document.getElementById('t100'),
      fps: document.getElementById('tFps'),
      vmax: document.getElementById('tVmax'),
      toast: document.getElementById('toast'),
      lights: document.getElementById('shiftlights')
    };
    this.shiftLamps = this.el.lights.querySelectorAll('i');
    this.needle = 0;
    this.toastT = 0;
    this._prepareMap();
  }

  /* ---------- carte statique pré-rendue (routes du monde) ---------- */
  HUD.prototype._prepareMap = function () {
    const S = 2048;
    const c = U.canvas(S, S), g = c.getContext('2d');
    const scale = S / global.WORLD_SIZE;
    g.translate(S / 2, S / 2);
    g.scale(scale, scale);
    g.lineCap = 'round'; g.lineJoin = 'round';
    /* liseré sombre puis chaussée */
    [[26, 'rgba(0,0,0,.55)'], [15, 'rgba(190,196,204,.92)']].forEach(function (style) {
      g.lineWidth = style[0];
      g.strokeStyle = style[1];
      this.world.roads.forEach(function (r) {
        g.beginPath();
        g.moveTo(r.pts[0][0], r.pts[0][1]);
        for (let i = 1; i < r.pts.length; i++) g.lineTo(r.pts[i][0], r.pts[i][1]);
        if (r.closed) g.closePath();
        g.stroke();
      });
    }, this);
    this.mapCanvas = c;
    this.mapScale = scale;
  };

  HUD.prototype.toast = function (text, dur) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastT = dur || 1.8;
  };

  /* ---------------------------- combiné ---------------------------- */
  HUD.prototype.drawCluster = function (v, dt) {
    const g = this.cx, S = this.cluster.width, R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.translate(R, R);

    const A0 = Math.PI * 0.80, A1 = Math.PI * 2.20;     /* plage d'aiguille */
    const maxRpm = 9000;
    const rr = R - 26;

    /* fond */
    g.beginPath(); g.arc(0, 0, rr + 20, 0, 6.2832);
    g.fillStyle = 'rgba(7,9,12,.62)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(200,164,74,.30)'; g.stroke();

    /* arc de fond */
    g.lineWidth = 20;
    g.strokeStyle = 'rgba(255,255,255,.055)';
    g.beginPath(); g.arc(0, 0, rr - 6, A0, A1); g.stroke();

    /* zone rouge */
    const aRed = A0 + (A1 - A0) * (8500 / maxRpm);
    g.strokeStyle = 'rgba(255,45,45,.30)';
    g.beginPath(); g.arc(0, 0, rr - 6, aRed, A1); g.stroke();

    /* barre de régime */
    this.needle += (v.rpm - this.needle) * Math.min(1, dt * 18);
    const aNow = A0 + (A1 - A0) * U.clamp(this.needle / maxRpm, 0, 1);
    const grad = g.createLinearGradient(-rr, 0, rr, 0);
    grad.addColorStop(0, '#c8a44a'); grad.addColorStop(0.72, '#ffd36a'); grad.addColorStop(1, '#ff3b30');
    g.strokeStyle = grad;
    g.lineWidth = 20;
    g.beginPath(); g.arc(0, 0, rr - 6, A0, Math.max(A0 + 0.001, aNow)); g.stroke();

    /* graduations */
    g.lineWidth = 2;
    for (let r = 0; r <= 9; r++) {
      const a = A0 + (A1 - A0) * (r / 9);
      const big = true;
      g.strokeStyle = r >= 8.5 ? '#ff5b52' : 'rgba(255,255,255,.62)';
      g.beginPath();
      g.moveTo(Math.cos(a) * (rr - 22), Math.sin(a) * (rr - 22));
      g.lineTo(Math.cos(a) * (rr - (big ? 34 : 28)), Math.sin(a) * (rr - (big ? 34 : 28)));
      g.stroke();
      g.save();
      g.fillStyle = r >= 8.5 ? '#ff8078' : 'rgba(233,237,242,.85)';
      g.font = '600 20px Bahnschrift, DIN Alternate, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(r), Math.cos(a) * (rr - 52), Math.sin(a) * (rr - 52));
      g.restore();
      /* petites graduations */
      if (r < 9) {
        for (let k = 1; k < 5; k++) {
          const a2 = A0 + (A1 - A0) * ((r + k / 5) / 9);
          g.strokeStyle = 'rgba(255,255,255,.22)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(Math.cos(a2) * (rr - 22), Math.sin(a2) * (rr - 22));
          g.lineTo(Math.cos(a2) * (rr - 29), Math.sin(a2) * (rr - 29));
          g.stroke();
        }
      }
    }

    /* aiguille */
    g.save();
    g.rotate(aNow);
    g.beginPath();
    g.moveTo(-6, 0); g.lineTo(rr - 30, -2.6); g.lineTo(rr - 22, 0); g.lineTo(rr - 30, 2.6);
    g.closePath();
    g.fillStyle = '#ff3b30';
    g.shadowColor = 'rgba(255,59,48,.85)'; g.shadowBlur = 14;
    g.fill();
    g.restore();
    g.beginPath(); g.arc(0, 0, 9, 0, 6.2832); g.fillStyle = '#15171b'; g.fill();
    g.strokeStyle = '#c8a44a'; g.lineWidth = 2; g.stroke();

    /* libellés */
    g.fillStyle = 'rgba(150,158,167,.85)';
    g.font = '500 11px Bahnschrift, sans-serif';
    g.textAlign = 'center';
    g.fillText('x1000 tr/min', 0, -R + 62);

    g.restore();
  };

  /* ---------------------------- carte ---------------------------- */
  HUD.prototype.drawMap = function (v) {
    const g = this.mx, S = this.map.width, R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(R, R, R - 2, 0, 6.2832); g.clip();
    g.fillStyle = 'rgba(9,12,16,.72)'; g.fillRect(0, 0, S, S);

    const zoom = 1.05;                       /* ~260 m de rayon visible */
    const heading = Math.atan2(v.forward.x, v.forward.z);
    g.translate(R, R);
    g.rotate(heading);
    g.scale(zoom, zoom);
    g.translate(-(v.pos.x * this.mapScale + this.mapCanvas.width / 2),
      -(v.pos.z * this.mapScale + this.mapCanvas.height / 2));
    g.drawImage(this.mapCanvas, 0, 0);
    g.restore();

    /* véhicule au centre */
    g.save();
    g.translate(R, R);
    g.beginPath();
    g.moveTo(0, -9); g.lineTo(6, 8); g.lineTo(0, 4.5); g.lineTo(-6, 8);
    g.closePath();
    g.fillStyle = '#c8a44a';
    g.shadowColor = 'rgba(200,164,74,.9)'; g.shadowBlur = 8;
    g.fill();
    g.restore();

    /* cadre */
    g.beginPath(); g.arc(R, R, R - 2, 0, 6.2832);
    g.strokeStyle = 'rgba(200,164,74,.35)'; g.lineWidth = 2; g.stroke();
    /* nord */
    g.save();
    g.translate(R, R);
    const na = Math.atan2(v.forward.x, v.forward.z);
    g.rotate(na);
    g.fillStyle = 'rgba(255,90,80,.9)';
    g.beginPath(); g.moveTo(0, -R + 10); g.lineTo(4, -R + 18); g.lineTo(-4, -R + 18); g.closePath(); g.fill();
    g.restore();
  };

  /* ---------------------------- mise à jour ---------------------------- */
  const MODES = ['STRADA', 'SPORT', 'CORSA'];
  HUD.prototype.update = function (v, dt, extra) {
    this.drawCluster(v, dt);
    /* la carte bouge lentement : 20 rafraîchissements par seconde suffisent */
    this._mapAcc = (this._mapAcc || 0) + dt;
    if (this._mapAcc >= 1 / 20) { this.drawMap(v); this._mapAcc = 0; }

    const kmh = v.speed * 3.6;
    this.el.speed.textContent = Math.round(kmh);
    this.el.gear.textContent = v.gear === 0 ? 'N' : v.gear < 0 ? 'R' : String(v.gear);
    this.el.mode.textContent = MODES[v.driveMode] + (v.autoBox ? ' · A' : ' · M');

    this.el.thr.style.width = (v.throttle * 100).toFixed(0) + '%';
    this.el.brk.style.width = (v.brake * 100).toFixed(0) + '%';
    const s = v.steerInput;
    this.el.str.style.width = (Math.abs(s) * 50).toFixed(0) + '%';
    this.el.str.style.left = s < 0 ? (50 - Math.abs(s) * 50).toFixed(0) + '%' : '50%';

    this.el.tc.className = v.tcOn ? (v.tcActive > 0.25 ? 'act' : 'on') : '';
    this.el.abs.className = v.absOn ? (v.absActive > 0.25 ? 'act' : 'on') : '';
    this.el.ala.className = v.alaOn ? (v.alaOpen > 0.4 ? 'act' : 'on') : '';
    this.el.lc.className = v.launch ? 'act' : '';

    this.el.glat.textContent = Math.abs(v.gLat).toFixed(2);
    this.el.glon.textContent = v.gLon.toFixed(2);
    this.el.df.textContent = Math.round(v.downforce / 9.81) + ' kg';
    this.el.pow.textContent = Math.round(v.powerKW * 1.35962) + ' ch';
    this.el.t100.textContent = extra.t100 ? extra.t100.toFixed(2) + ' s' : '—';
    this.el.vmax.textContent = Math.round(extra.vmax * 3.6) + ' km/h';
    if (extra.fps) this.el.fps.textContent = Math.round(extra.fps);

    /* témoins de passage de rapport */
    const frac = U.clamp((v.rpm - 5600) / (v.limiter - 5600), 0, 1);
    const lit = Math.round(frac * this.shiftLamps.length);
    const flash = v.rpm > v.redline + 120;
    this.el.lights.classList.toggle('flash', flash);
    for (let i = 0; i < this.shiftLamps.length; i++) {
      const on = i < lit;
      this.shiftLamps[i].className = on
        ? (i < 4 ? 'on1' : i < 7 ? 'on2' : 'on3') : '';
    }

    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.el.toast.classList.remove('show');
    }
  };

  global.HUD = HUD;
})(window);
