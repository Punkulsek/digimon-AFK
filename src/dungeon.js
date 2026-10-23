import {DUNGEONS,DUNGEON_STAGES} from './dungeon-config.js';
export function dungeonInfo(id,stage) {
  const definition=DUNGEONS.find(d=>d.id===id);
  if(!definition || !Number.isInteger(stage) || stage<1 || stage>DUNGEON_STAGES) return null;
  const hp=Math.round(170*1.42**(stage-1)), atk=Math.round(8*1.32**(stage-1));
  const amount=id==='coin'?500*stage:id==='candy'?10*stage:3*stage;
  return {...definition,stage,hp,atk,power:hp+atk*5,amount};
}
export function canEnterDungeon(state,id,stage) {
  return !!dungeonInfo(id,stage) && stage <= (state.dungeonClears[id]||0)+1;
}
