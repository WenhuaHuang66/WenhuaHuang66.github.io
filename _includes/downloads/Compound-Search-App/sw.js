// Service Worker for Compound Search App
// Only caches local app shell; all API calls go direct to PubChem / OPSIN / MyMemory.

const APP_CACHE = 'compound-search-v1';
const APP_ASSETS = [
  './',
  'app.html',
  'manifest.json',
  'images/favicon-192x192.png',
  'images/favicon-512x512.png',
  'images/apple-touch-icon-180x180.png',
  'images/favicon.svg',
  'images/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((c) => c.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache remote APIs
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for app shell
  if (APP_ASSETS.includes(req.url) || APP_ASSETS.includes(url.pathname.split('/').pop()) ||
      (req.url.endsWith('/') || req.url.endsWith('/app.html'))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
