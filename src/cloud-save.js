import {SAVE_KEY,load,initialState} from './game.js';
export class AccountStorage {
 constructor(raw){this.raw=raw;this.uid=null;}
 key(uid){return uid?`${SAVE_KEY}:account:${uid}`:SAVE_KEY;}
 getItem(key){return this.raw.getItem(key===SAVE_KEY?this.key(this.uid):key);}
 setItem(key,value){this.raw.setItem(key===SAVE_KEY?this.key(this.uid):key,value);}
 read(uid){return this.raw.getItem(this.key(uid));}
}
export function decodeSave(payload){
 if(typeof payload!=='string')throw Error('invalid-save');
 const result=load({getItem:key=>key===SAVE_KEY?payload:null,setItem(){}});
 if(result.status!=='loaded')throw Error('invalid-save');
 return result.state;
}
export class CloudSaveSession {
 constructor({storage,remote,apply,status=()=>{}}){Object.assign(this,{storage,remote,apply,status});this.generation=0;this.ready=false;this.blocked=false;this.running=false;}
 cacheKey(uid){return `pokemon-eternal-sync:${uid}`;}
 cache(){this.storage.raw.setItem(this.cacheKey(this.uid),JSON.stringify({revision:this.revision,payload:this.payload,dirty:this.dirty}));}
 backup(uid,payload){if(!payload)return;const prefix=`pokemon-eternal-backup:${uid}:${Date.now()}`;let key=prefix,n=0;while(this.storage.raw.getItem(key))key=`${prefix}:${++n}`;this.storage.raw.setItem(key,payload);}
 async open(uid){
  const generation=++this.generation;this.ready=false;this.blocked=false;this.uid=uid;this.status('loading');
  try{
   const remote=await this.remote.read(uid);if(generation!==this.generation)return;
   if(remote)decodeSave(remote.payload);
   let cached=null;try{cached=JSON.parse(this.storage.raw.getItem(this.cacheKey(uid)));if(cached)decodeSave(cached.payload);}catch{cached=null;}
   const local=this.storage.read(uid),guest=this.storage.read(null);
   const guestOwner=this.storage.raw.getItem('pokemon-eternal-guest-owner');
   const canMigrateGuest=!guestOwner||guestOwner===uid;
   let payload=remote?.payload||local||(canMigrateGuest?guest:null)||JSON.stringify(initialState());
   const migratingGuest=!remote&&!local&&canMigrateGuest&&!!guest;
   if(!payload)throw Error('missing-local-save');
   if(cached?.dirty&&cached.revision===(remote?.revision||0))payload=cached.payload;
   else if(cached?.dirty&&cached.payload!==payload){this.backup(uid,cached.payload);this.status('recovered');}
   if(local&&local!==payload)this.backup(uid,local);
   const decoded=decodeSave(payload);this.revision=remote?.revision||0;this.payload=JSON.stringify(decoded);this.dirty=this.payload!==remote?.payload;
   if(migratingGuest)this.storage.raw.setItem('pokemon-eternal-guest-owner',uid);
   this.storage.uid=uid;this.storage.setItem(SAVE_KEY,this.payload);this.cache();
   this.apply(decoded);this.ready=true;this.status(this.dirty?'pending':'saved');
   // Cloud reading is complete. Saving must not block game entry.
   if(this.dirty)void this.flush();
  }catch(error){if(generation!==this.generation)return;this.ready=false;this.blocked=true;this.status('load-error',error);throw error;}
 }
 queue(state){if(!this.ready)return;const payload=JSON.stringify(state);if(payload===this.payload)return;this.payload=payload;this.dirty=true;try{this.cache();}catch(e){this.status('local-error',e);return;}if(!this.blocked)this.status('pending');}
 flush(){
  if(this.running)return this.inFlight;
  if(!this.ready||!this.dirty||this.blocked)return Promise.resolve();
  this.inFlight=this.writePending();return this.inFlight;
 }
 async writePending(){
  this.running=true;const generation=this.generation,uid=this.uid,payload=this.payload,revision=this.revision;
  try{const next=await this.remote.write(uid,revision,payload);if(generation!==this.generation)return;this.revision=next;this.dirty=this.payload!==payload;this.cache();this.status(this.dirty?'pending':'saved');}
  catch(error){if(generation!==this.generation)return;if(error.message==='save-conflict')this.blocked=true;this.status(this.blocked?'conflict':'save-error',error);}
  finally{this.running=false;}
 }
 cancel(){this.generation++;this.ready=false;this.blocked=true;}
}
