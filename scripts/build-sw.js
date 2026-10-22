import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, sep } from 'node:path';

const directory = resolve('dist');
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? walk(resolve(path, entry.name)) : [resolve(path, entry.name)],
      ),
    )
  ).flat();
}
const files = (await walk(directory))
  .filter((path) => !path.endsWith('.map') && relative(directory, path) !== 'sw.js')
  .sort();
if (!files.includes(resolve(directory, 'index.html')))
  throw Error('Build the app before generating the service worker.');
const hash = createHash('sha256');
for (const file of files) {
  hash.update(relative(directory, file));
  hash.update(await readFile(file));
}
const assets = files.map((file) => './' + relative(directory, file).split(sep).join('/'));
const version = hash.digest('hex').slice(0, 16);
const worker = `// Generated from the exact production build. No network dependencies.
const OWN_PREFIX='aetherstory-m:'+self.registration.scope+':';
const CACHE=OWN_PREFIX+${JSON.stringify(version)};
const ASSETS=${JSON.stringify(assets)};
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
`;
await writeFile(resolve(directory, 'sw.js'), worker);
console.log(`Service worker: ${assets.length} local assets, revision ${version}`);
