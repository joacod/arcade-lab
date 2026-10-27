import type { MoveAction } from './game.ts';

const directions: Record<string, MoveAction> = {
  KeyW: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 }, ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 }, ArrowRight: { x: 1, y: 0 },
};

export interface Stick {
  origin: { x: number; y: number };
  tip: { x: number; y: number };
  radius: number;
}

export function bindInput(surface: HTMLElement, active: () => boolean, signal: AbortSignal) {
  const held = new Set<string>();
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
  function clear() { held.clear(); releasePointer(); }

  surface.addEventListener('keydown', event => {
    if (!active() || !directions[event.code] || (event.repeat && !held.has(event.code))) return;
    event.preventDefault();
    held.add(event.code);
  }, { signal });
  window.addEventListener('keyup', event => held.delete(event.code), { signal });
  surface.addEventListener('pointerdown', event => {
    if (!active() || pointerId !== undefined || event.button !== 0) return;
    const origin = point(event);
    event.preventDefault();
    surface.focus({ preventScroll: true });
    held.clear();
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
        x: Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft')),
        y: Number(held.has('KeyS') || held.has('ArrowDown')) - Number(held.has('KeyW') || held.has('ArrowUp')),
      };
    },
  };
}
