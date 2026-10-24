import {SPECIES} from './data.js';
import {evolutionFamily} from './growth.js';
export const SUMMON_THRESHOLDS=[0,100,350,850,1850,3850,6850,10850,16850,26850];
export const SUMMON_RATES=[[70,25,4.9,.1],[68.5,26,5.3,.2],[67,27,5.7,.3],[65.5,28,6.1,.4],[64,29,6.5,.5],[62.5,30,6.9,.6],[61,31,7.3,.7],[59.5,32,7.7,.8],[58,33,8.1,.9],[56.5,34,8.5,1]];
export const SUMMON_GRADES=['R','SR','SSR','SSR+'];
export const summonLevel=n=>SUMMON_THRESHOLDS.filter(t=>n>=t).length;
export function summonGrade(id){const family=SPECIES.filter(p=>evolutionFamily(p.id)===evolutionFamily(id));const total=Math.max(...family.map(p=>Object.values(p.baseStats).reduce((a,b)=>a+b,0)));return id===150||total>=600?3:total>=500?2:total>=400?1:0;}
export const SUMMON_POOLS=SUMMON_GRADES.map((_,g)=>SPECIES.filter(p=>evolutionFamily(p.id)===p.id&&summonGrade(p.id)===g));
