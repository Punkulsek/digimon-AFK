export const DUNGEON_STAGES = 10;
export const EVOLUTION_TYPES = [
  {id:'fire',name:'불꽃',icon:'flame',enemy:58,color:'#e99c72'},
  {id:'water',name:'물',icon:'droplets',enemy:54,color:'#75bde2'},
  {id:'grass',name:'풀',icon:'leaf',enemy:43,color:'#93bc70'},
  {id:'electric',name:'전기',icon:'zap',enemy:25,color:'#e6ca61'},
  {id:'rock',name:'바위',icon:'shield',enemy:95,color:'#b7a28b'},
  {id:'ice',name:'얼음',icon:'snowflake',enemy:87,color:'#9ad6df'},
];
export const DUNGEONS = [
  {id:'coin',name:'포켓코인 던전',reward:'포켓코인',enemy:52,icon:'coins'},
  {id:'candy',name:'이상한사탕 던전',reward:'이상한사탕',enemy:113,icon:'sparkles'},
  ...EVOLUTION_TYPES.map(t=>({...t,id:`evolution-${t.id}`,name:`${t.name}타입 진화재료 던전`,reward:`${t.name} 진화 재료`,material:t.id})),
];
export const dungeonDefaults = () => ({candies:0,materials:Object.fromEntries(EVOLUTION_TYPES.map(t=>[t.id,0])),dungeonClears:Object.fromEntries(DUNGEONS.map(d=>[d.id,0]))});
