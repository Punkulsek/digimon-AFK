import {summonPayment,missionInfo,claimMission,syncMissions} from './missions.js';
import {maxLevel,canBreakthrough,isFinalEvolution} from './growth.js';
import {dexBody,dexStatRows} from './dex.js';
import {normalizePresets,selectPreset,PRESET_COUNT} from './party-presets.js';
import {SYNERGIES,speciesSynergies,partySynergies} from './synergies.js';
import {initialState} from './game.js';
import {effectIcon} from './status-icons.js';
import {skillForSpecies} from './skills.js';
import {playSkillEffect,clearSkillEffects} from './skill-effects.js';
import './skill-effects.css';
import {STAT_FIELDS,formatStat,criticalStats} from './combat-stats.js';
import {typeIcon,typeIcons} from './type-icons.js';
import './type-icons.css';
import {EVOLUTION_TYPES} from './dungeon-config.js';
import {upgradeQuote,buyUpgrade} from './upgrades.js';
import {SUMMON_THRESHOLDS,SUMMON_RATES,SUMMON_POOLS,SUMMON_GRADES,summonLevel,summonGrade} from "./summoning.js";
import {STAGE_REGIONS,MAX_STAGE,STAGE_KILLS,BOSS_TURN_LIMIT,regionForStage,regionIndex,localStage,bossTier,BOSS_NAMES,stageGold} from "./stages.js";
import {EVOLUTIONS,evolutionFamily,evolutionOptions,evolutionReady,evolutionMaterials,evolve,breakthroughCost,breakthroughCandidates,breakthrough} from "./growth.js";
import {
  createIcons,
  Leaf,
  Flame,
  Droplets,
  Zap,
  Sparkles,
  Star,
  Wind,
  Moon,
  Snowflake,
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Check,
  Home,
  Map,
  Swords,
  Diamond,
  Coins,
  Volume2,
  Shield,
  Trophy,
  Gift,
  ArrowUp,
  ArrowDownWideNarrow,
  CircleHelp,
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Crown,
  Target,
  CheckCheck,
  Users,
  Heart,
  Circle,
  Compass,
  Backpack,
  ExternalLink,
} from "lucide";
import { species, SPECIES, RARITIES, stageLabel, regionName } from "./data.js";
import {
  load,
  save,
  stats,
  power,
  levelCost,
  summon,
  levelUp,
  toggleParty,
  Battle,
} from "./game.js";
import "./style.css";
import "./polish.css";
import "./fullscreen.css";
import "./collection.css";
import "./dungeon.css";
import "./stages.css";
import "./region-art.css";
import "./type-art.css";
import {createDungeonUI} from "./dungeon-ui.js";
import { GameAudio } from "./audio.js";
const iconSet = {
  Leaf,
  Flame,
  Droplets,
  Zap,
  Sparkles,
  Star,
  Wind,
  Moon,
  Snowflake,
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Check,
  Home,
  Map,
  Swords,
  Diamond,
  Coins,
  Volume2,
  Shield,
  Trophy,
  Gift,
  ArrowUp,
  ArrowDownWideNarrow,
  CircleHelp,
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Crown,
  Target,
  CheckCheck,
  Users,
  Heart,
  Circle,
  Compass,
  Backpack,
  ExternalLink,
};
const i = (name, cls = "") => `<i data-lucide="${name}" class="${cls}"></i>`;
const currencyIcon = (key, name) => `<img class="currency-icon" src="${globalThis.POKEMON_CURRENCY?.[key] || `/currency/${key}.png`}" alt="${name}" title="${name}">`;
const num = (n) => n.toLocaleString("ko-KR");
// Some browsers block storage for file:// or in private mode. Keep the game playable.
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error("Storage unavailable");
    },
    setItem() {
      throw Error("Storage unavailable");
    },
  };
}
let loaded = load(storage),
  state = loaded.state,
  battle = new Battle(state),
  active = "home",
  sort = "rarity",
  selected = null,
  busy = false,
  lastFocus = null,
  saved = loaded.status !== "unavailable";
const icons = () =>
  createIcons({
    icons: iconSet,
    attrs: { "stroke-width": 1.8, "aria-hidden": "true" },
  });
const $ = (s) => document.querySelector(s);
const sound = new GameAudio(storage, updateAudio);
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
function updateAudio() {
  const button = $("#music-button");
  if (!button) return;
  const status = sound.status();
  button.dataset.state = status;
  button.setAttribute("aria-pressed", String(status === "playing"));
  button.setAttribute(
    "aria-label",
    status === "playing" ? "배경음악 끄기" : "배경음악 켜기",
  );
  button.querySelector("span").textContent = {
    waiting: "음악 켜기",
    playing: "Oldale Town",
    muted: "음악 꺼짐",
    paused: "음악 일시정지",
    unavailable: "소리 미지원",
  }[status];
}
const partyPower = () =>
  state.inventory
    .filter((p) => state.party.includes(p.uid))
    .reduce((s, p) => s + power(p,state), 0);
function persist() {
  saved = save(storage, state);
  updateHud();
}
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3300);
}
function art(s, extra = "") {
  const animated = extra.includes("field-art") && !reducedMotion;
  return `<div class="pokemon-art type-${s.type} ${extra}" title="${s.name} · ${s.types.join(" / ")}"><img src="${animated ? s.animated : s.sprite}" data-still="${s.sprite}" alt="${s.name}" decoding="async" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src=this.dataset.still}else{this.hidden=true;this.nextElementSibling.hidden=false}"><div class="placeholder" hidden><div class="placeholder-ball"><span></span></div><span class="type-emblem">${typeIcons(s.types)}</span><small>No. ${String(s.id).padStart(3, "0")}</small></div></div>`;
}
function growthStars(p) {
  const n=p.breakthrough||0;
  return `<span class="growth-stars" role="img" aria-label="${n}돌파">${Array.from({length:5},(_,j)=>`<span class="${j<n-5?'purple':j<n?'gold':'empty'}">${j<n?'★':'☆'}</span>`).join('')}</span>`;
}

