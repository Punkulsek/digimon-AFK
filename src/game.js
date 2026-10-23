import {SPECIES,species,RARITIES} from './data.js';
export const PARTY_LIMIT=5;
export const SAVE_KEY='pokemon-days-v1';
export const stats = p => {const s=species(p.speciesId);return {hp:Math.round(s.hp*(1+(p.level-1)*.14)),atk:Math.round(s.atk*(1+(p.level-1)*.16))}};
export const power = p => {const s=stats(p);return s.hp+s.atk*5};
export const levelCost = p => p.level*80;
export function initialState(){return {version:1,stage:1,kills:0,gold:10000,gems:10000,inventory:[1,4,7,25,39,133].map((id,i)=>({uid:`starter-${i}`,speciesId:id,level:1})),party:[0,1,2,3,4].map(i=>`starter-${i}`),auto:true,autoBoss:true,speed:1,totalKills:0,questClaimed:false,summons:0};}
export function validateState(s,partyLimit=PARTY_LIMIT){
 if(!s||s.version!==1||!Number.isSafeInteger(s.stage)||s.stage<1||!Number.isSafeInteger(s.kills)||s.kills<0||s.kills>10||!Number.isSafeInteger(s.gold)||s.gold<0||!Number.isSafeInteger(s.gems)||s.gems<0||!Array.isArray(s.inventory)||!s.inventory.length||s.inventory.length>10000)return false;
 if(!s.inventory.every(p=>p&&typeof p.uid==='string'&&species(p.speciesId)&&Number.isSafeInteger(p.level)&&p.level>=1&&p.level<=100))return false;
 if(new Set(s.inventory.map(p=>p.uid)).size!==s.inventory.length)return false;
 return Array.isArray(s.party)&&s.party.length>0&&s.party.length<=partyLimit&&new Set(s.party).size===s.party.length&&s.party.every(id=>s.inventory.some(p=>p.uid===id))&&typeof s.auto==='boolean'&&typeof s.autoBoss==='boolean'&&[1,2,3].includes(s.speed)&&Number.isSafeInteger(s.totalKills)&&s.totalKills>=0&&typeof s.questClaimed==='boolean'&&Number.isSafeInteger(s.summons)&&s.summons>=0;
}
export function load(storage){try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:initialState(),status:'new'};const s=JSON.parse(raw);if(Array.isArray(s?.party)&&s.party.length===6&&validateState(s,6)){s.party=s.party.slice(0,PARTY_LIMIT);save(storage,s);}if(validateState(s))return {state:s,status:'loaded'};return {state:initialState(),status:'invalid'};}catch{return {state:initialState(),status:'unavailable'}}}
export function save(storage,state){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function summon(state,count,rng=Math.random){
 if(![1,10].includes(count))return {error:'잘못된 소환 횟수입니다.'};
 const cost=count===10?2700:300;
 if(state.gems<cost)return {error:'다이아가 부족해요. 퀘스트와 보스를 통해 모아 보세요.'};
 if(state.inventory.length+count>10000)return {error:'보유 한도에 도달했어요.'};
 state.gems-=cost;const result=[];
 for(let i=0;i<count;i++){let roll=rng()*100;let rarity=0;for(let r=0;r<RARITIES.length;r++){roll-=RARITIES[r].chance;if(roll<0){rarity=r;break;}}
 const pool=SPECIES.filter(p=>p.rarity===rarity);const s=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
 const p={uid:`summon-${++state.summons}`,speciesId:s.id,level:1};state.inventory.push(p);result.push(p);}
 return {result,cost};
}
export function levelUp(state,uid){const p=state.inventory.find(p=>p.uid===uid);if(!p)return '포켓몬을 찾을 수 없어요.';if(p.level>=100)return '최고 레벨이에요.';const cost=levelCost(p);if(state.gold<cost)return '포켓코인가 부족해요.';state.gold-=cost;p.level++;return null;}
export function toggleParty(state,uid){if(!state.inventory.some(p=>p.uid===uid))return '포켓몬을 찾을 수 없어요.';if(state.party.includes(uid)){if(state.party.length===1)return '최소 한 마리는 편성해야 해요.';state.party=state.party.filter(id=>id!==uid);}else{if(state.party.length>=PARTY_LIMIT)return '파티가 가득 찼어요. 먼저 한 마리를 해제해 주세요.';state.party.push(uid);}return null;}
export class Battle {
 constructor(state){this.state=state;this.turn=0;this.boss=false;this.events=[];this.resetParty();this.spawn();}
 resetParty(){this.allies=this.state.party.map(uid=>{const p=this.state.inventory.find(p=>p.uid===uid);return {uid,...stats(p),maxHp:stats(p).hp}});}
 spawn(){const scale=1+(this.state.stage-1)*.22;const ids=this.boss?[25,94,149]:[10,16,19,43,54];const s=species(ids[(this.state.stage+this.state.kills-1)%ids.length]);const hp=Math.round((this.boss?300:95)*scale);this.enemy={speciesId:s.id,hp,maxHp:hp,atk:Math.round((this.boss?18:6)*scale)};this.bossTurns=0;}
 challenge(){if(this.boss||this.state.kills<10)return false;this.boss=true;this.resetParty();this.spawn();return true;}
 tick(){this.events=[];if(!this.state.auto)return this.events;
 this.turn++;const alive=this.allies.filter(a=>a.hp>0);
 if(!alive.length){this.fail();return this.events;}
 const a=alive[(this.turn-1)%alive.length];const crit=this.turn%7===0;const damage=Math.round(a.atk*(crit?1.8:1));this.enemy.hp=Math.max(0,this.enemy.hp-damage);this.events.push({type:'attack',uid:a.uid,damage,crit});
 if(this.enemy.hp===0){const gold=Math.round((this.boss?180:24)*(1+(this.state.stage-1)*.18));this.state.gold+=gold;this.state.totalKills++;this.events.push({type:'reward',gold});
 if(this.boss){this.state.stage++;this.state.kills=0;this.state.gems+=100;this.boss=false;this.events.push({type:'stage'});}else this.state.kills=Math.min(10,this.state.kills+1);
 this.allies.forEach(a=>a.hp=Math.min(a.maxHp,a.hp+Math.round(a.maxHp*.2)));
 if(this.state.kills===10&&this.state.autoBoss){this.challenge();this.events.push({type:'boss'});}else this.spawn();return this.events;}
 if(this.turn%2===0){const target=alive[Math.floor(this.turn/2)%alive.length];target.hp=Math.max(0,target.hp-this.enemy.atk);this.events.push({type:'hit',uid:target.uid,damage:this.enemy.atk});}
 if(this.boss&&++this.bossTurns>=60){this.fail();}else if(this.allies.every(a=>a.hp===0))this.fail();return this.events;
 }
 fail(){this.boss=false;this.state.autoBoss=false;this.resetParty();this.spawn();this.events.push({type:'defeat'});}
}
