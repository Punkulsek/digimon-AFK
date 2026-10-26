// Modern official 18-type chart: attacking type -> [super effective, resisted, immune].
const rows={
 노말:['','바위 강철','고스트'],불꽃:['풀 얼음 벌레 강철','불꽃 물 바위 드래곤',''],물:['불꽃 땅 바위','물 풀 드래곤',''],전기:['물 비행','전기 풀 드래곤','땅'],풀:['물 땅 바위','불꽃 풀 독 비행 벌레 드래곤 강철',''],얼음:['풀 땅 비행 드래곤','불꽃 물 얼음 강철',''],격투:['노말 얼음 바위 악 강철','독 비행 에스퍼 벌레 페어리','고스트'],독:['풀 페어리','독 땅 바위 고스트','강철'],땅:['불꽃 전기 독 바위 강철','풀 벌레','비행'],비행:['풀 격투 벌레','전기 바위 강철',''],에스퍼:['격투 독','에스퍼 강철','악'],벌레:['풀 에스퍼 악','불꽃 격투 독 비행 고스트 강철 페어리',''],바위:['불꽃 얼음 비행 벌레','격투 땅 강철',''],고스트:['에스퍼 고스트','악','노말'],드래곤:['드래곤','강철','페어리'],악:['에스퍼 고스트','격투 악 페어리',''],강철:['얼음 바위 페어리','불꽃 물 전기 강철',''],페어리:['격투 드래곤 악','불꽃 독 강철','']
};
export const TYPES=Object.freeze(Object.keys(rows));
export const TYPE_CHART=Object.freeze(Object.fromEntries(TYPES.map(a=>[a,Object.freeze(Object.fromEntries(TYPES.map(d=>[d,rows[a][2].split(' ').includes(d)?0:rows[a][0].split(' ').includes(d)?2:rows[a][1].split(' ').includes(d)?.5:1])))])));
export function typeEffectiveness(attackType,defenderTypes=[]){return [...new Set(defenderTypes)].reduce((v,t)=>v*(TYPE_CHART[attackType]?.[t]??1),1);}
// No STAB: the attacker's other types never enter this calculation.
