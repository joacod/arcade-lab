interface PageLifetime {
  signal: AbortSignal;
  suspend(): void;
  resetTiming(): void;
  dispose(): void;
}
/** Browser interruption policy shared by sessions; gameplay and focus rules stay local. */
export function bindPageLifetime({ signal, suspend, resetTiming, dispose }: PageLifetime) {
  window.addEventListener('blur', suspend, { signal });
  window.addEventListener('pagehide', event => { if (event.persisted) suspend(); else dispose(); }, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend(); else resetTiming();
  }, { signal });
}

interface FocusLifetime {
  signal: AbortSignal;
  surface: HTMLElement;
  playing(): boolean;
  clearInput(): void;
  shouldSuspend(): boolean;
  suspend(): void;
}
/** Focus settles after focusout. Each session defines which destinations are playable. */
export function bindSessionFocus(root: HTMLElement, { signal, surface, playing, clearInput, shouldSuspend, suspend }: FocusLifetime) {
  let pending: number | undefined;
  root.addEventListener('pointerdown', event => {
    if (!playing() || event.defaultPrevented || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('button, a, input, select, textarea, [contenteditable]')) return;
    // A thumb landing in a HUD/control gap must not let native pointer focus
    // blur the playfield to the body and look like leaving the game.
    event.preventDefault(); surface.focus({ preventScroll: true });
  }, { signal });
  root.addEventListener('focusout', () => {
    if (pending !== undefined) window.clearTimeout(pending);
    // Native pointer focus can run a microtask checkpoint between focusout and
    // focusin. Wait for the next task so the destination has actually settled.
    pending = window.setTimeout(() => {
      pending = undefined;
      if (!signal.aborted && shouldSuspend()) { clearInput(); suspend(); }
    }, 0);
  }, { signal });
  signal.addEventListener('abort', () => { if (pending !== undefined) window.clearTimeout(pending); }, { once: true });
}
