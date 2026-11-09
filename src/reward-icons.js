// Original compact vector artwork, drawn for the game's dark-outlined HUD.
const svg=body=>`<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">${body}</svg>`;
export const rewardChest=svg(`<g stroke="#101c22" stroke-width="5" stroke-linejoin="round"><path d="M15 35 20 66 60 66 66 35Z" fill="#d5e9e9"/><path d="m20 49 4 13h32l3-13" fill="#fafff8" stroke="none"/><path d="M10 29 18 19 62 19 70 29 67 41H13Z" fill="#f9fff8"/><path d="m14 30 54 0" stroke="#718f96" stroke-width="3"/><path d="M34 20v46h12V20" fill="#a7ced0"/><path d="M39 20C17 22 19 5 27 7c7 1 12 13 12 13Zm2 0C62 21 60 5 52 7 45 8 41 20 41 20Z" fill="#eaffef"/></g><path d="m20 23 9-1" stroke="white" stroke-width="4" stroke-linecap="round"/>`);
const heads={
 coin:`<circle cx="40" cy="24" r="17" fill="#ffcc48"/><circle cx="40" cy="24" r="10" fill="#ec9f24" stroke="#fff0a1" stroke-width="3"/><path d="M33 24h14m-7-7v14" stroke="#fff4b7" stroke-width="3"/>`,
 candy:`<path d="m23 12 6 12-8 11 14 1 10 2 14-6-8-10 5-13-14 7Z" fill="#abf1ff"/><path d="m29 18 13-6 12 12-9 13-14-5Z" fill="#ef91ed"/><path d="m33 17 15 14m-19-6 10 10" stroke="#fff4ff" stroke-width="4"/>`,
 rune:`<path d="m40 4 9 13 14 8-14 8-9 14-9-14-14-8 14-8Z" fill="#b58afa"/><path d="m40 10 1 16 15-1-15 4-1 12-4-13-11-3 12-4Z" fill="#e9dcff" stroke="none"/><circle cx="40" cy="25" r="5" fill="#6c46be" stroke-width="2"/>`,
 evolution:`<path d="m40 6 17 10 1 19-18 11-18-11 1-19Z" fill="#61dfbd"/><path d="M30 29q0-15 20-13 0 18-20 16l15-12" fill="#bcffcf" stroke="#247c70" stroke-width="3"/>`
};
const colors={coin:'#ffda69',candy:'#acefff',rune:'#cdb4ff',evolution:'#8ce7c7'};
export function dungeonKey(type){return svg(`<g stroke="#263344" stroke-width="4" stroke-linejoin="round"><path d="M34 33v38h13v-7h9V54h-9V33Z" fill="${colors[type]}"/><path d="M39 39v25" stroke="#ffffff" stroke-opacity=".65" stroke-width="3"/>${heads[type]}</g>`);}
