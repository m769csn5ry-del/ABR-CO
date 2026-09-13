/* Bus d'événements minimal — découple les vues des dépôts de données. */
const map = new Map();

export function on(evt, fn){
  if (!map.has(evt)) map.set(evt, new Set());
  map.get(evt).add(fn);
  return () => off(evt, fn);
}
export function off(evt, fn){ map.get(evt)?.delete(fn); }
export function emit(evt, payload){
  map.get(evt)?.forEach(fn => {
    try{ fn(payload); }
    catch(err){ console.error(`[events] ${evt}`, err); }
  });
  if (evt !== '*') emit('*', { evt, payload });
}
