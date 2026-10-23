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
    .reduce((s, p) => s + power(p), 0);
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
  return `<div class="pokemon-art type-${s.type} ${extra}" title="${s.name} · ${s.types.join(" / ")}"><img src="${animated ? s.animated : s.sprite}" data-still="${s.sprite}" alt="${s.name}" decoding="async" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src=this.dataset.still}else{this.hidden=true;this.nextElementSibling.hidden=false}"><div class="placeholder" hidden><div class="placeholder-ball"><span></span></div><span class="type-emblem">${i(s.icon)}</span><small>No. ${String(s.id).padStart(3, "0")}</small></div></div>`;
}
function card(p, action = "detail") {
  const s = species(p.speciesId),
    r = RARITIES[s.rarity];
  return `<button class="pokemon-card rarity-${s.rarity}" data-action="${action}" data-id="${p.uid}" style="--rarity:${r.color}" aria-label="${s.name} 상세 정보"><div class="card-top"><span>Lv. ${p.level}</span>${state.party.includes(p.uid) ? '<span class="equipped">편성 중</span>' : i("plus")}</div><span class="card-watermark" aria-hidden="true">${String(s.id).padStart(3, "0")}</span>${art(s)}<div class="card-name">${s.name}<span class="card-type">${i(s.icon)}</span></div><div class="card-meta"><span>${r.name}<span class="rarity-stars" aria-hidden="true">${"✦".repeat(s.rarity + 1)}</span></span><span>${i("swords")}${num(power(p))}</span></div></button>`;
}
$("#app").innerHTML = `
<div class="game-shell">
<header class="topbar"><button class="profile" data-action="profile"><div class="avatar">${i("compass")}<span>01</span></div><div><small>오늘도, 새로운 모험</small><strong>새싹 트레이너 ${i("chevron-right")}</strong><div class="profile-xp"><span></span></div></div></button>
<div class="currencies"><div class="currency gold" aria-label="보유 포켓코인">${currencyIcon("pokecoin", "포켓코인")}<b id="gold"></b></div><div class="currency gems" aria-label="보유 다이아">${currencyIcon("diamond", "다이아")}<b id="gems"></b></div></div><button class="icon-button settings-button" data-action="settings" aria-label="설정">${i("settings")}</button></header>
<main class="adventure">
<section class="battlefield" aria-label="자동 전투 화면">
<div class="scene" id="scene"><div class="sunrays"></div><div class="forest-mist"></div>${Array.from({ length: 12 }, (_, n) => `<span class="forest-mote" style="--n:${n}" aria-hidden="true"></span>`).join("")}</div><div class="battle-vignette"></div>
<button class="stage-banner" data-action="stages" aria-label="스테이지 정보"><span id="region-name">상록숲</span><strong id="stage-number">1-1</strong>${i("chevron-right")}</button>
<div id="fighters" class="fighters"></div><div id="enemy" class="enemy-group"></div><div id="effects" aria-hidden="true"></div>
<div class="stage-transition" id="stage-transition">${i("trophy")}<strong>스테이지 클리어!</strong><span>다음 모험을 향해 출발해요</span></div>
</section>
</main>
<section id="dungeon-page" class="dungeon-page" hidden aria-label="던전"></section>
<section id="collection-page" class="collection-page" hidden aria-label="포켓몬 관리"></section>
<nav class="bottom-nav" aria-label="주요 메뉴"><div class="nav-inner"><button class="nav-button" data-action="collection">${i("backpack")}<span>포켓몬</span></button><button class="nav-button active" data-action="home" aria-current="page">${i("home")}<span>홈</span></button><button class="nav-button" data-action="dungeons">${i("swords")}<span>던전</span></button><button class="nav-button" data-action="summon"><span class="nav-ball" aria-hidden="true"></span><span>소환</span></button></div></nav>
</div><div id="modal-root"></div><div id="toast" role="status"></div>`;
let overworldBattle = null;
function restoreOverworld(){
 if(!overworldBattle)return;
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
  $(".avatar>span").textContent = String(
    Math.floor((state.stage - 1) / 5) + 1,
  ).padStart(2, "0");
  $("#gold").textContent = num(state.gold);
  $("#gems").textContent = num(state.gems);
  hudText("#save-status", saved ? "자동 저장됨" : "저장 공간 확인 필요");
  $("#region-name").textContent = battle.dungeon ? battle.dungeon.name : regionName(state.stage);
  $(".stage-banner").dataset.action = battle.dungeon ? "dungeonStatus" : "stages";
  $("#stage-number").textContent = battle.dungeon ? `${battle.dungeon.stage}단계` : stageLabel(state.stage);
  hudText("#kills", `${state.kills} / 10`);
  if ($("#stage-progress"))
    $("#stage-progress").style.width = `${state.kills * 10}%`;
  hudText("#party-power", num(partyPower()));
  hudText("#party-count", `${state.party.length} / 5`);
  if ($("#boss-button"))
    $("#boss-button").disabled = state.kills < 10 || battle.boss;
  hudText(
    "#quest-text",
    state.questClaimed
      ? "보상 획득 완료"
      : state.totalKills >= 10
        ? "다이아 300개 받기"
        : `포켓몬 처치 ${state.totalKills} / 10`,
  );
  $("#scene").dataset.region = Math.floor((state.stage - 1) / 20) % 4;
  $(".battlefield").classList.toggle("boss-active", battle.boss);
  hudText(
    "#boss-status",
    battle.boss
      ? `보스 제한 턴 ${Math.max(0, 60 - battle.bossTurns)} · 승리 보상 다이아 100`
      : `처치 보상 ${Math.round(24 * (1 + (state.stage - 1) * 0.18))} 포켓코인 · 보스 보상 다이아 100`,
  );
  if (active !== "summon") sound.setMode(battle.boss ? "boss" : "field");
}
function renderBattle() {
  $("#fighters").innerHTML = battle.allies
    .map((a, n) => {
      const p = state.inventory.find((p) => p.uid === a.uid),
        s = species(p.speciesId);
      return `<div class="fighter ${a.hp <= 0 ? "fainted" : ""}" id="fighter-${a.uid}" style="--slot:${n};--delay:${n * -0.33}s"><span class="fighter-level">Lv.${p.level}</span>${art(s, "field-art")}<div class="fighter-shadow"></div><div class="hp-track"><span style="width:${(a.hp / a.maxHp) * 100}%"></span></div><strong>${s.name}</strong></div>`;
    })
    .join("");
  const e = battle.enemy,
    s = species(e.speciesId);
  $("#enemy").innerHTML =
    `<div class="enemy-heading ${battle.boss ? "is-boss" : ""}">${battle.dungeon ? "던전" : battle.boss ? i("crown") : "야생"} <strong>${s.name}</strong><span>Lv.${battle.dungeon?.stage || state.stage}</span></div><div class="enemy-hp"><span style="width:${(e.hp / e.maxHp) * 100}%"></span></div><span class="enemy-hp-number">${e.hp} / ${e.maxHp}</span><div class="fighter enemy ${battle.boss ? "boss" : ""}" id="enemy-fighter">${art(s, "field-art")}<div class="fighter-shadow"></div></div>`;
  icons();
}
function paintHealth() {
  for (const a of battle.allies) {
    const el = document.getElementById(`fighter-${a.uid}`);
    if (el) {
      el.querySelector(".hp-track span").style.width =
        `${(a.hp / a.maxHp) * 100}%`;
      el.classList.toggle("fainted", a.hp === 0);
    }
  }
  $("#enemy .enemy-hp span").style.width =
    `${(battle.enemy.hp / battle.enemy.maxHp) * 100}%`;
  $("#enemy .enemy-hp-number").textContent =
    `${battle.enemy.hp} / ${battle.enemy.maxHp}`;
}
function floatDamage(text, target, cls = "") {
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
function attackEffect(uid, critical) {
  if (reducedMotion) return;
  const origin = document.getElementById(`fighter-${uid}`),
    target = $("#enemy-fighter");
  if (!origin || !target) return;
  const s = species(state.inventory.find((p) => p.uid === uid).speciesId);
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
  motion.onfinish = () => {
    orb.remove();
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
function step() {
  if (dungeonUI.isOpen()) return;
  const events = battle.tick();
  let refresh = false;
  let dungeonEnded = false;
  for (const e of events) {
    if (e.type === "dungeonResult") dungeonEnded = true;
    if (e.type === "attack") {
      attackEffect(e.uid, e.crit);
      sound.effect(e.crit ? "critical" : "attack");
      const el = document.getElementById(`fighter-${e.uid}`);
      el?.classList.remove("attacking");
      if (el) {
        void el.offsetWidth;
        el.classList.add("attacking");
      }
      $("#enemy-fighter").classList.remove("hit");
      void $("#enemy-fighter").offsetWidth;
      $("#enemy-fighter").classList.add("hit");
      floatDamage(
        `${e.crit ? "치명타 " : ""}${e.damage}`,
        $("#enemy-fighter"),
        e.crit ? "critical" : "",
      );
    }
    if (e.type === "hit") {
      const el = document.getElementById(`fighter-${e.uid}`);
      if (el) floatDamage(`−${e.damage}`, el, "received");
    }
    if (e.type === "reward") {
      sound.effect("reward");
      floatDamage(`+${e.gold} 포켓코인`, $("#enemy-fighter"), "gold-reward");
      refresh = true;
    }
    if (e.type === "stage") {
      sound.effect("clear");
      const t = $("#stage-transition");
      t.classList.add("visible");
      setTimeout(() => t.classList.remove("visible"), 1600);
      refresh = true;
    }
    if (e.type === "boss") {
      sound.effect("boss");
      toast("보스가 나타났어요! 탐험대, 준비!");
      refresh = true;
    }
    if (e.type === "defeat") {
      sound.effect("defeat");
      toast("탐험대가 회복했어요. 레벨을 올린 후 보스에 다시 도전하세요.");
      refresh = true;
    }
  }
  if (refresh) {
    renderBattle();
    persist();
  } else paintHealth();
  updateHud();
  if (dungeonEnded) { $("#modal-root").innerHTML=""; persist(); dungeonUI.result(battle); }
}
let timer;
function schedule() {
  clearInterval(timer);
  timer = setInterval(step, 850 / state.speed);
}
let replaceSlot = null;
function leaveCollection() {
  $("#collection-page").hidden = true;
  $(".game-shell").classList.remove("managing");
  replaceSlot = null;
}
function closeModal() {
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
  const tab = battle.dungeon ? "dungeons" : ["collection","summon","dungeons"].includes(active) ? active : "home";
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
  $(".modal").focus();
  updateNavigation();
}
function collection() {
  dungeonUI.close();
  active = "collection";
  const scroll = $(".collection-scroll")?.scrollTop || 0;
  $("#modal-root").innerHTML = "";
  $(".game-shell").classList.add("managing");
  const sorted = [...state.inventory].sort((a, b) =>
    (sort === "level" ? b.level - a.level : sort === "power" ? power(b) - power(a) : species(b.speciesId).rarity - species(a.speciesId).rarity) || power(b) - power(a));
  const page = $("#collection-page");
  page.hidden = false;
  page.innerHTML = `<header class="party-header"><div class="management-title"><div><span class="eyebrow">함께 떠나는 모험</span><h1>포켓몬 탐험대</h1></div><div class="party-total">${i("swords")}<span>전체 전투력 <strong id="party-power">${num(partyPower())}</strong></span><small id="party-count">${state.party.length} / 5</small></div></div><div class="party-slots">${Array.from({length:5},(_,index)=>{
    const p=state.inventory.find(p=>p.uid===state.party[index]);
    return `<button class="party-slot ${p ? "occupied" : "empty"} ${replaceSlot === index ? "choosing" : ""}" data-action="slot" data-slot="${index}" aria-label="${index+1}번 파티 슬롯${p ? ` ${species(p.speciesId).name}` : " 비어 있음"}"><span class="slot-number">${index+1}</span>${p ? `${art(species(p.speciesId), "field-art party-sprite")}<span class="slot-caption"><strong>${species(p.speciesId).name}</strong><small>Lv. ${p.level}</small></span>` : `${i("plus")}<span>포켓몬 편성</span>`}</button>`;
  }).join("")}</div></header><div class="collection-toolbar"><span>보유 포켓몬 <b>${state.inventory.length}</b></span><div class="sort-options" aria-label="포켓몬 정렬">${[["rarity","등급순"],["level","레벨순"],["power","전투력순"]].map(([key,label])=>`<button class="soft-button ${sort === key ? "selected" : ""}" data-action="sort" data-sort="${key}" aria-pressed="${sort===key}">${label}</button>`).join("")}</div></div>${replaceSlot!==null ? `<div class="selection-notice"><span>${replaceSlot+1}번 슬롯에 편성할 포켓몬을 선택하세요.</span><button class="text-button" data-action="cancelReplace">취소</button></div>` : ""}<div class="collection-scroll" tabindex="0" aria-label="보유 포켓몬 목록"><div class="collection-grid">${sorted.map(p=>card(p,replaceSlot!==null ? "assignSlot" : "detail")).join("")}</div></div>`;
  icons();
  $(".collection-scroll").scrollTop = scroll;
  updateNavigation();
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
  battle.resetParty();
  persist();
  renderBattle();
  replaceSlot = null;
  collection();
  toast("탐험대 편성을 저장했어요.");
}
function detail(uid) {
  replaceSlot = null;
  selected = uid;
  const p = state.inventory.find((p) => p.uid === uid),
    s = species(p.speciesId),
    r = RARITIES[s.rarity],
    st = stats(p);
  modal(
    s.name,
    `관동 도감 No. ${String(s.id).padStart(3, "0")} · ${s.genus}`,
    `<button class="text-button" data-action="collection">${i("chevron-left")}보유 목록</button><div class="detail-layout"><div class="detail-art rarity-${s.rarity}" style="--rarity:${r.color}"><div class="detail-orbit"></div>${art(s, "field-art detail-sprite")}<span class="rarity-badge" style="color:${r.color}">${r.name} · ${s.types.join(" / ")}</span><small>키 ${s.height}m · 몸무게 ${s.weight}kg</small><span class="detail-stars" style="color:${r.color}">${"✦".repeat(s.rarity + 1)}</span></div><div class="detail-info"><h3>Lv. ${p.level} <small>/ 100</small></h3><div class="stat-row">${i("heart")} HP <b>${num(st.hp)}</b></div><div class="stat-row">${i("swords")} 공격력 <b>${num(st.atk)}</b></div><div class="stat-row">${i("shield")} 전투력 <b>${num(power(p))}</b></div><button class="primary-button full" data-action="level" data-id="${uid}" ${p.level >= 100 ? "disabled" : ""}>${i("arrow-up")} 레벨업 <span>이상한사탕 ${num(levelCost(p))}개</span></button><button class="soft-button full" data-action="party" data-id="${uid}">${i(state.party.includes(uid) ? "check" : "plus")}${state.party.includes(uid) ? "탐험대에서 해제" : "탐험대에 편성"}</button><small class="muted">보유 이상한사탕 ${num(state.candies)}개 · 필요 ${num(levelCost(p))}개</small></div></div>`,
    "detail-modal",
  );
}
function summonScreen() {
  dungeonUI.close();
  leaveCollection();
  active = "summon";
  sound.setMode("summon");
  modal(
    "새로운 인연이 기다려요",
    "포켓몬 소환",
    `<div class="summon-banner"><div class="summon-orbit orbit-one"></div><div class="summon-orbit orbit-two"></div><span class="summon-spark spark-one">✦</span><span class="summon-spark spark-two">✧</span><span class="banner-label">관동지방의 특별한 만남 · 151마리</span><h3>너와 함께라면, 어디든.</h3><div class="summon-featured"><div>${art(species(133), "field-art")}</div><div>${art(species(25), "field-art")}</div><div>${art(species(149), "field-art")}</div></div><div class="summon-pedestal"></div><div class="big-ball"><span></span></div><p>오늘, 우리의 이야기가 시작됩니다.</p><button class="rate-button" data-action="rates">${i("circle-help")}소환 확률 안내</button></div><div class="summon-wallet">${currencyIcon("diamond", "다이아")}보유 다이아 <b>${num(state.gems)}</b></div><div class="summon-actions"><button class="soft-button" data-action="draw" data-count="1"><strong>1회 소환</strong><span>${currencyIcon("diamond", "다이아")}300</span></button><button class="primary-button" data-action="draw" data-count="10"><span class="discount">10% 할인</span><strong>10회 소환</strong><span>${currencyIcon("diamond", "다이아")}2,700</span></button></div><p class="summon-note">중복 포켓몬도 개별 획득하며, 각각 성장·편성할 수 있어요.</p>`,
    "summon-modal",
  );
}
function draw(count) {
  if (busy) return;
  const outcome = summon(state, count);
  if (outcome.error) return toast(outcome.error);
  persist();
  busy = true;
  sound.effect("summon");
  modal(
    "두근두근, 새로운 만남",
    "소환 중",
    `<div class="summoning"><div class="big-ball"><span></span></div><p>몬스터볼이 반짝이고 있어요…</p></div>`,
  );
  setTimeout(() => {
    busy = false;
    const legendary = outcome.result.some(
      (p) => species(p.speciesId).rarity === 4,
    );
    sound.effect(legendary ? "legendary" : "reveal");
    modal(
      legendary ? "전설의 친구가 찾아왔어요!" : "우리의 모험에 온 걸 환영해!",
      "소환 결과",
      `<div class="result-message">${i(legendary ? "crown" : "sparkles")} ${count}마리의 포켓몬을 획득했어요</div><div class="result-grid ${count === 1 ? "single" : ""} ${legendary ? "legendary-result" : ""}">${outcome.result.map((p, n) => `<div class="reveal-card" style="--reveal:${n}">${card(p)}</div>`).join("")}</div><button class="primary-button result-confirm" data-action="summon">확인 ${i("check")}</button>`,
    );
  }, 950);
}
function stages() {
  active = "stages";
  const current = ((state.stage - 1) % 20) + 1,
    chapter = Math.floor((state.stage - 1) / 20);
  modal(
    "한 걸음씩, 새로운 세상으로",
    "스테이지",
    `<div class="stage-overview">${i("map")}<div><h3>${regionName(state.stage)}</h3><p>관동지방 · ${chapter + 1}번째 지역</p></div><span>${current} / 20</span></div><div class="stage-grid">${Array.from({ length: 20 }, (_, n) => `<div class="stage-node ${n + 1 < current ? "complete" : n + 1 === current ? "current" : ""}">${i(n + 1 < current ? "check" : n === 19 ? "crown" : "leaf")}<b>${chapter + 1}-${n + 1}</b><small>${n + 1 < current ? "클리어" : n + 1 === current ? "모험 중" : "미개방"}</small></div>`).join("")}</div><div class="stage-actions"><div><span>야생 포켓몬 처치 <b id="kills">${state.kills} / 10</b></span><div class="progress-track"><div id="stage-progress"></div></div></div><button class="primary-button" data-action="boss" id="boss-button">${i("swords")}보스 도전</button></div><p id="boss-status" class="muted"></p><button class="quest stage-quest" data-action="quest"><span class="quest-icon">${i("gift")}</span><span><strong>모험의 첫걸음</strong><small id="quest-text"></small></span>${i("chevron-right")}</button>`,
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
    `${audioSettings()}<div class="setting-row"><div><b>자동 전투</b><p>탐험대가 자동으로 야생 포켓몬을 공격해요.</p></div><button class="toggle ${state.auto ? "on" : ""}" data-action="settingAuto" aria-label="자동 전투 전환" aria-pressed="${state.auto}"><span></span></button></div><div class="setting-row"><div><b>자동 보스 도전</b><p>일반 적 10마리 처치 후 자동으로 도전해요.</p></div><button class="toggle ${state.autoBoss ? "on" : ""}" data-action="settingBoss" aria-label="자동 보스 전환" aria-pressed="${state.autoBoss}"><span></span></button></div><div class="setting-row"><div><b>전투 배속</b><p>1배 · 2배 · 3배</p></div><button class="soft-button" data-action="settingSpeed" aria-label="전투 배속">${state.speed}×</button></div><div class="save-info">${i("check-check")} <span id="save-status"></span><br>브라우저 데이터를 지우면 진행 상황도 삭제됩니다.</div><p class="asset-credit">스프라이트: PokeAPI / sprites · 포켓몬: Nintendo / Creatures / GAME FREAK<br>음악: Oldale Town · 사용자 제공 음원</p>`,
    "settings-modal",
  );
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled || busy) return;
  const action = btn.dataset.action;
  if (action !== "music" && !sound.started) sound.unlock();
  if (action !== "music") sound.effect("click");
  if (dungeonUI.handle(action, btn)) return;
  switch (action) {
    case "dungeonStatus":
      modal(battle.dungeon.name, `${battle.dungeon.stage}단계`, `<p>자동 전투 · ${battle.turn} / 120턴</p><p>승리 보상: ${battle.dungeon.reward} ${num(battle.dungeon.amount)}개</p><button class="soft-button" data-action="dungeons">도전 종료 · 던전 선택</button>`);
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
    case "collection":
      collection();
      break;
    case "detail":
      detail(btn.dataset.id);
      break;
    case "slot":
      slotMenu(Number(btn.dataset.slot));
      break;
    case "replaceSlot":
      collection();
      break;
    case "cancelReplace":
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
    case "settings":
      settings();
      break;
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
    case "level": {
      const error = levelUp(state, btn.dataset.id);
      if (error) {
        toast(error);
        break;
      }
      battle.resetParty();
      persist();
      renderBattle();
      collection();
      detail(btn.dataset.id);
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
