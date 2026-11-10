import {EVOLUTION_TYPES} from './dungeon-config.js';

// Visual mapping only. Encounter, reward and progression data stay independent.
const regionFloors=['moss','fossil','sand','water','ship','metal','stone','temple','metal','moss','metal','moss','metal','ice','mansion','basalt','sandstone','stone','league','amethyst'];
const typeFloors=['sand','basalt','water','moss','metal','ice','wood','temple','sandstone','stone','amethyst','moss','stone','temple','amethyst','temple','metal','fairy'];
export const regionScenery=index=>({atlas:Math.floor(index/4)+1,row:index%4,rows:4,floor:regionFloors[index]||'sand'});
export function dungeonScenery(id){
  const index=EVOLUTION_TYPES.findIndex(t=>id===`evolution-${t.id}`);
  if(index>=0)return {atlas:Math.floor(index/4)+1,row:index%4,rows:4,floor:typeFloors[index]};
  return {coin:{atlas:5,row:2,rows:4,floor:'sandstone'},candy:{atlas:5,row:3,rows:4,floor:'moss'},rune:{atlas:'rune',row:0,rows:1,floor:'amethyst'},tower:{atlas:6,row:1,rows:2,floor:'wood'}}[id]||null;
}
export const panoramaPosition=art=>`0% ${(art.rows>1?art.row/(art.rows-1)*100:0)}%`;
export const panoramaStyle=art=>`--panorama-rows:${art.rows};background-position:${panoramaPosition(art)}`;
