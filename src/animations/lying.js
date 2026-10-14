/* Lying exercises: on the back (head toward -Z) and on the belly (head toward +Z) */
(function () {
  const { P, ft, hd, mirror, hold, rep, alt, seq } = PZ;
  const SU = PZ.SUPINE, HK = PZ.HOOK, PR = PZ.PRONE;
  const camL = { yaw: 90, pitch: 16 }, camL3 = { yaw: 62, pitch: 20 }, camP = { yaw: -90, pitch: 16 }, camP3 = { yaw: -60, pitch: 22 };
  const lie = (o) => Object.assign({ ground: 'torso', mat: true }, o);
  const TABLE = { lL: [90, 2, 0, 0], lR: [90, 2, 0, 0], kL: 90, kR: 90, fL: 20, fR: 20 };
  const FLAT_LEGS = { FL: { t: [9, 6, 87], ft: -72, p: [0, 1, 0] }, FR: { t: [-9, 6, 87], ft: -72, p: [0, 1, 0] } };
  const BACK_ARMS = { aL: [0, 14, 0, 0], aR: [0, 14, 0, 0], eL: 4, eR: 4 };
  const HEAD_HANDS = { HL: { t: [6, 1, -10], rel: 'H', p: [1, 0.3, 0.2], d: [-0.7, 0.2, 0.3] }, HR: { t: [-6, 1, -10], rel: 'H', p: [-1, 0.3, 0.2], d: [0.7, 0.2, 0.3] } };

  Object.assign(MOVES, {
    glute_bridge: lie({ cam: camL, m: ['glutes', 'hams'], kf: rep(P(HK, BACK_ARMS), P(HK, Object.assign({ o: [0, -117, 0] }, BACK_ARMS)), { up: 1100, down: 1700, hb: 1200 }) }),
    kegel_bridge: lie({ cam: camL3, m: ['pelvicFloor', 'glutes'], kf: rep(P(HK, BACK_ARMS), P(HK, Object.assign({ o: [0, -114, 0] }, BACK_ARMS)), { up: 1300, down: 1800, hb: 2200, ha: 600 }) }),
    pil_shoulder_bridge: lie({
      cam: camL, side: true, m: ['glutes', 'hams', 'abs'],
      kf: [
        { p: P(HK, Object.assign({ o: [0, -116, 0] }, BACK_ARMS)), d: 900, a: 0.6 },
        { p: P(HK, Object.assign({ o: [0, -116, 0], FR: { t: [-10, 112, 22], ft: 45, p: [0, 0, 1] } }, BACK_ARMS)), d: 900, a: 1 },
        { p: P(HK, Object.assign({ o: [0, -116, 0], FR: { t: [-10, 44, 86], ft: 30, p: [0, 1, 0] } }, BACK_ARMS)), d: 900, a: 1 },
        { p: P(HK, Object.assign({ o: [0, -116, 0], FR: { t: [-10, 112, 22], ft: 45, p: [0, 0, 1] } }, BACK_ARMS)), d: 900, a: 1 }
      ]
    }),
    dead_bug: lie({
      cam: camL3, m: ['abs', 'obliques'],
      kf: alt(P(SU, Object.assign({ aL: [90, 6, 0, 0], aR: [90, 6, 0, 0], eL: 4, eR: 4 }, TABLE)), P(SU, Object.assign({}, TABLE, { aL: [90, 6, 0, 0], aR: [172, 8, 0, 0], eL: 4, eR: 4, lL: [22, 2, 0, 0], kL: 4, fL: 30 })), { d: 1100, hb: 400 })
    }),
    knees_chest: lie({
      cam: camL3, m: ['erectors', 'glutes'],
      kf: hold(P(SU, { lL: [122, 8, 0, 0], lR: [122, 8, 0, 0], kL: 118, kR: 118, nk: [6, 0, 0], HL: hd(9, 47, -14, { p: [1, 0, 0] }), HR: hd(-9, 47, -14, { p: [-1, 0, 0] }) }), { in: { lL: [128, 8, 0, 0], lR: [128, 8, 0, 0] } })
    }),
    supine_butterfly: lie({
      cam: { yaw: 40, pitch: 34 }, m: ['adductors', 'pelvicFloor'],
      kf: hold(P(SU, { aL: [0, 40, 0, 0], aR: [0, 40, 0, 0], FL: { t: [5, 9, 32], p: [1, 0.25, 0], u: [1, 0.2, 0], d: [0, 0, 1] }, FR: { t: [-5, 9, 32], p: [-1, 0.25, 0], u: [-1, 0.2, 0], d: [0, 0, 1] } }))
    }),
    supine_twist: lie({
      cam: { yaw: 30, pitch: 38 }, side: true, m: ['obliques', 'glutes'],
      kf: hold(P(SU, { aL: [0, 88, 0, 0], aR: [0, 88, 0, 0], eL: 6, eR: 6, nk: [0, 0, -40], lL: [88, 0, 0, -62], lR: [88, 0, 0, 62], kL: 90, kR: 90, ch: [0, 0, 8] }))
    }),
    legs_wall: lie({
      cam: camL, props: [{ t: 'wall', z: 13, w: 90, h: 130 }], m: ['hams', 'calves'],
      kf: hold(P(SU, { lL: [91, 3, 0, 0], lR: [91, 3, 0, 0], kL: 0, kR: 0, fL: 10, fR: 10, aL: [0, 35, 0, 0], aR: [0, 35, 0, 0] }), { d: 2400 })
    }),
    pelvic_tilt: lie({ cam: camL, m: ['abs'], kf: rep(P(HK, BACK_ARMS), P(HK, Object.assign({ o: [0, -98, 0], sp: [10, 0, 0] }, BACK_ARMS)), { up: 1100, down: 1300, hb: 900 }) }),
    pil_hundred: lie({
      cam: camL3, m: ['abs'],
      kf: [
        { p: P(SU, { sp: [8, 0, 0], ch: [30, 0, 0], nk: [24, 0, 0], lL: [52, 2, 0, 0], lR: [52, 2, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: [26, 10, 0, 0], aR: [26, 10, 0, 0], eL: 3, eR: 3 }), d: 230, a: 1 },
        { p: P(SU, { sp: [8, 0, 0], ch: [30, 0, 0], nk: [24, 0, 0], lL: [52, 2, 0, 0], lR: [52, 2, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: [12, 10, 0, 0], aR: [12, 10, 0, 0], eL: 3, eR: 3 }), d: 230, a: 0.8 }
      ]
    }),
    pil_roll_up: lie({
      cam: camL, ease: 'cr', m: ['abs'],
      kf: [
        { p: P(SU, Object.assign({ aL: [176, 10, 0, 0], aR: [176, 10, 0, 0], eL: 4, eR: 4 }, FLAT_LEGS)), d: 1500, a: 0.4 },
        { p: P(SU, Object.assign({ o: [0, -52, 0], sp: [28, 0, 0], ch: [32, 0, 0], nk: [24, 0, 0], aL: [96, 8, 0, 0], aR: [96, 8, 0, 0], eL: 4, eR: 4 }, FLAT_LEGS)), d: 1500, a: 1 },
        { p: P(SU, Object.assign({ o: [0, 12, 0], sp: [26, 0, 0], ch: [26, 0, 0], nk: [26, 0, 0], aL: [70, 8, 0, 0], aR: [70, 8, 0, 0], eL: 4, eR: 4 }, FLAT_LEGS)), d: 1500, a: 0.8 },
        { p: P(SU, Object.assign({ o: [0, -52, 0], sp: [28, 0, 0], ch: [32, 0, 0], nk: [24, 0, 0], aL: [96, 8, 0, 0], aR: [96, 8, 0, 0], eL: 4, eR: 4 }, FLAT_LEGS)), d: 1500, a: 1 }
      ]
    }),
    pil_leg_circles: lie({
      cam: camL3, ease: 'cr', trail: 'AR', side: true, m: ['hipflex', 'abs'],
      kf: [[88, 0], [78, -14], [64, 0], [78, 14]].map(([f, a]) => ({ p: P(SU, Object.assign({}, BACK_ARMS, { aL: [0, 24, 0, 0], aR: [0, 24, 0, 0], lR: [f, a, 0, 0], kR: 0, fR: 35 })), d: 600, a: 0.8 }))
    }),
    pil_single_leg: lie({
      cam: camL3, ease: 'cr', m: ['abs', 'hipflex'],
      kf: (() => {
        const L = P(SU, { sp: [6, 0, 0], ch: [30, 0, 0], nk: [22, 0, 0], lL: [118, 4, 0, 0], kL: 112, lR: [38, 2, 0, 0], kR: 0, fR: 40, HL: hd(12, 52, -8, { p: [1, 0.4, -0.4] }), HR: hd(-2, 50, -2, { p: [-1, 0.4, -0.4] }) });
        return [{ p: L, d: 650, a: 1 }, { p: mirror(L), d: 650, a: 1 }];
      })()
    }),
    pil_teaser: lie({
      cam: camL, m: ['abs', 'hipflex'],
      kf: rep(P(SU, Object.assign({ aL: [150, 8, 0, 0], aR: [150, 8, 0, 0] }, TABLE)), P(SU, { o: [0, -42, 0], sp: [8, 0, 0], ch: [6, 0, 0], nk: [4, 0, 0], lL: [92, 3, 0, 0], lR: [92, 3, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: [98, 8, 0, 0], aR: [98, 8, 0, 0], eL: 3, eR: 3 }), { up: 1500, down: 1700, hb: 1500 })
    }),
    pil_rolling_ball: lie({
      cam: camL, ease: 'cr', m: ['abs'],
      kf: (() => {
        const tuck = o => P(SU, { o, sp: [30, 0, 0], ch: [26, 0, 0], nk: [28, 0, 0], lL: [138, 10, 0, 0], lR: [138, 10, 0, 0], kL: 140, kR: 140, fL: 30, fR: 30, HL: { t: [11, 12, 30], rel: 'P', p: [1, 0.3, 0] }, HR: { t: [-11, 12, 30], rel: 'P', p: [-1, 0.3, 0] } });
        return [{ p: tuck([0, -26, 0]), d: 700, h: 500, a: 1 }, { p: tuck([0, -112, 0]), d: 700, h: 100, a: 0.7 }];
      })()
    }),
    chin_lift: lie({ cam: camL3, focus: 'head', m: ['neckFlex'], kf: rep(P(HK, BACK_ARMS), P(HK, Object.assign({ nk: [12, 0, 0], hd: [16, 0, 0] }, BACK_ARMS)), { up: 900, down: 900, hb: 2500 }) }),
    curl_up: lie({
      cam: camL3, m: ['abs', 'obliques'],
      kf: rep(P(SU, { FL: ft(11, 42, { p: [0.1, 1, 0] }), FR: { t: [-9, 6, 87], ft: -72, p: [0, 1, 0] }, HL: { t: [6, -6, -16], rel: 'P', p: [1, 0, 0.3] }, HR: { t: [-6, -6, -16], rel: 'P', p: [-1, 0, 0.3] } }),
        P(SU, { ch: [13, 0, 0], nk: [5, 0, 0], FL: ft(11, 42, { p: [0.1, 1, 0] }), FR: { t: [-9, 6, 87], ft: -72, p: [0, 1, 0] }, HL: { t: [6, -6, -16], rel: 'P', p: [1, 0, 0.3] }, HR: { t: [-6, -6, -16], rel: 'P', p: [-1, 0, 0.3] } }), { up: 900, down: 900, hb: 2500 })
    }),
    toe_tap: lie({ cam: camL3, m: ['abs'], kf: alt(P(SU, Object.assign({}, TABLE, BACK_ARMS)), P(SU, Object.assign({}, TABLE, BACK_ARMS, { lL: [34, 2, 0, 0], kL: 92 })), { d: 900, hb: 200 }) }),
    rev_crunch: lie({ cam: camL, m: ['abs'], kf: rep(P(SU, Object.assign({}, TABLE, BACK_ARMS)), P(SU, Object.assign({}, BACK_ARMS, { o: [0, -122, 0], lL: [112, 2, 0, 0], lR: [112, 2, 0, 0], kL: 100, kR: 100, fL: 20, fR: 20 })), { up: 1000, down: 1600, hb: 300 }) }),
    hollow: lie({
      cam: camL3, m: ['abs', 'hipflex'],
      kf: hold(P(SU, { sp: [10, 0, 0], ch: [22, 0, 0], nk: [20, 0, 0], lL: [26, 2, 0, 0], lR: [26, 2, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: [176, 8, 0, 0], aR: [176, 8, 0, 0], eL: 3, eR: 3 }), { a1: 0.9, a2: 1 })
    }),
    hollow_rock: lie({
      cam: camL, ease: 'cr', m: ['abs', 'hipflex'],
      kf: (() => { const H = o => P(SU, { o, sp: [10, 0, 0], ch: [22, 0, 0], nk: [20, 0, 0], lL: [26, 2, 0, 0], lR: [26, 2, 0, 0], kL: 0, kR: 0, fL: 40, fR: 40, aL: [176, 8, 0, 0], aR: [176, 8, 0, 0], eL: 3, eR: 3 }); return [{ p: H([0, -78, 0]), d: 420, a: 1 }, { p: H([0, -102, 0]), d: 420, a: 1 }]; })()
    }),
    bicycle: lie({
      cam: camL3, ease: 'cr', m: ['obliques', 'abs'],
      kf: (() => { const L = P(SU, Object.assign({ sp: [6, 0, 0], ch: [26, 0, 28], nk: [16, 0, 0], lL: [112, 2, 0, 0], kL: 104, lR: [32, 2, 0, 0], kR: 4, fR: 30 }, HEAD_HANDS)); return [{ p: L, d: 800, a: 1 }, { p: mirror(L), d: 800, a: 1 }]; })()
    }),
    figure4: lie({
      cam: { yaw: 70, pitch: 22 }, side: true, m: ['glutes'],
      kf: hold(P(SU, { nk: [10, 0, 0], lL: [95, 0, 0, 0], kL: 92, fL: 15, FR: { t: [6, 47, 0], p: [-1, 0.25, 0], d: [1, 0.2, 0.6] }, HL: hd(14, 46, 4, { p: [1, 0, -0.3] }), HR: hd(4, 46, 4, { p: [-1, 0, -0.3] }) }))
    }),
    happy_baby: lie({
      cam: { yaw: 25, pitch: 34 }, ease: 'cr', m: ['adductors', 'pelvicFloor'],
      kf: (() => {
        const B = r => P(SU, { o: [0, -90, r], nk: [8, 0, 0], lL: [128, 0, 0, 34], lR: [128, 0, 0, 34], kL: 92, kR: 92, fL: -10, fR: -10, HL: { t: [19, -9, 66], rel: 'P', p: [1, 0, -0.5] }, HR: { t: [-19, -9, 66], rel: 'P', p: [-1, 0, -0.5] } });
        return [{ p: B(-7), d: 1100, a: 0.9 }, { p: B(7), d: 1100, a: 0.9 }];
      })()
    }),
    foam_thoracic: lie({
      cam: camL, ground: 'torso', props: [{ t: 'roller', a: [-32, 7.5, -36], b: [32, 7.5, -36] }], m: ['erectors', 'rhomboids'],
      kf: rep(P(HK, Object.assign({ r: [0, 11, 4], o: [0, -70, 0] }, HEAD_HANDS)), P(HK, Object.assign({ r: [0, 11, -6], o: [0, -72, 0] }, HEAD_HANDS)), { up: 1100, down: 1100 })
    }),
    foam_legs: {
      cam: camL, floor: false, mat: true, props: [{ t: 'roller', a: [-30, 7.5, 50], b: [30, 7.5, 50] }], m: ['hams', 'calves'],
      kf: (() => {
        const S = z => P(PZ.LSIT, { r: [0, 22, z], o: [0, -26, 0], sp: [8, 0, 0], ch: [6, 0, 0], lL: [64, 3, 4, 0], lR: [64, 3, 4, 0], aL: null, aR: null, HL: hd(17, 4, -32, { p: [0.3, 0, 1], d: [0, -0.1, -1] }), HR: hd(-17, 4, -32, { p: [-0.3, 0, 1], d: [0, -0.1, -1] }) });
        return rep(S(-4), S(-22), { up: 1300, down: 1300 });
      })()
    },
    nordic_curl: {
      cam: { yaw: -80, pitch: 8 }, mat: true, props: [{ t: 'box', min: [-24, 0, -52], max: [24, 14, -44] }], m: ['hams', 'glutes'],
      kf: (() => {
        const kneeY = 6, th = 45;
        const at = (deg, hands) => {
          const r = deg * Math.PI / 180;
          return P(PZ.KNEEL, { r: [0, kneeY + th * Math.cos(r), th * Math.sin(r)], o: [0, deg, 0], nk: [-deg * 0.3, 0, 0], HL: hands[0], HR: hands[1] });
        };
        const chest = deg => { const r = deg * Math.PI / 180, d = 88; return [hd(9, kneeY + d * Math.cos(r), d * Math.sin(r) + 14 * Math.cos(r), { p: [1, -0.5, 0] }), hd(-9, kneeY + d * Math.cos(r), d * Math.sin(r) + 14 * Math.cos(r), { p: [-1, -0.5, 0] })]; };
        return [
          { p: at(0, chest(0)), d: 2200, a: 0.5 },
          { p: at(42, chest(42)), d: 900, a: 1 },
          { p: at(68, [hd(18, 4, 98, { p: [1, 0, -1], d: [0, -0.1, 1] }), hd(-18, 4, 98, { p: [-1, 0, -1], d: [0, -0.1, 1] })]), d: 1200, h: 300, a: 0.8 }
        ];
      })()
    },
    prone_extension: lie({ cam: camP3, m: ['erectors', 'glutes', 'rhomboids'], kf: rep(P(PR, { nk: [0, 0, 0] }), P(PR, { sp: [-11, 0, 0], ch: [-15, 0, 0], nk: [-6, 0, 0], aL: [0, 14, 40, 0], aR: [0, 14, 40, 0], sL: [0, -2], sR: [0, -2] }), { up: 1000, down: 1400, hb: 1500 }) }),
    prone_ytw: lie({
      cam: { yaw: -30, pitch: 34 }, m: ['traps', 'rhomboids', 'rotator'], props: [],
      kf: (() => {
        const b = { nk: [0, 0, 0] };
        const Y = l => P(PR, Object.assign({}, b, { aL: [0, 148, 90, l ? 22 : 0], aR: [0, 148, 90, l ? 22 : 0], eL: 3, eR: 3 }));
        const T = l => P(PR, Object.assign({}, b, { aL: [0, 90, 90, l ? 24 : 0], aR: [0, 90, 90, l ? 24 : 0], eL: 3, eR: 3 }));
        const W = l => P(PR, Object.assign({}, b, { aL: [0, 56, 90, l ? 24 : 0], aR: [0, 56, 90, l ? 24 : 0], eL: 95, eR: 95 }));
        return [Y(0), Y(1), T(0), T(1), W(0), W(1)].map((p, i) => ({ p, d: 800, h: i % 2 ? 700 : 100, a: i % 2 ? 1 : 0.4 }));
      })()
    }),
    pil_swan: lie({
      cam: camP, m: ['erectors', 'triceps'],
      kf: rep(P(PR, { nk: [0, 0, 0], HL: hd(24, 4, 38, { p: [1, 0.3, -1], d: [0, -0.1, 1] }), HR: hd(-24, 4, 38, { p: [-1, 0.3, -1], d: [0, -0.1, 1] }) }),
        P(PR, { sp: [-24, 0, 0], ch: [-22, 0, 0], nk: [-14, 0, 0], HL: hd(24, 4, 38, { p: [1, 0.3, -1], d: [0, -0.1, 1] }), HR: hd(-24, 4, 38, { p: [-1, 0.3, -1], d: [0, -0.1, 1] }) }), { up: 1300, down: 1500, hb: 600 })
    }),
    pil_swimming: lie({
      cam: camP3, ease: 'cr', m: ['erectors', 'glutes', 'rhomboids'],
      kf: (() => { const L = P(PR, { sp: [-6, 0, 0], ch: [-8, 0, 0], nk: [-10, 0, 0], aL: [196, 16, 90, 0], aR: [178, 16, 90, 0], eL: 3, eR: 3, lL: [-6, 5, 0, 0], lR: [-20, 5, 0, 0] }); return [{ p: L, d: 320, a: 1 }, { p: mirror(L), d: 320, a: 1 }]; })()
    }),
    prone_neck: lie({
      cam: { yaw: -70, pitch: 14 }, focus: 'head', m: ['neckExt'],
      kf: rep(P(PR, { nk: [2, 0, 0], HL: hd(7, 4, 70, { p: [1, 0.3, 0], d: [-1, -0.1, 0.2] }), HR: hd(-7, 4, 70, { p: [-1, 0.3, 0], d: [1, -0.1, 0.2] }) }),
        P(PR, { nk: [-14, 0, 0], hd: [8, 0, 0], HL: hd(7, 4, 70, { p: [1, 0.3, 0], d: [-1, -0.1, 0.2] }), HR: hd(-7, 4, 70, { p: [-1, 0.3, 0], d: [1, -0.1, 0.2] }) }), { up: 900, down: 900, hb: 2200 })
    }),
    sphinx: lie({
      cam: camP3, m: ['erectors'],
      kf: hold(P(PR, { sp: [-20, 0, 0], ch: [-14, 0, 0], nk: [-4, 0, 0], HL: hd(15, 4, 72, { p: [0.4, -1, -0.2], d: [0, -0.05, 1] }), HR: hd(-15, 4, 72, { p: [-0.4, -1, -0.2], d: [0, -0.05, 1] }) }))
    }),
    wall_bridge: lie({
      cam: { yaw: 90, pitch: 12 }, props: [{ t: 'wall', z: 62, w: 90, h: 140 }], m: ['glutes', 'hams', 'erectors'],
      kf: rep(P(SU, Object.assign({ FL: { t: [11, 30, 58], p: [0, 1, 0.2], u: [0, 0, -1], d: [0, 1, 0] }, FR: { t: [-11, 30, 58], p: [0, 1, 0.2], u: [0, 0, -1], d: [0, 1, 0] } }, BACK_ARMS)),
        P(SU, Object.assign({ o: [0, -140, 0], FL: { t: [11, 52, 58], p: [0, 1, 0.2], u: [0, 0, -1], d: [0, 1, 0] }, FR: { t: [-11, 52, 58], p: [0, 1, 0.2], u: [0, 0, -1], d: [0, 1, 0] } }, BACK_ARMS)), { up: 1400, down: 1800, hb: 1500 })
    }),
    hip_thrust: {
      cam: { yaw: 90, pitch: 10 }, floor: false, props: [{ t: 'bench', x0: -28, x1: 28, z0: -54, z1: -14, h: 42 }], m: ['glutes', 'hams'],
      kf: rep(P(SU, Object.assign({ r: [0, 26, 12], o: [0, -58, 0], nk: [6, 0, 0], FL: ft(13, 58, { p: [0.1, 1, 0.2] }), FR: ft(-13, 58, { p: [-0.1, 1, 0.2] }) }, BACK_ARMS)),
        P(SU, Object.assign({ r: [0, 53, 20], o: [0, -92, 0], nk: [14, 0, 0], FL: ft(13, 58, { p: [0.1, 1, 0.2] }), FR: ft(-13, 58, { p: [-0.1, 1, 0.2] }) }, BACK_ARMS)), { up: 1000, down: 1500, hb: 900 })
    },
    pelvic_floor: lie({ cam: { yaw: 70, pitch: 26 }, m: ['pelvicFloor'], kf: rep(P(HK, BACK_ARMS), P(HK, Object.assign({ o: [0, -92, 0] }, BACK_ARMS)), { up: 700, down: 1200, hb: 2500, ha: 1500, aA: 0.1 }) })
  });
})();
