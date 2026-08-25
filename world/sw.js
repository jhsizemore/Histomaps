/* Histomap v0.36.1 development service worker. Same-origin app shell + runtime map assets. */
const CACHE = 'histomap-world-v0.36.1-r2';
const SHELL = ['./','./mobile-v0.36.css?v=3','./mobile-v0.36.1-fixes.css?v=1','./mobile-v0.36.js?v=3','./mobile-v0.36.1-fixes.js?v=1','./manifest.webmanifest','../assets/favicon.svg','../assets/histomap-logo.svg'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('histomap-world-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request,response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./'));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request,response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    return (await network) || Response.error();
  })());
});
