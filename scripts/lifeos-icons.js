/* Icônes d'écran d'accueil de LifeOS : monogramme blanc sur encre.
   Rendu par Chromium (Playwright) pour obtenir un tracé net à chaque taille.
   Usage : NODE_PATH=/opt/node22/lib/node_modules node scripts/lifeos-icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'lifeos', 'icons');
const INK = '#0E0E10';

function page(size, inset, radius) {
  const glyph = Math.round(size * (1 - inset * 2) * 0.86);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}
    html,body{width:${size}px;height:${size}px;background:transparent}
    .plate{
      width:${size}px;height:${size}px;border-radius:${radius}px;background:${INK};
      display:grid;place-items:center;overflow:hidden;position:relative;
    }
    .plate::after{
      content:"";position:absolute;inset:0;
      background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,0) 55%);
    }
    .mark{
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
      font-size:${glyph}px;font-weight:700;letter-spacing:-.06em;color:#fff;
      line-height:1;transform:translateY(-2%);
    }
  </style></head><body><div class="plate"><span class="mark">L</span></div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const files = [
    ['icon-180.png', 180, 0.18, 40],
    ['icon-192.png', 192, 0.18, 43],
    ['icon-512.png', 512, 0.18, 114],
    ['icon-maskable-512.png', 512, 0.28, 0]
  ];
  for (const [name, size, inset, radius] of files) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(page(size, inset, radius));
    await p.screenshot({ path: path.join(OUT, name), omitBackground: true });
    await p.close();
    console.log(name, size + 'px');
  }
  await browser.close();
})();
