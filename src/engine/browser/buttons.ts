import { createKeyMap, type KeyBindings } from '../bindings.ts';

export interface DirectionPad<Action extends string> {
  element: HTMLElement;
  actions: Readonly<Record<'up' | 'down' | 'left' | 'right', Action>>;
}

interface ButtonInput<Action extends string> {
  surface: HTMLElement;
  controls: Readonly<Record<Action, HTMLButtonElement>>;
  bindings: KeyBindings<Action>;
  active(): boolean;
  signal: AbortSignal;
  directions?: DirectionPad<Action>;
}
/** Captured button holds and rising edges. Games translate each step's snapshot into actions. */
export function bindButtons<Action extends string>({ surface, controls, bindings, active, signal, directions }: ButtonInput<Action>) {
  let keys = createKeyMap(bindings);
  const heldKeys = new Set<string>(), pressed = new Set<Action>();
  const pointers = new Map<number, { actions: ReadonlySet<Action>; target: HTMLElement }>();
  const entries = Object.entries(controls) as [Action, HTMLButtonElement][];
  const down = (action: Action) => [...heldKeys].some(code => keys.get(code) === action) || [...pointers.values()].some(p => p.actions.has(action));
  function reflect() { for (const [action, button] of entries) button.toggleAttribute('data-held', down(action)); }
  function hold(id: number, target: HTMLElement, actions: ReadonlySet<Action>) {
    const previous = pointers.get(id);
    for (const action of actions) if (!previous?.actions.has(action) && !down(action)) pressed.add(action);
    pointers.set(id, { actions, target }); reflect();
  }
  function release(id: number) {
    const p = pointers.get(id); pointers.delete(id);
    if (p?.target.hasPointerCapture(id)) p.target.releasePointerCapture(id);
    if (p && p.target === directions?.element) {
      p.target.removeAttribute('data-engaged');
      p.target.style.removeProperty('--direction-x'); p.target.style.removeProperty('--direction-y');
    }
    reflect();
  }
  function clear() { heldKeys.clear(); pressed.clear(); for (const id of pointers.keys()) release(id); reflect(); }
  surface.addEventListener('keydown', event => {
    const action = keys.get(event.code);
    if (!active() || action === undefined || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault(); if (event.repeat || heldKeys.has(event.code)) return;
    if (!down(action)) pressed.add(action);
    heldKeys.add(event.code); reflect();
  }, { signal });
  window.addEventListener('keyup', event => { heldKeys.delete(event.code); reflect(); }, { signal });
  if (directions) {
    const { element, actions } = directions;
    function steer(event: PointerEvent) {
      const rect = element.getBoundingClientRect(), radius = Math.min(rect.width, rect.height) / 2;
      const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
      const distance = Math.hypot(x, y), next = new Set<Action>();
      if (distance > radius * .18) {
        if (Math.abs(x) >= Math.abs(y) * .5) next.add(x < 0 ? actions.left : actions.right);
        if (Math.abs(y) >= Math.abs(x) * .5) next.add(y < 0 ? actions.up : actions.down);
      }
      const travel = Math.min(1, radius * .5 / (distance || 1));
      element.style.setProperty('--direction-x', `${x * travel}px`);
      element.style.setProperty('--direction-y', `${y * travel}px`);
      hold(event.pointerId, element, next);
    }
    element.addEventListener('pointerdown', event => {
      if (!active() || event.button !== 0 || [...pointers.values()].some(p => p.target === element)) return;
      event.preventDefault(); surface.focus({ preventScroll: true });
      element.setAttribute('data-engaged', ''); steer(event); element.setPointerCapture(event.pointerId);
    }, { signal });
    element.addEventListener('pointermove', event => {
      if (pointers.get(event.pointerId)?.target === element) steer(event);
    }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) element.addEventListener(name, event => {
      if (pointers.get(event.pointerId)?.target === element) release(event.pointerId);
    }, { signal });
  }
  for (const [action, button] of entries) {
    if (!directions || !Object.values(directions.actions).includes(action)) {
      button.addEventListener('pointerdown', event => {
        if (!active() || event.button !== 0) return;
        event.preventDefault(); surface.focus({ preventScroll: true });
        hold(event.pointerId, button, new Set([action])); button.setPointerCapture(event.pointerId);
      }, { signal });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(name, event => release(event.pointerId), { signal });
    }
    button.addEventListener('click', event => {
      if (!active() || event.detail !== 0) return;
      // Physical pointers act on press; keyboard and assistive clicks create a single edge.
      surface.focus({ preventScroll: true }); pressed.add(action);
    }, { signal });
  }
  surface.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0) return;
    // Suppress native mouse focus/selection after a touch, keeping focus on play.
    event.preventDefault(); surface.focus({ preventScroll: true });
  }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear,
    setBindings(next: KeyBindings<Action>) {
      if (signal.aborted) return;
      const replacement = createKeyMap(next);
      clear(); keys = replacement;
    },
    read(): { held: ReadonlySet<Action>; pressed: ReadonlySet<Action> } {
    const snapshot = { held: new Set(entries.filter(([action]) => down(action)).map(([action]) => action)), pressed: new Set(pressed) };
    pressed.clear(); return snapshot;
  } };
}
