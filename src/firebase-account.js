import {initializeApp,getApps} from 'firebase/app';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithPopup,GoogleAuthProvider} from 'firebase/auth';
import {getFirestore,doc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {CloudSaveSession} from './cloud-save.js';
// Chunking preserves the full save even when inventory grows beyond Firestore's document limit.
export function firestoreRemote(db){
 const ref=uid=>doc(db,'players',uid),chunk=(uid,n)=>doc(db,'players',uid,'saveChunks',String(n));
 return {
  read:uid=>runTransaction(db,async tx=>{
   const head=await tx.get(ref(uid));if(!head.exists())return null;
   const data=head.data();if(data.schema!==1||!Number.isInteger(data.chunks)||data.chunks<1||data.chunks>200||!Number.isInteger(data.revision))throw Error('invalid-cloud-save');
   const pieces=await Promise.all(Array.from({length:data.chunks},(_,n)=>tx.get(chunk(uid,n))));
   if(pieces.some(p=>!p.exists()||p.data().revision!==data.revision||typeof p.data().text!=='string'))throw Error('incomplete-cloud-save');
   return {revision:data.revision,payload:pieces.map(p=>p.data().text).join('')};
  }),
  write:(uid,expected,payload)=>runTransaction(db,async tx=>{
   // 48K UTF-16 code units per document stays well below 1 MiB for every Unicode string.
   if(new TextEncoder().encode(payload).length>7*1024*1024)throw Error('save-too-large');
   const parts=[];for(let i=0;i<payload.length;){let end=Math.min(payload.length,i+48000);const code=payload.charCodeAt(end-1);if(end<payload.length&&code>=0xD800&&code<=0xDBFF)end--;parts.push(payload.slice(i,end));i=end;}
   if(parts.length>200)throw Error('save-too-large');
   const head=await tx.get(ref(uid)),old=head.exists()?head.data():null;
   if((old?.revision||0)!==expected)throw Error('save-conflict');
   const revision=expected+1;
   parts.forEach((text,n)=>tx.set(chunk(uid,n),{text,revision}));
   for(let n=parts.length;n<(old?.chunks||0);n++)tx.delete(chunk(uid,n));
   tx.set(ref(uid),{schema:1,revision,chunks:parts.length,updatedAt:serverTimestamp()});return revision;
  })
 };
}
export function createFirebaseAccount({storage,getState,apply,onChange,status}){
 let auth,session,user=null,initial=true,config,bootError=null;
 const listeners=new Set();let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const notify=()=>{onChange?.();for(const listener of listeners)listener();};
 const api={ready,get user(){return user},get configured(){return !!auth},get canStart(){return !bootError&&(!user||!!session?.ready)},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},queue(){session?.queue(getState())},flush(){api.queue();return session?.flush()},async login(){await ready;if(!auth)throw Error('auth-unconfigured');await signInWithPopup(auth,new GoogleAuthProvider());},async retry(){if(user&&session){bootError=null;await session.open(user.uid).catch(e=>{bootError=e});notify();}},};
 (async()=>{
  try{
   config=globalThis.POKEMON_AUTH_CONFIG;
   if(!config&&location.protocol!=='file:')config=await(await fetch('/auth-config.json',{cache:'no-store'})).json();
   if(!config?.apiKey){resolveReady();notify();return;}
   auth=getAuth(getApps()[0]||initializeApp(config));await setPersistence(auth,browserLocalPersistence);
   session=new CloudSaveSession({storage,remote:firestoreRemote(getFirestore(auth.app)),apply,status:(state,error)=>{status(state,error);notify();}});
   onAuthStateChanged(auth,async next=>{
    const google=next?.providerData.some(p=>p.providerId==='google.com')?next:null;
    if(!initial&&user?.uid!==google?.uid){session?.cancel();location.reload();return;}
    initial=false;user=google;bootError=null;notify();
    if(user)try{await session.open(user.uid);}catch(e){bootError=e;}
    resolveReady();notify();
   },error=>{bootError=error;status('load-error',error);resolveReady();notify();});
  }catch(error){bootError=error;status('load-error',error);resolveReady();notify();}
 })();
 return api;
}
