import './trainer-ui.css';
import {species} from './data.js';
import {EVOLUTION_TYPES} from './dungeon-config.js';
import {typeIcon} from './type-icons.js';
import {normalizeTrainer,trainerProgress,trainerRecords,unlockedPortraits,renameTrainer,setTrainerAvatar} from './trainer.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTrainerUI({state,art,icon,icons,modal,persist,toast}){
  const root=()=>document.querySelector('.trainer-modal');
  function records(){return trainerRecords(state).map(row=>{
    const content=`<span class="trainer-record-icon">${icon(row.icon)}</span><span class="trainer-record-name">${row.label}${row.id==='types'?'<small>타입별 기록 보기 ▾</small>':''}${row.note?`<small data-trainer-note="${row.id}">${row.note}</small>`:''}</span><strong data-trainer-record="${row.id}">${row.value}</strong>`;
    return row.id==='types'?`<details class="trainer-type-records"><summary class="trainer-record-row">${content}</summary><div class="trainer-type-list">${EVOLUTION_TYPES.map(t=>`<div>${typeIcon(t.id)}<span>${t.name}타입 던전</span><b data-trainer-type="${t.id}">${state.dungeonClears[`evolution-${t.id}`]||0}단계</b></div>`).join('')}</div></details>`:`<div class="trainer-record-row">${content}</div>`;
  }).join('');}
  function open(){
    const t=normalizeTrainer(state),p=trainerProgress(state);persist();
    modal('트레이너 프로필','관동지방의 모험가',`<div class="trainer-main-view">
      <section class="trainer-hero" aria-label="트레이너 정보">
        <div class="trainer-portrait-column"><button class="trainer-portrait" data-action="trainerPortraits" aria-label="프로필 이미지 변경"><span class="trainer-portrait-art">${art(species(t.avatarSpeciesId))}</span><span class="trainer-portrait-edit">${icon('camera')}</span></button><button class="trainer-portrait-caption" data-action="trainerPortraits">이미지 변경</button><span class="trainer-id" title="트레이너 ID">${escape(t.id)}</span></div>
        <div class="trainer-identity"><div class="trainer-title-badge">${icon('leaf')} 관동 트레이너</div><div class="trainer-name-row"><strong data-trainer-name>${escape(t.nickname)}</strong><button data-action="trainerRename" aria-label="닉네임 변경">${icon('pencil')}</button></div>
          <div class="trainer-rename" hidden><label for="trainer-nickname">새 닉네임 <small>1~16자</small></label><div><input id="trainer-nickname" type="text" maxlength="32" autocomplete="off" value="${escape(t.nickname)}"><button data-action="trainerRenameSave">저장</button><button data-action="trainerRenameCancel">취소</button></div><p class="trainer-name-error" role="alert"></p></div>
          <div class="trainer-level-row"><strong class="trainer-level">Lv. <b data-trainer-level>${p.level}</b></strong><div class="trainer-level-track" role="progressbar" aria-label="트레이너 레벨 진행" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${p.progress}"><span style="width:${p.progress/5*100}%"></span><b>${p.isMax?'MAX':`${p.progress} / 5`}</b></div></div><p class="trainer-level-note">${p.isMax?'최고 트레이너 레벨 달성':`다음 레벨까지 스테이지 ${5-p.progress}회 클리어`}</p>
        </div>
      </section>
      <section class="trainer-records-panel" aria-labelledby="trainer-records-title"><h3 id="trainer-records-title">${icon('map')} 모험 기록</h3><div class="trainer-record-list" tabindex="0" aria-label="모험 기록 목록">${records()}</div></section>
      <footer class="trainer-footer">${icon('compass')} 포켓몬과 함께 쌓아 온 모험의 발자취</footer>
    </div><section class="trainer-portrait-picker" hidden aria-label="프로필 이미지 선택"><header><button data-action="trainerPortraitBack">${icon('chevron-left')} 프로필로</button><strong>프로필 이미지 선택</strong><span class="trainer-unlock-count"></span></header><p>한 번 획득한 포켓몬은 보유 여부와 관계없이 계속 사용할 수 있어요.</p><div class="trainer-portrait-grid" tabindex="0" aria-label="해금된 포켓몬 목록"></div></section>`,'trainer-modal');
  }
  function portraits(){
    const panel=root();if(!panel)return;
    normalizeTrainer(state);
    panel.querySelector('.trainer-main-view').hidden=true;panel.querySelector('.trainer-portrait-picker').hidden=false;
    const ids=unlockedPortraits(state);panel.querySelector('.trainer-unlock-count').textContent=`${ids.length}종 해금`;
    panel.querySelector('.trainer-portrait-grid').innerHTML=ids.map(id=>`<button class="trainer-portrait-option ${id===state.trainer.avatarSpeciesId?'selected':''}" data-action="trainerSetPortrait" data-species="${id}" aria-label="${species(id).name} 프로필 이미지" aria-pressed="${id===state.trainer.avatarSpeciesId}"><small>No.${String(id).padStart(3,'0')}</small>${art(species(id))}<strong>${species(id).name}</strong><span>${id===state.trainer.avatarSpeciesId?'사용 중':'선택'}</span></button>`).join('');
    icons();panel.querySelector('[data-action="trainerPortraitBack"]').focus({preventScroll:true});
  }
  function back(){const panel=root();if(!panel)return;panel.querySelector('.trainer-main-view').hidden=false;panel.querySelector('.trainer-portrait-picker').hidden=true;panel.querySelector('[data-action="trainerPortraits"]').focus({preventScroll:true});}
  function renameSave(){
    const panel=root();if(!panel)return;
    const input=panel.querySelector('#trainer-nickname'),error=renameTrainer(state,input.value);
    panel.querySelector('.trainer-name-error').textContent=error||'';input.setAttribute('aria-invalid',String(!!error));
    if(error){input.focus();return;}
    panel.querySelector('.trainer-rename').hidden=true;persist();refresh();panel.querySelector('[data-action="trainerRename"]').focus({preventScroll:true});toast('닉네임을 변경했어요.');
  }
  // Update values in place so combat updates never reset scroll or edit inputs.
  function refresh(){
    const panel=root();if(!panel)return;
    const p=trainerProgress(state),t=state.trainer;
    const set=(selector,value)=>{const el=panel.querySelector(selector);if(el&&el.textContent!==String(value))el.textContent=value;};
    set('[data-trainer-name]',t.nickname);set('[data-trainer-level]',p.level);
    const portrait=panel.querySelector('.trainer-portrait-art');
    if(portrait.dataset.species!==String(t.avatarSpeciesId)){portrait.innerHTML=art(species(t.avatarSpeciesId));portrait.dataset.species=String(t.avatarSpeciesId);}
    const track=panel.querySelector('.trainer-level-track');track.setAttribute('aria-valuenow',p.progress);track.firstElementChild.style.width=`${p.progress/5*100}%`;
    set('.trainer-level-track>b',p.isMax?'MAX':`${p.progress} / 5`);set('.trainer-level-note',p.isMax?'최고 트레이너 레벨 달성':`다음 레벨까지 스테이지 ${5-p.progress}회 클리어`);
    for(const row of trainerRecords(state)){set(`[data-trainer-record="${row.id}"]`,row.value);if(row.note)set(`[data-trainer-note="${row.id}"]`,row.note);}
    for(const type of EVOLUTION_TYPES)set(`[data-trainer-type="${type.id}"]`,`${state.dungeonClears[`evolution-${type.id}`]||0}단계`);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.target.id==='trainer-nickname'){e.preventDefault();renameSave();}});
  return {open,refresh,handle(action,button){
    switch(action){
      case 'profile':open();break;
      case 'trainerPortraits':portraits();break;
      case 'trainerPortraitBack':back();break;
      case 'trainerSetPortrait':if(setTrainerAvatar(state,Number(button.dataset.species))){persist();refresh();back();toast('프로필 이미지를 변경했어요.');}break;
      case 'trainerRename':{const panel=root();panel.querySelector('.trainer-rename').hidden=false;const input=panel.querySelector('#trainer-nickname');input.value=state.trainer.nickname;panel.querySelector('.trainer-name-error').textContent='';input.removeAttribute('aria-invalid');input.focus({preventScroll:true});input.select();break;}
      case 'trainerRenameSave':renameSave();break;
      case 'trainerRenameCancel':root().querySelector('.trainer-rename').hidden=true;root().querySelector('[data-action="trainerRename"]').focus({preventScroll:true});break;
      default:return false;
    }return true;
  }};
}
