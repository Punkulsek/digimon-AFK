import './title.css';
export function showTitle({onStart}){
 const assets=globalThis.POKEMON_TITLE||{logo:'/title/logo.png',background:'/title/background.png',bgm:'/title/bgm.mp3'};
 const shell=document.querySelector('.game-shell');shell.inert=true;
 const root=document.createElement('section');root.className='eternal-title';root.setAttribute('aria-label','포켓몬 이터널 타이틀');
 root.innerHTML=`<div class="title-landscape"><img class="title-background" alt="" src="${assets.background}"><img class="eternal-logo" src="${assets.logo}" alt="포켓몬 이터널"><div class="title-flash" aria-hidden="true"></div><div class="title-actions"><button class="title-start">게임 시작</button><button class="title-link">계정 연동 <small>Google</small></button><p class="title-message" role="status"></p></div></div>`;
 document.body.append(root);document.title='포켓몬 이터널';
 const music=new Audio(assets.bgm);music.loop=true;music.volume=.45;music.preload='auto';music.dataset.titleBgm='true';root.append(music);
 let closed=false,auth=null,sdk=null,unsubscribe=()=>{};
 const message=root.querySelector('.title-message'),link=root.querySelector('.title-link');
 const play=()=>{if(closed||document.hidden)return;music.play().then(()=>{if(message.dataset.audio){message.textContent='';delete message.dataset.audio;}}).catch(()=>{if(!message.textContent){message.dataset.audio='true';message.textContent='화면을 터치하면 음악이 재생됩니다.';}});};
 const visibility=()=>document.hidden?music.pause():play();document.addEventListener('visibilitychange',visibility);root.addEventListener('pointerdown',play);root.addEventListener('keydown',play);play();
 root.querySelector('.title-start').onclick=()=>{closed=true;music.pause();music.currentTime=0;unsubscribe();document.removeEventListener('visibilitychange',visibility);root.remove();shell.inert=false;onStart();};
 let config=globalThis.POKEMON_AUTH_CONFIG;
 async function prepare(){
  if(!config && location.protocol!=='file:')try{config=await (await fetch('/auth-config.json')).json();}catch{}
  if(!config?.apiKey||!config?.authDomain||!config?.projectId)return;
  try{
   const appUrl='https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',authUrl='https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
   const app=await import(/* @vite-ignore */ appUrl);sdk=await import(/* @vite-ignore */ authUrl);
   auth=sdk.getAuth(app.initializeApp(config));await sdk.setPersistence(auth,sdk.browserLocalPersistence);
   if(closed)return;
   unsubscribe=sdk.onAuthStateChanged(auth,user=>{if(closed)return;const linked=!!user?.providerData.some(p=>p.providerId==='google.com');link.hidden=linked;if(linked)message.textContent='Google 계정 연동 완료';});
  }catch{if(!closed)message.textContent='계정 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';}
 }
 const ready=prepare();
 link.onclick=async()=>{
  await ready;
  if(!config?.apiKey){message.textContent='Google 계정 연동 준비 중입니다. 게임 시작은 이용할 수 있습니다.';delete message.dataset.audio;return;}
  link.disabled=true;await ready;
  try{if(!auth)throw Error();await sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider());}
  catch(e){if(!closed){delete message.dataset.audio;message.textContent=e.code==='auth/popup-closed-by-user'?'계정 연동을 취소했습니다.':'Google 로그인에 실패했습니다. 팝업 허용과 연결 상태를 확인해 주세요.';}}
  finally{link.disabled=false;}
 };
 return {music};
}
