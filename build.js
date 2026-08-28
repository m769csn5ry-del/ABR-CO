/* Génère les deux sorties à partir de src/app.html :
   - todo/index.html     PWA installable sur l'écran d'accueil iPhone
   - dist/artifact.html  version pour un Artifact claude.ai (sans html/head/body)

   La police display est encastrée en base64 : l'app reste distinctive
   ET utilisable hors connexion, sans requête vers un hébergeur de polices. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
let body = fs.readFileSync(path.join(root, 'src/app.html'), 'utf8');

const woff2 = fs.readFileSync(path.join(root, 'src/fonts/BodoniModa-latin.woff2'));
const fontFace = `/* Bodoni Moda, variable, sous-ensemble latin — SIL OFL 1.1 (src/fonts/OFL.txt).
   Encastrée en base64 : aucune requête réseau, disponible hors connexion. */
@font-face{
  font-family:"Bodoni Moda";
  font-style:normal;
  font-weight:400 700;
  font-display:block;
  src:url(data:font/woff2;base64,${woff2.toString('base64')}) format("woff2");
}`;

if (!body.includes('/* @FONT_FACE@ */')) throw new Error('marqueur @FONT_FACE@ introuvable dans src/app.html');
body = body.replace('/* @FONT_FACE@ */', fontFace);

const DESC = "Orga — l'agenda de tâches de DBR Studio : échéances, projets, priorités, sous-tâches, récurrences et séries. Tout reste sur l'appareil.";

const pwa = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>Orga — DBR Studio</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#E8EAEC">
<meta name="color-scheme" content="light dark">

<!-- Écran d'accueil iOS -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Orga">
<meta name="format-detection" content="telephone=no">
<link rel="apple-touch-icon" href="./icons/icon-180.png">
<link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png">
<link rel="manifest" href="./manifest.webmanifest">
</head>
<body>
${body}
</body>
</html>
`;

const artifact = `<title>Orga</title>
${body}
`;

fs.mkdirSync(path.join(root, 'todo'), { recursive: true });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'todo/index.html'), pwa);
fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifact);

const kb = (p) => (fs.statSync(path.join(root, p)).size / 1024).toFixed(0) + ' Ko';
console.log('todo/index.html    ', kb('todo/index.html'));
console.log('dist/artifact.html ', kb('dist/artifact.html'));
