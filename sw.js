const CACHE = 'medaxis-v207';
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const PRECACHE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}css/styles.css`,
  `${BASE}css/leaflet.css`,
  `${BASE}js/app.js`,
  `${BASE}data/guidelines.js`,
  `${BASE}manifest.json`,
  `${BASE}icons/icon.svg`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => null);

        return cached || networkFetch;
      })
    )
  );
});
