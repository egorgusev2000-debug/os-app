// Базовая проверка: приложение открывается без ошибок, все вкладки рисуются, ничего не вылезает вбок.
// Скриншоты каждой вкладки — в test-results/shots/ (их удобно просматривать после правок).
const { test, expect } = require('@playwright/test');

const IGNORED = /ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|fonts\.g/;

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !IGNORED.test(m.text())) errors.push(m.text()); });
  return errors;
}
const overflowX = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const tab = (page, id) => page.evaluate(t => document.querySelector(`[data-act="tab"][data-v="${t}"]`).click(), id);

test('первый экран: 3D-фигура и кнопки', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByText('Пропустить').first()).toBeVisible();
  expect(await page.locator('canvas').count()).toBeGreaterThan(0);
  const engine = await page.evaluate(() => ({ moves: Object.keys(MOVES).length, body: !!window.OS3H_M }));
  expect(engine.moves).toBeGreaterThan(100);
  expect(engine.body).toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-onboarding.png` });
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('все вкладки открываются', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByText('Пропустить').first().click();
  for (const t of ['today', 'move', 'food', 'progress']) {
    await tab(page, t);
    await page.waitForTimeout(500);
    expect(await overflowX(page), `вкладка «${t}» вылезает вбок`).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/shots/${info.project.name}-${t}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('анкета проходится до конца', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
  await click('[data-act="onb-next"]');
  await click('[data-act="onb-sex"][data-v="f"]');
  await click('[data-act="onb-next"]');
  await click('[data-act="onb-age"][data-v="40"]');
  for (let i = 0; i < 6; i++) await click('[data-act="onb-next"]');
  await page.waitForTimeout(600);
  // после анкеты — экран «Ваш план готов», с него можно начать или осмотреться
  await expect(page.getByText('Ваш план готов')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-plan.png` });
  await click('.planov [data-act="ov-back"]');
  await page.waitForTimeout(400);
  await expect(page.locator('#overlay')).toBeHidden();
  expect(errors).toEqual([]);
});
