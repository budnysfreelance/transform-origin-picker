// Undo/redo dla pozycji originu. Serie nudge'ów strzałkami sklejają się
// w jeden wpis, żeby Cmd+Z nie cofał po 0.1 px.

const LIMIT = 200;
const COALESCE_MS = 600;

let past = [];
let future = [];
let lastPushAt = 0;
let lastTag = null;

function same(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

export function reset(origin) {
  past = origin ? [{ ...origin }] : [];
  future = [];
  lastPushAt = 0;
  lastTag = null;
}

/**
 * @param {{x:number,y:number}} origin
 * @param {{tag?: string}} options  wpisy z tym samym tagiem, następujące
 *   szybko po sobie (np. seria nudge'ów), zastępują poprzedni wpis
 */
export function push(origin, { tag = null } = {}) {
  const previous = past[past.length - 1];
  if (same(previous, origin)) return;

  const now = Date.now();
  const coalesce = tag !== null && tag === lastTag && now - lastPushAt < COALESCE_MS;

  if (coalesce && past.length > 1) past[past.length - 1] = { ...origin };
  else past.push({ ...origin });

  if (past.length > LIMIT) past.shift();
  future = [];
  lastPushAt = now;
  lastTag = tag;
}

export function undo() {
  if (past.length < 2) return null;
  future.push(past.pop());
  lastTag = null;
  return { ...past[past.length - 1] };
}

export function redo() {
  const next = future.pop();
  if (!next) return null;
  past.push(next);
  lastTag = null;
  return { ...next };
}

export function canUndo() {
  return past.length > 1;
}

export function canRedo() {
  return future.length > 0;
}
