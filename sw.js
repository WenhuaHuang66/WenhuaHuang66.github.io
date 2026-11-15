// Service Worker for Dr. Wenhua Huang's PWA
// Cache the app shell (CSS/JS/icons/manifest) for offline-like feel.
// API calls (PubChem / OPSIN / MyMemory) are always network-first, never cached.

const APP_SHELL_CACHE = 'app-shell-v3';
const APP_SHELL_ASSETS = [
  '/app/',
  '/',
  '/zh/',
  '/assets/css/main.css',
  '/assets/js/main.min.js',
  '/images/manifest.json',
  '/images/favicon-192x192.png',
  '/images/favicon-512x512.png',
  '/images/apple-touch-icon-180x180.png',
  '/images/favicon.svg',
  '/images/favicon.ico'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: app shell → cache-first, everything else → network-first (API calls bypass cache)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache remote APIs (PubChem, OPSIN, MyMemory, CDN fonts/JS)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return; // let browser handle normally (network-only)
  }

  // App shell assets → cache first
  if (APP_SHELL_ASSETS.includes(req.url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Homologous HTML pages → network first (fresh blog content), fallback to cache
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open('pages-cache').then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
  }
});
