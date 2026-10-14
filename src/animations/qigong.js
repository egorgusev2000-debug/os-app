/* Qigong (Ba Duan Jin) and tai chi basics */
(function () {
  const { P, ft, hd, mirror, hold, rep, alt, seq } = PZ;
  const { S0, toes } = MV;
  const ST = PZ.STAND;
  const T = (x, y, z, o) => Object.assign({ t: [x, y, z], rel: 'T' }, o || {});
  const PL = (x, y, z, o) => Object.assign({ t: [x, y, z], rel: 'P' }, o || {});
  // soft-knee stance and the horse stance used in qigong
  const SOFT = P(ST, { r: [0, 95, 0], FL: ft(11, 0, { p: [0.2, 0, 1] }), FR: ft(-11, 0, { p: [-0.2, 0, 1] }) });
  const HORSE = P(ST, { r: [0, 80, -2], o: [0, 6, 0], ch: [-4, 0, 0], FL: ft(30, 2, { fy: 16, p: [1, 0, 1] }), FR: ft(-30, 2, { fy: 16, p: [-1, 0, 1] }) });
  const BELLY = { HL: T(3, -38, 15, { d: [-1, 0, 0.2], p: [1, -0.4, -0.4] }), HR: T(-3, -38, 15, { d: [1, 0, 0.2], p: [-1, -0.4, -0.4] }) };
  const HANDS_HIPS = { HL: T(22, -50, 8, { d: [0, -0.2, 1], p: [1, 0, -0.6] }), HR: T(-22, -50, 8, { d: [0, -0.2, 1], p: [-1, 0, -0.6] }) };
  const BALL_R = { HR: T(-6, -12, 24, { d: [1, 0, 0.2], p: [-1, -0.3, -0.3] }), HL: T(4, -36, 20, { d: [-1, 0.1, 0.3], p: [1, -0.5, -0.2] }) };
  const camQ = { yaw: 28, pitch: 8 };

  Object.assign(MOVES, {
    qg_sky: {
      cam: camQ, ease: 'cr', m: ['traps', 'lats', 'erectors'],
      kf: [
        { p: P(SOFT, BELLY), d: 1100, a: 0.4 },
        { p: P(SOFT, { r: [0, 96, 0], HL: T(3, -8, 20, { d: [-1, 0.4, 0], p: [1, -0.5, -0.3] }), HR: T(-3, -8, 20, { d: [1, 0.4, 0], p: [-1, -0.5, -0.3] }) }), d: 1100, a: 0.6 },
        { p: P(SOFT, { r: [0, 97, 0], ch: [-4, 0, 0], nk: [-8, 0, 0], HL: T(4, 46, 4, { d: [-1, 0, 0], p: [1, 0, -0.2] }), HR: T(-4, 46, 4, { d: [1, 0, 0], p: [-1, 0, -0.2] }) }), d: 1300, h: 1400, a: 1 },
        { p: P(SOFT, { HL: T(55, -18, 2, { d: [1, -0.2, 0], p: [0, -1, -0.2] }), HR: T(-55, -18, 2, { d: [-1, -0.2, 0], p: [0, -1, -0.2] }) }), d: 1300, a: 0.5 }
      ]
    },
    qg_bow: {
      cam: { yaw: 12, pitch: 8 }, m: ['quads', 'rhomboids', 'delts'],
      kf: alt(P(HORSE, { HL: T(-6, -12, 22, { d: [0, 0.5, 1], p: [1, -1, 0] }), HR: T(6, -14, 20, { d: [0, 0.5, 1], p: [-1, -1, 0] }) }),
        P(HORSE, { ch: [-4, 0, 10], nk: [0, 0, 38], HL: T(64, -3, 4, { d: [1, 0.45, 0], p: [0, -1, -0.3] }), HR: T(-18, -6, 15, { d: [1, 0, 0.2], p: [-1, 0, -1] }) }), { d: 1300, hb: 1100 })
    },
    qg_lift: {
      cam: camQ, m: ['lats', 'obliques', 'delts'],
      kf: alt(P(SOFT, BELLY),
        P(SOFT, { r: [0, 96, 0], HL: T(8, 46, 3, { d: [-1, 0, 0], p: [1, 0, 0] }), HR: T(-22, -50, 7, { d: [1, 0, 0.4], p: [-1, 0, -0.5] }) }), { d: 1300, hb: 900 })
    },
    qg_look: {
      cam: { yaw: 22, pitch: 6 }, focus: 'upper', m: ['neckSide', 'rhomboids'],
      kf: alt(P(SOFT, { aL: [2, 12, 0, 0], aR: [2, 12, 0, 0], eL: 8, eR: 8 }),
        P(SOFT, { ch: [-2, 0, 18], nk: [0, 0, 52], hd: [-4, 0, 0], aL: [-6, 16, 70, 0], aR: [-6, 16, 70, 0], eL: 4, eR: 4, sL: [0, -1.5], sR: [0, -1.5] }), { d: 1300, hb: 1000 })
    },
    qg_sway: {
      cam: { yaw: 8, pitch: 10 }, ease: 'cr', m: ['obliques', 'erectors', 'quads'],
      kf: (() => {
        const hands = { HL: PL(20, -14, 13, { d: [0, -0.6, 0.6], p: [1, 0.4, -0.6] }), HR: PL(-20, -14, 13, { d: [0, -0.6, 0.6], p: [-1, 0.4, -0.6] }) };
        const up = P(HORSE, Object.assign({ o: [0, 14, 0], sp: [6, 0, 0], ch: [6, 0, 0] }, hands));
        const L = P(HORSE, Object.assign({ r: [-6, 79, -3], o: [0, 18, 0], sp: [12, 16, 0], ch: [12, 18, 0], nk: [4, 12, 0] }, hands));
        const D = P(HORSE, Object.assign({ r: [0, 78, -5], o: [0, 26, 0], sp: [22, 0, 0], ch: [22, 0, 0], nk: [14, 0, 0] }, hands));
        return seq([up, L, D, mirror(L)], 1000, [0.4, 0.9, 1, 0.9]);
      })()
    },
    qg_reach: {
      cam: { yaw: -68, pitch: 8 }, ease: 'cr', m: ['hams', 'erectors', 'calves'],
      kf: [
        { p: P(SOFT, { r: [0, 97, 0], aL: [172, 12, 0, 0], aR: [172, 12, 0, 0], eL: 4, eR: 4 }), d: 1300, h: 600, a: 0.5 },
        { p: P(SOFT, { r: [0, 89, -16], o: [0, 58, 0], sp: [22, 0, 0], ch: [24, 0, 0], nk: [20, 0, 0], aL: [96, 6, 0, 0], aR: [96, 6, 0, 0], eL: 8, eR: 8 }), d: 1600, h: 1200, a: 1 },
        { p: P(SOFT, { r: [0, 93, -8], o: [0, 26, 0], sp: [28, 0, 0], ch: [32, 0, 0], nk: [24, 0, 0], aL: [60, 8, 0, 0], aR: [60, 8, 0, 0], eL: 10, eR: 10 }), d: 1400, a: 0.6 }
      ]
    },
    qg_punch: {
      cam: { yaw: 18, pitch: 8 }, m: ['quads', 'chest', 'delts', 'forearms'],
      kf: alt(P(HORSE, { HL: T(15, -40, 8, { d: [0, 0, 1], p: [0.4, -0.3, -1] }), HR: T(-15, -40, 8, { d: [0, 0, 1], p: [-0.4, -0.3, -1] }) }),
        P(HORSE, { ch: [-4, 0, -10], HL: T(7, -12, 52, { d: [0, 0, 1], p: [1, -1, 0] }), HR: T(-15, -40, 8, { d: [0, 0, 1], p: [-0.4, -0.3, -1] }) }), { d: 750, hb: 600 })
    },
    qg_heels: {
      cam: { yaw: -60, pitch: 8 }, m: ['calves'], focus: 'legs',
      kf: rep(P(S0, { FL: ft(8, 0), FR: ft(-8, 0) }), P(S0, { r: [0, 106, 1], ch: [-3, 0, 0], FL: toes(8, 0, 9), FR: toes(-8, 0, 9) }), { up: 1000, down: 280, hb: 1300 })
    },
    tc_open: {
      cam: { yaw: 30, pitch: 8 }, ease: 'cr', m: ['delts', 'quads'],
      kf: (() => {
        const base = P(ST, { FL: ft(16, 0, { fy: 6, p: [0.3, 0, 1] }), FR: ft(-16, 0, { fy: 6, p: [-0.3, 0, 1] }) });
        return [
          { p: P(base, { r: [0, 96, 0], aL: [6, 10, 0, 0], aR: [6, 10, 0, 0], eL: 12, eR: 12 }), d: 1500, a: 0.4 },
          { p: P(base, { r: [0, 96.5, 0], aL: [88, 12, -10, 0], aR: [88, 12, -10, 0], eL: 8, eR: 8, wL: -12, wR: -12 }), d: 1500, h: 400, a: 0.8 },
          { p: P(base, { r: [0, 90, -3], o: [0, 6, 0], aL: [40, 14, -10, 0], aR: [40, 14, -10, 0], eL: 50, eR: 50, wL: -25, wR: -25 }), d: 1500, h: 300, a: 1 }
        ];
      })()
    },
    tc_step: {
      cam: { yaw: -55, pitch: 8 }, ease: 'cr', m: ['quads', 'glutes', 'calves'],
      kf: (() => {
        const H = { HL: T(9, -30, 24, { d: [-0.4, 0.2, 1], p: [1, -0.5, -0.2] }), HR: T(-9, -30, 24, { d: [0.4, 0.2, 1], p: [-1, -0.5, -0.2] }) };
        const A = P(ST, Object.assign({ r: [0, 89, -3], o: [0, 6, 0], FL: ft(11, 0, { p: [0.2, 0, 1] }), FR: ft(-11, 0, { p: [-0.2, 0, 1] }) }, H));
        const L1 = P(A, { r: [-3, 88, -6], FL: { t: [12, 13, 30], ft: -22, p: [0, 0, 1] }, FR: ft(-11, -2, { fy: 20, p: [-0.3, 0, 1] }) });
        const L2 = P(A, { r: [2, 87, 14], o: [0, 8, 0], FL: ft(12, 30, { p: [0.2, 0, 1] }), FR: toes(-11, -2, 5, { fy: 20, p: [-0.3, 0, 1] }) });
        return seq([A, L1, L2, L1, A, mirror(L1), mirror(L2), mirror(L1)], 1000, [0.4, 0.7, 1, 0.7, 0.4, 0.7, 1, 0.7]);
      })()
    },
    tc_mane: {
      cam: { yaw: 40, pitch: 8 }, ease: 'cr', m: ['quads', 'glutes', 'delts'],
      kf: (() => {
        const A = P(ST, Object.assign({ r: [-4, 88, -2], o: [12, 6, 0], FL: toes(10, 6, 4, { p: [0.3, 0, 1] }), FR: ft(-12, -8, { fy: 25, p: [-0.4, 0, 1] }) }, BALL_R));
        const L = P(ST, { r: [2, 86, 10], o: [-8, 8, 0], ch: [0, 0, -8], FL: ft(14, 34, { fy: -4, p: [0.3, 0, 1] }), FR: ft(-14, -18, { fy: 38, p: [-0.4, 0, 1] }), HL: T(14, 10, 42, { d: [0.2, 0.35, 1], p: [1, -1, 0] }), HR: T(-24, -50, 10, { d: [0.2, 0, 1], p: [-1, 0, -0.5] }) });
        return alt(A, L, { d: 1500, hb: 700 });
      })()
    },
    tc_crane: {
      cam: { yaw: 35, pitch: 8 }, ease: 'cr', m: ['quads', 'delts'],
      kf: (() => {
        const A = P(ST, Object.assign({ r: [-4, 89, -4], o: [8, 6, 0], FL: toes(11, 14, 3, { p: [0.3, 0, 1] }), FR: ft(-11, -4, { fy: 20, p: [-0.4, 0, 1] }) }, { HL: T(6, -12, 24, { d: [-1, 0, 0.2], p: [1, -0.3, -0.3] }), HR: T(-4, -36, 20, { d: [1, 0.1, 0.3], p: [-1, -0.5, -0.2] }) }));
        const B = P(A, { r: [-5, 89, -5], o: [0, 4, 0], FL: toes(11, 18, 7, { p: [0.3, 0, 1] }), HR: T(-12, 30, 18, { d: [0.5, 0.6, 0.3], p: [-1, -0.3, 0] }), HL: T(24, -50, 10, { d: [0, 0, 1], p: [1, 0, -0.5] }) });
        return rep(A, B, { up: 1500, down: 1500, hb: 1500 });
      })()
    },
    tc_cloud: {
      cam: { yaw: 10, pitch: 8 }, ease: 'cr', m: ['obliques', 'quads', 'delts'],
      kf: (() => {
        const feet = { FL: ft(22, 0, { fy: 6, p: [0.6, 0, 1] }), FR: ft(-22, 0, { fy: 6, p: [-0.6, 0, 1] }) };
        const L = P(ST, Object.assign({ r: [8, 88, -2], o: [18, 6, 0], ch: [0, 0, 12], nk: [0, 0, 8], HL: T(6, 8, 26, { d: [0, 1, 0.3], p: [1, -0.6, 0] }), HR: T(-6, -38, 20, { d: [1, 0, 0.3], p: [-1, -0.4, -0.3] }) }, feet));
        const M = P(ST, Object.assign({ r: [0, 87, -2], o: [0, 6, 0], HL: T(6, -26, 22, { d: [0, 0.3, 1], p: [1, -0.5, -0.2] }), HR: T(-6, -6, 24, { d: [0, 0.6, 1], p: [-1, -0.5, -0.2] }) }, feet));
        return seq([L, M, mirror(L), mirror(M)], 1300, [1, 0.6, 1, 0.6]);
      })()
    },
    tc_rooster: {
      cam: { yaw: 35, pitch: 8 }, ease: 'cr', m: ['glutes', 'abductors', 'quads'],
      kf: alt(P(ST, Object.assign({ r: [0, 95, 0], FL: ft(10, 0, { p: [0.2, 0, 1] }), FR: ft(-10, 0, { p: [-0.2, 0, 1] }) }, HANDS_HIPS)),
        P(ST, { r: [-5, 94, 0], FL: { t: [10, 54, 38], ft: 25, p: [0, 0.3, 1] }, FR: ft(-10, 0, { p: [-0.2, 0, 1] }), HL: T(10, 10, 30, { d: [0, 1, 0.2], p: [1, -1, 0] }), HR: T(-24, -50, 10, { d: [0.2, 0, 1], p: [-1, 0, -0.5] }) }), { d: 1400, hb: 2000 })
    }
  });
})();
