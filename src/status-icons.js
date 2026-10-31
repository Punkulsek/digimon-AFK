// Exact approved first concept artwork, displayed through CSS atlas windows.
const cells={poison:[42,238,112,117],burn:[167,238,112,117],shock:[292,238,112,117],sleep:[418,238,112,117],confusion:[543,238,112,117],attack:[740,241,94,114],defense:[849,241,94,114],speed:[958,241,94,114],haste:[1067,241,94,114],amplify:[1176,241,94,114],critical:[1285,241,94,114],shield:[1394,241,104,114]};
const statIcons={atkPct:'attack',defPct:'defense',attackSpeedPct:'speed',skillHaste:'haste',gaugeRatePct:'haste',skillAmplification:'amplify',critChance:'critical',critDamage:'critical',penetration:'attack',damageReduction:'defense'};
export function effectIcon(key,label,kind,title,remaining,stacks=0){
 if(['freeze','flinch','recharge'].includes(key))return `<span class="effect-badge effect-icon negative" role="img" aria-label="${label}: ${title}" title="${title}"><span class="status-glyph">${{freeze:'❄',flinch:'✸',recharge:'⌛'}[key]}</span><b class="effect-seconds">${Math.max(0,Math.ceil(remaining))}</b></span>`;
 const icon=cells[key]?key:statIcons[key]||(/독|저주/.test(key)?'poison':/잠|하품/.test(key)?'sleep':/보호|버티|장벽|리플렉|껍질/.test(key)?'shield':'amplify');
 const [x,y,w,h]=cells[icon];const duration=Number.isFinite(remaining)?Math.max(0,Math.ceil(remaining)):'';
 return `<span class="effect-badge effect-icon ${kind}" role="img" aria-label="${label}: ${title}" title="${title}" data-tooltip="${title}"><span class="effect-art" style="background-size:${1536/w*100}% ${1024/h*100}%;background-position:${x/(1536-w)*100}% ${y/(1024-h)*100}%"></span>${duration!==''?`<b class="effect-seconds">${duration}</b>`:''}${stacks>1?`<b class="effect-stacks">×${stacks}</b>`:''}${statIcons[key]?`<i class="effect-arrow">${kind==='negative'?'▼':'▲'}</i>`:''}</span>`;
}
