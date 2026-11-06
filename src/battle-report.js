// Actual HP changes only: excludes overkill, overheal and shield absorption.
export function recordBattleEvent(battle,event){
 if(!['damage','heal'].includes(event.type))return;
 battle.report ||= {};
 const ally=uid=>battle.allies.find(p=>p.uid===uid);
 const row=p=>battle.report[p.uid] ||= {uid:p.uid,speciesId:p.speciesId,damage:0,taken:0,healing:0};
 const source=ally(event.uid),target=ally(event.targetUid);
 if(event.type==='damage'){
  const value=Math.max(0,Number(event.damage)||0);
  if(source&&!target&&!event.recoil)row(source).damage+=value;
  if(target)row(target).taken+=value;
 }else if(target)row(target).healing+=Math.max(0,Number(event.amount)||0);
}
export function battleReportRows(battle){
 const rows={...battle.report};
 for(const p of battle.allies)rows[p.uid] ||= {uid:p.uid,speciesId:p.speciesId,damage:0,taken:0,healing:0};
 return Object.values(rows);
}
