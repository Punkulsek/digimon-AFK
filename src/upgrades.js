export const UPGRADE_KEYS=['atk','def','hp'];
export const upgradeDefaults=()=>({atk:0,def:0,hp:0});
export function upgradeCost(level){
 if(!Number.isSafeInteger(level)||level<0)return Infinity;
 const cost=Math.ceil(100*1.08**level);
 return Number.isSafeInteger(cost)?cost:Infinity;
}
export function upgradeQuote(state,key,count){
 if(!UPGRADE_KEYS.includes(key)||![1,10,100,'MAX'].includes(count))return {levels:0,cost:Infinity};
 const level=state.upgrades?.[key]||0;let cost=0,levels=0;
 while(levels<(count==='MAX'?1000:count)){
  const next=upgradeCost(level+levels);
  if(!Number.isSafeInteger(cost+next))return count==='MAX'?{levels,cost}:{levels:0,cost:Infinity};
  if(count==='MAX'&&cost+next>state.gold)break;
  cost+=next;levels++;
 }
 return {levels,cost};
}
export function buyUpgrade(state,key,count){
 const quote=upgradeQuote(state,key,count);
 if(!quote.levels||quote.cost>state.gold)return '포켓코인이 부족하거나 강화 가능한 범위를 넘었어요.';
 state.upgrades ||= upgradeDefaults();state.gold-=quote.cost;state.upgrades[key]+=quote.levels;return null;
}
