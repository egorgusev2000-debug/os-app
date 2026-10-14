/* Exercise animations. Each entry: { cam, kf, ease, m (muscles), props, mat, ground, floor, focus, trail, side } */
const MOVES = {};
const MV = (function () {
  'use strict';
  const { P, ft, hd, mirror } = PZ;
  const D = Math.PI / 180;
  const S0 = P(PZ.STAND, PZ.ARMS_DOWN);
  // heel raise of height h with the toe kept on the floor
  function toes(x, z, h, o) {
    let a = 20;
    for (let i = 0; i < 30; i++) {
      const f = 6.5 * Math.cos(a * D) + 17 * Math.sin(a * D) - (6.5 + h);
      const df = (-6.5 * Math.sin(a * D) + 17 * Math.cos(a * D)) * D;
      a -= f / df;
    }
    const tz = -6.5 * Math.sin(a * D) + 17 * Math.cos(a * D);
    return Object.assign({ t: [x, 10 + h, z + 17 - tz], ft: a }, o || {});
  }
  function walk(o) {
    o = o || {};
    const L = o.stride || 30, lift = o.lift || 9, d = o.d || 340, sw = o.swing || 24, lean = o.lean || 2, el = o.elbow || 16;
    const extra = o.extra || {};
    const k = (y, FL, FR, a1, a2, yaw, rot) => P(S0, Object.assign({ r: [0, y, 0], o: [yaw, 0, 0], ch: [lean, 0, rot], nk: [-lean, 0, 0], FL, FR, aL: [a1, 9, 0, 0], aR: [a2, 9, 0, 0], eL: el + Math.max(0, a1) * 0.4, eR: el + Math.max(0, a2) * 0.4 }, extra));
    return [
      { p: k(96.6, ft(9, L / 2, { ft: -14 }), toes(-9, -L / 2, 8), -sw, sw, 5, -6), d, a: 0.8 },
      { p: k(98.4, ft(9, 0), { t: [-9, 10 + lift, -2], ft: 18 }, 0, 0, 0, 0), d, a: 0.6 },
      { p: k(96.6, toes(9, -L / 2, 8), ft(-9, L / 2, { ft: -14 }), sw, -sw, -5, 6), d, a: 0.8 },
      { p: k(98.4, { t: [9, 10 + lift, -2], ft: 18 }, ft(-9, 0), 0, 0, 0, 0), d, a: 0.6 }
    ];
  }
  function run(o) {
    o = o || {};
    const L = o.stride || 52, d = o.d || 190, lean = o.lean || 7;
    const k = (y, FL, FR, a1, a2, rot) => P(S0, { r: [0, y, 0], o: [0, 4, 0], sp: [2, 0, 0], ch: [lean - 4, 0, rot], nk: [-lean, 0, 0], FL, FR, aL: [a1, 10, 0, 0], aR: [a2, 10, 0, 0], eL: 88, eR: 88 });
    return [
      { p: k(95.5, ft(9, L / 2, { ft: -8, p: [0, 0, 1] }), { t: [-9, 32, -L / 2], ft: 55, p: [0, 0, 1] }, -30, 40, -8), d, a: 0.9 },
      { p: k(99, { t: [9, 14, 4], ft: 5, p: [0, 0, 1] }, { t: [-9, 40, -6], ft: 40, p: [0, 0, 1] }, 0, 10, 0), d, a: 0.7 },
      { p: k(95.5, { t: [9, 32, -L / 2], ft: 55, p: [0, 0, 1] }, ft(-9, L / 2, { ft: -8, p: [0, 0, 1] }), 40, -30, 8), d, a: 0.9 },
      { p: k(99, { t: [9, 40, -6], ft: 40, p: [0, 0, 1] }, { t: [-9, 14, 4], ft: 5, p: [0, 0, 1] }, 10, 0, 0), d, a: 0.7 }
    ];
  }
  return { S0, toes, walk, run };
})();
