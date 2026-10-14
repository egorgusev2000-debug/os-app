/* Standing exercises */
(function () {
  const { P, ft, hd, mirror, hold, rep, alt, seq } = PZ;
  const { S0, toes, walk, run } = MV;
  const ST = PZ.STAND, SW = PZ.STANDW;
  const HIPS = { HL: { t: [16, 5, -2], rel: 'P', p: [1, 0, -0.8], d: [0, -0.4, 1] }, HR: { t: [-16, 5, -2], rel: 'P', p: [-1, 0, -0.8], d: [0, -0.4, 1] } };
  const PRAY = { HL: { t: [2, -16, 19], rel: 'T', p: [1, -0.7, 0], d: [0, 1, 0.2] }, HR: { t: [-2, -16, 19], rel: 'T', p: [-1, -0.7, 0], d: [0, 1, 0.2] } };
  const GOBLET = { HL: { t: [4, -15, 20], rel: 'T', p: [1, -1, 0.2], d: [-0.6, 0.6, 0.3] }, HR: { t: [-4, -15, 20], rel: 'T', p: [-1, -1, 0.2], d: [0.6, 0.6, 0.3] } };
  const cam3 = { yaw: 35, pitch: 8 }, camSide = { yaw: -70, pitch: 8 };

  Object.assign(MOVES, {
    shoulder_circles: {
      cam: { yaw: 25, pitch: 8 }, focus: 'upper', ease: 'cr', m: ['traps', 'delts'],
      kf: [[0, 0], [2.5, 3.2], [4.6, 0], [2.2, -3.6]].map((s, i) => ({ p: P(S0, { sL: s, sR: s, aL: [2 + s[1] * 2, 9, 0, 0], aR: [2 + s[1] * 2, 9, 0, 0] }), d: 520, a: i === 2 ? 1 : 0.6 }))
    },
    trunk_swings: {
      cam: { yaw: 15, pitch: 10 }, ease: 'cr', m: ['obliques'],
      kf: [
        { p: P(S0, { o: [16, 0, 0], sp: [0, 0, 12], ch: [0, 0, 24], nk: [0, 0, 10], aL: [-25, 40, 0, 40], aR: [55, 30, 0, -70], eL: 30, eR: 40 }), d: 650, a: 1 },
        { p: P(S0, { aL: [10, 38, 0, 0], aR: [10, 38, 0, 0], eL: 20, eR: 20 }), d: 650, a: 0.4 },
        { p: P(S0, { o: [-16, 0, 0], sp: [0, 0, -12], ch: [0, 0, -24], nk: [0, 0, -10], aR: [-25, 40, 0, 40], aL: [55, 30, 0, -70], eL: 40, eR: 30 }), d: 650, a: 1 },
        { p: P(S0, { aL: [10, 38, 0, 0], aR: [10, 38, 0, 0], eL: 20, eR: 20 }), d: 650, a: 0.4 }
      ]
    },
    wave: {
      cam: camSide, ease: 'cr', m: ['glutes', 'calves', 'delts'],
      kf: [
        { p: P(S0, { r: [0, 88, -7], o: [0, 18, 0], ch: [6, 0, 0], aL: [-45, 10, 0, 0], aR: [-45, 10, 0, 0], eL: 10, eR: 10 }), d: 900, a: 0.5 },
        { p: P(S0, { r: [0, 106, 2], FL: toes(10, 0, 8), FR: toes(-10, 0, 8), ch: [-6, 0, 0], nk: [-8, 0, 0], aL: [172, 14, 0, 0], aR: [172, 14, 0, 0], eL: 5, eR: 5 }), d: 900, a: 1 }
      ]
    },
    march_clap: {
      cam: { yaw: 40, pitch: 8 }, m: ['hipflex', 'abs'],
      kf: alt(P(ST, { HL: { t: [30, -32, 8], rel: 'T', p: [1, 0, -0.3] }, HR: { t: [-30, -32, 8], rel: 'T', p: [-1, 0, -0.3] } }),
        P(ST, { r: [0, 97, 0], FL: { t: [10, 52, 26], ft: 30, p: [0, 0, 1] }, HL: { t: [3, -22, 30], rel: 'T', p: [1, -0.6, 0], d: [-0.5, 0.6, 0.6] }, HR: { t: [-3, -22, 30], rel: 'T', p: [-1, -0.6, 0], d: [0.5, 0.6, 0.6] } }), { d: 420 })
    },
    bounce: {
      cam: { yaw: 30, pitch: 8 }, ease: 'cr', m: ['calves', 'quads'],
      kf: [
        { p: P(S0, { r: [0, 103, 0], FL: toes(10, 0, 5), FR: toes(-10, 0, 5), aL: [8, 12, 0, 0], aR: [8, 12, 0, 0], eL: 25, eR: 25 }), d: 260, a: 1 },
        { p: P(S0, { r: [0, 93, -2], o: [0, 6, 0], aL: [-6, 12, 0, 0], aR: [-6, 12, 0, 0], eL: 10, eR: 10 }), d: 260, a: 0.6 }
      ]
    },
    hip_circles: {
      cam: { yaw: 30, pitch: 12 }, ease: 'cr', trail: 'P0', m: ['obliques', 'glutes'],
      kf: [[[0, 96.5, 6], [0, -9, 0], [8, 0, 0]], [[6, 96.5, 0], [0, 0, 7], [0, -6, 0]], [[0, 96.5, -6], [0, 10, 0], [-9, 0, 0]], [[-6, 96.5, 0], [0, 0, -7], [0, 6, 0]]]
        .map(([r, o, ch]) => ({ p: P(ST, Object.assign({ r, o, ch }, HIPS)), d: 520, a: 0.8 }))
    },
    leg_swings: {
      cam: camSide, ease: 'cr', m: ['hipflex', 'glutes', 'hams'],
      kf: [
        { p: P(ST, { FL: null, lL: [58, 4, 0, 0], kL: 6, fL: 10, aL: [-10, 48, 0, 0], aR: [10, 48, 0, 0], eL: 10, eR: 10 }), d: 700, a: 1 },
        { p: P(ST, { FL: null, lL: [-28, 4, 0, 0], kL: 10, fL: 20, o: [0, 6, 0], aL: [10, 48, 0, 0], aR: [-10, 48, 0, 0], eL: 10, eR: 10 }), d: 700, a: 0.7 }
      ]
    },
    calf_raise: {
      cam: camSide, m: ['calves'], focus: 'legs',
      kf: rep(S0, P(S0, { r: [0, 106.5, 1], FL: toes(10, 0, 9), FR: toes(-10, 0, 9) }), { up: 700, down: 1500, hb: 500 })
    },
    wall_angels: {
      cam: { yaw: 22, pitch: 6 }, props: [{ t: 'wall', z: -13.5, w: 110, h: 210 }], m: ['traps', 'rhomboids', 'rotator'],
      kf: rep(P(ST, { aL: [0, 78, 88, 0], aR: [0, 78, 88, 0], eL: 100, eR: 100, nk: [-4, 0, 0] }), P(ST, { aL: [0, 150, 88, 0], aR: [0, 150, 88, 0], eL: 28, eR: 28, nk: [-4, 0, 0] }), { up: 1300, down: 1300, ha: 300, hb: 300 })
    },
    wall_roll_down: {
      cam: { yaw: -65, pitch: 8 }, props: [{ t: 'wall', z: -13.5, w: 110 }], m: ['abs', 'erectors', 'hams'],
      kf: rep(P(S0, { r: [0, 97, 1] }), P(S0, { r: [0, 95, 2], o: [0, 14, 0], sp: [26, 0, 0], ch: [38, 0, 0], nk: [30, 0, 0], aL: [80, 6, 0, 0], aR: [80, 6, 0, 0], eL: 8, eR: 8 }), { up: 2200, down: 2200, ha: 400, hb: 700 })
    },
    wall_sit: {
      cam: { yaw: -62, pitch: 8 }, props: [{ t: 'wall', z: -13.5, w: 110 }], m: ['quads', 'glutes'],
      kf: hold(P(ST, { r: [0, 54, -2], FL: ft(11, 43), FR: ft(-11, 43), aL: [10, 10, 0, 0], aR: [10, 10, 0, 0], eL: 60, eR: 60 }), { a1: 0.9, a2: 1 })
    },
    wall_elong: {
      cam: { yaw: 25, pitch: 6 }, props: [{ t: 'wall', z: -13.5, w: 110, h: 220 }], m: ['erectors', 'traps'],
      kf: rep(P(ST, PZ.ARMS_DOWN), P(ST, { r: [0, 99, 0], nk: [-6, 0, 0], hd: [6, 0, 0], aL: [176, 18, 0, 0], aR: [176, 18, 0, 0], eL: 4, eR: 4 }), { up: 1800, down: 1800, hb: 1200 })
    },
    goddess_twist: {
      cam: { yaw: 10, pitch: 12 }, m: ['adductors', 'obliques', 'quads'],
      kf: alt(P(ST, { r: [0, 66, -4], o: [0, 12, 0], FL: ft(38, 4, { fy: 38, p: [1, 0, 0.8] }), FR: ft(-38, 4, { fy: 38, p: [-1, 0, 0.8] }), HL: hd(30, 66, 14, { p: [1, 0.4, -0.2] }), HR: hd(-30, 66, 14, { p: [-1, 0.4, -0.2] }) }),
        P(ST, { r: [0, 66, -4], o: [0, 12, 0], ch: [8, -12, 34], nk: [0, 0, 20], FL: ft(38, 4, { fy: 38, p: [1, 0, 0.8] }), FR: ft(-38, 4, { fy: 38, p: [-1, 0, 0.8] }), HL: hd(30, 66, 14, { p: [1, 0.4, -0.2] }), HR: hd(-30, 66, 14, { p: [-1, 0.4, -0.2] }) }), { d: 1100, hb: 900 })
    },
    squat_hold: {
      cam: { yaw: -40, pitch: 10 }, m: ['adductors', 'glutes', 'calves'],
      kf: hold(P(PZ.SQUAT, Object.assign({ aL: null, aR: null }, PRAY)))
    },
    squat: {
      cam: { yaw: -52, pitch: 8 }, m: ['quads', 'glutes', 'adductors'], props: [{ t: 'kb2h', off: [0, -6, 0] }],
      kf: rep(P(SW, GOBLET), P(PZ.SQUAT, Object.assign({}, GOBLET, { aL: null, aR: null })), { ab: 2400, ba: 1000, ha: 300, hb: 250 })
    },
    hinge: {
      cam: { yaw: -80, pitch: 6 }, m: ['hams', 'glutes', 'erectors'], props: [{ t: 'kb', hand: 'both' }],
      kf: rep(P(ST, { aL: [2, 6, 0, 0], aR: [2, 6, 0, 0], eL: 4, eR: 4 }), P(ST, { r: [0, 93, -17], o: [0, 68, 0], nk: [-22, 0, 0], aL: [68, 6, 0, 0], aR: [68, 6, 0, 0], eL: 4, eR: 4 }), { ab: 2400, ba: 1100, ha: 200, hb: 250 })
    },
    row: {
      cam: { yaw: -60, pitch: 8 }, m: ['lats', 'rhomboids', 'biceps'], props: [{ t: 'band', from: [0, 101, 135], to: 'hands' }],
      kf: rep(P(ST, { r: [0, 95, 0], o: [0, 8, 0], HL: hd(11, 101, 52, { p: [1, -0.4, -0.6] }), HR: hd(-11, 101, 52, { p: [-1, -0.4, -0.6] }) }),
        P(ST, { r: [0, 95, 0], o: [0, 8, 0], ch: [-6, 0, 0], HL: hd(18, 102, 10, { p: [0.4, 0, -1] }), HR: hd(-18, 102, 10, { p: [-0.4, 0, -1] }) }), { up: 1100, down: 1700, hb: 400 })
    },
    face_pull: {
      cam: { yaw: -55, pitch: 6 }, m: ['rearDelts', 'rotator', 'traps'], props: [{ t: 'band', from: [0, 168, 140], to: 'hands' }],
      kf: rep(P(ST, { HL: hd(10, 162, 54, { p: [1, 0, -0.5] }), HR: hd(-10, 162, 54, { p: [-1, 0, -0.5] }) }),
        P(ST, { ch: [-4, 0, 0], HL: hd(23, 165, 4, { p: [1, 0.6, -0.6], d: [0, 1, 0] }), HR: hd(-23, 165, 4, { p: [-1, 0.6, -0.6], d: [0, 1, 0] }) }), { up: 1000, down: 1500, hb: 500 })
    },
    band_pull: {
      cam: { yaw: 25, pitch: 6 }, focus: 'upper', m: ['rearDelts', 'rhomboids', 'traps'], props: [{ t: 'band', to: 'between' }],
      kf: rep(P(ST, { aL: [88, 2, 0, -4], aR: [88, 2, 0, -4], eL: 3, eR: 3 }), P(ST, { ch: [-4, 0, 0], aL: [88, 2, 0, 82], aR: [88, 2, 0, 82], eL: 3, eR: 3 }), { up: 900, down: 1400, hb: 400 })
    },
    ext_rot: {
      cam: { yaw: 10, pitch: 18 }, focus: 'upper', m: ['rotator', 'rearDelts'], props: [{ t: 'band', from: [-75, 107, 22], to: 'TL' }],
      kf: rep(P(ST, { aL: [0, 8, -30, 0], eL: 90 }), P(ST, { aL: [0, 8, 62, 0], eL: 90 }), { up: 1000, down: 1600, hb: 400 })
    },
    pallof: {
      cam: { yaw: 20, pitch: 10 }, m: ['obliques', 'abs'], props: [{ t: 'band', from: [85, 124, 8], to: 'hands' }],
      kf: rep(P(SW, { r: [0, 94, 0], HL: hd(3, 124, 18, { p: [1, -0.8, 0] }), HR: hd(-3, 124, 18, { p: [-1, -0.8, 0] }) }),
        P(SW, { r: [0, 94, 0], HL: hd(3, 125, 56, { p: [1, -0.8, 0] }), HR: hd(-3, 125, 56, { p: [-1, -0.8, 0] }) }), { up: 900, down: 900, hb: 1800 })
    },
    overhead_press: {
      cam: { yaw: 30, pitch: 4 }, m: ['delts', 'triceps', 'abs'], props: [{ t: 'db', hand: 'both' }],
      kf: rep(P(ST, { HL: { t: [21, 3, 12], rel: 'T', p: [1, -1, 0.4], d: [0, 1, 0] }, HR: { t: [-21, 3, 12], rel: 'T', p: [-1, -1, 0.4], d: [0, 1, 0] } }),
        P(ST, { HL: { t: [15, 50, 3], rel: 'T', p: [1, 0, 0], d: [0, 1, 0] }, HR: { t: [-15, 50, 3], rel: 'T', p: [-1, 0, 0], d: [0, 1, 0] } }), { up: 1000, down: 1800 })
    },
    lunge: {
      cam: { yaw: -70, pitch: 8 }, side: true, m: ['quads', 'glutes'],
      kf: rep(P(S0, { aL: [2, 10, 0, 0], aR: [2, 10, 0, 0] }), P(S0, { r: [0, 57, -20], FL: ft(10, 19, { p: [0, 0, 1] }), FR: toes(-10, -60, 10, { p: [0, -0.4, 1] }), aL: [8, 10, 0, 0], aR: [8, 10, 0, 0] }), { ab: 1700, ba: 1100, ha: 200, hb: 250 })
    },
    cossack: {
      cam: { yaw: 8, pitch: 10 }, m: ['adductors', 'glutes', 'quads'],
      kf: alt(P(ST, { r: [0, 86, -2], FL: ft(44, 0, { fy: 20, p: [1, 0, 0.6] }), FR: ft(-44, 0, { fy: 20, p: [-1, 0, 0.6] }), aL: [60, 10, 0, -10], aR: [60, 10, 0, -10], eL: 30, eR: 30 }),
        P(ST, { r: [24, 50, -10], o: [0, 26, 0], ch: [6, 0, 0], FL: ft(44, 0, { fy: 25, p: [0.8, 0, 1] }), FR: { t: [-44, 10, 0], ft: -32, fy: 20, p: [0, 1, 0] }, aL: [80, 0, 0, -20], aR: [80, 0, 0, -20], eL: 20, eR: 20 }), { d: 1100, hb: 500 })
    },
    bss: {
      cam: { yaw: -72, pitch: 8 }, side: true, m: ['quads', 'glutes'], props: [{ t: 'bench', x0: -22, x1: 6, z0: -82, z1: -44, h: 45 }],
      kf: rep(P(S0, { r: [0, 93, -12], FL: ft(10, 22, { p: [0, 0, 1] }), FR: { t: [-10, 54, -60], ft: 150, p: [0, -0.3, 1] }, o: [0, 6, 0] }),
        P(S0, { r: [0, 60, -16], o: [0, 14, 0], FL: ft(10, 22, { p: [0, 0, 1] }), FR: { t: [-10, 54, -60], ft: 150, p: [0, -0.5, 1] } }), { ab: 1800, ba: 1000, ha: 200, hb: 250 })
    },
    deadlift: {
      cam: { yaw: -75, pitch: 6 }, m: ['glutes', 'hams', 'erectors'], props: [{ t: 'kb2h', off: [0, -6, 0], r: 11 }],
      kf: rep(P(SW, { r: [0, 70, -20], o: [0, 50, 0], nk: [-24, 0, 0], FL: ft(14, 0, { p: [0.3, 0, 1] }), FR: ft(-14, 0, { p: [-0.3, 0, 1] }), HL: hd(7, 38, 7, { p: [1, 0, -0.4] }), HR: hd(-7, 38, 7, { p: [-1, 0, -0.4] }) }),
        P(SW, { FL: ft(14, 0, { p: [0.3, 0, 1] }), FR: ft(-14, 0, { p: [-0.3, 0, 1] }), HL: hd(8, 82, 7, { p: [1, 0, -0.4] }), HR: hd(-8, 82, 7, { p: [-1, 0, -0.4] }) }), { up: 1100, down: 1500, ha: 500 })
    },
    kb_swing: {
      cam: { yaw: -80, pitch: 6 }, m: ['glutes', 'hams', 'abs'], props: [{ t: 'kb2h', off: [0, -7, 0] }],
      kf: [
        { p: P(SW, { r: [0, 88, -19], o: [0, 58, 0], nk: [-25, 0, 0], FL: ft(16, 0, { p: [0.3, 0, 1] }), FR: ft(-16, 0, { p: [-0.3, 0, 1] }), HL: hd(6, 70, -10, { p: [1, 0, -0.2] }), HR: hd(-6, 70, -10, { p: [-1, 0, -0.2] }) }), d: 480, a: 0.6 },
        { p: P(SW, { ch: [-3, 0, 0], FL: ft(16, 0, { p: [0.3, 0, 1] }), FR: ft(-16, 0, { p: [-0.3, 0, 1] }), HL: hd(6, 128, 50, { p: [1, 0, -0.2] }), HR: hd(-6, 128, 50, { p: [-1, 0, -0.2] }) }), d: 620, a: 1 }
      ]
    },
    pendulum: {
      cam: { yaw: -40, pitch: 10 }, ease: 'cr', trail: 'TR', m: ['rotator', 'delts'],
      kf: [[0, 0], [10, 10], [0, 18], [-10, 10]].map(([f, a]) => ({ p: P(ST, { r: [0, 93, -10], o: [0, 72, 0], nk: [-20, 0, 0], FL: ft(12, 20, { p: [0, 0, 1] }), FR: ft(-12, -18), HL: hd(16, 62, 22, { p: [1, 0, -0.3] }), aR: [72 + f, 6 + a, 0, 0], eR: 6 }), d: 600, a: 0.7 }))
    },
    pec_stretch: {
      cam: { yaw: -30, pitch: 8 }, side: true, props: [{ t: 'wall', x: 49, cz: 0, w: 140, h: 210 }], m: ['chest', 'delts'],
      kf: hold(P(ST, { o: [-22, 0, 0], aL: [0, 90, 88, 22], eL: 92 }), { a1: 0.8, a2: 1 })
    },
    chin_tuck: {
      cam: { yaw: -75, pitch: 4 }, focus: 'head', m: ['neckFlex'],
      kf: rep(P(S0, { nk: [14, 0, 0], hd: [-14, 0, 0] }), P(S0, { nk: [-5, 0, 0], hd: [9, 0, 0] }), { up: 800, down: 900, hb: 1800, ha: 300 })
    },
    neck_stretch: {
      cam: { yaw: 14, pitch: 6 }, focus: 'upper', side: true, m: ['traps', 'neckSide'],
      kf: hold(P(ST, { nk: [4, -32, 0], sL: [-2, 0], aL: [2, 12, 0, 0], eL: 4, HR: { t: [8, 2, 1], rel: 'H', p: [-1, 1, 0.2], d: [0.2, -1, 0] } }), { a1: 0.8, a2: 1 })
    },
    neck_iso: {
      cam: { yaw: 30, pitch: 4 }, focus: 'upper', m: ['neckFlex', 'neckExt'],
      kf: (() => {
        const down = (s) => ({ t: [s * 22, -62, 0], rel: 'H', p: [s, -1, -0.5] });
        const front = { HL: { t: [3, 4, 11], rel: 'H', p: [1, -0.6, 0.4], d: [-0.3, 0.4, -0.8] }, HR: { t: [-3, 4, 11], rel: 'H', p: [-1, -0.6, 0.4], d: [0.3, 0.4, -0.8] } };
        const back = { HL: { t: [4, 2, -10], rel: 'H', p: [1, 0.5, 0], d: [-0.6, 0.3, 0.6] }, HR: { t: [-4, 2, -10], rel: 'H', p: [-1, 0.5, 0], d: [0.6, 0.3, 0.6] } };
        const left = { HL: { t: [9.5, 2, 1], rel: 'H', p: [1, -1, 0], d: [0, 1, 0] }, HR: down(-1) };
        const right = { HR: { t: [-9.5, 2, 1], rel: 'H', p: [-1, -1, 0], d: [0, 1, 0] }, HL: down(1) };
        // a hand travelling between the head and the hip goes round the outside of the shoulder, not through it
        const out = (s) => ({ t: [s * 34, -24, 12], rel: 'H', p: [s, -1, 0], d: [0, 1, 0] });
        const press = h => ({ p: P(ST, h), d: 900, h: 1300, a: 1 });
        const via = h => ({ p: P(ST, h), d: 500, a: 0.4 });
        return [press(front), Object.assign(press(back), { d: 500 }), via({ HL: left.HL, HR: out(-1) }), Object.assign(press(left), { d: 500 }), via({ HL: out(1), HR: out(-1) }),
          Object.assign(press(right), { d: 500 }), via({ HL: out(1), HR: right.HR })];
      })()
    },
    hinge_drill: {
      cam: { yaw: -80, pitch: 6 }, m: ['hams', 'glutes'], props: [{ t: 'stick' }],
      kf: rep(P(ST, { HR: { t: [-4, -9, -13], rel: 'H', p: [-1, 0.7, 0.1], d: [0.2, 1, -0.2] }, HL: { t: [5, 4, -15], rel: 'P', p: [1, 0, 0.2] } }),
        P(ST, { r: [0, 93, -15], o: [0, 60, 0], nk: [-14, 0, 0], HR: { t: [-4, -9, -13], rel: 'H', p: [-1, 0.7, 0.1], d: [0.2, 1, -0.2] }, HL: { t: [5, 4, -15], rel: 'P', p: [1, 0, 0.2] } }), { up: 1100, down: 1800 })
    },
    sl_rdl: {
      cam: { yaw: -78, pitch: 6 }, side: true, m: ['hams', 'glutes'], props: [{ t: 'kb', hand: 'R' }],
      kf: rep(P(ST, { FR: null, lR: [0, 3, 0, 0], kR: 4, aR: [2, 6, 0, 0], eR: 4, aL: [2, 20, 0, 0] }),
        P(ST, { FR: null, r: [0, 95, -10], o: [0, 74, 0], nk: [-22, 0, 0], lR: [-4, 2, 0, 0], kR: 4, fR: 10, aR: [74, 6, 0, 0], eR: 4, aL: [60, 35, 0, 0], eL: 10, FL: ft(10, 0, { p: [0, 0, 1] }) }), { ab: 1900, ba: 1100, ha: 200, hb: 250 })
    },
    one_arm_row: {
      cam: { yaw: -60, pitch: 10 }, side: true, m: ['lats', 'rhomboids'], props: [{ t: 'kb', hand: 'R' }],
      kf: rep(P(ST, { r: [0, 90, -4], o: [0, 45, 0], nk: [-14, 0, 0], FL: ft(12, 26, { p: [0, 0, 1] }), FR: ft(-12, -30), HL: hd(14, 74, 30, { p: [1, 0, -0.2] }), aR: [45, 6, 0, 0], eR: 5 }),
        P(ST, { r: [0, 90, -4], o: [0, 45, 0], nk: [-14, 0, 0], ch: [0, 0, -6], FL: ft(12, 26, { p: [0, 0, 1] }), FR: ft(-12, -30), HL: hd(14, 74, 30, { p: [1, 0, -0.2] }), aR: [-22, 14, 0, 0], eR: 100 }), { up: 900, down: 1600, hb: 400 })
    },
    band_walk: {
      cam: { yaw: 8, pitch: 10 }, m: ['abductors', 'glutes'], props: [{ t: 'miniband', at: 'knees' }],
      kf: (() => {
        const base = x => ({ r: [x, 84, -6], o: [0, 20, 0], ch: [4, 0, 0], aL: [40, 10, 0, 0], aR: [40, 10, 0, 0], eL: 60, eR: 60 });
        const F = (x, up) => up ? { t: [x, 18, 0], ft: 6, p: [x > 0 ? 0.4 : -0.4, 0, 1] } : ft(x, 0, { p: [x > 0 ? 0.4 : -0.4, 0, 1] });
        return [
          { p: P(ST, Object.assign(base(0), { FL: F(13), FR: F(-13) })), d: 420, a: 0.6 },
          { p: P(ST, Object.assign(base(4), { FL: F(24, 1), FR: F(-13) })), d: 420, a: 1 },
          { p: P(ST, Object.assign(base(9), { FL: F(31), FR: F(-13) })), d: 420, a: 0.8 },
          { p: P(ST, Object.assign(base(14), { FL: F(31), FR: F(1, 1) })), d: 420, a: 1 },
          { p: P(ST, Object.assign(base(18), { FL: F(31), FR: F(5) })), d: 420, a: 0.6 },
          { p: P(ST, Object.assign(base(14), { FL: F(20, 1), FR: F(5) })), d: 420, a: 1 },
          { p: P(ST, Object.assign(base(9), { FL: F(13), FR: F(5) })), d: 420, a: 0.8 },
          { p: P(ST, Object.assign(base(4), { FL: F(13), FR: F(-6, 1) })), d: 420, a: 1 }
        ];
      })()
    },
    snack: {
      cam: { yaw: -45, pitch: 8 }, m: ['quads', 'glutes'],
      kf: rep(P(SW, { aL: [10, 10, 0, 0], aR: [10, 10, 0, 0] }), P(SW, { r: [0, 62, -14], o: [0, 30, 0], ch: [6, 0, 0], nk: [-18, 0, 0], FL: ft(16, 0, { fy: 12, p: [0.5, 0, 1] }), FR: ft(-16, 0, { fy: 12, p: [-0.5, 0, 1] }), aL: [88, 10, 0, 0], aR: [88, 10, 0, 0] }), { up: 450, down: 450 })
    },
    walking: { cam: { yaw: -60, pitch: 8 }, ease: 'cr', m: ['glutes', 'calves'], kf: walk() },
    barefoot: { cam: { yaw: -60, pitch: 10 }, ease: 'cr', m: ['feet', 'calves'], kf: walk({ d: 420, stride: 26, swing: 18 }) },
    japan_walk: { cam: { yaw: -60, pitch: 8 }, ease: 'cr', m: ['glutes', 'quads'], kf: walk({ d: 300, stride: 38, swing: 36, elbow: 50 }) },
    rucking: { cam: { yaw: -60, pitch: 8 }, ease: 'cr', m: ['glutes', 'erectors'], props: [{ t: 'pack' }], kf: walk({ d: 380, stride: 30, swing: 16, lean: 6 }) },
    carry: {
      cam: { yaw: -50, pitch: 8 }, ease: 'cr', m: ['forearms', 'traps', 'abs'], props: [{ t: 'kb', hand: 'both' }],
      kf: walk({ d: 380, stride: 26, swing: 1, elbow: 4 }).map(k => ({ p: P(k.p, { aL: [0, 12, 0, 0], aR: [0, 12, 0, 0], eL: 4, eR: 4, sL: [-1, 0], sR: [-1, 0] }), d: k.d, a: 1 }))
    },
    suitcase: {
      cam: { yaw: -30, pitch: 8 }, ease: 'cr', m: ['obliques', 'forearms'], props: [{ t: 'kb', hand: 'L' }],
      kf: walk({ d: 380, stride: 26, swing: 16 }).map(k => ({ p: P(k.p, { aL: [0, 12, 0, 0], eL: 4, sL: [-1, 0] }), d: k.d, a: 1 }))
    },
    zone2: { cam: { yaw: -60, pitch: 8 }, ease: 'cr', m: ['quads', 'calves'], kf: run({ d: 230, stride: 42, lean: 5 }) },
    intervals_4x4: { cam: { yaw: -60, pitch: 8 }, ease: 'cr', m: ['quads', 'glutes', 'calves'], kf: run({ d: 175, stride: 60, lean: 9 }) },
    rope: {
      cam: { yaw: 20, pitch: 6 }, ease: 'cr', ropePhase: true, m: ['calves'], props: [{ t: 'rope' }],
      lift: s => { const ph = ((s.i || 0) + (s.k || 0)) / 2; return Math.max(0, Math.sin(ph * Math.PI * 2)) * 5; },
      kf: [
        { p: P(S0, { r: [0, 102, 0], FL: toes(9, 0, 4), FR: toes(-9, 0, 4), aL: [14, 26, 0, 0], aR: [14, 26, 0, 0], eL: 45, eR: 45 }), d: 230, a: 1 },
        { p: P(S0, { r: [0, 99, 0], FL: toes(9, 0, 2), FR: toes(-9, 0, 2), aL: [10, 22, 0, 0], aR: [10, 22, 0, 0], eL: 40, eR: 40 }), d: 230, a: 0.6 }
      ]
    },
    worlds_greatest: {
      cam: { yaw: -35, pitch: 14 }, side: true, m: ['hipflex', 'glutes', 'obliques'],
      kf: (() => {
        const base = { r: [0, 50, -30], o: [0, 62, 0], nk: [-12, 0, 0], FL: ft(18, 40, { p: [0.5, 0, 1] }), FR: toes(-10, -82, 12, { p: [0, -0.5, 1] }) };
        return [
          { p: P(ST, Object.assign({}, base, { HL: hd(8, 4, 50, { d: [0, -0.1, 1] }), HR: hd(-16, 4, 50, { d: [0, -0.1, 1] }) })), d: 1000, h: 300, a: 0.5 },
          { p: P(ST, Object.assign({}, base, { HL: hd(10, 30, 36, { p: [1, 0, -0.5] }), HR: hd(-16, 4, 50, { d: [0, -0.1, 1] }) })), d: 900, h: 300, a: 0.8 },
          { p: P(ST, Object.assign({}, base, { ch: [-4, 0, 52], nk: [0, 0, 30], HL: hd(26, 140, 34, { p: [1, 0, -0.5], d: [0, 1, 0] }), HR: hd(-16, 4, 50, { d: [0, -0.1, 1] }) })), d: 1100, h: 900, a: 1 }
        ];
      })()
    },
    ball_foot: {
      cam: { yaw: -40, pitch: 16 }, focus: 'legs', ease: 'cr', m: ['feet'], props: [{ t: 'ball', foot: 'L', r: 3.6 }],
      kf: [{ p: P(S0, { r: [0, 99, 0], FL: { t: [11, 16, 6], ft: 4, p: [0, 0, 1] } }), d: 700, a: 1 }, { p: P(S0, { r: [0, 99, 0], FL: { t: [11, 16, -6], ft: -6, p: [0, 0, 1] } }), d: 700, a: 0.7 }]
    }
  });
})();
