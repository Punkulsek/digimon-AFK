import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,terminate} from 'firebase/firestore/lite';
import {FIREBASE_DATABASE} from '../src/firebase-config.js';
import {firestoreRemote} from '../src/firebase-account.js';
test('production read adapter uses authenticated finite HTTP requests and named default database for reads and writes',async()=>{
 const paths=[];let exists=false;const stored=new Map();const prefix='projects/demo-eternal/databases/default/documents/';
 const server=createServer(async(req,res)=>{paths.push(req.url);assert.match(req.headers.authorization||'',/^Bearer /);const body=JSON.parse(await Array.fromAsync(req).then(a=>Buffer.concat(a).toString()));res.setHeader('Content-Type','application/json');
  if(req.url.endsWith('/documents:commit')){for(const w of body.writes){const name=w.update?.name||w.delete||w.verify;assert.ok(name.startsWith(prefix));if(w.update)stored.set(name,w.update.fields);if(w.delete)stored.delete(name);}res.end(JSON.stringify({commitTime:'2026-01-01T00:00:01Z',writeResults:body.writes.map(()=>({updateTime:'2026-01-01T00:00:01Z'}))}));return;}
  const name=body.documents[0];assert.ok(name.startsWith(prefix));
  if(!exists){res.end(JSON.stringify([{missing:name,readTime:'2026-01-01T00:00:00Z'}]));return;}
  const fields=stored.get(name)||(name.endsWith('/saveChunks/0')?{revision:{integerValue:'1'},text:{stringValue:'saved Pokémon data'}}:{schema:{integerValue:'1'},revision:{integerValue:'1'},chunks:{integerValue:'1'}});
  res.end(JSON.stringify([{found:{name,fields,createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z'},readTime:'2026-01-01T00:00:00Z'}]));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const app=initializeApp({projectId:'demo-eternal'},'http-test'),db=getFirestore(app,FIREBASE_DATABASE);connectFirestoreEmulator(db,'127.0.0.1',server.address().port,{mockUserToken:{sub:'A'}});
 try{const remote=firestoreRemote(db);assert.equal(await remote.read('A'),null);exists=true;assert.deepEqual(await remote.read('A'),{revision:1,payload:'saved Pokémon data'});assert.equal(await remote.write('A',1,'updated data'),2);assert.deepEqual(await remote.read('A'),{revision:2,payload:'updated data'});assert.ok(paths.some(p=>p.endsWith('/documents:commit')));assert.ok(paths.every(p=>p.includes('/databases/default/')));}
 finally{await terminate(db);await deleteApp(app);await new Promise(r=>server.close(r));}
});
