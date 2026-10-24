export const STAGES_PER_REGION = 20;
export const STAGE_KILLS = 10;
export const BOSS_TURN_LIMIT = 60;
// Region identity and encounters are independent of balance and approved art.
export const STAGE_REGIONS = [
 ['상록숲',[10,13,16,25],12,15],
 ['회색체육관',[27,50,74],75,95],
 ['달맞이산',[35,41,46,74],42,36],
 ['블루체육관',[54,60,118],61,121],
 ['상트안느호',[19,66,72,98],67,99],
 ['갈색체육관',[25,81,100],101,26],
 ['바위터널',[41,66,74,95],75,105],
 ['포켓몬타워',[92,93,104],93,94],
 ['로켓단 아지트',[19,23,88,109],24,115],
 ['무지개체육관',[43,69,102],70,45],
 ['실프주식회사',[64,81,88,97],82,31],
 ['사파리존',[48,84,111,123],115,128],
 ['무인발전소',[25,81,100,125],82,145],
 ['쌍둥이섬',[79,86,90,124],87,144],
 ['포켓몬저택',[58,77,88,109],89,110],
 ['홍련체육관',[37,58,77,126],78,59],
 ['상록체육관',[28,51,95,111],112,34],
 ['챔피언로드',[67,75,95,105],68,146],
 ['석영고원',[91,94,130,148],149,9],
 ['블루시티 동굴',[42,64,82,112],132,150],
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
export const attackDamage = (atk,def=0,crit=false) => Math.max(1,Math.round(atk*(crit?1.8:1)*400/(400+def)));
export function stageGold(stage,boss=false) {
 const tier=boss?bossTier(stage):'wild';
 const multiplier=tier==='final'?1.5:tier==='mid'?1.2:1;
 return Math.round((boss?180:24)*(1+(stageNumber(stage)-1)*.18)*multiplier);
}
