import {EVOLUTION_TYPES} from './dungeon-config.js';
export function typeIcon(idOrName){
 const type=EVOLUTION_TYPES.find(t=>t.id===idOrName||t.name===idOrName);
 return type?`<span class="pokemon-type-icon" data-type="${type.id}" role="img" aria-label="${type.name}타입" title="${type.name}타입"></span>`:'';
}
export const typeIcons=types=>types.map(typeIcon).join('');
