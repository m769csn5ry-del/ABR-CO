/* LifeOS — service worker
   « Réseau d'abord » pour la navigation (une mise à jour arrive tout de suite),
   « cache d'abord » pour le reste de la coquille (démarrage instantané, hors ligne).
   Les données ne passent jamais par ici : elles vivent dans IndexedDB. */
const VERSION = 'lifeos-v1.0.0';

const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './styles/tokens.css', './styles/base.css', './styles/shell.css',
  './styles/components.css', './styles/views.css',
  './src/core/util.js', './src/core/date.js', './src/core/format.js',
  './src/core/schema.js', './src/core/seed.js', './src/core/storage.js', './src/core/store.js',
  './src/domain/domains.js', './src/domain/tasks.js', './src/domain/projects.js',
  './src/domain/goals.js', './src/domain/finance.js', './src/domain/habits.js',
  './src/domain/calendar.js', './src/domain/notes.js', './src/domain/stats.js',
  './src/domain/search.js', './src/domain/planner.js', './src/domain/weekly.js', './src/domain/focus.js',
  './src/services/notifications.js', './src/services/ics.js', './src/services/auth.js',
  './src/services/nlp.js', './src/services/assistant.js',
  './src/ui/dom.js', './src/ui/icons.js', './src/ui/overlay.js', './src/ui/charts.js',
  './src/ui/forms.js', './src/ui/palette.js', './src/ui/shortcuts.js', './src/ui/router.js',
  './src/views/common.js', './src/views/home.js', './src/views/today.js', './src/views/planning.js',
  './src/views/calendar.js', './src/views/tasks.js', './src/views/projects.js', './src/views/goals.js',
  './src/views/finance.js', './src/views/habits.js', './src/views/stats.js', './src/views/notes.js',
  './src/views/assistant.js', './src/views/settings.js',
  './src/app.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

/* Un appui sur une notification ouvre l'écran concerné. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const view = (e.notification.data && e.notification.data.view) || 'today';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(client.url.split('#')[0] + '#/' + view).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow('./#/' + view);
    })
  );
});
