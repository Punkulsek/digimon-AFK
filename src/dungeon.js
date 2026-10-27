import {DUNGEONS,DUNGEON_STAGES} from './dungeon-config.js';
export function dungeonInfo(id,stage) {
  const definition=DUNGEONS.find(d=>d.id===id);
  if(!definition || !Number.isInteger(stage) || stage<1 || stage>DUNGEON_STAGES) return null;
  // Preserve early progression, then taper the exponential for a 100-stage campaign.
  const growth=stage<=10?stage-1:9+24*Math.log1p((stage-10)/24);
  const hp=Math.round(170*1.42**growth), atk=Math.round(8*1.32**growth);
  const amount=id==='coin'?500*stage:id==='candy'?Math.round(100+8*(stage-1)+2*(stage-1)**2):3*stage;
  return {...definition,stage,hp,atk,power:hp+atk*5,amount};
}
export function canEnterDungeon(state,id,stage) {
  return !!dungeonInfo(id,stage) && stage <= (state.dungeonClears[id]||0)+1;
}
