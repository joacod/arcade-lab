import { bindButtons } from '../../engine/browser/buttons.ts';

/** Surface holds supplement the shared keyboard/captured-button owner. */
export function bindInput(surface: HTMLElement, thrust: HTMLButtonElement, active: () => boolean, signal: AbortSignal) {
  const buttons = bindButtons({ surface, controls: { thrust }, bindings: { thrust: ['Space', 'ArrowUp', 'KeyW'] }, active, signal });
  const pointers = new Set<number>();
  let launchKey: string | undefined;
  function release(id: number) {
    pointers.delete(id);
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  }
  function holdPointer(event: PointerEvent) {
    if (!active() || event.button !== 0) return;
    event.preventDefault(); surface.focus({ preventScroll: true });
    pointers.add(event.pointerId); surface.setPointerCapture(event.pointerId);
  }
  function clear() { buttons.clear(); launchKey = undefined; for (const id of pointers) release(id); }
  surface.addEventListener('pointerdown', holdPointer, { signal });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    surface.addEventListener(name, event => release(event.pointerId), { signal });
  }
  window.addEventListener('keyup', event => { if (event.code === launchKey) launchKey = undefined; }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear, holdPointer,
    holdKey(code: string) { launchKey = code; },
    read() {
      const { held, pressed } = buttons.read();
      return { thrust: pointers.size > 0 || launchKey !== undefined || held.has('thrust') || pressed.has('thrust') };
    },
  };
}
