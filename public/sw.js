const CACHE='viaja-public-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/offline-reader.js','/offline.html','/icon-192.png','/icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('viaja-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.includes('signin')||u.pathname.includes('signout')||u.pathname.includes('callback'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('/offline.html')));return}
 // Never serve outdated JS or CSS from a service-worker cache after deploying a new bundle.
 if(/\.(js|css)(\?.*)?$/.test(u.pathname)){event.respondWith(fetch(req,{cache:'no-store'}));return}
 if(/\.(png|jpg|svg|webmanifest)$/.test(u.pathname))event.respondWith(caches.open(CACHE).then(async cache=>{try{const response=await fetch(req);if(response.ok&&response.type==='basic')await cache.put(req,response.clone());return response}catch{return await cache.match(req)||Response.error()}}));
});
