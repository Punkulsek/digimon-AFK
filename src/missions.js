export function missionPeriods(now=Date.now()){
 const d=new Date(now+9*3600000),day=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return {day,week:d.toISOString().slice(0,10)};
}
export function syncMissions(state,now=Date.now()){
 const {day,week}=missionPeriods(now);state.missionBook ||= {total:0,challenge:0};
 for(const [key,period] of [['daily',day],['weekly',week]])if(state.missionBook[key]?.period!==period)state.missionBook[key]={period,kills:0,claimed:false};
 return state.missionBook;
}
export function recordMissionKill(state){const book=syncMissions(state);state.missionKills=(state.missionKills||0)+1;book.total++;book.daily.kills++;book.weekly.kills++;return 0;}
export function missionInfo(state,tab){const b=syncMissions(state);
 if(tab==='repeat')return {title:'포켓몬 100마리 처치',count:state.missionKills||0,target:100,reward:Math.floor((state.missionKills||0)/100)*5,ready:(state.missionKills||0)>=100};
 if(tab==='challenge'){const target=(b.challenge+1)*1000;return {title:`누적 포켓몬 ${target.toLocaleString()}마리 처치`,count:b.total,target,reward:100,ready:b.total>=target};}
 const target=tab==='daily'?100:500,reward=tab==='daily'?20:100,v=b[tab];return {title:`포켓몬 ${target}마리 처치`,count:v.kills,target,reward,ready:v.kills>=target&&!v.claimed,claimed:v.claimed};
}
export function claimMission(state,tab){if(!['daily','weekly','challenge','repeat'].includes(tab))return 0;const info=missionInfo(state,tab);if(!info.ready)return 0;
 if(tab==='repeat'){const count=Math.floor(state.missionKills/100);state.missionKills%=100;state.missionsCompleted=(state.missionsCompleted||0)+count;}
 else if(tab==='challenge')state.missionBook.challenge++;else state.missionBook[tab].claimed=true;
 state.pokeballs=(state.pokeballs||0)+info.reward;return info.reward;
}
export function summonPayment(state,count){return (state.pokeballs||0)>=count?{balls:count,gems:0}:{balls:0,gems:count*100};}
