const CACHE_PREFIX = 'chagok-web:' + new URL(self.registration.scope).pathname + ':';
const CACHE_NAME = CACHE_PREFIX + '__CHAGOK_CACHE_VERSION__';
const FILES = ['./', './index.html', './style.css', './app.js', './floating-window.js', './reverse-tracking.js', './web-app.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
const assets = new Set(FILES.map(file => new URL(file, self.registration.scope).href));
self.addEventListener('install', event => {
  // Do not replace an active timer until the user chooses to apply the update.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([...assets])));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const key = event.request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : url.origin + url.pathname;
  if (!assets.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    return cached || fetch(event.request);
  })());
});
