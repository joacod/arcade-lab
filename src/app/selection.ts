import type { GameSession } from '../engine/session.ts';
import { games, type GameId } from './catalog.ts';
import './selection.css';

/** Collection navigation survives game replacement, only for this page's lifetime. */
export interface SelectionState { selected?: GameId; scrollTop: number }
interface SelectionOptions {
  select(id: GameId): void;
  cancel(): void;
  state: SelectionState;
  message: string;
}

export function mountSelection(container: HTMLElement, { select, cancel, state, message }: SelectionOptions): GameSession {
  const root = document.createElement('main'); root.className = 'arcade-selection';
  root.innerHTML = `<div class="arcade-selection-inner">
    <header class="arcade-selection-header"><div><p class="arcade-eyebrow">ARCADE LAB</p><h1 id="selection-heading">Find your next game.</h1><p class="arcade-intro">Pick a world. Learn the controls. Make another run.</p></div><span class="arcade-count">${games.length} games to explore</span></header>
    <div class="arcade-games" aria-labelledby="selection-heading">${games.map(game => `
      <button type="button" class="arcade-game" data-game="${game.id}" aria-label="Play ${game.title}" aria-describedby="${game.id}-description">
        <span class="arcade-cover" aria-hidden="true"><img src="${game.cover}" alt="" width="480" height="260" decoding="async"></span>
        <span class="arcade-card-copy"><span class="arcade-genre">${game.genre}</span><span class="arcade-game-title">${game.title}</span><span id="${game.id}-description" class="arcade-game-description">${game.description}</span><span class="arcade-card-action" aria-hidden="true">Play game <span>→</span></span></span>
      </button>`).join('')}</div>
    <div class="arcade-loading" ${message ? '' : 'hidden'}><p class="arcade-selection-status" role="status"></p><button type="button" class="arcade-cancel" hidden>Cancel loading</button></div>
    </div>`;
  container.append(root);
  const lifetime = new AbortController();
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
  (buttons.find(button => button.dataset.game === state.selected) ?? buttons[0])?.focus({ preventScroll: true });
  return { dispose() { lifetime.abort(); root.remove(); } };
}
