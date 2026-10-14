/* Seated, side-lying and hanging exercises */
(function () {
  const { P, ft, hd, mirror, hold, rep, alt, seq } = PZ;
  const LS = PZ.LSIT, SD = PZ.SIDE, HG = PZ.HANG;
  const sit = o => Object.assign({ ground: 'torso', mat: true }, o);
  const sideMat = { x0: -98, x1: 92, z0: -32, z1: 32 };
  const BEHIND = { HL: hd(17, 4, -27, { p: [0.4, 0, 1], d: [0, -0.1, -1] }), HR: hd(-17, 4, -27, { p: [-0.4, 0, 1], d: [0, -0.1, -1] }) };
  const WIDE = { lL: [92, 24, 6, 0], lR: [92, 24, 6, 0] };
  const CHAIR = { r: [0, 54, -16], FL: ft(12, 30, { p: [0, 0, 1] }), FR: ft(-12, 30, { p: [0, 0, 1] }) };

  Object.assign(MOVES, {
    pil_spine_stretch: sit({ cam: { yaw: 60, pitch: 14 }, m: ['erectors', 'hams'], kf: rep(P(LS, Object.assign({}, WIDE, { aL: [90, 10, 0, 0], aR: [90, 10, 0, 0], eL: 3, eR: 3 })), P(LS, Object.assign({}, WIDE, { sp: [26, 0, 0], ch: [28, 0, 0], nk: [26, 0, 0], aL: [120, 10, 0, 0], aR: [120, 10, 0, 0], eL: 3, eR: 3 })), { up: 1500, down: 1500, hb: 600 }) }),
    pil_saw: sit({
      cam: { yaw: 20, pitch: 18 }, m: ['obliques', 'hams'],
      kf: alt(P(LS, Object.assign({}, WIDE, { aL: [0, 88, 0, 0], aR: [0, 88, 0, 0], eL: 3, eR: 3 })), P(LS, Object.assign({}, WIDE, { sp: [16, 0, 0], ch: [20, 0, 42], nk: [10, 0, 18], aL: [0, 80, 0, 40], aR: [104, 10, 0, -30], eL: 3, eR: 3 })), { d: 1100, hb: 700 })
    }),
    ninety_ninety: sit({
      cam: { yaw: 10, pitch: 30 }, ease: 'cr', m: ['glutes', 'adductors'],
      kf: (() => {
        const K = s => P(LS, Object.assign({ o: [0, -18, s * 6], lL: null, lR: null, FL: ft(30, 34, { p: [s, 0.25, 0], fy: s * 20 }), FR: ft(-30, 34, { p: [s, 0.25, 0], fy: -s * 20 }) }, BEHIND));
        return [{ p: K(1), d: 1100, h: 400, a: 1 }, { p: K(-1), d: 1100, h: 400, a: 1 }];
      })()
    }),
    boat: sit({ cam: { yaw: 70, pitch: 12 }, m: ['abs', 'hipflex'], kf: hold(P(LS, { o: [0, -44, 0], sp: [-2, 0, 0], ch: [6, 0, 0], nk: [-4, 0, 0], lL: [90, 4, 0, 0], lR: [90, 4, 0, 0], kL: 0, kR: 0, fL: 30, fR: 30, aL: [96, 8, 0, 0], aR: [96, 8, 0, 0], eL: 3, eR: 3 }), { a1: 0.9, a2: 1 }) }),
    diamond_raise: sit({
      cam: { yaw: 45, pitch: 18 }, m: ['abs', 'adductors', 'pelvicFloor'],
      kf: (() => {
        const D = y => P(LS, Object.assign({ o: [0, -36, 0], lL: null, lR: null, FL: { t: [5, y, 36], p: [1, 0.35, 0.2], u: [1, 0.3, 0], d: [0, 0, 1] }, FR: { t: [-5, y, 36], p: [-1, 0.35, 0.2], u: [-1, 0.3, 0], d: [0, 0, 1] } }, BEHIND));
        return rep(D(10), D(34), { up: 900, down: 1200, hb: 400 });
      })()
    }),
    butterfly_pulse: sit({
      cam: { yaw: 20, pitch: 22 }, ease: 'cr', m: ['adductors', 'pelvicFloor'],
      kf: (() => {
        const B = py => P(LS, { o: [0, 0, 0], sp: [4, 0, 0], ch: [4, 0, 0], lL: null, lR: null, FL: { t: [4, 9, 30], p: [1, py, 0.15], u: [1, 0.3, 0], d: [0, 0, 1] }, FR: { t: [-4, 9, 30], p: [-1, py, 0.15], u: [-1, 0.3, 0], d: [0, 0, 1] }, HL: hd(6, 16, 31, { p: [1, 0, -0.3] }), HR: hd(-6, 16, 31, { p: [-1, 0, -0.3] }) });
        return [{ p: B(0.15), d: 450, a: 1 }, { p: B(0.75), d: 450, a: 0.6 }];
      })()
    }),
    reverse_table: {
      cam: { yaw: 80, pitch: 10 }, mat: true, m: ['glutes', 'hams', 'triceps'],
      kf: rep(P(LS, Object.assign({ r: [0, 13, 0], o: [0, -30, 0], lL: null, lR: null, FL: ft(13, 44, { p: [0, 1, 0.3] }), FR: ft(-13, 44, { p: [0, 1, 0.3] }) }, BEHIND)),
        P(LS, Object.assign({ r: [0, 53, 4], o: [0, -92, 0], sp: [0, 0, 0], ch: [0, 0, 0], nk: [-24, 0, 0], lL: null, lR: null, FL: ft(13, 44, { p: [0, 1, 0.3] }), FR: ft(-13, 44, { p: [0, 1, 0.3] }) }, BEHIND)), { up: 1000, down: 1400, hb: 900 })
    },
    crab_reach: {
      cam: { yaw: 50, pitch: 14 }, mat: true, side: true, m: ['glutes', 'delts', 'obliques'],
      kf: [
        { p: P(LS, Object.assign({ r: [0, 20, 0], o: [0, -32, 0], lL: null, lR: null, FL: ft(13, 44, { p: [0, 1, 0.3] }), FR: ft(-13, 44, { p: [0, 1, 0.3] }) }, BEHIND)), d: 900, h: 300, a: 0.5 },
        { p: P(LS, { r: [-6, 54, 6], o: [8, -80, -16], sp: [-8, 6, -10], ch: [-10, 12, -22], nk: [14, 0, -24], lL: null, lR: null, FL: ft(13, 44, { p: [0, 1, 0.3] }), FR: ft(-13, 44, { p: [0, 1, 0.3] }), HL: hd(17, 4, -27, { p: [0.4, 0, 1], d: [0, -0.1, -1] }), HR: hd(26, 104, -18, { p: [-1, 0, 0.4], d: [0.6, 0.6, -0.2] }) }), d: 1100, h: 700, a: 1 }
      ]
    },
    l_sit: {
      cam: { yaw: 60, pitch: 6 }, floor: false, props: [{ t: 'rings', top: 270 }], m: ['abs', 'hipflex', 'triceps'],
      kf: hold(P(LS, { r: [0, 100, 0], o: [0, 0, 0], sp: [6, 0, 0], ch: [4, 0, 0], sL: [-3, 0], sR: [-3, 0], lL: [92, 3, 0, 0], lR: [92, 3, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: null, aR: null, HL: hd(25, 98, 2, { p: [1, 0, -0.6], d: [0, -0.2, 1] }), HR: hd(-25, 98, 2, { p: [-1, 0, -0.6], d: [0, -0.2, 1] }) }), { a1: 0.9, a2: 1 })
    },
    short_foot: { cam: { yaw: -40, pitch: 24 }, focus: 'legs', props: [{ t: 'chair', z: -18 }], m: ['feet'], kf: rep(P(PZ.STAND, Object.assign({}, CHAIR, { aL: [20, 8, 0, 0], aR: [20, 8, 0, 0], eL: 60, eR: 60 })), P(PZ.STAND, Object.assign({}, CHAIR, { FL: ft(12, 28, { p: [0, 0, 1], ft: -3 }), FR: ft(-12, 28, { p: [0, 0, 1], ft: -3 }), aL: [20, 8, 0, 0], aR: [20, 8, 0, 0], eL: 60, eR: 60 })), { up: 700, down: 900, hb: 2000 }) },
    toe_yoga: { cam: { yaw: -30, pitch: 26 }, focus: 'legs', props: [{ t: 'chair', z: -18 }], m: ['feet', 'tibialis'], kf: alt(P(PZ.STAND, Object.assign({}, CHAIR, { aL: [20, 8, 0, 0], aR: [20, 8, 0, 0], eL: 60, eR: 60 })), P(PZ.STAND, Object.assign({}, CHAIR, { FL: ft(12, 30, { p: [0, 0, 1], ft: -10 }), aL: [20, 8, 0, 0], aR: [20, 8, 0, 0], eL: 60, eR: 60 })), { d: 600, hb: 600 }) },
    open_book: sit({ mat: sideMat,
      cam: { yaw: 10, pitch: 40 }, side: true, m: ['chest', 'obliques'],
      kf: rep(P(SD, { r: [0, 16, 0], lL: [82, 0, 0, 0], lR: [82, 0, 0, 0], kL: 90, kR: 90, aL: [90, 0, 0, 0], aR: [90, 0, 0, 0], eL: 4, eR: 4, nk: [0, 6, 0] }),
        P(SD, { r: [0, 16, 0], lL: [82, 0, 0, 0], lR: [82, 0, 0, 0], kL: 90, kR: 90, aL: [90, 0, 0, 0], aR: [90, 0, 0, 150], eL: 4, eR: 6, ch: [0, 0, -52], nk: [0, 6, -40] }), { up: 1600, down: 1600, hb: 900 })
    }),
    pil_side_kicks: sit({ mat: sideMat,
      cam: { yaw: 0, pitch: 34 }, ease: 'cr', side: true, m: ['glutes', 'abductors', 'hipflex'],
      kf: (() => {
        const base = { r: [0, 16, 0], lL: [22, 0, 0, 0], kL: 4, aL: [172, 0, 0, 0], eL: 120, aR: [10, 30, 0, 0], eR: 80, nk: [0, 16, 0] };
        return [{ p: P(SD, Object.assign({}, base, { lR: [82, 6, 0, 0], kR: 2, fR: -10 })), d: 650, a: 1 }, { p: P(SD, Object.assign({}, base, { lR: [-22, 6, 0, 0], kR: 4, fR: 40 })), d: 650, a: 1 }];
      })()
    }),
    clamshell: sit({ mat: sideMat,
      cam: { yaw: 15, pitch: 30 }, side: true, m: ['glutes', 'abductors'], props: [{ t: 'miniband', at: 'knees' }],
      kf: rep(P(SD, { r: [0, 16, 0], lL: [48, 0, 0, 0], lR: [48, 0, 0, 0], kL: 88, kR: 88, aL: [172, 0, 0, 0], eL: 120, aR: [10, 30, 0, 0], eR: 80, nk: [0, 16, 0] }),
        P(SD, { r: [0, 16, 0], lL: [48, 0, 0, 0], lR: [52, 34, 22, 0], kL: 88, kR: 92, aL: [172, 0, 0, 0], eL: 120, aR: [10, 30, 0, 0], eR: 80, nk: [0, 16, 0] }), { up: 800, down: 1200, hb: 500 })
    }),
    hang: { cam: { yaw: 30, pitch: 4 }, floor: false, props: [{ t: 'bar', y: 228 }], m: ['lats', 'forearms'], kf: rep(P(HG, { sL: [2, 0], sR: [2, 0] }), P(HG, { r: [0, 115, 0], sL: [-2.5, 0], sR: [-2.5, 0] }), { up: 1200, down: 1200, hb: 1500, ha: 1500 }) },
    pullup: { cam: { yaw: 30, pitch: 4 }, floor: false, props: [{ t: 'bar', y: 228 }], m: ['lats', 'biceps', 'rhomboids'], kf: rep(HG, P(HG, { r: [0, 165, 2], kL: 24, kR: 24, lL: [10, 2, 0, 0], lR: [10, 2, 0, 0], ch: [-6, 0, 0] }), { up: 1100, down: 2400 }) },
    knee_raise: { cam: { yaw: 60, pitch: 4 }, floor: false, props: [{ t: 'bar', y: 228 }], m: ['abs', 'hipflex'], kf: rep(HG, P(HG, { o: [0, -12, 0], lL: [104, 4, 0, 0], lR: [104, 4, 0, 0], kL: 104, kR: 104 }), { up: 1000, down: 1600 }) },
    leg_raise_hang: { cam: { yaw: 60, pitch: 4 }, floor: false, props: [{ t: 'bar', y: 228 }], m: ['abs', 'hipflex'], kf: rep(HG, P(HG, { o: [0, -14, 0], lL: [96, 3, 0, 0], lR: [96, 3, 0, 0], kL: 2, kR: 2, fL: 40, fR: 40 }), { up: 1100, down: 1900 }) },
    dips: {
      cam: { yaw: 60, pitch: 6 }, floor: false, props: [{ t: 'rings', top: 270 }], m: ['chest', 'triceps', 'delts'],
      kf: rep(P(PZ.STAND, { FL: null, FR: null, r: [0, 104, 0], lL: [-6, 2, 0, 0], lR: [-6, 2, 0, 0], kL: 80, kR: 80, fL: 30, fR: 30, HL: hd(24, 96, 2, { p: [0.6, 0, -1], d: [0, -0.3, 1] }), HR: hd(-24, 96, 2, { p: [-0.6, 0, -1], d: [0, -0.3, 1] }) }),
        P(PZ.STAND, { FL: null, FR: null, r: [0, 80, -6], o: [0, 18, 0], lL: [-14, 2, 0, 0], lR: [-14, 2, 0, 0], kL: 90, kR: 90, fL: 30, fR: 30, HL: hd(24, 96, 2, { p: [0.6, 0, -1], d: [0, -0.3, 1] }), HR: hd(-24, 96, 2, { p: [-0.6, 0, -1], d: [0, -0.3, 1] }) }), { up: 1000, down: 1800 })
    }
  });
})();
