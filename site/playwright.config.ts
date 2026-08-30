import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/* Tests de bout en bout sur le site construit — pas sur le serveur de
   développement : c'est la version compilée qui part en production. */

const PORT = 3100;

/* Chromium est déjà présent dans les conteneurs Claude Code. S'il est là,
   on l'utilise ; sinon Playwright prend celui qu'il a installé. */
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';
const launchOptions = {
  ...(fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {}),
  /* Coupe les appels sortants de Chromium (autofill, sync, composants) :
     ils ne servent pas au test et polluent le réseau du conteneur. */
  args: [
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--disable-features=OptimizationHints,AutofillServerCommunication,Translate',
  ],
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Une reprise en local : le serveur Node et les navigateurs partagent
     4 cœurs, ce qui produit des échecs de contention sans rapport avec le
     site. Un test qui échoue DEUX fois est un vrai défaut. */
  retries: process.env.CI ? 2 : 1,
  /* Le serveur Node et les navigateurs se partagent les mêmes cœurs :
     au-delà de deux travailleurs la machine sature et les tests deviennent
     instables sans que le site soit en cause. */
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions,
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], browserName: 'chromium', launchOptions } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions } },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Toujours reconstruire : réutiliser un serveur déjà lancé fait
    // passer les tests sur une build périmée.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
