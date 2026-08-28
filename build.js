/* Génère les deux sorties à partir de src/app.html :
   - todo/index.html : PWA installable sur l'écran d'accueil iPhone
   - dist/artifact.html : version pour un Artifact claude.ai (sans html/head/body) */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const body = fs.readFileSync(path.join(root, 'src/app.html'), 'utf8');

const DESC = 'Orga — to-do list pour organiser tes journées : échéances, projets, priorités, sous-tâches, récurrences et habitudes. Tout reste sur ton iPhone.';

const pwa = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>Orga</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#F4F3FB">
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
console.log('todo/index.html    ', fs.statSync(path.join(root,'todo/index.html')).size, 'octets');
console.log('dist/artifact.html ', fs.statSync(path.join(root,'dist/artifact.html')).size, 'octets');
