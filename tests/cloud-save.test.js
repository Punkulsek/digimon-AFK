import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,SAVE_KEY} from '../src/game.js';
import {AccountStorage,CloudSaveSession} from '../src/cloud-save.js';
function setup(){const map=new Map(),raw={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const state=initialState();state.gold=12345;raw.setItem(SAVE_KEY,JSON.stringify(state));const storage=new AccountStorage(raw);const documents=new Map();let offline=false,applied;
 const remote={async read(uid){if(offline)throw Error('offline');return documents.get(uid)||null;},async write(uid,revision,payload){if(offline)throw Error('offline');if((documents.get(uid)?.revision||0)!==revision)throw Error('save-conflict');documents.set(uid,{revision:revision+1,payload});return revision+1;}};
 const make=()=>new CloudSaveSession({storage,remote,apply:s=>applied=s});return {map,raw,storage,documents,remote,make,get applied(){return applied},offline:v=>offline=v};}
test('first Google link copies every guest field; cloud account load preserves guest and account backups',async()=>{
 const x=setup(),guest=x.storage.read(null);await x.make().open('A');assert.deepEqual(JSON.parse(x.documents.get('A').payload),JSON.parse(guest));assert.equal(x.storage.read(null),guest);
 const other=initialState();other.gold=909;other.trainer.nickname='다른 계정';x.documents.set('B',{revision:4,payload:JSON.stringify(other)});await x.make().open('B');assert.equal(x.applied.gold,909);assert.equal(JSON.parse(x.storage.read('A')).gold,12345);assert.equal(x.storage.read(null),guest);
});
test('failed or invalid remote reads cannot initialize or overwrite a cloud save',async()=>{
 const x=setup();x.offline(true);const s=x.make();await assert.rejects(s.open('A'));s.queue(initialState());await s.flush();assert.equal(x.documents.size,0);assert.equal(x.storage.uid,null);
 x.offline(false);x.documents.set('A',{revision:2,payload:'{}'});await assert.rejects(x.make().open('A'));assert.equal(x.documents.get('A').payload,'{}');
});
test('offline pending changes resume safely after reconnect and refresh',async()=>{
 const x=setup(),s=x.make();await s.open('A');x.applied.gold=20000;s.queue(x.applied);x.offline(true);await s.flush();assert.equal(s.dirty,true);x.offline(false);const next=x.make();await next.open('A');assert.equal(x.applied.gold,20000);assert.equal(JSON.parse(x.documents.get('A').payload).gold,20000);
});
test('concurrent device writes never overwrite a newer revision, preserving pending local backup',async()=>{
 const x=setup(),s=x.make();await s.open('A');x.applied.gold=30000;s.queue(x.applied);const newer=initialState();newer.gold=40000;x.documents.set('A',{revision:2,payload:JSON.stringify(newer)});await s.flush();assert.equal(s.blocked,true);assert.equal(JSON.parse(x.documents.get('A').payload).gold,40000);await x.make().open('A');assert.equal(x.applied.gold,40000);assert.ok([...x.map].some(([k,v])=>k.startsWith('pokemon-eternal-backup:A:')&&JSON.parse(v).gold===30000));
});
test('switching account during a delayed read never applies previous account data',async()=>{
 const x=setup();let release;x.remote.read=uid=>uid==='A'?new Promise(r=>release=r):Promise.resolve(null);const s=x.make(),first=s.open('A');await s.open('B');const a=initialState();a.gold=999;release({revision:1,payload:JSON.stringify(a)});await first;assert.equal(x.storage.uid,'B');assert.equal(x.applied.gold,12345);
});
test('guest progress migrates only to its original account, never to another new account',async()=>{
 const x=setup();await x.make().open('A');await x.make().open('B');assert.equal(x.applied.gold,initialState().gold);assert.equal(JSON.parse(x.storage.read('A')).gold,12345);assert.equal(JSON.parse(x.storage.read(null)).gold,12345);
});
test('a slow first upload never blocks entry after the server read succeeded',async()=>{
 const x=setup();let finish;x.remote.write=()=>new Promise(resolve=>finish=resolve);const s=x.make();await s.open('A');assert.equal(s.ready,true);assert.equal(s.running,true);assert.equal(s.dirty,true);assert.equal(x.applied.gold,12345);finish(1);await new Promise(r=>setImmediate(r));assert.equal(s.dirty,false);
});
test('a failed first upload retains playable loaded data and pending local changes',async()=>{
 const x=setup();x.remote.write=async()=>{throw Error('unavailable')};const s=x.make();await s.open('A');await new Promise(r=>setImmediate(r));assert.equal(s.ready,true);assert.equal(s.dirty,true);assert.equal(JSON.parse(x.storage.read('A')).gold,12345);
});

test('logout waits for an older in-flight upload then saves the final snapshot before switching accounts',async()=>{
 const {prepareAccountLogout}=await import('../src/account-logout.js');
 const x=setup(),s=x.make();await s.open('A');await s.flush();
 const write=x.remote.write;let release;
 x.remote.write=(...args)=>new Promise(resolve=>{release=()=>write(...args).then(resolve)});
 x.applied.gold=20000;s.queue(x.applied);const old=s.flush();
 x.applied.gold=25000;const logout=prepareAccountLogout(s,x.applied);
 x.remote.write=write;await release();await old;await logout;s.cancel();
 assert.equal(JSON.parse(x.documents.get('A').payload).gold,25000);
 await x.make().open('B');assert.equal(x.applied.gold,10000);
 await x.make().open('A');assert.equal(x.applied.gold,25000);
});
test('logout with failed or timed-out saving retains a pending account snapshot and never clears other saves',async()=>{
 const {prepareAccountLogout}=await import('../src/account-logout.js');
 const x=setup(),s=x.make();await s.open('A');await s.flush();x.applied.gold=44444;x.offline(true);
 await prepareAccountLogout(s,x.applied,20);s.cancel();assert.equal(JSON.parse(x.raw.getItem(s.cacheKey('A'))).dirty,true);
 x.offline(false);const next=x.make();await next.open('A');assert.equal(x.applied.gold,44444);await next.flush();
 const write=x.remote.write;let release;x.remote.write=()=>new Promise(r=>release=r);x.applied.gold=55555;
 await prepareAccountLogout(next,x.applied,5);next.cancel();
 assert.equal(JSON.parse(x.raw.getItem(next.cacheKey('A'))).payload.includes('55555'),true);
 release(3);x.remote.write=write;
 assert.equal(JSON.parse(x.storage.read(null)).gold,12345);
});
