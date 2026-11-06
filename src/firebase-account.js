import {FIREBASE_PROJECT,FIREBASE_DATABASE,validateFirebaseConfig,readCloudSnapshot} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithPopup,GoogleAuthProvider} from 'firebase/auth';
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'firebase/firestore';
import {CloudSaveSession} from './cloud-save.js';
// Chunking preserves the full save even when inventory grows beyond Firestore's document limit.
export function firestoreRemote(db){
 const ref=uid=>doc(db,'players',uid),chunk=(uid,n)=>doc(db,'players',uid,'saveChunks',String(n));
 return {
  read:uid=>readCloudSnapshot(async n=>{
   const snap=await getDocFromServer(n===null?ref(uid):chunk(uid,n));
   return snap.exists()?snap.data():null;
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
 let auth,session,user=null,initial=true,config,bootError=null,loading=false,opening=null;
 const listeners=new Set();let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const notify=()=>{onChange?.();for(const listener of listeners)listener();};
 const api={ready,get user(){return user},get configured(){return !!auth},get loading(){return loading},get canStart(){return !!user&&!loading&&!bootError&&!!session?.ready},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},queue(){session?.queue(getState())},flush(){api.queue();return session?.flush()},async login(){await ready;if(!auth)throw Error('auth-unconfigured');await signInWithPopup(auth,new GoogleAuthProvider());},async retry(){if(user&&session)await openAccount()},};
 async function openAccount(){
  if(opening)return opening;
  loading=true;bootError=null;notify();
  opening=(async()=>{let timer;try{
   await Promise.race([session.open(user.uid),new Promise((_,reject)=>{timer=setTimeout(()=>{session.cancel();reject(Object.assign(Error('cloud-timeout'),{code:'deadline-exceeded'}));},15000);})]);
  }catch(error){bootError=error;status('load-error',error);}finally{clearTimeout(timer);loading=false;opening=null;notify();}})();
  return opening;
 }
 (async()=>{
  try{
   if(location.protocol==='file:')config=globalThis.POKEMON_AUTH_CONFIG;
   else {const response=await fetch('/auth-config.json',{cache:'no-store'});if(!response.ok)throw Object.assign(Error('Firebase 설정 파일을 읽지 못했습니다.'),{code:'config/http-'+response.status});config=await response.json();}
   config=validateFirebaseConfig(config);
   if(!config?.apiKey){resolveReady();notify();return;}
   const app=getApps().some(a=>a.name==='[DEFAULT]')?getApp():initializeApp(config);
   validateFirebaseConfig(app.options);
   auth=getAuth(app);await setPersistence(auth,browserLocalPersistence);
   session=new CloudSaveSession({storage,remote:firestoreRemote(getFirestore(auth.app,FIREBASE_DATABASE)),apply,status:(state,error)=>{if(error)error.firestoreTarget=`${FIREBASE_PROJECT}/${FIREBASE_DATABASE}`;status(state,error);notify();}});
   onAuthStateChanged(auth,async next=>{
    const google=next?.providerData.some(p=>p.providerId==='google.com')?next:null;
    if(!initial&&user&&user.uid!==google?.uid){session?.cancel();location.reload();return;}
    initial=false;user=google;bootError=null;notify();
    if(user)await openAccount();
    resolveReady();notify();
   },error=>{bootError=error;status('load-error',error);resolveReady();notify();});
  }catch(error){bootError=error;status('load-error',error);resolveReady();notify();}
 })();
 return api;
}
