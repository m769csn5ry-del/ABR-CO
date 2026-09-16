/* Audit d'accessibilité de LifeOS : noms accessibles, étiquettes de champs,
   contraste du texte, cibles tactiles, visibilité du focus.
   Usage : NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-a11y.js */
const { chromium } = require('playwright');
const BASE = process.env.LIFEOS_URL || 'http://127.0.0.1:8099/';
const VIEWS = ['home', 'today', 'planning', 'calendar', 'tasks', 'projects',
               'goals', 'finance', 'habits', 'stats', 'notes', 'assistant', 'settings'];

const AUDIT = () => {
  const out = { unnamed: [], unlabeled: [], contrast: [], small: [] };

  const parse = (color) => {
    const m = String(color).match(/[\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
  };
  const mix = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const backdrop = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0.85) return bg;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const describe = (el) => {
    const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
    return el.tagName.toLowerCase() + (cls ? '.' + String(cls).split(/\s+/).slice(0, 2).join('.') : '');
  };

  /* 1. Tout élément actionnable doit annoncer ce qu'il fait. */
  document.querySelectorAll('button,a[href],[role="button"]').forEach((el) => {
    if (!visible(el)) return;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (!name) out.unnamed.push(describe(el));
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) out.small.push(describe(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  });

  /* 2. Tout champ doit être étiqueté. */
  document.querySelectorAll('input,select,textarea').forEach((el) => {
    if (!visible(el) || el.type === 'hidden') return;
    const labelled = el.closest('label') || el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') || (el.id && document.querySelector('label[for="' + el.id + '"]'));
    if (!labelled) out.unlabeled.push(describe(el));
  });

  /* 3. Contraste du texte : 4,5:1, ou 3:1 pour les grands caractères. */
  const seen = new Set();
  document.querySelectorAll('*').forEach((el) => {
    if (!visible(el)) return;
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (text.length < 2) return;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    if (!fg) return;
    const bg = backdrop(el);
    const value = ratio(mix(fg, bg), bg);
    const size = parseFloat(style.fontSize);
    const bold = +style.fontWeight >= 600;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (value < need) {
      const key = describe(el) + Math.round(value * 10);
      if (!seen.has(key)) {
        seen.add(key);
        out.contrast.push(describe(el) + ' ' + value.toFixed(2) + ':1 (exigé ' + need + ') « ' + text.slice(0, 30) + ' »');
      }
    }
  });
  return out;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('.auth__panel input.input', 'Audit');
  await page.click('.auth__panel .btn--primary');
  await page.waitForSelector('.shell');
  await page.evaluate(() => window.LifeOS.store.update((s) => { window.LifeOS.seed.demo(s); }, 'demo'));
  await page.waitForTimeout(600);
  if (await page.locator('.scrim').count()) await page.keyboard.press('Escape');

  const problems = { unnamed: new Set(), unlabeled: new Set(), contrast: new Set(), small: new Set() };
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => {
      window.LifeOS.store.setSetting('theme', t);
      window.LifeOS.app.applyTheme();
    }, theme);
    for (const view of VIEWS) {
      await page.evaluate((v) => { window.location.hash = '#/' + v; }, view);
      await page.waitForTimeout(350);
      const res = await page.evaluate(AUDIT);
      Object.keys(problems).forEach((k) => res[k].forEach((v) => problems[k].add(theme + ' · ' + view + ' · ' + v)));
    }
  }

  /* Le focus doit rester visible au clavier. */
  await page.evaluate(() => { window.location.hash = '#/tasks'; });
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  const focusVisible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const s = getComputedStyle(el);
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  });

  await browser.close();

  let total = 0;
  Object.keys(problems).forEach((k) => {
    const list = Array.from(problems[k]);
    total += list.length;
    const titles = {
      unnamed: 'Éléments actionnables sans nom accessible',
      unlabeled: 'Champs sans étiquette',
      contrast: 'Contrastes insuffisants',
      small: 'Cibles tactiles sous 24 px'
    };
    console.log('\n' + titles[k] + ' : ' + list.length);
    list.slice(0, 12).forEach((v) => console.log('  · ' + v));
    if (list.length > 12) console.log('  … et ' + (list.length - 12) + ' autres');
  });
  console.log('\nFocus visible au clavier : ' + (focusVisible ? 'oui' : 'NON'));
  if (!focusVisible) total++;
  console.log(total ? '\n' + total + ' points à corriger.' : '\nAucun problème détecté.');
  if (total) process.exitCode = 1;
})();
