/* OS3G — WebGL2 renderer for OS3D poses: smooth lit mannequin, soft contact shadows, muscle glow on the skin.
   Same pose data and mount() API as OS3D; falls back to OS3D when WebGL2 is not available. */
const OS3G = (function () {
  'use strict';
  const D2R = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lin = c => c.map(v => Math.pow(v / 255, 2.2));
  // muscle profile per limb: [mid radius as a share of the top radius, position of the bulge along the bone]
  const PROF = { th: [1.04, 0.22], sh: [1.04, 0.3], ua: [0.98, 0.42], fa: [1.06, 0.22], hand: [0.96, 0.45], foot: [1.04, 0.35], neck: [0.98, 0.5] };
  // muscle relief on limbs: [centre along the bone 0..1, spread, angle around the bone in degrees (0 front, 90 outer side, 180 back, -90 inner side), height as a share of the radius, narrowness]
  const BUMPS = {
    ua: [[0.16, 0.10, 90, 0.30, 1.3], [0.13, 0.09, 25, 0.18, 2.2], [0.13, 0.09, 155, 0.16, 2.2], [0.57, 0.14, 0, 0.28, 2.8], [0.40, 0.16, 180, 0.22, 1.8], [0.32, 0.10, 125, 0.12, 3.0], [0.31, 0.05, 45, -0.10, 3.0]],
    fa: [[0.20, 0.12, 70, 0.22, 2.4], [0.28, 0.15, -50, 0.14, 2.0], [0.30, 0.17, 150, 0.10, 2.0]],
    th: [[0.45, 0.20, 5, 0.12, 1.6], [0.50, 0.19, 75, 0.14, 2.0], [0.84, 0.065, -45, 0.24, 3.0], [0.22, 0.15, -100, 0.10, 2.0], [0.47, 0.20, 180, 0.10, 1.6], [0.55, 0.25, 110, -0.07, 6.0], [0.78, 0.05, -15, -0.06, 4.0]],
    sh: [[0.27, 0.12, -150, 0.30, 3.0], [0.22, 0.11, 150, 0.22, 3.0], [0.50, 0.15, 180, 0.10, 1.5], [0.30, 0.16, 45, 0.08, 3.0], [0.45, 0.30, -25, -0.07, 4.0], [0.30, 0.18, 95, -0.05, 6.0]]
  };
  const BUMP_F = { ua: 0.55, fa: 0.6, th: 0.7, sh: 0.75 };
  // anatomy mode: share of the limb at the start and at the end that is tendon rather than muscle
  // anatomy mode: closer to the real outline of each muscle — [length, width] multipliers of the highlight
  const MSHAPE = { abs: [2.1, 0.85], chest: [1.15, 1.5], lats: [1.5, 1.1], erectors: [2.2, 0.8], traps: [1.2, 1.5], obliques: [1.4, 1], quads: [1.35, 1.05], hams: [1.35, 1], glutes: [1.05, 1.15], calves: [1.15, 1], serratus: [1.2, 1], rhomboids: [1, 1.3] };
  const TEN = { ua: [0, 0], fa: [0, 0.26], th: [0, 0.07], sh: [0, 0.22], neck: [0, 0] };
  const bumpCache = {};
  function bumpsFor(id, f) {
    const key = id + f;
    if (bumpCache[key]) return bumpCache[key];
    const list = BUMPS[id].slice(0, 8), k = f ? BUMP_F[id] : 1, A = new Float32Array(32), K = new Float32Array(8);
    list.forEach((b, i) => { A.set([b[0], b[1], b[2] * Math.PI / 180, b[3] * k], i * 4); K[i] = b[4]; });
    return (bumpCache[key] = { A, K, n: list.length });
  }

  let SUP = null;
  function supported() {
    if (SUP !== null) return SUP;
    try { const c = document.createElement('canvas'); SUP = !!(c.getContext('webgl2')); } catch (e) { SUP = false; }
    return SUP;
  }

  /* ---------- shaders ---------- */
  const HEAD_VARY = `out vec3 vW; out vec3 vN; out float vT; out vec3 vU; out float vC; out float vR; out vec2 vQ; out vec4 vCl; out vec4 vLm; out vec2 vUV;`;
  const NO_SKIN = `vCl = vec4(0.0); vLm = vec4(0.0, -1.0, 0.0, 0.0);`;
  // capsule with a muscle profile: radius goes ra -> rm (at tm) -> rb along the bone, hemispherical ends
  const VS_CAP = `#version 300 es
precision highp float;
in vec2 aP;
uniform mat4 uVP; uniform vec3 uA; uniform vec3 uB; uniform float uRa; uniform float uRb; uniform float uRm; uniform float uTm;
uniform vec3 uFr; uniform vec3 uLt; uniform int uNB; uniform vec4 uBA[8]; uniform float uBK[8];
${HEAD_VARY}
const float PI = 3.14159265;
float ss(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float dss(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return 6.0 * t * (1.0 - t) / (e1 - e0); }
void main() {
  vec3 ax = uB - uA; float L = length(ax);
  vec3 z = L > 1e-3 ? ax / L : vec3(0.0, 1.0, 0.0);
  vec3 up = abs(z.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 x = normalize(cross(up, z)); vec3 y = cross(z, x);
  if (uNB > 0) {
    // front and outer side of the limb, so muscles sit where they belong
    vec3 f = uFr - z * dot(uFr, z);
    if (length(f) > 1e-3) { x = normalize(f); vec3 l = uLt - z * dot(uLt, z) - x * dot(uLt, x); y = length(l) > 1e-3 ? normalize(l) : cross(z, x); }
  }
  float th = aP.x * 6.2831853;
  vec3 rad = cos(th) * x + sin(th) * y;
  vec3 tng = -sin(th) * x + cos(th) * y;
  float s = aP.y; vec3 n; vec3 p; float tt; float rel = 0.0;
  if (s <= 0.16) { float la = mix(-PI * 0.5, 0.0, s / 0.16); n = cos(la) * rad + sin(la) * z; p = uA + uRa * n; tt = 0.0; }
  else if (s < 0.84) {
    float t = (s - 0.16) / 0.68; tt = t;
    float r, dr;
    if (t < uTm) { r = mix(uRa, uRm, ss(0.0, uTm, t)); dr = (uRm - uRa) * dss(0.0, uTm, t); }
    else { r = mix(uRm, uRb, ss(uTm, 1.0, t)); dr = (uRb - uRm) * dss(uTm, 1.0, t); }
    float S = 0.0, St = 0.0, Sp = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uNB) break;
      vec4 b = uBA[i];
      float d = (t - b.x) / b.y; float g = exp(-0.5 * d * d); float gt = -d / b.y * g;
      float dp = th - b.z; float h = exp(uBK[i] * (cos(dp) - 1.0)); float hp = -uBK[i] * sin(dp) * h;
      S += b.w * g * h; St += b.w * gt * h; Sp += b.w * g * hp;
    }
    float e1 = ss(0.0, 0.08, t), e2 = 1.0 - ss(0.92, 1.0, t);
    float e = e1 * e2, et = dss(0.0, 0.08, t) * e2 - e1 * dss(0.92, 1.0, t);
    float R = r * (1.0 + e * S);
    float Rt = dr * (1.0 + e * S) + r * (et * S + e * St);
    float Rp = r * e * Sp;
    p = uA + z * (t * L) + rad * R;
    n = L > 1e-3 ? normalize(rad - z * (Rt / L) - tng * (Rp / max(R, 1e-3))) : rad;
    rel = clamp(e * S / 0.25, -1.0, 1.0);
  }
  else { float la = mix(0.0, PI * 0.5, (s - 0.84) / 0.16); n = cos(la) * rad + sin(la) * z; p = uB + uRb * n; tt = 1.0; }
  vW = p; vN = n; vT = L > 1e-3 ? dot(p - uA, z) / L : 0.5; vU = vec3(0.0); vC = 1.0; vR = rel; vQ = vec2(th, tt); ${NO_SKIN}
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const VS_ELL = `#version 300 es
precision highp float;
in vec3 aPos;
uniform mat4 uVP; uniform vec3 uC; uniform mat3 uR; uniform vec3 uS;
${HEAD_VARY}
void main() {
  vec3 p = uC + uR * (aPos * uS);
  vW = p; vN = normalize(uR * (aPos / uS)); vU = aPos; vT = 0.0; vC = 1.0; vR = 0.0; vQ = vec2(0.0, -1.0); ${NO_SKIN}
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const VS_MESH = `#version 300 es
precision highp float;
in vec3 aPos; in vec3 aNor; in float aCol; in float aRel;
uniform mat4 uVP; uniform mat4 uM; uniform mat3 uNM;
${HEAD_VARY}
void main() {
  vec4 w = uM * vec4(aPos, 1.0);
  vW = w.xyz; vN = normalize(uNM * aNor); vC = aCol; vT = 0.0; vU = aPos; vR = aRel; vQ = vec2(0.0, -1.0); ${NO_SKIN}
  gl_Position = uVP * w;
}`;
  const VS_SKIN = `#version 300 es
precision highp float;
in vec3 aPos; in vec3 aNor; in vec4 aBI; in vec4 aBW; in vec4 aCl; in vec4 aLm; in float aRel; in vec2 aUV;
uniform mat4 uVP; uniform vec4 uDQ[34]; uniform float uMir; uniform float uRefY; uniform float uInfl;
${HEAD_VARY}
vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main() {
  ivec4 bi = ivec4(aBI + 0.5);
  vec4 r0 = uDQ[bi.x * 2];
  vec4 r = r0 * aBW.x, d = uDQ[bi.x * 2 + 1] * aBW.x;
  vec4 ri = uDQ[bi.y * 2]; float sg = dot(r0, ri) < 0.0 ? -1.0 : 1.0; r += ri * (aBW.y * sg); d += uDQ[bi.y * 2 + 1] * (aBW.y * sg);
  ri = uDQ[bi.z * 2]; sg = dot(r0, ri) < 0.0 ? -1.0 : 1.0; r += ri * (aBW.z * sg); d += uDQ[bi.z * 2 + 1] * (aBW.z * sg);
  ri = uDQ[bi.w * 2]; sg = dot(r0, ri) < 0.0 ? -1.0 : 1.0; r += ri * (aBW.w * sg); d += uDQ[bi.w * 2 + 1] * (aBW.w * sg);
  float ln = length(r); r /= ln; d /= ln;
  vec3 p = qrot(r, aPos) + 2.0 * (r.w * d.xyz - d.w * r.xyz + cross(r.xyz, d.xyz));
  vec3 n = qrot(r, aNor);
  p.x *= uMir; n.x *= uMir;
  p += normalize(n) * uInfl;
  if (uRefY < 0.0) { p.y = -0.5 - p.y; n.y = -n.y; }
  vW = p; vN = n; vT = 0.0; vU = aPos; vC = 1.0; vR = aRel; vQ = vec2(0.0, -1.0); vCl = aCl; vLm = aLm; vUV = aUV;
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS_BODY = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in float vT; in vec3 vU; in float vC; in float vR; in vec2 vQ; in vec4 vCl; in vec4 vLm; in vec2 vUV;
uniform sampler2D uTex; uniform int uTexOn;
uniform vec3 uSkin; uniform vec3 uHair;
uniform int uAnat; uniform float uFib; uniform vec2 uTen; uniform vec3 uTend; uniform vec3 uHot; uniform vec4 uMusX[12];
uniform vec3 uCol; uniform vec3 uCol2; uniform float uSplit; uniform int uMode;
uniform vec3 uEye; uniform vec3 uL1; uniform vec3 uL2; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uGlow;
uniform float uAlpha; uniform float uShine; uniform float uWrap; uniform float uGlowAmt;
uniform vec4 uMus[12]; uniform vec4 uMusD[12]; uniform int uNM2;
uniform int uLook; uniform vec3 uRim; uniform float uDarkBg; uniform int uRefl;
uniform vec4 uCapA[18]; uniform vec4 uCapB[18]; uniform int uNCap;
out vec4 frag;
// soft shadow from nearby body parts (each part is a capsule): armpits, the gap between the thighs, a knee folded to the chest
float bodyAO(vec3 P, vec3 N) {
  float o = 0.0;
  for (int i = 0; i < 18; i++) {
    if (i >= uNCap) break;
    vec3 a = uCapA[i].xyz, ab = uCapB[i].xyz - a;
    float t = clamp(dot(P - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float r = mix(uCapA[i].w, uCapB[i].w, t);
    vec3 d = a + ab * t - P; float l = length(d);
    if (l < r * 1.05) continue;
    o += clamp(dot(N, d / l), 0.0, 1.0) * (r * r) / (l * l);
  }
  return clamp(1.0 - o * 1.7, 0.3, 1.0);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 base = uCol;
  float skinW = 0.0, clothB = 0.0;
  // skin colour: the painted MakeHuman skin when it is loaded, else the flat palette colour
  vec3 skinC = uSkin;
  if (uTexOn == 1 && uMode == 4) skinC = pow(texture(uTex, vUV).rgb, vec3(2.2)) * 0.92;
  if (uMode == 1) base = vT < uSplit ? uCol2 : uCol;
  else if (uMode == 2) { float hl = mix(0.24, -0.56, smoothstep(0.2, -0.5, vU.z)); hl -= 0.12 * smoothstep(0.5, 0.9, abs(vU.x)) * step(0.0, vU.z); if (vU.y < hl) discard; }
  else if (uMode == 3) base = vC > 0.5 ? uCol : uCol2;
  if (uMode == 5) {
    vec4 t = texture(uTex, vUV);
    if (t.a < 0.42) discard;
    base = pow(t.rgb, vec3(2.2)) * uCol;
  }
  vec2 fq = vQ; vec2 ften = uTen; float fon = uFib;
  if (uMode == 4) {
    // one-piece body: top above the waist, shorts on the pelvis and upper thighs, skin elsewhere
    bool top = vCl.x > 0.0 && vCl.y > 0.0;
    bool bot = !top && vCl.z > 0.0 && vCl.y <= 0.0;
    if (uAnat == 1) base = vLm.y < -1.5 ? uSkin : uCol;
    else {
      // soft clothing edges: blend across the seam instead of a stepped cut along the triangles
      vec2 w = max(fwidth(vCl.xy), vec2(0.02)) * 1.5;
      float wTop = smoothstep(-w.x, w.x, vCl.x) * smoothstep(-w.y, w.y, vCl.y);
      float wBot = (1.0 - wTop) * smoothstep(-w.x, w.x, vCl.z) * (1.0 - smoothstep(-w.y, w.y, vCl.y));
      base = mix(mix(skinC, uCol2, wBot), uCol, wTop);
      skinW = (1.0 - wTop) * (1.0 - wBot); clothB = wBot;
    }
    if (vCl.w != 0.0) { if (vCl.w < 0.0) discard; base = uHair; }
    fq = vLm.xy; ften = vLm.zw; fon = uAnat == 1 ? 1.0 : 0.0;
  }
  // anatomy: muscle fibres along the bone, pale tendons at the ends
  float tend = 0.0;
  if (fon > 0.5 && fq.y >= 0.0) {
    // the tendon at the start (below the kneecap) shows only on the front
    if (ften.x > 0.0) tend = max(tend, (1.0 - smoothstep(ften.x * 0.5, ften.x, fq.y)) * smoothstep(0.25, 0.75, cos(fq.x)));
    if (ften.y > 0.0) tend = max(tend, smoothstep(1.0 - ften.y, 1.0 - ften.y * 0.45, fq.y));
    float fib = 0.5 + 0.5 * sin(fq.x * 44.0 + sin(fq.y * 7.0 + fq.x * 3.0) * 1.2);
    base *= mix(1.0, 0.955 + 0.075 * fib, 1.0 - tend);
    base = mix(base, uTend, tend * 0.75);
  }
  vec3 N = normalize(vN); vec3 V = normalize(uEye - vW);
  // glow shell around the hologram: only its far side shows, as a halo just outside the outline
  if (uRefl == 2) {
    float nv = dot(N, V);
    if (nv > 0.0) discard;
    float h = pow(clamp(-nv, 0.0, 1.0), 1.4) * 0.5 * uAlpha;
    frag = vec4(vec3(0.16, 0.42, 1.0) * h, h * 0.8);
    return;
  }
  if (uMode == 5 && dot(N, V) < 0.0) N = -N;
  float d1 = max(0.0, (dot(N, uL1) + uWrap) / (1.0 + uWrap));
  float d2 = max(0.0, dot(N, uL2));
  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 H = normalize(uL1 + V);
  float sp = pow(max(dot(N, H), 0.0), 34.0) * uShine;
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float ao = uNCap > 0 ? bodyAO(vW, N) : 1.0;
  vec3 c = base * (hemi * 0.5 * ao + d1 * mix(0.98, 0.98 * ao, 0.55) + d2 * 0.22 * ao) + sp * ao + fr * 0.16 * uSky * ao;
  if (uLook == 1) {
    // studio: warm key, cool fill, rim light along the outline, light passing through skin at the shadow edge
    float isSkin = skinW;
    float k = max(0.0, dot(N, uL1));
    float kw = max(0.0, (dot(N, uL1) + 0.45) / 1.45);
    vec3 key = vec3(1.0, 0.95, 0.88) * mix(k, kw, isSkin);
    vec3 fill = vec3(0.70, 0.78, 0.90) * max(0.0, dot(N, uL2)) * 0.35;
    vec3 amb = hemi * 0.42;
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6) * max(0.0, dot(N, uRim) + 0.35);
    vec3 sss = vec3(0.85, 0.28, 0.16) * isSkin * (kw - k) * 0.55;
    float spec = pow(max(dot(N, H), 0.0), mix(18.0, 46.0, isSkin)) * mix(0.05, 0.16, isSkin);
    c = base * (amb * ao + key * 1.05 * mix(1.0, ao, 0.55) + fill * ao + sss) + spec * ao + ao * rim * mix(vec3(0.95, 0.97, 1.0), uSky, 0.4) * mix(0.30, 0.55, uDarkBg);
    c *= 1.0 + 0.12 * vR;
    c *= mix(0.80, 1.0, smoothstep(0.0, 18.0, vW.y));
  } else if (uLook == 2) {
    // clean sculpture: one matte material, soft light, bright outline
    float lum = dot(base, vec3(0.3, 0.55, 0.15));
    vec3 clay = mix(vec3(lum), base, 0.18);
    clay = mix(clay * 0.9, clay * 1.25, skinW * 0.6 + 0.4 * (1.0 - step(0.5, float(uMode == 4))));
    float kw = max(0.0, (dot(N, uL1) + 0.6) / 1.6);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    c = clay * (hemi * 0.55 * ao + kw * 0.85 * mix(1.0, ao, 0.55) + max(0.0, dot(N, uL2)) * 0.18 * ao) + ao * rim * mix(0.22, 0.45, uDarkBg) * vec3(0.92, 0.96, 1.0);
    c *= 1.0 + 0.16 * vR;
    c *= mix(0.78, 1.0, smoothstep(0.0, 18.0, vW.y));
  } else if (uLook == 3) {
    // hologram: dark blue glass lit from above, a bright icy outline, muscle relief; shorts a shade darker
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(1.0 - ndv, 4.0);
    float k = pow(max(0.0, (dot(N, uL1) + 0.15) / 1.15), 2.0);
    float upw = clamp(N.y, 0.0, 1.0);
    float sp3 = pow(max(dot(N, H), 0.0), 54.0);
    // a cool back light draws a bright line along the far edge of each muscle
    float back = pow(1.0 - ndv, 2.0) * max(0.0, dot(N, uRim));
    float det = (uTexOn == 1 && uMode == 4) ? clamp(dot(skinC, vec3(0.3, 0.55, 0.15)) * 2.4, 0.0, 1.0) : 0.8;
    vec3 deep = vec3(0.001, 0.006, 0.045), blue = vec3(0.01, 0.12, 1.0), ice = vec3(0.4, 0.72, 1.0);
    c = deep + blue * (0.03 + 0.58 * k * mix(1.0, ao, 0.8) + 0.1 * upw * ao) * mix(0.8, 1.15, det);
    c += ice * (rim * 1.3 * mix(0.45, 1.0, ao) + sp3 * 0.75 * ao + back * 0.45 * ao);
    c *= 1.0 + 0.9 * vR;
    c = mix(c, c * vec3(0.45, 0.6, 0.95), clothB * 0.7);
  }
  c *= mix(0.74, 1.0, smoothstep(0.0, 14.0, vW.y));
  // muscle tops a little lighter, grooves between muscles a little darker
  c *= 1.0 + (uAnat == 1 ? 0.2 : 0.11) * vR;
  float g = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i >= uNM2) break;
    // each working muscle is an ellipsoid stretched along its fibres
    vec3 d = vW - uMus[i].xyz; vec3 ax = uMusX[i].xyz;
    float da = dot(d, ax); vec3 dp = d - ax * da;
    float sc = uAnat == 1 ? 1.3 : 1.0;
    float la = uMusX[i].w * sc, wa = uMus[i].w * sc;
    float f = exp(-(da * da / (la * la) + dot(dp, dp) / (wa * wa)) * 1.7) * smoothstep(-0.3, 0.5, dot(N, uMusD[i].xyz));
    g += f * uMusD[i].w;
  }
  if (uAnat == 1) {
    // the whole working muscle is filled, with a soft edge
    g = smoothstep(0.1, 0.5, g * uGlowAmt) * (1.0 - tend * 0.8);
    c = mix(c, uHot * (0.55 + 0.45 * d1) + sp * 0.6, g * 0.9) + uHot * g * 0.12;
  } else if (uLook == 3) {
    // hologram: working muscles shine brighter instead of changing colour
    g = clamp(g * uGlowAmt, 0.0, 0.85);
    c += uGlow * g * (0.16 + 0.22 * d1);
  } else {
    g = clamp(g * uGlowAmt, 0.0, 0.85);
    c = mix(c, uGlow * (0.72 + 0.28 * d1), g * 0.72) + uGlow * g * 0.1;
  }
  if (uLook > 0) c = aces(c * 1.15);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  float al = uAlpha;
  // reflection in the glossy floor fades with depth
  if (uRefl == 1) { al *= exp(min(vW.y + 0.25, 0.0) / 16.0) * 0.38; c *= vec3(0.55, 0.75, 1.0); }
  frag = vec4(c * al, al);
}`;
  const VS_FLOOR = `#version 300 es
precision highp float;
in vec2 aP;
uniform mat4 uVP; uniform vec3 uCtr; uniform float uR;
out vec3 vW;
void main() { vec3 p = vec3(uCtr.x + aP.x * uR, -0.25, uCtr.z + aP.y * uR); vW = p; gl_Position = uVP * vec4(p, 1.0); }`;
  const FS_FLOOR = `#version 300 es
precision highp float;
in vec3 vW;
uniform vec3 uCtr; uniform float uR; uniform vec3 uFloor; uniform vec3 uMatCol; uniform vec4 uMat; uniform int uHasMat;
uniform vec4 uCA[30]; uniform vec4 uCB[30]; uniform int uNC; uniform vec3 uLs; uniform float uDark; uniform int uHolo;
out vec4 frag;
float seg2(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0); return length(pa - ba * h); }
void main() {
  vec2 q = vW.xz - uCtr.xz; float rr = length(q) / uR;
  float a = (1.0 - smoothstep(0.3, 1.0, rr)) * 0.85;
  vec3 col = uFloor;
  float matIn = 0.0, matLine = 0.0;
  if (uHasMat == 1) {
    vec2 c = vec2(0.5 * (uMat.x + uMat.y), 0.5 * (uMat.z + uMat.w));
    vec2 h = vec2(0.5 * (uMat.y - uMat.x), 0.5 * (uMat.w - uMat.z));
    vec2 d = abs(vW.xz - c) - h + 4.0;
    float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 4.0;
    float inside = 1.0 - smoothstep(-0.6, 0.6, sd);
    float edge = smoothstep(-3.0, 0.0, sd) * inside;
    col = mix(col, uMatCol * (1.0 - 0.18 * edge), inside);
    a = max(a, inside * 0.97);
    matIn = inside; matLine = smoothstep(-1.4, 0.0, sd) * (1.0 - smoothstep(0.0, 1.4, sd));
  }
  float ao = 0.0, sh = 1.0;
  vec3 p = vec3(vW.x, 0.0, vW.z);
  for (int i = 0; i < 30; i++) {
    if (i >= uNC) break;
    vec3 A = uCA[i].xyz, B = uCB[i].xyz; float r = uCA[i].w;
    vec3 ba = B - A; float hh = clamp(dot(p - A, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    vec3 cp = A + ba * hh; vec3 dv = cp - p; float d = length(dv);
    ao += (r * r) / (d * d + 2.0) * clamp(cp.y / (d + 0.01), 0.0, 1.0);
    vec2 a2 = A.xz - uLs.xz * (A.y / uLs.y), b2 = B.xz - uLs.xz * (B.y / uLs.y);
    float ds = seg2(p.xz, a2, b2);
    float hgt = 0.5 * (A.y + B.y);
    float w = 1.2 + hgt * 0.14;
    float s = smoothstep(r - w, r + w * 1.6, ds);
    sh *= mix(1.0, s, 0.62 * clamp(1.0 - hgt / 220.0, 0.25, 1.0));
  }
  ao = clamp(ao * 0.55, 0.0, 0.8);
  if (uHolo == 1) {
    // near-black glossy floor, a blue pool of light under the figure, the mat as a thin glowing outline
    vec3 hc = vec3(0.003, 0.008, 0.024) + vec3(0.02, 0.09, 0.42) * exp(-rr * rr * 9.0) * 0.55;
    hc += vec3(0.008, 0.03, 0.12) * matIn + vec3(0.1, 0.35, 1.0) * matLine * 0.55;
    hc *= (1.0 - ao * 0.8) * (0.45 + 0.55 * sh);
    float ha = (1.0 - smoothstep(0.25, 1.0, rr)) * 0.96;
    hc = pow(max(hc, 0.0), vec3(1.0 / 2.2));
    frag = vec4(hc * ha, ha);
    return;
  }
  col *= (1.0 - ao) * (0.58 + 0.42 * sh);
  a = max(a, (1.0 - sh) * 0.42 + ao * 0.65);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  frag = vec4(col * a, a);
}`;

  function compile(gl, vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aP'); gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aCol'); gl.bindAttribLocation(p, 3, 'aRel'); gl.bindAttribLocation(p, 4, 'aBI'); gl.bindAttribLocation(p, 5, 'aBW'); gl.bindAttribLocation(p, 6, 'aCl'); gl.bindAttribLocation(p, 7, 'aLm'); gl.bindAttribLocation(p, 8, 'aUV');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u: new Proxy(u, { get: (t, k) => (k in t ? t[k] : null) }) };
  }

  /* ---------- static meshes ---------- */
  function capMesh(gl) {
    const NT = 40, NS = 52, v = [], idx = [];
    for (let j = 0; j <= NS; j++) for (let i = 0; i <= NT; i++) v.push(i / NT, j / NS);
    for (let j = 0; j < NS; j++) for (let i = 0; i < NT; i++) { const a = j * (NT + 1) + i, b = a + NT + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    return vao(gl, [[0, 2, new Float32Array(v)]], new Uint16Array(idx));
  }
  function sphMesh(gl) {
    const NA = 36, NB = 24, v = [], idx = [];
    for (let j = 0; j <= NB; j++) { const la = -Math.PI / 2 + Math.PI * j / NB; for (let i = 0; i <= NA; i++) { const lo = 2 * Math.PI * i / NA; v.push(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)); } }
    for (let j = 0; j < NB; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    return vao(gl, [[0, 3, new Float32Array(v)]], new Uint16Array(idx));
  }
  function boxMesh(gl) {
    const P = [], N = [], C = [], idx = [];
    const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    faces.forEach(([n, u, w]) => {
      const b = P.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([s, t]) => { P.push(n[0] + u[0] * s + w[0] * t, n[1] + u[1] * s + w[1] * t, n[2] + u[2] * s + w[2] * t); N.push(n[0], n[1], n[2]); C.push(1); });
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return vao(gl, [[0, 3, new Float32Array(P)], [1, 3, new Float32Array(N)], [2, 1, new Float32Array(C)]], new Uint16Array(idx));
  }
  function vao(gl, attrs, idx, dynamic) {
    const o = gl.createVertexArray(); gl.bindVertexArray(o);
    const bufs = attrs.map(([loc, size, data]) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; });
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { o, bufs, n: idx.length };
  }

  /* ---------- torso surface ---------- */
  const NR = 40, NSUB = 6;
  const g1 = (x, s) => Math.exp(-0.5 * (x / s) * (x / s));
  const gu = (u, c, lo, hi) => g1(u - c, u < c ? lo : hi);
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const FRONT = Math.PI / 2, BACK = Math.PI * 1.5;
  // relief of the torso in cm: u = height in levels (0 crotch .. 6 base of the neck), t = angle around (front pi/2, back 3pi/2)
  function torsoRelief(u, t, f) {
    const a = c => wrap(t - c);
    let d = 0;
    const pair = (c, w) => g1(a(c - w[0]), w[1]) + g1(a(c + w[0]), w[1]);
    if (!f) {
      // pectorals: the lower edge rises towards the armpit
      [[FRONT - 0.55, -1], [FRONT + 0.55, 1]].forEach(([c, sg]) => { const v = a(c), vl = v * sg; d += 3.0 * gu(u, 4.45 + 0.55 * Math.max(0, vl), 0.15, 0.55) * g1(v, vl > 0 ? 0.42 : 0.3); });
      d -= 1.0 * g1(u - 4.4, 0.6) * g1(a(FRONT), 0.14);
      d += 1.0 * gu(u, 2.95, 0.45, 0.6) * pair(FRONT, [0.25, 0.15]);
      d -= 0.28 * (g1(u - 2.7, 0.07) + g1(u - 3.2, 0.07)) * pair(FRONT, [0.25, 0.14]);
      d += 2.4 * gu(u, 3.9, 0.55, 0.75) * pair(BACK, [1.05, 0.38]);
      d += 1.4 * g1(u - 4.9, 0.32) * pair(BACK, [0.62, 0.28]);
      d += 1.0 * g1(u - 2.6, 0.7) * pair(BACK, [0.3, 0.15]);
      d -= 1.4 * gu(u, 3.6, 1.4, 1.2) * g1(a(BACK), 0.15);
      d += 3.0 * gu(u, 0.62, 0.22, 0.42) * pair(BACK, [0.55, 0.42]);
    } else {
      d += 3.2 * gu(u, 4.25, 0.26, 0.5) * pair(FRONT, [0.5, 0.42]);
      d += 0.35 * g1(u - 2.9, 0.55) * pair(FRONT, [0.25, 0.16]);
      d += 0.9 * gu(u, 3.9, 0.55, 0.75) * pair(BACK, [1.05, 0.4]);
      d += 0.8 * g1(u - 4.9, 0.32) * pair(BACK, [0.62, 0.28]);
      d += 0.6 * g1(u - 2.6, 0.7) * pair(BACK, [0.3, 0.15]);
      d -= 1.0 * gu(u, 3.6, 1.4, 1.2) * g1(a(BACK), 0.15);
      d += 3.4 * gu(u, 0.58, 0.24, 0.45) * pair(BACK, [0.55, 0.45]);
    }
    d -= 0.8 * g1(u - 0.5, 0.4) * g1(a(BACK), 0.12);
    return d;
  }
  function torsoBuild(lv, mirror, out) {
    const n = lv.length;
    const R = lv.map(L => { const a = []; for (let k = 0; k < NR; k++) { const t = k * 2 * Math.PI / NR; a.push(add(L.c, mv(L.F, [L.a * Math.cos(t), 0, L.b * Math.sin(t)]))); } return a; });
    const rows = [], flags = [], rels = [];
    let dupAt = -1;
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map(i => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)); };
    const fem = OS3D.BODY && OS3D.BODY.sex === 'f';
    for (let i = 0; i < n - 1; i++) {
      for (let s = 0; s < NSUB; s++) {
        const t = s / NSUB, row = [];
        for (let k = 0; k < NR; k++) row.push(cr(R[Math.max(0, i - 1)][k], R[i][k], R[i + 1][k], R[Math.min(n - 1, i + 2)][k], t));
        // push the surface out or in along the radius of the ring
        const u = i + t;
        let cx = 0, cy = 0, cz = 0; row.forEach(q => { cx += q[0]; cy += q[1]; cz += q[2]; }); cx /= NR; cy /= NR; cz /= NR;
        const rel = new Float32Array(NR);
        for (let k = 0; k < NR; k++) {
          const dd = torsoRelief(u, k * 2 * Math.PI / NR, fem);
          rel[k] = clamp(dd / 2.6, -1, 1);
          if (Math.abs(dd) < 0.01) continue;
          const q = row[k], dv = norm([q[0] - cx, q[1] - cy, q[2] - cz]);
          q[0] += dv[0] * dd; q[1] += dv[1] * dd; q[2] += dv[2] * dd;
        }
        if (i === 1 && s === 0) { rows.push(row.map(q => q.slice())); flags.push(0); rels.push(rel); dupAt = rows.length - 1; }
        rows.push(row); flags.push(i === 0 ? 0 : 1); rels.push(rel);
      }
    }
    rows.push(R[n - 1]); flags.push(1); rels.push(new Float32Array(NR));
    if (mirror) rows.forEach(r => r.forEach(q => { q[0] = -q[0]; }));
    const NRW = rows.length;
    const P = out.P, Nn = out.N, C = out.C, RL = out.R;
    let o = 0;
    for (let r = 0; r < NRW; r++) {
      const row = rows[r];
      let cx = 0, cy = 0, cz = 0; row.forEach(q => { cx += q[0]; cy += q[1]; cz += q[2]; }); cx /= NR; cy /= NR; cz /= NR;
      const up = rows[Math.min(NRW - 1, r + (r === dupAt ? 2 : 1))], dn = rows[Math.max(0, r - (r === dupAt + 1 ? 2 : 1))];
      for (let k = 0; k < NR; k++) {
        const q = row[k];
        const u = sub(row[(k + 1) % NR], row[(k - 1 + NR) % NR]);
        const v = sub(up[k], dn[k]);
        let nn = norm(cross(u, v));
        if (dot(nn, [q[0] - cx, q[1] - cy, q[2] - cz]) < 0) nn = mul(nn, -1);
        P[o * 3] = q[0]; P[o * 3 + 1] = q[1]; P[o * 3 + 2] = q[2];
        Nn[o * 3] = nn[0]; Nn[o * 3 + 1] = nn[1]; Nn[o * 3 + 2] = nn[2];
        C[o] = flags[r]; RL[o] = rels[r][k]; o++;
      }
    }
    // caps
    [[0, -2.2, 0], [NRW - 1, 2.6, 1]].forEach(([r, off, fl]) => {
      const L = r === 0 ? lv[0] : lv[n - 1];
      let c = add(L.c, mv(L.F, [0, off, 0]));
      let ny = norm(mv(L.F, [0, off > 0 ? 1 : -1, 0]));
      if (mirror) { c = [-c[0], c[1], c[2]]; ny = [-ny[0], ny[1], ny[2]]; }
      P[o * 3] = c[0]; P[o * 3 + 1] = c[1]; P[o * 3 + 2] = c[2]; Nn[o * 3] = ny[0]; Nn[o * 3 + 1] = ny[1]; Nn[o * 3 + 2] = ny[2]; C[o] = fl; RL[o] = 0; o++;
      for (let k = 0; k < NR; k++) { const q = rows[r][k]; P[o * 3] = q[0]; P[o * 3 + 1] = q[1]; P[o * 3 + 2] = q[2]; const m = norm(add(mul(ny, 0.75), mul(norm(sub(q, c)), 0.25))); Nn[o * 3] = m[0]; Nn[o * 3 + 1] = m[1]; Nn[o * 3 + 2] = m[2]; C[o] = fl; RL[o] = 0; o++; }
    });
    return NRW;
  }
  function torsoIndex(NRW) {
    const idx = [];
    for (let r = 0; r < NRW - 1; r++) for (let k = 0; k < NR; k++) { const a = r * NR + k, b = r * NR + (k + 1) % NR, c = a + NR, d = b + NR; idx.push(a, b, c, b, d, c); }
    const base = NRW * NR;
    [0, 1].forEach(ci => { const c0 = base + ci * (NR + 1); for (let k = 0; k < NR; k++) idx.push(c0, c0 + 1 + k, c0 + 1 + (k + 1) % NR); });
    return new Uint16Array(idx);
  }

  /* ---------- matrices ---------- */
  function persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
  function lookAt(e, c, up) {
    const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function mmul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  const colMajor3 = F => [F[0], F[3], F[6], F[1], F[4], F[7], F[2], F[5], F[8]];

  // figure look: 1 studio (default), 0 classic, 2 clean sculpture, 3 hologram; window.OS3_LOOK switches it
  const LOOK = () => { const v = typeof window !== 'undefined' ? window.OS3_LOOK : undefined; return v === undefined ? 1 : v | 0; };
  const HAIR_TINT = [1, 1, 1];
  // working muscles in the hologram light up icy white-blue
  const HOLO_GLOW = [0.55, 0.85, 1.0];
  const AO_ON = () => !(typeof window !== 'undefined' && window.OS3_AO === 0);

  /* ---------- motion: follow-through and breathing ---------- */
  const LAG = ['hd', 'nk', 'eL', 'eR', 'wL', 'wR'];
  function softMod(pr) {
    return (s, ms) => {
      const lag = OS3D.sample(pr, ms - 70);
      LAG.forEach(k => { const a = s.p[k], b = lag.p[k]; if (Array.isArray(a)) s.p[k] = a.map((v, i) => v * 0.45 + b[i] * 0.55); else if (typeof a === 'number') s.p[k] = a * 0.45 + b * 0.55; });
      const br = Math.sin(ms / 1000 * 2 * Math.PI / 4.2);
      if (s.p.ch) s.p.ch = [s.p.ch[0] - br * 0.7, s.p.ch[1], s.p.ch[2]];
    };
  }

  /* ---------- one-piece skinned body: built once per sex in a background worker ---------- */
  const MESH = {};
  /* The finished body is kept in the browser (IndexedDB), one record per sex. The record carries a fingerprint of the
     builder code and its input, so any change to the body shape makes the old record stale and the body is rebuilt. */
  const MCACHE = (function () {
    const DBN = 'os3-body', ST = 'mesh', KEEP = ['P', 'N', 'BI', 'BW', 'CL', 'LM', 'RL', 'IDX', 'nv', 'nt', 'grid'];
    let dbp = null;
    function fp(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + str.length.toString(36); }
    function version(inp) { try { return fp(OS3B.toString() + '|' + JSON.stringify(inp)); } catch (e) { return null; } }
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(res => {
        try {
          if (!window.indexedDB) { res(null); return; }
          const rq = indexedDB.open(DBN, 1);
          rq.onupgradeneeded = () => { try { rq.result.createObjectStore(ST); } catch (e) { } };
          rq.onsuccess = () => res(rq.result);
          rq.onerror = () => res(null);
          rq.onblocked = () => res(null);
        } catch (e) { res(null); }
      });
      return dbp;
    }
    function get(key, ver) {
      const read = open().then(db => new Promise(res => {
        if (!db) { res(null); return; }
        try {
          const rq = db.transaction(ST, 'readonly').objectStore(ST).get(key);
          rq.onsuccess = () => { const r = rq.result; res(r && r.v === ver && r.d && r.d.P && r.d.IDX ? r.d : null); };
          rq.onerror = () => res(null);
        } catch (e) { res(null); }
      }));
      // a stuck database must never hold the body back: after 1.5 s build it as usual
      return Promise.race([read, new Promise(res => setTimeout(() => res(null), 1500))]);
    }
    function put(key, ver, d) {
      open().then(db => {
        if (!db) return;
        try { const o = {}; KEEP.forEach(k => { o[k] = d[k]; }); db.transaction(ST, 'readwrite').objectStore(ST).put({ v: ver, d: o, at: Date.now() }, key); } catch (e) { }
      });
    }
    return { version, get, put };
  })();
  /* realistic body (MakeHuman, CC0) baked onto the engine skeleton: same attributes as the built body */
  function glbData(sex) {
    const src = sex === 'm' && typeof window !== 'undefined' && window.OS3H_M;
    // the body comes in four files; without any of the first two the drawn figure stands in
    if (!src || !src.P || !src.IDX || !src.CL || !src.LM) return null;
    const dec = (b, Tp) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Tp(u.buffer); };
    const nv = src.nv, f32 = n => new Float32Array(n);
    const P16 = dec(src.P, Int16Array), N8 = dec(src.N, Int8Array), BI8 = dec(src.BI, Uint8Array), BW8 = dec(src.BW, Uint8Array), CL16 = dec(src.CL, Int16Array), LM16 = dec(src.LM, Int16Array), RL8 = dec(src.RL, Int8Array);
    const P = f32(nv * 3), N = f32(nv * 3), BI = f32(nv * 4), BW = f32(nv * 4), CL = f32(nv * 4), LM = f32(nv * 4), RL = f32(nv);
    for (let i = 0; i < nv * 3; i++) { P[i] = P16[i] / 100; N[i] = N8[i] / 127; }
    for (let i = 0; i < nv * 4; i++) { BI[i] = BI8[i]; BW[i] = BW8[i] / 255; CL[i] = CL16[i] / 100; LM[i] = LM16[i] / 100; }
    for (let i = 0; i < nv; i++) RL[i] = RL8[i] / 127;
    const IDX = dec(src.IDX, Uint16Array);
    tankTop(P, CL, nv);
    smoothRegions(CL, IDX, nv);
    const uv = a => { const q = dec(a, Uint16Array), o = f32(q.length); for (let i = 0; i < q.length; i++) o[i] = q[i] / 65535; return o; };
    const UV = src.UV ? uv(src.UV) : f32(nv * 2);
    // parts drawn with their own texture and skinned to one bone (hair, eyebrows)
    const parts = (src.parts || []).map(q => {
      const n = q.nv, p16 = dec(q.P, Int16Array), n8 = dec(q.N, Int8Array);
      const Pq = f32(n * 3), Nq = f32(n * 3), BIq = f32(n * 4), BWq = f32(n * 4), CLq = f32(n * 4), LMq = f32(n * 4), RLq = f32(n);
      for (let i = 0; i < n * 3; i++) { Pq[i] = p16[i] / 100; Nq[i] = n8[i] / 127; }
      for (let i = 0; i < n; i++) { BIq[i * 4] = q.bone; BWq[i * 4] = 1; LMq[i * 4 + 1] = -2; }
      return { n: q.n, P: Pq, N: Nq, BI: BIq, BW: BWq, CL: CLq, LM: LMq, RL: RLq, UV: uv(q.UV), IDX: dec(q.IDX, Uint16Array), tex: q.tex };
    });
    return { P, N, BI, BW, CL, LM, RL, IDX, UV, tex: src.tex || null, parts, nv, nt: IDX.length / 3, glb: src.feat };
  }
  // The tank top is cut by clean shapes on the body at rest (male MakeHuman body, centimetres):
  // round armholes from the shoulder to the armpit, a soft scoop at the neck, the hem at the shorts.
  function tankTop(P, CL, nv) {
    const ell = (x, y, z, c, r) => Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]) - 1;
    for (let v = 0; v < nv; v++) {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      const orig = CL[v * 4];
      if (y < 100 || y > 156 || Math.abs(x) > 24) continue;
      const arm = ell(Math.abs(x), y, z, [20.5, 136.5, -0.5], [7.5, 11.5, 11]);
      // the scoop is deep at the front and shallow at the back
      const back = Math.min(1, Math.max(0, (2 - z) / 8));
      const neck = ell(x, y, z, [0, 152.5 + 3 * back, 3.5], [9 + 0.5 * back, 12.5 - 3 * back, 15]);
      const shoulder = 150.5 - 0.22 * Math.max(0, Math.abs(x) - 5);
      const top = Math.min(arm * 6, neck * 6, (shoulder - y) / 4, Math.max(orig, (15.5 - Math.abs(x)) / 4));
      CL[v * 4] = Math.max(-0.5, Math.min(0.5, top));
    }
  }
  // The top, shorts and hair borders are where these per-vertex values cross zero. Raw, they zigzag along the
  // triangles; a few rounds of averaging with the neighbours turn each border into a clean line.
  function smoothRegions(CL, IDX, nv) {
    const nb = Array.from({ length: nv }, () => new Set());
    for (let i = 0; i < IDX.length; i += 3) {
      const a = IDX[i], b = IDX[i + 1], c = IDX[i + 2];
      nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
    }
    const lists = nb.map(s => Array.from(s));
    const tmp = new Float32Array(nv);
    [0, 2].forEach(ch => {
      for (let it = 0; it < 6; it++) {
        for (let v = 0; v < nv; v++) {
          const L = lists[v];
          if (!L.length) { tmp[v] = CL[v * 4 + ch]; continue; }
          let s = 0; for (let k = 0; k < L.length; k++) s += CL[L[k] * 4 + ch];
          tmp[v] = CL[v * 4 + ch] * 0.5 + s / L.length * 0.5;
        }
        for (let v = 0; v < nv; v++) CL[v * 4 + ch] = tmp[v];
      }
    });
  }
  function requestMesh(sex) {
    if (MESH[sex]) return MESH[sex];
    if (typeof OS3B === 'undefined' || typeof OS3R === 'undefined') return null;
    let inp;
    try { inp = OS3R.input(1.2); } catch (e) { return null; }
    const e = MESH[sex] = { ready: false, data: null, rest: OS3R.input.sk, subs: [], from: '' };
    let g = null; try { g = glbData(sex); } catch (er) { g = null; }
    if (g) { e.glb = g.glb; e.data = g; e.ready = true; e.from = 'glb'; return e; }
    const key = 'body-' + sex, ver = MCACHE.version(inp);
    const done = (data, from) => {
      if (e.ready || !data || !data.P) return;
      e.data = data; e.ready = true; e.from = from;
      if (from === 'build' && ver) MCACHE.put(key, ver, data);
      const s = e.subs; e.subs = []; s.forEach(f => { try { f(); } catch (er) { } });
    };
    const local = () => setTimeout(() => { try { done(OS3B(inp), 'build'); } catch (er) { } }, 30);
    const build = () => {
      try {
        const code = 'var OS3B=' + OS3B.toString() + ';onmessage=function(e){var r=OS3B(e.data);postMessage(r,[r.P.buffer,r.N.buffer,r.BI.buffer,r.BW.buffer,r.CL.buffer,r.LM.buffer,r.RL.buffer,r.IDX.buffer]);};';
        const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
        w.onmessage = ev => { w.terminate(); done(ev.data, 'build'); };
        w.onerror = ev => { try { ev.preventDefault(); } catch (er) { } w.terminate(); local(); };
        w.postMessage(inp);
      } catch (er) { local(); }
    };
    if (ver) MCACHE.get(key, ver).then(d => { if (d) done(d, 'cache'); else build(); }, build);
    else build();
    return e;
  }
  // bone motion as dual quaternions: rest frame -> current frame
  function quatOf(R) {
    const tr = R[0] + R[4] + R[8];
    let x, y, z, w, s;
    if (tr > 0) { s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (R[7] - R[5]) / s; y = (R[2] - R[6]) / s; z = (R[3] - R[1]) / s; }
    else if (R[0] > R[4] && R[0] > R[8]) { s = Math.sqrt(1 + R[0] - R[4] - R[8]) * 2; w = (R[7] - R[5]) / s; x = 0.25 * s; y = (R[1] + R[3]) / s; z = (R[2] + R[6]) / s; }
    else if (R[4] > R[8]) { s = Math.sqrt(1 + R[4] - R[0] - R[8]) * 2; w = (R[2] - R[6]) / s; x = (R[1] + R[3]) / s; y = 0.25 * s; z = (R[5] + R[7]) / s; }
    else { s = Math.sqrt(1 + R[8] - R[0] - R[4]) * 2; w = (R[3] - R[1]) / s; x = (R[2] + R[6]) / s; y = (R[5] + R[7]) / s; z = 0.25 * s; }
    return [x, y, z, w];
  }
  function boneDQ(skc, skr, out) {
    OS3R.DEF.forEach((d, i) => {
      const Fc = skc[d[2]], Fr = skr[d[2]], oc = skc[d[1]], orr = skr[d[1]];
      if (!Fc || !Fr || !oc || !orr) { out.set([0, 0, 0, 1, 0, 0, 0, 0], i * 8); return; }
      const R = new Array(9);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) R[a * 3 + b] = Fc[a * 3] * Fr[b * 3] + Fc[a * 3 + 1] * Fr[b * 3 + 1] + Fc[a * 3 + 2] * Fr[b * 3 + 2];
      const q = quatOf(R);
      const t = [oc[0] - (R[0] * orr[0] + R[1] * orr[1] + R[2] * orr[2]), oc[1] - (R[3] * orr[0] + R[4] * orr[1] + R[5] * orr[2]), oc[2] - (R[6] * orr[0] + R[7] * orr[1] + R[8] * orr[2])];
      out.set([q[0], q[1], q[2], q[3],
        0.5 * (q[3] * t[0] + t[1] * q[2] - t[2] * q[1]), 0.5 * (q[3] * t[1] + t[2] * q[0] - t[0] * q[2]), 0.5 * (q[3] * t[2] + t[0] * q[1] - t[1] * q[0]), -0.5 * (t[0] * q[0] + t[1] * q[1] + t[2] * q[2])], i * 8);
    });
  }
  const SKIN_PARTS = /^(neck|delt|ua|fa|hand|th|sh|foot)[LR]?$/;
  const EYE_W = [0.82, 0.8, 0.76], EYE_I = [0.045, 0.028, 0.016];

  /* ---------- mount ---------- */
  const reduceMotion = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  function mount(canvas, def, opts) {
    opts = opts || {};
    if (!supported()) return OS3D.mount(canvas, def, opts);
    let gl;
    try { gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true }); } catch (e) { gl = null; }
    // a canvas that already holds a WebGL context cannot draw 2D, so the fallback gets a fresh copy
    const fallback = () => { const c2 = canvas.cloneNode(false); if (canvas.parentNode) canvas.replaceWith(c2); const m = OS3D.mount(c2, def, opts); m.canvas = c2; return m; };
    if (!gl || gl.isContextLost()) return fallback();
    let pg;
    try { pg = { cap: compile(gl, VS_CAP, FS_BODY), ell: compile(gl, VS_ELL, FS_BODY), mesh: compile(gl, VS_MESH, FS_BODY), floor: compile(gl, VS_FLOOR, FS_FLOOR) }; }
    catch (e) { return fallback(); }
    try { pg.skin = compile(gl, VS_SKIN, FS_BODY); } catch (e) { pg.skin = null; }
    const M = { cap: capMesh(gl), sph: sphMesh(gl), box: boxMesh(gl) };
    // one-piece body for the current sex, uploaded when the worker has built it
    let SK = null;
    const DQ = new Float32Array(34 * 4);
    // a texture from a data URL; the frame is redrawn once it is ready
    function loadTex(url, done) {
      const img = new Image();
      img.onload = () => {
        if (st.dead) return;
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        done(t); kick();
        if (SK && SK.ready && SK.tex && SK.parts.every(q => q.tex) && opts.onReady) opts.onReady();
      };
      img.src = url;
    }
    function ensureSkin() {
      if (opts.noMesh || !pg.skin) return null;
      const sex = OS3D.BODY.sex;
      if (SK && SK.sex === sex) return SK.ready ? SK : null;
      if (SK && SK.vao) { try { gl.deleteVertexArray(SK.vao.o); SK.vao.bufs.forEach(b => gl.deleteBuffer(b)); } catch (e) { } }
      const e = requestMesh(sex);
      if (!e) { SK = { sex, ready: false }; return null; }
      if (!e.ready) { SK = { sex, ready: false }; e.subs.push(() => { if (!st.dead && SK && SK.sex === sex && !SK.ready) { SK = null; kick(); } }); return null; }
      const d = e.data;
      const attrs = q => [[0, 3, q.P], [1, 3, q.N], [4, 4, q.BI], [5, 4, q.BW], [6, 4, q.CL], [7, 4, q.LM], [3, 1, q.RL]].concat(q.UV ? [[8, 2, q.UV]] : []);
      const v = vao(gl, attrs(d), d.IDX);
      SK = { sex, ready: true, vao: v, n: d.IDX.length, type: d.IDX instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, rest: e.rest, glb: e.glb || null, tex: null, parts: [] };
      const sk = SK;
      if (d.tex) loadTex(d.tex, t => { sk.tex = t; });
      (d.parts || []).forEach(q => {
        const part = { n: q.n, vao: vao(gl, attrs(q), q.IDX), cnt: q.IDX.length, tex: null };
        sk.parts.push(part);
        loadTex(q.tex, t => { part.tex = t; });
      });
      return SK;
    }
    const fq = vao(gl, [[0, 2, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1])]], new Uint16Array([0, 1, 2, 0, 2, 3]));
    const NRW = (OS3D.LEVELS.length - 1) * NSUB + 2;
    const NV = NRW * NR + 2 * (NR + 1);
    const TB = { P: new Float32Array(NV * 3), N: new Float32Array(NV * 3), C: new Float32Array(NV), R: new Float32Array(NV) };
    const tv = vao(gl, [[0, 3, TB.P], [1, 3, TB.N], [2, 1, TB.C], [3, 1, TB.R]], torsoIndex(NRW), true);

    if (!def.ease && !opts.raw) { const d2 = Object.assign({}, def, { ease: 'cr' }); delete d2._pr; def = d2; }
    let pr = OS3D.prep(def);
    let mod = opts.raw ? null : softMod(pr);
    const st = { yaw: opts.yaw, pitch: opts.pitch, mirror: !!opts.mirror, speed: opts.speed || 1, playing: !opts.paused && !reduceMotion, t: opts.t0 || 0, last: 0, raf: 0, dead: false, glow: !opts.noMuscles, ghost: !!opts.ghost, anat: !!opts.anatomy };
    let P = null;
    const readP = () => { const raw = opts.palette || OS3D.readPalette(canvas); const o = {}; Object.keys(raw).forEach(k => { o[k] = k === 'dark' ? Number(raw[k]) : lin(OS3D.palRGB({ x: raw[k] }).x); }); P = o; };
    readP();
    // animation bounds for framing
    const bounds = () => {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      const put = q => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], q[i]); mx[i] = Math.max(mx[i], q[i]); } };
      for (let i = 0; i <= 24; i++) {
        const fm = OS3D.frameModel(pr, pr.total * i / 24, def).model, sk = fm.sk;
        const all = ['P0', 'L1', 'C7', 'SL', 'SR', 'EL', 'ER', 'WL', 'WR', 'TL', 'TR', 'KL', 'KR', 'AL', 'AR', 'ToeL', 'ToeR', 'HeelL', 'HeelR', 'HC'];
        const focus = def.focus === 'upper' ? ['HC', 'C7', 'SL', 'SR', 'EL', 'ER', 'L1'] : def.focus === 'head' ? ['HC', 'C7', 'SL', 'SR'] : def.focus === 'legs' ? ['P0', 'KL', 'KR', 'AL', 'AR', 'ToeL', 'ToeR', 'HeelL', 'HeelR'] : Array.isArray(def.focus) ? def.focus : all;
        focus.forEach(k => { if (sk[k]) put(sk[k]); });
        if (focus.includes('HC')) { put(add(sk.HC, [0, 12, 0])); put(add(sk.HC, [0, -11, 0])); put(add(sk.HC, [10, 0, 10])); put(add(sk.HC, [-10, 0, -10])); }
        if (focus === all) { put([sk.P0[0], 0, sk.P0[2]]); }
      }
      const c = mul(add(mn, mx), 0.5);
      return { mn, mx, c };
    };
    let bb = bounds();
    const center = () => { const c = bb.c.slice(); if (st.mirror) c[0] = -c[0]; return c; };
    const cur = k => st[k] !== undefined ? st[k] : (def.cam && def.cam[k] !== undefined ? def.cam[k] : (k === 'yaw' ? 35 : 10));
    function camera(W, H) {
      const yaw = cur('yaw') * D2R, pitch = cur('pitch') * D2R;
      const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      const right = norm(cross([0, 1, 0], dir)), up = cross(dir, right);
      const c = center();
      const fov = 30 * D2R, asp = W / H, th = Math.tan(fov / 2);
      const pad = opts.pad === undefined ? 1.08 : 1 + opts.pad;
      let D = 0, ez = 0;
      for (let i = 0; i < 8; i++) {
        const q = [i & 1 ? bb.mx[0] : bb.mn[0], i & 2 ? bb.mx[1] : bb.mn[1], i & 4 ? bb.mx[2] : bb.mn[2]];
        if (st.mirror) q[0] = -q[0];
        const d = sub(q, c), dz = dot(d, dir);
        ez = Math.max(ez, Math.abs(dz));
        // a corner closer to the camera looks bigger, so it needs more distance
        D = Math.max(D, Math.abs(dot(d, right)) * pad / (th * asp) + dz, Math.abs(dot(d, up)) * pad / th + dz);
      }
      const eye = add(c, mul(dir, D));
      const V = lookAt(eye, c, [0, 1, 0]), Pm = persp(fov, asp, Math.max(5, D - ez * 3 - 50), D + ez * 3 + 400);
      return { VP: mmul(Pm, V), eye, right, up, dir };
    }
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(10, canvas.clientWidth), h = Math.max(10, canvas.clientHeight);
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    }
    const MIRV = v => [-v[0], v[1], v[2]];
    function frame(t) {
      size();
      const W = canvas.width, H = canvas.height;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const cam = camera(W, H);
      const { model, s } = OS3D.frameModel(pr, t, def, mod);
      const sk = model.sk, mir = st.mirror;
      const X = v => mir ? MIRV(v) : v;
      const caps = [];
      model.parts.forEach(pt => { if (pt.k === 'cap') caps.push(pt); });
      const extra = OS3D.propParts(def, sk);
      // lights relative to the camera so the visible side is always lit
      const L1 = norm(add(add(mul(cam.right, -0.55), mul(cam.up, 0.85)), mul(cam.dir, 0.7)));
      const L2 = norm(add(add(mul(cam.right, 0.7), mul(cam.up, 0.25)), mul(cam.dir, -0.35)));
      const Ls = norm(add(add(mul(cam.right, -0.22), [0, 1, 0]), mul(cam.dir, 0.18)));
      const Lr = norm(add(add(mul(cam.right, 0.6), mul(cam.up, 0.45)), mul(cam.dir, 1.0)));
      const look = st.anat && LOOK() === 3 ? 1 : LOOK(), holo = look === 3;
      const dark = P.dark || holo ? 1 : 0;
      const sky = dark ? [0.42, 0.46, 0.5] : [0.92, 0.95, 0.97], ground = dark ? [0.16, 0.15, 0.14] : [0.42, 0.38, 0.35];
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE);
      // floor with mat, soft shadow and contact occlusion
      {
        const g = pg.floor; gl.useProgram(g.p);
        const c = center(); const ext = Math.max(bb.mx[0] - bb.mn[0], bb.mx[2] - bb.mn[2]);
        gl.uniformMatrix4fv(g.u.uVP, false, cam.VP); gl.uniform3fv(g.u.uCtr, c); gl.uniform1f(g.u.uR, ext * 0.75 + 60);
        gl.uniform3fv(g.u.uFloor, P.floor); gl.uniform3fv(g.u.uMatCol, P.mat);
        const mat = OS3D.matFor(def);
        gl.uniform1i(g.u.uHasMat, mat ? 1 : 0);
        if (mat) gl.uniform4fv(g.u.uMat, mir ? [-mat.x1, -mat.x0, mat.z0, mat.z1] : [mat.x0, mat.x1, mat.z0, mat.z1]);
        const A = [], B = [];
        const occ = caps.concat(model.parts.filter(p => p.k === 'sph').map(p => ({ a: p.c, b: p.c, ra: p.r, rb: p.r })));
        occ.push({ a: sk.HC, b: sk.HC, ra: 9.5, rb: 9.5 });
        // torso as a few thick capsules
        const lv = sk.lv;
        for (let i = 0; i < lv.length - 1; i++) occ.push({ a: lv[i].c, b: lv[i + 1].c, ra: (lv[i].a + lv[i].b) * 0.5, rb: (lv[i + 1].a + lv[i + 1].b) * 0.5 });
        extra.forEach(p => { if (p.k === 'cap') occ.push(p); else if (p.k === 'sph') occ.push({ a: p.c, b: p.c, ra: p.r, rb: p.r }); });
        occ.slice(0, 30).forEach(p => { const a = X(p.a), b = X(p.b); A.push(a[0], a[1], a[2], 0.5 * (p.ra + p.rb)); B.push(b[0], b[1], b[2], 0); });
        while (A.length < 120) { A.push(0, -999, 0, 0); B.push(0, -999, 0, 0); }
        gl.uniform4fv(g.u.uCA, A); gl.uniform4fv(g.u.uCB, B); gl.uniform1i(g.u.uNC, Math.min(30, occ.length));
        gl.uniform3fv(g.u.uLs, Ls); gl.uniform1f(g.u.uDark, dark); gl.uniform1i(g.u.uHolo, holo ? 1 : 0);
        gl.depthMask(false);
        gl.bindVertexArray(fq.o); gl.drawElements(gl.TRIANGLES, fq.n, gl.UNSIGNED_SHORT, 0);
        gl.depthMask(true);
      }
      // shared body uniforms
      const mus = st.glow || st.anat ? model.mus.slice(0, 12) : [];
      const MU = [], MD = [], MX = [];
      mus.forEach(m => {
        const c = X(m.c), n = X(m.n), ax = X(m.ax || [0, 1, 0]);
        const f = (st.anat && MSHAPE[m.nm]) || [1, 1];
        MU.push(c[0], c[1], c[2], m.w * 1.15 * f[1] + 1.2); MD.push(n[0], n[1], n[2], 1); MX.push(ax[0], ax[1], ax[2], m.l * 1.1 * f[0] + 1.5);
      });
      while (MU.length < 48) { MU.push(0, -999, 0, 1); MD.push(0, 1, 0, 0); MX.push(0, 1, 0, 1); }
      // anatomy colours: resting muscle, tendon, working muscle
      const AN = dark ? { mus: lin([146, 104, 96]), ten: lin([186, 166, 150]), hot: lin([255, 66, 48]) } : { mus: lin([200, 152, 140]), ten: lin([226, 208, 192]), hot: lin([214, 40, 32]) };
      const anat = st.anat;
      const setCommon = (g, alpha) => {
        gl.useProgram(g.p);
        gl.uniformMatrix4fv(g.u.uVP, false, cam.VP);
        gl.uniform3fv(g.u.uEye, cam.eye); gl.uniform3fv(g.u.uL1, L1); gl.uniform3fv(g.u.uL2, L2);
        gl.uniform3fv(g.u.uSky, sky); gl.uniform3fv(g.u.uGround, ground); gl.uniform3fv(g.u.uGlow, holo ? HOLO_GLOW : P.glow);
        gl.uniform1f(g.u.uAlpha, alpha); gl.uniform1f(g.u.uWrap, 0.32);
        gl.uniform1i(g.u.uLook, look); gl.uniform3fv(g.u.uRim, Lr); gl.uniform1f(g.u.uDarkBg, dark); gl.uniform1i(g.u.uRefl, 0);
        gl.uniform4fv(g.u.uCapA, CAPA); gl.uniform4fv(g.u.uCapB, CAPB); gl.uniform1i(g.u.uNCap, AO_ON() ? NCAP : 0);
        gl.uniform4fv(g.u.uMus, MU); gl.uniform4fv(g.u.uMusD, MD); gl.uniform4fv(g.u.uMusX, MX); gl.uniform1i(g.u.uNM2, mus.length);
        gl.uniform1f(g.u.uGlowAmt, anat ? 0.6 + 0.4 * (s.a || 0) : 0.35 + 0.65 * (s.a || 0));
        gl.uniform1i(g.u.uAnat, anat ? 1 : 0); gl.uniform3fv(g.u.uHot, AN.hot); gl.uniform3fv(g.u.uTend, AN.ten);
        gl.uniform1f(g.u.uFib, 0); gl.uniform2f(g.u.uTen, 0, 0);
      };
      const skin = ensureSkin();
      // body parts as capsules for the soft shadow between them
      const CAPA = new Float32Array(72), CAPB = new Float32Array(72);
      let NCAP = 0;
      const capsOf = sk0 => {
        const R = OS3D.RAD, L = [[sk0.P0, sk0.L1, 12.5, 12], [sk0.L1, sk0.C7, 12.5, 11.5], [sk0.C7, sk0.HC, 5.4, 5.4], [sk0.HC, sk0.HC, 9.5, 9.5]];
        ['L', 'R'].forEach(sd => {
          L.push([sk0['S' + sd], sk0['E' + sd], R.ua[0], R.ua[1]], [sk0['E' + sd], sk0['W' + sd], R.fa[0], R.fa[1]], [sk0['W' + sd], sk0['T' + sd], R.hand[0], R.hand[1]]);
          L.push([sk0['H' + sd], sk0['K' + sd], R.th[0], R.th[1]], [sk0['K' + sd], sk0['A' + sd], R.sn[0], R.sn[1]], [sk0['Heel' + sd], sk0['Toe' + sd], R.foot[0], R.foot[1]]);
        });
        NCAP = 0;
        L.forEach(([a, b, ra, rb]) => {
          if (!a || !b || NCAP >= 18) return;
          const A = X(a), B = X(b), i = NCAP * 4;
          CAPA[i] = A[0]; CAPA[i + 1] = A[1]; CAPA[i + 2] = A[2]; CAPA[i + 3] = ra * 0.92;
          CAPB[i] = B[0]; CAPB[i + 1] = B[1]; CAPB[i + 2] = B[2]; CAPB[i + 3] = rb * 0.92;
          NCAP++;
        });
      };
      // pass: 0 the figure, 1 its reflection in the floor, 2 the glow shell (hologram)
      const drawAll = (model0, alpha, pass) => {
        const sk0 = model0.sk;
        capsOf(sk0);
        if (skin) {
          const gsk = pg.skin; setCommon(gsk, alpha);
          boneDQ(sk0, skin.rest, DQ);
          gl.uniform4fv(gsk.u.uDQ, DQ); gl.uniform1f(gsk.u.uMir, mir ? -1 : 1);
          gl.uniform1f(gsk.u.uRefY, pass === 1 ? -1 : 1); gl.uniform1f(gsk.u.uInfl, pass === 2 ? 2.2 : 0); gl.uniform1i(gsk.u.uRefl, pass || 0);
          gl.uniform3fv(gsk.u.uCol, anat ? AN.mus : P.top); gl.uniform3fv(gsk.u.uCol2, P.bottom); gl.uniform3fv(gsk.u.uSkin, P.skin); gl.uniform3fv(gsk.u.uHair, P.hair);
          gl.uniform1i(gsk.u.uMode, 4); gl.uniform1f(gsk.u.uShine, anat ? 0.14 : 0.1);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, skin.tex); gl.uniform1i(gsk.u.uTex, 0);
          gl.uniform1i(gsk.u.uTexOn, skin.tex && !anat ? 1 : 0);
          gl.bindVertexArray(skin.vao.o); gl.drawElements(gl.TRIANGLES, skin.n, skin.type, 0);
          if (pass) { gl.uniform1f(gsk.u.uRefY, 1); gl.uniform1f(gsk.u.uInfl, 0); gl.uniform1i(gsk.u.uRefl, 0); return; }
          skin.parts.forEach(pt => {
            if (!pt.tex) return;
            gl.bindTexture(gl.TEXTURE_2D, pt.tex); gl.uniform1i(gsk.u.uMode, 5); gl.uniform1i(gsk.u.uTexOn, 1);
            gl.uniform3fv(gsk.u.uCol, pt.n === 'hair' ? HAIR_TINT : [1, 1, 1]); gl.uniform1f(gsk.u.uShine, pt.n === 'hair' ? 0.06 : 0.02);
            gl.bindVertexArray(pt.vao.o); gl.drawElements(gl.TRIANGLES, pt.cnt, gl.UNSIGNED_SHORT, 0);
          });
          gl.uniform1i(gsk.u.uTexOn, 0);
        }
        // torso
        if (!skin) {
        setCommon(pg.mesh, alpha);
        const nrw = torsoBuild(sk0.lv, mir, TB);
        gl.bindBuffer(gl.ARRAY_BUFFER, tv.bufs[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, TB.P);
        gl.bindBuffer(gl.ARRAY_BUFFER, tv.bufs[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, TB.N);
        gl.bindBuffer(gl.ARRAY_BUFFER, tv.bufs[2]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, TB.C);
        gl.bindBuffer(gl.ARRAY_BUFFER, tv.bufs[3]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, TB.R);
        gl.uniformMatrix4fv(pg.mesh.u.uM, false, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        gl.uniformMatrix3fv(pg.mesh.u.uNM, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
        gl.uniform3fv(pg.mesh.u.uCol, anat ? AN.mus : P.top); gl.uniform3fv(pg.mesh.u.uCol2, anat ? AN.mus : P.bottom); gl.uniform1i(pg.mesh.u.uMode, 3); gl.uniform1f(pg.mesh.u.uShine, anat ? 0.12 : 0.06);
        gl.bindVertexArray(tv.o); gl.drawElements(gl.TRIANGLES, tv.n, gl.UNSIGNED_SHORT, 0);
        }
        // limbs and spheres
        const g = pg.cap; setCommon(g, alpha);
        gl.uniform1i(g.u.uNB, 0);
        gl.bindVertexArray(M.cap.o);
        const fem = OS3D.BODY && OS3D.BODY.sex === 'f';
        let bumpsOn = false;
        const capDraw = (a, b, ra, rb, col, col2, split, shine, prof, relief) => {
          a = X(a); b = X(b);
          if (relief) {
            const bd = bumpsFor(relief.id, fem);
            gl.uniform3fv(g.u.uFr, X(relief.fr)); gl.uniform3fv(g.u.uLt, X(relief.lt));
            gl.uniform4fv(g.u.uBA, bd.A); gl.uniform1fv(g.u.uBK, bd.K); gl.uniform1i(g.u.uNB, bd.n); bumpsOn = true;
          } else if (bumpsOn) { gl.uniform1i(g.u.uNB, 0); bumpsOn = false; }
          gl.uniform3fv(g.u.uA, a); gl.uniform3fv(g.u.uB, b); gl.uniform1f(g.u.uRa, ra); gl.uniform1f(g.u.uRb, rb);
          gl.uniform1f(g.u.uRm, prof ? prof[0] : (ra + rb) / 2); gl.uniform1f(g.u.uTm, prof ? prof[1] : 0.5);
          gl.uniform3fv(g.u.uCol, col); gl.uniform3fv(g.u.uCol2, col2 || col); gl.uniform1f(g.u.uSplit, split || 0); gl.uniform1i(g.u.uMode, split ? 1 : 0); gl.uniform1f(g.u.uShine, shine === undefined ? 0.1 : shine);
          gl.drawElements(gl.TRIANGLES, M.cap.n, gl.UNSIGNED_SHORT, 0);
        };
        model0.parts.forEach(pt => {
          if (skin && (SKIN_PARTS.test(pt.id) || (skin.glb && pt.id === 'head'))) return;
          if (pt.k === 'cap') {
            const base = pt.id.replace(/[LR]$/, ''), sd = pt.id.slice(-1);
            const pf = PROF[base];
            let relief = null;
            if (BUMPS[base] && pt.F) relief = { id: base, fr: mv(pt.F, [0, 0, 1]), lt: mv(pt.F, [sd === 'L' ? 1 : -1, 0, 0]) };
            const muscle = anat && TEN[base];
            if (muscle) { gl.uniform1f(g.u.uFib, 1); gl.uniform2f(g.u.uTen, TEN[base][0], TEN[base][1]); }
            capDraw(pt.a, pt.b, pt.ra, pt.rb, muscle ? AN.mus : (P[pt.col] || P.skin), P.bottom, pt.shorts && !anat ? 0.42 : 0, muscle ? 0.14 : 0.1, pf ? [pf[0] * pt.ra, pf[1]] : null, relief);
            if (muscle) { gl.uniform1f(g.u.uFib, 0); gl.uniform2f(g.u.uTen, 0, 0); }
          }
          // the shoulder ball is a little smaller: the deltoid shape now comes from the upper arm
          else if (pt.k === 'sph') { const dl = /^delt/.test(pt.id); const r = dl ? pt.r * 0.9 : pt.r; capDraw(pt.c, pt.c, r, r, anat && dl ? AN.mus : (P[pt.col] || P.skin), null, 0, 0.1); }
        });
        // trapezius slopes and kneecaps
        const neckBase = add(sk0.C7, mv(sk0.Ft, [0, 1.5, -1.5]));
        if (!skin) ['L', 'R'].forEach(sd => {
          const S0 = sk0['S' + sd];
          if (anat) gl.uniform1f(g.u.uFib, 1);
          capDraw(neckBase, add(S0, mv(sk0.Ft, [0, 1.2, -0.8])), 5.0, 4.2, anat ? AN.mus : P.top, null, 0, 0.06);
          if (anat) gl.uniform1f(g.u.uFib, 0);
          const Fth = sk0['Fth' + sd];
          if (Fth) { const kz = norm(mv(Fth, [0, 0, 1])); const kc = add(sk0['K' + sd], mul(kz, 4.2)); capDraw(kc, kc, 2.7, 2.7, anat ? AN.ten.map((v, i) => (v + AN.mus[i]) * 0.5) : P.skin, null, 0, 0.1); }
        });
        // face details
        const hc = sk0.HC, F = sk0.Fh, at = v => add(hc, mv(F, v));
        const skinD = P.skin.map(v => v * 0.82);
        const fe = skin && skin.glb;
        if (fe) {
          // real face: eyeballs with a dark iris, eyebrows
          ['l', 'r'].forEach(sd => {
            const ey = fe['eye_' + sd], c = at(ey.c);
            capDraw(c, c, ey.r * 0.97, ey.r * 0.97, EYE_W, null, 0, 0.45);
            const ic = at(add(ey.c, mul(ey.f, ey.r * 0.8)));
            capDraw(ic, ic, ey.r * 0.42, ey.r * 0.42, EYE_I, null, 0, 0.6);
            if (skin.parts.some(q => q.n === 'brows' && q.tex)) return;
            const br = fe['brow_' + sd];
            capDraw(at(br[0]), at(br[1]), 0.3, 0.34, P.hair, null, 0, 0.1);
            capDraw(at(br[1]), at(br[2]), 0.34, 0.2, P.hair, null, 0, 0.1);
          });
        } else {
        capDraw(at([0, -1.4, 9.6]), at([0, -2.6, 10.3]), 1.25, 1.05, skinD, null, 0, 0.08);
        [1, -1].forEach(sd => {
          capDraw(at([sd * 8.1, -0.6, -1.0]), at([sd * 8.1, -0.6, -1.0]), 2.1, 2.1, skinD, null, 0, 0.05);
          capDraw(at([sd * 3.2, 1.7, 8.6]), at([sd * 3.2, 1.7, 8.6]), 0.95, 0.95, P.hair, null, 0, 0.3);
        });
        }
        extra.forEach(p => {
          if (p.k === 'cap') capDraw(p.a, p.b, p.ra, p.rb, P[p.col] || P.prop, null, 0, 0.35);
          else if (p.k === 'sph') capDraw(p.c, p.c, p.r, p.r, P[p.col] || P.prop, null, 0, 0.3);
          else if (p.k === 'line') capDraw(p.pts[0], p.pts[1], (p.w || 1.4) * 0.6, (p.w || 1.4) * 0.6, P[p.col] || P.band, null, 0, 0.2);
          else if (p.k === 'wheel') { const ax = norm(mv(sk0.Fp, [1, 0, 0])); capDraw(sub(p.c, mul(ax, 3)), add(p.c, mul(ax, 3)), p.r, p.r, P.kb, null, 0, 0.3); }
          else if (p.k === 'rope') { const a = p.a, b = p.b, ph = p.ph * 2 * Math.PI; let prev = a; for (let i = 1; i <= 10; i++) { const t = i / 10; const q = add(add(a, mul(sub(b, a), t)), [0, -Math.sin(Math.PI * t) * 60 * Math.cos(ph), Math.sin(Math.PI * t) * 60 * Math.sin(ph)]); capDraw(prev, q, 0.7, 0.7, P.band, null, 0, 0.2); prev = q; } }
        });
        // head and hair
        const ge = pg.ell; setCommon(ge, alpha);
        gl.bindVertexArray(M.sph.o);
        let Fm = colMajor3(F);
        let hcm = X(hc);
        if (mir) Fm = [-Fm[0], Fm[1], Fm[2], -Fm[3], Fm[4], Fm[5], -Fm[6], Fm[7], Fm[8]];
        const H = OS3D.HEAD;
        if (!fe) {
        gl.uniform3fv(ge.u.uC, hcm); gl.uniformMatrix3fv(ge.u.uR, false, Fm);
        gl.uniform3fv(ge.u.uS, [H.a, H.b, H.c]); gl.uniform3fv(ge.u.uCol, P.skin); gl.uniform1i(ge.u.uMode, 0); gl.uniform1f(ge.u.uShine, 0.1);
        gl.drawElements(gl.TRIANGLES, M.sph.n, gl.UNSIGNED_SHORT, 0);
        gl.uniform3fv(ge.u.uS, [H.a * 1.06, H.b * 1.05, H.c * 1.06]); gl.uniform3fv(ge.u.uCol, P.hair); gl.uniform1i(ge.u.uMode, 2); gl.uniform1f(ge.u.uShine, 0.22);
        gl.drawElements(gl.TRIANGLES, M.sph.n, gl.UNSIGNED_SHORT, 0);
        }
        // boxes, walls
        const gm = pg.mesh; setCommon(gm, alpha);
        gl.bindVertexArray(M.box.o);
        const boxDraw = (c, R, h, col) => {
          const m = [R[0] * h[0], R[3] * h[0], R[6] * h[0], 0, R[1] * h[1], R[4] * h[1], R[7] * h[1], 0, R[2] * h[2], R[5] * h[2], R[8] * h[2], 0, c[0], c[1], c[2], 1];
          if (mir) { m[0] = -m[0]; m[4] = -m[4]; m[8] = -m[8]; m[12] = -m[12]; }
          gl.uniformMatrix4fv(gm.u.uM, false, m);
          const nmat = [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
          if (mir) { nmat[0] = -nmat[0]; nmat[3] = -nmat[3]; nmat[6] = -nmat[6]; }
          gl.uniformMatrix3fv(gm.u.uNM, false, nmat);
          gl.uniform3fv(gm.u.uCol, col); gl.uniform1i(gm.u.uMode, 0); gl.uniform1f(gm.u.uShine, 0.05);
          gl.drawElements(gl.TRIANGLES, M.box.n, gl.UNSIGNED_SHORT, 0);
        };
        const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        extra.forEach(p => {
          if (p.k === 'box') boxDraw(mul(add(p.min, p.max), 0.5), I3, mul(sub(p.max, p.min), 0.5), P[p.col] || P.prop);
          else if (p.k === 'boxF') boxDraw(p.c, p.F, mul(p.h, 0.5), P[p.col] || P.pack);
          else if (p.k === 'quad') { const q = p.pts; const c = mul(add(q[0], q[2]), 0.5); const u = mul(sub(q[1], q[0]), 0.5), v = mul(sub(q[3], q[0]), 0.5); const w = norm(cross(u, v)); const lu = len(u), lvv = len(v); const R = [u[0] / lu, v[0] / lvv, w[0], u[1] / lu, v[1] / lvv, w[1], u[2] / lu, v[2] / lvv, w[2]]; boxDraw(c, R, [lu, lvv, 0.6], P.wall); }
        });
      };
      if (st.ghost) {
        const g0 = OS3D.frameModel(pr, 0, def).model;
        gl.depthMask(false); drawAll(g0, 0.16); gl.depthMask(true);
      }
      if (holo && skin) {
        // the figure mirrored in the glossy floor, then a clean depth buffer for the figure itself
        gl.colorMask(false, false, false, false); drawAll(model, 1, 1);
        gl.colorMask(true, true, true, true); gl.depthFunc(gl.LEQUAL); drawAll(model, 1, 1); gl.depthFunc(gl.LESS);
        gl.clear(gl.DEPTH_BUFFER_BIT);
      }
      drawAll(model, 1);
      if (holo && skin) {
        // halo: the far side of a slightly larger copy, hidden behind the body, shows only around the outline
        gl.depthMask(false);
        drawAll(model, 1, 2);
        gl.depthMask(true);
      }
      gl.bindVertexArray(null);
      return s;
    }
    let lastS = null;
    function draw() { try { lastS = frame(st.t); if (opts.onFrame) opts.onFrame(lastS, st.t); } catch (e) { console.warn('OS3G draw', e); } }
    function loop(now) {
      st.raf = 0;
      if (st.dead) return;
      if (st.playing) {
        const dt = st.last ? Math.min(100, now - st.last) : 0;
        const before = Math.floor(st.t / pr.total);
        st.t += dt * st.speed;
        const after = Math.floor(st.t / pr.total);
        if (after > before && opts.onCycle) opts.onCycle(after);
        st.last = now;
      }
      draw();
      if (st.playing) st.raf = requestAnimationFrame(loop);
    }
    function kick() { if (!st.raf && !st.dead) st.raf = requestAnimationFrame(loop); }
    let drag = null;
    if (opts.interactive) {
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: cur('yaw'), pitch: cur('pitch') }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { } });
      canvas.addEventListener('pointermove', e => { if (!drag) return; st.yaw = drag.yaw - (e.clientX - drag.x) * 0.6; st.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.25, -5, 70); kick(); });
      const end = () => { drag = null; };
      canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('dblclick', () => { st.yaw = opts.yaw; st.pitch = opts.pitch; kick(); });
    }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); st.dead = true; });
    kick();
    return {
      gl: true,
      canvas,
      get playing() { return st.playing; },
      get cycle() { return pr.total; },
      get t() { return st.t; },
      play() { if (st.playing) return; st.playing = true; st.last = 0; kick(); },
      pause() { st.playing = false; kick(); },
      toggle() { if (st.playing) this.pause(); else this.play(); return st.playing; },
      setSpeed(v) { st.speed = v; },
      setMirror(v) { st.mirror = !!v; kick(); },
      setTrail() { },
      setGhost(v) { st.ghost = !!v; kick(); },
      setMuscles(v) { st.glow = !!v; kick(); },
      setAnatomy(v) { st.anat = !!v; kick(); },
      get anatomy() { return st.anat; },
      resetView() { st.yaw = opts.yaw; st.pitch = opts.pitch; kick(); },
      setTime(ms) { st.t = ms; kick(); },
      // one renderer for many still pictures (thumbnails): swap the exercise, set the colours, draw right now
      setDef(d) {
        if (!d.ease && !opts.raw) { d = Object.assign({}, d, { ease: 'cr' }); delete d._pr; }
        def = d; pr = OS3D.prep(def); mod = opts.raw ? null : softMod(pr); bb = bounds();
      },
      setPalette(raw) { opts.palette = raw; readP(); },
      drawNow() { draw(); return canvas; },
      get ready() { const k = ensureSkin(); return !!(k && k.tex && k.parts.every(q => q.tex)); },
      repaint() { readP(); kick(); },
      destroy() {
        st.dead = true; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0;
        try { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { }
      }
    };
  }
  return { mount, supported, meshReady: sex => !!(MESH[sex] && MESH[sex].ready) };
})();
