// Service Worker für die Tool-Sammlung.
// Beim Ändern von Dateien die Versionsnummer erhöhen – sonst sehen
// wiederkehrende Besucher die alte Version aus dem Cache.
const VERSION = 'tools-v1';

// Wird bei der Installation fest gecacht: alles, was zum Start nötig ist.
const PRECACHE = [
  './',
  'index.html',
  'qr-generator.html',
  'qrcode.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll bricht ab, sobald eine Datei fehlt – einzeln laden ist robuster
      .then((c) => Promise.all(PRECACHE.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
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
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // Cache zuerst, Netz nur als Ergänzung: Antwort kommt sofort, auch offline.
  e.respondWith(
    caches.match(req).then((hit) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || caches.match('qr-generator.html'));
      return hit || fetched;
    })
  );
});
