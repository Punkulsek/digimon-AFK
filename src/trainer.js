import {species} from './data.js';
import {MAX_STAGE} from './stages.js';
import {EVOLUTION_TYPES} from './dungeon-config.js';
import {recordCollection} from './collection-record.js';

export const TRAINER_MAX_LEVEL=Math.ceil(MAX_STAGE/5);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function trainerId(){
  const bytes=new Uint8Array(12);
  if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  return 'PK-'+Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
}
export function createTrainer(){return {id:trainerId(),nickname:'새싹 트레이너',avatarSpeciesId:1};}
export function nicknameError(name){
  if(typeof name!=='string'||!name.trim())return '닉네임을 입력해 주세요.';
  if([...name.trim()].length>16)return '닉네임은 16자까지 입력할 수 있어요.';
  if(/[<>\p{Cc}\p{Cf}]/u.test(name))return '사용할 수 없는 문자가 포함되어 있어요.';
  return null;
}
// Profile metadata is repaired independently: old saves keep all game progress.
export function normalizeTrainer(state){
  recordCollection(state);
  const raw=state.trainer&&typeof state.trainer==='object'&&!Array.isArray(state.trainer)?state.trainer:{};
  state.trainer={
    id:typeof raw.id==='string'&&/^PK-[A-Z2-9]{12}$/.test(raw.id)?raw.id:trainerId(),
    nickname:nicknameError(raw.nickname)?'새싹 트레이너':raw.nickname.trim(),
    avatarSpeciesId:state.discovered.includes(raw.avatarSpeciesId)&&species(raw.avatarSpeciesId)?raw.avatarSpeciesId:state.discovered[0],
  };
  return state.trainer;
}
export function trainerProgress(state){
  const completed=Math.min(MAX_STAGE,state.campaignCleared?MAX_STAGE:Math.max(0,state.stage-1));
  const level=Math.min(TRAINER_MAX_LEVEL,Math.floor(completed/5)+1),isMax=level===TRAINER_MAX_LEVEL;
  return {level,completed,progress:isMax?5:completed%5,required:5,isMax};
}
export function unlockedPortraits(state){return [...new Set(state.discovered||[])].filter(id=>species(id)).sort((a,b)=>a-b);}
export function setTrainerAvatar(state,id){
  if(!unlockedPortraits(state).includes(id))return false;
  normalizeTrainer(state).avatarSpeciesId=id;return true;
}
export function renameTrainer(state,name){
  const error=nicknameError(name);if(error)return error;
  normalizeTrainer(state).nickname=name.trim();return null;
}
export function trainerRecords(state){
  const progress=trainerProgress(state),clears=state.dungeonClears||{};
  return [
    {id:'stages',icon:'map',label:'스테이지 돌파',value:`${progress.completed.toLocaleString('ko-KR')} / ${MAX_STAGE}`},
    {id:'pokemon',icon:'users',label:'보유 포켓몬 수',value:`${state.inventory.length.toLocaleString('ko-KR')}마리`},
    {id:'breakthrough',icon:'star',label:'10돌 포켓몬 수',value:`${state.inventory.filter(p=>p.breakthrough===10).length}마리`},
    {id:'coin',icon:'coins',label:'포켓코인 던전 돌파 기록',value:`${clears.coin||0}단계`},
    {id:'candy',icon:'gift',label:'이상한사탕 던전 돌파 기록',value:`${clears.candy||0}단계`},
    {id:'types',icon:'flame',label:'타입 던전 돌파 기록',value:`최고 ${Math.max(0,...EVOLUTION_TYPES.map(t=>clears[`evolution-${t.id}`]||0))}단계`},
    {id:'tower',icon:'trophy',label:'모다피의 탑 최고 도달 층',value:`${Math.min(200,(clears.tower||0)+1)}층`,note:`${clears.tower||0}층 클리어`},
    {id:'summons',icon:'circle',label:'총 소환 횟수',value:`${state.summons.toLocaleString('ko-KR')}회`},
  ];
}
