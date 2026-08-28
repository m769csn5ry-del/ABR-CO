const { chromium } = require('playwright');
const path = require('path');

const OUT = '/home/user/ABR-CO/todo/icons';

function page(size, inset) {
  const s = size, pad = Math.round(s * inset);
  const box = s - pad * 2;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;width:${s}px;height:${s}px;overflow:hidden}
  .i{position:relative;width:${s}px;height:${s}px;
     background:linear-gradient(135deg,#7C5CFF 0%,#B14BFF 45%,#FF4D8D 100%);}
  .i::after{content:"";position:absolute;inset:0;
     background:radial-gradient(115% 85% at 82% 12%,rgba(255,255,255,.34),transparent 60%)}
  svg{position:absolute;left:${pad}px;top:${pad}px;width:${box}px;height:${box}px;z-index:2}
  </style></head><body><div class="i">
  <svg viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,.45)" stroke-width="5"/>
    <path d="M31 51.5 L44 64 L69 37" stroke="#fff" stroke-width="10"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const targets = [
    ['icon-180.png', 180, 0.16],
    ['icon-192.png', 192, 0.16],
    ['icon-512.png', 512, 0.16],
    ['icon-maskable-512.png', 512, 0.26]
  ];
  for (const [name, size, inset] of targets) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(page(size, inset), { waitUntil: 'load' });
    await p.screenshot({ path: path.join(OUT, name), omitBackground: false });
    await p.close();
    console.log('✓', name, size + 'x' + size);
  }
  await browser.close();
})();
