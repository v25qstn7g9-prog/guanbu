const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const screenshots = path.resolve(__dirname, '../test-artifacts/source-review/themes');
const themes = ['guanbu-quiet', 'guanbu-ink', 'guanbu-editorial'];
const modules = ['yijing', 'tarot', 'runes', 'daily', 'ziwei'];
let browser, server, base;
before(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const root = path.resolve(__dirname, '../public');
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(404).end();
    fs.readFile(file, (error, bytes) => {
      res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
      res.writeHead(error ? 404 : 200).end(error ? '' : bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function page(width = 375, init) {
  const p = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(5000);
  await p.route('https://fonts.googleapis.com/**', route => route.abort());
  await p.route('**/ask', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, explanation: 'Synthetic test reading.' }) }));
  if (init) await p.addInitScript(init);
  await p.goto(base);
  return p;
}
async function draw(p, mod) {
  await p.locator(`[data-t=${mod}]`).click();
  if (mod === 'ziwei') { await p.locator('#zw-date').fill('1990-01-01'); await p.locator('#zw-hour').fill('12:00'); }
  await p.locator(`#${mod}-btn`).click();
  await p.waitForFunction(mod => !document.querySelector(`#${mod}-result .ritual`) && !!document.querySelector(`#${mod}-result .oracle`), mod);
  await p.waitForFunction(mod => !document.querySelector(`#${mod}-result .thinking`), mod);
}
test('three accessible themes default to quiet and persist across reloads', async () => {
  const p = await page();
  try {
    assert.equal(await p.locator('html').getAttribute('data-forma-theme'), 'guanbu-quiet');
    const selector = p.locator('#forma-theme-select');
    assert.deepEqual((await selector.locator('option').evaluateAll(options => options.map(option => option.value))).sort(), [...themes].sort());
    assert.ok(await selector.evaluate(e => !!(e.labels?.length || e.getAttribute('aria-label'))));
    for (const theme of themes) {
      await selector.selectOption(theme);
      assert.equal(await p.locator('html').getAttribute('data-forma-theme'), theme);
      assert.equal(await p.evaluate(() => localStorage.getItem('guanbu-theme')), theme);
      await p.reload();
      assert.equal(await selector.inputValue(), theme);
      assert.equal(await p.locator('html').getAttribute('data-forma-theme'), theme);
    }
  } finally { await p.close(); }
});
test('invalid stored theme falls back to quiet', async () => {
  const p = await page(375, () => localStorage.setItem('guanbu-theme', 'not-a-theme'));
  try { assert.equal(await p.locator('html').getAttribute('data-forma-theme'), 'guanbu-quiet'); assert.equal(await p.locator('#forma-theme-select').inputValue(), 'guanbu-quiet'); }
  finally { await p.close(); }
});
test('denied storage does not prevent selecting a theme or using the app', async () => {
  const p = await page(375, () => { for (const method of ['getItem', 'setItem']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(key, ...args) { if (key === 'guanbu-theme') throw new DOMException('Storage denied', 'SecurityError'); return original.call(this, key, ...args); }; } });
  try {
    assert.equal(await p.locator('html').getAttribute('data-forma-theme'), 'guanbu-quiet');
    await p.locator('#forma-theme-select').selectOption('guanbu-ink');
    assert.equal(await p.locator('html').getAttribute('data-forma-theme'), 'guanbu-ink');
    await draw(p, 'tarot');
    assert.equal(await p.locator('.tcard').count(), 1);
  } finally { await p.close(); }
});
test('theme switching preserves every generated reading and form value without new AI requests', async () => {
  const p = await page();
  try {
    let requests = 0;
    p.on('request', request => { if (request.url().endsWith('/ask')) requests++; });
    await p.locator('#yijing-question').fill('Synthetic question');
    await p.locator('#yijing-cast').selectOption('manual');
    for (let i = 1; i <= 6; i++) await p.locator(`#yj-line-${i}`).selectOption(i === 1 ? '9' : '8');
    for (const mod of modules) await draw(p, mod);
    assert.equal(requests, 5);
    const results = await p.locator('[id$="-result"]').evaluateAll(nodes => nodes.map(node => node.innerHTML));
    const inputs = await p.locator('input,select:not(#forma-theme-select)').evaluateAll(nodes => nodes.map(node => [node.id, node.value]));
    for (const theme of themes) {
      await p.locator('#forma-theme-select').selectOption(theme);
      assert.deepEqual(await p.locator('[id$="-result"]').evaluateAll(nodes => nodes.map(node => node.innerHTML)), results);
      assert.deepEqual(await p.locator('input,select:not(#forma-theme-select)').evaluateAll(nodes => nodes.map(node => [node.id, node.value])), inputs);
      assert.equal(requests, 5);
    }
  } finally { await p.close(); }
});
test('all themes fit all modules on mobile and desktop, with two-column manual lines', async () => {
  const p = await page();
  try {
    for (const mod of modules) await draw(p, mod);
    for (const width of [320, 375, 430, 1280]) {
      await p.setViewportSize({ width, height: 900 });
      for (const theme of themes) {
        await p.locator('#forma-theme-select').selectOption(theme);
        const schemes = await p.locator('input[type=date],input[type=time]').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).colorScheme));
        assert.ok(schemes.every(scheme => scheme === (theme === 'guanbu-quiet' ? 'dark' : 'light')), `${theme} native control scheme: ${schemes}`);
        for (const mod of modules) {
          await p.locator(`[data-t=${mod}]`).click();
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} ${theme} ${mod}`);
          if ([375, 1280].includes(width)) await p.screenshot({ path: path.join(screenshots, `${theme}-${width}-${mod}.png`), fullPage: true });
          const small = await p.locator('button,input,select').evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().width).filter(node => node.getBoundingClientRect().height < 44 || (['INPUT', 'SELECT'].includes(node.tagName) && parseFloat(getComputedStyle(node).fontSize) < 16)).map(node => node.id || node.textContent));
          assert.deepEqual(small, [], `${width} ${theme} ${mod}`);
        }
        await p.locator('[data-t=yijing]').click();
        await p.locator('#yijing-cast').selectOption('manual');
        assert.equal(await p.locator('#yj-manual select').evaluateAll(nodes => new Set(nodes.map(node => Math.round(node.getBoundingClientRect().top))).size), 3, `${width} ${theme}`);
      }
    }
  } finally { await p.close(); }
});
test('theme selector supports keyboard and visible focus with reduced motion', async () => {
  const p = await page();
  try {
    const selector = p.locator('#forma-theme-select');
    await selector.focus();
    await p.keyboard.press('Home'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    assert.equal(await p.locator('html').getAttribute('data-forma-theme'), await selector.inputValue());
    const focus = await selector.evaluate(node => ({ focused: document.activeElement === node, width: parseFloat(getComputedStyle(node).outlineWidth), style: getComputedStyle(node).outlineStyle }));
    assert.equal(focus.focused, true); assert.ok(focus.width >= 2 && focus.style !== 'none', JSON.stringify(focus));
    await draw(p, 'tarot');
    const animated = await p.locator('.reveal > *, .tcard').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).animationName !== 'none' && getComputedStyle(node).animationDuration.split(',').some(value => parseFloat(value) > 0.01)).map(node => node.className));
    assert.deepEqual(animated, []);
  } finally { await p.close(); }
});
