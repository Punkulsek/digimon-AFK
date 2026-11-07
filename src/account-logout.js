// Keep the final snapshot locally even if the network cannot finish before logout.
// Wait for an older in-flight save, then upload the final snapshot if it differs.
export async function prepareAccountLogout(session,state,timeoutMs=8000){
 if(!session?.ready)return;
 session.queue(state);
 let timer;
 try{await Promise.race([
  (async()=>{await session.flush();if(session.dirty&&!session.blocked)await session.flush();})(),
  new Promise(resolve=>{timer=setTimeout(resolve,timeoutMs);})
 ]);}finally{clearTimeout(timer);}
}
