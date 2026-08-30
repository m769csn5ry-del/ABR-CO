# Outils design & test

Ce dépôt embarque des *skills* d'agent (design / animation) et une base de tests
Playwright. Tout est versionné : rien à réinstaller après un `git clone`.

## 1. Playwright — test du navigateur

```bash
npm install          # une seule fois
npm test             # construit, sert le dépôt, lance les tests
npx playwright test --ui   # mode interactif
```

`playwright.config.js` démarre `node build.js && node scripts/serve.js 4173`, puis
teste `/todo/` sur deux profils : **desktop** (Desktop Chrome) et **mobile**
(iPhone 13). Les tests de `tests/smoke.spec.js` couvrent le chargement, les quatre
onglets, la création d'une tâche, la fermeture des feuilles, l'absence d'erreur
console et le débordement horizontal de 375 px à 1440 px.

La version est épinglée à `@playwright/test` 1.56.1 pour coller au Chromium
préinstallé dans les conteneurs Claude Code (`/opt/pw-browsers`) ; la config
n'utilise ce binaire que s'il existe, sinon Playwright prend le sien.

`scripts/serve.js` est aussi utilisable seul : `node scripts/serve.js` sert la
racine du dépôt, donc `/todo/`, `/game/` et `/dist/`.

## 2. Skills installées

26 skills dans `.claude/skills/`, posées par
[`skills`](https://www.npmjs.com/package/skills) et suivies par `skills-lock.json`.

**[Taste Skill](https://www.tasteskill.dev/)** — `Leonxlnx/taste-skill`
: `brandkit`, `design-taste-frontend`, `design-taste-frontend-v1`,
`full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `image-to-code`,
`imagegen-frontend-mobile`, `imagegen-frontend-web`, `industrial-brutalist-ui`,
`minimalist-ui`, `redesign-existing-projects`, `stitch-design-taste`.

**[Emil Kowalski](https://emilkowal.ski/skill)** — `emilkowalski/skills`
: `animate`, `animate-expo`, `animation-vocabulary`, `apple-design`, `ask-sonner`,
`emil-design-eng`, `find-animation-opportunities`, `improve-animations`,
`pick-ui-library`, `prototype`, `review-animations`, `write-swift`.

Mise à jour : `npx skills update -p`. Liste : `npx skills ls`.

## 3. Reste à faire (bloqué par la politique réseau)

Deux ressources n'ont pas pu être posées depuis le conteneur : le proxy de session
refuse la connexion (`403`) vers leurs domaines. Elles s'installent sans problème
depuis une machine locale.

**Impeccable** — `impeccable.style` bloqué.

```bash
npx impeccable install     # puis, dans Claude Code :  /impeccable init
```

**getdesign.md** — `getdesign.md` bloqué. Récupérer le `DESIGN.md` depuis
<https://getdesign.md/> et le déposer à la racine du dépôt ; il sert ensuite de
référence visuelle unique pour les skills ci-dessus.
