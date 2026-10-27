import type { Action } from './game.ts';

const keys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyJ', 'ShiftLeft', 'ShiftRight', 'KeyK']);
/** Relative steering stays in CSS pixels. A pointer hold also fires. */
export function bindInput(surface: HTMLElement, evadeButton: HTMLElement, active: () => boolean, signal: AbortSignal) {
  const held = new Set<string>();
  let pointer: number | undefined, origin = { x: 0, y: 0 }, tip = origin, evade = false;
  function release() {
    const id = pointer; pointer = undefined;
    if (id !== undefined && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  function clear() { held.clear(); release(); evade = false; }
  surface.addEventListener('keydown', event => {
    if (!active() || !keys.has(event.code) || (event.repeat && !held.has(event.code))) return;
    event.preventDefault(); held.add(event.code);
    if (!event.repeat && ['ShiftLeft', 'ShiftRight', 'KeyK'].includes(event.code)) evade = true;
  }, { signal });
  window.addEventListener('keyup', event => held.delete(event.code), { signal });
  surface.addEventListener('pointerdown', event => {
    if (!active() || pointer !== undefined || event.button !== 0) return;
    event.preventDefault(); surface.focus({ preventScroll: true }); held.clear();
    pointer = event.pointerId; origin = { x: event.clientX, y: event.clientY }; tip = origin;
    surface.setPointerCapture(pointer);
  }, { signal });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) tip = { x: event.clientX, y: event.clientY };
  }, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    surface.addEventListener(name, event => { if (event.pointerId === pointer) release(); }, { signal });
  }
  evadeButton.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0) return;
    event.preventDefault(); evade = true;
  }, { signal });
  evadeButton.addEventListener('click', event => {
    if (!active()) return;
    // Pointer activation was consumed on press. Only keyboard clicks create an intent here.
    if (event.detail === 0) evade = true;
    surface.focus({ preventScroll: true });
  }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear,
    get stick() { return pointer === undefined ? undefined : { origin, tip }; },
    read(): Action {
      let x = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'));
      let y = Number(held.has('KeyS') || held.has('ArrowDown')) - Number(held.has('KeyW') || held.has('ArrowUp'));
      if (pointer !== undefined) {
        const dx = tip.x - origin.x, dy = tip.y - origin.y, distance = Math.hypot(dx, dy);
        x = distance < 6 ? 0 : dx / Math.max(42, distance); y = distance < 6 ? 0 : dy / Math.max(42, distance);
      }
      const result = { x, y, fire: pointer !== undefined || held.has('Space') || held.has('KeyJ'), evade };
      evade = false; return result;
    },
  };
}
