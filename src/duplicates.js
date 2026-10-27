import {evolutionFamily,EVOLUTIONS} from './growth.js';
import {summonGrade} from './summoning.js';
export const duplicateKey=p=>`${evolutionFamily(p.speciesId)}:${summonGrade(p.speciesId)}`;
const depth=id=>{const parent=EVOLUTIONS.find(e=>e.to===id);return parent?1+depth(parent.from):0;};
export function mergeDuplicates(state){
 state.shards ||= {};
 const groups=new Map(),aliases=new Map();
 for(const p of state.inventory){const key=duplicateKey(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 state.inventory=[...groups.values()].map(group=>{
  // Preserve the most evolved individual and its identity when repairing old saves.
  const kept=[...group].sort((a,b)=>depth(b.speciesId)-depth(a.speciesId))[0];
  for(const p of group){if(p===kept)continue;
   kept.level=Math.max(kept.level,p.level);kept.breakthrough=Math.max(kept.breakthrough||0,p.breakthrough||0);
   aliases.set(p.uid,kept.uid);const family=evolutionFamily(p.speciesId);state.shards[family]=(state.shards[family]||0)+1;
  }return kept;
 });
 const remap=team=>[...new Set(team.map(id=>aliases.get(id)||id))];
 state.party=remap(state.party);
 if(Array.isArray(state.partyPresets))state.partyPresets=state.partyPresets.map(team=>Array.isArray(team)?remap(team):[]);
}
