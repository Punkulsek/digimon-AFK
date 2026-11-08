import {execFileSync} from 'node:child_process';
import {defineConfig} from 'vite';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assetManifest} from './scripts/asset-manifest.mjs';
export default defineConfig({plugins:[{
 name:'game-asset-manifest',
 configureServer(server){
  let manifest;
  server.watcher.on('all',(_,path)=>{if(path.includes('/public/'))manifest=null;});
  server.middlewares.use('/asset-manifest.json',async(req,res,next)=>{
   try{manifest ||= assetManifest(resolve('public'));res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(await manifest));}catch(e){manifest=null;next(e);}
  });
 },
 async closeBundle(){await writeFile('dist/version.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),features:['dungeon-keys','dungeon-sweep','offline-rewards'],builtAt:new Date().toISOString()}));await writeFile('dist/asset-manifest.json',JSON.stringify(await assetManifest('dist')));}
}]});
