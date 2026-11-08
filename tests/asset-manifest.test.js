import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assetManifest} from '../scripts/asset-manifest.mjs';
test('manifest hashes content, is stable across builds and excludes config and private data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'eternal-assets-'));try{
  await mkdir(join(dir,'assets'));await writeFile(join(dir,'a.png'),'image');await writeFile(join(dir,'b.mp3'),'audio');await writeFile(join(dir,'assets/app-123.js'),'script');await writeFile(join(dir,'auth-config.json'),'config');await writeFile(join(dir,'asset-worker.js'),'worker');
  const a=await assetManifest(dir);assert.deepEqual(await assetManifest(dir),a);assert.equal(a.assets.length,3);
  await writeFile(join(dir,'a.png'),'new image');const b=await assetManifest(dir);assert.notEqual(b.version,a.version);assert.notEqual(b.assets[0].hash,a.assets[0].hash);assert.deepEqual(b.assets.slice(1),a.assets.slice(1));
 }finally{await rm(dir,{recursive:true,force:true});}
});
