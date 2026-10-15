// Собирает приложение в один файл для публикации на claude.ai.
// Приложение Claude на iPhone открывает страницу артефакта, но не загружает её дополнительные файлы
// (стили, скрипты), поэтому публикуем всё внутри одной страницы.
//   node tools/build-single.js
// dist/os-app.html       — для публикации (без <!doctype>/<html>/<head>/<body>: их добавляет claude.ai)
// dist/os-app.local.html — та же страница в такой же обёртке, для проверки в браузере
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

// head: title, theme colours and Google Fonts stay as they are; local stylesheets go inline
const headOut = head
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, f) => `<style>/* ${f} */\n${read(f)}\n</style>`);

// body: local scripts go inline, in the same order; "</script" inside code would end the tag early
const bodyOut = body.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => `<script>/* ${f} */\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);

const page = headOut.trim() + '\n' + bodyOut.trim() + '\n';
if (/(?:src|href)="(?:css|src)\//.test(page)) throw new Error('в странице остались ссылки на отдельные файлы');

// the same wrapper claude.ai adds when it publishes a page
const wrap = p => '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"></head><body>' + p + '</body></html>\n';

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/os-app.html'), page);
fs.writeFileSync(path.join(root, 'dist/os-app.local.html'), wrap(page));
console.log('dist/os-app.html', Math.round(page.length / 1024), 'КБ');
