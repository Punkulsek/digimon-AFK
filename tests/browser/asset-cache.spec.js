import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const hash=data=>createHash('sha256').update(data).digest('hex');
async function fixture(){
 const files=new Map([['/pokemon/1.png',Buffer.alloc(128*1024,7)],['/audio/test.mp3',Buffer.from('0123456789'.repeat(2000))]]),counts=new Map();let bad=false,configs=0;
 const worker=await readFile('public/asset-worker.js');
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://test');
  if(url.pathname==='/asset-worker.js'){res.setHeader('Content-Type','text/javascript');res.end(worker);return;}
  if(url.pathname==='/asset-manifest.json'){const assets=[...files].map(([url,data])=>({url,size:data.length,hash:hash(data)}));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:hash(JSON.stringify(assets)),assets}));return;}
  if(url.pathname==='/auth-config.json'){configs++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({request:configs}));return;}
  if(files.has(url.pathname)){
   counts.set(url.pathname,(counts.get(url.pathname)||0)+1);res.setHeader('Content-Type','application/octet-stream');let data=files.get(url.pathname);if(bad&&url.pathname==='/pokemon/1.png')data=Buffer.alloc(data.length,8);
   for(let offset=0;offset<data.length;offset+=8192){res.write(data.subarray(offset,offset+8192));await new Promise(r=>setTimeout(r,7));}res.end();return;
  }
  res.setHeader('Content-Type','text/html');res.end(`<script>
  window.progress=[];window.prepare=async()=>{const r=await navigator.serviceWorker.register('/asset-worker.js');await navigator.serviceWorker.ready;return new Promise(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=({data})=>{if(data.type==='progress')progress.push(data);if(data.type==='done'||data.type==='error'){ch.port1.close();resolve(data)}};r.active.postMessage({type:'PRELOAD_ASSETS'},[ch.port2])})};
  </script>`);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}`,files,counts,bad:v=>bad=v,configs:()=>configs,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
test('real worker caches assets once, downloads only changes, serves audio ranges and never caches auth',async({page})=>{
 const f=await fixture();try{
  await page.goto(f.url);await page.evaluate(async()=>{localStorage.setItem('pokemon-days-v1','keep-save');const c=await caches.open('other-app-cache');await c.put('/user-data',new Response('keep'));});
  expect((await page.evaluate(()=>prepare())).type).toBe('done');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  const progress=await page.evaluate(()=>window.progress);expect(progress[0].percent).toBe(0);expect(progress.at(-1).percent).toBe(100);expect(progress.some(p=>p.percent>0&&p.percent<100)).toBe(true);
  expect(f.counts.get('/pokemon/1.png')).toBe(1);expect(f.counts.get('/audio/test.mp3')).toBe(1);
  const range=await page.evaluate(async()=>{const r=await fetch('/audio/test.mp3',{headers:{Range:'bytes=2-5'}});return {status:r.status,text:await r.text(),range:r.headers.get('Content-Range')}});
  expect(range).toEqual({status:206,text:'2345',range:'bytes 2-5/20000'});
  await page.reload();expect((await page.evaluate(()=>prepare())).type).toBe('done');expect(f.counts.get('/pokemon/1.png')).toBe(1);expect(f.counts.get('/audio/test.mp3')).toBe(1);
  f.files.set('/pokemon/1.png',Buffer.alloc(128*1024,9));await page.reload();expect((await page.evaluate(()=>prepare())).type).toBe('done');
  expect(f.counts.get('/pokemon/1.png')).toBe(2);expect(f.counts.get('/audio/test.mp3')).toBe(1);
  expect(await page.evaluate(async()=>new Uint8Array(await (await fetch('/pokemon/1.png')).arrayBuffer())[0])).toBe(9);
  await page.evaluate(async()=>{await fetch('/auth-config.json');await fetch('/auth-config.json')});expect(f.configs()).toBe(2);
  await page.context().setOffline(true);expect(await page.evaluate(async()=>new Uint8Array(await (await fetch('/pokemon/1.png')).arrayBuffer())[0])).toBe(9);await page.context().setOffline(false);
  expect(await page.evaluate(()=>localStorage.getItem('pokemon-days-v1'))).toBe('keep-save');expect(await page.evaluate(async()=>!!await (await caches.open('other-app-cache')).match('/user-data'))).toBe(true);
 }finally{await page.context().setOffline(false);await f.close();}
});
test('a corrupt download cannot complete or poison cache; retry reuses verified files',async({page})=>{
 const f=await fixture();f.bad(true);try{
  await page.goto(f.url);const failed=await page.evaluate(()=>prepare());expect(failed.type).toBe('error');expect(failed.code).toBe('asset-hash');
  expect(await page.evaluate(async()=> (await (await caches.open('pokemon-eternal-assets-v1')).keys()).filter(k=>k.url.includes('/pokemon/')).length)).toBe(0);
  f.bad(false);expect((await page.evaluate(()=>prepare())).type).toBe('done');expect(f.counts.get('/audio/test.mp3')).toBe(1);expect(f.counts.get('/pokemon/1.png')).toBe(2);
 }finally{await f.close();}
});
