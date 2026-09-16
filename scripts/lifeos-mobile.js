/* Audit de la version mobile : débordements, textes trop petits, contenu
   masqué par la barre d'onglets, feuilles qui ne tiennent pas à l'écran.
   Usage : NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-mobile.js [captures] */
const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.LIFEOS_URL || 'http://127.0.0.1:8099/';
const SHOTS = process.argv[2] || null;
const VIEWS = ['home', 'today', 'planning', 'calendar', 'tasks', 'projects',
               'goals', 'finance', 'habits', 'stats', 'notes', 'assistant', 'settings'];

/* iPhone 15 : la largeur la plus contraignante du parc actuel. */
const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 15', width: 393, height: 852 }
];

const INSPECT = () => {
  const out = [];
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - doc.clientWidth;
  if (overflow > 1) out.push('débordement horizontal de ' + overflow + ' px');

  /* Un élément plus large que l'écran force le défilement latéral, sauf s'il
     est lui-même dans une zone prévue pour défiler. */
  document.querySelectorAll('.view *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > doc.clientWidth + 2 || r.left < -2) {
      let scroller = el.parentElement, inScroller = false;
      while (scroller && scroller !== document.body) {
        const s = getComputedStyle(scroller);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') { inScroller = true; break; }
        scroller = scroller.parentElement;
      }
      if (!inScroller) {
        const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
        out.push('déborde : ' + el.tagName.toLowerCase() + '.' + String(cls).split(/\s+/)[0] +
          ' (' + Math.round(r.left) + '→' + Math.round(r.right) + ')');
      }
    }
  });

  /* Texte trop petit pour être lu confortablement sur un téléphone. */
  const small = new Set();
  document.querySelectorAll('.view *').forEach((el) => {
    const text = Array.from(el.childNodes).filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim()).join('');
    if (text.length < 2) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11) {
      const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
      small.add(el.tagName.toLowerCase() + '.' + String(cls).split(/\s+/)[0] + ' ' + size + 'px');
    }
  });
  small.forEach((v) => out.push('texte à ' + v));

  /* Le dernier contenu doit rester au-dessus de la barre d'onglets. */
  const tabbar = document.querySelector('.tabbar');
  const view = document.querySelector('.view');
  if (tabbar && view) {
    const last = view.lastElementChild;
    if (last) {
      const bottom = last.getBoundingClientRect().bottom + window.scrollY;
      const pageEnd = document.body.scrollHeight;
      if (pageEnd - bottom < tabbar.getBoundingClientRect().height - 4) {
        out.push('contenu trop proche de la barre d\'onglets');
      }
    }
  }
  return out;
};

(async () => {
  const browser = await chromium.launch();
  const findings = [];

  for (const device of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR'
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => findings.push(device.name + ' · exception : ' + e.message));

    await page.goto(BASE, { waitUntil: 'networkidle' });
    if (await page.locator('.auth__panel').count()) {
      await page.fill('.auth__panel input.input', 'Mobile');
      await page.click('.auth__panel .btn--primary');
      await page.waitForSelector('.shell');
      await page.evaluate(() => window.LifeOS.store.update((s) => { window.LifeOS.seed.demo(s); }, 'demo'));
      await page.waitForTimeout(600);
      if (await page.locator('.scrim').count()) await page.keyboard.press('Escape');
    }

    for (const view of VIEWS) {
      await page.evaluate((v) => { window.location.hash = '#/' + v; }, view);
      await page.waitForTimeout(420);
      const problems = await page.evaluate(INSPECT);
      problems.forEach((p) => findings.push(device.name + ' · ' + view + ' · ' + p));
      if (SHOTS && device.name === 'iPhone 15') {
        await page.screenshot({ path: path.join(SHOTS, 'm-' + view + '.png'), fullPage: false });
      }
    }

    /* Les feuilles : une fenêtre doit tenir à l'écran et rester défilable. */
    await page.evaluate(() => { window.location.hash = '#/tasks'; });
    await page.waitForTimeout(350);
    const sheets = [
      ['tâche', () => window.LifeOS.forms.task()],
      ['ajout rapide', () => window.LifeOS.forms.quickTask()],
      ['transaction', () => window.LifeOS.forms.transaction(null, { type: 'expense' })],
      ['objectif', () => window.LifeOS.forms.goal()],
      ['habitude', () => window.LifeOS.forms.habit()],
      ['note', () => window.LifeOS.forms.note()],
      ['projet', () => window.LifeOS.forms.project()],
      ['événement', () => window.LifeOS.forms.event()],
      ['je suis perdu', () => window.LifeOS.views.lost()],
      ['barre de commandes', () => window.LifeOS.palette.open()]
    ];
    for (const [name, open] of sheets) {
      await page.evaluate(open);
      await page.waitForTimeout(420);
      const sheet = await page.evaluate(() => {
        const node = document.querySelector('.modal,.palette');
        if (!node) return { missing: true };
        const r = node.getBoundingClientRect();
        const body = node.querySelector('.modal__body,.palette__list');
        const foot = node.querySelector('.modal__foot');
        return {
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          height: Math.round(r.height), viewport: window.innerHeight,
          width: Math.round(r.width), pageWidth: document.documentElement.clientWidth,
          scrollable: body ? body.scrollHeight > body.clientHeight + 2 : false,
          bodyVisible: body ? body.getBoundingClientRect().height > 40 : false,
          footVisible: foot ? foot.getBoundingClientRect().bottom <= window.innerHeight + 1 : true
        };
      });
      if (sheet.missing) { findings.push(device.name + ' · feuille « ' + name + ' » ne s\'ouvre pas'); continue; }
      if (sheet.bottom > sheet.viewport + 2) findings.push(device.name + ' · feuille « ' + name + ' » dépasse en bas (' + sheet.bottom + ' > ' + sheet.viewport + ')');
      if (sheet.width > sheet.pageWidth + 1) findings.push(device.name + ' · feuille « ' + name + ' » plus large que l\'écran');
      if (!sheet.bodyVisible) findings.push(device.name + ' · feuille « ' + name + ' » sans contenu visible');
      if (!sheet.footVisible) findings.push(device.name + ' · feuille « ' + name + ' » : boutons hors écran');
      if (SHOTS && device.name === 'iPhone 15' && (name === 'tâche' || name === 'je suis perdu')) {
        await page.screenshot({ path: path.join(SHOTS, 'm-sheet-' + name.replace(/\s/g, '-') + '.png') });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }

    await ctx.close();
  }

  await browser.close();
  if (findings.length) {
    findings.forEach((f) => console.log('  ✗ ' + f));
    console.log('\n' + findings.length + ' points à corriger.');
    process.exitCode = 1;
  } else {
    console.log('Version mobile : rien à signaler.');
  }
})();
