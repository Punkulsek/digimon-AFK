import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,terminate} from 'firebase/firestore/lite';
import {firestoreRemote} from '../src/firebase-account.js';
test('production read adapter uses authenticated finite HTTP requests and explicit default DB',async()=>{
 const paths=[];let exists=false;const prefix='projects/demo-eternal/databases/(default)/documents/';
 const server=createServer(async(req,res)=>{paths.push(req.url);assert.match(req.headers.authorization||'',/^Bearer /);const body=JSON.parse(await Array.fromAsync(req).then(a=>Buffer.concat(a).toString()));res.setHeader('Content-Type','application/json');
  const name=body.documents[0];assert.ok(name.startsWith(prefix));
  if(!exists){res.end(JSON.stringify([{missing:name,readTime:'2026-01-01T00:00:00Z'}]));return;}
  const fields=name.endsWith('/saveChunks/0')?{revision:{integerValue:'1'},text:{stringValue:'saved Pokémon data'}}:{schema:{integerValue:'1'},revision:{integerValue:'1'},chunks:{integerValue:'1'}};
  res.end(JSON.stringify([{found:{name,fields,createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z'},readTime:'2026-01-01T00:00:00Z'}]));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const app=initializeApp({projectId:'demo-eternal'},'http-test'),db=getFirestore(app,'(default)');connectFirestoreEmulator(db,'127.0.0.1',server.address().port,{mockUserToken:{sub:'A'}});
 try{const remote=firestoreRemote(db);assert.equal(await remote.read('A'),null);exists=true;assert.deepEqual(await remote.read('A'),{revision:1,payload:'saved Pokémon data'});assert.ok(paths.length>=4);assert.ok(paths.every(p=>p.endsWith('/documents:batchGet')));}
 finally{await terminate(db);await deleteApp(app);await new Promise(r=>server.close(r));}
});
