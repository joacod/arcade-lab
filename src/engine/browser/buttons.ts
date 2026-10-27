interface ButtonInput<Action extends string> {
  surface: HTMLElement;
  controls: Readonly<Record<Action, HTMLButtonElement>>;
  keys: Readonly<Record<string, Action>>;
  active(): boolean;
  signal: AbortSignal;
}
/** Captured button holds and rising edges. Games translate each step's snapshot into actions. */
export function bindButtons<Action extends string>({ surface, controls, keys, active, signal }: ButtonInput<Action>) {
  const heldKeys = new Set<string>(), pressed = new Set<Action>();
  const pointers = new Map<number, { action: Action; button: HTMLButtonElement }>();
  const entries = Object.entries(controls) as [Action, HTMLButtonElement][];
  const down = (action: Action) => [...heldKeys].some(code => keys[code] === action) || [...pointers.values()].some(p => p.action === action);
  function reflect() { for (const [action, button] of entries) button.toggleAttribute('data-held', down(action)); }
  function release(id: number) {
    const p = pointers.get(id); pointers.delete(id);
    if (p?.button.hasPointerCapture(id)) p.button.releasePointerCapture(id);
    reflect();
  }
  function clear() { heldKeys.clear(); pressed.clear(); for (const id of pointers.keys()) release(id); reflect(); }
  surface.addEventListener('keydown', event => {
    const action = keys[event.code]; if (!active() || !action) return;
    event.preventDefault(); if (event.repeat || heldKeys.has(event.code)) return;
    if (!down(action)) pressed.add(action);
    heldKeys.add(event.code); reflect();
  }, { signal });
  window.addEventListener('keyup', event => { heldKeys.delete(event.code); reflect(); }, { signal });
  for (const [action, button] of entries) {
    button.addEventListener('pointerdown', event => {
      if (!active() || event.button !== 0) return;
      event.preventDefault(); surface.focus({ preventScroll: true });
      if (!down(action)) pressed.add(action);
      pointers.set(event.pointerId, { action, button }); button.setPointerCapture(event.pointerId); reflect();
    }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(name, event => release(event.pointerId), { signal });
    button.addEventListener('click', event => {
      if (!active() || event.detail !== 0) return;
      // Physical pointers act on press; keyboard and assistive clicks create a single edge.
      surface.focus({ preventScroll: true }); pressed.add(action);
    }, { signal });
  }
  surface.addEventListener('pointerdown', () => { if (active()) surface.focus({ preventScroll: true }); }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear, read(): { held: ReadonlySet<Action>; pressed: ReadonlySet<Action> } {
    const snapshot = { held: new Set(entries.filter(([action]) => down(action)).map(([action]) => action)), pressed: new Set(pressed) };
    pressed.clear(); return snapshot;
  } };
}
