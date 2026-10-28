import {DUNGEONS,DUNGEON_STAGES,dungeonLimit} from './dungeon-config.js';
export function dungeonInfo(id,stage) {
  const definition=DUNGEONS.find(d=>d.id===id);
  if(!definition || !Number.isInteger(stage) || stage<1 || stage>dungeonLimit(id)) return null;
  // Preserve early progression, then taper the exponential for a 100-stage campaign.
  const growth=stage<=10?stage-1:9+24*Math.log1p((stage-10)/24);
  const hp=Math.round(170*1.42**growth), atk=Math.round(8*1.32**growth);
  const amount=id==='coin'?500*stage:id==='candy'?Math.round(100+8*(stage-1)+2*(stage-1)**2):3*stage;
  if(id==='tower'){
    const boss=stage%5===0,pool=[16,19,21,23,25,27,35,37,41,43,46,48,52,54,56,58,60,63,66,69,72,74,77,79,81,84,86,88,90,92,96,98,100,102,104,109,111,114,116,118,120,123,125,126,127,128,129,132,133,138,140,147];
    const enemies=Array.from({length:5},(_,n)=>pool[(stage*3+n*7)%pool.length]);
    if(boss)enemies[0]=[68,76,94,130,149,3,6,9][Math.floor(stage/5-1)%8];
    const hp=Math.round(220*(1+(stage-1)*.18)**2*(boss?1.5:1)),atk=Math.round(12*(1+(stage-1)*.1)**1.6*(boss?1.3:1));
    return {...definition,stage,boss,enemies,enemy:enemies[0],hp,atk,power:hp+atk*5,amount:Math.round((500+stage*100)*(boss?2:1))};
  }
  return {...definition,stage,hp,atk,power:hp+atk*5,amount};
}
export function canEnterDungeon(state,id,stage) {
  return !!dungeonInfo(id,stage) && stage <= (state.dungeonClears[id]||0)+1;
}
