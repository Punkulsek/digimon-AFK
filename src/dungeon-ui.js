import {DUNGEONS,EVOLUTION_TYPES,DUNGEON_STAGES} from './dungeon-config.js';
import {dungeonInfo,canEnterDungeon} from './dungeon.js';
import {species} from './data.js';
import {power} from './game.js';
export function createDungeonUI({state,art,icon,icons,onEnter,onLeave,onHome,sound}) {
  const root=document.querySelector('#dungeon-page');
  let opened=false,run=null,selectedId=null,selectedStage=1;
  const typeBackground=t=>t?`<div class="type-background" data-atlas="${t.art.atlas}" style="background-position:${t.art.column*100}% ${t.art.row*50}%" aria-hidden="true"></div>`:'';
  const n=v=>v.toLocaleString('ko-KR');
  const header=(title,back='dungeonMenu')=>`<header class="dungeon-header"><div><h1>${title}</h1></div><button class="soft-button" data-action="${back}">${icon('chevron-left')}${back==='dungeonExit'?'홈으로':'돌아가기'}</button></header>`;
  function show(html){root.classList.toggle('dungeon-challenge',html.includes('challenge-layout'));root.classList.toggle('dungeon-selection',html.includes('dungeon-cards')||html.includes('dungeon-types'));root.innerHTML=html;icons();}
  function menu(){run=null;show(header('던전','dungeonExit')+`<div class="dungeon-content"><div class="dungeon-cards">${[
    ['coin','포켓코인 던전',52,'coins'],
    ['evolution','진화재료 던전',133,'leaf'],
    ['candy','이상한사탕 던전',113,'sparkles'],
  ].map(([id,name,p,symbol])=>`<button class="dungeon-card dungeon-banner" data-action="dungeonSelect" data-dungeon="${id}"><div class="dungeon-banner-art">${art(species(p),'field-art')}</div><span class="dungeon-emblem">${icon(symbol)}</span><div class="dungeon-banner-title"><h2>${name}</h2></div><small>${id==='evolution'?'타입 선택':`${state.dungeonClears[id]} / ${DUNGEON_STAGES}단계 클리어`}</small><span class="dungeon-banner-arrow" aria-hidden="true">›</span></button>`).join('')}</div></div>`);}
  function types(){run=null;show(header('진화재료 던전')+`<div class="dungeon-content"><div class="dungeon-types">${EVOLUTION_TYPES.map(t=>`<button class="dungeon-card dungeon-banner type-dungeon" style="--type-color:${t.color}" data-action="dungeonSelect" data-dungeon="evolution-${t.id}">${typeBackground(t)}<div class="dungeon-banner-art">${art(species(t.enemy))}</div><span class="dungeon-emblem">${icon(t.icon)}</span><div class="dungeon-banner-title"><h2>${t.name}타입</h2></div><small>${state.dungeonClears[`evolution-${t.id}`]} / ${DUNGEON_STAGES}단계 클리어</small></button>`).join('')}</div></div>`);}
  function stages(id,stage=1){
    run=null;selectedId=id;selectedStage=stage;const d=dungeonInfo(id,stage);if(!d)return menu();
    const partyPower=state.inventory.filter(p=>state.party.includes(p.uid)).reduce((v,p)=>v+power(p,state),0);
    root.dataset.challenge=id;
    const party=state.party.map(uid=>state.inventory.find(p=>p.uid===uid));
    show(header(d.name,id.startsWith('evolution-')?'dungeonTypes':'dungeonMenu')+`<div class="challenge-layout"><div class="dungeon-preview challenge-hero">${typeBackground(EVOLUTION_TYPES.find(t=>id===`evolution-${t.id}`))}<div class="challenge-enemy-name">${species(d.enemy).name}</div><div class="challenge-reward"><span>${icon(id==='coin'?'coins':id==='candy'?'sparkles':'leaf')}</span><strong>${n(d.amount)}</strong><small>${d.reward}</small></div><div class="challenge-enemy-art">${art(species(d.enemy),'field-art')}</div><div class="challenge-controls"><div class="challenge-enemy-power">${icon('swords')} ${n(d.power)}</div><span>스테이지 선택</span><div class="challenge-stepper"><button data-action="dungeonStep" data-delta="-1" aria-label="이전 단계" ${stage<=1?'disabled':''}>−</button><b>${stage}</b><button data-action="dungeonStep" data-delta="1" aria-label="다음 단계" ${stage>=DUNGEON_STAGES||!canEnterDungeon(state,id,stage+1)?'disabled':''}>+</button></div></div><p class="dungeon-reward challenge-reward-caption">예상 보상 · ${d.reward} ${n(d.amount)}개</p></div><section class="challenge-team"><div class="challenge-team-heading"><strong>${icon('swords')} 전투력 ${n(partyPower)}</strong><button class="soft-button" data-action="collection">편성하기</button></div><div class="challenge-party">${Array.from({length:5},(_,i)=>{const p=party[i];return p?`<div class="challenge-party-card"><small>Lv.${p.level}</small>${art(species(p.speciesId))}<strong>${species(p.speciesId).name}</strong></div>`:'<div class="challenge-party-card empty">+</div>';}).join('')}</div><div class="challenge-stage-heading">스테이지 <small>${state.dungeonClears[id]} / ${DUNGEON_STAGES} 클리어</small></div><div class="dungeon-stage-list">${Array.from({length:DUNGEON_STAGES},(_,i)=>`<button class="soft-button ${stage===i+1?'selected':''}" data-action="dungeonStage" data-stage="${i+1}" aria-label="${i+1}단계" aria-pressed="${stage===i+1}" ${canEnterDungeon(state,id,i+1)?'':'disabled'}>${i+1}</button>`).join('')}</div><div class="challenge-footer"><button class="primary-button challenge-enter" data-action="dungeonEnter" aria-label="던전 입장">${icon('swords')}<span>도전하기!<small>입장 비용 없음</small></span></button></div></section></div>`);

  }
  function start(){
    if(!canEnterDungeon(state,selectedId,selectedStage))return;
    run=null;opened=false;root.hidden=true;
    document.querySelector('.game-shell').classList.remove('in-dungeon');
    onEnter(dungeonInfo(selectedId,selectedStage));
  }
  function result(){const won=run.status==='won',d=run.info;show(header('던전 결과')+`<div class="dungeon-content"><div class="dungeon-result ${won?'won':''}">${icon(won?'trophy':'heart')}<h2>${won?'던전 클리어!':'다시 도전해 보세요'}</h2><p>${d.name} · ${d.stage}단계</p><strong>${won?`${d.reward} ${n(d.amount)}개 획득`:'획득 보상 없음'}</strong><p>${won?(d.stage<10?`${d.stage+1}단계 도전 가능`:'모든 단계를 클리어했어요!'):'편성과 레벨을 정비하면 더 멀리 도전할 수 있어요.'}</p><div class="dungeon-result-actions"><button class="primary-button" data-action="dungeonEnter">${won?'다시 도전':'재도전'}</button><button class="soft-button" data-action="dungeonStages">단계 선택</button></div></div></div>`);sound.effect(won?'clear':'defeat');}
  return {
    isOpen:()=>opened,
    open(){onLeave();opened=true;root.hidden=false;document.querySelector('.game-shell').classList.add('in-dungeon');menu();},
    close(){onLeave();opened=false;run=null;root.hidden=true;root.innerHTML='';document.querySelector('.game-shell').classList.remove('in-dungeon');},
    result(combat){run=combat;opened=true;root.hidden=false;document.querySelector('.game-shell').classList.add('in-dungeon');result();},
    handle(action,btn){
      switch(action){
        case 'dungeonExit':onHome();break;
        case 'dungeonMenu':menu();break;
        case 'dungeonTypes':types();break;
        case 'dungeonSelect':btn.dataset.dungeon==='evolution'?types():stages(btn.dataset.dungeon);break;
        case 'dungeonStep':{const next=selectedStage+Number(btn.dataset.delta);if(next>=1&&next<=DUNGEON_STAGES&&canEnterDungeon(state,selectedId,next))stages(selectedId,next);break;}
        case 'dungeonStage':if(canEnterDungeon(state,selectedId,Number(btn.dataset.stage)))stages(selectedId,Number(btn.dataset.stage));break;
        case 'dungeonStages':case 'dungeonRetreat':stages(selectedId,selectedStage);break;
        case 'dungeonEnter':start();break;
        default:return false;
      }return true;
    }
  };
}
