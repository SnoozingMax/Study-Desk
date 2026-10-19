// study desk service worker: network-first so updates show up right away,
// with a cached copy as fallback when offline
const VERSION = 'sd-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192-v2.png', './icon-512-v2.png'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e)=>{
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (e)=>{
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for(const c of list){ if('focus' in c) return c.focus(); }
      return self.clients.openWindow('./');
    })
  );
});
