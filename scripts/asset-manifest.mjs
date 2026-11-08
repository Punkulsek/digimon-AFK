import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export async function assetManifest(root){
 const assets=[];
 async function walk(dir,prefix=''){
  for(const file of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,file.name),url=`${prefix}/${file.name}`;
   if(file.isDirectory())await walk(path,url);
   else if(/\.(png|gif|jpe?g|webp|svg|mp3|mp4|ogg|wav|woff2?|ttf)$/i.test(url)||/^\/assets\/.*\.(js|css)$/.test(url)){
    const data=await readFile(path);assets.push({url,size:data.length,hash:createHash('sha256').update(data).digest('hex')});
   }
  }
 }
 await walk(root);assets.sort((a,b)=>a.url.localeCompare(b.url,'en'));
 return {version:createHash('sha256').update(JSON.stringify(assets)).digest('hex'),assets};
}
