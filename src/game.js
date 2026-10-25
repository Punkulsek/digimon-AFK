import {pokemonStats,resolveDamage,attackRate,criticalStats} from './combat-stats.js';
import {upgradeDefaults,UPGRADE_KEYS} from './upgrades.js';
import {mergeDuplicates} from './duplicates.js';
import {SUMMON_RATES,SUMMON_POOLS,summonLevel} from "./summoning.js";
import {MAX_STAGE,STAGE_KILLS,BOSS_TURN_LIMIT,stageEnemy,stageGold} from "./stages.js";
import {recordCollection} from "./collection-record.js";
import {dungeonInfo,canEnterDungeon} from './dungeon.js';
import {dungeonDefaults, DUNGEONS, EVOLUTION_TYPES, DUNGEON_STAGES} from './dungeon-config.js';
import {SPECIES,species,RARITIES} from './data.js';
export const PARTY_LIMIT=5;
export const SAVE_KEY='pokemon-days-v1';
export const stats = pokemonStats;
export const power = (p,state) => {const s=stats(p,state),c=criticalStats(s);return Math.round(s.hp+s.def+s.atk*5*attackRate(s)*(1+s.bossDamage/100)*(1+c.chance/100*(c.damage/100-1)))};
export const levelCost = p => Math.ceil(p.level/5);
export function initialState(){return {...dungeonDefaults(),version:1,upgrades:upgradeDefaults(),shards:{},discovered:[1,4,7,25,39,133],stage:1,campaignCleared:false,kills:0,gold:10000,gems:10000,inventory:[1,4,7,25,39,133].map((id,i)=>({uid:`starter-${i}`,speciesId:id,level:1,breakthrough:0})),party:[0,1,2,3,4].map(i=>`starter-${i}`),auto:true,autoBoss:true,speed:1,totalKills:0,questClaimed:false,summons:0};}
export function validateState(s,partyLimit=PARTY_LIMIT){
 if(!s||s.version!==1||!Number.isSafeInteger(s.stage)||s.stage<1||s.stage>MAX_STAGE||!Number.isSafeInteger(s.kills)||s.kills<0||s.kills>10||!Number.isSafeInteger(s.gold)||s.gold<0||!Number.isSafeInteger(s.gems)||s.gems<0||!Array.isArray(s.inventory)||!s.inventory.length||s.inventory.length>10000)return false;
 if(s.upgrades!==undefined&&(!s.upgrades||!UPGRADE_KEYS.every(k=>Number.isSafeInteger(s.upgrades[k])&&s.upgrades[k]>=0&&s.upgrades[k]<=1000)))return false;
 if(s.shards!==undefined&&(!s.shards||typeof s.shards!=='object'||Array.isArray(s.shards)||!Object.entries(s.shards).every(([id,n])=>species(Number(id))&&Number.isSafeInteger(n)&&n>=0)))return false;
 if(s.campaignCleared!==undefined&&(typeof s.campaignCleared!=='boolean'||(s.campaignCleared&&s.stage!==MAX_STAGE)))return false;
 if(s.discovered!==undefined&&(!Array.isArray(s.discovered)||s.discovered.length>151||new Set(s.discovered).size!==s.discovered.length||!s.discovered.every(id=>species(id))))return false;
 if(!s.inventory.every(p=>p&&typeof p.uid==='string'&&species(p.speciesId)&&Number.isSafeInteger(p.level)&&p.level>=1&&p.level<=100&&(p.breakthrough===undefined||(Number.isInteger(p.breakthrough)&&p.breakthrough>=0&&p.breakthrough<=10))))return false;
 if(!Number.isSafeInteger(s.candies)||s.candies<0||!s.materials||!s.dungeonClears)return false;
 if(!EVOLUTION_TYPES.every(t=>Number.isSafeInteger(s.materials[t.id])&&s.materials[t.id]>=0)||!DUNGEONS.every(d=>Number.isInteger(s.dungeonClears[d.id])&&s.dungeonClears[d.id]>=0&&s.dungeonClears[d.id]<=DUNGEON_STAGES))return false;
 if(new Set(s.inventory.map(p=>p.uid)).size!==s.inventory.length)return false;
 return Array.isArray(s.party)&&s.party.length>0&&s.party.length<=partyLimit&&new Set(s.party).size===s.party.length&&s.party.every(id=>s.inventory.some(p=>p.uid===id))&&typeof s.auto==='boolean'&&typeof s.autoBoss==='boolean'&&[1,2,3].includes(s.speed)&&Number.isSafeInteger(s.totalKills)&&s.totalKills>=0&&typeof s.questClaimed==='boolean'&&Number.isSafeInteger(s.summons)&&s.summons>=0;
}
export function load(storage){try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:initialState(),status:'new'};const s=JSON.parse(raw);if(s&&typeof s==='object'&&!Array.isArray(s)){if(Number.isSafeInteger(s.stage)&&s.stage>MAX_STAGE){s.stage=MAX_STAGE;s.campaignCleared=true;}if(s.campaignCleared===undefined)s.campaignCleared=false;const defaults=dungeonDefaults();for(const key of Object.keys(defaults))if(s[key]===undefined)s[key]=defaults[key];for(const key of ['materials','dungeonClears'])if(s[key]&&typeof s[key]==='object'&&!Array.isArray(s[key]))s[key]={...defaults[key],...s[key]};}if(Array.isArray(s?.party)&&s.party.length===6&&validateState(s,6)){s.party=s.party.slice(0,PARTY_LIMIT);save(storage,s);}if(validateState(s)){recordCollection(s);if(s.inventory.some((p,i)=>s.inventory.findIndex(q=>q.speciesId===p.speciesId)!==i)){try{if(!storage.getItem(SAVE_KEY+'-before-shards'))storage.setItem(SAVE_KEY+'-before-shards',raw);}catch{}}s.upgrades ||= upgradeDefaults();mergeDuplicates(s);save(storage,s);return {state:s,status:'loaded'};}return {state:initialState(),status:'invalid'};}catch{return {state:initialState(),status:'unavailable'}}}
export function save(storage,state){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function summon(state,count,rng=Math.random){
 if(![1,10,30].includes(count))return {error:'잘못된 소환 횟수입니다.'};
 const cost=count*100;
 if(state.gems<cost)return {error:'다이아가 부족해요. 퀘스트와 보스를 통해 모아 보세요.'};
 if(state.inventory.length+count>10000)return {error:'보유 한도에 도달했어요.'};
 state.gems-=cost;const result=[];
 for(let i=0;i<count;i++){let roll=rng()*100;let rarity=0;const rates=SUMMON_RATES[summonLevel(state.summons)-1];for(let r=0;r<rates.length;r++){roll-=rates[r];if(roll<0){rarity=r;break;}}
 const pool=SUMMON_POOLS[rarity];const s=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
 const p={uid:`summon-${++state.summons}`,speciesId:s.id,level:1,breakthrough:0};state.inventory.push(p);result.push(p);}
 recordCollection(state);mergeDuplicates(state);return {result,cost};
}
export function levelUp(state,uid){const p=state.inventory.find(p=>p.uid===uid);if(!p)return '포켓몬을 찾을 수 없어요.';if(p.level>=100)return '최고 레벨이에요.';const cost=levelCost(p);if(state.candies<cost)return '이상한사탕이 부족해요. 이상한사탕 던전에서 획득할 수 있어요.';state.candies-=cost;p.level++;return null;}
export function toggleParty(state,uid){if(!state.inventory.some(p=>p.uid===uid))return '포켓몬을 찾을 수 없어요.';if(state.party.includes(uid)){if(state.party.length===1)return '최소 한 마리는 편성해야 해요.';state.party=state.party.filter(id=>id!==uid);}else{if(state.party.length>=PARTY_LIMIT)return '파티가 가득 찼어요. 먼저 한 마리를 해제해 주세요.';state.party.push(uid);}return null;}
export class Battle {
 constructor(state,dungeon=null,rng=Math.random){
 this.rng=rng;
 if(dungeon&&!canEnterDungeon(state,dungeon.id,dungeon.stage))throw new Error('아직 개방되지 않은 던전입니다.');
 this.dungeon=dungeon?dungeonInfo(dungeon.id,dungeon.stage):null;this.info=this.dungeon;this.status='fighting';
 this.state=state;this.turn=0;this.boss=false;this.events=[];this.resetParty();this.spawn();
 }
 resetParty(){this.allies=this.state.party.map((uid,index)=>{const p=this.state.inventory.find(p=>p.uid===uid);return {uid,...stats(p,this.state),maxHp:stats(p,this.state).hp,attackProgress:1-(index+1)/this.state.party.length}});}
 spawn(){
 if(this.dungeon){const d=this.dungeon;this.enemy={speciesId:d.enemy,hp:d.hp,maxHp:d.hp,atk:d.atk,def:0};return;}
 this.enemies=Array.from({length:5},(_,n)=>({...stageEnemy(this.state.stage,this.boss&&n===0,this.state.kills+n),isBoss:this.boss&&n===0}));this.enemy=this.enemies[0];this.bossTurns=0;
 }
 challenge(){if(this.dungeon||this.boss||this.state.campaignCleared||this.state.kills<STAGE_KILLS)return false;this.boss=true;this.resetParty();this.spawn();return true;}
 tick(){this.events=[];if(this.status!=='fighting'||(!this.dungeon&&!this.state.auto))return this.events;
 this.turn++;const alive=this.allies.filter(a=>a.hp>0);
 if(!alive.length){this.fail();return this.events;}
 // Staggered per-Pokémon timers: faster Pokémon attack more frequently.
 for(const a of alive){
 a.attackProgress=Math.min(1,a.attackProgress)+attackRate(a)/this.allies.length;
 while(a.attackProgress>=1&&this.enemy.hp>0){
 a.attackProgress-=1;
 const {damage,crit}=resolveDamage(a,this.enemy,{boss:this.enemy.isBoss||!!this.dungeon,rng:this.rng});
 this.enemy.hp=Math.max(0,this.enemy.hp-damage);this.events.push({type:'attack',uid:a.uid,damage,crit});
 }
 }
 if(this.enemy.hp===0&&!this.dungeon&&this.enemies.some(e=>e.hp>0)){this.state.totalKills++;this.enemy=this.enemies.find(e=>e.hp>0);this.events.push({type:'target'});}
 if(this.enemies&&!this.dungeon&&this.enemies.every(e=>e.hp===0)||this.dungeon&&this.enemy.hp===0){if(this.dungeon){this.finishDungeon('won');return this.events;}const gold=stageGold(this.state.stage,this.boss)+stageGold(this.state.stage,false)*4;this.state.gold+=gold;this.state.totalKills++;this.events.push({type:'reward',gold});
 if(this.boss){if(this.state.stage===MAX_STAGE){this.state.campaignCleared=true;this.events.push({type:'campaignComplete'});}else{this.state.stage++;this.events.push({type:'stage'});}this.state.kills=0;this.state.gems+=100;this.boss=false;}else this.state.kills=Math.min(10,this.state.kills+5);
 this.allies.forEach(a=>a.hp=Math.min(a.maxHp,a.hp+Math.round(a.maxHp*.2)));
 if(this.state.kills===STAGE_KILLS&&this.state.autoBoss&&this.challenge()){this.events.push({type:'boss'});}else this.spawn();return this.events;}
 if(this.turn%2===0){const target=alive[Math.floor(this.turn/2)%alive.length];const attackers=this.dungeon?[this.enemy]:this.enemies.filter(e=>e.hp>0);const attacker=attackers[Math.floor(this.turn/2)%attackers.length];const {damage,crit}=resolveDamage({...attacker,critChance:5,critDamage:150},target,{rng:this.rng});target.hp=Math.max(0,target.hp-damage);this.events.push({type:'hit',uid:target.uid,damage,crit});}
 if(this.dungeon&&this.turn>=120){this.fail();}else if(this.boss&&++this.bossTurns>=BOSS_TURN_LIMIT){this.fail();}else if(this.allies.every(a=>a.hp===0))this.fail();return this.events;
 }
 finishDungeon(status){
 if(this.status!=='fighting')return;
 this.status=status;
 if(status==='won'){
 const d=this.dungeon;
 if(d.id==='coin')this.state.gold+=d.amount;
 else if(d.id==='candy')this.state.candies+=d.amount;
 else this.state.materials[d.material]+=d.amount;
 this.state.dungeonClears[d.id]=Math.max(this.state.dungeonClears[d.id],d.stage);
 }
 this.events.push({type:'dungeonResult',status});
 }
 fail(){if(this.dungeon){this.finishDungeon('lost');return;}this.boss=false;this.state.autoBoss=false;this.resetParty();this.spawn();this.events.push({type:'defeat'});}
}
