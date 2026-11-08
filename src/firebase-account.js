import {FIREBASE_PROJECT,FIREBASE_DATABASE,validateFirebaseConfig,readCloudSnapshot} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithPopup,signOut,GoogleAuthProvider} from 'firebase/auth';
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore/lite';
import {CloudSaveSession} from './cloud-save.js';
import {prepareAccountLogout} from './account-logout.js';
// Chunking preserves the full save even when inventory grows beyond Firestore's document limit.
export function firestoreRemote(db){
 const ref=uid=>doc(db,'players',uid),chunk=(uid,n)=>doc(db,'players',uid,'saveChunks',String(n));
 return {
  read:uid=>readCloudSnapshot(async n=>{
   const snap=await getDoc(n===null?ref(uid):chunk(uid,n));
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
 let auth,session,user=null,initial=true,config,bootError=null,loading=false,opening=null,loggingOut=false,initializing=true,initialized=false,initializationError=null,bootstrap=null,unsubscribeAuth=null;
 const listeners=new Set();let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const notify=()=>{onChange?.();for(const listener of listeners)listener();};
 const api={ready,get user(){return user},get configured(){return !!auth&&initialized},get initializing(){return initializing},get initializationError(){return initializationError},get loading(){return loading||loggingOut||initializing},get canStart(){return initialized&&!!user&&!loading&&!loggingOut&&!bootError&&!!session?.ready},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},queue(){if(!loggingOut)session?.queue(getState())},flush(){if(loggingOut)return;api.queue();return session?.flush()},async login(){if(!initialized)await initialize();if(user)return;if(!auth)throw Error('auth-unconfigured');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);},async retry(){if(user&&session&&!loggingOut)await openAccount()},async logout(){
  await ready;if(!auth||!user||loggingOut)return;
  loggingOut=true;notify();
  try{await prepareAccountLogout(session,getState());await signOut(auth);session?.cancel();location.reload();}
  catch(error){loggingOut=false;notify();throw error;}
 }};
 async function openAccount(){
  if(opening)return opening;
  loading=true;bootError=null;notify();
  opening=(async()=>{let timer;try{
   await Promise.race([session.open(user.uid),new Promise((_,reject)=>{timer=setTimeout(()=>{session.cancel();reject(Object.assign(Error('cloud-timeout'),{code:'deadline-exceeded'}));},45000);})]);
  }catch(error){bootError=error;status('load-error',error);}finally{clearTimeout(timer);loading=false;opening=null;notify();}})();
  return opening;
 }
 async function readConfig(){
  if(location.protocol==='file:')return validateFirebaseConfig(globalThis.POKEMON_AUTH_CONFIG);
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch('/auth-config.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Object.assign(Error('Firebase 설정 파일을 읽지 못했습니다.'),{code:'config/http-'+response.status});
    const value=validateFirebaseConfig(await response.json());
    if(!value?.apiKey)throw Object.assign(Error('Google 계정 연동 설정을 확인해 주세요.'),{code:'auth-unconfigured'});
    return value;
   }catch(error){lastError=error;if(error.code==='config/project-mismatch')throw error;if(attempt<2)await new Promise(r=>setTimeout(r,300*2**attempt));}
  }
  throw lastError;
 }
 function initialize(){
  if(initialized)return Promise.resolve();
  if(bootstrap)return bootstrap;
  initializing=true;initializationError=null;notify();
  bootstrap=(async()=>{
   try{
    config=await readConfig();
    if(!config?.apiKey)throw Object.assign(Error('Google 계정 연동 설정을 확인해 주세요.'),{code:'auth-unconfigured'});
    const app=getApps().some(a=>a.name==='[DEFAULT]')?getApp():initializeApp(config);
    validateFirebaseConfig(app.options);
    auth=getAuth(app);await setPersistence(auth,browserLocalPersistence);
    session ||= new CloudSaveSession({storage,remote:firestoreRemote(getFirestore(auth.app,FIREBASE_DATABASE)),apply,status:(state,error)=>{if(error)error.firestoreTarget=`${FIREBASE_PROJECT}/${FIREBASE_DATABASE}`;status(state,error);notify();}});
    unsubscribeAuth?.();
    await new Promise((resolve,reject)=>{
     unsubscribeAuth=onAuthStateChanged(auth,next=>{
      const google=next?.providerData.some(p=>p.providerId==='google.com')?next:null;
      if(!initial&&user&&user.uid!==google?.uid){session?.cancel();location.reload();return;}
      initial=false;user=google;bootError=null;initialized=true;initializing=false;initializationError=null;
      // Publish the restored identity immediately; cloud loading has its own gate.
      if(user)void openAccount();
      resolveReady();resolve();notify();
     },error=>{initializationError=error;bootError=error;initialized=false;initializing=false;status('auth-error',error);resolveReady();notify();reject(error);});
    });
   }catch(error){initializationError=error;bootError=error;initializing=false;status('auth-error',error);resolveReady();notify();throw error;}
   finally{bootstrap=null;}
  })();return bootstrap;
 }
 void initialize().catch(()=>{});
 return api;
}
