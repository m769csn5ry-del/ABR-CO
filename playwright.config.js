/* Playwright — test du site, des interactions, du responsive et des erreurs console.
   `npm test` construit le projet, démarre scripts/serve.js puis lance les tests. */
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');

const PORT = 4173;

/* Ce conteneur fournit déjà Chromium (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
   S'il est là, on l'utilise tel quel plutôt que d'en télécharger un autre. */
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';
const launchOptions = fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {};

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions,
  },

  /* Un vrai viewport iPhone en plus du bureau : l'app est d'abord une PWA mobile. */
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions } },
  ],

  webServer: {
    command: `node build.js && node scripts/serve.js ${PORT}`,
    url: `http://localhost:${PORT}/todo/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
