import type { Action } from './game.ts';
import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';

export type Control = 'left' | 'right' | 'up' | 'down' | 'fire' | 'evade';
const bindings: KeyBindings<Control> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  fire: ['Space', 'KeyJ'], evade: ['ShiftLeft', 'ShiftRight', 'KeyK'],
};
/** Relative steering stays in CSS pixels. A pointer hold also fires. */
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings, active, signal });
  let pointer: number | undefined, origin = { x: 0, y: 0 }, tip = origin;
  function release() {
    const id = pointer; pointer = undefined;
    if (id !== undefined && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  function clear() { buttons.clear(); release(); }
  surface.addEventListener('pointerdown', event => {
    if (!active() || pointer !== undefined || event.button !== 0) return;
    event.preventDefault(); surface.focus({ preventScroll: true });
    pointer = event.pointerId; origin = { x: event.clientX, y: event.clientY }; tip = origin;
    surface.setPointerCapture(pointer);
  }, { signal });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) tip = { x: event.clientX, y: event.clientY };
  }, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    surface.addEventListener(name, event => { if (event.pointerId === pointer) release(); }, { signal });
  }
  signal.addEventListener('abort', clear, { once: true });
  return { clear,
    read(): Action {
      const { held, pressed } = buttons.read();
      let x = Number(held.has('right')) - Number(held.has('left'));
      let y = Number(held.has('down')) - Number(held.has('up'));
      if (pointer !== undefined) {
        const dx = tip.x - origin.x, dy = tip.y - origin.y, distance = Math.hypot(dx, dy);
        x = distance < 6 ? 0 : dx / Math.max(42, distance); y = distance < 6 ? 0 : dy / Math.max(42, distance);
      }
      return { x, y, fire: pointer !== undefined || held.has('fire') || pressed.has('fire'), evade: pressed.has('evade') };
    },
  };
}
