/* Only app-owned artwork is cached. Authenticated pages, APIs, notes and libraries never enter Cache Storage. */
const CACHE='ji-eum-art-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/icon.svg','/covers/0.svg'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ji-eum-art-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!/^\/(covers\/\d+\.svg|icon\.svg)$/.test(u.pathname))return;event.respondWith(caches.match(event.request).then(found=>found||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));});
