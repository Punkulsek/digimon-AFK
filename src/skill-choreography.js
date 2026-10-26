import {SKILLS} from './skills.js';
const groups={
 ember:['불꽃세례','불꽃엄니','불꽃펀치'],
 inferno:['불꽃회오리','오버히트','열풍','불꽃바퀴','플레어드라이브','불새'],
 thunder:['10만볼트','번개펀치','방전','전기자석파','뱀눈초리'],
 water:['하이드로캐논','물대포','버블광선','폭포오르기'],
 seed:['씨뿌리기','씨폭탄','독압정'],
 leaf:['덩굴채찍','파워휩','꽃잎댄스','바람일으키기','에어커터','폭풍','솔라빔'],
 ice:['얼음뭉치','고드름침','오로라빔','눈보라'],
 venom:['독침','더블니들','독찌르기','용해액','오물웨이브','오물폭탄','스모그','독가스','독가루'],
 earth:['모래지옥','대지의힘','지진','땅파기','땅가르기','돌떨구기','암석포','원시의힘'],
 psychic:['염동력','사이코키네시스','미래예지','사이코브레이크','저주','흑안개'],
 song:['노래하기','초음파','멸망의노래'],
 kiss:['악마의키스'],
 sleep:['최면술','버섯포자','하품','잠자기'],
 drain:['흡혈','흡수','기가드레인','꿈먹기'],
 heal:['아로마테라피','달빛','게으름피우기','알낳기','뿌리박기','아쿠아링'],
 shield:['껍질에숨기','철벽','빛의장벽','리플렉터','버티기','신비의부적','카운터'],
 boost:['성장','단단해지기','나비춤','똬리틀기','명상','벌크업','록커트','고속이동','칼춤','용의춤','껍질깨기','도우미','바톤터치'],
 slash:['베어가르기','시저크로스','크로스촙','태권당수','회전부리','날개치기','뿔드릴'],
 rush:['전광석화','신속','마하펀치','속이기','튀어오르기'],
 brawl:['필살앞니','마구찌르기','두번치기','분노','인파이트','폭발펀치','조이기','찝기','집게해머','뼈다귀치기','뼈다귀부메랑','무릎차기','핥기','뿔찌르기','난동부리기'],
 explosion:['대폭발','소닉붐'],
 dragon:['용의숨결','용의분노','역린'],
 copy:['변신','손가락흔들기','트라이어택'],
 web:['실뿜기'],
 ghostfire:['도깨비불'],
 star:['스피드스타'],
};
const colors={ember:'#ff932f',inferno:'#ff682e',thunder:'#ffe95c',water:'#49caff',seed:'#a3ee63',leaf:'#89efa0',ice:'#bcf7ff',venom:'#d286fa',earth:'#e9ba79',psychic:'#e997ff',song:'#bea4ff',kiss:'#ff8fbf',sleep:'#99b7ff',drain:'#bd91f7',heal:'#83ffc0',shield:'#82dfff',boost:'#ffe990',slash:'#fff1ba',rush:'#e3ffff',brawl:'#ffbe83',explosion:'#ffab4b',dragon:'#a1b1ff',copy:'#ffd6ff',web:'#eee9ff',ghostfire:'#b69aff',star:'#ffed92'};
const byName=new Map(Object.entries(groups).flatMap(([recipe,names])=>names.map(name=>[name,recipe])));
const chargeSeconds={'땅파기':1,'솔라빔':2,'불새':1.5,'튀어오르기':1,'미래예지':3,'멸망의노래':8};
export function skillChoreography(name,speed=1){
 const skill=SKILLS[name],recipe=byName.get(name)||'boost';
 const support=['heal','shield','boost','copy'].includes(recipe);
 const heavy=['오버히트','하이드로캐논','지진','대폭발','눈보라','사이코브레이크','역린','솔라빔'].includes(name);
 let windup=heavy?650:420,travel=recipe==='rush'?200:recipe==='slash'||recipe==='brawl'?260:support?200:400;
 if(chargeSeconds[name])windup=Math.max(windup,Math.min(3500,chargeSeconds[name]*1000/Math.max(1,speed)));
 const count=name==='더블니들'||name==='두번치기'||name==='크로스촙'?2:name==='회전부리'?4:/마구|마하|고드름/.test(name)?3:1;
 return {name,recipe,color:colors[recipe],support,heavy,count,windup,travel,impact:windup+travel,duration:windup+travel+(heavy?1250:950),scope:skill?.scope||'단일',known:byName.has(name),seed:[...name].reduce((v,c)=>v+c.charCodeAt(0),0)};
}
export const CHOREOGRAPHED_SKILLS=Object.freeze([...byName.keys()].filter(name=>SKILLS[name]));
