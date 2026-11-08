import './title.css';
import {preloadGameAssets} from './asset-preload.js';
import {googleLogo} from './google-logo.js';
export function showTitle({onStart,account,getNotice=()=>'',download=preloadGameAssets}){
 const assets=globalThis.POKEMON_TITLE||{logo:'/title/logo.png',background:'/title/background.png',bgm:'/title/bgm.mp3'};
 const shell=document.querySelector('.game-shell');shell.inert=true;
 const root=document.createElement('section');root.className='eternal-title';root.setAttribute('aria-label','포켓몬 이터널 타이틀');
 root.innerHTML=`<div class="title-landscape"><img class="title-background" alt="" src="${assets.background}"><img class="eternal-logo" src="${assets.logo}" alt="포켓몬 이터널"><div class="title-flash" aria-hidden="true"></div><div class="title-download" role="progressbar" aria-label="게임 파일 다운로드" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="title-download-fill"></span><b>0%</b></div><div class="title-actions"><button class="title-start" hidden>게임 시작</button><button class="title-link">${googleLogo}<span>Google 계정 연동</span></button><p class="title-message" role="status"></p></div></div>`;
 document.body.append(root);document.title='포켓몬 이터널';
 const music=new Audio(assets.bgm);music.loop=true;music.volume=.45;music.preload='auto';music.dataset.titleBgm='true';root.append(music);
 let closed=false,unsubscribe=()=>{},assetsReady=false,authReady=false,starting=false,linking=false,downloadError='',loginError='';
 const message=root.querySelector('.title-message'),link=root.querySelector('.title-link');
 const play=()=>{if(closed||document.hidden)return;music.play().then(()=>{if(message.dataset.audio){message.textContent='';delete message.dataset.audio;}}).catch(()=>{if(!message.textContent){message.dataset.audio='true';message.textContent='화면을 터치하면 음악이 재생됩니다.';}});};
 const visibility=()=>document.hidden?music.pause():play();document.addEventListener('visibilitychange',visibility);root.addEventListener('pointerdown',play);root.addEventListener('keydown',play);play();

 const start=root.querySelector('.title-start'),progress=root.querySelector('.title-download');start.disabled=true;link.disabled=true;
 const refresh=()=>{
  if(closed)return;
  link.hidden=!!account.user||!!account.initializing;start.hidden=!account.user;
  link.disabled=!assetsReady||!authReady||!!account.initializing||linking;
  start.disabled=!assetsReady||!authReady||!!account.loading||starting;
  const notice=downloadError||account.initializationError?.message||getNotice()||loginError;
  if(notice){delete message.dataset.audio;message.textContent=notice;}else if(!message.dataset.audio)message.textContent='';
 };
 unsubscribe=account.subscribe(refresh);refresh();
 account.ready.then(()=>{authReady=true;refresh();});
 download({onProgress:({percent})=>{
  if(closed)return;downloadError='';progress.setAttribute('aria-valuenow',String(percent));progress.querySelector('b').textContent=`${percent}%`;progress.querySelector('span').style.width=`${percent}%`;refresh();
 },onError:error=>{
  downloadError=error.message==='storage-full'?'게임 파일을 저장할 공간이 부족합니다. 공간을 확보하면 다시 시도합니다.':error.message==='cache-unavailable'?'이 브라우저에서 게임 파일 캐시를 사용할 수 없습니다. 최신 브라우저의 HTTPS 주소로 접속해 주세요.':'게임 파일 다운로드를 다시 시도하고 있습니다. 연결 상태를 확인해 주세요.';refresh();
 }}).then(()=>{assetsReady=true;downloadError='';progress.hidden=true;refresh();});
 start.onclick=async()=>{
  if(!assetsReady||!authReady||!account.user||account.loading||starting)return;
  starting=true;refresh();
  if(!account.canStart){await account.retry();if(!account.canStart){starting=false;refresh();return;}}
  closed=true;music.pause();music.currentTime=0;unsubscribe();document.removeEventListener('visibilitychange',visibility);root.remove();shell.inert=false;onStart();
 };
 link.onclick=async()=>{
  if(!assetsReady||!authReady||account.initializing||linking)return;
  linking=true;loginError='';refresh();
  try{await account.login();}
  catch(e){loginError=e.code==='auth-unconfigured'||e.message==='auth-unconfigured'?'Google 계정 연동 설정을 확인해 주세요.':e.code==='auth/popup-closed-by-user'?'계정 연동을 취소했습니다.':'Google 로그인 상태를 확인하지 못했습니다. 계정 연동 버튼을 눌러 다시 시도해 주세요.';}
  finally{linking=false;refresh();}
 };
 return {music};
}
