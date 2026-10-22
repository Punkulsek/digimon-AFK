export const RARITIES = [
 {name:'일반',color:'#87938d',chance:50}, {name:'고급',color:'#57a780',chance:28},
 {name:'희귀',color:'#559bc4',chance:15}, {name:'영웅',color:'#a078c0',chance:6}, {name:'전설',color:'#d6ab4e',chance:1}
];
// 사용자 제공 도트 파일을 public/pokemon에 넣거나 sprite 경로를 변경하세요.
export const SPECIES = [
 [1,'이상해씨',2,'풀','leaf',72,12], [4,'파이리',2,'불꽃','flame',60,15],
 [7,'꼬부기',2,'물','droplets',85,10], [25,'피카츄',3,'전기','zap',65,18],
 [39,'푸린',1,'페어리','sparkles',82,9], [133,'이브이',2,'노말','star',70,13],
 [10,'캐터피',0,'벌레','leaf',45,7], [16,'구구',0,'비행','wind',48,8],
 [19,'꼬렛',0,'노말','star',44,9], [43,'뚜벅쵸',1,'풀','leaf',65,10],
 [54,'고라파덕',1,'물','droplets',70,11], [58,'가디',2,'불꽃','flame',75,14],
 [63,'캐이시',2,'에스퍼','sparkles',50,18], [94,'팬텀',3,'고스트','moon',90,23],
 [149,'망나뇽',3,'드래곤','wind',110,22], [144,'프리져',4,'얼음','snowflake',130,28],
 [145,'썬더',4,'전기','zap',115,32], [146,'파이어',4,'불꽃','flame',120,30],
 [150,'뮤츠',4,'에스퍼','sparkles',125,35]
].map(([id,name,rarity,type,icon,hp,atk])=>({id,name,rarity,type,icon,hp,atk,sprite:`/pokemon/${id}.png`}));
export const species = id => SPECIES.find(p=>p.id===id);
export const REGIONS = ['상록숲','달맞이산','블루시티 해안','무지개 초원'];
export const stageLabel = stage => `${Math.floor((stage-1)/20)+1}-${(stage-1)%20+1}`;
export const regionName = stage => REGIONS[Math.floor((stage-1)/20)%REGIONS.length];
