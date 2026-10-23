import {DUNGEONS,DUNGEON_STAGES} from './dungeon-config.js';
import {stats} from './game.js';
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
// A run owns its combat snapshot. It never mutates the overworld Battle.
export class DungeonRun {
  constructor(state,id,stage) {
    if(!canEnterDungeon(state,id,stage)) throw new Error('아직 개방되지 않은 던전입니다.');
    this.info=dungeonInfo(id,stage);this.state=state;this.turn=0;this.status='fighting';
    this.allies=state.party.map(uid=>{const p=state.inventory.find(p=>p.uid===uid);const s=stats(p);return {uid,speciesId:p.speciesId,...s,maxHp:s.hp};});
    this.enemy={hp:this.info.hp,maxHp:this.info.hp,atk:this.info.atk};this.log='탐험대가 던전에 입장했어요.';
  }
  tick() {
    if(this.status!=='fighting') return false;
    const alive=this.allies.filter(a=>a.hp>0);
    if(!alive.length){this.status='lost';return true;}
    const attacker=alive[this.turn%alive.length];this.turn++;
    const damage=Math.round(attacker.atk*(this.turn%7===0?1.8:1));
    this.enemy.hp=Math.max(0,this.enemy.hp-damage);this.log=`${damage} 피해 · ${this.turn} / 120턴`;
    if(!this.enemy.hp){
      this.status='won';
      if(this.info.id==='coin')this.state.gold+=this.info.amount;
      else if(this.info.id==='candy')this.state.candies+=this.info.amount;
      else this.state.materials[this.info.material]+=this.info.amount;
      this.state.dungeonClears[this.info.id]=Math.max(this.state.dungeonClears[this.info.id],this.info.stage);
      return true;
    }
    if(this.turn%2===0){const target=alive[Math.floor(this.turn/2)%alive.length];target.hp=Math.max(0,target.hp-this.enemy.atk);}
    if(this.turn>=120 || this.allies.every(a=>a.hp<=0))this.status='lost';
    return this.status!=='fighting';
  }
}
