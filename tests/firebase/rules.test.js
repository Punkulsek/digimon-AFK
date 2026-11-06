import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore as getLite,connectFirestoreEmulator} from 'firebase/firestore/lite';
import assert from 'node:assert/strict';
import {firestoreRemote} from '../../src/firebase-account.js';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,serverTimestamp} from 'firebase/firestore';
test('Google owner only: metadata and all snapshot chunks are isolated',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pokemon-eternal',firestore:{rules:await readFile('firestore.rules','utf8')}});
 const app=initializeApp({projectId:'demo-pokemon-eternal'},'rules-lite');
 try{
  const a=env.authenticatedContext('A',{firebase:{sign_in_provider:'google.com'}}).firestore();
  const b=env.authenticatedContext('B',{firebase:{sign_in_provider:'google.com'}}).firestore();
  const guest=env.unauthenticatedContext().firestore();
  const nongoogle=env.authenticatedContext('A',{firebase:{sign_in_provider:'password'}}).firestore();
  const head={schema:1,revision:1,chunks:1,updatedAt:serverTimestamp()},chunk={text:'save',revision:1};
  await assertSucceeds(setDoc(doc(a,'players/A'),head));await assertSucceeds(setDoc(doc(a,'players/A/saveChunks/0'),chunk));
  for(const db of [b,guest,nongoogle])for(const path of ['players/A','players/A/saveChunks/0']){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),path.endsWith('/0')?chunk:head));}
  await assertSucceeds(getDoc(doc(a,'players/A/saveChunks/0')));
  const lite=getLite(app,'(default)'),[host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(lite,host,Number(port),{mockUserToken:{sub:'B',user_id:'B',firebase:{sign_in_provider:'google.com'}}});
  const remote=firestoreRemote(lite),payload=JSON.stringify({data:'포켓몬'.repeat(20000)+'😀'.repeat(50000)});
  assert.equal(await remote.write('B',0,payload),1);
  assert.deepEqual(await remote.read('B'),{revision:1,payload});
  await assert.rejects(remote.write('B',0,'old-device'),/save-conflict/);
  assert.equal((await remote.read('B')).payload,payload);
  assert.equal(await remote.write('B',1,'small'),2);
  assert.deepEqual(await remote.read('B'),{revision:2,payload:'small'});
  await assertFails(setDoc(doc(a,'players/A'),{...head,unexpected:true}));
 }finally{await deleteApp(app);await env.cleanup();}
});
