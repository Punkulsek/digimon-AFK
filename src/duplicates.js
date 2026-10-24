import {evolutionFamily} from './growth.js';
export function mergeDuplicates(state){
 state.shards ||= {};
 const kept=new Map(),aliases=new Map();
 for(const p of state.inventory){const q=kept.get(p.speciesId);if(!q){kept.set(p.speciesId,p);continue;}
 q.level=Math.max(q.level,p.level);q.breakthrough=Math.max(q.breakthrough||0,p.breakthrough||0);
 aliases.set(p.uid,q.uid);const family=evolutionFamily(p.speciesId);state.shards[family]=(state.shards[family]||0)+1;
 }
 state.inventory=[...kept.values()];state.party=[...new Set(state.party.map(id=>aliases.get(id)||id))];
}
