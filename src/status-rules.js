export const STATUS_LABELS={poison:'독',burn:'화상',shock:'마비',sleep:'잠듦',freeze:'얼음',confusion:'혼란',flinch:'풀죽음',recharge:'반동(휴식)'};
export const STATUS_DESCRIPTIONS={poison:'지속시간 동안 최대 HP의 총 5% 피해(보스 1%). 독·강철 타입 면역.',burn:'공격력 15% 감소 및 지속시간 동안 최대 HP의 총 3% 피해(보스 1%). 불꽃 타입 면역.',shock:'공격속도 20% 감소. 일반 공격·기술 시도 시 25% 확률로 행동 실패. 전기 타입 면역.',sleep:'지속시간 동안 공격·기술·기술 게이지 충전 정지.',freeze:'지속시간 동안 공격·기술·기술 게이지 충전 정지. 불꽃 피해를 받으면 해제. 얼음 타입 면역.',confusion:'일반 공격·기술 시도 시 20% 확률로 공격력 50%의 자해 피해 후 행동 실패.',flinch:'짧은 시간 동안 공격·기술·기술 게이지 충전 정지.',recharge:'강한 기술 사용 후 공격·기술·기술 게이지 충전 정지. HP 반동 피해와는 별개.'};
export function statusImmune(target,key,move){const types=target.types||[];if(key==='poison'&&types.some(t=>['독','강철'].includes(t)))return true;if(key==='burn'&&types.includes('불꽃'))return true;if(key==='shock'&&types.includes('전기'))return true;if(key==='freeze'&&types.includes('얼음'))return true;if(move==='전기자석파'&&types.includes('땅'))return true;if(['독가루','버섯포자'].includes(move)&&types.includes('풀'))return true;return false;}
export function skillExtras(move){
 const text=move.description.replaceAll('**','').replaceAll('`','');
 const normalize=s=>s.replace(/[\s·.,:()%]/g,'');
 const source=normalize(text);
 // Cleansing a status does not need a second explanation of how to inflict it.
 const applied=text.split(/(?<=\.)\s+/).filter(s=>!/(제거|해제|면역)/.test(s)).join(' ');
 const rules=[];
 for(const [key,label] of Object.entries(STATUS_LABELS)){
  if(!(applied.includes(label)||key==='shock'&&applied.includes('감전')||key==='freeze'&&applied.includes('빙결')))continue;
  const facts=STATUS_DESCRIPTIONS[key].split(/(?<=\.)\s+/).filter(f=>!source.includes(normalize(f))&&!f.includes('HP 반동 피해와는 별개')&&!(f.includes('공격·기술·기술 게이지 충전 정지')&&source.includes(normalize('공격·기술·기술 게이지 충전 정지'))));
  if(facts.length)rules.push(`<li><b>${label}</b>: ${facts.join(' ')}</li>`);
 }
 if(move.name==='전기자석파'&&!text.includes('땅 타입'))rules.push('<li>땅 타입에는 적용되지 않습니다.</li>');
 if(['독가루','버섯포자'].includes(move.name)&&!text.includes('풀 타입'))rules.push('<li>풀 타입은 가루·포자 효과에 면역입니다.</li>');
 return rules.length?`<section class="skill-extra"><h4>추가 효과 안내</h4><ul>${rules.join('')}</ul></section>`:'';
}
