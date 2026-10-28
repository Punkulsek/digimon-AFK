export function recordMissionKill(state){
 state.missionKills=(state.missionKills||0)+1;
 if(state.missionKills>=50){const rewards=Math.floor(state.missionKills/50);state.missionKills%=50;state.pokeballs=(state.pokeballs||0)+rewards*10;state.missionsCompleted=(state.missionsCompleted||0)+rewards;return rewards*10;}return 0;
}
export function summonPayment(state,count){const balls=Math.min(count,state.pokeballs||0);return {balls,gems:(count-balls)*100};}
