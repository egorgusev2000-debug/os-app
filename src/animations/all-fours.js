/* All fours, planks, kneeling and lunging positions (facing +Z) */
(function () {
  const { P, ft, hd, mirror, hold, rep, alt, seq } = PZ;
  const { toes } = MV;
  const Q = PZ.QUAD, PL = PZ.PLANK, FP = PZ.FPLANK, KN = PZ.KNEEL, HK = PZ.HALFK;
  const camQ = { yaw: 70, pitch: 14 }, camQs = { yaw: 90, pitch: 10 };
  const fl = o => Object.assign({ mat: true }, o);
  const KFEET = { FL: { t: [10, 5, -42], ft: 160, p: [0, -0.4, 1] }, FR: { t: [-10, 5, -42], ft: 160, p: [0, -0.4, 1] } };

  Object.assign(MOVES, {
    cat_cow: fl({ cam: camQs, m: ['erectors', 'abs'], kf: rep(P(Q, { sp: [-14, 0, 0], ch: [-10, 0, 0], nk: [-30, 0, 0] }), P(Q, { r: [0, 54, 0], sp: [18, 0, 0], ch: [16, 0, 0], nk: [24, 0, 0] }), { up: 1500, down: 1500, ha: 300, hb: 300 }) }),
    bird_dog: fl({
      cam: { yaw: 55, pitch: 16 }, m: ['glutes', 'erectors', 'delts'],
      kf: alt(Q, P(Q, { nk: [-8, 0, 0], HR: hd(-17, 58, 99, { p: [-0.3, -1, 0], d: [0, 0, 1] }), FL: { t: [10, 50, -86], ft: 92, p: [0, -1, 0] } }), { d: 1200, hb: 1500 })
    }),
    thread_needle: fl({
      cam: { yaw: 30, pitch: 22 }, side: true, m: ['rhomboids', 'obliques'],
      kf: [
        { p: Q, d: 900, a: 0.4 },
        { p: P(Q, { r: [0, 47, -4], ch: [6, 0, 34], nk: [0, 0, 30], HR: hd(26, 6, 44, { p: [0, 1, -0.2], d: [1, -0.1, 0] }) }), d: 1300, h: 900, a: 0.9 },
        { p: Q, d: 900, a: 0.4 },
        { p: P(Q, { ch: [0, 0, -44], nk: [0, 0, -36], HR: hd(-34, 108, 44, { p: [0, -0.2, -1], d: [0, 1, 0] }) }), d: 1300, h: 900, a: 1 }
      ]
    }),
    childs_pose: fl({
      cam: camQs, m: ['erectors', 'lats'],
      kf: hold(P(Q, { r: [0, 34, -31], o: [0, 58, 0], sp: [34, 0, 0], ch: [28, 0, 0], nk: [16, 0, 0], HL: hd(15, 4, 62, { p: [0.4, 1, 0], d: [0, -0.1, 1] }), HR: hd(-15, 4, 62, { p: [-0.4, 1, 0], d: [0, -0.1, 1] }), FL: { t: [8, 5, -44], ft: 162, p: [0, -0.5, 1] }, FR: { t: [-8, 5, -44], ft: 162, p: [0, -0.5, 1] } }), { b: 4 })
    }),
    down_dog: fl({
      cam: camQs, m: ['hams', 'calves', 'delts'],
      kf: hold(P(Q, { r: [0, 95, -2], o: [0, 138, 0], sp: [-4, 0, 0], ch: [-6, 0, 0], nk: [-6, 0, 0], HL: hd(18, 4, 58, { p: [0.3, 0, -1], d: [0, -0.1, 1] }), HR: hd(-18, 4, 58, { p: [-0.3, 0, -1], d: [0, -0.1, 1] }), FL: toes(10, -62, 7, { p: [0, 0, 1] }), FR: toes(-10, -62, 7, { p: [0, 0, 1] }) }))
    }),
    quad_neck: fl({
      cam: { yaw: 55, pitch: 12 }, focus: 'upper', m: ['neckFlex', 'neckExt'],
      kf: [[30, 0], [-34, 0], [-6, 38], [-6, -38]].map(([f, r]) => ({ p: P(Q, { nk: [f, 0, r], hd: [f > 0 ? 6 : 0, 0, 0] }), d: 1000, h: 700, a: 0.9 }))
    }),
    bear: fl({ cam: { yaw: 60, pitch: 12 }, m: ['abs', 'quads', 'delts'], kf: hold(P(Q, { r: [0, 57, 0], o: [0, 86, 0], FL: { t: [10, 15, -41], ft: 80, p: [0, -1, 0.3] }, FR: { t: [-10, 15, -41], ft: 80, p: [0, -1, 0.3] } }), { a1: 0.9, a2: 1 }) }),
    kick_through: fl({
      cam: { yaw: 40, pitch: 18 }, side: true, m: ['obliques', 'abs', 'delts'],
      kf: (() => {
        const B = P(Q, { r: [0, 57, 0], o: [0, 86, 0], FL: { t: [10, 15, -41], ft: 80, p: [0, -1, 0.3] }, FR: { t: [-10, 15, -41], ft: 80, p: [0, -1, 0.3] } });
        const K = P(Q, { r: [-4, 40, -4], o: [-62, 70, -40], sp: [0, 0, 10], ch: [0, 0, 18], nk: [0, 0, 20], HR: hd(-17, 4, 47, { p: [-0.3, 0, -1], d: [0, -0.1, 1] }), HL: hd(38, 84, 22, { p: [1, 0, 0], d: [0, 1, 0.3] }), FL: { t: [-6, 10, -46], ft: 0, p: [0.2, 0.6, 1] }, FR: { t: [44, 26, 2], ft: 0, p: [0, 0.6, -1] } });
        return [{ p: B, d: 700, h: 300, a: 0.6 }, { p: K, d: 800, h: 500, a: 1 }];
      })()
    }),
    scap_pushup: fl({ cam: { yaw: 55, pitch: 18 }, m: ['serratus', 'delts'], kf: rep(P(PL, { r: [0, 58, 0], sL: [0, -3], sR: [0, -3], ch: [-3, 0, 0] }), P(PL, { r: [0, 61, 0], sL: [0, 3.5], sR: [0, 3.5], ch: [7, 0, 0] }), { up: 800, down: 900, hb: 400 }) }),
    plank: fl({ cam: { yaw: 70, pitch: 12 }, m: ['abs', 'obliques', 'delts'], kf: hold(FP, { a1: 0.9, a2: 1 }) }),
    plank_tap: fl({
      cam: { yaw: 30, pitch: 18 }, m: ['abs', 'obliques', 'delts'],
      kf: (() => {
        const W = P(PL, { FL: { t: [17, 17, -86], ft: 78, p: [0, -1, 0] }, FR: { t: [-17, 17, -86], ft: 78, p: [0, -1, 0] } });
        return alt(W, P(W, { o: [0, 74, -4], HL: hd(-12, 54, 46, { p: [1, -0.5, -0.5], d: [-0.5, 0.2, 0.3] }) }), { d: 600, hb: 300 });
      })()
    }),
    pushup: fl({ cam: { yaw: 68, pitch: 10 }, m: ['chest', 'triceps', 'abs'], kf: rep(PL, P(PL, { r: [0, 31, 4], o: [0, 81, 0], nk: [-10, 0, 0], HL: hd(18, 4, 62, { p: [0.8, 0, -1], d: [0, -0.1, 1] }), HR: hd(-18, 4, 62, { p: [-0.8, 0, -1], d: [0, -0.1, 1] }) }), { up: 900, down: 1800 }) }),
    pil_leg_pull_front: fl({ cam: { yaw: 70, pitch: 12 }, m: ['glutes', 'abs'], kf: alt(PL, P(PL, { FL: { t: [9, 46, -84], ft: 40, p: [0, -1, 0] } }), { d: 800, hb: 500 }) }),
    side_plank: {
      cam: { yaw: 8, pitch: 12 }, mat: { x0: -100, x1: 75, z0: -28, z1: 34 }, side: true, m: ['obliques', 'glutes', 'abductors'],
      kf: hold(P(PZ.SIDE, { r: [0, 39, 0], o: [0, 0, -75], lL: [0, 0, 0, 0], lR: [0, 0, 0, 0], kL: 0, kR: 0, fL: 10, fR: 10, aL: null, HL: hd(47, 4, 26, { p: [0, -1, -0.25], d: [0, -0.1, 1] }), aR: [0, 90, 0, 0], eR: 4 }), { a1: 0.9, a2: 1 })
    },
    copenhagen: {
      cam: { yaw: 10, pitch: 12 }, side: true, props: [{ t: 'bench', x0: -102, x1: -62, z0: -22, z1: 22, h: 46 }], m: ['adductors', 'obliques'],
      kf: hold(P(PZ.SIDE, { r: [0, 47, 0], o: [0, 0, -80], lL: [24, 0, 0, 0], kL: 70, lR: [0, 0, 0, 0], kR: 0, fR: 10, aL: null, HL: hd(47, 4, 26, { p: [0, -1, -0.25], d: [0, -0.1, 1] }), aR: [0, 30, 0, 0], eR: 80 }), { a1: 0.9, a2: 1 })
    },
    ab_wheel: fl({
      cam: camQs, m: ['abs', 'lats'], props: [{ t: 'wheel' }],
      kf: rep(P(Q, Object.assign({ r: [0, 52, -6], o: [0, 56, 0], sp: [8, 0, 0], ch: [6, 0, 0], nk: [-10, 0, 0], HL: hd(7, 11, 38, { p: [0.3, 0, -1], d: [0, -0.4, 1] }), HR: hd(-7, 11, 38, { p: [-0.3, 0, -1], d: [0, -0.4, 1] }) }, KFEET)),
        P(Q, Object.assign({ r: [0, 33, 12], o: [0, 84, 0], sp: [2, 0, 0], nk: [-14, 0, 0], HL: hd(7, 11, 100, { p: [0.3, 0, -1], d: [0, -0.4, 1] }), HR: hd(-7, 11, 100, { p: [-0.3, 0, -1], d: [0, -0.4, 1] }) }, KFEET)), { up: 1800, down: 1300 })
    }),
    kneel_thrust: fl({
      cam: { yaw: -80, pitch: 8 }, m: ['glutes', 'pelvicFloor'],
      kf: rep(P(KN, Object.assign({ r: [0, 33, -22], o: [0, 22, 0], ch: [6, 0, 0], aL: [40, 10, 0, 0], aR: [40, 10, 0, 0], eL: 20, eR: 20 }, KFEET)), P(KN, Object.assign({ r: [0, 52, 2], o: [0, -6, 0], aL: [8, 10, 0, 0], aR: [8, 10, 0, 0] }, KFEET)), { up: 700, down: 1300, hb: 900 })
    }),
    hip_flexor_stretch: fl({ cam: { yaw: -80, pitch: 8 }, side: true, m: ['hipflex'], kf: hold(P(HK, { r: [0, 50, 2], o: [0, -6, 0], FL: ft(11, 46, { p: [0, 0.3, 1] }), aR: [172, 14, 0, 0], eR: 6, aL: [20, 10, 0, 0], eL: 40 })) }),
    psoas_reach: fl({ cam: { yaw: -30, pitch: 8 }, side: true, m: ['hipflex', 'obliques', 'lats'], kf: hold(P(HK, { r: [0, 50, 2], o: [0, -6, 0], FL: ft(11, 46, { p: [0, 0.3, 1] }), ch: [0, 20, 0], sp: [0, 8, 0], aR: [172, 22, 0, 0], eR: 8, aL: [10, 14, 0, 0], eL: 30 })) }),
    lizard: fl({
      cam: { yaw: -40, pitch: 16 }, side: true, m: ['hipflex', 'adductors', 'glutes'],
      kf: hold(P(Q, { r: [0, 34, -18], o: [0, 60, 0], nk: [-14, 0, 0], FL: ft(32, 40, { fy: 22, p: [1, 0.2, 0.5] }), FR: { t: [-10, 5, -70], ft: 160, p: [0, -0.3, 1] }, HL: hd(13, 4, 52, { d: [0, -0.1, 1] }), HR: hd(-15, 4, 52, { d: [0, -0.1, 1] }) }), { in: { r: [0, 32, -14] } })
    }),
    seiza: fl({ cam: { yaw: -70, pitch: 10 }, m: ['quads', 'tibialis'], kf: hold(P(KN, { r: [0, 22, -40], FL: { t: [7, 4, -38], ft: 162, p: [0, -1, 1] }, FR: { t: [-7, 4, -38], ft: 162, p: [0, -1, 1] }, HL: hd(11, 31, -4, { p: [1, 0, -0.5], d: [0, -0.3, 1] }), HR: hd(-11, 31, -4, { p: [-1, 0, -0.5], d: [0, -0.3, 1] }) })) }),
    wall_side_reach: fl({ cam: { yaw: 20, pitch: 10 }, side: true, props: [{ t: 'wall', x: -34, cz: -4, w: 120, h: 200 }], m: ['obliques', 'lats', 'hipflex'], kf: hold(P(HK, { r: [0, 50, 2], o: [0, -6, 0], FL: ft(11, 46, { p: [0, 0.3, 1] }), ch: [0, 22, 0], sp: [0, 8, 0], aR: [0, 168, 0, 0], eR: 6, aL: [10, 14, 0, 0], eL: 30 })) }),
    vertical_pull: fl({
      cam: { yaw: 30, pitch: 6 }, m: ['lats', 'biceps', 'rhomboids'], props: [{ t: 'bar', y: 236, w: 90 }, { t: 'band', from: [0, 235, 12], to: 'hands' }],
      kf: rep(P(KN, Object.assign({ HL: hd(20, 166, 10, { p: [1, 0, 0], d: [0, 1, 0] }), HR: hd(-20, 166, 10, { p: [-1, 0, 0], d: [0, 1, 0] }) }, KFEET)),
        P(KN, Object.assign({ ch: [-6, 0, 0], HL: hd(24, 128, 2, { p: [1, -0.6, -0.4], d: [0, 1, 0] }), HR: hd(-24, 128, 2, { p: [-1, -0.6, -0.4], d: [0, 1, 0] }) }, KFEET)), { up: 1000, down: 2600 })
    })
  });
})();
