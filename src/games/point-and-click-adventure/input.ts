import { bindButtons } from '../../engine/browser/buttons.ts';
import { worldPoint } from './presentation.ts';
import type { Command } from './game.ts';
import type { Action } from './ui.ts';
export const bindings = { inventory: ['KeyI'], casebook: ['KeyB'], cancel: ['KeyX'] } as const;
export function bindInput(surface: HTMLElement, controls: Record<Action, HTMLButtonElement>, active: () => boolean, send: (command: Command) => void, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, active, signal, bindings });
  let press: { id: number; x: number; y: number } | undefined;
  function point(event: PointerEvent) { const box = surface.getBoundingClientRect(); return worldPoint(event.clientX - box.left, event.clientY - box.top, box.width, box.height); }
  surface.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0 || press) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY }; surface.setPointerCapture(event.pointerId);
  }, { signal });
  surface.addEventListener('pointerup', event => {
    const start = press;
    if (!start || event.pointerId !== start.id) return;
    press = undefined;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (!active() || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const p = point(event); if (!p) return;
    send({ kind: 'walk', point: p });
  }, { signal });
  for (const name of ['pointercancel', 'lostpointercapture'] as const) surface.addEventListener(name, () => { press = undefined; }, { signal });
  function clear() {
    buttons.clear();
    const id = press?.id; press = undefined;
    if (id !== undefined && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  signal.addEventListener('abort', clear, { once: true });
  return { read: buttons.read, clear };
}
