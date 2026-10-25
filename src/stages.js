export const STAGES_PER_REGION = 20;
export const STAGE_KILLS = 10;
export const BOSS_TURN_LIMIT = 60;
// Region identity and encounters are independent of balance and approved art.
export const STAGE_REGIONS = [
 ['상록숲',[10, 13, 11, 14, 25],12,12],
 ['회색체육관',[74, 95, 27],75,76],
 ['달맞이산',[41, 74, 46, 35],42,36],
 ['블루체육관',[120, 54, 118, 116],61,121],
 ['상트안느호',[19, 16, 58, 29, 32],67,20],
 ['갈색체육관',[100, 81, 25],101,26],
 ['바위터널',[41, 74, 66, 95],75,76],
 ['포켓몬타워',[92, 93, 104],93,105],
 ['로켓단 아지트',[23, 109, 88, 41],24,34],
 ['무지개체육관',[43, 69, 44, 70],70,45],
 ['실프주식회사',[109, 88, 100, 66],82,31],
 ['사파리존',[111, 102, 46, 84, 29, 32],115,115],
 ['무인발전소',[81, 100, 82, 101],82,145],
 ['쌍둥이섬',[86, 90, 79, 41],87,144],
 ['포켓몬저택',[88, 109, 58, 77, 132],89,89],
 ['홍련체육관',[58, 37, 77, 126],78,59],
 ['상록체육관',[111, 33, 30, 51],112,34],
 ['챔피언로드',[66, 67, 95, 42],68,68],
 ['석영고원',[87, 93, 124, 148],149,149],
 ['블루시티 동굴',[42, 64, 132, 48, 112],132,150],
].map(([name,enemies,midBoss,finalBoss],index)=>({id:index+1,name,enemies,midBoss,finalBoss,art:{atlas:Math.floor(index/4)+1,column:index%2,row:Math.floor(index%4/2)}}));
export const MAX_STAGE = STAGE_REGIONS.length * STAGES_PER_REGION;
export const stageNumber = stage => Math.max(1,Math.min(MAX_STAGE,stage));
export const regionIndex = stage => Math.floor((stageNumber(stage)-1)/STAGES_PER_REGION);
export const localStage = stage => (stageNumber(stage)-1)%STAGES_PER_REGION+1;
export const regionForStage = stage => STAGE_REGIONS[regionIndex(stage)];
export const bossTier = stage => localStage(stage)===20?'final':localStage(stage)===10?'mid':'normal';
export const BOSS_NAMES = {normal:'스테이지 보스',mid:'중간 보스',final:'지역 최종 보스'};
const BOSS_MULTIPLIERS = {normal:[2.3,1.5,1.1],mid:[3.1,1.8,1.2],final:[4,2.1,1.35]};
export function stageEnemy(stage,boss=false,kills=0) {
 const n=stageNumber(stage)-1,region=regionForStage(stage),chapter=regionIndex(stage);
 const tier=boss?bossTier(stage):'wild', multipliers=boss?BOSS_MULTIPLIERS[tier]:[1,1,1];
 // Early HP growth ~3.7%, ATK ~2.7%; both taper continuously over 400 stages.
 // Region boundaries add only 1.5% HP / 1% ATK, avoiding exponential late-game walls.
 const hp=Math.round(55*(1+n/60)**2.2*1.015**chapter*multipliers[0]);
 const atk=Math.round(4*(1+n/100)**2.7*1.01**chapter*multipliers[1]);
 const def=Math.round(n*.25*multipliers[2]);
 const speciesId=boss?(tier==='final'?region.finalBoss:tier==='mid'?region.midBoss:region.enemies[(localStage(stage)-1)%region.enemies.length]):region.enemies[(localStage(stage)+kills-1)%region.enemies.length];
 return {speciesId,hp,maxHp:hp,atk,def,tier};
}
export const attackDamage = (atk,def=0,crit=false) => Math.max(1,Math.round(atk*(crit?1.5:1)*400/(400+def)));
export function stageGold(stage,boss=false) {
 const tier=boss?bossTier(stage):'wild';
 const multiplier=tier==='final'?1.5:tier==='mid'?1.2:1;
 return Math.round((boss?180:24)*(1+(stageNumber(stage)-1)*.18)*multiplier);
}
