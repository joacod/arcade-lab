import type { GameSession } from '../engine/session.ts';
import type { FullscreenControl } from '../engine/browser/fullscreen.ts';
import { games, type GameId } from './catalog.ts';
import { selectionMarkup } from './selection-markup.ts';

/** Collection navigation survives game replacement, only for this page's lifetime. */
export interface SelectionState { selected?: GameId; scrollTop: number }
interface SelectionOptions {
  select(id: GameId): void;
  cancel(): void;
  state: SelectionState;
  message: string;
  fullscreen: FullscreenControl;
  initialRoot?: HTMLElement | undefined;
}

export function mountSelection(container: HTMLElement, { select, cancel, state, message, fullscreen, initialRoot }: SelectionOptions): GameSession {
  const root = initialRoot ?? document.createElement('main'); root.className = 'arcade-selection';
  if (!initialRoot) root.innerHTML = selectionMarkup({ selected: state.selected, message });
  container.append(root);
  const lifetime = new AbortController();
  const displayButton = root.querySelector<HTMLButtonElement>('.arcade-fullscreen')!;
  function syncDisplay() {
    displayButton.hidden = !fullscreen.available;
    displayButton.querySelector('span')!.textContent = fullscreen.active ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
    displayButton.setAttribute('aria-label', fullscreen.active ? 'Exit fullscreen' : 'Fullscreen');
    displayButton.setAttribute('aria-pressed', String(fullscreen.active));
    root.querySelector('.arcade-display-hint')!.textContent = fullscreen.available && !fullscreen.active
      ? 'Settle in. Try fullscreen for a little more escape.' : 'A little arcade. A lot to explore.';
  }
  displayButton.addEventListener('click', () => {
    void fullscreen.toggle().then(message => {
      if (lifetime.signal.aborted) return;
      const status = root.querySelector<HTMLElement>('.arcade-display-status')!;
      status.textContent = message; status.hidden = !message;
    });
  }, { signal: lifetime.signal });
  document.addEventListener('fullscreenchange', syncDisplay, { signal: lifetime.signal });
  // Fresh landings leave focus on the body, outside the collection root.
  document.addEventListener('keydown', event => {
    if (event.code !== 'KeyF' || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (fullscreen.available) { event.preventDefault(); displayButton.click(); }
  }, { signal: lifetime.signal });
  syncDisplay();
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-game]')];
  const status = root.querySelector('.arcade-selection-status')!; status.textContent = message;
  const loading = root.querySelector<HTMLElement>('.arcade-loading')!;
  const cancelButton = root.querySelector<HTMLButtonElement>('.arcade-cancel')!;
  cancelButton.addEventListener('click', cancel, { signal: lifetime.signal });
  for (const button of buttons) button.addEventListener('click', () => {
    const id = button.dataset.game as GameId;
    state.selected = id; state.scrollTop = root.scrollTop;
    for (const item of buttons) item.disabled = true;
    button.dataset.loading = '';
    root.querySelector('.arcade-games')!.setAttribute('aria-busy', 'true');
    loading.hidden = false; cancelButton.hidden = false;
    status.textContent = `Loading ${games.find(game => game.id === id)!.title}…`;
    cancelButton.focus({ preventScroll: true });
    select(id);
  }, { signal: lifetime.signal });
  for (const button of buttons) button.disabled = false;
  root.scrollTop = state.scrollTop;
  // Restore a deliberate selection, but leave a fresh landing free of automatic focus.
  buttons.find(button => button.dataset.game === state.selected)?.focus({ preventScroll: true });
  return { dispose() { lifetime.abort(); root.remove(); } };
}
