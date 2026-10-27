import type { Action } from './game.ts';
export type Control = 'left' | 'right' | 'jump';
const keyActions: Readonly<Record<string, Control>> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', KeyZ: 'jump',
};
/** Jump presses are edges; holds control jump height. Independent captured touches can overlap. */
export function bindInput(surface: HTMLElement, controls: Readonly<Record<Control, HTMLButtonElement>>, active: () => boolean, signal: AbortSignal) {
  const held = new Set<string>(), pointers = new Map<number, { action: Control; element: HTMLElement }>();
  let jumpPressed = false;
  const down = (action: Control) => [...held].some(key => keyActions[key] === action)
    || [...pointers.values()].some(pointer => pointer.action === action);
  function release(id: number) {
    const pointer = pointers.get(id); pointers.delete(id);
    if (pointer?.element.hasPointerCapture(id)) pointer.element.releasePointerCapture(id);
  }
  function clear() { held.clear(); jumpPressed = false; for (const id of pointers.keys()) release(id); }
  surface.addEventListener('keydown', event => {
    const action = keyActions[event.code];
    if (!active() || !action) return;
    event.preventDefault();
    if (event.repeat) return;
    if (action === 'jump' && !down('jump')) jumpPressed = true;
    held.add(event.code);
  }, { signal });
  window.addEventListener('keyup', event => held.delete(event.code), { signal });
  for (const action of ['left', 'right', 'jump'] as const) {
    const button = controls[action];
    button.addEventListener('pointerdown', event => {
      if (!active() || event.button !== 0) return;
      event.preventDefault(); surface.focus({ preventScroll: true });
      if (action === 'jump' && !down('jump')) jumpPressed = true;
      pointers.set(event.pointerId, { action, element: button }); button.setPointerCapture(event.pointerId);
    }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      button.addEventListener(name, event => release(event.pointerId), { signal });
    }
    button.addEventListener('click', event => {
      if (!active() || event.detail !== 0) return;
      // A keyboard/assistive click gets a short jump; physical pointers act on press.
      if (action === 'jump') jumpPressed = true;
      surface.focus({ preventScroll: true });
    }, { signal });
  }
  surface.addEventListener('pointerdown', () => { if (active()) surface.focus({ preventScroll: true }); }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear,
    read(): Action {
      const result = { move: Number(down('right')) - Number(down('left')), jumpHeld: down('jump'), jumpPressed };
      jumpPressed = false; return result;
    },
  };
}
