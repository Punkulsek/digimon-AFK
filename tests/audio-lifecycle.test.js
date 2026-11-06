import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio.js';
test('only the latest requested location track plays; video stops and resumes it',async()=>{
 const oldFetch=globalThis.fetch;const requests=[];globalThis.fetch=()=>new Promise(resolve=>requests.push(()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})));
 const sources=[];const audio=new GameAudio({getItem(){return null},setItem(){}});audio.context={decodeAudioData:async x=>x,createBufferSource:()=>{const s={connect(){},disconnect(){},start(){this.playing=true},stop(){this.playing=false}};sources.push(s);return s;}};audio.music={};audio.applyVolume=()=>{};
 globalThis.POKEMON_BGM_TRACKS={a:'a.mp3',b:'b.mp3'};
 try{audio.setMode('a');const first=audio.startMusic();audio.setMode('b');const second=audio.startMusic();requests[0]();await first;assert.equal(sources.length,0);requests[1]();await second;assert.equal(sources.length,1);assert.equal(sources[0].playing,true);audio.started=true;audio.context=null;audio.setVideoExclusive(true);assert.equal(sources[0].playing,false);assert.equal(audio.track,null);}
 finally{globalThis.fetch=oldFetch;delete globalThis.POKEMON_BGM_TRACKS;}
});
