import {species} from './data.js';
import {summonGrade} from './summoning.js';

// Percent stats use percentage points (5 means 5%). Never persist derived stats.
export const STAT_FIELDS=[['hp','체력'],['atk','공격력'],['def','방어력'],['attackSpeed','공격속도'],['penetration','방어 관통'],['damageReduction','피해 감소'],['bossDamage','보스 피해'],['skillHaste','스킬 가속'],['skillAmplification','스킬 증폭'],['critChance','급소 확률'],['critDamage','급소 피해']];
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,finite(n)));
const round=n=>Math.round(n*100)/100;
export function pokemonStats(p,state){
 const b=species(p.speciesId).baseStats,g=summonGrade(p.speciesId),level=p.level-1,stars=p.breakthrough||0;
 const boost=1+stars*.15,u=state?.upgrades||{},growth=1+g*.025;
 // Actual species base stats, including evolved species, are the sole base.
 const core=(base,scale,rate,key)=>Math.round(Math.round(base*scale)*boost*(1+level*rate*growth)*(1+(u[key]||0)*.005));
 return {
 hp:core(b.hp,1.6,.14,'hp'),atk:core(b.attack,.28,.16,'atk'),def:core(b.defense,1,.14,'def'),
 attackSpeed:round(100+b.speed*.2+level*.15+stars*2),
 penetration:round(b.attack/100+level*.03+stars*.5),
 damageReduction:round(b.specialDefense/100+level*.02+stars*.3),
 bossDamage:round(g+level*.05+stars),
 skillHaste:round(b.speed*.1+level*.1+stars),
 skillAmplification:round(b.specialAttack*.1+level*.1+stars*2),
 critChance:5,critDamage:150,
 };
}
export function criticalStats(stats){
 const chance=Math.max(0,finite(stats.critChance,5));
 return {chance:Math.min(100,chance),damage:Math.max(100,finite(stats.critDamage,150))+Math.max(0,chance-100)*.5};
}
export function resolveDamage(attacker,defender,{boss=false,skill=false,coefficient=1,rng=Math.random}={}){
 const c=criticalStats(attacker),crit=rng()<c.chance/100;
 const defense=Math.max(0,finite(defender.def))*(1-clamp(attacker.penetration,0,100)/100);
 const raw=Math.max(0,finite(attacker.atk))*Math.max(0,finite(coefficient,1));
 const damage=raw*400/(400+defense)*(boss?1+Math.max(0,finite(attacker.bossDamage))/100:1)*(skill?1+Math.max(0,finite(attacker.skillAmplification))/100:1)*(crit?c.damage/100:1)*(1-clamp(defender.damageReduction,0,100)/100);
 return {damage:damage===0?0:Math.max(1,Math.round(damage)),crit};
}
// Integration points only: this patch does not add or activate any skill system.
export const skillCharge=(base,stats)=>Math.max(0,finite(base))*(1+Math.max(0,finite(stats.skillHaste))/100);
export const skillSupport=(base,stats)=>Math.max(0,finite(base))*(1+Math.max(0,finite(stats.skillAmplification))/100);
export const attackRate=stats=>clamp(stats.attackSpeed??100,1,1000)/100;
export function formatStat(key,value){return key==='hp'||key==='atk'||key==='def'?Math.round(value).toLocaleString('ko-KR'):`${round(value)}%`;}
