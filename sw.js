/* Service worker: permette di aprire MIO anche offline. Aggiorna VERSION quando modifichi i file. */
const VERSION = 'mio-v6';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.json', 'icons/icon.svg', 'icons/icon-180.png',
  'js/util.js', 'js/settings.js', 'js/templates.js', 'js/pages.js', 'js/news.js', 'js/gmail.js', 'js/sync.js', 'js/turni.js', 'js/notes.js', 'js/calendar.js', 'js/reminders.js', 'js/weather.js', 'js/tempo.js', 'js/dashboard.js', 'js/search.js', 'js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Prima la rete (così vedi sempre l'ultima versione), poi la cache se sei offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