function growthPanel(p) {
 const options=evolutionOptions(p);
 return `<section class="growth-panel"><h3>진화</h3>${options.length?options.map(e=>`<div class="evolution-option"><b>${species(e.to).name}</b><ul><li>${p.level>=e.level?'✓':'○'} Lv.${e.level} / 현재 ${p.level}</li><li>${state.stage>e.region*20?'✓':'○'} 지역 ${e.region} 클리어 (${e.region}-20) / 현재 ${stageLabel(state.stage)}</li>${evolutionMaterials(e).map(m=>`<li>${(state.materials[m.id]||0)>=m.amount?'✓':'○'} ${typeIcon(m.id)} ${m.name} 진화 재료 ${num(m.amount)}개 / 보유 ${num(state.materials[m.id]||0)}개</li>`).join('')}</ul><button class="primary-button full" data-action="evolvePreview" data-id="${p.uid}" data-target="${e.to}" ${evolutionReady(state,p,e)?'':'disabled'}>${species(e.to).name}(으)로 진화</button></div>`).join(''):'<p>관동 도감 내 다음 진화가 없습니다.</p>'}<h3>돌파 ${p.breakthrough||0} / 10</h3>${growthStars(p)}<p>HP·공격력 +${(p.breakthrough||0)*15}% · 진화 후에도 유지</p>${(p.breakthrough||0)<10?`<p>계열 공유 돌파 조각 ${breakthroughCandidates(state,p).length}/${breakthroughCost(p)} · 성공률 100%</p><p>${p.level>=maxLevel(p)?'✓':'○'} 최대 레벨 ${p.level} / ${maxLevel(p)} · ${isFinalEvolution(p)?'✓ 최종 진화형':'○ 최종 진화 필요'}</p><button class="soft-button full" data-action="breakthroughConfirm" data-id="${p.uid}" ${!canBreakthrough(state,p)?'disabled':''}>돌파</button><small>중복 획득은 돌파 조각으로 자동 전환되며 같은 진화 계열이 공유합니다.</small>`:'<p>최대 돌파 달성</p>'}</section>`;
}
function card(p, action = "detail") {
  const s = species(p.speciesId),
    r = {name:SUMMON_GRADES[summonGrade(s.id)],color:["#87938d","#559bc4","#a078c0","#d6ab4e"][summonGrade(s.id)]};
  return `<button class="pokemon-card ${action === "formationPokemon" && formationSelection === p.uid ? "formation-selected" : ""} rarity-${[0,2,3,4][summonGrade(s.id)]}" data-action="${action}" data-id="${p.uid}" style="--rarity:${r.color}" aria-pressed="${action === "formationPokemon" && formationSelection === p.uid}" aria-label="${s.name} ${action === "formationPokemon" ? "편성 선택" : "상세 정보"}"><div class="card-top"><span>Lv. ${p.level}</span>${state.party.includes(p.uid) ? '<span class="equipped">편성중</span>' : i("plus")}</div><span class="card-watermark" aria-hidden="true">${String(s.id).padStart(3, "0")}</span>${art(s)}<div class="card-name">${s.name}<span class="card-type">${typeIcons(s.types)}</span></div><div class="card-meta"><span><b class="rate-grade grade-${summonGrade(s.id)}">${r.name}</b><span class="rarity-stars" aria-hidden="true">${growthStars(p)}</span></span><span>${i("swords")}${num(power(p,state))}</span></div></button>`;
}
$("#app").innerHTML = `
<div class="game-shell">
<header class="topbar"><button class="profile" data-action="profile"><div class="avatar">${i("compass")}<span>01</span></div><div><small>오늘도, 새로운 모험</small><strong>새싹 트레이너 ${i("chevron-right")}</strong><div class="profile-xp"><span></span></div></div></button>
<div class="currencies"><div class="currency gold" aria-label="보유 포켓코인">${currencyIcon("pokecoin", "포켓코인")}<b id="gold"></b></div><div class="currency gems" aria-label="보유 다이아">${currencyIcon("diamond", "다이아")}<b id="gems"></b></div></div><button class="icon-button settings-button" data-action="settings" aria-label="설정">${i("settings")}</button></header>
<main class="adventure"><button class="mission-button soft-button" data-action="missions">미션 <span id="mission-progress"></span></button>
<section class="battlefield" aria-label="자동 전투 화면">
<div class="scene" id="scene"><div class="type-background" hidden aria-hidden="true"></div><div class="region-art" aria-hidden="true"></div><div class="sunrays"></div><div class="forest-mist"></div>${Array.from({ length: 12 }, (_, n) => `<span class="forest-mote" style="--n:${n}" aria-hidden="true"></span>`).join("")}</div><div class="battle-vignette"></div>
<div class="stage-hud"><button class="stage-banner" data-action="stages" aria-label="스테이지 정보"><span id="region-name">상록숲</span><strong id="stage-number">1-1</strong>${i("chevron-right")}</button><div class="boss-progress-ui" id="boss-progress-ui"><div class="boss-gauge-row"><span class="gauge-shield" aria-hidden="true">${i("shield")}</span><div id="boss-gauge" class="boss-gauge" role="progressbar" aria-label="보스 등장 진행도" aria-valuemin="0" aria-valuemax="10"><span id="boss-gauge-fill"></span></div><button id="hud-boss-button" class="hud-boss-button" data-action="boss" aria-label="진행도 보스 도전">${i("crown")}</button></div><div class="boss-gauge-caption"><span id="boss-progress-label"></span><button id="hud-auto-boss" data-action="autoBoss" aria-label="자동 보스 도전" aria-pressed="true">자동 도전 ON</button></div></div></div>
<div id="fighters" class="fighters"></div><div id="enemy" class="enemy-group"></div><div id="effects" aria-hidden="true"></div>
<div class="stage-transition" id="stage-transition" role="status" aria-live="polite"><div class="clear-ribbon"><small>스테이지</small><strong>클리어!</strong><span>다음 모험을 향해 출발해요</span></div></div>
</section>
</main>
<section id="dungeon-page" class="dungeon-page" hidden aria-label="던전"></section>
<section id="collection-page" class="collection-page" hidden aria-label="포켓몬 관리"></section>
<nav class="bottom-nav" aria-label="주요 메뉴"><div class="nav-inner"><button class="nav-button" data-action="collection">${i("backpack")}<span>포켓몬</span></button><button class="nav-button" data-action="upgrades"><span aria-hidden="true">✦</span><span>강화</span></button><button class="nav-button active" data-action="home" aria-current="page">${i("home")}<span>홈</span></button><button class="nav-button" data-action="dungeons">${i("swords")}<span>던전</span></button><button class="nav-button" data-action="summon"><span class="nav-ball" aria-hidden="true"></span><span>소환</span></button></div></nav>
</div><div id="modal-root"></div><div id="toast" role="status"></div>`;
let overworldBattle = null;
function restoreOverworld(){
 if(!overworldBattle)return;
 const transition=$("#stage-transition");clearTimeout(transition.hideTimer);transition.classList.remove('visible');
 battle=overworldBattle;overworldBattle=null;
 renderBattle();updateHud();
}
function enterDungeon(info){
 if(!overworldBattle)overworldBattle=battle;
 battle=new Battle(state,info);
 $("#modal-root").innerHTML="";
 active="dungeons";
 renderBattle();updateHud();updateNavigation();
}
const dungeonUI = createDungeonUI({state,art,icon:i,icons,onEnter:enterDungeon,onLeave:restoreOverworld,onHome:closeModal,sound});
function hudText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}
function updateHud() {
  refreshUpgradeButtons();
  $(".avatar>span").textContent = String(
    Math.floor((state.stage - 1) / 5) + 1,
  ).padStart(2, "0");
  $("#gold").textContent = num(state.gold);
  $("#gems").textContent = num(state.gems);
  hudText("#mission-progress",`${state.missionKills||0} / 50`);
  hudText("#mission-live",`${state.missionKills||0} / 50`);
  hudText("#mission-balls",num(state.pokeballs||0));
  if($('.mission-modal')){const info=missionInfo(state,missionTab);hudText('#mission-status',`${num(info.count)} / ${num(info.target)}`);hudText('#mission-reward',num(info.reward));$('.mission-modal [data-action="claimMission"]').disabled=!info.ready;}
  hudText("#save-status", saved ? "자동 저장됨" : "저장 공간 확인 필요");
  $("#region-name").textContent = battle.dungeon ? battle.dungeon.name : regionName(state.stage);
  $(".stage-banner").dataset.action = battle.dungeon ? "dungeonStatus" : "stages";
  $("#stage-number").textContent = battle.dungeon ? `${battle.dungeon.stage}${battle.dungeon.id==='tower'?'층':'단계'}` : stageLabel(state.stage);
  hudText("#kills", `${state.kills} / 10`);
  if ($("#stage-progress"))
    $("#stage-progress").style.width = `${state.kills * 10}%`;
  hudText("#party-power", num(partyPower()));
  hudText("#party-count", `${state.party.length} / 5`);
  if ($("#boss-button"))
    $("#boss-button").disabled = state.kills < STAGE_KILLS || battle.boss || state.campaignCleared;
  hudText(
    "#quest-text",
    state.questClaimed
      ? "보상 획득 완료"
      : state.totalKills >= 10
        ? "다이아 300개 받기"
        : `포켓몬 처치 ${state.totalKills} / 10`,
  );
  if (battle.dungeon) $("#scene").dataset.dungeon = battle.dungeon.id;
  else delete $("#scene").dataset.dungeon;
  $("#scene").dataset.region = regionIndex(state.stage);
  const typeArt=EVOLUTION_TYPES.find(t=>battle.dungeon?.id===`evolution-${t.id}`)?.art;
  const typeBackdrop=$("#scene > .type-background");typeBackdrop.hidden=!typeArt;
  if(typeArt){typeBackdrop.dataset.atlas=typeArt.atlas;typeBackdrop.style.backgroundPosition=`${typeArt.column*100}% ${typeArt.row*50}%`;}
  const artConfig=regionForStage(state.stage).art;
  const backdrop=$(".region-art");
  backdrop.dataset.atlas=artConfig.atlas;
  backdrop.style.backgroundPosition=`${artConfig.column*100}% ${artConfig.row*100}%`;
  $("#boss-progress-ui").hidden = !!battle.dungeon;
  const ready=state.kills>=STAGE_KILLS&&!battle.boss&&!state.campaignCleared;
  $("#boss-gauge").setAttribute("aria-valuenow",state.campaignCleared||battle.boss?STAGE_KILLS:state.kills);
  $("#boss-gauge-fill").style.width=`${state.campaignCleared||battle.boss?100:state.kills/STAGE_KILLS*100}%`;
  const label=state.campaignCleared?"관동 400스테이지 완료":battle.boss?`${BOSS_NAMES[bossTier(state.stage)]} · ${Math.max(0,BOSS_TURN_LIMIT-battle.bossTurns)}턴`:ready?`${BOSS_NAMES[bossTier(state.stage)]} 도전 가능`:`보스까지 ${STAGE_KILLS-state.kills}전 · ${state.kills}/${STAGE_KILLS}`;
  hudText("#boss-progress-label",label);
  $("#boss-gauge").setAttribute("aria-valuetext",label);
  $("#hud-boss-button").disabled=!ready;
  $("#hud-boss-button").classList.toggle("ready",ready);
  $("#hud-auto-boss").setAttribute("aria-pressed",String(state.autoBoss));
  $("#hud-auto-boss").disabled=!!state.campaignCleared;
  hudText("#hud-auto-boss",`자동 도전 ${state.autoBoss?'ON':'OFF'}`);
  $(".battlefield").classList.toggle("boss-active", battle.boss);
  hudText(
    "#boss-status",
    battle.boss
      ? `보스 제한 턴 ${Math.max(0, BOSS_TURN_LIMIT - battle.bossTurns)} · 승리 보상 다이아 100`
      : state.campaignCleared ? "관동 정복 완료 · 현재 지역에서 자동 사냥 중" : `처치 보상 ${stageGold(state.stage)} 포켓코인 · 보스 보상 다이아 100`,
  );
  if (active !== "summon") sound.setMode(battle.boss ? "boss" : "field");
}
function healthBar(unit,cls){return `<div class="${cls}"><span style="width:${Math.max(0,unit.hp/unit.maxHp*100)}%"></span><i class="shield-gauge" role="progressbar" aria-label="보호막" aria-valuemin="0" aria-valuemax="${Math.max(unit.maxHp,unit.shield||0)}" aria-valuenow="${unit.shield||0}" title="보호막 ${Math.ceil(unit.shield||0)}" style="width:${Math.min(100,(unit.shield||0)/unit.maxHp*100)}%" ${unit.shield>0?'':'hidden'}></i></div>`;}
let displayedBattle=null,displayedWave=-1;
function renderBattle() {
  if(displayedBattle!==battle||displayedWave!==battle.wave){clearSkillEffects();skillPresentations.clear();$('#effects').replaceChildren();displayedBattle=battle;displayedWave=battle.wave;}
  $("#fighters").innerHTML = battle.allies
    .map((a, n) => {
      const p = state.inventory.find((p) => p.uid === a.uid),
        s = species(p.speciesId);
      return `<div class="fighter ${a.hp <= 0 ? "fainted" : ""}" id="fighter-${a.uid}" data-unit-id="${a.uid}" style="--slot:${n};--delay:${n * -0.33}s"><span class="fighter-level">Lv.${p.level}</span>${art(s, "field-art")}<div class="fighter-shadow"></div>${healthBar(a,"hp-track")}${skillGauge(a)}<strong>${s.name}</strong><span class="combat-status">${combatStatus(a)}</span></div>`;
    })
    .join("");
  $("#enemy").classList.add('enemy-squad');
  $("#enemy").classList.toggle('boss-formation',battle.boss||!!(battle.dungeon&&battle.dungeon.boss!==false));
  $("#enemy").innerHTML=battle.enemies.map((e,n)=>{
    const s=species(e.speciesId);return `<div class="enemy-unit ${e.hp===0?'fainted':''}" data-unit-id="${e.uid}" style="--enemy-slot:${n}"><div class="enemy-heading">${e.isBoss?'👑 보스':'야생'} <strong>${s.name}</strong></div>${healthBar(e,"enemy-hp")}${skillGauge(e)}<span class="enemy-hp-number">${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span><div class="fighter enemy ${e.isBoss?'boss':''}" ${e===battle.enemy?'id="enemy-fighter"':''}>${art(s,"field-art")}<div class="fighter-shadow"></div></div><span class="combat-status">${combatStatus(e)}</span></div>`;
  }).join('');
  icons();
}
const statusLabels={poison:'독',burn:'화상',shock:'감전',sleep:'잠듦',confusion:'혼란'};
function combatStatus(unit){
 const chips=[],names={atkPct:'공격',defPct:'방어',attackSpeedPct:'공속',skillHaste:'가속',skillAmplification:'증폭',critChance:'급소',critDamage:'급소피해',penetration:'관통',damageReduction:'피감',gaugeRatePct:'충전'};
 const chip=(label,kind,title,key,remaining,stacks=0)=>effectIcon(key||label,label,kind,title,remaining,stacks);
 for(const [key,effect] of Object.entries(unit.statuses||{}))if(battle.runtime.has(unit,key)&&statusLabels[key])chips.push(chip(statusLabels[key],'negative',`${statusLabels[key]} · ${Math.ceil(effect.expires-battle.runtime.time)}초`,key,effect.expires-battle.runtime.time));
 for(const [key,effect] of Object.entries(unit.buffs||{}))if(battle.runtime.has(unit,key)){
  const entries=Object.entries(effect.modifiers||{}).filter(([,v])=>v!==0);
  const kind=entries.some(([,v])=>v<0)?'negative':'positive';
  const label=entries.length?entries.map(([k,v])=>`${names[k]||k}${v>0?'↑':'↓'}`).join(' '):key;
  chips.push(chip(label,kind,`${key} · ${Number.isFinite(effect.expires)?Math.ceil(effect.expires-battle.runtime.time)+'초':'다음 공격'}${effect.stacks?' · '+effect.stacks.length+'중첩':''}`,entries[0]?.[0]||key,effect.expires-battle.runtime.time,effect.stacks?.length||0));
 }
 if(unit.shield>0)chips.push(chip('보호막','positive',`보호막 ${Math.ceil(unit.shield)}`,'shield',unit.shieldUntil-battle.runtime.time));
 for(const effect of battle.runtime.periodic.values())if(effect.target===unit)chips.push(chip(effect.key,effect.caster.side===unit.side?'positive':'negative',`${effect.key} · ${Math.ceil(effect.until-battle.runtime.time)}초`,effect.key,effect.until-battle.runtime.time));
 for(const [key,label] of [['futureSight','미래예지'],['perish','멸망'],['yawn','하품']])if(unit.memory?.[key])chips.push(chip(label,'negative',label));
 return chips.join('');
}
function skillGauge(unit){const move=skillForSpecies(unit.speciesId),gauge=Math.min(100,Math.max(0,unit.gauge||0));return `<div class="skill-gauge" role="progressbar" aria-label="${move?.name||'기술'} 충전" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(gauge)}" title="${move?.name||'기술'} · 기본 ${move?.seconds||0}초"><span style="width:${gauge}%"></span></div>`;}
function combatElement(uid){return [...document.querySelectorAll('[data-unit-id]')].find(el=>el.dataset.unitId===uid);}
function paintHealth() {
  for(const unit of [...battle.allies,...(battle.enemies||[battle.enemy])]){
    const el=combatElement(unit.uid);if(!el)continue;
    const hp=el.querySelector('.hp-track span,.enemy-hp span');if(hp)hp.style.width=`${Math.max(0,unit.hp/unit.maxHp*100)}%`;
    const shield=el.querySelector('.shield-gauge');if(shield){const amount=Math.max(0,unit.shield||0);shield.hidden=amount===0;shield.style.width=`${Math.min(100,amount/unit.maxHp*100)}%`;shield.setAttribute('aria-valuenow',amount);shield.setAttribute('aria-valuemax',Math.max(unit.maxHp,amount));shield.title=`보호막 ${Math.ceil(amount)}`;}
    const gauge=el.querySelector('.skill-gauge'),value=Math.min(100,Math.max(0,unit.gauge||0));if(gauge){gauge.querySelector('span').style.width=`${value}%`;gauge.setAttribute('aria-valuenow',Math.round(value));gauge.classList.toggle('ready',value>=100);}
    const number=el.querySelector('.enemy-hp-number');if(number)number.textContent=`${Math.ceil(unit.hp)} / ${Math.ceil(unit.maxHp)}`;
    const status=el.querySelector('.combat-status');if(status){const html=combatStatus(unit);if(status.innerHTML!==html)status.innerHTML=html;};
    el.classList.toggle('fainted',unit.hp<=0);
  }
}
function floatDamage(text, target, cls = "") {
  if(!target)return;
  const el = document.createElement("span");
  el.className = `damage ${cls}`;
  el.textContent = text;
  const r = target.getBoundingClientRect(),
    field = $(".battlefield").getBoundingClientRect();
  el.style.left = `${r.left - field.left + r.width / 2}px`;
  el.style.top = `${r.top - field.top + 15}px`;
  $("#effects").appendChild(el);
  setTimeout(() => el.remove(), 950);
}
function attackEffect(uid, critical, targetUid) {
  if (reducedMotion) return;
  const origin = combatElement(uid),
    target = combatElement(targetUid);
  if (!origin || !target) return;
  const actor=[...battle.allies,...(battle.enemies||[])].find(unit=>unit.uid===uid);
  const s = actor?species(actor.speciesId):{type:""};
  const colors = {
    풀: "#aad969",
    불꽃: "#ffb05e",
    물: "#8be4ff",
    전기: "#ffe46f",
    페어리: "#ffc7ef",
    독: "#d6a5ff",
  };
  const field = $(".battlefield").getBoundingClientRect(),
    from = origin.getBoundingClientRect(),
    to = target.getBoundingClientRect();
  const x = from.left - field.left + from.width / 2,
    y = from.top - field.top + from.height / 3;
  const dx = to.left - field.left + to.width / 2 - x,
    dy = to.top - field.top + to.height / 2 - y;
  const orb = document.createElement("span");
  orb.className = "attack-orb";
  orb.style.cssText = `left:${x}px;top:${y}px;--effect:${colors[s.type] || "#fff3bc"}`;
  $("#effects").appendChild(orb);
  const motion = orb.animate(
    [
      { transform: "translate(0,0) scale(.4)", opacity: 0.6 },
      {
        transform: `translate(${dx}px,${dy}px) scale(${critical ? 1.8 : 1})`,
        opacity: 1,
      },
    ],
    { duration: 180, easing: "ease-in" },
  );
  const attackBattle=battle,attackWave=battle.wave;
  motion.onfinish = () => {
    orb.remove();
    if(battle!==attackBattle||battle.wave!==attackWave||!combatElement(targetUid)||combatElement(targetUid).classList.contains("fainted"))return;
    for (let n = 0; n < 7; n++) {
      const particle = document.createElement("span");
      particle.className = "impact-spark";
      particle.style.cssText = `left:${x + dx}px;top:${y + dy}px;--effect:${colors[s.type] || "#fff3bc"}`;
      $("#effects").appendChild(particle);
      const angle = (n * Math.PI * 2) / 7;
      particle.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * 35}px,${Math.sin(angle) * 35}px) scale(0)`,
            opacity: 0,
          },
        ],
        { duration: 350 },
      ).onfinish = () => particle.remove();
    }
  };
}
const periodicFloats=new globalThis.Map();
const skillPresentations=new globalThis.Map();
function battlefieldVisible(){return !['collection','summon'].includes(active)&&!dungeonUI.isOpen();}
function presentSkillImpact(event,present){
  const entry=skillPresentations.get(event.castId);
  if(entry&&performance.now()<entry.until){
    entry.effect.retarget(event.targetUid);
    const currentBattle=battle,currentWave=battle.wave;
    entry.effect.onImpact(()=>{if(battle===currentBattle&&battle.wave===currentWave&&battlefieldVisible())present();});
  }else if(battlefieldVisible())present();
}

function step() {
  if (dungeonUI.isOpen()) return;
  const oldWave=battle.wave;
  const events = battle.tick(.1);
  if(battle.wave!==oldWave){clearSkillEffects();skillPresentations.clear();$("#effects").replaceChildren();}
  for(const [key,entry] of skillPresentations)if(entry.until<performance.now()||entry.effect.cancelled)skillPresentations.delete(key);
  let refresh = false;
  let dungeonEnded = false;
  for (const e of events) {
    if(battle.wave!==oldWave&&["skill","damage","heal","shield","immune"].includes(e.type))continue;
    if (e.type === "dungeonResult") dungeonEnded = true;
    if(e.type==='skill'&&battle.wave===oldWave){
      if(battlefieldVisible()){
        const effect=playSkillEffect(e,combatElement,$('#effects'),$('.battlefield'),reducedMotion,{speed:state.speed,onPhase:(phase,profile)=>sound.skillPhase(phase,profile.recipe)});
        if(effect)skillPresentations.set(e.castId,{effect,until:performance.now()+effect.duration});
      }
    }
    if(e.type==='immune')floatDamage('효과 없음',combatElement(e.targetUid));
    if(e.type==='damage'){
      if(e.periodic){const now=performance.now(),entry=periodicFloats.get(e.targetUid)||{at:now,damage:0};entry.damage+=e.damage;if(now-entry.at>=700){floatDamage(`${Math.ceil(entry.damage)}`,combatElement(e.targetUid),'received');entry.at=now;entry.damage=0;}periodicFloats.set(e.targetUid,entry);continue;}
      const target=combatElement(e.targetUid),actor=combatElement(e.uid);
      if(e.basic){attackEffect(e.uid,e.crit,e.targetUid);actor?.classList.remove('attacking');if(actor){void actor.offsetWidth;actor.classList.add('attacking');}}
      const rect=target?.getBoundingClientRect(),enemy=target?.classList.contains('enemy-unit');
      const present=()=>{
        const liveTarget=combatElement(e.targetUid),sprite=liveTarget?.querySelector('.fighter.enemy')||liveTarget;
        if(sprite&&!liveTarget.classList.contains('fainted')){sprite.classList.remove('hit');void sprite.offsetWidth;sprite.classList.add('hit');}
        if(!liveTarget||liveTarget.classList.contains('fainted'))return;
        floatDamage(`${e.crit?'급소 ':''}${Math.ceil(e.damage)}`,rect?{getBoundingClientRect:()=>rect}:null,e.crit?'critical':enemy?'':'received');
      };
      if(e.skill&&!e.counter)presentSkillImpact(e,present);else present();
      if(e.basic)sound.effect(e.crit?'critical':'attack');
    }
    if(e.type==='heal'||e.type==='shield')presentSkillImpact(e,()=>floatDamage(e.type==='heal'?`+${Math.ceil(e.amount)}`:`보호막 +${Math.ceil(e.amount)}`,combatElement(e.targetUid),e.type==='heal'?'healing':'shielding'));
    if(e.type==='target'||e.type==='enemyDefeated')refresh=true;
    if (e.type === "reward") {
      sound.effect("reward");
      floatDamage(`+${e.gold} 포켓코인`, $("#enemy-fighter"), "gold-reward");
      refresh = true;
    }
    if (e.type === "stage" || e.type === "campaignComplete") {
      sound.effect("clear");
      const t = $("#stage-transition");
      t.querySelector("small").textContent="스테이지";
      t.querySelector(".clear-ribbon > span").classList.remove("clear-loot");
      t.querySelector("strong").textContent=e.type==='campaignComplete'?'관동 정복!':'클리어!';
      t.querySelector("span").textContent=e.type==='campaignComplete'?'400스테이지 완료 · 마지막 지역에서 사냥을 계속합니다':`${regionName(state.stage)} · ${stageLabel(state.stage)}`;
      t.classList.add("visible");
      clearTimeout(t.hideTimer);
      t.hideTimer=setTimeout(() => t.classList.remove("visible"), 1600);
      refresh = true;
    }
    if (e.type === "boss") {
      sound.effect("boss");
      toast("보스가 나타났어요! 탐험대, 준비!");
      refresh = true;
    }
    if(e.type==="missionReward"){persist();toast(`반복 미션 완료! 몬스터볼 ${e.balls}개 획득`);}
    if (e.type === "defeat") {
      sound.effect("defeat");
      toast("탐험대가 회복했어요. 레벨을 올린 후 보스에 다시 도전하세요.");
      refresh = true;
    }
  }
  if (refresh) {
    periodicFloats.clear();
    renderBattle();
    persist();
  } else paintHealth();
  updateHud();
  if (dungeonEnded) {
    $("#modal-root").innerHTML="";persist();
    const completed=battle,d=completed.dungeon,won=completed.status==='won',t=$("#stage-transition");
    clearTimeout(t.hideTimer);
    t.querySelector('small').textContent=`${d.name} · ${d.stage}${d.id==='tower'?'층':'단계'}`;
    t.querySelector('strong').textContent=won?'클리어!':'도전 실패';
    const loot=t.querySelector('.clear-ribbon > span');loot.classList.add('clear-loot');
    const rewardIcon=(d.id==='coin'||d.id==='tower')?currencyIcon('pokecoin','포켓코인'):d.id==='candy'?'🍬':typeIcon(d.material);
    loot.innerHTML=won?`${rewardIcon}<b>${d.reward} ${num(d.amount)}개 획득</b>`:'획득 보상 없음';
    t.classList.add('visible');sound.effect(won?'clear':'defeat');
    t.hideTimer=setTimeout(()=>{t.classList.remove('visible');if(battle===completed){dungeonUI.returnToChallenge(d.id,d.id==='tower'&&won?Math.min(200,d.stage+1):d.stage);active='dungeons';updateNavigation();}},2200);
  }
}
let timer;
function schedule() {
  clearInterval(timer);
  timer = setInterval(step, 100 / state.speed);
}
let replaceSlot = null;
function leaveCollection() {
  formationSelection = null;
  $("#collection-page").hidden = true;
  $(".game-shell").classList.remove("managing");
  replaceSlot = null;
}
function closeModal() {
  if($(".summon-rates-modal")){ $("#modal-root").innerHTML="";lastFocus?.focus();return;}
  if(battle.dungeon && !dungeonUI.isOpen() && $("#modal-root").children.length){
    $("#modal-root").innerHTML="";active="dungeons";updateNavigation();return;
  }
  dungeonUI.close();
  if (busy) return;
  const hadModal = !!$("#modal-root").children.length;
  $("#modal-root").innerHTML = "";
  if (!$("#collection-page").hidden && hadModal) { replaceSlot = null; collection(); return; }
  leaveCollection();
  active = "home";
  sound.setMode(battle.boss ? "boss" : "field");
  updateNavigation();
  lastFocus?.focus();
}
function updateNavigation() {
  if(!battlefieldVisible()){clearSkillEffects();skillPresentations.clear();}
  const tab = active === "upgrades" ? "upgrades" : battle.dungeon ? "dungeons" : ["collection","summon","dungeons","upgrades"].includes(active) ? active : "home";
  document.querySelectorAll(".nav-button").forEach((button) => {
    const current = button.dataset.action === tab;
    button.classList.toggle("active", current);
    if (current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}
function modal(title, subtitle, body, cls = "") {
  if (!$("#modal-root").children.length) lastFocus = document.activeElement;
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><header class="modal-header"><div><span class="eyebrow">${subtitle}</span><h2 id="modal-title">${title}</h2></div><button class="icon-button close" data-action="close" aria-label="닫기" ${busy ? "disabled" : ""}>${i("x")}</button></header><div class="modal-body">${body}</div></section></div>`;
  icons();
  updateHud();
  updateAudio();
  $(".modal").focus({preventScroll:true});
  updateNavigation();
}
let formationMode=false;
let formationSelection=null;
const synergyBadges=id=>`<span class="synergy-badges">${speciesSynergies(id).map(k=>`<span title="${k}">${SYNERGIES[k].icon} ${k}</span>`).join('')}</span>`;
function synergyOverview(){return `<div class="synergy-overview">${partySynergies(state).map(s=>`<button class="synergy-pill ${s.tier?'enabled':''}" data-action="synergyDetail" data-synergy="${s.key}">${SYNERGIES[s.key].icon} ${s.key} <b>${s.count}/5</b><small>${s.tier?s.tier+'마리 활성':'미활성'}</small></button>`).join('')}</div>`;}
let collectionTab = "pokemon";
function collection() {
  normalizePresets(state);
  dungeonUI.close();
  active = "collection";
  const scroll = $(".collection-scroll")?.scrollTop || 0;
  $("#modal-root").innerHTML = "";
  $(".game-shell").classList.add("managing");
  const sorted = [...state.inventory].sort((a, b) =>
    (sort === "level" ? b.level - a.level : sort === "power" ? power(b,state) - power(a,state) : summonGrade(b.speciesId) - summonGrade(a.speciesId)) || power(b,state) - power(a,state));
  const page = $("#collection-page");
  page.hidden = false;
  page.innerHTML = `<header class="party-header"><div class="management-title"><div><span class="eyebrow">함께 떠나는 모험</span><h1>포켓몬 탐험대</h1><button class="soft-button formation-toggle" data-action="formation" aria-pressed="${formationMode}">${formationMode?"편성 완료":"편성"}</button></div><div class="party-total">${i("swords")}<span>전체 전투력 <strong id="party-power">${num(partyPower())}</strong></span><small id="party-count">${state.party.length} / 5</small></div></div><div class="party-slots">${Array.from({length:5},(_,index)=>{
    const p=state.inventory.find(p=>p.uid===state.party[index]);
    return `<button class="party-slot ${p ? "occupied" : "empty"} ${(replaceSlot === index || (formationMode && p && formationSelection === p.uid)) ? "choosing" : ""}" data-action="slot" data-slot="${index}" aria-label="${index+1}번 파티 슬롯${p ? ` ${species(p.speciesId).name}` : " 비어 있음"}"><span class="slot-number">${index+1}</span>${p ? `${art(species(p.speciesId), "field-art party-sprite")}<span class="slot-caption"><strong>${species(p.speciesId).name}</strong><small>Lv. ${p.level}</small>${formationMode?synergyBadges(p.speciesId):""}</span>` : `${i("plus")}<span>포켓몬 편성</span>`}</button>`;
  }).join("")}</div>${formationMode?synergyOverview():""}<nav class="party-presets" aria-label="팀 프리셋"><span>팀 프리셋</span>${Array.from({length:PRESET_COUNT},(_,i)=>`<button data-action="preset" data-preset="${i}" aria-pressed="${state.activePreset===i}" class="${state.activePreset===i?'selected':''}">${i+1}</button>`).join('')}<small>편성 변경 자동 저장</small></nav></header><div class="collection-toolbar"><span>보유 포켓몬 <b>${state.inventory.length}</b></span><div class="sort-options" aria-label="포켓몬 정렬">${[["rarity","등급순"],["level","레벨순"],["power","전투력순"]].map(([key,label])=>`<button class="soft-button ${sort === key ? "selected" : ""}" data-action="sort" data-sort="${key}" aria-pressed="${sort===key}">${label}</button>`).join("")}</div></div>${formationMode && formationSelection ? `<div class="selection-notice"><span>${species(state.inventory.find(p=>p.uid===formationSelection).speciesId).name} 선택 · 교환할 포켓몬을 누르세요.</span>${state.party.includes(formationSelection)?`<button class="text-button" data-action="removeSlot" data-id="${formationSelection}">편성 해제</button>`:""}<button class="text-button" data-action="cancelReplace">취소</button></div>` : replaceSlot!==null ? `<div class="selection-notice"><span>${replaceSlot+1}번 슬롯에 편성할 포켓몬을 선택하세요.</span><button class="text-button" data-action="cancelReplace">취소</button></div>` : ""}<div class="collection-scroll" tabindex="0" aria-label="보유 포켓몬 목록"><div class="collection-grid">${sorted.map(p=>formationMode?`<div class="synergy-card">${card(p,"formationPokemon")}${synergyBadges(p.speciesId)}</div>`:card(p,replaceSlot!==null ? "assignSlot" : "detail")).join("")}</div></div>`;
  if(collectionTab==='dex') {
    const acquired=new Set(state.discovered||state.inventory.map(p=>p.speciesId));
    page.innerHTML=`<header class="dex-header"><h1>관동 포켓몬 도감</h1><p>수집률 ${((acquired.size/SPECIES.length)*100).toFixed(1)}% · ${acquired.size} / ${SPECIES.length}</p></header><div class="collection-scroll dex-scroll" tabindex="0" aria-label="도감 목록"><div class="collection-grid">${[...SPECIES].sort((a,b)=>a.id-b.id).map(p=>`<button class="dex-card ${acquired.has(p.id)?'':'undiscovered'}" data-action="dexDetail" data-species="${p.id}"><small>No. ${String(p.id).padStart(3,'0')}</small>${art(p)}<strong>${acquired.has(p.id)?p.name:'미획득'}</strong></button>`).join('')}</div></div>`;
  }
  page.insertAdjacentHTML('beforeend',`<nav class="collection-subnav" aria-label="포켓몬 하위 메뉴">${[['pokemon','포켓몬'],['dex','도감']].map(([key,label])=>`<button data-action="collectionTab" data-tab="${key}" class="${collectionTab===key?'selected':''}" aria-pressed="${collectionTab===key}">${label}</button>`).join('')}</nav>`);
  icons();
  $(".collection-scroll").scrollTop = scroll;
  updateNavigation();
}
function selectFormationPokemon(uid) {
  if (!state.inventory.some(p=>p.uid===uid)) return;
  const index=state.party.indexOf(uid);
  if(replaceSlot!==null && index<0) {
    state.party[Math.min(replaceSlot,state.party.length)]=uid;
    partyChanged();return;
  }
  replaceSlot=null;
  if(formationSelection===uid) {formationSelection=null;collection();return;}
  const previous=state.party.indexOf(formationSelection);
  if(formationSelection && (previous>=0 || index>=0)) {
    if(previous>=0 && index>=0) {
      [state.party[previous],state.party[index]]=[state.party[index],state.party[previous]];
    } else if(previous>=0) state.party[previous]=uid;
    else state.party[index]=formationSelection;
    partyChanged();return;
  }
  formationSelection=uid;
  collection();
}
function slotMenu(index) {
  const uid = state.party[index];
  replaceSlot = index;
  if (!uid) { collection(); return; }
  const p=state.inventory.find(p=>p.uid===uid);
  modal("파티 편성", `${index+1}번 슬롯 · ${species(p.speciesId).name}`,
    `<div class="slot-actions"><button class="primary-button full" data-action="replaceSlot">${i("rotate-ccw")}다른 포켓몬으로 교체</button><button class="soft-button full" data-action="removeSlot" data-id="${uid}">편성 해제</button><button class="text-button" data-action="detail" data-id="${uid}">상세 정보 · 성장</button></div>`, "settings-modal");
}
function partyChanged() {
  formationSelection = null;
  battle.resetParty();
  persist();
  renderBattle();
  replaceSlot = null;
  collection();
  toast("탐험대 편성을 저장했어요.");
}
function skillDetail(id){const move=skillForSpecies(id);return `<section class="pokemon-skill-detail"><div><b>${move.name}</b><span>${move.type} · ${move.scope} · 기본 ${move.seconds}초</span></div><p>${move.description.replaceAll('**','').replaceAll('`','')}</p><small>게이지 100%에서 자동 발동 · 스킬 가속에 따라 충전속도 증가</small></section>`;}
function detail(uid) {
  replaceSlot = null;
  selected = uid;
  const p = state.inventory.find((p) => p.uid === uid),
    s = species(p.speciesId),
    r = {name:SUMMON_GRADES[summonGrade(s.id)],color:["#87938d","#559bc4","#a078c0","#d6ab4e"][summonGrade(s.id)]},
    st = stats(p,state);
  modal(
    s.name,
    `관동 도감 No. ${String(s.id).padStart(3, "0")} · ${s.genus}`,
    `<button class="text-button" data-action="collection">${i("chevron-left")}보유 목록</button><div class="detail-layout"><div class="detail-art rarity-${[0,2,3,4][summonGrade(s.id)]}" style="--rarity:${r.color}"><div class="detail-orbit"></div><span class="detail-equipped">${state.party.includes(uid)?"편성중":"보유 포켓몬"}</span>${art(s, "field-art detail-sprite")}<span class="rarity-badge" style="color:${r.color}"><b class="rate-grade grade-${summonGrade(s.id)}">${r.name}</b> · ${typeIcons(s.types)} ${s.types.join(" / ")}</span><small>키 ${s.height}m · 몸무게 ${s.weight}kg</small><span class="detail-stars" style="color:${r.color}">${growthStars(p)}</span></div><div class="detail-info"><h3>Lv. ${p.level} <small>/ ${maxLevel(p)}</small></h3><div class="detail-power">전투력 <b data-detail-power>${num(power(p,state))}</b></div><div class="detail-stats">${STAT_FIELDS.map(([key,label])=>`<div class="stat-row" title="${key==='attackSpeed'?'기본 대비 공격 빈도':key==='skillHaste'?'기술 게이지 충전속도 증가':key==='skillAmplification'?'기술 피해·회복·보호막 증가':label}"><span>${label}</span><b data-stat="${key}">${formatStat(key,st[key])}</b></div>`).join('')}</div><p class="stat-note">급소 적용 ${criticalStats(st).chance}% · 피해 ${criticalStats(st).damage}%<br>스킬 가속은 게이지 충전에, 스킬 증폭은 기술 효과에 적용</p>${skillDetail(s.id)}<button class="primary-button full" data-action="level" data-id="${uid}" ${p.level >= maxLevel(p) ? "disabled" : ""}>${i("arrow-up")} 레벨업 <span>이상한사탕 ${num(levelCost(p))}개</span></button><button class="soft-button full" data-action="party" data-id="${uid}">${i(state.party.includes(uid) ? "check" : "plus")}${state.party.includes(uid) ? "탐험대에서 해제" : "탐험대에 편성"}</button><small class="muted">보유 이상한사탕 ${num(state.candies)}개 · 필요 ${num(levelCost(p))}개</small></div></div>${growthPanel(p)}`,
    "detail-modal",
  );
}
let revealSummon=null;
function summonPage(body){
 dungeonUI.close();leaveCollection();active="summon";sound.setMode("summon");
 $("#modal-root").innerHTML='';
 let page=document.getElementById('summon-page');if(!page){page=document.createElement('section');page.id='summon-page';document.querySelector('.game-shell').append(page);}
 page.innerHTML=body;icons();updateNavigation();
}
let upgradeAmount=1;
function refreshUpgradeButtons(){
 document.querySelectorAll('#upgrade-page [data-action="buyUpgrade"]').forEach(button=>{
  const q=upgradeQuote(state,button.dataset.key,upgradeAmount);
  button.dataset.count=String(upgradeAmount);button.disabled=!q.levels||q.cost>state.gold;
  button.querySelector('.upgrade-buy-label').textContent=`레벨업${upgradeAmount==='MAX'?` +${q.levels}`:upgradeAmount===1?'':` +${upgradeAmount}`}`;
  button.querySelector('.upgrade-price').textContent=Number.isFinite(q.cost)?num(q.cost):'강화 한도';
 });
}
function upgradeScreen(){
 dungeonUI.close();leaveCollection();$("#modal-root").innerHTML='';active='upgrades';
 let page=document.getElementById('upgrade-page');if(!page){page=document.createElement('section');page.id='upgrade-page';document.querySelector('.game-shell').append(page);}
 const total=Object.values(state.upgrades||{}).reduce((a,b)=>a+b,0);
 page.innerHTML=`<header><h1>전체 강화 <b>${total}</b> 단계</h1><div class="upgrade-amounts" role="group" aria-label="강화 수량">${[1,10,100,'MAX'].map(n=>`<button data-action="upgradeAmount" data-count="${n}" aria-pressed="${upgradeAmount===n}">${n==='MAX'?'MAX':'×'+n}</button>`).join('')}</div></header><div class="upgrade-grid">${[['atk','공격력','swords'],['def','방어력','shield'],['hp','체력','heart']].map(([key,label,icon])=>{const level=state.upgrades?.[key]||0;return `<article><h3>Lv.${level}</h3><div class="upgrade-stat"><span class="upgrade-symbol">${i(icon)}</span><h2>${label}<strong>+${(level*.5).toFixed(1)}%</strong></h2></div><button class="upgrade-buy" data-action="buyUpgrade" data-key="${key}" aria-label="${label} 레벨업"><span class="upgrade-buy-label">레벨업</span><span class="upgrade-cost">${currencyIcon('pokecoin','포켓코인')}<b class="upgrade-price"></b></span></button></article>`;}).join('')}</div>`;
 icons();refreshUpgradeButtons();updateNavigation();
}
function summonScreen(){
 const lv=summonLevel(state.summons),start=SUMMON_THRESHOLDS[lv-1],need=SUMMON_THRESHOLDS[lv]-start;
 summonPage(`<header class="summon-lobby-header"><button class="summon-info-button" data-action="summonRates">${i('circle-help')} 확률 정보</button><div class="summon-wallet" aria-label="보유 다이아">${currencyIcon('diamond','다이아')}<b>${num(state.gems)}</b><span class="pokeball-count">${currencyIcon('pokeball','몬스터볼')} ${num(state.pokeballs||0)}</span></div></header><div class="summon-level-strip"><span>포켓몬 소환 레벨</span><div class="summon-level-track"><b>Lv.${lv}</b><progress aria-label="소환 레벨 경험치" max="${lv===10?1:need}" value="${lv===10?1:state.summons-start}"></progress><strong>${lv===10?'MAX':`${num(state.summons-start)} / ${num(need)}`}</strong></div></div><div class="summon-lobby-title"><h1>관동 포켓몬 소환</h1><span>새로운 모험의 동료를 만나세요!</span></div><div class="summon-banner pokemon-ensemble" role="img" aria-label="피카츄와 관동 포켓몬들이 모인 소환 일러스트"><span class="summon-banner-tag">관동지방 · 1세대 포켓몬</span></div><footer class="summon-lobby-footer"><div class="summon-banner-caption"><span></span> 포켓몬 소환 <span></span></div><div class="summon-actions">${[1,10,30].map(n=>`<button class="primary-button summon-buy summon-buy-${n}" data-action="draw" data-count="${n}" ${(state.pokeballs||0)<n?'disabled':''} aria-label="${n}회 소환 · 몬스터볼 ${summonPayment(state,n).balls}"><strong>${n}회 소환</strong><span>${currencyIcon('pokeball','몬스터볼')}<b>${n}</b></span></button>`).join('')}</div></footer>`);
}
let ratesLevel=1;
function summonRates(level=summonLevel(state.summons)){
 ratesLevel=Math.max(1,Math.min(10,level));const rates=SUMMON_RATES[ratesLevel-1];
 modal('확률 정보','포켓몬 소환',`<div class="rate-grades">${[3,2,1,0].map(g=>`<div><b class="rate-grade grade-${g}">${SUMMON_GRADES[g]}</b><strong>${rates[g].toFixed(2)}%</strong></div>`).join('')}</div><div class="rate-pokemon-list" tabindex="0" aria-label="포켓몬별 소환 확률">${[3,2,1,0].map(g=>SUMMON_POOLS[g].map(p=>`<div class="rate-pokemon-row"><b class="rate-grade grade-${g}">${SUMMON_GRADES[g]}</b>${art(p)}<strong>${p.name}</strong><em>${(rates[g]/SUMMON_POOLS[g].length).toFixed(6)}%</em></div>`).join('')).join('')}</div><div class="rate-level-picker"><span>소환 레벨</span><div><button data-action="ratesLevel" data-delta="-1" aria-label="이전 소환 레벨" ${ratesLevel===1?'disabled':''}>❮</button><b>Lv.${ratesLevel}</b><button data-action="ratesLevel" data-delta="1" aria-label="다음 소환 레벨" ${ratesLevel===10?'disabled':''}>❯</button></div></div><small class="rate-note">개별 확률은 소수점 여섯째 자리까지 반올림해 표시합니다. 같은 등급의 포켓몬은 동일 확률로 등장합니다.</small>`,'summon-rates-modal');
}

function draw(count){
 if(busy)return;
 const owned=new Set(state.inventory.map(p=>evolutionFamily(p.speciesId)));
 const outcome=summon(state,count);if(outcome.error)return toast(outcome.error);persist();busy=true;
 const entries=outcome.result.map(p=>{const family=evolutionFamily(p.speciesId),duplicate=owned.has(family);owned.add(family);return {p,duplicate};});
 const finish=()=>{
  if(revealSummon!==finish)return;
  sound.setVideoExclusive(false);
  const video=$('#summon-video');if(video){video.pause();video.removeAttribute('src');video.load();}
  revealSummon=null;
  summonPage(`<header class="summon-result-heading"><p>몬스터볼 ${num(state.pokeballs||0)} · 다이아 ${num(state.gems)}</p><h1>소환 결과</h1><p>${count}마리 · 소환 Lv.${summonLevel(state.summons)}</p></header><div class="summon-scroll result-reveal-scroll"><div class="summon-result-grid">${entries.map(({p,duplicate},index)=>`<article class="pokemon-card summon-result-card grade-border-${summonGrade(p.speciesId)}" style="--reveal-delay:${index*.18}s"><b class="rate-grade grade-${summonGrade(p.speciesId)}">${SUMMON_GRADES[summonGrade(p.speciesId)]}</b>${art(species(p.speciesId))}<strong>${species(p.speciesId).name}</strong><span class="result-shard">${duplicate?'돌파 조각 +1':'새로운 포켓몬'}</span></article>`).join('')}</div></div><footer class="summon-result-footer"><button class="primary-button" data-action="draw" data-count="10" disabled>10회 · 몬스터볼 ${summonPayment(state,10).balls}</button><button class="primary-button result-confirm" data-action="summon" disabled>확인</button><button class="primary-button" data-action="draw" data-count="30" disabled>30회 · 몬스터볼 ${summonPayment(state,30).balls}</button><button class="text-button reveal-all" data-action="skipSummon">모두 공개</button></footer>`);
  const revealAll=()=>{
   if(revealSummon!==revealAll)return;
   clearTimeout(revealTimer);revealSummon=null;busy=false;
   document.querySelectorAll('.summon-result-card').forEach(c=>c.classList.add('revealed'));
   document.querySelectorAll('.summon-result-footer button').forEach(b=>{b.disabled=b.dataset.action==='draw'&&(state.pokeballs||0)<Number(b.dataset.count);});
   $('.reveal-all')?.remove();
  };
  revealSummon=revealAll;const revealTimer=setTimeout(revealAll,(count-1)*180+450);
  sound.effect(entries.some(({p})=>summonGrade(p.speciesId)===3)?'legendary':'reveal');
 };
 revealSummon=finish;
 summonPage(`<div class="summon-video-stage"><video id="summon-video" playsinline preload="auto" aria-label="포켓몬 소환 영상"></video><button class="primary-button video-skip" data-action="skipSummon">연출 건너뛰기</button></div>`);
 const video=$('#summon-video');sound.setVideoExclusive(true);
 video.src=window.POKEMON_SUMMON_VIDEO||'/video/summon.mp4';video.volume=1;video.muted=false;
 video.addEventListener('ended',finish,{once:true});video.addEventListener('error',()=>{toast('영상 재생 오류로 결과를 표시합니다.');finish();},{once:true});
 video.play().catch(()=>{toast('브라우저의 사이트 소리 재생을 허용해 주세요.');finish();});

}

function stages() {
  active = "stages";
  const current = ((state.stage - 1) % 20) + 1,
    chapter = Math.floor((state.stage - 1) / 20);
  modal(
    "한 걸음씩, 새로운 세상으로",
    "스테이지",
    `<div class="stage-overview">${i("map")}<div><h3>${regionName(state.stage)}</h3><p>관동지방 · ${chapter + 1} / 20 지역 · 총 400스테이지</p></div><span>${current} / 20</span></div><details class="region-itinerary"><summary>관동 20개 지역 보기</summary><ol>${STAGE_REGIONS.map((r,index)=>`<li class="${index===chapter?'current':''}">${r.name}<small>${index+1}-1 ~ ${index+1}-20 · ${index<chapter||state.campaignCleared?'완료':index===chapter?'진행 중':'미개방'}</small></li>`).join('')}</ol></details><div class="stage-grid">${Array.from({ length: 20 }, (_, n) => `<div class="stage-node ${n + 1 < current || state.campaignCleared ? "complete" : n + 1 === current ? "current" : ""}">${i(n + 1 < current || state.campaignCleared ? "check" : n === 19 || n === 9 ? "crown" : "leaf")}<b>${chapter + 1}-${n + 1}</b><small>${n + 1 < current || state.campaignCleared ? "클리어" : n + 1 === current ? "모험 중" : "미개방"}</small></div>`).join("")}</div><div class="stage-actions"><div><span>일반 전투 완료 <b id="kills">${state.kills} / 10</b></span><div class="progress-track"><div id="stage-progress"></div></div></div><button class="primary-button" data-action="boss" id="boss-button">${i("swords")}보스 도전</button></div><p id="boss-status" class="muted"></p><button class="quest stage-quest" data-action="quest"><span class="quest-icon">${i("gift")}</span><span><strong>모험의 첫걸음</strong><small id="quest-text"></small></span>${i("chevron-right")}</button>`,
  );
}
function audioSettings() {
  return `<section class="audio-settings"><div class="audio-title">${i("volume-2")}<div><strong>모험을 채우는 소리</strong><small>Oldale Town · 사용자 제공 BGM</small></div></div>${[
    ["music", "배경음악"],
    ["effects", "효과음"],
  ]
    .map(
      ([key, label]) =>
        `<div class="audio-row"><label for="${key}-volume">${label}</label><input id="${key}-volume" data-volume="${key}Volume" type="range" min="0" max="100" value="${sound.prefs[`${key}Volume`]}" aria-label="${label} 볼륨"><output>${sound.prefs[`${key}Volume`]}%</output><button class="toggle ${sound.prefs[key] ? "on" : ""}" data-action="audioToggle" data-audio="${key}" aria-label="${label} 전환" aria-pressed="${sound.prefs[key]}"><span></span></button></div>`,
    )
    .join(
      "",
    )}<button class="music-player" data-action="music" id="music-button" aria-label="배경음악 켜기" aria-pressed="false"><div class="equalizer" aria-hidden="true"><b></b><b></b><b></b><b></b></div><span>음악 켜기</span>${i("volume-2")}</button></section>`;
}
function settings() {
  active = "home";
  modal(
    "나만의 모험 설정",
    "설정",
    `${audioSettings()}<div class="setting-row"><div><b>자동 전투</b><p>탐험대가 자동으로 야생 포켓몬을 공격해요.</p></div><button class="toggle ${state.auto ? "on" : ""}" data-action="settingAuto" aria-label="자동 전투 전환" aria-pressed="${state.auto}"><span></span></button></div><div class="setting-row"><div><b>자동 보스 도전</b><p>일반 전투 10회 완료 후 자동으로 도전해요. (매 전투 적 5마리)</p></div><button class="toggle ${state.autoBoss ? "on" : ""}" data-action="settingBoss" aria-label="자동 보스 전환" aria-pressed="${state.autoBoss}"><span></span></button></div><div class="setting-row"><div><b>전투 배속</b><p>1배 · 2배 · 3배</p></div><button class="soft-button" data-action="settingSpeed" aria-label="전투 배속">${state.speed}×</button></div><div class="save-info">${i("check-check")} <span id="save-status"></span><br>브라우저 데이터를 지우면 진행 상황도 삭제됩니다.</div><div class="setting-row"><div><b>게임 진행 초기화</b><p>진행 기록과 포켓몬 성장을 지우고 새 모험을 시작합니다.</p></div><button class="soft-button" data-action="resetPrompt">초기화</button></div><p class="asset-credit">스프라이트: PokeAPI / sprites · 포켓몬: Nintendo / Creatures / GAME FREAK<br>음악: Oldale Town · 사용자 제공 음원</p>`,
    "settings-modal",
  );
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  if(btn.dataset.action==="skipSummon"){revealSummon?.();return;}
  if(busy)return;
  if(["home","collection","dungeons","upgrades"].includes(btn.dataset.action))document.getElementById("summon-page")?.remove();
  const action = btn.dataset.action;
  if(["home","collection","dungeons","summon"].includes(action))document.getElementById('upgrade-page')?.remove();
  if (action !== "music" && !sound.started) sound.unlock();
  if (action !== "music") sound.effect("click");
  if (dungeonUI.handle(action, btn)) return;
  switch (action) {
    case "upgrades":
      if(document.getElementById('upgrade-page')){document.getElementById('upgrade-page').remove();active='home';updateNavigation();}else upgradeScreen();
      break;
    case "upgradeAmount":
      upgradeAmount=btn.dataset.count==='MAX'?'MAX':Number(btn.dataset.count);upgradeScreen();break;
    case "buyUpgrade": {
      const error=buyUpgrade(state,btn.dataset.key,btn.dataset.count==='MAX'?'MAX':Number(btn.dataset.count));
      if(error){toast(error);break;}
      for(const ally of battle.allies){const p=state.inventory.find(p=>p.uid===ally.uid),next=stats(p,state);const ratio=ally.hp/ally.maxHp;Object.assign(ally,next,{maxHp:next.hp,hp:Math.round(next.hp*ratio)});}
      persist();renderBattle();updateHud();upgradeScreen();sound.effect('level');break;
    }
    case "dungeonStatus":
      modal(battle.dungeon.name, `${battle.dungeon.stage}${battle.dungeon.id==='tower'?'층':'단계'}`, `<p>자동 전투 · ${battle.turn} / 120턴</p><p>승리 보상: ${battle.dungeon.reward} ${num(battle.dungeon.amount)}개</p><button class="soft-button" data-action="dungeons">도전 종료 · 던전 선택</button>`);
      break;
    case "dungeons":
      leaveCollection();
      $("#modal-root").innerHTML = "";
      active = "dungeons";
      dungeonUI.open();
      updateNavigation();
      break;
    case "music":
      sound.toggleMusic();
      break;
    case "audioToggle":
      sound.set(btn.dataset.audio, !sound.prefs[btn.dataset.audio]);
      settings();
      break;
    case "home":
      dungeonUI.close();
      leaveCollection();
      closeModal();
      break;
    case "close":
      closeModal();
      break;
    case "collectionTab":
      formationSelection=null;collectionTab=btn.dataset.tab;replaceSlot=null;collection();break;
    case "dexDetail": {
      const id=Number(btn.dataset.species);dexSelected=id;
      modal(species(id).name,'관동 포켓몬 도감',dexBody(id,{art,typeIcons}),'dex-detail-modal');break;
    }
    case "dexTab": {
      document.querySelectorAll('[data-dex-panel]').forEach(p=>p.hidden=p.dataset.dexPanel!==btn.dataset.tab);
      document.querySelectorAll('[data-action="dexTab"]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));break;
    }
    case "collection":
      collectionTab="pokemon";
      collection();
      break;
    case "formationPokemon":
      selectFormationPokemon(btn.dataset.id);
      break;
    case "detail":
      detail(btn.dataset.id);
      break;
    case "slot":
      if(formationMode){
        const index=Number(btn.dataset.slot), uid=state.party[index];
        if(uid) selectFormationPokemon(uid);
        else if(formationSelection && !state.party.includes(formationSelection)) {
          state.party.push(formationSelection);partyChanged();
        } else {formationSelection=null;replaceSlot=index;collection();}
        break;
      }
      slotMenu(Number(btn.dataset.slot));
      break;
    case "replaceSlot":
      collection();
      break;
    case "cancelReplace":
      formationSelection = null;
      replaceSlot = null;
      collection();
      break;
    case "removeSlot": {
      const error = toggleParty(state, btn.dataset.id);
      if (error) toast(error); else partyChanged();
      break;
    }
    case "assignSlot": {
      if (replaceSlot === null) break;
      const uid = btn.dataset.id;
      const existing = state.party.indexOf(uid);
      const target = Math.min(replaceSlot, state.party.length);
      if (existing >= 0) {
        if (target === state.party.length) { toast("이미 편성된 포켓몬이에요."); break; }
        [state.party[target], state.party[existing]] = [state.party[existing], state.party[target]];
      } else state.party[target] = uid;
      partyChanged();
      break;
    }
    case "sort":
      sort = btn.dataset.sort;
      collection();
      break;
    case "summon":
      summonScreen();
      break;
    case "summonRates": summonRates();break;
    case "ratesLevel": summonRates(ratesLevel+Number(btn.dataset.delta));break;
    case "draw":
      draw(Number(btn.dataset.count));
      break;
    case "rates":
      modal(
        "모든 만남은 특별하니까",
        "소환 확률",
        `<div class="rates">${RARITIES.map(
          (r, n) =>
            `<div><span style="color:${r.color}">${i("star")}${r.name}</span><small>${SPECIES.filter(
              (p) => p.rarity === n,
            )
              .map((p) => p.name)
              .join(" · ")}</small><b>${r.chance}%</b></div>`,
        ).join(
          "",
        )}</div><p class="muted">각 소환은 독립적으로 진행됩니다. 등급 내 포켓몬은 동일 확률이며, 10회 소환의 별도 확정 보상은 없습니다.</p><button class="primary-button full" data-action="summon">소환으로 돌아가기</button>`,
      );
      break;
    case "stages":
      stages();
      break;
    case "resetPrompt":
      modal("게임 진행을 초기화할까요?", "새 모험 시작", `<div class="reset-confirm"><p>스테이지, 보유 포켓몬과 성장, 편성, 재화·재료, 소환·도감·던전 기록, 전체 강화가 초기화됩니다. 되돌릴 수 없습니다.</p><p>기본 포켓몬과 5마리 파티, 포켓코인 10,000개·다이아 10,000개로 다시 시작합니다. 음악·효과음 설정은 유지됩니다.</p><label for="reset-confirm-text">계속하려면 <b>초기화</b>를 입력하세요.</label><input id="reset-confirm-text" autocomplete="off" spellcheck="false" placeholder="초기화"><p id="reset-error" role="alert"></p><div class="reset-actions"><button class="soft-button" data-action="settings">취소</button><button class="primary-button" data-action="resetConfirm" disabled>진행 초기화</button></div></div>`, "settings-modal");
      $('#reset-confirm-text').focus();break;
    case "resetConfirm": {
      if($('#reset-confirm-text')?.value.trim()!=='초기화')break;
      const fresh=initialState();
      if(!save(storage,fresh)){$('#reset-error').textContent='저장소에 접근할 수 없어 초기화하지 못했습니다. 기존 진행은 유지됩니다.';break;}
      // pagehide also saves: replace the live state before reloading so it cannot restore the old run.
      state=fresh;clearInterval(timer);clearSkillEffects();skillPresentations.clear();
      clearTimeout($('#stage-transition').hideTimer);revealSummon=null;
      location.reload();break;
    }
    case "preset":
      if(selectPreset(state,Number(btn.dataset.preset)))partyChanged();
      break;
    case "formation":formationMode=!formationMode;formationSelection=null;replaceSlot=null;collection();break;
    case "synergyDetail":{
      const key=btn.dataset.synergy,info=SYNERGIES[key],current=partySynergies(state).find(s=>s.key===key);
      modal(`${info.icon} ${key} 시너지`,`${current.count}마리 편성 · ${current.tier?current.tier+'마리 단계 활성':'미활성'}`,`<p>활성 효과는 아군 전체에 적용됩니다. 가장 높은 단계 하나만 적용합니다.</p>${info.labels.map((label,n)=>`<div class="synergy-effect ${current.index===n?'enabled':''}"><b>${[2,3,5][n]}마리</b><span>${label}</span>${current.index===n?' ✓':''}</div>`).join('')}<button class="primary-button full" data-action="collection">편성으로 돌아가기</button>`,'settings-modal');break;
    }
    case "settings":
      settings();
      break;
    case "missions":missionScreen();break;
    case "missionTab":missionTab=btn.dataset.tab;missionScreen();break;
    case "claimMission":{const reward=claimMission(state,missionTab);persist();missionScreen();if(reward)toast(`몬스터볼 ${reward}개 획득!`);break;}
    case "profile":
      modal(
        "새싹 트레이너",
        "트레이너 프로필",
        `<div class="profile-detail">${i("compass")}<h3>모든 모험은 작은 한 걸음부터.</h3><p>트레이너 레벨 ${Math.floor((state.stage - 1) / 5) + 1}</p><div class="profile-stats"><span>처치한 포켓몬<b>${num(state.totalKills)}</b></span><span>보유 포켓몬<b>${state.inventory.length}</b></span><span>파티 전투력<b>${num(partyPower())}</b></span></div></div>`,
        "settings-modal",
      );
      break;
    case "auto":
    case "settingAuto":
      state.auto = !state.auto;
      persist();
      if (action === "settingAuto") settings();
      break;
    case "speed":
    case "settingSpeed":
      state.speed = (state.speed % 3) + 1;
      schedule();
      persist();
      if (action === "settingSpeed") settings();
      break;
    case "autoBoss":
    case "settingBoss":
      state.autoBoss = !state.autoBoss;
      persist();
      if (action === "settingBoss") settings();
      break;
    case "boss":
      if (battle.challenge()) {
        sound.effect("boss");
        state.auto = true;
        renderBattle();
        persist();
        toast("보스 도전! 탐험대의 힘을 보여 주세요.");
        closeModal();
      }
      break;
    case "evolvePreview": {
      const p=state.inventory.find(p=>p.uid===btn.dataset.id);
      const e=evolutionOptions(p).find(e=>e.to===Number(btn.dataset.target));
      if(!e)break;
      modal("진화 확인", `${species(p.speciesId).name} → ${species(e.to).name}`, `<p>${evolutionMaterials(e).map(m=>`${m.name} 진화 재료 ${num(m.amount)}개`).join(' + ')}가 소비됩니다. 레벨과 돌파는 유지되며, 진화 후에도 같은 진화 계열의 돌파 재료를 공유합니다.</p><button class="primary-button full" data-action="evolveConfirm" data-id="${p.uid}" data-target="${e.to}">진화 확정</button><button class="soft-button full" data-action="detail" data-id="${p.uid}">취소</button>`);
      break;
    }
    case "evolveConfirm":
    case "breakthroughConfirm": {
      const evolving=btn.dataset.action==='evolveConfirm';
      const error=evolving?evolve(state,btn.dataset.id,Number(btn.dataset.target)):breakthrough(state,btn.dataset.id);
      if(error){toast(error);break;}
      battle.resetParty();persist();renderBattle();collection();detail(btn.dataset.id);sound.effect("level");toast(evolving?'진화 완료!':'돌파 완료!');
      break;
    }
    case "level": {
      const error = levelUp(state, btn.dataset.id);
      if (error) {
        toast(error);
        break;
      }
      battle.resetParty();
      persist();
      renderBattle();
      const p = state.inventory.find(p => p.uid === btn.dataset.id);
      const st = stats(p,state), info = $(".detail-info");
      info.querySelector("h3").firstChild.textContent = `Lv. ${p.level} `;
      info.querySelectorAll("[data-stat]").forEach(el => { el.textContent = formatStat(el.dataset.stat,st[el.dataset.stat]); });
      info.querySelector("[data-detail-power]").textContent = num(power(p,state));
      btn.querySelector("span").textContent = `이상한사탕 ${num(levelCost(p))}개`;
      btn.disabled = p.level >= maxLevel(p);
      info.querySelector("small.muted").textContent = `보유 이상한사탕 ${num(state.candies)}개 · 필요 ${num(levelCost(p))}개`;
      // Refresh evolution eligibility without replacing the dialog, sprite or level button.
      const panel = $(".growth-panel"), template = document.createElement("template");
      template.innerHTML = growthPanel(p);
      panel.innerHTML = template.content.firstElementChild.innerHTML;
      updateHud();
      sound.effect("level");
      toast("레벨 업! 조금 더 강해졌어요.");
      break;
    }
    case "party": {
      const error = toggleParty(state, btn.dataset.id);
      if (error) {
        toast(error);
        break;
      }
      battle.resetParty();
      persist();
      renderBattle();
      collection();
      detail(btn.dataset.id);
      toast("탐험대 편성을 저장했어요.");
      break;
    }
    case "quest":
      if (state.questClaimed) {
        toast("이미 보상을 받았어요. 다음 모험도 기대해 주세요!");
      } else if (state.totalKills >= 10) {
        state.gems += 300;
        state.questClaimed = true;
        persist();
        sound.effect("reward");
        toast("퀘스트 완료! 다이아 300개를 받았어요.");
      } else
        toast(
          `포켓몬을 ${10 - state.totalKills}마리 더 처치하면 다이아 300개!`,
        );
      break;
  }
});
document.addEventListener("input", (e) => {
  if(e.target.id==="reset-confirm-text"){const button=document.querySelector('[data-action="resetConfirm"]');if(button)button.disabled=e.target.value.trim()!=="초기화";}
  const key = e.target.dataset.volume;
  if (!key) return;
  sound.set(key, e.target.value);
  e.target.nextElementSibling.textContent = `${sound.prefs[key]}%`;
});
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  const m = $(".modal");
  if (m && e.key === "Tab") {
    const els = [
      ...m.querySelectorAll(
        'button:not(:disabled), [href], input, [tabindex="0"]',
      ),
    ];
    if (!els.length) {
      e.preventDefault();
      return;
    }
    const first = els[0],
      last = els.at(-1);
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === m)
    ) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last || document.activeElement === m)
    ) {
      e.preventDefault();
      first.focus();
    }
  }
});
window.addEventListener("pagehide", persist);
document.addEventListener("visibilitychange", () => {
  sound.visibility(document.hidden);
  if (document.hidden) {
    clearInterval(timer);
    persist();
  } else schedule();
});
renderBattle();
updateHud();
updateAudio();
icons();
schedule();
if (loaded.status === "invalid")
  toast("저장 데이터를 읽을 수 없어 새 모험을 시작했어요.");
