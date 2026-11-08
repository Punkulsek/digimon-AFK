const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function sendPreload(worker,onProgress){
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel();let timer;
  const finish=(error)=>{clearTimeout(timer);channel.port1.close();error?reject(error):resolve();};
  const heartbeat=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('download-timeout')),120000);};heartbeat();
  channel.port1.onmessage=({data})=>{
   heartbeat();
   if(data.type==='progress')onProgress(data);
   if(data.type==='done')finish();
   if(data.type==='error')finish(Error(data.code));
  };
  worker.postMessage({type:'PRELOAD_ASSETS'},[channel.port2]);
 });
}
export async function preloadGameAssets({onProgress=()=>{},onError=()=>{}}={}){
 // Standalone builds already contain the game art and audio as data URLs.
 if(globalThis.POKEMON_TITLE?.logo?.startsWith('data:')||location.protocol==='file:'){onProgress({percent:100});return;}
 let attempt=0;
 for(;;){
  try{
   if(!('serviceWorker' in navigator)||!globalThis.isSecureContext)throw Error('cache-unavailable');
   await navigator.serviceWorker.register('/asset-worker.js',{scope:'/',updateViaCache:'none'});
   const registration=await navigator.serviceWorker.ready;
   await sendPreload(registration.active,onProgress);
   // First navigation must also be controlled so cached files serve immediately.
   if(!navigator.serviceWorker.controller)await new Promise(resolve=>{
    const done=()=>{if(navigator.serviceWorker.controller){navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();}};
    navigator.serviceWorker.addEventListener('controllerchange',done);done();
   });
   return;
  }catch(error){
   onError(error);
   await delay(Math.min(15000,1000*2**Math.min(attempt++,4)));
  }
 }
}
