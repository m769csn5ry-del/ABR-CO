/* Icônes d'écran d'accueil : monogramme didone champagne sur encre.
   Rendu par Chromium (Playwright) — la police est encastrée pour que
   le tracé soit exactement celui de l'app.
   Usage : NODE_PATH=/opt/node22/lib/node_modules node scripts/icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'todo/icons');
const FONT = fs.readFileSync(path.join(root, 'src/fonts/BodoniModa-latin.woff2')).toString('base64');

const INK = '#111318';
const CHAMPAGNE = '#CBA968';

function page(size, inset, variant) {
  const s = size;
  const glyph = Math.round(s * (1 - inset * 2));
  const ring = Math.round(s * (1 - inset * 2));
  const mark = variant === 'ring'
    ? `<svg width="${ring}" height="${ring}" viewBox="0 0 100 100" fill="none">
         <circle cx="50" cy="50" r="40" stroke="${CHAMPAGNE}" stroke-opacity=".45" stroke-width="2.5"/>
         <path d="M30 51.5 44 65 71 34" stroke="${CHAMPAGNE}" stroke-width="8"
               stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<span class="o" style="font-size:${glyph}px">O</span>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:"Bodoni Moda";font-weight:400 700;font-display:block;
    src:url(data:font/woff2;base64,${FONT}) format("woff2")}
  html,body{margin:0;padding:0;width:${s}px;height:${s}px;overflow:hidden;background:${INK}}
  .i{position:relative;width:${s}px;height:${s}px;display:grid;place-items:center;background:${INK}}
  .i::after{content:"";position:absolute;inset:0;
    background:radial-gradient(105% 85% at 76% 6%,rgba(203,169,104,.20),transparent 62%)}
  .o{font-family:"Bodoni Moda",serif;font-weight:600;font-optical-sizing:auto;
     color:${CHAMPAGNE};line-height:.74;position:relative;z-index:2;
     display:block;transform:translateY(-1.5%)}
  svg{position:relative;z-index:2}
  </style></head><body><div class="i">${mark}</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const variant = process.env.ICON_VARIANT || 'mono';
  const targets = [
    ['icon-180.png', 180, 0.20],
    ['icon-192.png', 192, 0.20],
    ['icon-512.png', 512, 0.20],
    ['icon-maskable-512.png', 512, 0.30]
  ];
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, size, inset] of targets) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(page(size, inset, variant), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name) });
    await p.close();
    console.log('✓', name, size + '×' + size, '(' + variant + ')');
  }
  await browser.close();
})();
