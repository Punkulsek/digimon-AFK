import eggs from './generated/egg-groups.json' with {type:'json'};
const group={1:'관통',2:'수호',3:'속공',4:'속공',5:'급소',6:'마력',7:'침식',8:'마력',9:'수호',10:'수호',11:'침식',12:'급소',13:'초월',14:'관통',15:'초월'};
export const SYNERGIES={
 속공:{icon:'⚡',labels:['공속 +6%','공속 +12%','공속 +20%'],values:[{attackSpeed:6},{attackSpeed:12},{attackSpeed:20}]},
 관통:{icon:'➶',labels:['방어 관통 +6%','방어 관통 +12%','방어 관통 +20%'],values:[{penetration:6},{penetration:12},{penetration:20}]},
 수호:{icon:'🛡',labels:['피해 감소 +4%','피해 감소 +7%','피해 감소 +12%'],values:[{damageReduction:4},{damageReduction:7},{damageReduction:12}]},
 마력:{icon:'✦',labels:['스킬 가속 +5% · 증폭 +6%','스킬 가속 +10% · 증폭 +12%','스킬 가속 +18% · 증폭 +22%'],values:[{skillHaste:5,skillAmplification:6},{skillHaste:10,skillAmplification:12},{skillHaste:18,skillAmplification:22}]},
 침식:{icon:'☠',labels:['상태이상 확률 +5%p · 지속 피해 +10%','상태이상 확률 +10%p · 지속 피해 +20%','상태이상 확률 +15%p · 지속 피해 +35%'],values:[{statusChance:5,statusDamage:10},{statusChance:10,statusDamage:20},{statusChance:15,statusDamage:35}]},
 급소:{icon:'✹',labels:['급소 확률 +5%p · 피해 +10%p','급소 확률 +10%p · 피해 +20%p','급소 확률 +18%p · 피해 +35%p'],values:[{critChance:5,critDamage:10},{critChance:10,critDamage:20},{critChance:18,critDamage:35}]},
 초월:{icon:'◆',labels:['공격·방어·체력 +4%','공격·방어·체력 +8%','공격·방어·체력 +12%'],values:[{core:4},{core:8},{core:12}]}
};
export const speciesSynergies=id=>[...new Set((eggs[id]?.length?eggs[id]:[15]).map(g=>group[g]||'초월'))];
export function partySynergies(state){const counts=Object.fromEntries(Object.keys(SYNERGIES).map(k=>[k,0]));for(const uid of new Set(state?.party||[])){const p=state.inventory.find(p=>p.uid===uid);if(p)for(const key of speciesSynergies(p.speciesId))counts[key]++;}return Object.entries(counts).map(([key,count])=>({key,count,tier:count>=5?5:count>=3?3:count>=2?2:0,index:count>=5?2:count>=3?1:count>=2?0:-1}));}
export function applySynergies(stats,state){const out={...stats};for(const s of partySynergies(state)){if(s.index<0)continue;for(const [key,v] of Object.entries(SYNERGIES[s.key].values[s.index])){if(key==='core')for(const k of ['hp','atk','def'])out[k]*=1+v/100;else if(key==='attackSpeed')out[key]*=1+v/100;else out[key]=(out[key]||0)+v;}}return out;}
