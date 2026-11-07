import type { MoveAction } from './game.ts';
import { bindButtons } from '../../engine/browser/buttons.ts';
import type { KeyBindings } from '../../engine/bindings.ts';

export type Control = 'left' | 'right' | 'up' | 'down';
const bindings: KeyBindings<Control> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
};

export interface Stick {
  origin: { x: number; y: number };
  tip: { x: number; y: number };
  radius: number;
}

export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls, bindings, active, signal });
  let pointerId: number | undefined;
  let stick: Stick | undefined;
  const point = (event: PointerEvent) => {
    const rect = surface.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  function releasePointer() {
    const id = pointerId;
    pointerId = undefined;
    stick = undefined;
    if (id !== undefined && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  function clear() { buttons.clear(); releasePointer(); }

  surface.addEventListener('pointerdown', event => {
    if (!active() || pointerId !== undefined || event.button !== 0) return;
    const origin = point(event);
    event.preventDefault();
    surface.focus({ preventScroll: true });
    pointerId = event.pointerId;
    stick = { origin, tip: origin, radius: 42 };
    surface.setPointerCapture(pointerId);
  }, { signal });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId === pointerId && stick) stick.tip = point(event);
  }, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    surface.addEventListener(name, event => {
      if (event.pointerId === pointerId) releasePointer();
    }, { signal });
  }
  signal.addEventListener('abort', clear, { once: true });

  return {
    clear,
    get stick() { return stick; },
    read(): MoveAction {
      const { held } = buttons.read();
      if (stick) {
        // Gesture displacement stays in CSS pixels even while the camera follows.
        const dx = stick.tip.x - stick.origin.x;
        const dy = stick.tip.y - stick.origin.y;
        const distance = Math.hypot(dx, dy);
        if (distance < stick.radius / 7) return { x: 0, y: 0 };
        const divisor = Math.max(stick.radius, distance);
        return { x: dx / divisor, y: dy / divisor };
      }
      // Opposite directions cancel; aliases cannot double movement strength.
      return {
        x: Number(held.has('right')) - Number(held.has('left')),
        y: Number(held.has('down')) - Number(held.has('up')),
      };
    },
  };
}
