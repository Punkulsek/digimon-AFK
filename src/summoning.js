import {SPECIES} from './data.js';
import {evolutionFamily,familyGrade} from './growth.js';
export const SUMMON_THRESHOLDS=[0,100,350,850,1850,3850,6850,10850,16850,26850];
export const SUMMON_RATES=[[100,0,0,0],[99.5,.5,0,0],[98.5,1.5,0,0],[97.4,2,.6,0],[96.8,2.5,.7,0],[96.19,3,.8,.01],[95.08,4,.9,.02],[93.97,5,1,.03],[92.86,6,1.1,.04],[91.75,7,1.2,.05]];
export const SUMMON_GRADES=['R','SR','SSR','SSR+'];
export const summonLevel=n=>SUMMON_THRESHOLDS.filter(t=>n>=t).length;
export const summonGrade=familyGrade;
export const SUMMON_POOLS=SUMMON_GRADES.map((_,g)=>SPECIES.filter(p=>evolutionFamily(p.id)===p.id&&summonGrade(p.id)===g));
