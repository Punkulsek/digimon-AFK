export const PRESET_COUNT=5;
export function normalizePresets(state){
 const valid=new Set(state.inventory.map(p=>p.uid));
 const clean=team=>[...new Set(Array.isArray(team)?team:[])].filter(id=>valid.has(id)).slice(0,5);
 state.activePreset=Number.isInteger(state.activePreset)&&state.activePreset>=0&&state.activePreset<PRESET_COUNT?state.activePreset:0;
 state.partyPresets=Array.from({length:PRESET_COUNT},(_,i)=>{
  const team=clean(state.partyPresets?.[i]);return team.length?team:[...state.party];
 });
 state.partyPresets[state.activePreset]=[...state.party];
}
export function selectPreset(state,index){
 if(!Number.isInteger(index)||index<0||index>=PRESET_COUNT)return false;
 normalizePresets(state);
 state.activePreset=index;state.party=[...state.partyPresets[index]];
 return true;
}
