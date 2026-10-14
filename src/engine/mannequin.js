/* OS3D — volumetric 3D mannequin for exercise animation, drawn on a 2D canvas.
   World: Y up, figure faces +Z at rest, figure's left side is +X. Units: cm. Floor is y = 0. */
const OS3D = (function () {
  'use strict';
  const D2R = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function mm(A, B) {
    const C = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return C;
  }
  const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const rx = d => { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const ry = d => { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rz = d => { const a = d * D2R, c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const perp = u => Math.abs(u[1]) < 0.9 ? norm(cross(u, [0, 1, 0])) : norm(cross(u, [1, 0, 0]));

  /* ---------- body ---------- */
  const B = {
    hipW: 9, sb: [0, 7, -2], lum: 14, tho: 27, neck: 10, headC: [0, 9.5, 1.5],
    sh: [17, -4, 1], ua: 29, fa: 25, hand: 15, th: 45, sn: 43,
    toe: [0, -6.5, 17], heel: [0, -6.5, -5]
  };
  const RAD = { ua: [5.6, 4.4], fa: [4.3, 3.1], hand: [3.3, 2.6], th: [9.4, 6.1], sn: [6.0, 3.9], foot: [3.9, 3.0], neck: 5.6, delt: 6.9, elbow: 4.4, knee: 6.1, ankle: 3.9, wrist: 3.1 };
  const HEAD = { a: 8.3, b: 11, c: 9.8 };
  const LEVELS = [ // torso cross-sections: base joint, frame, offset, half-width, half-depth
    ['P0', 'Fp', [0, -5, -1], 16.6, 11],
    ['P0', 'Fp', [0, 7, -1.5], 15, 10],
    ['SB', 'Fl', [0, 7.5, 1], 13.6, 9.6],
    ['L1', 'Ft', [0, 2, 1.5], 14.6, 10.6],
    ['L1', 'Ft', [0, 13.5, 2.5], 16.2, 11.6],
    ['L1', 'Ft', [0, 21.5, 1.5], 16.4, 10.4],
    ['C7', 'Ft', [0, -0.5, 0], 12.4, 7.4]
  ];
  const DEF = {
    r: [0, 95, 0], o: [0, 0, 0], sp: [0, 0, 0], ch: [0, 0, 0], nk: [0, 0, 0], hd: [0, 0, 0],
    sL: [0, 0], sR: [0, 0], aL: [4, 7, 0, 0], aR: [4, 7, 0, 0], eL: 10, eR: 10, wL: 0, wR: 0,
    lL: [0, 3, 4, 0], lR: [0, 3, 4, 0], kL: 2, kR: 2, fL: 0, fR: 0
  };
  // body build: the male proportions above are the default; setBody('f') narrows shoulders and waist, widens hips, slims limbs
  const BODY = { sex: 'm' };
  const MALE = { sh0: B.sh[0], hipW: B.hipW, lv: LEVELS.map(l => [l[0], l[1], l[2].slice(), l[3], l[4]]), rad: JSON.parse(JSON.stringify(RAD)) };
  const FEMALE_LV = [[0, -5, -1.2], 17.8, 11.8, [0, 7, -1.5], 15.4, 10, [0, 7.5, 1], 12, 9, [0, 2, 1.5], 13.2, 9.8, [0, 13.5, 3.4], 14.8, 12.4, [0, 21.5, 1.5], 14.6, 10.2, [0, -0.5, 0], 11.2, 6.8];
  const RADF = { ua: 0.88, fa: 0.88, hand: 0.9, th: 0.98, sn: 0.93, foot: 0.92, neck: 0.9, delt: 0.86, elbow: 0.88, knee: 0.95, ankle: 0.92, wrist: 0.9 };
  function setBody(sex) {
    sex = sex === 'f' ? 'f' : 'm';
    if (BODY.sex === sex) return false;
    BODY.sex = sex;
    const f = sex === 'f';
    B.sh[0] = f ? 15.4 : MALE.sh0;
    B.hipW = f ? 9.6 : MALE.hipW;
    LEVELS.forEach((l, i) => {
      if (f) { l[2] = FEMALE_LV[i * 3].slice(); l[3] = FEMALE_LV[i * 3 + 1]; l[4] = FEMALE_LV[i * 3 + 2]; }
      else { l[2] = MALE.lv[i][2].slice(); l[3] = MALE.lv[i][3]; l[4] = MALE.lv[i][4]; }
    });
    Object.keys(MALE.rad).forEach(k => { const v = MALE.rad[k], sc = f ? (RADF[k] || 1) : 1; RAD[k] = Array.isArray(v) ? v.map(x => x * sc) : v * sc; });
    if (typeof MOVES !== 'undefined') Object.values(MOVES).forEach(d => { if (d._pr) d._pr.bb = null; });
    return true;
  }
  const KEYS = [['r', 3], ['o', 3], ['sp', 3], ['ch', 3], ['nk', 3], ['hd', 3], ['sL', 2], ['sR', 2], ['aL', 4], ['aR', 4], ['eL', 1], ['eR', 1], ['wL', 1], ['wR', 1], ['lL', 4], ['lR', 4], ['kL', 1], ['kR', 1], ['fL', 1], ['fR', 1]];
  const IKK = ['HL', 'HR', 'FL', 'FR'];

  // Joint rotations. Spine: [flex forward, lateral bend to the left, twist to the left]
  const JS = v => mm(rx(v[0]), mm(rz(-v[1]), ry(v[2])));
  // Shoulder / hip: [flex forward, abduction, external rotation, horizontal abduction]; s = +1 left, -1 right
  const JL = (v, s) => mm(ry(v[3] * s), mm(rz(v[1] * s), mm(rx(-v[0]), ry(v[2] * s))));

  function ik(S, T, l1, l2, pole) {
    let d = sub(T, S), dist = len(d);
    const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 1;
    if (dist > max) { d = mul(d, max / dist); dist = max; }
    if (dist < min) { d = mul(norm(d), min); dist = min; }
    const u = mul(d, 1 / dist);
    let pv = sub(pole, mul(u, dot(pole, u)));
    pv = len(pv) < 1e-4 ? perp(u) : norm(pv);
    const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
    return [add(S, add(mul(u, l1 * ca), mul(pv, l1 * sa))), add(S, d)];
  }
  // frame from an axis (pointing from distal to proximal = local +Y) and a preferred front
  function frameFrom(up, front) {
    const y = norm(up);
    let z = sub(front, mul(y, dot(front, y)));
    z = len(z) < 1e-4 ? perp(y) : norm(z);
    const x = cross(y, z);
    return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
  }

  function solve(p) {
    const Fp = mm(ry(p.o[0]), mm(rx(p.o[1]), rz(p.o[2])));
    const at = (base, F, v) => add(base, mv(F, v));
    const P0 = p.r;
    const SB = at(P0, Fp, B.sb);
    const Fl = mm(Fp, JS(p.sp));
    const L1 = at(SB, Fl, [0, B.lum, 0]);
    const Ft = mm(Fl, JS(p.ch));
    const C7 = at(L1, Ft, [0, B.tho, 0]);
    const Fn = mm(Ft, JS(p.nk));
    const HB = at(C7, Fn, [0, B.neck, 0]);
    const Fh = mm(Fn, JS(p.hd));
    const HC = at(HB, Fh, B.headC);
    const fwd = mv(Fp, [0, 0, 1]);
    const sk = { P0, SB, L1, C7, HB, HC, Fp, Fl, Ft, Fn, Fh, fwd };
    const relT = spec => {
      if (!spec || !spec.rel) return spec;
      const base = spec.rel === 'T' ? [C7, Ft] : spec.rel === 'H' ? [HC, Fh] : [P0, Fp];
      return Object.assign({}, spec, { t: add(base[0], mv(base[1], spec.t)), p: spec.p ? mv(base[1], spec.p) : spec.p, d: spec.d ? mv(base[1], spec.d) : spec.d, u: spec.u ? mv(base[1], spec.u) : spec.u });
    };
    const yaw = p.o[0];
    [['L', 1], ['R', -1]].forEach(([side, s]) => {
      const sc = p['s' + side];
      const S = at(C7, Ft, [B.sh[0] * s, B.sh[1] + sc[0], B.sh[2] + sc[1]]);
      const ikH = relT(p['H' + side]);
      let E, W, T, Fu, Ff, Fw;
      if (ikH) {
        const pole = ikH.p || add(mv(Ft, [0.6 * s, -0.2, -1]), [0, 0, 0]);
        const r = ik(S, ikH.t, B.ua, B.fa, pole);
        E = r[0]; W = r[1];
        const dir = ikH.d ? norm(ikH.d) : norm(sub(W, E));
        T = add(W, mul(dir, B.hand));
        Fu = frameFrom(sub(S, E), mul(norm(pole), -1));
        Ff = frameFrom(sub(E, W), mul(norm(pole), -1));
        Fw = frameFrom(sub(W, T), mul(norm(pole), -1));
      } else {
        Fu = mm(Ft, JL(p['a' + side], s));
        E = at(S, Fu, [0, -B.ua, 0]);
        Ff = mm(Fu, rx(-p['e' + side]));
        W = at(E, Ff, [0, -B.fa, 0]);
        Fw = mm(Ff, rx(-p['w' + side]));
        T = at(W, Fw, [0, -B.hand, 0]);
      }
      sk['S' + side] = S; sk['E' + side] = E; sk['W' + side] = W; sk['T' + side] = T; sk['Fu' + side] = Fu; sk['Ff' + side] = Ff; sk['Fw' + side] = Fw;
      const Hp = at(P0, Fp, [B.hipW * s, 0, 0]);
      const ikF = relT(p['F' + side]);
      let K, A, Toe, Heel, Fth, Fsh, Fa;
      if (ikF) {
        const pole = ikF.p || add(fwd, [0.25 * s, 0, 0]);
        const r = ik(Hp, ikF.t, B.th, B.sn, pole);
        K = r[0]; A = r[1];
        Fa = ikF.d ? frameFrom(ikF.u || [0, 1, 0], ikF.d) : mm(ry(yaw + (ikF.fy || 0) * s), rx(ikF.ft || 0));
        Toe = at(A, Fa, B.toe); Heel = at(A, Fa, B.heel);
        Fth = frameFrom(sub(Hp, K), pole);
        Fsh = frameFrom(sub(K, A), pole);
      } else {
        Fth = mm(Fp, JL(p['l' + side], s));
        K = at(Hp, Fth, [0, -B.th, 0]);
        Fsh = mm(Fth, rx(p['k' + side]));
        A = at(K, Fsh, [0, -B.sn, 0]);
        Fa = mm(Fsh, rx(p['f' + side]));
        Toe = at(A, Fa, B.toe); Heel = at(A, Fa, B.heel);
      }
      sk['H' + side] = Hp; sk['K' + side] = K; sk['A' + side] = A; sk['Toe' + side] = Toe; sk['Heel' + side] = Heel; sk['Fth' + side] = Fth; sk['Fsh' + side] = Fsh; sk['Fa' + side] = Fa;
    });
    return sk;
  }

  /* ---------- keyframes ---------- */
  function fill(p) {
    const o = {};
    KEYS.forEach(([k]) => { const v = p[k] !== undefined ? p[k] : DEF[k]; o[k] = Array.isArray(v) ? v.slice() : v; });
    IKK.forEach(k => { if (p[k]) o[k] = { t: p[k].t.slice(), p: p[k].p ? p[k].p.slice() : null, d: p[k].d ? p[k].d.slice() : null, u: p[k].u ? p[k].u.slice() : null, ft: p[k].ft || 0, fy: p[k].fy || 0, rel: p[k].rel || null }; });
    return o;
  }
  function flat(p) {
    const v = [];
    KEYS.forEach(([k, n]) => { if (n === 1) v.push(p[k]); else for (let i = 0; i < n; i++) v.push(p[k][i]); });
    IKK.forEach(k => {
      const s = p[k];
      if (!s) return;
      v.push(s.t[0], s.t[1], s.t[2]);
      const pp = s.p || [0, 0, 0]; v.push(pp[0], pp[1], pp[2]);
      const dd = s.d || [0, 0, 0]; v.push(dd[0], dd[1], dd[2]);
      const uu = s.u || [0, 1, 0]; v.push(uu[0], uu[1], uu[2]);
      v.push(s.ft, s.fy);
    });
    return v;
  }
  function unflat(v, tmpl) {
    const p = {}; let i = 0;
    KEYS.forEach(([k, n]) => { if (n === 1) p[k] = v[i++]; else { p[k] = v.slice(i, i + n); i += n; } });
    IKK.forEach(k => {
      if (!tmpl[k]) return;
      const t = [v[i], v[i + 1], v[i + 2]], pp = [v[i + 3], v[i + 4], v[i + 5]], dd = [v[i + 6], v[i + 7], v[i + 8]], uu = [v[i + 9], v[i + 10], v[i + 11]];
      p[k] = { t, p: tmpl[k].p ? pp : null, d: tmpl[k].d ? dd : null, u: tmpl[k].u ? uu : null, ft: v[i + 12], fy: v[i + 13], rel: tmpl[k].rel };
      i += 14;
    });
    return p;
  }
  function prep(def) {
    if (def._pr) return def._pr;
    const kfs = def.kf.map(k => ({ p: fill(k.p), d: k.d || 700, h: k.h || 0, a: k.a === undefined ? 0.6 : k.a }));
    const ikSet = IKK.filter(k => kfs[0].p[k]).join();
    kfs.forEach((k, i) => {
      if (IKK.filter(x => k.p[x]).join() !== ikSet) throw new Error('IK mismatch in keyframe ' + i);
      k.v = flat(k.p);
    });
    const total = kfs.reduce((s, k) => s + k.d + k.h, 0);
    def._pr = { def, kfs, total, tmpl: kfs[0].p };
    return def._pr;
  }
  function sample(pr, ms) {
    const { kfs, total } = pr;
    const n = kfs.length;
    if (n === 1) return { p: unflat(kfs[0].v, pr.tmpl), a: kfs[0].a, i: 0, k: 0 };
    let t = ((ms % total) + total) % total, i = 0;
    while (true) {
      const k = kfs[i];
      if (t < k.h) return { p: unflat(k.v, pr.tmpl), a: k.a, i, k: 0 };
      t -= k.h;
      if (t < k.d || i === n - 1) break;
      t -= k.d; i++;
    }
    const raw = clamp(t / kfs[i].d, 0, 1);
    const j = (i + 1) % n;
    const A = kfs[i].v, Bv = kfs[j].v;
    let v;
    if (pr.def.ease === 'cr') {
      const P = kfs[(i - 1 + n) % n].v, Q = kfs[(j + 1) % n].v;
      const t2 = raw * raw, t3 = t2 * raw;
      v = A.map((a, q) => 0.5 * ((2 * a) + (-P[q] + Bv[q]) * raw + (2 * P[q] - 5 * a + 4 * Bv[q] - Q[q]) * t2 + (-P[q] + 3 * a - 3 * Bv[q] + Q[q]) * t3));
    } else {
      const k = pr.def.ease === 'lin' ? raw : 0.5 - 0.5 * Math.cos(Math.PI * raw);
      v = A.map((a, q) => a + (Bv[q] - a) * k);
    }
    const kk = 0.5 - 0.5 * Math.cos(Math.PI * raw);
    return { p: unflat(v, pr.tmpl), a: lerp(kfs[i].a, kfs[j].a, kk), i, k: raw };
  }

  /* ---------- model: 3D geometry for one pose ---------- */
  function ring(c, F, a, b) {
    const pts = [];
    for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6; pts.push(add(c, mv(F, [a * Math.cos(t), 0, b * Math.sin(t)]))); }
    return pts;
  }
  const HEADPTS = (() => {
    const pts = [], hair = [];
    for (let i = 0; i <= 8; i++) {
      const la = -Math.PI / 2 + Math.PI * i / 8;
      for (let j = 0; j < 14; j++) {
        const lo = j * 2 * Math.PI / 14;
        const q = [HEAD.a * Math.cos(la) * Math.sin(lo), HEAD.b * Math.sin(la), HEAD.c * Math.cos(la) * Math.cos(lo)];
        if (i === 0 || i === 8) { if (j) continue; }
        // jaw: narrower at the bottom front
        if (q[1] < -4) { q[0] *= 0.86; }
        pts.push(q);
        const top = q[1] > 2.2 || (q[2] < -2.5 && q[1] > -5.5);
        if (top) hair.push(mul(q, 1.05));
      }
    }
    return { pts, hair };
  })();
  // skin below the hairline on the front of the head, drawn over the hair where it faces the camera
  const FACEPTS = (() => {
    const out = [];
    for (let i = 0; i <= 8; i++) {
      const la = (-76 + i * 11) * D2R;
      for (let j = 0; j <= 10; j++) {
        const lo = (-86 + j * 17.2) * D2R;
        const q = [HEAD.a * Math.cos(la) * Math.sin(lo), HEAD.b * Math.sin(la), HEAD.c * Math.cos(la) * Math.cos(lo)];
        if (q[1] < -4) q[0] *= 0.86;
        out.push(q);
      }
    }
    return out;
  })();

  const MUS = {
    abs: [['loft', 2, 3, [0, 0, 1], 0, 1.05, 0.55]],
    obliques: [['loft', 2, 3, [1, 0, 0.25], 0, 0.9, 0.5], ['loft', 2, 3, [-1, 0, 0.25], 0, 0.9, 0.5]],
    glutes: [['loft', 0, 1, [0.45, 0, -1], 0, 0.95, 0.42], ['loft', 0, 1, [-0.45, 0, -1], 0, 0.95, 0.42]],
    erectors: [['loft', 2, 3, [0.3, 0, -1], 0, 1.1, 0.25], ['loft', 2, 3, [-0.3, 0, -1], 0, 1.1, 0.25]],
    lats: [['loft', 3, 5, [0.85, 0, -0.55], 0, 1.0, 0.36], ['loft', 3, 5, [-0.85, 0, -0.55], 0, 1.0, 0.36]],
    rhomboids: [['loft', 4, 5, [0.3, 0, -1], 0, 0.9, 0.3], ['loft', 4, 5, [-0.3, 0, -1], 0, 0.9, 0.3]],
    traps: [['loft', 5, 6, [0.45, 0, -1], 0, 0.95, 0.42], ['loft', 5, 6, [-0.45, 0, -1], 0, 0.95, 0.42]],
    chest: [['loft', 4, 5, [0.42, 0, 1], 0, 0.85, 0.4], ['loft', 4, 5, [-0.42, 0, 1], 0, 0.85, 0.4]],
    serratus: [['loft', 3, 4, [1, 0, 0.35], 0, 0.9, 0.3], ['loft', 3, 4, [-1, 0, 0.35], 0, 0.9, 0.3]],
    hipflex: [['seg', 'thL', [0, 0, 1], 0.12, 0.3, 0.75], ['seg', 'thR', [0, 0, 1], 0.12, 0.3, 0.75]],
    quads: [['seg', 'thL', [0, 0, 1], 0.55, 0.42, 0.8], ['seg', 'thR', [0, 0, 1], 0.55, 0.42, 0.8]],
    hams: [['seg', 'thL', [0, 0, -1], 0.55, 0.42, 0.8], ['seg', 'thR', [0, 0, -1], 0.55, 0.42, 0.8]],
    adductors: [['seg', 'thL', [-1, 0, 0.1], 0.35, 0.36, 0.7], ['seg', 'thR', [1, 0, 0.1], 0.35, 0.36, 0.7]],
    abductors: [['seg', 'thL', [1, 0, 0], 0.18, 0.28, 0.8], ['seg', 'thR', [-1, 0, 0], 0.18, 0.28, 0.8]],
    calves: [['seg', 'shL', [0, 0, -1], 0.32, 0.36, 0.95], ['seg', 'shR', [0, 0, -1], 0.32, 0.36, 0.95]],
    tibialis: [['seg', 'shL', [0.3, 0, 1], 0.35, 0.34, 0.7], ['seg', 'shR', [-0.3, 0, 1], 0.35, 0.34, 0.7]],
    delts: [['sph', 'SL'], ['sph', 'SR']],
    rearDelts: [['sphb', 'SL'], ['sphb', 'SR']],
    biceps: [['seg', 'uaL', [0, 0, 1], 0.55, 0.42, 0.8], ['seg', 'uaR', [0, 0, 1], 0.55, 0.42, 0.8]],
    triceps: [['seg', 'uaL', [0, 0, -1], 0.55, 0.42, 0.8], ['seg', 'uaR', [0, 0, -1], 0.55, 0.42, 0.8]],
    forearms: [['seg', 'faL', [0, 0, 1], 0.35, 0.4, 0.8], ['seg', 'faR', [0, 0, 1], 0.35, 0.4, 0.8]],
    rotator: [['loft', 5, 6, [0.78, 0, -0.62], 0, 0.7, 0.32], ['loft', 5, 6, [-0.78, 0, -0.62], 0, 0.7, 0.32]],
    neckFlex: [['neck', [0, 0, 1]]],
    neckExt: [['neck', [0, 0, -1]]],
    neckSide: [['neck', [1, 0, 0]], ['neck', [-1, 0, 0]]],
    pelvicFloor: [['pf']],
    feet: [['foot', 'L'], ['foot', 'R']]
  };

  function buildModel(p, def) {
    const sk = solve(p);
    const parts = [];
    const lv = LEVELS.map(([base, fr, off, a, b]) => {
      const F = sk[fr], c = add(sk[base], mv(F, off));
      return { c, F, a, b, pts: ring(c, F, a, b) };
    });
    sk.lv = lv;
    for (let i = 0; i < lv.length - 1; i++) parts.push({ k: 'loft', A: lv[i], B: lv[i + 1], col: i === 0 ? 'bottom' : 'top', id: 'loft' + i });
    // neck
    const neckA = add(sk.C7, mv(sk.Ft, [0, -2, -0.5])), neckB = add(sk.HB, mv(sk.Fh, [0, 1.5, 0.5]));
    parts.push({ k: 'cap', a: neckA, b: neckB, ra: RAD.neck, rb: RAD.neck * 0.92, col: 'skin', id: 'neck', zb: 5 });
    parts.push({ k: 'head', c: sk.HC, F: sk.Fh, id: 'head' });
    if (BODY.sex === 'f') parts.push({ k: 'cap', a: add(sk.HC, mv(sk.Fh, [0, 4, -9.5])), b: add(sk.HC, mv(sk.Fh, [0, -7.5, -13.5])), ra: 3.8, rb: 2.2, col: 'hair', id: 'pony' });
    ['L', 'R'].forEach(s => {
      parts.push({ k: 'sph', c: sk['S' + s], r: RAD.delt, col: 'skin', id: 'delt' + s, zb: -1 });
      parts.push({ k: 'cap', a: sk['S' + s], b: sk['E' + s], ra: RAD.ua[0], rb: RAD.ua[1], col: 'skin', id: 'ua' + s, F: sk['Fu' + s] });
      parts.push({ k: 'cap', a: sk['E' + s], b: sk['W' + s], ra: RAD.fa[0], rb: RAD.fa[1], col: 'skin', id: 'fa' + s, F: sk['Ff' + s] });
      parts.push({ k: 'cap', a: sk['W' + s], b: sk['T' + s], ra: RAD.hand[0], rb: RAD.hand[1], col: 'skin', id: 'hand' + s });
      const thA = sk['H' + s], thB = sk['K' + s];
      parts.push({ k: 'cap', a: thA, b: thB, ra: RAD.th[0], rb: RAD.th[1], col: 'skin', id: 'th' + s, F: sk['Fth' + s], shorts: true });
      parts.push({ k: 'cap', a: sk['K' + s], b: sk['A' + s], ra: RAD.sn[0], rb: RAD.sn[1], col: 'skin', id: 'sh' + s, F: sk['Fsh' + s], knee: true });
      parts.push({ k: 'cap', a: sk['Heel' + s], b: sk['Toe' + s], ra: RAD.foot[0], rb: RAD.foot[1], col: 'skin', id: 'foot' + s, ankle: sk['A' + s] });
    });
    // muscles
    const mus = [];
    (def.m || []).forEach(name => {
      (MUS[name] || []).forEach(spec => {
        const t = spec[0];
        if (t === 'loft') {
          const A = lv[spec[1]], Bl = lv[spec[2]];
          const dl = norm(spec[3]);
          const pa = add(A.c, mv(A.F, [A.a * dl[0], 0, A.b * dl[2]]));
          const pb = add(Bl.c, mv(Bl.F, [Bl.a * dl[0], 0, Bl.b * dl[2]]));
          const c = mul(add(pa, pb), 0.5);
          const nrm = norm(mv(A.F, [dl[0] / A.a * 10, 0, dl[2] / A.b * 10]));
          mus.push({ nm: name, c, ax: norm(sub(pb, pa)), n: nrm, l: len(sub(pb, pa)) * 0.5 * spec[5], w: ((A.a + A.b) * 0.5) * spec[6] * 0.55, part: 'loft' + (spec[2] - 1) });
        } else if (t === 'seg') {
          const id = spec[1];
          const s = id.slice(-1);
          const map = { th: ['H', 'K', 'Fth', RAD.th], sh: ['K', 'A', 'Fsh', RAD.sn], ua: ['S', 'E', 'Fu', RAD.ua], fa: ['E', 'W', 'Ff', RAD.fa] }[id.slice(0, 2)];
          const a = sk[map[0] + s], b = sk[map[1] + s], F = sk[map[2] + s];
          const dl = norm(spec[2]);
          const nrm = norm(mv(F, [dl[0], 0, dl[2]]));
          const pos = spec[3];
          const r = lerp(map[3][0], map[3][1], pos);
          const c = add(add(a, mul(sub(b, a), pos)), mul(nrm, r * 0.8));
          const L = len(sub(b, a));
          mus.push({ nm: name, c, ax: norm(sub(b, a)), n: nrm, l: L * spec[4] * 0.5 * 1.1, w: r * spec[5], part: id });
        } else if (t === 'sph' || t === 'sphb') {
          const c0 = sk[spec[1]];
          const s = spec[1].slice(-1);
          const nrm = t === 'sph' ? norm(mv(sk.Ft, [s === 'L' ? 0.8 : -0.8, 0.3, 0.5])) : norm(mv(sk.Ft, [s === 'L' ? 0.6 : -0.6, 0.2, -0.8]));
          mus.push({ nm: name, c: add(c0, mul(nrm, RAD.delt * 0.7)), ax: norm(mv(sk.Ft, [0, 1, 0])), n: nrm, l: 5.2, w: 4.2, part: 'delt' + s });
        } else if (t === 'neck') {
          const dl = spec[1];
          const nrm = norm(mv(sk.Fn, dl));
          const c = add(mul(add(sk.C7, sk.HB), 0.5), mul(nrm, RAD.neck * 0.75));
          mus.push({ nm: name, c, ax: norm(sub(sk.HB, sk.C7)), n: nrm, l: 5.5, w: 3.4, part: 'neck' });
        } else if (t === 'pf') {
          const c = add(sk.P0, mv(sk.Fp, [0, -8, -2]));
          mus.push({ nm: name, c, ax: norm(mv(sk.Fp, [0, 0, 1])), n: norm(mv(sk.Fp, [0, -1, 0.3])), l: 6, w: 4, part: 'loft0', always: true });
        } else if (t === 'foot') {
          const s = spec[1];
          const a = sk['Heel' + s], b = sk['Toe' + s];
          mus.push({ nm: name, c: mul(add(a, b), 0.5), ax: norm(sub(b, a)), n: [0, -1, 0], l: 8, w: 3, part: 'foot' + s, always: true });
        }
      });
    });
    return { sk, parts, mus };
  }

  /* ---------- props ---------- */
  function propParts(def, sk) {
    const out = [];
    (def.props || []).forEach(pp => {
      switch (pp.t) {
        case 'wall': { // plane x = pp.x (side wall) or z = pp.z (wall in front/behind)
          const h = pp.h || 200, w = pp.w || 120;
          let q;
          if (pp.z !== undefined) { const cx = pp.cx || 0; q = [[cx - w / 2, 0, pp.z], [cx + w / 2, 0, pp.z], [cx + w / 2, h, pp.z], [cx - w / 2, h, pp.z]]; }
          else { const cz = pp.cz || 0; q = [[pp.x, 0, cz - w / 2], [pp.x, 0, cz + w / 2], [pp.x, h, cz + w / 2], [pp.x, h, cz - w / 2]]; }
          out.push({ k: 'quad', pts: q, col: 'wall', id: 'wall', zb: 40 });
          break;
        }
        case 'bar': {
          const y = pp.y || 228, z = pp.z || 0, w = pp.w || 110;
          out.push({ k: 'cap', a: [-w / 2, y, z], b: [w / 2, y, z], ra: 1.8, rb: 1.8, col: 'metal', id: 'bar' });
          if (pp.posts !== false) {
            out.push({ k: 'cap', a: [-w / 2, y, z], b: [-w / 2, y + 30, z], ra: 1.6, rb: 1.6, col: 'metal', id: 'barpL' });
            out.push({ k: 'cap', a: [w / 2, y, z], b: [w / 2, y + 30, z], ra: 1.6, rb: 1.6, col: 'metal', id: 'barpR' });
          }
          break;
        }
        case 'bench': {
          const x0 = pp.x0 !== undefined ? pp.x0 : -20, x1 = pp.x1 !== undefined ? pp.x1 : 20, z0 = pp.z0, z1 = pp.z1, h = pp.h || 45;
          out.push({ k: 'box', min: [x0, 0, z0], max: [x1, h, z1], col: 'prop', id: 'bench' });
          break;
        }
        case 'box': out.push({ k: 'box', min: pp.min, max: pp.max, col: 'prop', id: 'box' }); break;
        case 'roller': {
          const a = pp.a, b = pp.b, r = pp.r || 7.5;
          out.push({ k: 'cap', a, b, ra: r, rb: r, col: 'roller', id: 'roller', flat: true });
          break;
        }
        case 'ball': {
          const s = pp.foot || 'L';
          const c = add(sk['A' + s], [0, -9, 4]);
          out.push({ k: 'sph', c: pp.c || c, r: pp.r || 3.4, col: 'accent', id: 'ball' });
          break;
        }
        case 'kb': {
          (pp.hand === 'both' ? ['L', 'R'] : [pp.hand || 'L']).forEach(s => {
            const W = sk['W' + s], T = sk['T' + s];
            const dn = norm(sub(T, W));
            const c = add(add(W, mul(dn, 9)), mul(pp.off || [0, -9, 0], 1));
            out.push({ k: 'sph', c, r: pp.r || 8, col: 'kb', id: 'kb' + s });
          });
          break;
        }
        case 'kb2h': { // one kettlebell held with both hands
          const c = add(mul(add(sk.TL, sk.TR), 0.5), pp.off || [0, -8, 0]);
          out.push({ k: 'sph', c, r: pp.r || 9, col: 'kb', id: 'kb2h' });
          break;
        }
        case 'db': { // dumbbell in a hand
          (pp.hand === 'both' ? ['L', 'R'] : [pp.hand || 'L']).forEach(s => {
            const c = mul(add(sk['W' + s], sk['T' + s]), 0.5);
            const ax = norm(mv(sk.Fp, [1, 0, 0]));
            out.push({ k: 'cap', a: add(c, mul(ax, -9)), b: add(c, mul(ax, 9)), ra: 4.2, rb: 4.2, col: 'kb', id: 'db' + s });
          });
          break;
        }
        case 'band': {
          const ends = pp.to === 'hands' ? [sk.TL, sk.TR] : pp.to === 'between' ? null : [sk[pp.to || 'TL']];
          if (pp.to === 'between') out.push({ k: 'line', pts: [mul(add(sk.WL, sk.TL), 0.5), mul(add(sk.WR, sk.TR), 0.5)], col: 'band', w: 1.6, id: 'band' });
          else ends.forEach((e, i) => out.push({ k: 'line', pts: [pp.from, mul(add(e, sk[i ? 'WR' : 'WL']), 0.5)], col: 'band', w: 1.4, id: 'band' + i }));
          if (pp.from) out.push({ k: 'sph', c: pp.from, r: 2.2, col: 'metal', id: 'anchor' });
          break;
        }
        case 'rings': {
          ['L', 'R'].forEach(s => {
            const W = sk['W' + s], T = sk['T' + s];
            const g = mul(add(W, T), 0.5);
            out.push({ k: 'line', pts: [[g[0], pp.top || 260, g[2]], g], col: 'strap', w: 1.2, id: 'strap' + s });
            out.push({ k: 'sph', c: g, r: 4.5, col: 'ring', id: 'ring' + s, ringShape: true });
          });
          break;
        }
        case 'rope': { // jump rope: arc between hands; phase from sk.ropePhase
          out.push({ k: 'rope', a: sk.TL, b: sk.TR, ph: sk.ph || 0, col: 'band', id: 'rope' });
          break;
        }
        case 'pack': {
          const F = sk.Ft, c = add(sk.L1, mv(F, [0, 13, -17]));
          out.push({ k: 'boxF', c, F, h: [14, 18, 7], col: 'pack', id: 'pack' });
          break;
        }
        case 'stick': {
          const a = add(sk.HC, mv(sk.Fh, [0, 2, -12])), b = add(sk.P0, mv(sk.Fp, [0, -4, -13]));
          const d = norm(sub(a, b));
          out.push({ k: 'cap', a: add(b, mul(d, -10)), b: add(a, mul(d, 12)), ra: 1.3, rb: 1.3, col: 'wood', id: 'stick' });
          break;
        }
        case 'wheel': {
          const c = mul(add(sk.TL, sk.TR), 0.5);
          out.push({ k: 'wheel', c: [c[0], 9, c[2]], r: 9, col: 'kb', id: 'wheel' });
          break;
        }
        case 'chair': {
          const z = pp.z || -20, h = pp.h || 46;
          out.push({ k: 'box', min: [-22, h - 4, z - 22], max: [22, h, z + 20], col: 'prop', id: 'seat' });
          out.push({ k: 'box', min: [-22, h, z - 24], max: [22, h + 42, z - 20], col: 'prop', id: 'back' });
          [[-20, -20], [18, -20], [-20, 18], [18, 18]].forEach(([x, dz], i) => out.push({ k: 'box', min: [x, 0, z + dz], max: [x + 3, h - 4, z + dz + 3], col: 'prop', id: 'leg' + i }));
          break;
        }
        case 'step': out.push({ k: 'box', min: pp.min, max: pp.max, col: 'prop', id: 'step' }); break;
        case 'miniband': {
          const a = pp.at === 'ankles' ? [sk.AL, sk.AR] : [add(sk.KL, mul(sub(sk.HL, sk.KL), 0.15)), add(sk.KR, mul(sub(sk.HR, sk.KR), 0.15))];
          out.push({ k: 'line', pts: a, col: 'band', w: 2.2, id: 'miniband' });
          break;
        }
        default: break;
      }
    });
    return out;
  }

  /* ---------- colour helpers ---------- */
  const hexRgb = h => {
    h = String(h || '#888').trim();
    if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    const n = parseInt(h.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const css = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const shade = (c, f) => f >= 0 ? c.map(v => v + (255 - v) * f) : c.map(v => v * (1 + f));
  const scale = (c, f) => c.map(v => clamp(v * f, 0, 255));

  const PAL_DEFAULT = { skin: '#E3BB9C', top: '#2C7BC0', bottom: '#2A3036', hair: '#2B2420', glow: '#FF4F45', shadow: '#000000', floor: '#DDE5E1', mat: '#9FC3B6', wall: '#E9EEEC', metal: '#7D8A93', prop: '#B9A58C', kb: '#30363C', band: '#E2477F', roller: '#5D9FD0', accent: '#F2B21B', strap: '#4B5258', ring: '#B48A57', pack: '#46505A', wood: '#C29A66', line: '#8FA39B', bg: '#F4F7F5', dark: 0 };
  function readPalette(el) {
    const pal = Object.assign({}, PAL_DEFAULT);
    try {
      const cs = getComputedStyle(el || document.documentElement);
      Object.keys(PAL_DEFAULT).forEach(k => {
        const v = cs.getPropertyValue('--fig-' + k).trim();
        if (v) pal[k] = k === 'dark' ? Number(v) : v;
      });
    } catch (e) { }
    return pal;
  }
  function palRGB(pal) { const o = {}; Object.keys(pal).forEach(k => { o[k] = k === 'dark' ? pal[k] : hexRgb(pal[k]); }); return o; }

  /* ---------- camera ---------- */
  function camera(yaw, pitch, center, D) {
    const th = yaw * D2R, ph = pitch * D2R;
    const off = [Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)];
    const pos = add(center, mul(off, D));
    const f = mul(off, -1);
    const r = norm(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    return { pos, f, r, u, D, center };
  }
  function proj(cam, view, p) {
    const d = sub(p, cam.pos);
    const zc = dot(d, cam.f);
    const k = cam.D / Math.max(zc, 1);
    return [view.cx + view.s * dot(d, cam.r) * k, view.cy - view.s * dot(d, cam.u) * k, zc];
  }

  /* ---------- 2D geometry ---------- */
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  function capsule2(a, b, ra, rb) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < Math.abs(ra - rb) + 0.05) return circle2(ra > rb ? a : b, Math.max(ra, rb));
    const th = Math.atan2(dy, dx), be = Math.asin(clamp((ra - rb) / d, -1, 1));
    const pts = [], n = 10;
    const a0 = th + Math.PI / 2 - be, a1 = th + 3 * Math.PI / 2 + be;
    for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; pts.push([a[0] + ra * Math.cos(t), a[1] + ra * Math.sin(t)]); }
    const b0 = th - Math.PI / 2 + be, b1 = th + Math.PI / 2 - be;
    for (let i = 0; i <= n; i++) { const t = b0 + (b1 - b0) * i / n; pts.push([b[0] + rb * Math.cos(t), b[1] + rb * Math.sin(t)]); }
    return pts;
  }
  function circle2(c, r, n) { const pts = []; n = n || 18; for (let i = 0; i < n; i++) { const t = i * 2 * Math.PI / n; pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); } return pts; }
  function pathPoly(ctx, pts) { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }
  const LIGHT = (() => { const l = Math.hypot(-0.55, -0.85); return [-0.55 / l, -0.85 / l]; })();
  function fillShaded(ctx, pts, c, axis, base, outline, lw) {
    pathPoly(ctx, pts);
    let n = axis ? [-axis[1], axis[0]] : [LIGHT[0], LIGHT[1]];
    const nl = Math.hypot(n[0], n[1]) || 1; n = [n[0] / nl, n[1] / nl];
    if (n[0] * LIGHT[0] + n[1] * LIGHT[1] < 0) n = [-n[0], -n[1]];
    let ext = 1;
    for (const q of pts) { const e = Math.abs((q[0] - c[0]) * n[0] + (q[1] - c[1]) * n[1]); if (e > ext) ext = e; }
    const g = ctx.createLinearGradient(c[0] + n[0] * ext, c[1] + n[1] * ext, c[0] - n[0] * ext, c[1] - n[1] * ext);
    g.addColorStop(0, css(shade(base, 0.2)));
    g.addColorStop(0.42, css(base));
    g.addColorStop(1, css(shade(base, -0.26)));
    ctx.fillStyle = g;
    ctx.fill();
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke(); }
  }

  /* ---------- rendering ---------- */
  function drawScene(ctx, W, H, model, extra, cam, view, P, opts) {
    const pr = q => proj(cam, view, q);
    const lw = Math.max(0.8, view.s * 0.55);
    const zMid = dot(sub(model.sk.P0, cam.pos), cam.f);
    const tint = (c, z) => scale(c, clamp(1 + (zMid - z) / 260, 0.84, 1.06));
    const toCam = q => norm(sub(cam.pos, q));
    // floor
    const fc = [model.sk.P0[0], 0, model.sk.P0[2]];
    if (!opts.noFloor) {
      const fr = 115;
      const ell = [];
      for (let i = 0; i < 40; i++) { const t = i * Math.PI / 20; ell.push(pr([fc[0] + fr * Math.cos(t), 0, fc[2] + fr * 0.75 * Math.sin(t)])); }
      const cc = pr(fc);
      const g = ctx.createRadialGradient(cc[0], cc[1], 0, cc[0], cc[1], view.s * fr * 1.05);
      g.addColorStop(0, css(P.floor, 0.95)); g.addColorStop(0.65, css(P.floor, 0.55)); g.addColorStop(1, css(P.floor, 0));
      pathPoly(ctx, ell); ctx.fillStyle = g; ctx.fill();
    }
    if (opts.mat) {
      const m = opts.mat;
      const q = [[m.x0, 0.3, m.z0], [m.x1, 0.3, m.z0], [m.x1, 0.3, m.z1], [m.x0, 0.3, m.z1]].map(pr);
      pathPoly(ctx, q); ctx.fillStyle = css(P.mat, 0.85); ctx.fill();
      ctx.strokeStyle = css(shade(P.mat, -0.25), 0.7); ctx.lineWidth = lw; ctx.stroke();
    }
    // shadow: blurred footprint of the body projected straight down
    const sk = model.sk;
    const fp = [];
    let hsum = 0, hn = 0;
    const addFp = (q, r) => { const h = Math.max(0, q[1] - r); hsum += h; hn++; const c = pr([q[0], 0, q[2]]); const rr = r * view.s; for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; fp.push([c[0] + rr * Math.cos(t), c[1] + rr * 0.5 * Math.sin(t)]); } };
    ['L', 'R'].forEach(k => { addFp(sk['Heel' + k], 4); addFp(sk['Toe' + k], 4); addFp(sk['K' + k], 6); addFp(sk['T' + k], 3); addFp(sk['E' + k], 4); });
    sk.lv.forEach(l => addFp(l.c, (l.a + l.b) * 0.5));
    addFp(sk.HC, 9);
    if (fp.length > 2) {
      const hl = hull(fp);
      const avgH = hsum / Math.max(1, hn);
      const a = (P.dark ? 0.55 : 0.28) * clamp(1 - avgH / 160, 0.25, 1);
      ctx.save();
      ctx.shadowColor = css(P.shadow, a);
      ctx.shadowBlur = Math.max(4, view.s * 7);
      ctx.shadowOffsetX = 10000;
      ctx.translate(-10000, 0);
      pathPoly(ctx, hl); ctx.fillStyle = '#000'; ctx.fill();
      ctx.restore();
    }
    // trail
    if (opts.trail && opts.trail.length > 2) {
      ctx.save(); ctx.setLineDash([view.s * 2.4, view.s * 3.2]); ctx.lineWidth = Math.max(1, view.s * 0.9);
      ctx.strokeStyle = css(P.glow, 0.55); ctx.beginPath();
      opts.trail.forEach((q, i) => { const s2 = pr(q); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); });
      ctx.stroke(); ctx.restore();
    }
    // collect drawables
    const items = [];
    const all = model.parts.concat(extra);
    all.forEach(pt => {
      let z, draw;
      const col = P[pt.col] || P.skin;
      if (pt.k === 'cap') {
        const a = pr(pt.a), b = pr(pt.b);
        z = (a[2] + b[2]) / 2 + (pt.zb || 0);
        draw = () => {
          const ra = pt.ra * view.s * cam.D / a[2], rb = pt.rb * view.s * cam.D / b[2];
          const c2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const base = tint(col, z);
          const ax = [b[0] - a[0], b[1] - a[1]];
          fillShaded(ctx, capsule2(a, b, ra, rb), c2, ax, base, css(shade(base, -0.42), 0.38), lw);
          if (pt.shorts) {
            const m3 = add(pt.a, mul(sub(pt.b, pt.a), 0.36)), m = pr(m3);
            const bb = tint(P.bottom, z);
            fillShaded(ctx, capsule2(a, m, ra * 1.07, lerp(ra, rb, 0.36) * 1.08), [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2], ax, bb, css(shade(bb, -0.5), 0.6), lw);
          }
          if (pt.knee) {
            const kc = a, kr = RAD.knee * view.s * cam.D / a[2];
            fillShaded(ctx, circle2(kc, kr), kc, null, tint(P.skin, z), null, 0);
          }
          if (pt.ankle) {
            const ac = pr(pt.ankle), ar = RAD.ankle * view.s * cam.D / ac[2];
            fillShaded(ctx, circle2(ac, ar), ac, null, tint(P.skin, z), null, 0);
          }
          if (pt.flat) { ctx.strokeStyle = css(shade(base, 0.3), 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        };
      } else if (pt.k === 'sph') {
        const c = pr(pt.c);
        z = c[2] + (pt.zb || 0);
        draw = () => {
          const r = pt.r * view.s * cam.D / c[2];
          const base = tint(col, z);
          if (pt.ringShape) { ctx.strokeStyle = css(base); ctx.lineWidth = Math.max(1.4, view.s * 1.6); ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 7); ctx.stroke(); return; }
          const g = ctx.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
          g.addColorStop(0, css(shade(base, 0.25))); g.addColorStop(0.55, css(base)); g.addColorStop(1, css(shade(base, -0.3)));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 7); ctx.fill();
          if (pt.id.startsWith('kb')) { // kettlebell handle
            ctx.strokeStyle = css(base); ctx.lineWidth = Math.max(1.2, view.s * 1.6);
            ctx.beginPath(); ctx.arc(c[0], c[1] - r * 0.9, r * 0.55, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
          }
        };
      } else if (pt.k === 'loft') {
        const ca = pr(pt.A.c), cb = pr(pt.B.c);
        z = (ca[2] + cb[2]) / 2;
        draw = () => {
          const pts = pt.A.pts.concat(pt.B.pts).map(q => { const s2 = pr(q); return [s2[0], s2[1]]; });
          const base = tint(col, z);
          fillShaded(ctx, hull(pts), [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2], [cb[0] - ca[0], cb[1] - ca[1]], base, null, 0);
        };
      } else if (pt.k === 'head') {
        const c = pr(pt.c);
        z = c[2];
        draw = () => {
          const pts = HEADPTS.pts.map(q => { const s2 = pr(add(pt.c, mv(pt.F, q))); return [s2[0], s2[1]]; });
          const base = tint(P.skin, z);
          fillShaded(ctx, hull(pts), [c[0], c[1]], null, base, css(shade(base, -0.45), 0.55), lw);
          const tc = toCam(pt.c);
          const vis = v => dot(norm(mv(pt.F, v)), tc);
          // ear
          [1, -1].forEach(s => {
            if (vis([s, 0, 0]) > 0.2) {
              const e = pr(add(pt.c, mv(pt.F, [s * HEAD.a * 0.97, -0.8, -1.2])));
              ctx.fillStyle = css(shade(base, -0.12)); ctx.beginPath(); ctx.ellipse(e[0], e[1], view.s * 1.7, view.s * 2.6, 0, 0, 7); ctx.fill();
            }
          });
          // hair
          const hp = HEADPTS.hair.map(q => { const s2 = pr(add(pt.c, mv(pt.F, q))); return [s2[0], s2[1]]; });
          const hcol = tint(P.hair, z);
          fillShaded(ctx, hull(hp), [c[0], c[1]], null, hcol, null, 0);
          const fp = [];
          FACEPTS.forEach(q => {
            const nq = [q[0] / (HEAD.a * HEAD.a), q[1] / (HEAD.b * HEAD.b), q[2] / (HEAD.c * HEAD.c)];
            if (dot(norm(mv(pt.F, nq)), tc) <= 0.03) return;
            const s2 = pr(add(pt.c, mv(pt.F, q))); fp.push([s2[0], s2[1]]);
          });
          if (fp.length >= 3) fillShaded(ctx, hull(fp), [c[0], c[1]], null, base, null, 0);
          // face
          if (vis([0, 0, 1]) > -0.35) {
            const n = pr(add(pt.c, mv(pt.F, [0, -1.6, HEAD.c * 1.06])));
            ctx.fillStyle = css(shade(base, -0.1)); ctx.beginPath(); ctx.arc(n[0], n[1], view.s * 1.5, 0, 7); ctx.fill();
            [1, -1].forEach(s => {
              if (vis([s * 0.45, 0, 0.9]) > 0.15) {
                const e = pr(add(pt.c, mv(pt.F, [s * 3.3, 1.6, HEAD.c * 0.9])));
                ctx.fillStyle = css(shade(P.hair, 0.05), 0.9); ctx.beginPath(); ctx.arc(e[0], e[1], view.s * 0.85, 0, 7); ctx.fill();
              }
            });
          }
        };
      } else if (pt.k === 'quad') {
        const q = pt.pts.map(pr);
        z = q.reduce((s, v) => s + v[2], 0) / q.length + (pt.zb || 0);
        draw = () => { pathPoly(ctx, q); ctx.fillStyle = css(col, 0.9); ctx.fill(); ctx.strokeStyle = css(shade(col, -0.2)); ctx.lineWidth = lw; ctx.stroke(); };
      } else if (pt.k === 'box' || pt.k === 'boxF') {
        let corners;
        if (pt.k === 'box') {
          const a = pt.min, b = pt.max;
          corners = [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], b[2]]];
        } else {
          const h = pt.h;
          corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(s => add(pt.c, mv(pt.F, [s[0] * h[0] / 2, s[1] * h[1] / 2, s[2] * h[2] / 2])));
        }
        const q = corners.map(pr);
        z = q.reduce((s, v) => s + v[2], 0) / 8 + 2;
        draw = () => {
          const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
          const shades = [-0.12, -0.12, -0.3, 0.12, -0.2, -0.2];
          faces.map((f, i) => ({ f, i, z: f.reduce((s, k) => s + q[k][2], 0) / 4 })).sort((x, y) => y.z - x.z).forEach(({ f, i }) => {
            pathPoly(ctx, f.map(k => q[k])); ctx.fillStyle = css(shade(col, shades[i])); ctx.fill();
            ctx.strokeStyle = css(shade(col, -0.35), 0.6); ctx.lineWidth = lw; ctx.stroke();
          });
        };
      } else if (pt.k === 'line') {
        const q = pt.pts.map(pr);
        z = (q[0][2] + q[1][2]) / 2;
        draw = () => { ctx.strokeStyle = css(col); ctx.lineWidth = Math.max(1, view.s * pt.w); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); };
      } else if (pt.k === 'rope') {
        const a = pt.a, b = pt.b, mid = mul(add(a, b), 0.5);
        const ph = pt.ph * Math.PI * 2;
        const dn = [0, -1, 0], fw = [0, 0, 1];
        const r = Math.max(30, mid[1] - 2);
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16, s3 = Math.sin(Math.PI * t);
          const base = add(a, mul(sub(b, a), t));
          const off = add(mul(dn, Math.cos(ph) * r * s3), mul(fw, Math.sin(ph) * r * 0.55 * s3));
          pts.push(add(base, off));
        }
        const q = pts.map(pr);
        z = q[8][2];
        draw = () => { ctx.strokeStyle = css(col); ctx.lineWidth = Math.max(1, view.s * 0.8); ctx.beginPath(); q.forEach((s2, i) => i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1])); ctx.stroke(); };
      } else if (pt.k === 'wheel') {
        const c = pr(pt.c);
        z = c[2];
        draw = () => {
          const r = pt.r * view.s * cam.D / c[2];
          ctx.fillStyle = css(col); ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.45, r, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = css(shade(col, 0.3)); ctx.lineWidth = lw; ctx.stroke();
        };
      }
      if (draw) items.push({ z, draw, id: pt.id });
    });
    // muscles attach to parts
    const musBy = {};
    if (!opts.noMuscles) model.mus.forEach(m => { (musBy[m.part] = musBy[m.part] || []).push(m); });
    items.sort((a, b) => b.z - a.z);
    const glowA = opts.act === undefined ? 0.8 : opts.act;
    items.forEach(it => {
      it.draw();
      const ms = musBy[it.id];
      if (!ms) return;
      ms.forEach(m => {
        const v = dot(m.n, toCam(m.c));
        const vis = m.always ? 0.8 : clamp(v * 1.6 + 0.15, 0, 1);
        if (vis <= 0.02) return;
        const c = pr(m.c);
        const e = pr(add(m.c, mul(m.ax, m.l)));
        const ang = Math.atan2(e[1] - c[1], e[0] - c[0]);
        const L = Math.hypot(e[0] - c[0], e[1] - c[1]) * 1.12;
        const wv = m.w * 1.35 * view.s * cam.D / c[2] * (0.6 + 0.4 * Math.abs(v));
        const a = vis * (0.32 + 0.6 * glowA);
        ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(ang);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(L, wv));
        g.addColorStop(0, css(P.glow, a)); g.addColorStop(0.6, css(P.glow, a * 0.55)); g.addColorStop(1, css(P.glow, 0));
        ctx.scale(1, Math.max(0.15, wv / Math.max(L, 0.01)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, Math.max(L, wv), 0, 7); ctx.fill();
        ctx.restore();
      });
    });
  }

  /* ---------- per-frame model with floor handling ---------- */
  function torsoMin(sk) {
    let mn = Infinity;
    sk.lv.forEach(l => l.pts.forEach(q => { if (q[1] < mn) mn = q[1]; }));
    HEADPTS.pts.forEach(q => { const w = add(sk.HC, mv(sk.Fh, q)); if (w[1] < mn) mn = w[1]; });
    return mn;
  }
  function frameModelRaw(pr, ms, def, mod) {
    const s = sample(pr, ms);
    if (mod) mod(s, ms);
    return frameModelP(pr, ms, def, s);
  }
  /* ---------- feet on the floor: planted feet stay put, sliding steps become lifted steps ---------- */
  const CP_N = 96;
  const LOCK = { on: true };
  function contactPlan(pr, def) {
    if (pr._cp !== undefined) return pr._cp;
    pr._cp = null;
    if (def.footlock === false || def.ground === 'torso') return null;
    const rec = { L: [], R: [] };
    for (let i = 0; i < CP_N; i++) {
      const sk = frameModelRaw(pr, pr.total * i / CP_N, def).model.sk;
      ['L', 'R'].forEach(sd => { const H = sk['Heel' + sd], T = sk['Toe' + sd]; rec[sd].push({ low: Math.min(H[1] - RAD.foot[0], T[1] - RAD.foot[1]), c: [(H[0] + T[0]) / 2, (H[2] + T[2]) / 2] }); });
    }
    const plan = {};
    let any = false;
    ['L', 'R'].forEach(sd => {
      const r = rec[sd], N = CP_N;
      const at = i => r[(i + N) % N];
      const vel = i => Math.hypot(at(i + 1).c[0] - at(i - 1).c[0], at(i + 1).c[1] - at(i - 1).c[1]) / 2;
      const planted = r.map((x, i) => x.low < 1.2 && vel(i) < 0.35);
      if (!planted.some(Boolean)) return;
      const off = r.map(() => null);
      // planted runs: lock to the average spot of the run
      const visited = new Array(N).fill(false);
      for (let i = 0; i < N; i++) {
        if (!planted[i] || visited[i]) continue;
        let a = i; while (planted[(a - 1 + N) % N] && (a - 1 + N) % N !== i) a = (a - 1 + N) % N;
        const idx = []; let j = a; do { idx.push(j); visited[j] = true; j = (j + 1) % N; } while (planted[j] && j !== a);
        let mx = 0, mz = 0; idx.forEach(k => { mx += r[k].c[0]; mz += r[k].c[1]; }); mx /= idx.length; mz /= idx.length;
        idx.forEach(k => { off[k] = [mx - r[k].c[0], 0, mz - r[k].c[1]]; });
      }
      // between planted runs: blend the correction and lift a foot that would otherwise slide along the floor
      for (let i = 0; i < N; i++) {
        if (off[i] || !off[(i - 1 + N) % N]) continue;
        const idx = []; let j = i; while (!off[j % N] && idx.length < N) { idx.push(j % N); j++; }
        const o0 = off[(i - 1 + N) % N], o1 = off[j % N] || o0;
        let dist = 0; const cum = [0];
        for (let k = 1; k < idx.length; k++) { dist += Math.hypot(r[idx[k]].c[0] - r[idx[k - 1]].c[0], r[idx[k]].c[1] - r[idx[k - 1]].c[1]); cum.push(dist); }
        const low = idx.some(k => r[k].low < 1.2);
        const H = low && dist > 4 ? Math.min(9, Math.max(2.5, dist * 0.3)) : 0;
        idx.forEach((k, n) => {
          const f = idx.length > 1 ? (n + 1) / (idx.length + 1) : 0.5;
          const pg = dist > 0 ? cum[n] / dist : f;
          const lift = H ? H * Math.sin(Math.PI * pg) * (r[k].low < 3 ? 1 : 0.5) : 0;
          off[k] = [o0[0] + (o1[0] - o0[0]) * f, lift, o0[2] + (o1[2] - o0[2]) * f];
        });
      }
      const big = off.some(o => o && (Math.abs(o[0]) > 0.4 || Math.abs(o[2]) > 0.4 || o[1] > 0.4));
      if (big) { plan[sd] = off.map(o => o || [0, 0, 0]); any = true; }
    });
    pr._cp = any ? plan : null;
    // a correction that bends the knees a lot means the movement is a walk or a flow: leave it as authored
    if (pr._cp) {
      for (let i = 0; i < CP_N && pr._cp; i += 4) {
        const ms = pr.total * i / CP_N, a = frameModelRaw(pr, ms, def).model.sk, b = frameModel(pr, ms, def).model.sk;
        ['L', 'R'].forEach(sd => { if (pr._cp && len(sub(a['K' + sd], b['K' + sd])) > 12) pr._cp = null; });
      }
    }
    return pr._cp;
  }
  function frameModel(pr, ms, def, mod) {
    const r = frameModelRaw(pr, ms, def, mod);
    if (!LOCK.on) return r;
    const plan = contactPlan(pr, def);
    if (!plan) return r;
    const x = ((ms % pr.total) + pr.total) % pr.total / pr.total * CP_N;
    const i0 = Math.floor(x) % CP_N, i1 = (i0 + 1) % CP_N, f = x - Math.floor(x);
    const sk = r.model.sk, p = r.s.p;
    ['L', 'R'].forEach(sd => {
      const pl = plan[sd];
      if (!pl) return;
      const o = [0, 1, 2].map(k => pl[i0][k] + (pl[i1][k] - pl[i0][k]) * f);
      const A = sk['A' + sd];
      // the knee keeps pointing where the thigh points, so the leg never flips
      let t = [A[0] + o[0], A[1] - r.shift + o[1], A[2] + o[2]];
      // a straight leg stays straight: move the foot around the hip instead of bending the knee
      const Hp = sk['H' + sd], K = sk['K' + sd];
      const bend = Math.acos(clamp(dot(norm(sub(K, Hp)), norm(sub(A, K))), -1, 1));
      if (bend < 0.21) {
        const Hs = [Hp[0], Hp[1] - r.shift, Hp[2]], L0 = len(sub(A, Hp)), v = sub(t, Hs), Lv = len(v);
        if (Lv > 1e-3) t = add(Hs, mul(v, L0 / Lv));
      }
      const fk = {
        t,
        p: mv(sk['Fth' + sd], [0, 0, 1]),
        d: norm(sub(sk['Toe' + sd], sk['Heel' + sd])),
        u: sk['Fa' + sd] ? mv(sk['Fa' + sd], [0, 1, 0]) : [0, 1, 0],
        ft: 0, fy: 0, rel: null
      };
      p['F' + sd] = fk;
    });
    return frameModelP(pr, ms, def, r.s);
  }
  function frameModelP(pr, ms, def, s) {
    let model = buildModel(s.p, def);
    let sk = model.sk;
    let shift = 0;
    if (def.ground === 'torso') {
      const mn = torsoMin(sk);
      if (Math.abs(mn) > 0.01) { s.p.r = [s.p.r[0], s.p.r[1] - mn, s.p.r[2]]; model = buildModel(s.p, def); sk = model.sk; }
    } else if (def.floor !== false) {
      let mn = Infinity;
      const chk = (q, r) => { const v = q[1] - r; if (v < mn) mn = v; };
      sk.lv.forEach(l => l.pts.forEach(q => chk(q, 0)));
      ['L', 'R'].forEach(k => {
        chk(sk['Heel' + k], RAD.foot[0]); chk(sk['Toe' + k], RAD.foot[1]); chk(sk['K' + k], RAD.knee);
        chk(sk['T' + k], RAD.hand[1]); chk(sk['W' + k], RAD.wrist); chk(sk['E' + k], RAD.elbow);
      });
      chk(sk.HC, HEAD.b);
      shift = -mn;
    }
    if (def.lift) shift += def.lift(s) || 0;
    if (shift) {
      const seen = new Set();
      const f = q => { if (!q || seen.has(q)) return; seen.add(q); q[1] += shift; };
      Object.keys(sk).forEach(k => { const v = sk[k]; if (Array.isArray(v) && v.length === 3) f(v); });
      sk.lv.forEach(l => { f(l.c); l.pts.forEach(f); });
      model.parts.forEach(pt => { f(pt.a); f(pt.b); f(pt.c); f(pt.ankle); });
      model.mus.forEach(m => f(m.c));
    }
    sk.ph = def.ropePhase ? (ms % pr.total) / pr.total : 0;
    return { model, s, shift };
  }
  function mirrorModel(model, extra) {
    const fx = q => { q[0] = -q[0]; };
    const seen = new Set();
    const f = q => { if (!q || seen.has(q)) return; seen.add(q); fx(q); };
    const sk = model.sk;
    Object.keys(sk).forEach(k => { const v = sk[k]; if (Array.isArray(v) && v.length === 3) f(v); });
    sk.lv.forEach(l => { f(l.c); l.pts.forEach(f); });
    model.parts.forEach(pt => { ['a', 'b', 'c'].forEach(k => f(pt[k])); if (pt.ankle) f(pt.ankle); if (pt.F) pt.F = mirF(pt.F); });
    model.mus.forEach(m => { f(m.c); m.ax = [-m.ax[0], m.ax[1], m.ax[2]]; m.n = [-m.n[0], m.n[1], m.n[2]]; });
    extra.forEach(pt => { ['a', 'b', 'c'].forEach(k => f(pt[k])); if (pt.pts) pt.pts.forEach(f); if (pt.min) { const a = pt.min[0], b = pt.max[0]; pt.min = [-b, pt.min[1], pt.min[2]]; pt.max = [-a, pt.max[1], pt.max[2]]; } if (pt.F) pt.F = mirF(pt.F); });
  }
  // mirror a frame: M F M with M = diag(-1,1,1)
  const mirF = F => [F[0], -F[1], -F[2], -F[3], F[4], F[5], -F[6], F[7], F[8]];


  /* ---------- auto-fit: 3D bounding box of the whole cycle, projected per camera ---------- */
  function aabb(pr, def, mirror) {
    const N = Math.max(12, pr.kfs.length * 4);
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const put = q => { for (let i = 0; i < 3; i++) { const v = i === 0 && mirror ? -q[0] : q[i]; if (v < mn[i]) mn[i] = v; if (v > mx[i]) mx[i] = v; } };
    const focus = def.focus === 'upper' ? ['HC', 'C7', 'SL', 'SR', 'EL', 'ER', 'L1'] : def.focus === 'head' ? ['HC', 'C7', 'SL', 'SR'] : def.focus === 'legs' ? ['P0', 'KL', 'KR', 'AL', 'AR', 'ToeL', 'ToeR', 'HeelL', 'HeelR'] : def.focus;
    for (let i = 0; i < N; i++) {
      const { model } = frameModel(pr, pr.total * i / N, def);
      const sk = model.sk;
      if (focus) {
        focus.forEach(k => put(sk[k]));
        if (focus.includes('HC')) { put(add(sk.HC, [0, HEAD.b + 2, 0])); put(add(sk.HC, [HEAD.a + 2, 0, HEAD.c + 2])); put(add(sk.HC, [-HEAD.a - 2, 0, -HEAD.c - 2])); }
        if (focus.includes('ToeL')) { put(add(sk.ToeL, [0, -4, 4])); put(add(sk.HeelR, [0, -4, -4])); }
        continue;
      }
      ['HC', 'P0', 'C7'].forEach(k => put(sk[k]));
      ['L', 'R'].forEach(k => ['T', 'E', 'W', 'K', 'A', 'Toe', 'Heel', 'S'].forEach(j => put(sk[j + k])));
      put(add(sk.HC, [0, HEAD.b, 0])); put(add(sk.HC, [0, -HEAD.b, 0]));
      sk.lv.forEach(l => l.pts.forEach(put));
      if (i === 0) propParts(def, sk).forEach(pt => { if (pt.k === 'quad' || pt.k === 'line' || pt.k === 'rope') return; ['a', 'b', 'c'].forEach(k => pt[k] && put(pt[k])); if (pt.min && pt.id !== 'back' && !String(pt.id).startsWith('leg')) { put(pt.min); put(pt.max); } });
    }
    if (!focus) mn[1] = Math.min(mn[1], 0);
    else { for (let i = 0; i < 3; i++) { mn[i] -= 6; mx[i] += 6; } }
    return { mn, mx, c: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] };
  }
  function box2(bb, cam) {
    const v = { cx: 0, cy: 0, s: 1 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const q = [i & 1 ? bb.mx[0] : bb.mn[0], i & 2 ? bb.mx[1] : bb.mn[1], i & 4 ? bb.mx[2] : bb.mn[2]];
      const s2 = proj(cam, v, q);
      x0 = Math.min(x0, s2[0]); x1 = Math.max(x1, s2[0]); y0 = Math.min(y0, s2[1]); y1 = Math.max(y1, s2[1]);
    }
    return { x0, x1, y0, y1 };
  }

  /* ---------- public ---------- */
  function viewFor(box, W, H, pad) {
    const bw = Math.max(40, box.x1 - box.x0), bh = Math.max(40, box.y1 - box.y0);
    const s = Math.min(W * (1 - pad) / bw, H * (1 - pad) / bh);
    return { s, cx: W / 2 - s * (box.x0 + box.x1) / 2, cy: H / 2 - s * (box.y0 + box.y1) / 2 };
  }
  function matFor(def) {
    if (!def.mat) return null;
    if (typeof def.mat === 'object') return def.mat;
    return { x0: -32, x1: 32, z0: -95, z1: 95 };
  }
  function render(canvas, def, ms, o) {
    const pr = prep(def);
    const dpr = o.dpr || Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    const yaw = o.yaw !== undefined ? o.yaw : (def.cam && def.cam.yaw !== undefined ? def.cam.yaw : 35);
    const pitch = o.pitch !== undefined ? o.pitch : (def.cam && def.cam.pitch !== undefined ? def.cam.pitch : 10);
    const key = o.mirror ? 'm' : 'n';
    if (!pr.bb || pr.bbKey !== key) { pr.bb = aabb(pr, def, o.mirror); pr.bbKey = key; }
    const cam = camera(yaw, pitch, pr.bb.c, 900);
    const view = viewFor(box2(pr.bb, cam), W, H, o.pad === undefined ? 0.08 : o.pad);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const P = o.P || palRGB(PAL_DEFAULT);
    const { model, s } = frameModel(pr, ms, def);
    const extra = propParts(def, model.sk);
    if (o.mirror) mirrorModel(model, extra);
    let trail = null;
    if (o.trail && def.trail) {
      trail = [];
      for (let i = 0; i <= 40; i++) {
        const fm = frameModel(pr, pr.total * i / 40, def).model;
        const q = fm.sk[def.trail].slice();
        if (o.mirror) q[0] = -q[0];
        trail.push(q);
      }
    }
    const mat = matFor(def);
    let mo = null;
    if (mat) { mo = Object.assign({}, mat); if (o.mirror) { mo.x0 = -mat.x1; mo.x1 = -mat.x0; } }
    if (o.ghost) {
      const g = frameModel(pr, 0, def).model;
      if (o.mirror) mirrorModel(g, []);
      ctx.save(); ctx.globalAlpha = 0.16;
      drawScene(ctx, W, H, g, [], cam, view, P, { noFloor: true, noMuscles: true });
      ctx.restore();
    }
    drawScene(ctx, W, H, model, extra, cam, view, P, { mat: mo, trail, act: s.a, noMuscles: o.noMuscles, dpr });
    return s;
  }

  const reduceMotion = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  function mount(canvas, def, opts) {
    opts = opts || {};
    const st = { yaw: opts.yaw, pitch: opts.pitch, mirror: !!opts.mirror, speed: opts.speed || 1, playing: !opts.paused && !reduceMotion, t: opts.t0 || 0, last: 0, raf: 0, dead: false, trail: !!opts.trail, ghost: !!opts.ghost, noMuscles: !!opts.noMuscles, pending: false };
    let P = palRGB(opts.palette || readPalette(canvas));
    const pr = prep(def);
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(10, canvas.clientWidth), h = Math.max(10, canvas.clientHeight);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    }
    let lastS = null;
    function draw() {
      size();
      lastS = render(canvas, def, st.t, { yaw: cur('yaw'), pitch: cur('pitch'), mirror: st.mirror, P, trail: st.trail, ghost: st.ghost, noMuscles: st.noMuscles });
      if (opts.onFrame) opts.onFrame(lastS, st.t);
    }
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
    function cur(k) { return st[k] !== undefined ? st[k] : (def.cam && def.cam[k] !== undefined ? def.cam[k] : (k === 'yaw' ? 35 : 10)); }
    let drag = null;
    if (opts.interactive) {
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: cur('yaw'), pitch: cur('pitch') }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { } });
      canvas.addEventListener('pointermove', e => {
        if (!drag) return;
        st.yaw = drag.yaw - (e.clientX - drag.x) * 0.6;
        st.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.25, -5, 70);
        kick();
      });
      const end = () => { drag = null; };
      canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('dblclick', () => { st.yaw = opts.yaw; st.pitch = opts.pitch; kick(); });
    }
    kick();
    return {
      get playing() { return st.playing; },
      get cycle() { return pr.total; },
      get t() { return st.t; },
      play() { if (st.playing) return; st.playing = true; st.last = 0; kick(); },
      pause() { st.playing = false; kick(); },
      toggle() { if (st.playing) this.pause(); else this.play(); return st.playing; },
      setSpeed(v) { st.speed = v; },
      setMirror(v) { st.mirror = !!v; kick(); },
      setTrail(v) { st.trail = !!v; kick(); },
      setGhost(v) { st.ghost = !!v; kick(); },
      setMuscles(v) { st.noMuscles = !v; kick(); },
      resetView() { st.yaw = opts.yaw; st.pitch = opts.pitch; kick(); },
      setTime(ms) { st.t = ms; kick(); },
      repaint() { P = palRGB(opts.palette || readPalette(canvas)); kick(); },
      destroy() { st.dead = true; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
    };
  }
  function still(canvas, def, opts) {
    opts = opts || {};
    const pr = prep(def);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, canvas.clientWidth), h = Math.max(10, canvas.clientHeight);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    let ms = 0;
    if (opts.frac !== undefined) ms = pr.total * opts.frac;
    else {
      // the most active keyframe
      let best = 0, acc = 0, bt = 0;
      pr.kfs.forEach(k => { if (k.a > best) { best = k.a; bt = acc; } acc += k.h + k.d; });
      ms = bt;
    }
    // thumbnails are single frames: no need to plan foot contacts for them
    LOCK.on = false;
    try { render(canvas, def, ms, { P: palRGB(opts.palette || readPalette(canvas)), yaw: opts.yaw, pitch: opts.pitch, pad: opts.pad, noMuscles: opts.noMuscles }); }
    finally { LOCK.on = true; }
  }
  // screen positions (canvas pixels) of named joints for overlays such as body-map hotspots
  function points(canvas, def, ms, o, keys) {
    o = o || {};
    const pr = prep(def);
    const W = canvas.width, H = canvas.height;
    const yaw = o.yaw !== undefined ? o.yaw : (def.cam && def.cam.yaw !== undefined ? def.cam.yaw : 35);
    const pitch = o.pitch !== undefined ? o.pitch : (def.cam && def.cam.pitch !== undefined ? def.cam.pitch : 10);
    const key = o.mirror ? 'm' : 'n';
    if (!pr.bb || pr.bbKey !== key) { pr.bb = aabb(pr, def, o.mirror); pr.bbKey = key; }
    const cam = camera(yaw, pitch, pr.bb.c, 900);
    const view = viewFor(box2(pr.bb, cam), W, H, o.pad === undefined ? 0.08 : o.pad);
    const { model } = frameModel(pr, ms, def);
    const sk = model.sk;
    const out = {};
    keys.forEach(k => {
      let q = null;
      if (Array.isArray(k)) { q = add(sk[k[0]], mv(sk[k[1]], k[2])); k = k[3]; }
      else q = sk[k];
      if (!q) return;
      const p2 = proj(cam, view, o.mirror ? [-q[0], q[1], q[2]] : q);
      out[k] = [p2[0], p2[1], p2[2]];
    });
    return out;
  }
  return { mount, still, render, points, prep, sample, solve, buildModel, frameModel, propParts, matFor, readPalette, palRGB, setBody, BODY, PAL_DEFAULT, B, DEF, RAD, HEAD, LEVELS };
})();
