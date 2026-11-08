// This worker caches only public game assets, never login, config or save data.
const ASSETS='pokemon-eternal-assets-v1',META='pokemon-eternal-assets-meta-v1';
const manifests=new Map(),downloads=new Map();
const metaKey=id=>new URL('/__eternal_manifest__/'+encodeURIComponent(id),self.location.origin).href;
const assetKey=a=>new URL(a.url+'?__eternal_asset='+a.hash,self.location.origin).href;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function validateManifest(m){
 if(!m||!Array.isArray(m.assets)||!m.assets.length||!/^[a-f0-9]{64}$/.test(m.version))throw Error('manifest-invalid');
 const seen=new Set();
 for(const a of m.assets){
  if(!/^\/(?:[a-zA-Z0-9_./-]+)$/.test(a.url)||a.url.includes('..')||seen.has(a.url)||!Number.isSafeInteger(a.size)||a.size<=0||!/^[a-f0-9]{64}$/.test(a.hash)||!(/\.(png|gif|jpe?g|webp|svg|mp3|mp4|ogg|wav|woff2?|ttf)$/i.test(a.url)||/^\/assets\/.*\.(js|css)$/.test(a.url)))throw Error('manifest-invalid');
  seen.add(a.url);
 }
 return m;
}
async function getManifest(id){
 if(manifests.has(id))return manifests.get(id);
 const promise=(async()=>{
  const meta=await caches.open(META),bound=await meta.match(metaKey(id));
  if(bound)return validateManifest(await bound.json());
  let m;
  try{const response=await fetch('/asset-manifest.json',{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('manifest-http-'+response.status);m=validateManifest(await response.json());}
  catch(error){const previous=await meta.match(metaKey('latest'));if(!previous)throw error;m=validateManifest(await previous.json());}
  await meta.put(metaKey(id),Response.json(m));return m;
 })();manifests.set(id,promise);
 try{return await promise;}catch(error){manifests.delete(id);throw error;}
}
async function loadAsset(a,onProgress=()=>{}){
 const cache=await caches.open(ASSETS),key=assetKey(a),cached=await cache.match(key);
 if(cached){onProgress(a.size);return cached;}
 let job=downloads.get(key);
 if(!job){
  job={bytes:0,listeners:new Set()};downloads.set(key,job);
  job.promise=(async()=>{
   const response=await fetch(key,{cache:'no-cache',signal:AbortSignal.timeout(90000)});
   if(response.status!==200||!response.body)throw Error('asset-http-'+response.status);
   const chunks=[],reader=response.body.getReader();let received=0;
   for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;if(received>a.size){await reader.cancel();throw Error('asset-size');}job.bytes=Math.min(received,a.size-1);for(const fn of job.listeners)fn(job.bytes);}
   if(received!==a.size)throw Error('asset-size');
   const body=new Uint8Array(received);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),n=>n.toString(16).padStart(2,'0')).join('');
   if(hash!==a.hash)throw Error('asset-hash');
   const saved=new Response(body,{headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Content-Length':String(received),'Cache-Control':'no-cache','Accept-Ranges':'bytes'}});
   await cache.put(key,saved.clone());job.bytes=a.size;for(const fn of job.listeners)fn(a.size);return saved;
  })().finally(()=>downloads.delete(key));
 }
 job.listeners.add(onProgress);onProgress(job.bytes);
 try{return (await job.promise).clone();}finally{job.listeners.delete(onProgress);}
}
async function preload(id,port){
 const m=await getManifest(id),amounts=new Map(),total=m.assets.reduce((n,a)=>n+a.size,0);let completed=0,index=0,lastSent=0;
 const report=(force=false)=>{if(!force&&Date.now()-lastSent<80)return;lastSent=Date.now();const loaded=[...amounts.values()].reduce((a,b)=>a+b,0);port.postMessage({type:'progress',loaded,total,percent:completed===m.assets.length?100:Math.min(99,Math.floor(loaded/total*100))});};
 report(true);
 const results=await Promise.allSettled(Array.from({length:4},async()=>{while(index<m.assets.length){const a=m.assets[index++];await loadAsset(a,n=>{amounts.set(a.url,n);report();});completed++;report();}}));
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
 const meta=await caches.open(META);await meta.put(metaKey('latest'),Response.json(m));
 report(true);port.postMessage({type:'done',version:m.version});
 // Retain assets used by any still-open game tab. Touch only our own caches.
 await prune(m).catch(()=>{});
}
async function prune(latest){
 const meta=await caches.open(META),live=new Set((await self.clients.matchAll({includeUncontrolled:true})).map(c=>c.id));live.add('latest');
 const used=new Set(latest.assets.map(assetKey));
 for(const request of await meta.keys()){
  const id=decodeURIComponent(new URL(request.url).pathname.split('/').pop());
  if(!live.has(id)){await meta.delete(request);manifests.delete(id);continue;}
  const m=await (await meta.match(request)).json();for(const a of m.assets)used.add(assetKey(a));
 }
 const cache=await caches.open(ASSETS);for(const request of await cache.keys())if(!used.has(request.url)&&!downloads.has(request.url))await cache.delete(request);
}
async function withRange(response,range){
 const match=/^bytes=(\d*)-(\d*)$/.exec(range||'');if(!match)return response;
 const body=await response.blob(),size=body.size;let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2])),end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
 if((!match[1]&&!match[2])||start> end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));return new Response(body.slice(start,end+1),{status:206,headers});
}
self.addEventListener('message',event=>{
 if(event.data?.type!=='PRELOAD_ASSETS'||!event.ports[0]||!event.source?.id)return;
 const port=event.ports[0];event.waitUntil(preload(event.source.id,port).catch(error=>port.postMessage({type:'error',code:error.name==='QuotaExceededError'?'storage-full':error.message})).finally(()=>port.close()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Entry documents and code always use the current deployment, not asset manifests.
 if(url.origin===self.location.origin&&(request.mode==='navigate'||/\.(js|css)$/.test(url.pathname))){event.respondWith(fetch(request,{cache:'no-cache'}));return;}
 if(request.method!=='GET'||url.origin!==self.location.origin||url.search||!event.clientId||!(/\.(png|gif|jpe?g|webp|svg|mp3|mp4|ogg|wav|woff2?|ttf)$/i.test(url.pathname)||/^\/assets\/.*\.(js|css)$/.test(url.pathname)))return;
 event.respondWith((async()=>{
  const m=await getManifest(event.clientId),a=m.assets.find(a=>a.url===url.pathname);
  if(!a)return fetch(request);
  return withRange(await loadAsset(a),request.headers.get('Range'));
 })().catch(()=>fetch(request)));
});
