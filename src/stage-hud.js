import {STAGE_KILLS,BOSS_TURN_LIMIT,BOSS_NAMES,bossTier} from './stages.js';
import './stage-hud.css';

const ball=className=>`<span class="hud-pokeball ${className||''}" aria-hidden="true"></span>`;
export function stageHud(icon){
  return `<div class="stage-hud"><button class="stage-speed" data-action="speed" aria-label="전투 배속 변경">1배</button><div class="boss-progress-ui" id="boss-progress-ui">
    <div id="boss-gauge" class="boss-gauge" role="progressbar" aria-label="보스 등장 진행도" aria-valuemin="0" aria-valuemax="${STAGE_KILLS}">
      <div class="stage-progress-line" aria-hidden="true"><span id="boss-gauge-fill"></span></div>
      ${Array.from({length:STAGE_KILLS},(_,step)=>`<span class="stage-wave ${step===0?'stage-start':''}" data-wave="${step}" style="--wave-position:${step/STAGE_KILLS*100}%" aria-hidden="true">${ball(step===0?'red':'')}<small>${step||''}</small></span>`).join('')}
      <span id="hud-boss-marker" class="stage-boss-marker" aria-hidden="true">${ball('red')}<b>BOSS</b></span>
      <span id="stage-position-marker" aria-hidden="true"></span>
    </div>
  </div><div class="stage-hud-footer">
    <button class="stage-banner" disabled aria-label="스테이지 정보"><span class="stage-location"><small id="region-name">상록숲</small><span><span class="stage-number-prefix">스테이지 </span><strong id="stage-number">1-1</strong></span></span></button>
    <div class="stage-auto-controls"><button id="hud-auto-boss" data-action="autoBoss" role="checkbox" aria-label="자동 소환 예약" aria-checked="true"><span class="stage-auto-check" aria-hidden="true">${icon('check')}</span><span>자동 소환 예약</span></button></div>
  </div></div>`;
}
// Presentation only: kills already counts cleared enemy formations, not individuals.
export function updateStageHud(state,battle){
  const root=document.querySelector('.stage-hud'),gauge=document.querySelector('#boss-gauge');
  const completed=state.campaignCleared||battle.boss?STAGE_KILLS:Math.min(STAGE_KILLS,state.kills);
  const remaining=Math.max(0,STAGE_KILLS-completed),ready=remaining===0&&!battle.boss&&!state.campaignCleared;
  root.classList.toggle('in-dungeon',!!battle.dungeon);
  document.querySelector('#boss-progress-ui').hidden=!!battle.dungeon;
  document.querySelector('.stage-auto-controls').hidden=!!battle.dungeon;
  gauge.setAttribute('aria-valuenow',completed);
  gauge.style.setProperty('--stage-progress',`${completed/STAGE_KILLS*100}%`);
  document.querySelector('#boss-gauge-fill').style.width=`${completed/STAGE_KILLS*100}%`;
  root.querySelectorAll('.stage-wave').forEach(node=>{node.classList.toggle('complete',Number(node.dataset.wave)<=completed);node.classList.toggle('current',Number(node.dataset.wave)===completed);});
  const prefix=state.campaignCleared?'관동 ':battle.boss?`${BOSS_NAMES[bossTier(state.stage)]} · `:ready?'보스 ':'보스까지 ';
  const number=state.campaignCleared?'400':battle.boss?Math.max(0,BOSS_TURN_LIMIT-battle.bossTurns):ready?'':remaining;
  const suffix=state.campaignCleared?'스테이지 완료':battle.boss?'턴':ready?'도전 가능!':'단계!';
  gauge.setAttribute('aria-valuetext',`${prefix}${number}${suffix}`);
  document.querySelector('#hud-boss-marker').classList.toggle('ready',ready||battle.boss);
  document.querySelector('.stage-speed').textContent=`${state.speed}배`;
  const auto=document.querySelector('#hud-auto-boss');auto.setAttribute('aria-checked',String(state.autoBoss));auto.disabled=!!state.campaignCleared;
}
