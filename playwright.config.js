// Проверка после каждой правки: телефоны 360–390 px, светлая и тёмная тема.
// Первый запуск: npm install, затем npx playwright install chromium
const { defineConfig } = require('@playwright/test');

const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const phone = (width, colorScheme) => ({
  name: `${width}-${colorScheme}`,
  use: { viewport: { width, height: 800 }, deviceScaleFactor: 2, colorScheme, launchOptions: { args: gl } }
});

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: { command: 'npx serve -l 5173 .', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60000 },
  projects: [phone(360, 'light'), phone(360, 'dark'), phone(375, 'light'), phone(390, 'light'), phone(390, 'dark')]
});
