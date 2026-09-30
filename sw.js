/* FEATURE F12 (part) — Offline copy.
   Status: New. Network first, so people always get the latest list when online; if the
   network is slow (4 s) or absent, the last saved copy is used. Same-origin GET only.
   Validation: only 200 responses are cached. Calculation: none.
   Dependencies: page registers this as sw.js; files below sit next to it in the repo.
   Bump CACHE when the page code changes shape, so old copies are cleared. */
const CACHE = 'helplines-v1';
const PRECACHE = ['./', 'index.html', 'helplines.json', 'helplines.vcf', 'manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => Promise.allSettled(PRECACHE.map(u => cache.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});

function networkFirst(req) {
  const net = fetch(req).then(res => {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
  const slow = new Promise(resolve => setTimeout(() => resolve(null), 4000));
  return Promise.race([net.catch(() => null), slow]).then(res =>
    res || caches.match(req, { ignoreSearch: true }).then(cached => cached || net)
  );
}
