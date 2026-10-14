/* rest skeleton and bone list for the skinned body (main thread) */
const OS3R = (function () {
  const REST = { r: [0, 97.5, 0], aL: [6, 40, 0, 0], aR: [6, 40, 0, 0], eL: 12, eR: 12, lL: [0, 7, 3, 0], lR: [0, 7, 3, 0], kL: 3, kR: 3, fL: 0, fR: 0 };
  const at = (base, F, v) => [base[0] + F[0] * v[0] + F[1] * v[1] + F[2] * v[2], base[1] + F[3] * v[0] + F[4] * v[1] + F[5] * v[2], base[2] + F[6] * v[0] + F[7] * v[1] + F[8] * v[2]];
  // [name, origin joint, frame, segment start, segment end, typical radius]
  const DEF = [['pelvis', 'P0', 'Fp', sk => at(sk.P0, sk.Fp, [0, -4, -1]), 'SB', 13], ['lumbar', 'SB', 'Fl', 'SB', 'L1', 12], ['thorax', 'L1', 'Ft', 'L1', 'C7', 13], ['neck', 'C7', 'Fn', 'C7', 'HB', 5.5], ['head', 'HB', 'Fh', 'HB', 'HC', 9]];
  ['L', 'R'].forEach(s => DEF.push(['ua' + s, 'S' + s, 'Fu' + s, 'S' + s, 'E' + s, 5.5], ['fa' + s, 'E' + s, 'Ff' + s, 'E' + s, 'W' + s, 4], ['hand' + s, 'W' + s, 'Fw' + s, 'W' + s, 'T' + s, 3], ['th' + s, 'H' + s, 'Fth' + s, 'H' + s, 'K' + s, 8.5], ['sh' + s, 'K' + s, 'Fsh' + s, 'K' + s, 'A' + s, 5], ['foot' + s, 'A' + s, 'Fa' + s, 'Heel' + s, 'Toe' + s, 3.5]));
  function restModel() {
    const def = { kf: [{ p: REST, d: 1000 }], m: [] };
    const pr = OS3D.prep(def);
    return OS3D.buildModel(OS3D.sample(pr, 0).p, def);
  }
  function input(h) {
    const sk = restModel().sk;
    input.sk = sk;
    const pick = {};
    Object.keys(sk).forEach(k => { const v = sk[k]; if (Array.isArray(v) && (v.length === 3 || v.length === 9) && typeof v[0] === 'number') pick[k] = v.slice(); });
    const RAD = JSON.parse(JSON.stringify(OS3D.RAD));
    const bones = DEF.map(d => ({ n: d[0], a: typeof d[3] === 'function' ? d[3](sk) : sk[d[3]].slice(), b: sk[d[4]].slice(), r: d[5] }));
    return { sex: OS3D.BODY.sex, sk: pick, RAD, lv: sk.lv.map(l => ({ c: l.c.slice(), a: l.a, b: l.b })), bones, h: h || 1.1 };
  }
  return { REST, DEF, input, restModel };
})();
