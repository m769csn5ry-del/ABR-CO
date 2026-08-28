/* =============================================================
   postfx.js — chaîne de post-traitement autonome
   (aucun module examples/ de three.js n'est requis)

   Extraction des hautes lumières -> flou séparable en 4 niveaux
   -> composition avec vignettage, aberration chromatique,
   grain argentique et léger flou radial de vitesse.
   ============================================================= */
(function (global) {
  'use strict';

  const QUAD_VS = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  ].join('\n');

  const BRIGHT_FS = [
    'uniform sampler2D tDiffuse; uniform float threshold; uniform float softness;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec4 c = texture2D(tDiffuse, vUv);',
    '  float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));',
    '  float k = smoothstep(threshold, threshold + softness, l);',
    '  gl_FragColor = vec4(c.rgb * k, 1.0);',
    '}'
  ].join('\n');

  const BLUR_FS = [
    'uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;',
    'void main(){',
    '  vec4 s = texture2D(tDiffuse, vUv) * 0.2270270270;',
    '  s += texture2D(tDiffuse, vUv + dir*1.3846153846) * 0.3162162162;',
    '  s += texture2D(tDiffuse, vUv - dir*1.3846153846) * 0.3162162162;',
    '  s += texture2D(tDiffuse, vUv + dir*3.2307692308) * 0.0702702703;',
    '  s += texture2D(tDiffuse, vUv - dir*3.2307692308) * 0.0702702703;',
    '  gl_FragColor = s;',
    '}'
  ].join('\n');

  const COMP_FS = [
    'uniform sampler2D tDiffuse, tB0, tB1, tB2, tB3;',
    'uniform float bloom, vignette, chroma, grain, speedBlur, time, exposure;',
    'varying vec2 vUv;',
    'float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }',
    /* La scene est rendue dans une cible lineaire : le mappage tonal est
       deja applique, mais pas la conversion sRGB attendue par le canvas. */
    'vec3 lin2srgb(vec3 c){ c = max(c, vec3(0.0));',
    '  return mix(c*12.92, 1.055*pow(c, vec3(0.4166667)) - 0.055, step(vec3(0.0031308), c)); }',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec2 ctr = uv - 0.5;',
    '  float r2 = dot(ctr, ctr);',
    /* flou radial de vitesse */
    '  vec3 base = vec3(0.0);',
    '  if(speedBlur > 0.001){',
    '    float w = 0.0;',
    '    for(int i=0;i<6;i++){',
    '      float t = float(i)/5.0;',
    '      vec2 o = uv - ctr * t * speedBlur * smoothstep(0.02,0.30,r2);',
    '      float ww = 1.0 - t*0.55;',
    '      base += texture2D(tDiffuse, o).rgb * ww; w += ww;',
    '    }',
    '    base /= w;',
    '  } else { base = texture2D(tDiffuse, uv).rgb; }',
    /* aberration chromatique en périphérie */
    '  if(chroma > 0.0001){',
    '    float k = chroma * r2;',
    '    base.r = texture2D(tDiffuse, uv - ctr*k).r;',
    '    base.b = texture2D(tDiffuse, uv + ctr*k).b;',
    '  }',
    '  vec3 bl = texture2D(tB0, uv).rgb * 0.45 + texture2D(tB1, uv).rgb * 0.30',
    '          + texture2D(tB2, uv).rgb * 0.18 + texture2D(tB3, uv).rgb * 0.12;',
    '  vec3 col = base + bl * bloom;',
    '  col *= exposure;',
    /* vignettage */
    '  col *= 1.0 - vignette * smoothstep(0.10, 0.78, r2);',
    /* grain */
    '  float g = rand(uv * (1.0 + fract(time))) - 0.5;',
    '  col += g * grain;',
    '  gl_FragColor = vec4(lin2srgb(col), 1.0);',
    '}'
  ].join('\n');

  function PostFX(renderer, width, height) {
    this.renderer = renderer;
    this.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    const rtOpt = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, format: THREE.RGBAFormat
    };
    this.rtScene = new THREE.WebGLRenderTarget(width, height, rtOpt);
    this.rtScene.depthBuffer = true;
    this.rtScene.stencilBuffer = false;

    this.levels = [];
    for (let i = 0; i < 4; i++) {
      const w = Math.max(2, width >> (i + 1)), h = Math.max(2, height >> (i + 1));
      this.levels.push({
        a: new THREE.WebGLRenderTarget(w, h, rtOpt),
        b: new THREE.WebGLRenderTarget(w, h, rtOpt),
        w: w, h: h
      });
    }

    this.matBright = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.82 }, softness: { value: 0.45 } },
      vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false
    });
    this.matBlur = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false
    });
    this.matComp = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tB0: { value: null }, tB1: { value: null },
        tB2: { value: null }, tB3: { value: null },
        bloom: { value: 0.55 }, vignette: { value: 0.30 }, chroma: { value: 0.0016 },
        grain: { value: 0.022 }, speedBlur: { value: 0.0 }, time: { value: 0 },
        exposure: { value: 1.0 }
      },
      vertexShader: QUAD_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false
    });
  }

  PostFX.prototype.setSize = function (w, h) {
    this.rtScene.setSize(w, h);
    for (let i = 0; i < 4; i++) {
      const lw = Math.max(2, w >> (i + 1)), lh = Math.max(2, h >> (i + 1));
      this.levels[i].a.setSize(lw, lh);
      this.levels[i].b.setSize(lw, lh);
      this.levels[i].w = lw; this.levels[i].h = lh;
    }
  };

  PostFX.prototype._pass = function (mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target || null);
    this.renderer.render(this.scene, this.camera);
  };

  PostFX.prototype.render = function (scene, camera, params) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(scene, camera);

    /* extraction des hautes lumières dans le niveau 0 */
    this.matBright.uniforms.tDiffuse.value = this.rtScene.texture;
    this._pass(this.matBright, this.levels[0].a);

    /* pyramide : flou horizontal puis vertical, réinjecté au niveau suivant */
    for (let i = 0; i < this.levels.length; i++) {
      const L = this.levels[i];
      if (i > 0) {
        this.matBright.uniforms.tDiffuse.value = this.levels[i - 1].a.texture;
        this.matBright.uniforms.threshold.value = 0.0;
        this._pass(this.matBright, L.a);
        this.matBright.uniforms.threshold.value = params.threshold !== undefined ? params.threshold : 0.82;
      }
      this.matBlur.uniforms.tDiffuse.value = L.a.texture;
      this.matBlur.uniforms.dir.value.set(1 / L.w, 0);
      this._pass(this.matBlur, L.b);
      this.matBlur.uniforms.tDiffuse.value = L.b.texture;
      this.matBlur.uniforms.dir.value.set(0, 1 / L.h);
      this._pass(this.matBlur, L.a);
    }

    const u = this.matComp.uniforms;
    u.tDiffuse.value = this.rtScene.texture;
    u.tB0.value = this.levels[0].a.texture;
    u.tB1.value = this.levels[1].a.texture;
    u.tB2.value = this.levels[2].a.texture;
    u.tB3.value = this.levels[3].a.texture;
    if (params) {
      if (params.bloom !== undefined) u.bloom.value = params.bloom;
      if (params.speedBlur !== undefined) u.speedBlur.value = params.speedBlur;
      if (params.time !== undefined) u.time.value = params.time;
      if (params.exposure !== undefined) u.exposure.value = params.exposure;
      if (params.grain !== undefined) u.grain.value = params.grain;
    }
    this._pass(this.matComp, null);
  };

  global.PostFX = PostFX;
})(window);
