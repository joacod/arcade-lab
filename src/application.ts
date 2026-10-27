export interface GameSession { dispose(): void }
export interface GameEntry { mount(container: HTMLElement): GameSession }

/** Own only the active game's lifetime and mount point. Games own everything inside it. */
export function createApplication(container: HTMLElement) {
  let active: { session: GameSession; host: HTMLElement } | undefined;
  let disposed = false;
  function unmount() {
    const previous = active;
    active = undefined;
    if (!previous) return;
    try { previous.session.dispose(); } finally { previous.host.remove(); }
  }
  return {
    mount(game: GameEntry) {
      if (disposed) throw new Error('Application is disposed');
      unmount();
      const host = document.createElement('div');
      host.className = 'game-mount';
      container.append(host);
      try { active = { session: game.mount(host), host }; }
      catch (error) { host.remove(); throw error; }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unmount();
    },
  };
}
