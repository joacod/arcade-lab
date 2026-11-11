import { bindButtons } from '../../engine/browser/buttons.ts';
import { viewScale } from './content.ts';

export interface FlightControls { thrust: HTMLButtonElement; left: HTMLButtonElement; right: HTMLButtonElement }

/** Surface holds supplement the shared keyboard/captured-button owner.
 * A sideways drag is CSS pixels, converted to world units at read time. */
export function bindInput(surface: HTMLElement, controls: FlightControls, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({
    surface, controls, active, signal,
    bindings: {
      thrust: ['Space', 'ArrowUp', 'KeyW'],
      left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    },
  });
  const pointers = new Set<number>();
  let launchKey: string | undefined, dragId: number | undefined, dragReady = false, lastX = 0, pendingDx = 0;
  function release(id: number) {
    pointers.delete(id);
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
    if (dragId === id) { dragId = pointers.values().next().value; pendingDx = 0; dragReady = false; }
  }
  function holdPointer(event: PointerEvent) {
    if (!active() || event.button !== 0) return;
    event.preventDefault(); surface.focus({ preventScroll: true });
    pointers.add(event.pointerId); surface.setPointerCapture(event.pointerId);
    if (dragId === undefined) { dragId = event.pointerId; lastX = event.clientX; dragReady = true; }
  }
  function clear() {
    buttons.clear(); launchKey = undefined; pendingDx = 0; dragId = undefined; dragReady = false;
    for (const id of [...pointers]) release(id);
  }
  surface.addEventListener('pointerdown', holdPointer, { signal });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId !== dragId) return;
    if (!dragReady) { lastX = event.clientX; dragReady = true; return; }
    pendingDx += event.clientX - lastX; lastX = event.clientX;
  }, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    surface.addEventListener(name, event => release(event.pointerId), { signal });
  }
  window.addEventListener('keyup', event => { if (event.code === launchKey) launchKey = undefined; }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear, holdPointer,
    holdKey(code: string) { launchKey = code; },
    read() {
      const { held, pressed } = buttons.read();
      const scale = viewScale(surface.clientWidth, surface.clientHeight);
      const drag = pendingDx; pendingDx = 0;
      return {
        thrust: pointers.size > 0 || launchKey !== undefined || held.has('thrust') || pressed.has('thrust'),
        strafe: Number(held.has('right')) - Number(held.has('left')),
        slide: scale > 0 ? drag / scale : 0,
      };
    },
  };
}
