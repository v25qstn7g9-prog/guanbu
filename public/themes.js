/* Presentation only: never redraw a reading or modify application data. */
(() => {
  const root = document.documentElement;
  const themes = ['guanbu-ink', 'guanbu-quiet', 'guanbu-editorial'];
  let theme = 'guanbu-quiet';
  try {
    const saved = localStorage.getItem('guanbu-theme');
    if (themes.includes(saved)) theme = saved;
  } catch (_) { /* Private browsing may disable persistence. */ }
  root.dataset.formaTheme = theme;
  function setup() {
    const select = document.getElementById('forma-theme-select');
    if (!select) return;
    select.value = theme;
    select.addEventListener('change', () => {
      if (!themes.includes(select.value)) return;
      theme = select.value;
      root.dataset.formaTheme = theme;
      try { localStorage.setItem('guanbu-theme', theme); } catch (_) { /* Keep the current choice in memory. */ }
    });
    function labels() {
      const lang = root.getAttribute('lang');
      const names = lang === 'en' ? ['01 · Eastern space', '02 · Quiet luxury', '03 · Modern editorial']
        : lang === 'id' ? ['01 · Ruang Timur', '02 · Elegan tenang', '03 · Editorial modern']
        : ['① 東方留白', '② 靜謐精品', '③ 現代編輯'];
      select.setAttribute('aria-label', lang === 'en' ? 'Visual theme' : lang === 'id' ? 'Tema tampilan' : '版面主題');
      for (const option of select.options) option.textContent = names[themes.indexOf(option.value)];
    }
    labels();
    new MutationObserver(labels).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
