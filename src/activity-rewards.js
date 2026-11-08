import {dungeonInfo} from './dungeon.js';
import {stageGold} from './stages.js';
export const dayKey=now=>new Date(now+9*3600000).toISOString().slice(0,10);
export const keyType=id=>id.startsWith('evolution-')?'evolution':['coin','candy','rune'].includes(id)?id:null;
export function syncKeys(s,now=Date.now()){
 const day=dayKey(now);
 if(!s.dungeonKeys||s.dungeonKeys.day<day)s.dungeonKeys={day,coin:6,candy:6,rune:6,evolution:6};
 return s.dungeonKeys;
}
export function spendKey(s,id,now=Date.now()) {const type=keyType(id);if(!type)return id==='tower';const keys=syncKeys(s,now);if(!(keys[type]>0))return false;keys[type]--;return true;}
export function grantDungeon(s,d){if(d.id==='coin'||d.id==='tower')s.gold+=d.amount;else if(d.id==='candy')s.candies+=d.amount;else if(d.id==='rune')s.runeDust+=d.amount;else s.materials[d.material]+=d.amount;}
export function sweepDungeon(s,id,stage,now=Date.now()){
 const d=dungeonInfo(id,stage);if(!d||!keyType(id)||!(s.dungeonClears[id]>=stage)||!spendKey(s,id,now))return false;
 grantDungeon(s,d);return true;
}
export const stageCandy=stage=>1+Math.floor((stage-1)/20);
export function accrueOffline(s,now=Date.now()){
 const old=s.offlineRewards;
 const seconds=old?.lastSeen?Math.min(8*3600,Math.max(0,Math.floor((now-old.lastSeen)/1000))):0;
 const pending=Math.min(8*3600,(old?.seconds||0)+seconds),minutes=Math.floor(pending/60)-Math.floor((old?.seconds||0)/60);
 s.offlineRewards={lastSeen:now,seconds:pending,gold:(old?.gold||0)+Math.max(0,minutes)*stageGold(s.stage)*5,candies:(old?.candies||0)+Math.max(0,minutes)*stageCandy(s.stage)};
 syncKeys(s,now);return s.offlineRewards;
}
export function heartbeat(s,now=Date.now()){if(!s.offlineRewards)accrueOffline(s,now);s.offlineRewards.lastSeen=now;syncKeys(s,now);}
export function claimOffline(s,now=Date.now()){
 const r=s.offlineRewards;if(!r||(!r.gold&&!r.candies))return false;
 s.gold+=r.gold;s.candies+=r.candies;s.offlineRewards={lastSeen:now,seconds:0,gold:0,candies:0};return true;
}