if (loaded.status === "unavailable")
  toast("브라우저 저장소를 사용할 수 없어요. 저장 설정을 확인해 주세요.");

// Floating tooltip remains outside the horizontally scrollable status-icon strip.
let effectTooltip;
document.addEventListener('pointerover',event=>{
 const badge=event.target.closest?.('.effect-icon');
 effectTooltip?.remove();effectTooltip=null;
 if(!badge)return;
 const box=badge.getBoundingClientRect();effectTooltip=document.createElement('div');
 effectTooltip.className='combat-effect-tooltip';effectTooltip.textContent=badge.dataset.tooltip;
 document.body.append(effectTooltip);
 const width=effectTooltip.offsetWidth,height=effectTooltip.offsetHeight;
 effectTooltip.style.left=`${Math.max(8,Math.min(innerWidth-width-8,box.left+box.width/2-width/2))}px`;
 effectTooltip.style.top=`${Math.max(8,box.top-height-8)}px`;
});
document.addEventListener('pointerout',event=>{if(event.target.closest?.('.effect-icon')&&!event.relatedTarget?.closest?.('.effect-icon')){effectTooltip?.remove();effectTooltip=null;}});

let dexSelected=null;
document.addEventListener('input',e=>{
 if(!['dex-level','dex-compare'].includes(e.target.id)||!dexSelected)return;
 const level=Math.max(1,Math.min(100,Math.round(Number($('#dex-level').value)||1)));
 const compare=Math.max(1,Math.min(100,Math.round(Number($('#dex-compare').value)||1)));
 $('#dex-level-label').textContent=`Lv.${level}`;
 $('#dex-current-heading').textContent=`Lv.${level}`;$('#dex-compare-heading').textContent=`Lv.${compare}`;
 $('#dex-stat-rows').innerHTML=dexStatRows(dexSelected,level,compare);
});

let missionTab='repeat';
function missionScreen(){const info=missionInfo(state,missionTab);persist();modal('미션','보상 받기',`<nav class="mission-tabs">${[['daily','일일 미션'],['weekly','주간 미션'],['challenge','도전 미션'],['repeat','반복 미션']].map(([key,name])=>`<button class="soft-button ${missionTab===key?'selected':''}" data-action="missionTab" data-tab="${key}">${name}</button>`).join('')}</nav><h3>${info.title}</h3><p id="mission-status">${num(info.count)} / ${num(info.target)}</p><p>${currencyIcon('pokeball','몬스터볼')} 보상 <b id="mission-reward">${num(info.reward)}</b>개</p><button class="primary-button full" data-action="claimMission" ${info.ready?'':'disabled'}>${info.claimed?'수령 완료':missionTab==='repeat'?'누적 보상 한 번에 받기':'보상 받기'}</button><p>보유 몬스터볼 ${num(state.pokeballs||0)}개</p><small>일일: 한국 시간 자정 · 주간: 월요일 자정 초기화<br>반복 미션은 50마리마다 10개, 남은 처치 수는 유지됩니다.</small>`,'mission-modal');}
