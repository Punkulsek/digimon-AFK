export const DUNGEON_STAGES = 10;
export const EVOLUTION_TYPES = [
  {id:'normal',name:'노말',icon:'circle',enemy:52,color:'#c6c3af'},
  {id:'fire',name:'불꽃',icon:'flame',enemy:58,color:'#ed9364'},
  {id:'water',name:'물',icon:'droplets',enemy:54,color:'#75bde2'},
  {id:'grass',name:'풀',icon:'leaf',enemy:43,color:'#93bc70'},
  {id:'electric',name:'전기',icon:'zap',enemy:25,color:'#e6ca61'},
  {id:'ice',name:'얼음',icon:'snowflake',enemy:87,color:'#9ad6df'},
  {id:'fighting',name:'격투',icon:'swords',enemy:67,color:'#df8f73'},
  {id:'poison',name:'독',icon:'sparkles',enemy:24,color:'#bf87cf'},
  {id:'ground',name:'땅',icon:'map',enemy:51,color:'#d5b370'},
  {id:'flying',name:'비행',icon:'wind',enemy:17,color:'#b0b5eb'},
  {id:'psychic',name:'에스퍼',icon:'star',enemy:64,color:'#eb8eb9'},
  {id:'bug',name:'벌레',icon:'leaf',enemy:123,color:'#bed26e'},
  {id:'rock',name:'바위',icon:'shield',enemy:95,color:'#b7a28b'},
  {id:'ghost',name:'고스트',icon:'moon',enemy:93,color:'#a397cf'},
  {id:'dragon',name:'드래곤',icon:'flame',enemy:148,color:'#958de4'},
  {id:'dark',name:'악',icon:'moon',enemy:53,color:'#9b98b0'},
  {id:'steel',name:'강철',icon:'shield',enemy:82,color:'#b9c6d3'},
  {id:'fairy',name:'페어리',icon:'heart',enemy:35,color:'#f2b3d6'},
].map((type,index)=>({...type,art:{atlas:Math.floor(index/6)+1,column:index%2,row:Math.floor(index%6/2)}}));
export const DUNGEONS = [
  {id:'coin',name:'포켓코인 던전',reward:'포켓코인',enemy:52,icon:'coins'},
  {id:'candy',name:'이상한사탕 던전',reward:'이상한사탕',enemy:113,icon:'sparkles'},
  ...EVOLUTION_TYPES.map(t=>({...t,id:`evolution-${t.id}`,name:`${t.name}타입 진화재료 던전`,reward:`${t.name} 진화 재료`,material:t.id})),
];
export const dungeonDefaults = () => ({candies:0,materials:Object.fromEntries(EVOLUTION_TYPES.map(t=>[t.id,0])),dungeonClears:Object.fromEntries(DUNGEONS.map(d=>[d.id,0]))});
