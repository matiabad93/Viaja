const CACHE='viaja-public-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/offline-reader.js','/offline.html','/icon-192.png','/icon-512.png'])))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('viaja-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.includes('signin')||u.pathname.includes('signout')||u.pathname.includes('callback'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));return}
 if(/\.(png|jpg|svg|css|js|webmanifest)$/.test(u.pathname))event.respondWith(caches.open(CACHE).then(async cache=>{const hit=await cache.match(req);if(hit)return hit;const response=await fetch(req);if(response.ok&&response.type==='basic')await cache.put(req,response.clone());return response}));
});
