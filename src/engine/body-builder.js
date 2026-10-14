/* OS3B — builds one continuous skinned body mesh from the rest skeleton.
   The body is a signed distance field (torso loft + limbs with muscle relief, joined with smooth unions),
   turned into triangles with surface nets, then every vertex gets up to 4 bone weights.
   Self-contained: it also runs inside a Web Worker (the function source is sent to the worker). */
const OS3B = function buildBody(inp) {
  'use strict';
  const PI = Math.PI;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const g1 = (x, s) => Math.exp(-0.5 * (x / s) * (x / s));
  const gu = (u, c, lo, hi) => g1(u - c, u < c ? lo : hi);
  const wrap = a => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
  const fem = inp.sex === 'f';
  const sk = inp.sk, RAD = inp.RAD;

  /* ---------- muscle relief (same shapes as the capsule renderer) ---------- */
  const BUMPS = {
    ua: [[0.16, 0.10, 90, 0.30, 1.3], [0.13, 0.09, 25, 0.18, 2.2], [0.13, 0.09, 155, 0.16, 2.2], [0.57, 0.14, 0, 0.28, 2.8], [0.40, 0.16, 180, 0.22, 1.8], [0.32, 0.10, 125, 0.12, 3.0], [0.31, 0.05, 45, -0.10, 3.0]],
    fa: [[0.20, 0.12, 70, 0.22, 2.4], [0.28, 0.15, -50, 0.14, 2.0], [0.30, 0.17, 150, 0.10, 2.0]],
    th: [[0.45, 0.20, 5, 0.12, 1.6], [0.50, 0.19, 75, 0.14, 2.0], [0.84, 0.065, -45, 0.24, 3.0], [0.22, 0.15, -100, 0.10, 2.0], [0.47, 0.20, 180, 0.10, 1.6], [0.55, 0.25, 110, -0.07, 6.0], [0.78, 0.05, -15, -0.06, 4.0]],
    sh: [[0.27, 0.12, -150, 0.30, 3.0], [0.22, 0.11, 150, 0.22, 3.0], [0.50, 0.15, 180, 0.10, 1.5], [0.30, 0.16, 45, 0.08, 3.0], [0.45, 0.30, -25, -0.07, 4.0], [0.30, 0.18, 95, -0.05, 6.0]]
  };
  const BUMP_F = { ua: 0.55, fa: 0.6, th: 0.7, sh: 0.75 };
  const PROF = { th: [1.04, 0.22], sh: [1.04, 0.3], ua: [0.98, 0.42], fa: [1.06, 0.22] };
  const TEN = { ua: [0, 0], fa: [0, 0.26], th: [0, 0], sh: [0.1, 0.22] };
  const FRONT = PI / 2, BACK = PI * 1.5;
  function torsoRelief(u, t) {
    const a = c => wrap(t - c);
    const pair = (c, w) => g1(a(c - w[0]), w[1]) + g1(a(c + w[0]), w[1]);
    let d = 0;
    if (!fem) {
      [[FRONT - 0.55, -1], [FRONT + 0.55, 1]].forEach(([c, sg]) => { const v = a(c), vl = v * sg; d += 3.0 * gu(u, 4.45 + 0.55 * Math.max(0, vl), 0.24, 0.55) * g1(v, vl > 0 ? 0.42 : 0.3); });
      d -= 1.0 * g1(u - 4.4, 0.6) * g1(a(FRONT), 0.14);
      d += 1.0 * gu(u, 2.95, 0.45, 0.6) * pair(FRONT, [0.25, 0.15]);
      d -= 0.16 * (g1(u - 2.7, 0.09) + g1(u - 3.2, 0.09)) * pair(FRONT, [0.25, 0.14]);
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

  /* ---------- primitives ---------- */
  // torso rows: Catmull-Rom between the level rings
  const lv = inp.lv, NL = lv.length, NSUB = 8;
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const rows = [];
  for (let i = 0; i < NL - 1; i++) for (let s = 0; s < NSUB; s++) {
    const t = s / NSUB, i0 = Math.max(0, i - 1), i2 = i + 1, i3 = Math.min(NL - 1, i + 2);
    rows.push({ u: i + t, x: cr(lv[i0].c[0], lv[i].c[0], lv[i2].c[0], lv[i3].c[0], t), y: cr(lv[i0].c[1], lv[i].c[1], lv[i2].c[1], lv[i3].c[1], t), z: cr(lv[i0].c[2], lv[i].c[2], lv[i2].c[2], lv[i3].c[2], t), a: cr(lv[i0].a, lv[i].a, lv[i2].a, lv[i3].a, t), b: cr(lv[i0].b, lv[i].b, lv[i2].b, lv[i3].b, t) });
  }
  rows.push({ u: NL - 1, x: lv[NL - 1].c[0], y: lv[NL - 1].c[1], z: lv[NL - 1].c[2], a: lv[NL - 1].a, b: lv[NL - 1].b });
  const yBot = rows[0].y - 2.4, yTop = rows[rows.length - 1].y + 1.2;
  function torsoRow(y) {
    if (y <= rows[0].y) return rows[0];
    const last = rows[rows.length - 1];
    if (y >= last.y) return last;
    let lo = 0, hi = rows.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m].y <= y) lo = m; else hi = m; }
    const A = rows[lo], Bq = rows[hi], f = (y - A.y) / (Bq.y - A.y);
    return { u: A.u + (Bq.u - A.u) * f, x: A.x + (Bq.x - A.x) * f, z: A.z + (Bq.z - A.z) * f, a: A.a + (Bq.a - A.a) * f, b: A.b + (Bq.b - A.b) * f };
  }
  function torsoSD(x, y, z, info) {
    const R = torsoRow(y);
    const dx = x - R.x, dz = z - R.z, rho = Math.sqrt(dx * dx + dz * dz);
    const th = Math.atan2(dz, dx), c = Math.cos(th), s = Math.sin(th);
    const rEll = R.a * R.b / Math.sqrt(R.b * c * R.b * c + R.a * s * R.a * s);
    let tp = Math.atan2(R.a * s, R.b * c); if (tp < 0) tp += 2 * PI;
    const rel = torsoRelief(R.u, tp);
    if (info) { info.u = R.u; info.rel = rel; }
    let d = rho - (rEll + rel);
    d = smax(d, yBot - y, 6);
    d = smax(d, y - yTop, 4);
    return d;
  }
  const P = [];
  function limb(id, s, A, Bp, ra, rb, F, k) {
    const ax = sub(Bp, A), L = len(ax), z = [ax[0] / L, ax[1] / L, ax[2] / L];
    let fr = mv(F, [0, 0, 1]); fr = norm(sub(fr, [z[0] * dot(fr, z), z[1] * dot(fr, z), z[2] * dot(fr, z)]));
    let lt = mv(F, [s === 'L' ? 1 : -1, 0, 0]); const a1 = dot(lt, z), a2 = dot(lt, fr);
    lt = norm([lt[0] - z[0] * a1 - fr[0] * a2, lt[1] - z[1] * a1 - fr[1] * a2, lt[2] - z[2] * a1 - fr[2] * a2]);
    const pf = PROF[id], rm = pf[0] * ra, tm = pf[1];
    const sc = fem ? BUMP_F[id] : 1;
    const bumps = BUMPS[id].map(b => [b[0], b[1], b[2] * PI / 180, b[3] * sc, b[4]]);
    const rmax = Math.max(ra, rm, rb) * 1.35;
    P.push({ kind: 'limb', id, s, A, z, L, fr, lt, ra, rb, rm, tm, bumps, k, bb: bbox([A, Bp], rmax + k) });
  }
  function cap(A, Bp, ra, rb, k) { P.push({ kind: 'cap', A, Bp, ra, rb, k, bb: bbox([A, Bp], Math.max(ra, rb) + k) }); }
  function bbox(pts, r) {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    pts.forEach(q => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], q[i] - r); mx[i] = Math.max(mx[i], q[i] + r); } });
    return [mn, mx];
  }
  // torso bounding box
  {
    let mn = [1e9, yBot - 6, 1e9], mx = [-1e9, yTop + 6, -1e9];
    rows.forEach(R => { const r = Math.max(R.a, R.b) + 5; mn[0] = Math.min(mn[0], R.x - r); mx[0] = Math.max(mx[0], R.x + r); mn[2] = Math.min(mn[2], R.z - r); mx[2] = Math.max(mx[2], R.z + r); });
    P.push({ kind: 'torso', k: 0, bb: [mn, mx] });
  }
  const at = (base, F, v) => { const o = mv(F, v); return [base[0] + o[0], base[1] + o[1], base[2] + o[2]]; };
  cap(at(sk.C7, sk.Ft, [0, -2, -0.5]), at(sk.HB, sk.Fh, [0, 1.5, 0.5]), RAD.neck, RAD.neck * 0.92, 3);
  ['L', 'R'].forEach(s => {
    const neckBase = at(sk.C7, sk.Ft, [0, 1.5, -1.5]);
    cap(neckBase, at(sk['S' + s], sk.Ft, [0, 1.2, -0.8]), 5.0, 4.2, 3);
    P.push({ kind: 'sph', c: sk['S' + s], r: RAD.delt * 0.9, k: 3, bb: bbox([sk['S' + s]], RAD.delt + 3) });
    limb('ua', s, sk['S' + s], sk['E' + s], RAD.ua[0], RAD.ua[1], sk['Fu' + s], 4);
    limb('fa', s, sk['E' + s], sk['W' + s], RAD.fa[0], RAD.fa[1], sk['Ff' + s], 2.5);
    cap(sk['W' + s], sk['T' + s], RAD.hand[0], RAD.hand[1], 1.8);
    limb('th', s, sk['H' + s], sk['K' + s], RAD.th[0], RAD.th[1], sk['Fth' + s], 5);
    const kz = norm(mv(sk['Fth' + s], [0, 0, 1]));
    const kc = [sk['K' + s][0] + kz[0] * 4.2, sk['K' + s][1] + kz[1] * 4.2, sk['K' + s][2] + kz[2] * 4.2];
    P.push({ kind: 'sph', c: kc, r: 2.7, k: 1.5, bb: bbox([kc], 2.7 + 1.5) });
    limb('sh', s, sk['K' + s], sk['A' + s], RAD.sn[0], RAD.sn[1], sk['Fsh' + s], 3);
    cap(sk['Heel' + s], sk['Toe' + s], RAD.foot[0], RAD.foot[1], 2.5);
  });

  function limbSD(pr, x, y, z, info) {
    const qx = x - pr.A[0], qy = y - pr.A[1], qz = z - pr.A[2];
    const t = (qx * pr.z[0] + qy * pr.z[1] + qz * pr.z[2]) / pr.L;
    const tc = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = qx - pr.z[0] * tc * pr.L, dy = qy - pr.z[1] * tc * pr.L, dz = qz - pr.z[2] * tc * pr.L;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (t <= 0) return dist - pr.ra;
    if (t >= 1) return dist - pr.rb;
    const r = t < pr.tm ? pr.ra + (pr.rm - pr.ra) * ss(0, pr.tm, t) : pr.rm + (pr.rb - pr.rm) * ss(pr.tm, 1, t);
    const ph = Math.atan2(dx * pr.lt[0] + dy * pr.lt[1] + dz * pr.lt[2], dx * pr.fr[0] + dy * pr.fr[1] + dz * pr.fr[2]);
    let S = 0;
    for (let i = 0; i < pr.bumps.length; i++) {
      const b = pr.bumps[i], dd = (t - b[0]) / b[1];
      S += b[3] * Math.exp(-0.5 * dd * dd) * Math.exp(b[4] * (Math.cos(ph - b[2]) - 1));
    }
    const e = ss(0, 0.08, t) * (1 - ss(0.92, 1, t));
    if (info) { info.t = t; info.ph = ph; info.rel = e * S; }
    return dist - r * (1 + e * S);
  }
  function primSD(pr, x, y, z) {
    if (pr.kind === 'torso') return torsoSD(x, y, z);
    if (pr.kind === 'limb') return limbSD(pr, x, y, z);
    if (pr.kind === 'sph') { const dx = x - pr.c[0], dy = y - pr.c[1], dz = z - pr.c[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) - pr.r; }
    // capsule with two radii
    const ax = sub(pr.Bp, pr.A), L2 = dot(ax, ax);
    const qx = x - pr.A[0], qy = y - pr.A[1], qz = z - pr.A[2];
    const t = clamp((qx * ax[0] + qy * ax[1] + qz * ax[2]) / L2, 0, 1);
    const dx = qx - ax[0] * t, dy = qy - ax[1] * t, dz = qz - ax[2] * t;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (pr.ra + (pr.rb - pr.ra) * t);
  }
  function sdf(x, y, z) {
    let d = 1e3;
    for (let i = 0; i < P.length; i++) {
      const pr = P[i], b = pr.bb;
      if (x < b[0][0] || y < b[0][1] || z < b[0][2] || x > b[1][0] || y > b[1][1] || z > b[1][2]) continue;
      const v = primSD(pr, x, y, z);
      d = pr.k ? smin(d, v, pr.k) : Math.min(d, v);
    }
    return d;
  }

  const _t0 = Date.now(); const TM = {};
  /* ---------- grid ---------- */
  const h = inp.h || 1.1;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  P.forEach(pr => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], pr.bb[0][i]); mx[i] = Math.max(mx[i], pr.bb[1][i]); } });
  for (let i = 0; i < 3; i++) { mn[i] -= 2 * h; mx[i] += 2 * h; }
  const nx = Math.ceil((mx[0] - mn[0]) / h) + 1, ny = Math.ceil((mx[1] - mn[1]) / h) + 1, nz = Math.ceil((mx[2] - mn[2]) / h) + 1;
  const G = new Float32Array(nx * ny * nz).fill(1e3);
  const id3 = (i, j, k) => (k * ny + j) * nx + i;
  // each primitive fills only its own box, combined with a smooth union
  P.forEach(pr => {
    const i0 = Math.max(0, Math.floor((pr.bb[0][0] - mn[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((pr.bb[1][0] - mn[0]) / h));
    const j0 = Math.max(0, Math.floor((pr.bb[0][1] - mn[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((pr.bb[1][1] - mn[1]) / h));
    const k0 = Math.max(0, Math.floor((pr.bb[0][2] - mn[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((pr.bb[1][2] - mn[2]) / h));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const o = id3(i, j, k), v = primSD(pr, mn[0] + i * h, mn[1] + j * h, mn[2] + k * h);
      G[o] = pr.k ? smin(G[o], v, pr.k) : Math.min(G[o], v);
    }
  });

  TM.grid = Date.now() - _t0;
  /* ---------- surface nets ---------- */
  const VI = new Int32Array(nx * ny * nz).fill(-1);
  const V = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0;
    for (let c = 0; c < 8; c++) { const v = G[id3(i + CO[c][0], j + CO[c][1], k + CO[c][2])]; cv[c] = v; if (v < 0) m |= 1 << c; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let e = 0; e < 12; e++) {
      const a = EDGES[e][0], b = EDGES[e][1];
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t; sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t; sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t; n++;
    }
    VI[id3(i, j, k)] = V.length / 3;
    V.push(mn[0] + (i + sx / n) * h, mn[1] + (j + sy / n) * h, mn[2] + (k + sz / n) * h);
  }
  const T = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) T.push(a, c, b, a, d, c); else T.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = G[id3(i, j, k)] < 0;
    if (v0 !== (G[id3(i + 1, j, k)] < 0)) quad(VI[id3(i, j - 1, k - 1)], VI[id3(i, j, k - 1)], VI[id3(i, j, k)], VI[id3(i, j - 1, k)], !v0);
    if (v0 !== (G[id3(i, j + 1, k)] < 0)) quad(VI[id3(i - 1, j, k - 1)], VI[id3(i - 1, j, k)], VI[id3(i, j, k)], VI[id3(i, j, k - 1)], !v0);
    if (v0 !== (G[id3(i, j, k + 1)] < 0)) quad(VI[id3(i - 1, j - 1, k)], VI[id3(i, j - 1, k)], VI[id3(i, j, k)], VI[id3(i - 1, j, k)], !v0);
  }

  TM.nets = Date.now() - _t0;
  /* ---------- project onto the surface, normals ---------- */
  const NV = V.length / 3, Nn = new Float32Array(NV * 3), PP = new Float32Array(NV * 3);
  const e = 0.25;
  for (let v = 0; v < NV; v++) {
    let x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2];
    {
      const d = sdf(x, y, z);
      const fx = (sdf(x + e, y, z) - d) / e, fy = (sdf(x, y + e, z) - d) / e, fz = (sdf(x, y, z + e) - d) / e;
      const g2 = fx * fx + fy * fy + fz * fz;
      if (g2 > 1e-6) { const st = clamp(d / g2, -h, h); x -= fx * st; y -= fy * st; z -= fz * st; }
    }
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    PP[v * 3] = x; PP[v * 3 + 1] = y; PP[v * 3 + 2] = z;
    Nn[v * 3] = gx / gl; Nn[v * 3 + 1] = gy / gl; Nn[v * 3 + 2] = gz / gl;
  }

  TM.proj = Date.now() - _t0;
  /* ---------- skin weights and surface labels ---------- */
  // bones: [origin joint, segment start, segment end, typical radius]
  const BONES = inp.bones;
  const BI = new Float32Array(NV * 4), BW = new Float32Array(NV * 4), CL = new Float32Array(NV * 4), LM = new Float32Array(NV * 4), RL = new Float32Array(NV);
  const segDist = (q, a, b) => { const ab = sub(b, a), t = clamp(dot(sub(q, a), ab) / Math.max(dot(ab, ab), 1e-6), 0, 1); return [len(sub(q, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t])), t]; };
  const yWaist = lv[1].c[1];
  const CHAIN = { uaL: 'faL', faL: 'handL', thL: 'shL', shL: 'footL', uaR: 'faR', faR: 'handR', thR: 'shR', shR: 'footR' };
  const BAND = { ua: 3.2, fa: 2.0, th: 4.5, sh: 2.4 };
  const limbOf = {}; P.forEach(pr => { if (pr.kind === 'limb') limbOf[pr.id + pr.s] = pr; });
  const info = {};
  for (let v = 0; v < NV; v++) {
    const q = [PP[v * 3], PP[v * 3 + 1], PP[v * 3 + 2]];
    const ws = BONES.map((bn, i) => { const [d, t] = segDist(q, bn.a, bn.b); const dn = d / bn.r; return { i, w: Math.exp(-5 * dn * dn) + 1e-12, t }; });
    ws.sort((A, Bq) => Bq.w - A.w);
    let top = ws.slice(0, 4); let sum = 0; top.forEach(o => { sum += o.w; });
    // elbows, wrists, knees, ankles: a clean band across the joint instead of distance weights
    {
      const n0 = BONES[top[0].i].n, n1 = BONES[top[1].i].n;
      const par = CHAIN[n0] === n1 ? top[0] : CHAIN[n1] === n0 ? top[1] : null;
      if (par && (top[0].w + top[1].w) / sum > 0.85) {
        const chd = par === top[0] ? top[1] : top[0];
        const bp = BONES[par.i], dir = norm(sub(bp.b, bp.a));
        const sd = dot(sub(q, bp.b), dir), bw = BAND[bp.n.slice(0, 2)];
        const wc = ss(-bw, bw, sd);
        top = [{ i: par.i, w: 1 - wc, t: par.t }, { i: chd.i, w: wc, t: chd.t }];
        if (wc > 0.5) top.reverse();
        sum = 1;
      }
    }
    for (let j = 0; j < 4; j++) { const o = top[j]; BI[v * 4 + j] = o ? o.i : top[0].i; BW[v * 4 + j] = o ? o.w / sum : 0; }
    // clothes use the smooth distance weights of all bones, so the edges of the top and shorts stay even
    let wAll = 0; ws.forEach(o => { wAll += o.w; });
    const wOf = names => { let s = 0; ws.forEach(o => { if (names.includes(BONES[o.i].n)) s += o.w; }); return s / wAll; };
    const torsoW = wOf(['pelvis', 'lumbar', 'thorax']);
    const thighs = wOf(['thL', 'thR']);
    const main = BONES[top[0].i];
    // clothes: top above the waist on the torso, shorts on the pelvis and upper thighs
    // position along the dominant thigh decides where the shorts end, whatever bone leads the vertex
    const thE = ws.find(o => BONES[o.i].n === 'thL' || BONES[o.i].n === 'thR');
    const tThigh = thE ? thE.t : 0;
    CL[v * 4] = torsoW - 0.5; CL[v * 4 + 1] = q[1] - yWaist; CL[v * 4 + 2] = Math.min(torsoW + thighs - 0.5, 0.42 - tThigh); CL[v * 4 + 3] = 0;
    // fibres and tendons for the anatomy view; relief for groove shading
    const lid = { uaL: 1, uaR: 1, faL: 1, faR: 1, thL: 1, thR: 1, shL: 1, shR: 1 }[main.n] ? main.n : null;
    if (lid && limbOf[lid]) {
      limbSD(limbOf[lid], q[0], q[1], q[2], info);
      const tn = TEN[lid.slice(0, 2)];
      LM[v * 4] = info.ph; LM[v * 4 + 1] = clamp(info.t, 0, 1); LM[v * 4 + 2] = tn[0]; LM[v * 4 + 3] = tn[1];
      RL[v] = clamp(info.rel / 0.25, -1, 1);
    } else {
      LM[v * 4] = 0; LM[v * 4 + 1] = /^(hand|foot)/.test(main.n) ? -2 : -1;
      if (torsoW > 0.5) { torsoSD(q[0], q[1], q[2], info); RL[v] = clamp(info.rel / 2.6, -1, 1); }
    }
  }
  const IDX = NV > 65535 ? new Uint32Array(T) : new Uint16Array(T);
  TM.all = Date.now() - _t0;
  return { P: PP, N: Nn, BI, BW, CL, LM, RL, IDX, nv: NV, nt: T.length / 3, grid: [nx, ny, nz], TM };
};
