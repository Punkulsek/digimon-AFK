import {writeFile} from 'node:fs/promises';
import {initialState,Battle} from '../src/game.js';
import {stageEnemy,regionForStage} from '../src/stages.js';
export const builds=[
 {name:'시작 파티 Lv.1 · 0돌파',ids:[1,4,7,25,39],level:1,stars:0},
 {name:'기본형 Lv.10 · 0돌파',ids:[1,4,7,25,39],level:10,stars:0},
 {name:'기본형 Lv.40 · 0돌파',ids:[1,4,7,25,39],level:40,stars:0},
 {name:'중간 진화 Lv.60 · 3돌파',ids:[2,5,8,26,40],level:60,stars:3},
 {name:'최종 진화 Lv.100 · 0돌파',ids:[3,6,9,26,40],level:100,stars:0},
 {name:'최종 진화 Lv.100 · 5돌파',ids:[3,6,9,26,40],level:100,stars:5},
 {name:'최종 진화 Lv.100 · 10돌파',ids:[3,6,9,26,40],level:100,stars:10},
];
export function simulate(build,stage,offset=0,boss=true){
 const s=initialState();s.stage=stage;s.kills=10;s.autoBoss=false;
 s.inventory.slice(0,5).forEach((p,j)=>{p.speciesId=build.ids[j];p.level=build.level;p.breakthrough=build.stars;});
 const battle=new Battle(s);battle.turn=offset;if(boss)battle.challenge();
 for(let t=1;t<=120;t++){
  const events=battle.tick();
  if(events.some(e=>e.type==='defeat'))return {won:false,turns:t};
  if(events.some(e=>e.type==='reward'))return {won:true,turns:t};
 }
 return {won:false,turns:120};
}
if(process.argv[1]?.endsWith('simulate-balance.mjs')) {
 const stages=[1,10,20,60,100,160,200,240,300,360,400];
 let report='# 전투 밸런스 시뮬레이션\n\n실제 Battle 엔진, 5마리 편성, 보스 시작 시 체력 회복, 치명타·공격 순서 10개 시작 위치를 비교했습니다. 수치는 승리 횟수/10 및 승리 시 턴 범위입니다. 재료 획득에 걸리는 실제 플레이 시간은 포함하지 않습니다.\n\n';
 report+='| 파티 |'+stages.join('|')+'|\n|---|'+stages.map(()=>'---').join('|')+'|\n';
 for(const build of builds){
  const cells=stages.map(stage=>{
   const wins=Array.from({length:10},(_,n)=>simulate(build,stage,n)).filter(r=>r.won);
   return wins.length?`${wins.length}/10 (${Math.min(...wins.map(r=>r.turns))}~${Math.max(...wins.map(r=>r.turns))}턴)`:'0/10';
  });report+=`|${build.name}|${cells.join('|')}|\n`;
 }
 report+='\n## 지역 최종 보스\n\n| 지역 | 스테이지 | HP | 공격력 | 방어력 |\n|---|---|---|---|---|\n';
 for(let stage=20;stage<=400;stage+=20){const e=stageEnemy(stage,true);report+=`|${regionForStage(stage).name}|${stage/20}-20|${e.hp}|${e.atk}|${e.def}|\n`;}
 await writeFile(new URL('../docs/balance-report.md',import.meta.url),report);
 console.log(report);
}
