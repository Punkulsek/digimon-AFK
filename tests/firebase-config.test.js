import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateFirebaseConfig,readCloudSnapshot,FIREBASE_DATABASE} from '../src/firebase-config.js';
test('production configuration and explicit default database match the supplied project',async()=>{
 const c=JSON.parse(await readFile('public/auth-config.json','utf8'));assert.equal(validateFirebaseConfig(c).projectId,'pokemon-eternal');assert.equal(FIREBASE_DATABASE,'(default)');assert.throws(()=>validateFirebaseConfig({...c,projectId:'other'}),/일치/);
});
test('missing player is distinct from an actual backend not-found error',async()=>{
 let reads=0;assert.equal(await readCloudSnapshot(async()=>{reads++;return null}),null);assert.equal(reads,1);
 const error=Object.assign(Error('backend resource missing'),{code:'not-found'});await assert.rejects(readCloudSnapshot(async()=>{throw error}),e=>e===error);
});
test('mixed chunk revisions retry and never return partial saves',async()=>{
 let headReads=0;const snapshot=await readCloudSnapshot(async n=>n===null?{schema:1,chunks:1,revision:++headReads===1?1:2}:{revision:2,text:'complete'});assert.deepEqual(snapshot,{revision:2,payload:'complete'});
 await assert.rejects(readCloudSnapshot(async n=>n===null?{schema:1,chunks:1,revision:1}:null),/inconsistent/);
});
