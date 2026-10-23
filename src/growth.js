// Game-specific long-term requirements, not the main-series evolution rules.
// Each row: source, target, level, cleared region, material type, quantity.
export const EVOLUTIONS = [
 [1,2,40,3,'grass',150],[2,3,80,8,'grass',600],
 [4,5,40,3,'fire',150],[5,6,80,8,'fire',600],
 [7,8,40,3,'water',150],[8,9,80,8,'water',600],
 [10,11,30,2,'grass',100],[11,12,65,6,'grass',400],
 [13,14,30,2,'grass',100],[14,15,65,6,'grass',400],
 [16,17,35,3,'grass',120],[17,18,75,7,'grass',500],
 [19,20,45,4,'rock',200],[21,22,45,4,'grass',200],[23,24,45,4,'grass',200],
 [25,26,60,5,'electric',350],[27,28,45,4,'rock',200],
 [29,30,40,3,'rock',150],[30,31,80,8,'rock',600],
 [32,33,40,3,'rock',150],[33,34,80,8,'rock',600],
 [35,36,60,5,'rock',350],[37,38,60,5,'fire',350],[39,40,60,5,'rock',350],
 [41,42,45,4,'grass',200],[43,44,40,3,'grass',150],[44,45,80,8,'grass',600],
 [46,47,45,4,'grass',200],[48,49,50,4,'grass',250],[50,51,45,4,'rock',200],
 [52,53,45,4,'rock',200],[54,55,50,4,'water',250],[56,57,50,4,'rock',250],
 [58,59,65,6,'fire',400],[60,61,40,3,'water',150],[61,62,80,8,'water',600],
 [63,64,40,3,'electric',150],[64,65,80,8,'electric',600],
 [66,67,40,3,'rock',150],[67,68,80,8,'rock',600],
 [69,70,40,3,'grass',150],[70,71,80,8,'grass',600],
 [72,73,50,4,'water',250],[74,75,40,3,'rock',150],[75,76,80,8,'rock',600],
 [77,78,60,5,'fire',350],[79,80,60,5,'water',350],[81,82,50,4,'electric',250],
 [84,85,50,4,'grass',250],[86,87,55,5,'ice',300],[88,89,60,5,'rock',350],
 [90,91,60,5,'ice',350],[92,93,40,3,'electric',150],[93,94,80,8,'electric',600],
 [96,97,50,4,'electric',250],[98,99,50,4,'water',250],[100,101,50,4,'electric',250],
 [102,103,65,6,'grass',400],[104,105,50,4,'rock',250],[109,110,60,5,'rock',350],
 [111,112,65,6,'rock',400],[116,117,50,4,'water',250],[118,119,50,4,'water',250],
 [120,121,65,6,'water',400],[129,130,70,6,'water',450],
 [133,134,60,5,'water',350],[133,135,60,5,'electric',350],[133,136,60,5,'fire',350],
 [138,139,65,6,'rock',400],[140,141,65,6,'rock',400],
 [147,148,50,4,'water',250],[148,149,90,9,'water',800],
].map(([from,to,level,region,material,amount])=>({from,to,level,region,material,amount}));
export const evolutionOptions = p => EVOLUTIONS.filter(e=>e.from===p.speciesId);
export const breakthroughCost = p => (p.breakthrough||0) >= 10 ? 0 : (p.breakthrough||0)+1;
export function evolutionReady(state,p,e) {
 return p.level>=e.level && state.stage>e.region*20 && state.materials[e.material]>=e.amount;
}
export function evolve(state,uid,target) {
 const p=state.inventory.find(p=>p.uid===uid);
 const e=p&&evolutionOptions(p).find(e=>e.to===target);
 if(!e)return '진화할 수 없는 대상이에요.';
 if(!evolutionReady(state,p,e))return '레벨·일반 스테이지·진화 재료 조건을 모두 충족해야 해요.';
 state.materials[e.material]-=e.amount;p.speciesId=e.to;
 return null;
}
export function breakthroughCandidates(state,p) {
 return state.inventory.filter(q=>q.uid!==p.uid&&q.speciesId===p.speciesId&&!state.party.includes(q.uid)&&q.level===1&&!(q.breakthrough||0));
}
export function breakthrough(state,uid,ids) {
 const p=state.inventory.find(p=>p.uid===uid);
 if(!p)return '포켓몬을 찾을 수 없어요.';
 if((p.breakthrough||0)>=10)return '최대 10돌파에 도달했어요.';
 const available=new Set(breakthroughCandidates(state,p).map(q=>q.uid));
 if(!Array.isArray(ids)||ids.length!==breakthroughCost(p)||new Set(ids).size!==ids.length||!ids.every(id=>available.has(id)))return '동일 포켓몬의 미편성 Lv.1·0돌파 카드가 부족하거나 선택이 변경됐어요.';
 const consumed=new Set(ids);state.inventory=state.inventory.filter(q=>!consumed.has(q.uid));p.breakthrough=(p.breakthrough||0)+1;
 return null;
}
