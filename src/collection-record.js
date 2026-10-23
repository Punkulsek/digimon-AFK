// Preserve collection history even after evolution or duplicate consumption.
export function recordCollection(state, ids = []) {
 state.discovered = [...new Set([...(state.discovered || []), ...state.inventory.map(p=>p.speciesId), ...ids])].sort((a,b)=>a-b);
}
