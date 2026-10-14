/* Pose library and motion helpers for OS3D. Figure faces +Z; left = +X. Units: cm, degrees. */
const PZ = (function () {
  'use strict';
  const clone = o => JSON.parse(JSON.stringify(o));
  // merge: arrays and IK objects are replaced, `null` removes a key
  function P(base, over) {
    const o = clone(base || {});
    Object.keys(over || {}).forEach(k => { if (over[k] === null) delete o[k]; else o[k] = clone(over[k]); });
    return o;
  }
  const ft = (x, z, o) => Object.assign({ t: [x, 10, z] }, o || {});         // flat foot, ankle target (sole on the floor)
  const hd = (x, y, z, o) => Object.assign({ t: [x, y, z] }, o || {});       // hand (wrist) target
  const MIRF = ['aL', 'aR', 'eL', 'eR', 'wL', 'wR', 'lL', 'lR', 'kL', 'kR', 'fL', 'fR', 'sL', 'sR', 'HL', 'HR', 'FL', 'FR'];
  function mirror(p) {
    const o = clone(p);
    for (let i = 0; i < MIRF.length; i += 2) { const a = MIRF[i], b = MIRF[i + 1]; const va = o[a], vb = o[b]; if (vb === undefined) delete o[a]; else o[a] = vb; if (va === undefined) delete o[b]; else o[b] = va; }
    ['HL', 'HR', 'FL', 'FR'].forEach(k => { if (o[k]) { o[k].t[0] = -o[k].t[0]; if (o[k].p) o[k].p[0] = -o[k].p[0]; if (o[k].d) o[k].d[0] = -o[k].d[0]; } });
    ['sp', 'ch', 'nk', 'hd'].forEach(k => { if (o[k]) { o[k][1] = -o[k][1]; o[k][2] = -o[k][2]; } });
    if (o.o) { o.o[0] = -o.o[0]; o.o[2] = -o.o[2]; }
    if (o.r) o.r[0] = -o.r[0];
    return o;
  }

  /* ----- base poses ----- */
  const STAND = { r: [0, 97.5, 0], FL: ft(10, 0), FR: ft(-10, 0) };
  const STANDW = P(STAND, { FL: ft(16, 0, { fy: 12 }), FR: ft(-16, 0, { fy: 12 }) });
  const ARMS_DOWN = { aL: [2, 8, 0, 0], aR: [2, 8, 0, 0], eL: 8, eR: 8 };
  const SQUAT = { r: [0, 50, -14], o: [0, 28, 0], sp: [4, 0, 0], ch: [8, 0, 0], nk: [-18, 0, 0],
    FL: ft(17, 4, { fy: 18, p: [0.55, 0, 1] }), FR: ft(-17, 4, { fy: 18, p: [-0.55, 0, 1] }), aL: [78, 12, 0, 0], aR: [78, 12, 0, 0], eL: 20, eR: 20 };
  // hook-lying on the back, head toward -Z, knees up
  const SUPINE = { r: [0, 11, 0], o: [0, -90, 0], aL: [0, 12, 0, 0], aR: [0, 12, 0, 0], eL: 4, eR: 4, lL: [0, 2, 8, 0], lR: [0, 2, 8, 0], kL: 0, kR: 0, fL: 25, fR: 25 };
  const HOOK = P(SUPINE, { FL: ft(11, 42, { p: [0.1, 1, 0] }), FR: ft(-11, 42, { p: [-0.1, 1, 0] }) });
  // lying on the belly, head toward +Z
  const PRONE = { r: [0, 11, 0], o: [0, 90, 0], nk: [-8, 0, 0], aL: [0, 10, 0, 0], aR: [0, 10, 0, 0], eL: 4, eR: 4, lL: [-3, 3, 0, 0], lR: [-3, 3, 0, 0], kL: 0, kR: 0, fL: 70, fR: 70 };
  // all fours, facing +Z
  const QUAD = { r: [0, 52, 0], o: [0, 84, 0], nk: [-12, 0, 0], ch: [4, 0, 0],
    HL: hd(17, 4, 47, { d: [0, -0.15, 1], p: [0.3, 0, -1] }), HR: hd(-17, 4, 47, { d: [0, -0.15, 1], p: [-0.3, 0, -1] }),
    FL: { t: [10, 6, -41], ft: 160, p: [0, -1, 0.15] }, FR: { t: [-10, 6, -41], ft: 160, p: [0, -1, 0.15] } };
  // high plank, facing +Z
  const PLANK = { r: [0, 60, 0], o: [0, 74, 0], nk: [-14, 0, 0],
    HL: hd(18, 4, 62, { d: [0, -0.1, 1], p: [0.2, 0, -1] }), HR: hd(-18, 4, 62, { d: [0, -0.1, 1], p: [-0.2, 0, -1] }),
    FL: { t: [9, 17, -86], ft: 78, p: [0, -1, 0] }, FR: { t: [-9, 17, -86], ft: 78, p: [0, -1, 0] } };
  // forearm plank
  const FPLANK = { r: [0, 33, 0], o: [0, 83, 0], nk: [-12, 0, 0],
    aL: [92, 14, 0, 0], aR: [92, 14, 0, 0], eL: 88, eR: 88, wL: -10, wR: -10,
    FL: { t: [9, 16, -86], ft: 80, p: [0, -1, 0] }, FR: { t: [-9, 16, -86], ft: 80, p: [0, -1, 0] } };
  // tall kneeling and half kneeling (left foot forward)
  const KNEEL = { r: [0, 52, 0], o: [0, 0, 0],
    FL: { t: [10, 6, -41], ft: 160, p: [0, -0.2, 1] }, FR: { t: [-10, 6, -41], ft: 160, p: [0, -0.2, 1] }, aL: [2, 8, 0, 0], aR: [2, 8, 0, 0] };
  const HALFK = { r: [0, 52, -6], o: [0, 0, 0],
    FL: ft(11, 40, { p: [0, 0.2, 1] }), FR: { t: [-11, 6, -46], ft: 160, p: [0, -0.4, 1] }, aL: [2, 8, 0, 0], aR: [2, 8, 0, 0] };
  // long sitting, legs forward
  const LSIT = { r: [0, 11, 0], o: [0, 0, 0], sp: [4, 0, 0], ch: [4, 0, 0], nk: [-4, 0, 0], lL: [92, 4, 6, 0], lR: [92, 4, 6, 0], kL: 0, kR: 0, fL: 15, fR: 15, aL: [10, 18, 0, 0], aR: [10, 18, 0, 0], eL: 6, eR: 6 };
  // cross-legged sitting
  const CROSS = { r: [0, 11, 0], o: [0, 0, 0], sp: [4, 0, 0],
    FL: { t: [-14, 6, 26], p: [1, 0.6, 0.6], d: [-1, 0, 0.3] }, FR: { t: [14, 6, 22], p: [-1, 0.6, 0.6], d: [1, 0, 0.3] },
    aL: [20, 14, 0, 0], aR: [20, 14, 0, 0], eL: 40, eR: 40 };
  // side lying on the left side, head toward +X... use yaw so the body lies along Z: roll -90 lies on the left side
  const SIDE = { r: [0, 16, 0], o: [0, 0, -90], aL: [175, 0, 0, 0], aR: [0, 6, 0, 0], eL: 10, eR: 6, lL: [8, 0, 0, 0], lR: [8, 0, 0, 0], kL: 10, kR: 0 };
  // hanging from a bar at y = 228, facing +Z
  const HANG = { r: [0, 118, 0], HL: hd(26, 222, 0, { d: [0, 1, 0], p: [1, 0, -0.3] }), HR: hd(-26, 222, 0, { d: [0, 1, 0], p: [-1, 0, -0.3] }), lL: [4, 2, 0, 0], lR: [4, 2, 0, 0], kL: 8, kR: 8, fL: 20, fR: 20 };

  /* ----- motion helpers ----- */
  // static hold with a slow breathing sway
  function hold(p, o) {
    o = o || {};
    const b = P(p, {});
    const ch = (p.ch || [0, 0, 0]).slice(); ch[0] -= (o.b || 2.5);
    const sL = (p.sL || [0, 0]).slice(), sR = (p.sR || [0, 0]).slice(); sL[0] += 0.8; sR[0] += 0.8;
    const b2 = P(p, Object.assign({ ch, sL, sR }, o.in || {}));
    return [{ p: b, d: o.d || 1800, a: o.a1 === undefined ? 0.75 : o.a1 }, { p: b2, d: o.d || 1800, a: o.a2 === undefined ? 0.95 : o.a2 }];
  }
  // A -> B -> A with optional pauses
  function rep(A, B, o) {
    o = o || {};
    return [{ p: A, d: o.up || 900, h: o.ha || 0, a: o.aA === undefined ? 0.35 : o.aA }, { p: B, d: o.down || 900, h: o.hb || 0, a: o.aB === undefined ? 1 : o.aB }];
  }
  // A -> L -> A -> mirror(L)
  function alt(A, L, o) {
    o = o || {};
    const R = o.R || mirror(L);
    const A2 = o.A2 || A;
    return [{ p: A, d: o.d || 800, h: o.ha || 0, a: 0.35 }, { p: L, d: o.d || 800, h: o.hb || 0, a: 1 }, { p: A2, d: o.d || 800, h: o.ha || 0, a: 0.35 }, { p: R, d: o.d || 800, h: o.hb || 0, a: 1 }];
  }
  function seq(list, d, a) { return list.map((p, i) => ({ p, d: Array.isArray(d) ? d[i] : (d || 900), a: Array.isArray(a) ? a[i] : (a === undefined ? 0.8 : a) })); }

  return { P, ft, hd, mirror, hold, rep, alt, seq, STAND, STANDW, ARMS_DOWN, SQUAT, SUPINE, HOOK, PRONE, QUAD, PLANK, FPLANK, KNEEL, HALFK, LSIT, CROSS, SIDE, HANG };
})();
