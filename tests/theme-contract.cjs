const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../public');
const themes = ['guanbu-quiet', 'guanbu-ink', 'guanbu-editorial'];
function loadTheme(stored, denied = false) {
  const values = new Map(stored === undefined ? [] : [['guanbu-theme', stored]]);
  const events = {};
  const attributes = { lang: 'zh-Hant' };
  const element = { dataset: {}, getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; } };
  const selector = { value: '', options: themes.map(value => ({ value, textContent: '' })), addEventListener: (event, fn) => { events[event] = fn; }, setAttribute() {} };
  const document = { documentElement: element, readyState: 'complete', getElementById: id => id === 'forma-theme-select' ? selector : null, addEventListener: (event, fn) => { if (event === 'DOMContentLoaded') fn(); } };
  const localStorage = { getItem: key => { if (denied) throw new Error('Storage denied'); return values.get(key) ?? null; }, setItem: (key, value) => { if (denied) throw new Error('Storage denied'); values.set(key, value); } };
  const context = { document, localStorage, MutationObserver: class { observe() {} }, console };
  context.window = context;
  assert.ok(fs.existsSync(path.join(root, 'themes.js')), 'theme controller must exist');
  vm.runInNewContext(fs.readFileSync(path.join(root, 'themes.js'), 'utf8'), context, { filename: 'themes.js' });
  return { values, selector, element, change(value) { selector.value = value; assert.equal(typeof events.change, 'function', 'selector has a change listener'); events.change.call(selector, { target: selector }); } };
}
test('document opts into default quiet theme and loads its independent theme layer', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<html[^>]*data-forma-theme="guanbu-quiet"/);
  assert.match(html, /<link[^>]*href="(?:\.\/)?themes\.css"/);
  assert.match(html, /<script[^>]*src="(?:\.\/)?themes\.js"/);
  assert.match(html, /<select[^>]*id="forma-theme-select"/);
  for (const theme of themes) assert.ok(html.includes(`value="${theme}"`));
});
test('theme controller defaults to quiet and restores a valid stored theme', () => {
  for (const stored of [undefined, ...themes]) {
    const app = loadTheme(stored);
    assert.equal(app.element.dataset.formaTheme, stored || 'guanbu-quiet');
    assert.equal(app.selector.value, stored || 'guanbu-quiet');
  }
});
test('invalid stored theme is not applied', () => {
  const app = loadTheme('invalid-theme');
  assert.equal(app.element.dataset.formaTheme, 'guanbu-quiet');
  assert.equal(app.selector.value, 'guanbu-quiet');
});
test('theme selection updates only presentation state and remembers the selection', () => {
  const app = loadTheme();
  for (const theme of themes) {
    app.change(theme);
    assert.equal(app.element.dataset.formaTheme, theme);
    assert.equal(app.values.get('guanbu-theme'), theme);
  }
  assert.deepEqual([...app.values.keys()], ['guanbu-theme']);
});
test('theme selection survives blocked persistent storage', () => {
  const app = loadTheme(undefined, true);
  assert.equal(app.element.dataset.formaTheme, 'guanbu-quiet');
  app.change('guanbu-ink');
  assert.equal(app.element.dataset.formaTheme, 'guanbu-ink');
});
