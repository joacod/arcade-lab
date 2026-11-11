import type { GameSession } from '../engine/session.ts';
import type { FullscreenControl } from '../engine/browser/fullscreen.ts';
import { games, type GameId } from './catalog.ts';
import './selection.css';
import { githubIcon } from './brand.ts';
import { site } from './site.ts';

/** Collection navigation survives game replacement, only for this page's lifetime. */
export interface SelectionState { selected?: GameId; scrollTop: number }
interface SelectionOptions {
  select(id: GameId): void;
  cancel(): void;
  state: SelectionState;
  message: string;
  fullscreen: FullscreenControl;
}

export function mountSelection(container: HTMLElement, { select, cancel, state, message, fullscreen }: SelectionOptions): GameSession {
  const root = document.createElement('main'); root.className = 'arcade-selection';
  root.innerHTML = `<div class="arcade-selection-inner">
    <header class="arcade-selection-header">
      <div class="arcade-brand"><img src="/icon.svg" width="36" height="36" alt=""><span>ARCADE LAB</span></div>
      <div class="arcade-collection-tools"><button type="button" class="arcade-fullscreen" aria-keyshortcuts="F" hidden></button><a class="arcade-github" href="${site.repository}" target="_blank" rel="noopener noreferrer">${githubIcon}<span>GitHub</span><span aria-hidden="true">↗</span></a></div>
    </header>
    <section class="arcade-introduction" aria-labelledby="selection-heading">
      <div><p class="arcade-eyebrow">SMALL WORLDS</p><h1 id="selection-heading">Press Play</h1></div>
      <p class="arcade-intro">Seven original games. Pick a world and press play.<br><span>Keyboard or touch. Right in your browser.</span></p>
    </section>
    <div class="arcade-games" aria-labelledby="selection-heading">${games.map((game, index) => `
      <button type="button" class="arcade-game" data-game="${game.id}" aria-label="Open game: ${game.title}" aria-describedby="${game.id}-description">
        <span class="arcade-cover" aria-hidden="true">${state.selected === game.id ? '<span class="arcade-return">Last selected</span>' : ''}<img src="${game.cover}" alt="" width="1440" height="1000" decoding="async"><span class="arcade-cover-shade"></span><span class="arcade-genre">${game.genre.replaceAll('&', '&amp;')}</span></span>
        <span class="arcade-card-copy"><span class="arcade-number" aria-hidden="true">0${index + 1}</span><span class="arcade-game-title">${game.title}</span><span class="arcade-card-action" aria-hidden="true"><span class="arcade-card-action-label">Play</span><svg class="arcade-play-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 1.7 10.4 6 3.2 10.3Z"/></svg></span></span>
        <span id="${game.id}-description" class="arcade-game-description">${game.description} ${game.controls}.</span>
      </button>`).join('')}</div>
    <footer class="arcade-selection-footer"><span class="arcade-display-hint">A little arcade. A lot to explore.</span><span class="arcade-credit">Built by <a href="https://joacod.com" target="_blank" rel="noopener noreferrer">joacod</a></span></footer>
    <p class="arcade-display-status" role="status" hidden></p>
    <div class="arcade-loading" ${message ? '' : 'hidden'}><p class="arcade-selection-status" role="status"></p><button type="button" class="arcade-cancel" hidden>Cancel loading</button></div>
    </div>`;
  container.append(root);
  const lifetime = new AbortController();
  const displayButton = root.querySelector<HTMLButtonElement>('.arcade-fullscreen')!;
  function syncDisplay() {
    displayButton.hidden = !fullscreen.available;
    displayButton.textContent = fullscreen.active ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
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
  root.scrollTop = state.scrollTop;
  // Restore a deliberate selection, but leave a fresh landing free of automatic focus.
  buttons.find(button => button.dataset.game === state.selected)?.focus({ preventScroll: true });
  return { dispose() { lifetime.abort(); root.remove(); } };
}
