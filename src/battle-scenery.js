import {EVOLUTION_TYPES} from './dungeon-config.js';

// Visual mapping only. Encounter, reward and progression data stay independent.
const regionFloors=['sand','sand','stone','stone','wood','metal','stone','stone','metal','sand','metal','sand','metal','stone','wood','metal','stone','stone','stone','stone'];
const typeFloors=['sand','stone','stone','sand','metal','stone','wood','stone','sand','stone','stone','sand','stone','stone','stone','metal','metal','stone'];
export const regionScenery=index=>({atlas:Math.floor(index/4)+1,row:index%4,rows:4,floor:regionFloors[index]||'sand'});
export function dungeonScenery(id){
  const index=EVOLUTION_TYPES.findIndex(t=>id===`evolution-${t.id}`);
  if(index>=0)return {atlas:Math.floor(index/4)+1,row:index%4,rows:4,floor:typeFloors[index]};
  return {coin:{atlas:5,row:2,rows:4,floor:'metal'},candy:{atlas:5,row:3,rows:4,floor:'stone'},rune:{atlas:6,row:0,rows:2,floor:'stone'},tower:{atlas:6,row:1,rows:2,floor:'wood'}}[id]||null;
}
export const panoramaPosition=art=>`0% ${art.row/(art.rows-1)*100}%`;
export const panoramaStyle=art=>`--panorama-rows:${art.rows};background-position:${panoramaPosition(art)}`;
