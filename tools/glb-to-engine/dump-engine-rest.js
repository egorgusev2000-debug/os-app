// Выгружает исходную позу движка (скелет, кости и процедурное тело) в engine_rest.json —
// это вход для convert.py. Запуск из корня проекта: node tools/glb-to-engine/dump-engine-rest.js
const { chromium } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(1500);
  const rest = await page.evaluate(() => {
    const inp = OS3R.input(1.2);
    const d = OS3B(inp);
    return {
      sk: inp.sk, bones: inp.bones, def: OS3R.DEF.map(x => [x[0], x[1], x[2]]),
      P: Array.from(d.P), CL: Array.from(d.CL), LM: Array.from(d.LM), RL: Array.from(d.RL), nv: d.nv, sex: OS3D.BODY.sex
    };
  });
  const out = path.join(__dirname, 'engine_rest.json');
  fs.writeFileSync(out, JSON.stringify(rest));
  await browser.close();
  server.close();
  console.log(`Готово: ${out} (вершин процедурного тела: ${rest.nv}, пол: ${rest.sex})`);
});
