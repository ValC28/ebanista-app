// Service Worker — Ebanista Production v2.10
const CACHE = 'ebanista-v2.10';
// index.html / display.html : network-first (toujours à jour), assets statiques : cache-first
const NETWORK_FIRST = ['./index.html', './display.html'];
const ASSETS = ['./manifest.json', './logo.png', './ebanista-core.js?v=2.10'];

self.addEventListener('install', e => {
  // cache:'reload' pour ignorer le cache HTTP du navigateur et repartir du réseau
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all([...NETWORK_FIRST, ...ASSETS].map(url =>
      fetch(url, { cache: 'reload' }).then(res => c.put(url, res))
    ))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const isNetworkFirst = NETWORK_FIRST.some(p => url.pathname.endsWith(p.replace('./', '/')));
  if (isNetworkFirst) {
    // Network-first pour HTML : toujours essayer le réseau, cache en fallback offline
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first pour assets statiques
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
    );
  }
});
