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
