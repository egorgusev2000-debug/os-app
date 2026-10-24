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

test('в тренировке можно сделать легче и заменить упражнение', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByText('Пропустить').first().click();
  const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
  // первое занятие дня на «Сегодня», без отсчёта «Приготовьтесь»
  await click('[data-act="go-s"]');
  await page.waitForTimeout(400);
  await click('[data-act="pl-skip"]');
  await page.waitForTimeout(600);
  const name = () => page.locator('#pname').textContent();
  const before = await name();
  if (await page.locator('[data-act="pl-easy"]').count()) {
    await click('[data-act="pl-easy"]');
    await page.waitForTimeout(400);
    await expect(page.locator('.peasy')).toBeVisible();
  }
  await click('[data-act="pl-swap"]');
  await page.waitForTimeout(500);
  await expect(page.getByText('Заменить упражнение')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-swap.png` });
  await click('.swi[data-act="pl-swap-to"]');
  await page.waitForTimeout(600);
  expect(await name()).not.toBe(before);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-swapped.png` });
  // выбор запомнился: в настройках есть строка, которая возвращает план как был
  await click('[data-act="pl-x"]');
  await page.waitForTimeout(300);
  await click('[data-act="pl-end"]');
  await page.waitForTimeout(800);
  await click('[data-act="pl-close"]');
  await tab(page, 'progress');
  await click('.gearb');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-act="adapt-reset"]')).toBeVisible();
  expect(errors).toEqual([]);
});

// На claude.ai публикуем одним файлом: приложение Claude на iPhone не загружает дополнительные файлы страницы.
// Собираем его так же, как перед публикацией, и проверяем, что он работает сам по себе.
test('приложение одним файлом открывается и рисует фигуру', async ({ page }, info) => {
  test.skip(info.project.name !== '360-light', 'достаточно одного раза');
  require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, '..', 'tools', 'build-single.js')]);
  const errors = collectErrors(page);
  const outside = [];
  page.on('request', r => { const u = r.url(); if (/localhost/.test(u) && !/dist\/os-app\.local/.test(u)) outside.push(u); });
  await page.goto('/dist/os-app.local.html');
  await expect(page.getByText('Пропустить').first()).toBeVisible();
  expect(await page.evaluate(() => !!(window.OS3H_M && window.OS3H_M.P && Object.keys(MOVES).length > 100))).toBe(true);
  await page.getByText('Пропустить').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-single.png` });
  expect(outside, 'страница не должна грузить отдельные файлы').toEqual([]);
  expect(errors).toEqual([]);
});

test('цель плана добавляет занятия, витрина зон запускает тренировку', async ({ page }, info) => {
  test.skip(!/^(360|390)-/.test(info.project.name), 'двух размеров достаточно');
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByText('Пропустить').first().click();
  const click = sel => page.evaluate(s => document.querySelector(s).click(), sel);
  await tab(page, 'move');
  await page.waitForTimeout(500);
  await click('.goal[data-v="neck"]');
  await page.waitForTimeout(500);
  await expect(page.locator('.goal[data-v="neck"][aria-pressed="true"]')).toHaveCount(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('os-all-v1')).goals);
  expect(saved).toContain('neck');
  // the neck ladder step is in the week now (Tuesday)
  await click('.pday[data-v$="|1"]');
  await page.waitForTimeout(400);
  await expect(page.getByText('Шея: шаг 1').first()).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-goals.png` });
  await click('.ztile[data-v="lowback"]');
  await page.waitForTimeout(500);
  await expect(page.locator('#sheet .swi').first()).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-zshow.png` });
  await click('#sheet .swi');
  await page.waitForTimeout(800);
  await expect(page.locator('#player')).toBeVisible();
  expect(errors).toEqual([]);
});

test('в карточке упражнения есть схема: начало и работа, мышцы', async ({ page }, info) => {
  test.skip(info.project.name !== '390-dark', 'одного размера достаточно');
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByText('Пропустить').first().click();
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="tx" data-act="ex" data-v="squat"></button>'); document.getElementById('tx').click(); });
  await page.waitForTimeout(4000);
  await expect(page.locator('#ex-scheme canvas')).toHaveCount(2);
  await expect(page.locator('#ex-scheme .sch-m')).toContainText('ягодичные');
  // the picture is drawn: the middle of the working pose is not empty
  const painted = await page.evaluate(() => { const cv = document.querySelectorAll('#ex-scheme canvas')[1]; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  expect(painted).toBeGreaterThan(100);
  await page.locator('#ex-scheme').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-scheme.png` });
  expect(errors).toEqual([]);
});

test('челлендж «Планка 30 дней»: таблица, таймер, отметка дня', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.clock.install();
  await page.goto('/');
  // with the test clock the page's animations do not settle, so tap without waiting for them
  await page.evaluate(() => document.querySelector('[data-act="onb-skip"]').click());
  await tab(page, 'progress');
  await expect(page.locator('.chal')).toHaveCount(2);
  await expect(page.locator('.chal').first().locator('.cday')).toHaveCount(30);
  expect(await page.locator('.chal').first().locator('.cday.rest').count()).toBe(4);
  await page.evaluate(() => document.querySelector('[data-act="chal-go"]').click());
  await expect(page.locator('#ch-t')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-chal-timer.png` });
  await page.clock.fastForward(5400);
  await page.clock.fastForward(21000);
  await expect(page.getByText('День 1 выполнен')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-chal-done.png` });
  await page.evaluate(() => document.querySelector('#sheet [data-act="close"]').click());
  await expect(page.locator('.cday.done')).toHaveCount(1);
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await page.locator('.chal').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-chal-card.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('челлендж «Приседания 30 дней»: повторы и кнопка «Сделал»', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => document.querySelector('[data-act="onb-skip"]').click());
  await tab(page, 'progress');
  const card = page.locator('.chal').nth(1);
  await expect(card.locator('.cday')).toHaveCount(30);
  await expect(card.locator('[data-act="chal-go"]')).toContainText('15 раз');
  await card.locator('[data-act="chal-go"]').evaluate(b => b.click());
  await expect(page.locator('#sheet [data-act="chal-done"]')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-squat-sheet.png` });
  await page.evaluate(() => document.querySelector('#sheet [data-act="chal-done"]').click());
  await expect(page.getByText('День 1 выполнен')).toBeVisible();
  await page.evaluate(() => document.querySelector('#sheet [data-act="close"]').click());
  await expect(card.locator('.cday.done')).toHaveCount(1);
  await expect(card.locator('.btn[disabled]')).toContainText('Следующий день');
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-squat-card.png` });
  expect(errors).toEqual([]);
});
