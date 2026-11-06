import './title.css';
export function showTitle({onStart,account,getNotice=()=>''}){
 const assets=globalThis.POKEMON_TITLE||{logo:'/title/logo.png',background:'/title/background.png',bgm:'/title/bgm.mp3'};
 const shell=document.querySelector('.game-shell');shell.inert=true;
 const root=document.createElement('section');root.className='eternal-title';root.setAttribute('aria-label','포켓몬 이터널 타이틀');
 root.innerHTML=`<div class="title-landscape"><img class="title-background" alt="" src="${assets.background}"><img class="eternal-logo" src="${assets.logo}" alt="포켓몬 이터널"><div class="title-flash" aria-hidden="true"></div><div class="title-actions"><button class="title-start">게임 시작</button><button class="title-link">계정 연동 <small>Google</small></button><p class="title-message" role="status"></p></div></div>`;
 document.body.append(root);document.title='포켓몬 이터널';
 const music=new Audio(assets.bgm);music.loop=true;music.volume=.45;music.preload='auto';music.dataset.titleBgm='true';root.append(music);
 let closed=false,unsubscribe=()=>{};
 const message=root.querySelector('.title-message'),link=root.querySelector('.title-link');
 const play=()=>{if(closed||document.hidden)return;music.play().then(()=>{if(message.dataset.audio){message.textContent='';delete message.dataset.audio;}}).catch(()=>{if(!message.textContent){message.dataset.audio='true';message.textContent='화면을 터치하면 음악이 재생됩니다.';}});};
 const visibility=()=>document.hidden?music.pause():play();document.addEventListener('visibilitychange',visibility);root.addEventListener('pointerdown',play);root.addEventListener('keydown',play);play();

 const start=root.querySelector('.title-start');start.disabled=true;
 const refresh=()=>{if(closed)return;link.hidden=!!account.user;const notice=getNotice();if(notice){delete message.dataset.audio;message.textContent=notice;}};
 unsubscribe=account.subscribe(refresh);
 account.ready.then(()=>{if(!closed){start.disabled=false;refresh();}});
 start.onclick=async()=>{
  start.disabled=true;await account.ready;
  if(!account.canStart){await account.retry();if(!account.canStart){refresh();start.disabled=false;return;}}
  closed=true;music.pause();music.currentTime=0;unsubscribe();document.removeEventListener('visibilitychange',visibility);root.remove();shell.inert=false;onStart();
 };
 link.onclick=async()=>{
  link.disabled=true;
  try{await account.login();}
  catch(e){if(!closed){delete message.dataset.audio;message.textContent=e.message==='auth-unconfigured'?'Google 계정 연동 준비 중입니다. 게임 시작은 이용할 수 있습니다.':e.code==='auth/popup-closed-by-user'?'계정 연동을 취소했습니다.':'Google 로그인에 실패했습니다. 팝업 허용과 연결 상태를 확인해 주세요.';}}
  finally{link.disabled=false;}
 };
 return {music};
}
