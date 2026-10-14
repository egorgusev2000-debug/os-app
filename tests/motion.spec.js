// Плавность движений: ни один сустав не «перескакивает». Считаем скорость колен, локтей, кистей, стоп, головы и таза
// на каждом кадре (60 в секунду) по всем упражнениям. Быстрее 10 м/с суставы у нас не двигаются даже в беге,
// поэтому большее значение — это рывок или вывернутый сустав.
const { test, expect } = require('@playwright/test');

const MAX_CM_S = 1000;

test('движения без рывков и перескоков суставов', async ({ page }, info) => {
  test.skip(info.project.name !== '360-light', 'достаточно одного размера экрана');
  await page.goto('/');
  const bad = await page.evaluate(max => {
    const PTS = ['KL', 'KR', 'EL', 'ER', 'WL', 'WR', 'AL', 'AR', 'HC', 'P0'];
    const out = [];
    Object.entries(MOVES).forEach(([id, d0]) => {
      const def = Object.assign({}, d0, { ease: d0.ease || 'cr' });
      delete def._pr;
      const pr = OS3D.prep(def);
      const dt = 1000 / 60;
      let prev = null, peak = 0, at = '';
      for (let t = 0; t < pr.total; t += dt) {
        const sk = OS3D.solve(OS3D.sample(pr, t).p);
        if (prev) PTS.forEach(k => {
          const a = sk[k], b = prev[k];
          const v = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / dt * 1000;
          if (v > peak) { peak = v; at = k; }
        });
        prev = {};
        PTS.forEach(k => { prev[k] = sk[k].slice(); });
      }
      if (peak > max) out.push(`${id}: ${at} ${Math.round(peak)} см/с`);
    });
    return out;
  }, MAX_CM_S);
  expect(bad, 'упражнения с рывком сустава').toEqual([]);
});
