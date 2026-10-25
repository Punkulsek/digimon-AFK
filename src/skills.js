import catalog from './generated/skills.json' with {type:'json'};
// One immutable definition per move name, shared by every assigned species.
export const SKILLS=Object.freeze(Object.fromEntries(Object.entries(catalog.moves).map(([key,value])=>[key,Object.freeze(value)])));
export const POKEMON_SKILLS=Object.freeze(catalog.assignments);
export const skillForSpecies=id=>SKILLS[POKEMON_SKILLS[id]];
