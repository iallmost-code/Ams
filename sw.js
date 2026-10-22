// Generated from the exact production build. No network dependencies.
const OWN_PREFIX='aetherstory-m:'+self.registration.scope+':';
const CACHE=OWN_PREFIX+"13faf095ac8b0404";
const ASSETS=["./assets/index-B39WvYPj.css","./assets/index-CsRgSEbx.js","./icons/icon-192.png","./icons/icon-512.png","./icons/icon.svg","./index.html","./manifest.webmanifest"];
const SCOPE=self.registration.scope;
const INDEX=new URL('./index.html',SCOPE).href;
const URLS=ASSETS.map(path=>new URL(path,SCOPE).href);
const KNOWN=new Set(URLS);
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    try {
      const cache=await caches.open(CACHE);
      await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));
      await self.skipWaiting();
    } catch(error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(OWN_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(SCOPE)) return;
  if(request.mode==='navigate') {
    event.respondWith((async()=>{
      try { return await fetch(request); }
      catch {
        // A relative-base bundle must load from the deployment directory.
        // Canonicalize deep links before serving HTML so ./assets stays in scope.
        if(new URL('./',url).href!==SCOPE) return Response.redirect(SCOPE,302);
        return (await caches.open(CACHE)).match(INDEX);
      }
    })());
    return;
  }
  url.search=''; url.hash='';
  if(!KNOWN.has(url.href)) return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    return (await cache.match(url.href)) || fetch(request);
  })());
});
