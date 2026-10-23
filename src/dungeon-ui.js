import {DUNGEONS,EVOLUTION_TYPES,DUNGEON_STAGES} from './dungeon-config.js';
import {dungeonInfo,canEnterDungeon} from './dungeon.js';
import {species} from './data.js';
import {power} from './game.js';
export function createDungeonUI({state,art,icon,icons,onEnter,onLeave,onHome,sound}) {
  const root=document.querySelector('#dungeon-page');
  let opened=false,run=null,selectedId=null,selectedStage=1;
  const n=v=>v.toLocaleString('ko-KR');
  const wallet=()=>`<div class="dungeon-wallet"><strong>보유 재료</strong><span>이상한사탕 ${n(state.candies)}</span>${EVOLUTION_TYPES.map(t=>`<span>${t.name} ${n(state.materials[t.id])}</span>`).join('')}</div>`;
  const header=(title,back='dungeonMenu')=>`<header class="dungeon-header"><div><span class="eyebrow">탐험대의 새로운 도전</span><h1>${title}</h1></div><button class="soft-button" data-action="${back}">${icon('chevron-left')}${back==='dungeonExit'?'홈으로':'돌아가기'}</button></header>`;
  function show(html){root.innerHTML=html;icons();}
  function menu(){run=null;show(header('던전','dungeonExit')+`<div class="dungeon-content"><div class="dungeon-cards">${[
    ['coin','포켓코인 던전',52,'성장에 필요한 포켓코인 획득','포켓코인'],
    ['evolution','진화재료 던전',133,'타입을 선택해 진화 재료 수집','타입별 진화 재료'],
    ['candy','이상한사탕 던전',113,'포켓몬 레벨업에 필요한 사탕 획득','이상한사탕'],
  ].map(([id,name,p,desc,reward])=>`<button class="dungeon-card" data-action="dungeonSelect" data-dungeon="${id}">${art(species(p),'field-art')}<h2>${name}</h2><p>${desc}</p><strong>주요 보상 · ${reward}</strong><small>${id==='evolution'?'6개 타입 던전 선택':`최고 클리어 ${state.dungeonClears[id]} / ${DUNGEON_STAGES}단계`}</small></button>`).join('')}</div>${wallet()}<p class="dungeon-note">현재 편성으로 도전 · 입장 비용 없음 · 클리어한 단계 반복 도전 가능</p></div>`);}
  function types(){run=null;show(header('타입별 진화재료 던전')+`<div class="dungeon-content"><div class="dungeon-types">${EVOLUTION_TYPES.map(t=>`<button class="dungeon-card type-dungeon" style="--type-color:${t.color}" data-action="dungeonSelect" data-dungeon="evolution-${t.id}">${icon(t.icon)}<h2>${t.name}타입</h2>${art(species(t.enemy))}<strong>${t.name} 진화 재료</strong><small>최고 클리어 ${state.dungeonClears[`evolution-${t.id}`]} / 10단계</small></button>`).join('')}</div>${wallet()}<p class="dungeon-note">재료는 타입별로 보관됩니다. 진화 기능은 추후 추가됩니다.</p></div>`);}
  function stages(id,stage=1){
    run=null;selectedId=id;selectedStage=stage;const d=dungeonInfo(id,stage);if(!d)return menu();
    const partyPower=state.inventory.filter(p=>state.party.includes(p.uid)).reduce((v,p)=>v+power(p),0);
    show(header(d.name,id.startsWith('evolution-')?'dungeonTypes':'dungeonMenu')+`<div class="dungeon-content"><div class="dungeon-stage-list">${Array.from({length:DUNGEON_STAGES},(_,i)=>`<button class="soft-button ${stage===i+1?'selected':''}" data-action="dungeonStage" data-stage="${i+1}" ${canEnterDungeon(state,id,i+1)?'':'disabled'}>${i+1}단계<small>${state.dungeonClears[id]>=i+1?'클리어':canEnterDungeon(state,id,i+1)?'도전 가능':'잠김'}</small></button>`).join('')}</div><div class="dungeon-preview">${art(species(d.enemy),'field-art')}<div><h2>${stage}단계 · ${species(d.enemy).name}</h2><p>적 전투력 <b>${n(d.power)}</b> · HP ${n(d.hp)} · 공격력 ${n(d.atk)}</p><p>탐험대 ${state.party.length}마리 · 전투력 ${n(partyPower)}</p><p class="dungeon-reward">예상 보상 · ${d.reward} ${n(d.amount)}개</p><button class="primary-button" data-action="dungeonEnter">${icon('swords')}던전 입장</button></div></div>${wallet()}</div>`);
  }
  function start(){
    if(!canEnterDungeon(state,selectedId,selectedStage))return;
    run=null;opened=false;root.hidden=true;
    document.querySelector('.game-shell').classList.remove('in-dungeon');
    onEnter(dungeonInfo(selectedId,selectedStage));
  }
  function result(){const won=run.status==='won',d=run.info;show(header('던전 결과')+`<div class="dungeon-content"><div class="dungeon-result ${won?'won':''}">${icon(won?'trophy':'heart')}<h2>${won?'던전 클리어!':'다시 도전해 보세요'}</h2><p>${d.name} · ${d.stage}단계</p><strong>${won?`${d.reward} ${n(d.amount)}개 획득`:'획득 보상 없음'}</strong><p>${won?(d.stage<10?`${d.stage+1}단계 도전 가능`:'모든 단계를 클리어했어요!'):'편성과 레벨을 정비하면 더 멀리 도전할 수 있어요.'}</p><div class="dungeon-result-actions"><button class="primary-button" data-action="dungeonEnter">${won?'다시 도전':'재도전'}</button><button class="soft-button" data-action="dungeonStages">단계 선택</button></div></div>${wallet()}</div>`);sound.effect(won?'clear':'defeat');}
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
        case 'dungeonStage':if(canEnterDungeon(state,selectedId,Number(btn.dataset.stage)))stages(selectedId,Number(btn.dataset.stage));break;
        case 'dungeonStages':case 'dungeonRetreat':stages(selectedId,selectedStage);break;
        case 'dungeonEnter':start();break;
        default:return false;
      }return true;
    }
  };
}
