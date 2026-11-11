import {dungeonKey} from './reward-icons.js';
import {syncKeys,keyType,spendKey,sweepDungeon} from './activity-rewards.js';
import {typeIcon} from './type-icons.js';
import './tower-ui.css';
import {dungeonScenery,panoramaStyle} from './battle-scenery.js';
import {DUNGEONS,EVOLUTION_TYPES,DUNGEON_STAGES,dungeonLimit} from './dungeon-config.js';
import {dungeonInfo,canEnterDungeon} from './dungeon.js';
import {species} from './data.js';
import {power} from './game.js';
export function createDungeonUI({state,art,icon,icons,onEnter,onLeave,onHome,sound,persist}) {
  const root=document.querySelector('#dungeon-page');
  let dungeonTab="daily";
  let opened=false,run=null,selectedId=null,selectedStage=1,towerResizeObserver=null;
  const typeBackground=t=>{const a=t&&dungeonScenery(['coin','candy','rune'].includes(t.id)||t.id.startsWith('evolution-')?t.id:`evolution-${t.id}`);return a?`<div class="type-background" data-atlas="${a.atlas}" style="${panoramaStyle(a)}" aria-hidden="true"></div>`:'';};
  const badge=id=>{const type=id==='evolution'?'evolution':keyType(id);return type?`<span class="dungeon-key-badge" data-key-type="${type}" aria-label="보유 열쇠">${dungeonKey(type)}<b data-key-count>${syncKeys(state)[type]}</b><span>/6</span></span>`:'';};
  const rewardArt=id=>id.startsWith('evolution-')?typeIcon(id.slice(10)):`<img class="dungeon-reward-sprite" src="${id==='coin'||id==='tower'?'/currency/pokecoin.png':id==='candy'?'/items/rare-candy.png':'/items/pokemon-dust.svg'}" alt="">`;
  const n=v=>v.toLocaleString('ko-KR');
  const header=(title,back='dungeonMenu')=>`<header class="dungeon-header"><div><h1>${title}</h1></div><button class="soft-button" data-action="${back}">${icon('chevron-left')}${back==='dungeonExit'?'홈으로':'돌아가기'}</button></header>`;
  function show(html){towerResizeObserver?.disconnect();root.classList.toggle('tower-page',html.includes('tower-layout'));root.classList.toggle('dungeon-challenge',html.includes('challenge-layout'));root.classList.toggle('dungeon-selection',html.includes('dungeon-cards')||html.includes('dungeon-types'));root.innerHTML=html+`<nav class="collection-subnav dungeon-bottom-tabs" aria-label="던전 하위 메뉴">${[['challenge','도전 던전'],['daily','일일 던전']].map(([id,name])=>`<button class="${dungeonTab===id?'selected':''}" data-action="dungeonTab" data-tab="${id}" aria-pressed="${dungeonTab===id}">${name}</button>`).join('')}</nav>`;icons();}
  function menu(){run=null;show(header('던전','dungeonExit')+`<div class="dungeon-content"><div class="dungeon-cards">${(dungeonTab==='challenge'?[['tower','모다피의 탑',69,'swords']]:[
    ['coin','포켓코인 던전',52,'coins'],
    ['evolution','진화재료 던전',133,'leaf'],
    ['candy','이상한사탕 던전',113,'sparkles'],
    ['rune','포켓룬 던전',121,'gem'],
  ]).map(([id,name,p,symbol])=>`<button class="dungeon-card dungeon-banner ${dungeonTab==='daily'?'daily-banner':''}" data-action="dungeonSelect" data-dungeon="${id}">${dungeonTab==='daily'?typeBackground({id:id==='evolution'?'evolution-electric':id}):''}<div class="dungeon-banner-art">${art(species(p),'field-art')}</div><span class="dungeon-emblem">${id==='rune'?rewardArt(id):icon(symbol)}</span><div class="dungeon-banner-title"><h2>${name}</h2></div><small>${id==='evolution'?'18개 타입 · 타입 선택':id==='tower'?`${state.dungeonClears[id]} / ${dungeonLimit(id)}층 클리어`:`${Math.min((state.dungeonClears[id]||0)+1,dungeonLimit(id))} 스테이지`}</small>${badge(id)}<span class="dungeon-banner-arrow" aria-hidden="true">›</span></button>`).join('')}</div></div>`);}
  function types(){run=null;show(header('진화재료 던전')+`<div class="dungeon-content"><div class="dungeon-types">${EVOLUTION_TYPES.map(t=>`<button class="dungeon-card dungeon-banner type-dungeon" style="--type-color:${t.color}" data-action="dungeonSelect" data-dungeon="evolution-${t.id}">${typeBackground(t)}<div class="dungeon-banner-art">${art(species(t.enemy))}</div><span class="dungeon-emblem">${typeIcon(t.id)}</span><div class="dungeon-banner-title"><h2>${t.name}타입</h2></div><small>${state.dungeonClears[`evolution-${t.id}`]} / ${DUNGEON_STAGES}단계 클리어</small>${badge(`evolution-${t.id}`)}</button>`).join('')}</div></div>`);}
  function stages(id,stage=1){
    if(id==='tower')return tower(stage);
    run=null;selectedId=id;selectedStage=stage;const d=dungeonInfo(id,stage);if(!d)return menu();const limit=dungeonLimit(id);
    const partyPower=state.inventory.filter(p=>state.party.includes(p.uid)).reduce((v,p)=>v+power(p,state),0);
    root.dataset.challenge=id;
    const party=state.party.map(uid=>state.inventory.find(p=>p.uid===uid));
    show(header(d.name,id.startsWith('evolution-')?'dungeonTypes':'dungeonMenu')+`<div class="challenge-layout"><div class="dungeon-preview challenge-hero">${typeBackground(EVOLUTION_TYPES.find(t=>id===`evolution-${t.id}`)||{id})}<div class="challenge-enemy-name">${id==='tower'?`${stage}층 · ${d.boss?'보스 층':'일반 층'} · `:''}${species(d.enemy).name}</div><div class="challenge-reward"><span>${rewardArt(id)}</span><strong>${n(d.amount)}</strong><small>${d.reward}</small></div><div class="challenge-enemy-art">${art(species(d.enemy),'field-art')}</div><div class="challenge-controls"><div class="challenge-enemy-power">${icon('swords')} ${n(d.power)}</div><span>스테이지 선택</span><div class="challenge-stepper"><button data-action="dungeonStep" data-delta="-1" aria-label="이전 단계" ${stage<=1?'disabled':''}>−</button><b>${stage}</b><button data-action="dungeonStep" data-delta="1" aria-label="다음 단계" ${stage>=limit||!canEnterDungeon(state,id,stage+1)?'disabled':''}>+</button></div></div><p class="dungeon-reward challenge-reward-caption">예상 보상 · ${d.reward} ${n(d.amount)}개</p></div><section class="challenge-team"><div class="challenge-team-heading"><strong>${icon('swords')} 전투력 ${n(partyPower)}</strong><button class="soft-button" data-action="collection">편성하기</button></div><div class="challenge-party">${Array.from({length:5},(_,i)=>{const p=party[i];return p?`<div class="challenge-party-card"><small>Lv.${p.level}</small>${art(species(p.speciesId))}<strong>${species(p.speciesId).name}</strong></div>`:'<div class="challenge-party-card empty">+</div>';}).join('')}</div><div class="challenge-stage-heading">스테이지 <small>${state.dungeonClears[id]} / ${DUNGEON_STAGES} 클리어</small></div><div class="dungeon-stage-list">${Array.from({length:limit},(_,i)=>`<button class="soft-button ${stage===i+1?'selected':''}" data-action="dungeonStage" data-stage="${i+1}" aria-label="${i+1}단계" aria-pressed="${stage===i+1}" ${canEnterDungeon(state,id,i+1)?'':'disabled'}>${i+1}</button>`).join('')}</div><div class="challenge-footer">${badge(id)}<button class="soft-button" data-action="dungeonSweep" ${state.dungeonClears[id]>=stage&&syncKeys(state)[keyType(id)]>0?'':'disabled'}>소탕 · 열쇠 1개</button><button class="primary-button challenge-enter" data-action="dungeonEnter" aria-label="던전 입장">${icon('swords')}<span>도전하기!<small>열쇠 1개 사용</small></span></button></div></section></div>`);

  }
  const towerCurrent=()=>Math.min(dungeonLimit('tower'),(state.dungeonClears.tower||0)+1);
  const towerStatus=floor=>floor<=(state.dungeonClears.tower||0)?'cleared':floor===(state.dungeonClears.tower||0)+1?'current':'locked';
  const towerStatusLabel={cleared:'클리어 완료',current:'도전 가능',locked:'미개방'};
  const ballMark='<span class="tower-ball" aria-hidden="true"></span>';
  function towerDetail(stage){
    const d=dungeonInfo('tower',stage),status=towerStatus(stage);
    return `<header class="tower-detail-heading"><span class="tower-heading-leaf" aria-hidden="true">${icon('leaf')}</span><h2>모다피의 탑 <b>${stage}</b>층</h2><span class="tower-state ${status}">${status==='cleared'?icon('check'):icon(status==='current'?'swords':'shield')}${towerStatusLabel[status]}</span></header>
      <div class="tower-detail-body">
        <div class="tower-encounter">

          <section class="tower-opponents"><h3>${ballMark} 출현 정보 <small>5마리</small></h3><div class="tower-enemies">${d.enemies.map((id,i)=>`<div class="tower-enemy-card ${d.boss&&i===0?'tower-boss':''}">${d.boss&&i===0?`<span class="tower-boss-label">${icon('crown')} 보스</span>`:''}${art(species(id))}<strong>${species(id).name}</strong></div>`).join('')}</div></section>
        </div>
        <div class="tower-reward-info"><section class="tower-rewards"><h3>${icon('gift')} 클리어 보상</h3><div class="tower-reward"><span class="tower-coin"><img src="${globalThis.POKEMON_CURRENCY?.pokecoin||'/currency/pokecoin.png'}" alt="포켓코인"></span><div><span>포켓코인</span><strong>× ${n(d.amount)}</strong></div>${d.boss?'<span class="tower-bonus">보스 층 보상</span>':''}</div></section><section class="tower-floor-info"><p>${icon('swords')}<span>상대 전투력</span><strong>${n(d.power)}</strong></p></section></div>
        <footer class="tower-detail-footer">${status==='current'?`<button class="tower-enter" data-action="dungeonEnter" aria-label="던전 입장">${ballMark} 도전하기</button><p>현재 편성으로 ${stage}층에 도전합니다.</p>`:`<div class="tower-unavailable ${status}">${icon(status==='cleared'?'check':'shield')}<strong>${status==='cleared'?'클리어한 층입니다':`${stage-1}층 클리어 후 도전할 수 있습니다`}</strong></div><button class="tower-current-link" data-action="towerCurrent">${(state.dungeonClears.tower||0)>=dungeonLimit('tower')?'최상층 보기':`현재 도전 층 · ${towerCurrent()}층으로 이동`}${icon('chevron-right')}</button>`}</footer>
      </div>`;
  }
  function centerTowerSelection(){
    const list=root.querySelector('.tower-floors'),selected=list?.querySelector('.selected');
    if(selected)list.scrollTop+=selected.getBoundingClientRect().top-list.getBoundingClientRect().top-(list.clientHeight-selected.clientHeight)/2;
  }
  function tower(stage=towerCurrent()){
    if(!dungeonInfo('tower',stage))return;
    selectedId='tower';selectedStage=stage;dungeonTab='challenge';run=null;
    const existing=root.querySelector('.tower-details');
    if(existing&&root.dataset.towerCleared===String(state.dungeonClears.tower||0)){
      // Keep the scrolling tower and the focused floor button mounted.
      existing.innerHTML=towerDetail(stage);
      root.querySelectorAll('.tower-floor').forEach(button=>{const selected=Number(button.dataset.stage)===stage;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
      icons();return;
    }
    const cleared=state.dungeonClears.tower||0,limit=dungeonLimit('tower');
    show(`<header class="tower-header"><button class="tower-back" data-action="dungeonMenu" aria-label="도전 던전으로 돌아가기">${icon('chevron-left')}</button><div class="tower-title">${art(species(69))}<h1>모다피의 탑</h1></div></header>
      <div class="tower-layout"><section class="tower-map" aria-label="층 선택"><button class="tower-scroll-arrow tower-scroll-up" data-action="towerScroll" data-delta="-1" aria-label="위쪽 층 보기">${icon('chevron-up')}</button><div class="tower-floors" tabindex="0" aria-label="모다피의 탑 1층부터 200층까지 스크롤"><div class="tower-roof">${icon('leaf')}</div>${Array.from({length:limit},(_,i)=>{const floor=limit-i,info=dungeonInfo('tower',floor),status=towerStatus(floor);return `<div class="tower-story ${info.boss?'boss-story':''}"><button class="tower-floor ${info.boss?'boss-floor':''} ${floor===stage?'selected':''} ${status}" data-action="dungeonStage" data-stage="${floor}" aria-pressed="${floor===stage}" aria-label="${floor}층${info.boss?' 보스':''} · ${towerStatusLabel[status]}">${ballMark}<span class="tower-floor-text"><b>${floor}층</b></span><span class="tower-floor-state" aria-hidden="true">${icon(status==='cleared'?'check':info.boss?'crown':status==='current'?'swords':'shield')}</span></button></div>`;}).join('')}<div class="tower-entrance">${art(species(69))}</div></div><button class="tower-scroll-arrow tower-scroll-down" data-action="towerScroll" data-delta="1" aria-label="아래쪽 층 보기">${icon('chevron-down')}</button></section><section class="tower-details" aria-label="선택한 층 상세 정보">${towerDetail(stage)}</section></div>`);
    root.dataset.towerCleared=String(cleared);
    centerTowerSelection();
    towerResizeObserver=new ResizeObserver(()=>{if(!root.hidden)centerTowerSelection();});
    towerResizeObserver.observe(root.querySelector('.tower-floors'));
  }
  function start(){
    if(!canEnterDungeon(state,selectedId,selectedStage))return;
    if(selectedId==='tower'&&towerStatus(selectedStage)!=='current')return;
    if(!spendKey(state,selectedId)){stages(selectedId,selectedStage);return;}persist();
    run=null;opened=false;root.hidden=true;
    document.querySelector('.game-shell').classList.remove('in-dungeon');
    onEnter(dungeonInfo(selectedId,selectedStage));
  }

  return {
    refreshKeys(){if(!opened)return;const keys=syncKeys(state);root.querySelectorAll('[data-key-type]').forEach(el=>el.querySelector('[data-key-count]').textContent=keys[el.dataset.keyType]);if(!selectedId||selectedId==='tower')return;const count=syncKeys(state)[keyType(selectedId)];const sweep=root.querySelector('[data-action="dungeonSweep"]');if(sweep)sweep.disabled=!(count>0&&state.dungeonClears[selectedId]>=selectedStage);const enter=root.querySelector('[data-action="dungeonEnter"]');if(enter)enter.disabled=!(count>0);},
    isOpen:()=>opened,
    open(){onLeave();opened=true;root.hidden=false;document.querySelector('.game-shell').classList.add('in-dungeon');menu();},
    close(){onLeave();opened=false;run=null;towerResizeObserver?.disconnect();root.hidden=true;root.innerHTML='';document.querySelector('.game-shell').classList.remove('in-dungeon');},
    returnToChallenge(id,stage){onLeave();opened=true;root.hidden=false;document.querySelector('.game-shell').classList.add('in-dungeon');stages(id,stage);},
    handle(action,btn){
      switch(action){
        case 'dungeonExit':onHome();break;
        case 'dungeonMenu':menu();break;
        case 'dungeonTab':dungeonTab=btn.dataset.tab;menu();break;
        case 'dungeonTypes':types();break;
        case 'dungeonSelect':btn.dataset.dungeon==='evolution'?types():stages(btn.dataset.dungeon,btn.dataset.dungeon==='tower'?Math.min(200,(state.dungeonClears.tower||0)+1):1);break;
        case 'dungeonStep':{const next=selectedStage+Number(btn.dataset.delta);if(next>=1&&next<=dungeonLimit(selectedId)&&canEnterDungeon(state,selectedId,next))stages(selectedId,next);break;}
        case 'dungeonStage':if(selectedId==='tower'||canEnterDungeon(state,selectedId,Number(btn.dataset.stage)))stages(selectedId,Number(btn.dataset.stage));break;
        case 'towerScroll':{const list=root.querySelector('.tower-floors');if(list)list.scrollBy({top:Number(btn.dataset.delta)*list.clientHeight*.7,behavior:'smooth'});break;}
        case 'towerCurrent':tower();centerTowerSelection();break;
        case 'dungeonStages':case 'dungeonRetreat':stages(selectedId,selectedStage);break;
        case 'dungeonSweep':if(sweepDungeon(state,selectedId,selectedStage)){persist();stages(selectedId,selectedStage);}break;
        case 'dungeonEnter':start();break;
        default:return false;
      }return true;
    }
  };
}
