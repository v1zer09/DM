// Запуск tools/tests.html в headless Chrome без зависимостей: node tools/run-tests.mjs
// Поднимает локальный статический сервер, открывает страницу тестов и ждёт window.TEST_RESULTS.
// Код выхода 0 — все тесты прошли. Путь к браузеру можно задать переменной CHROME_BIN.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 5 * 60 * 1000;
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const bin = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean)
  .find(b => spawnSync(b, ['--version'], { stdio: 'ignore' }).status === 0);
if (!bin) { console.error('Chrome не найден. Укажи путь в CHROME_BIN.'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-tests-'));
const chrome = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });

function finish(code) {
  try { chrome.kill('SIGKILL'); } catch (e) { }
  server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
  process.exit(code);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  // порт отладки Chrome пишет в файл DevToolsActivePort своего профиля
  let cdp = 0;
  for (let i = 0; i < 100 && !cdp; i++) { try { cdp = +fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { await sleep(100); } }
  if (!cdp) throw new Error('Chrome не запустился');
  const tab = await (await fetch('http://127.0.0.1:' + cdp + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = () => bad(new Error('нет связи с Chrome')); });
  let id = 0; const pending = new Map(), pageErrors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; pageErrors.push(String((d.exception && d.exception.description) || d.text).split('\n')[0]); }
  };
  // без ответа за 5 с считаем, что страница занята (тесты считают синхронно), и спрашиваем снова
  const send = (method, params = {}) => new Promise(resolve => {
    const my = ++id; pending.set(my, resolve);
    setTimeout(() => { if (pending.delete(my)) resolve(null); }, 5000);
    ws.send(JSON.stringify({ id: my, method, params }));
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/tools/tests.html' });

  let results = null; const t0 = Date.now();
  while (!results && Date.now() - t0 < TIMEOUT_MS) {
    await sleep(1000);
    const r = await send('Runtime.evaluate', { expression: 'window.TEST_RESULTS ? JSON.stringify(window.TEST_RESULTS) : ""', returnByValue: true });
    const v = r && r.result && r.result.result && r.result.result.value;
    if (v) results = JSON.parse(v);
  }
  if (!results) { console.error('Тесты не завершились за ' + TIMEOUT_MS / 1000 + ' с.'); for (const e of pageErrors) console.error('  ошибка страницы: ' + e); finish(1); }
  const failed = results.filter(r => !r.ok);
  for (const r of results) console.log((r.ok ? '  ok    ' : '  FAIL  ') + r.name + (r.ok ? '' : ' — ' + r.info));
  for (const e of pageErrors) console.log('  ошибка страницы: ' + e);
  console.log('\nПройдено ' + (results.length - failed.length) + ' из ' + results.length + ' за ' + Math.round((Date.now() - t0) / 1000) + ' с');
  finish(failed.length || pageErrors.length ? 1 : 0);
} catch (e) { console.error(e.message); finish(1); }
