import {species,SPECIES} from './data.js';
import {EVOLUTION_TYPES} from './dungeon-config.js';
import {recordCollection} from "./collection-record.js";
// Game-specific long-term requirements, not the main-series evolution rules.
// Each row: source, target, level, cleared region, quantity per target type.
export const EVOLUTIONS = [
 [1,2,40,3,150],[2,3,80,8,600],
 [4,5,40,3,150],[5,6,80,8,600],
 [7,8,40,3,150],[8,9,80,8,600],
 [10,11,30,2,100],[11,12,65,6,400],
 [13,14,30,2,100],[14,15,65,6,400],
 [16,17,35,3,120],[17,18,75,7,500],
 [19,20,45,4,200],[21,22,45,4,200],[23,24,45,4,200],
 [25,26,60,5,350],[27,28,45,4,200],
 [29,30,40,3,150],[30,31,80,8,600],
 [32,33,40,3,150],[33,34,80,8,600],
 [35,36,60,5,350],[37,38,60,5,350],[39,40,60,5,350],
 [41,42,45,4,200],[43,44,40,3,150],[44,45,80,8,600],
 [46,47,45,4,200],[48,49,50,4,250],[50,51,45,4,200],
 [52,53,45,4,200],[54,55,50,4,250],[56,57,50,4,250],
 [58,59,65,6,400],[60,61,40,3,150],[61,62,80,8,600],
 [63,64,40,3,150],[64,65,80,8,600],
 [66,67,40,3,150],[67,68,80,8,600],
 [69,70,40,3,150],[70,71,80,8,600],
 [72,73,50,4,250],[74,75,40,3,150],[75,76,80,8,600],
 [77,78,60,5,350],[79,80,60,5,350],[81,82,50,4,250],
 [84,85,50,4,250],[86,87,55,5,300],[88,89,60,5,350],
 [90,91,60,5,350],[92,93,40,3,150],[93,94,80,8,600],
 [96,97,50,4,250],[98,99,50,4,250],[100,101,50,4,250],
 [102,103,65,6,400],[104,105,50,4,250],[109,110,60,5,350],
 [111,112,65,6,400],[116,117,50,4,250],[118,119,50,4,250],
 [120,121,65,6,400],[129,130,70,6,450],
 [133,134,60,5,350],[133,135,60,5,350],[133,136,60,5,350],
 [138,139,65,6,400],[140,141,65,6,400],
 [147,148,50,4,250],[148,149,90,9,800],
].map(([from,to,level,region,amount])=>({from,to,level,region,amount}));
export const evolutionOptions = p => EVOLUTIONS.filter(e=>e.from===p.speciesId);
export function familyGrade(id){
 const family=SPECIES.filter(p=>evolutionFamily(p.id)===evolutionFamily(id));
 const total=Math.max(...family.map(p=>Object.values(p.baseStats).reduce((a,b)=>a+b,0)));
 return id===150||total>=600?3:total>=500?2:total>=400?1:0;
}
export const BREAKTHROUGH_COSTS=[
 [10,50,100,200,300,400,500,800,1000,1500],
 [5,10,20,30,50,70,100,150,200,300],
 [1,2,2,3,5,7,9,10,12,15],
 [1,2,3,4,5,6,7,8,9,10],
];
export const breakthroughCost=p=>(p.breakthrough||0)>=10?0:BREAKTHROUGH_COSTS[familyGrade(p.speciesId)][p.breakthrough||0];
export function evolutionMaterials(e) {
 return species(e.to).types.map(name=>{
  const type=EVOLUTION_TYPES.find(t=>t.name===name);
  if(!type)throw new Error(`Unknown evolution type: ${name}`);
  return {id:type.id,name:type.name,amount:e.amount};
 });
}
export function evolutionReady(state,p,e) {
 return p.level>=e.level && state.stage>e.region*20 && evolutionMaterials(e).every(m=>(state.materials[m.id]||0)>=m.amount);
}
export function evolve(state,uid,target) {
 const p=state.inventory.find(p=>p.uid===uid);
 const e=p&&evolutionOptions(p).find(e=>e.to===target);
 if(!e)return '진화할 수 없는 대상이에요.';
 if(!evolutionReady(state,p,e))return '레벨·일반 스테이지·진화 재료 조건을 모두 충족해야 해요.';
 if(state.inventory.some(q=>q.uid!==uid&&q.speciesId===e.to))return '이미 보유한 진화형이에요.';
 recordCollection(state,[e.to]);for(const m of evolutionMaterials(e))state.materials[m.id]-=m.amount;p.speciesId=e.to;
 return null;
}
export function evolutionFamily(id) {
 const parent=EVOLUTIONS.find(e=>e.to===id);
 return parent?evolutionFamily(parent.from):id;
}
export function breakthroughCandidates(state,p) {
 return {length:state.shards?.[evolutionFamily(p.speciesId)]||0};
}
export function breakthrough(state,uid) {
 const p=state.inventory.find(p=>p.uid===uid);
 if(!p)return '포켓몬을 찾을 수 없어요.';
 if((p.breakthrough||0)>=10)return '최대 10돌파에 도달했어요.';
 const family=evolutionFamily(p.speciesId),cost=breakthroughCost(p);
 if((state.shards?.[family]||0)<cost)return '같은 진화 계열의 돌파 조각이 부족해요.';
 state.shards[family]-=cost;p.breakthrough=(p.breakthrough||0)+1;return null;
}
